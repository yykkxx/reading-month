/**
 * 真实 DOM 冒烟测试（依赖 jsdom，可选）：
 *   npm i -D jsdom && node tools/dom-test.mjs
 * 覆盖：首页渲染、显影、倒计时、分类/标签、排序、搜索、空态、点赞、详情页、发评论
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let JSDOM, VirtualConsole
try {
  ({ JSDOM, VirtualConsole } = await import('jsdom'))
} catch (e) {
  console.log('\n⚠️  未安装 jsdom，跳过 DOM 测试。安装后再跑：\n   npm i -D jsdom\n')
  process.exit(0)
}
const JS = ['js/theme.js', 'js/config.js', 'js/api.js', 'js/ui.js', 'js/effects.js', 'js/app.js', 'js/detail.js', 'js/author.js']

let failures = 0
function check(cond, label, extra = '') {
  if (cond) console.log('  ✓ ' + label)
  else { failures++; console.error('  ✗ ' + label + (extra ? ' → ' + extra : '')) }
}

function makeDom(htmlFile, url) {
  const html = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8')
    .replace(/<script[^>]*><\/script>/g, '')           // 不自动执行，手动按顺序 eval
    .replace(/<link[^>]*fonts\.googleapis[^>]*>/g, '') // 跳过外网字体

  const errors = []
  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => {
    const msg = String(e && e.message || e)
    if (/Could not load|Not implemented|navigation/i.test(msg)) return
    errors.push(msg)
  })
  vc.on('error', (m) => errors.push('console.error: ' + m))

  const dom = new JSDOM(html, {
    url,
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    virtualConsole: vc,
  })
  const { window } = dom

  // fetch → 本地文件
  window.fetch = async (input) => {
    const u = new URL(String(input), window.location.href)
    const fp = path.join(ROOT, decodeURIComponent(u.pathname))
    if (!fs.existsSync(fp)) return new Response('not found', { status: 404 })
    return new Response(fs.readFileSync(fp), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  window.AbortController = AbortController
  window.Response = Response

  // canvas 2D 上下文桩
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      setTransform() {}, clearRect() {}, save() {}, restore() {},
      translate() {}, rotate() {}, scale() {}, beginPath() {}, arc() {},
      fill() {}, set fillStyle(v) {}, get fillStyle() { return '' },
    }
  }

  // jsdom 缺失的滚动 API
  window.scrollTo = () => {}
  window.HTMLElement.prototype.scrollIntoView = () => {}

  return { dom, window, errors }
}

function loadScripts(window, files) {
  for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8')
    window.eval(code + '\n//# sourceURL=' + f)
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/* ======================================================================
 * 首页
 * ==================================================================== */
console.log('\n【首页】')
const home = makeDom('index.html', 'http://127.0.0.1:4173/index.html')
loadScripts(home.window, JS.slice(0, 6))
await wait(4500)

const { document } = home.window
const cards = document.querySelectorAll('#feedList .card')
check(cards.length > 0, '信息流渲染出卡片', cards.length + ' 张')
check(document.querySelectorAll('#feedList .card:not(.card--comment) .card__title').length === document.querySelectorAll('#feedList .card:not(.card--comment)').length, '每篇书评都有标题')
check(document.querySelectorAll('#feedList .card--comment').length > 0, '信息流里混有评论卡', document.querySelectorAll('#feedList .card--comment').length + ' 条')
check(!!document.querySelector('#feedList .comment-card__target[href*="detail.html?id="]'), '评论卡带书评跳转链接')
check(!!document.querySelector('#feedList .comment-card__thumb'), '评论卡带书评缩略图')
check(!!document.querySelector('#feedList .card__author-link[href*="author.html?id="]'), '卡片作者可点进主页')
check(document.querySelectorAll('#feedList img.dev-pending').length === 0, '封面显影类已移除')
check(/^\d{2,3}$/.test(document.querySelector('#cdDay').textContent), '倒计时天数正常', document.querySelector('#cdDay').textContent)
check(document.querySelectorAll('#chips .chip').length >= 10, '分类筛选已渲染', document.querySelectorAll('#chips .chip').length + ' 个')
check(document.querySelectorAll('#tags .chip').length >= 8, '标签筛选已渲染')
check(document.querySelector('#filterSummary').hidden === true, '默认不显示筛选摘要')
check(document.querySelector('#feedStatus').className.includes('end') || document.querySelector('#feedStatus').hidden, '加载状态正常（已到底或隐藏）', document.querySelector('#feedStatus').className)

/* 页眉题记与手绘横线 */
check(!!document.querySelector('.feed__quote'), '页眉题记存在')
check(!!document.querySelector('.feed__rule path'), '标题手绘横线存在')
check(document.querySelector('.feed__head').classList.contains('is-visible'), '页眉入场已触发')

/* 夜读模式 */
const toggle = document.querySelector('.theme-toggle')
toggle.dispatchEvent(new home.window.MouseEvent('click', { bubbles: true }))
check(document.documentElement.getAttribute('data-theme') === 'night', '夜读模式可开启')
check(home.window.localStorage.getItem('rm-theme') === 'night', '主题偏好已记住')
check(toggle.getAttribute('aria-pressed') === 'true', '开关 aria 状态同步')
toggle.dispatchEvent(new home.window.MouseEvent('click', { bubbles: true }))
check(!document.documentElement.hasAttribute('data-theme'), '可切回日间模式')

