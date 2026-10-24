/**
 * 静态站点的无浏览器冒烟测试：用 node:vm 模拟 window/location/fetch，
 * 加载 config.js / api.js / ui.js，验证数据层与模板层的契约。
 *
 *   node tools/smoke.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ---------- 浏览器环境模拟 ---------- */
function makeSandbox() {
  const listeners = {}
  const sandbox = {
    console,
    Date, Math, JSON, Number, String, Array, Object, Set, Map, RegExp,
    encodeURIComponent, decodeURIComponent,
    AbortController, Response, URL,
    setTimeout, clearTimeout, setInterval, clearInterval,
    performance: { now: () => Date.now() },
    fetch: (url) => {
      const u = new URL(url, 'http://127.0.0.1:4173/')
      const fp = path.join(ROOT, decodeURIComponent(u.pathname))
      if (!fs.existsSync(fp)) return Promise.reject(new Error('404 ' + u.pathname))
      return Promise.resolve(new Response(fs.readFileSync(fp)))
    },
    location: { protocol: 'http:', href: 'http://127.0.0.1:4173/index.html', search: '', hash: '' },
    requestAnimationFrame: (f) => setTimeout(f, 16),
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o) } },
    addEventListener: (t, f) => { (listeners[t] ||= []).push(f) },
  }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  for (const f of ['js/config.js', 'js/api.js', 'js/ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f })
  }
  return sandbox
}

let pass = 0
function ok(cond, label, extra = '') {
  if (!cond) throw new Error('断言失败：' + label + (extra ? ' → ' + extra : ''))
  pass++
  console.log('  ✓ ' + label)
}

async function drain(API, query, cap = 200) {
  const all = []
  let page = 1
  for (;;) {
    const r = await API.getFeed(page, query)
    all.push(...r.list)
    if (!r.hasMore || r.list.length === 0) break
    if (++page > cap) throw new Error('分页未收敛: ' + JSON.stringify(query))
  }
  return all
}

const sandbox = makeSandbox()
const { API, UI } = sandbox

console.log('\n【1】数据层：分页 / 分类 / 搜索 / 排序')
const first = await API.getFeed(1, { cat: '全部' })
ok(first.list.length === 8, '首页返回 8 条', first.list.length)
ok(first.hasMore === true, '首屏 hasMore=true')
ok(!!first.list[0].cover && /^data:image\/svg\+xml/.test(first.list[0].cover), '封面为内联 SVG')

const all = await drain(API, { cat: '全部' })
ok(all.length === 96, '全量 96 条', all.length)
ok(new Set(all.map((p) => p.id)).size === 96, '分页无重复')

const facets = await API.facets()
ok(facets.categories.length === 11, '分类 11 个', facets.categories.join('/'))
ok(facets.tags.length === 8, '标签 8 个', facets.tags.join('/'))

for (const c of facets.categories) {
  const items = await drain(API, { cat: c })
  const expect = c === '全部' ? 96 : all.filter((p) => p.category === c).length
  ok(items.length === expect && items.every((p) => c === '全部' || p.category === c), `分类「${c}」${items.length} 条一致`)
}

const hit = await drain(API, { cat: '全部', q: '三体' })
ok(hit.length > 0 && hit.every((p) =>
  [p.title, p.excerpt, p.author.name, p.category, (p.tags || []).join(' ')].join(' ').includes('三体')
), '搜索「三体」结果相关', hit.length)

ok((await drain(API, { q: '绝不存在的词xyz' })).length === 0, '无结果搜索返回空')

const hot = await drain(API, { sort: 'hot' })
ok(hot.every((p, i) => i === 0 || hot[i - 1].likes >= p.likes), '「最多共鸣」按点赞降序')
const chatty = await drain(API, { sort: 'comments' })
ok(chatty.every((p, i) => i === 0 || chatty[i - 1].commentCount >= p.commentCount), '「聊得热闹」按评论降序')

const tag = facets.tags[0]
const tagged = await drain(API, { tag })
ok(tagged.length > 0 && tagged.every((p) => p.tags.includes(tag)), '标签筛选生效：' + tag)

console.log('\n【2】模板层：卡片 / 详情 / 高亮 / 转义')
const card = UI.cardHTML(first.list[0], 0, '三体')
for (const frag of ['card__title', 'card__excerpt', 'card__tags', 'act--like', 'detail.html?id=']) {
  ok(card.includes(frag), '卡片含 ' + frag)
}
ok(UI.cardHTML(first.list[0], 0, '活着').includes('<mark>'), '关键词高亮 <mark>')
ok(!UI.cardHTML(first.list[0], 0, '<img src=x onerror=alert(1)>').includes('<img src=x'), '高亮防 XSS')
ok(!UI.esc('<b onclick="x">').includes('<b'), 'esc 转义标签')

const det = await API.getDetail('post-005')
ok(!!det.contentHtml && det.contentHtml.includes('<p>'), '详情正文来自 API')
ok(det.comments.length >= 3, '详情评论数 ≥ 3', det.comments.length)
ok(!!det.book && !!det.book.name, '详情含书籍信息')
const dh = UI.detailHTML(det)
const needIds = ['btnBack', 'btnShare', 'detailTop', 'btnFollow', 'barLike', 'barStar', 'cmtInput', 'btnSend', 'cmtList', 'prose']
ok(needIds.every((id) => dh.includes(`id="${id}"`)), '详情模板输出 detail.js 需要的全部 id')
const needCls = ['detail-top__title', 'follow', 'cmt-like', 'cmt-reply', 'detail-stats', 'bookcard', 'related__item']
ok(needCls.every((c) => dh.includes(c)), '详情模板输出所需类名')
ok(UI.detailHTML({ ...det, comments: [] }).includes('class="empty"'), '无评论时空态')

console.log('\n【3】静态兜底（file:// 场景）')
const raw = makeSandbox()
ok(Array.isArray(raw.API.fallbackList) && raw.API.fallbackList.length > 0, '内置兜底数据存在', raw.API.fallbackList.length)

console.log(`\n✅ 全部通过：${pass} 项断言\n`)