/* 点赞 */
const likeBtn = document.querySelector('#feedList .act--like')
const before = likeBtn.querySelector('.n').textContent
likeBtn.dispatchEvent(new home.window.MouseEvent('click', { bubbles: true, cancelable: true }))
const after = likeBtn.querySelector('.n').textContent
check(likeBtn.classList.contains('is-liked'), '点赞状态切换')
check(before !== after, '点赞数变化', before + ' → ' + after)

/* 排序 */
const hotChip = document.querySelector('#sorts .chip[data-sort="hot"]')
hotChip.dispatchEvent(new home.window.MouseEvent('click', { bubbles: true }))
await wait(900)
check(hotChip.classList.contains('is-on'), '排序按钮选中')
check(!document.querySelector('#filterSummary').hidden, '排序后显示筛选摘要')
const titlesAfterSort = [...document.querySelectorAll('#feedList .card__title')].map((n) => n.textContent)
check(titlesAfterSort.length > 0, '排序后仍有内容', titlesAfterSort.length + ' 条')

/* 搜索 */
const input = document.querySelector('#searchInput')
input.value = '三体'
input.dispatchEvent(new home.window.Event('input', { bubbles: true }))
await wait(1200)
const searchTitles = [...document.querySelectorAll('#feedList .card__title')].map((n) => n.textContent)
check(searchTitles.length > 0 && searchTitles.length < titlesAfterSort.length, '搜索结果收窄', searchTitles.length + ' 条')
check(document.querySelectorAll('#feedList mark').length > 0, '关键词高亮存在')

/* 搜索无结果 → 空态插画 */
input.value = '绝不可能存在的关键词zzz'
input.dispatchEvent(new home.window.Event('input', { bubbles: true }))
await wait(1200)
check(!!document.querySelector('#feedList .empty'), '无结果时显示空态')
check(!!document.querySelector('#feedList .empty__art'), '空态带插画')

check(home.errors.length === 0, '首页无运行时错误', home.errors.slice(0, 2).join(' | '))

/* ======================================================================
 * 详情页
 * ==================================================================== */
console.log('\n【详情页】')
const detail = makeDom('detail.html', 'http://127.0.0.1:4173/detail.html?id=post-005')
loadScripts(detail.window, JS.filter((f) => f !== 'js/app.js'))
await wait(900)

const dd = detail.window.document
check(!!dd.querySelector('.article__title'), '标题已渲染', dd.querySelector('.article__title')?.textContent.slice(0, 18))
check(!!dd.querySelector('#prose p'), '正文已渲染')
check(dd.querySelectorAll('#cmtList .cmt').length >= 3, '评论便签已渲染', dd.querySelectorAll('#cmtList .cmt').length + ' 张')
check(!!dd.querySelector('#readProgress'), '阅读进度条存在')
check(!!dd.querySelector('#barLike') && !!dd.querySelector('#btnSend'), '底部操作条完整')
check(!!dd.querySelector('.theme-toggle'), '详情页也有主题开关')
check(dd.body.classList.contains('is-ready'), '正文淡入状态已激活')
check(!!dd.querySelector('.article__meta')?.textContent.match(/分钟读完/), '显示阅读时长')
check(detail.window.document.title.includes('读书月'), '页面标题已更新')

/* 发评论 */
const ci = dd.querySelector('#cmtInput')
ci.value = '这本书我也在读，共鸣很深。'
dd.querySelector('#btnSend').dispatchEvent(new detail.window.MouseEvent('click', { bubbles: true }))
check(dd.querySelectorAll('#cmtList .cmt').length >= 4, '新评论已插入')

check(detail.errors.length === 0, '详情页无运行时错误', detail.errors.slice(0, 2).join(' | '))

/* ======================================================================
 * 作者主页
 * ==================================================================== */
console.log('\n【作者主页】')
const authorDom = makeDom('author.html', 'http://127.0.0.1:4173/author.html?id=u03')
loadScripts(authorDom.window, JS.filter((f) => !f.endsWith('app.js') && !f.endsWith('detail.js')))
await wait(1200)

const ad = authorDom.window.document
check(!!ad.querySelector('.profile__name'), '作者昵称已渲染', ad.querySelector('.profile__name')?.textContent)
check(ad.querySelectorAll('.profile__stats li').length === 3, '资料卡三项统计')
check(ad.querySelectorAll('#authorPosts .card').length > 0, '作者作品已渲染', ad.querySelectorAll('#authorPosts .card').length + ' 篇')
check(!!ad.querySelector('#backBtn'), '有返回按钮')
check(ad.title.includes('读书月'), '页面标题已更新')
check(authorDom.errors.length === 0, '作者页无运行时错误', authorDom.errors.slice(0, 2).join(' | '))

console.log(failures === 0 ? '\n✅ DOM 测试全部通过\n' : `\n❌ ${failures} 项失败\n`)
process.exit(failures === 0 ? 0 : 1)
