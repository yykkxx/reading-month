/* ==========================================================================
 * api.js —— 数据层：统一的数据访问接口
 *  - SOURCE='mock'  ：读取本地 mock/api/** 的静态 JSON（当前本地测试）
 *  - SOURCE='remote':请求第三方内容 API（config.js 里配置）
 *  静态兜底：两种来源都失败时，用内置 FALLBACK 数据渲染本地示例，
 *            保证页面在 file:// 直接打开也不会空白。
 * ========================================================================== */
(function () {
  'use strict'
  const CFG = window.READING_MONTH

  /* ---------- 小工具 ---------- */
  const now = () => Date.now()
  const pad2 = (n) => String(n).padStart(2, '0')
  function fmtTime(ts) {
    const d = new Date(ts)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }

  function fill(tpl, map) {
    return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (k in map ? encodeURIComponent(map[k]) : `{${k}}`))
  }

  /* 带 timeout + 重试的 fetch（静态站点也统一走这里） */
  async function request(url, opt) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), CFG.REMOTE.timeout || 8000)
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: (CFG.REMOTE.headers) || {},
        cache: 'no-cache',
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    } finally {
      clearTimeout(t)
    }
  }

  /* ---------- 静态兜底数据（mock 文件不可用时） ---------- */
  function svgCover(hue, title) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,58%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},72%,46%)"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><g stroke="#fff" stroke-opacity=".45" fill="none" stroke-width="4"><rect x="310" y="140" width="180" height="230" rx="10"/><path d="M400 140v230M340 195h40M340 235h40M340 275h40M420 195h40M420 235h40"/></g><text x="40" y="455" fill="#fff" fill-opacity=".85" font-size="26" font-family="sans-serif">${title || '读书月 · 本地示例'}</text></svg>`
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  }

  function buildFallback() {
    const titles = [
      '《活着》读后感：把日子过成一条河', '在《三体》里，我第一次对宇宙感到害怕',
      '读《人类简史》：我们为什么相信故事', '《小王子》教会我的三件事，与长大有关',
      '《月亮与六便士》：满地都是六便士，他却抬头看见了月亮', '《平凡的世界》里，最打动我的不是奋斗，是温柔',
      '《百年孤独》读了三遍，才懂开头那句话', '《瓦尔登湖》：一个人也可以活得很好',
      '《围城》里的比喻，值一整本摘抄本', '《你当像鸟飞往你的山》：教育是一场自我救赎',
      '《边城》：所有等待，最后都成了风景', '《苏东坡传》：把苦难活成诗的人',
    ]
    const exs = [
      '熬夜读到第三章，窗外天都亮了。那一刻我觉得文字像灯，把心里看不见的地方照亮了一小块。',
      '以为是本薄薄的小书，结果是本厚厚的镜子。照见了很多我一直回避的东西。',
      '通勤路上读的，地铁到站了也舍不得放下，硬是坐过了两站。',
      '读完之后我绕着操场走了三圈。有些书就是这样，读完你不想说话，只想走一走。',
    ]
    const cm = ['写得真好，收藏了！', '这本书我也读过，看到你这段又想重读一遍。', '已经在图书馆预约了，谢谢推荐📚']
    const nick = ['青柠不加冰', '晚八点读书人', '图书馆常驻居民', '半页纸', '南山有木', '墨鱼丸子']
    const cats = ['文学', '小说', '科幻', '历史', '成长']
    const n = CFG.FALLBACK_COUNT || 24
    const list = []
    for (let i = 0; i < n; i++) {
      const ts = now() - i * 86400000 * 0.8 - i * 3600000
      const id = 'fb-' + (i + 1)
      const cmts = Array.from({ length: 3 }, (_, k) => ({
        id: id + '-c' + k, user: nick[(i + k) % nick.length], avatarText: nick[(i + k) % nick.length][0],
        content: cm[(i + k) % cm.length], time: fmtTime(ts + (k + 1) * 5400000), likes: ((i * 7 + k * 13) % 90),
      }))
      list.push({
        id, title: titles[i % titles.length], cover: svgCover((i * 47) % 360, '本地示例'),
        excerpt: exs[i % exs.length],
        author: { name: nick[i % nick.length], avatar: svgCover((i * 47 + 180) % 360, nick[i % nick.length][0]), college: '文学院' },
        time: fmtTime(ts), timestamp: ts,
        likes: 20 + ((i * 37) % 500), commentCount: 3, views: 300 + (i * 97) % 5000,
        liked: false, category: cats[i % cats.length], tags: ['本地示例', cats[i % cats.length]],
        comments: cmts.slice(0, 2),
      })
    }
    return list
  }

  /* ---------- 归一化：把不同来源的数据整理成统一结构 ---------- */
  function normalizePost(raw) {
    return {
      id: raw.id,
      title: raw.title,
      cover: raw.cover || raw.image || raw.thumbnail || svgCover(220, raw.title),
      excerpt: raw.excerpt || raw.summary || raw.digest || '',
      author: {
        name: (raw.author && raw.author.name) || raw.author || raw.username || '匿名读者',
        avatar: (raw.author && raw.author.avatar) || raw.avatar || '',
        college: (raw.author && raw.author.college) || raw.college || '',
      },
      time: raw.time || (raw.timestamp ? fmtTime(raw.timestamp) : ''),
      timestamp: raw.timestamp || (raw.time ? Date.parse(raw.time.replace(' ', 'T') + '+08:00') || 0 : 0),
      likes: raw.likes ?? raw.like_count ?? 0,
      commentCount: raw.commentCount ?? (raw.comments ? raw.comments.length : 0) ?? 0,
      views: raw.views ?? raw.read_count ?? 0,
      liked: !!raw.liked,
      category: raw.category || raw.channel || '全部',
      tags: raw.tags || [],
      comments: raw.comments || [],
    }
  }

  const FALLBACK = buildFallback()

  /* ==========================================================
   *  Mock 来源（本地静态 JSON）
   *  策略：首次访问时把全部分页拉下来缓存，之后在内存里做
   *        分类过滤 + 分页，保证「切换分类后无限滚动依然有效」。
   * ========================================================== */
  let ALL_CACHE = null
  let ALL_LOADING = null

  async function loadAllMock() {
    if (ALL_CACHE) return ALL_CACHE
    if (ALL_LOADING) return ALL_LOADING
    ALL_LOADING = (async () => {
      const first = await request(fill(CFG.MOCK.feed, { page: 1 }))
      const d0 = first.data || first
      const totalPages = d0.totalPages || Math.ceil((d0.total || 0) / (d0.pageSize || CFG.PAGE_SIZE)) || 1
      const pages = [d0.list || d0.posts || []]
      const rest = []
      for (let p = 2; p <= totalPages; p++) rest.push(request(fill(CFG.MOCK.feed, { page: p })))
      const settled = await Promise.all(rest)
      settled.forEach((r) => {
        const dd = r.data || r
        pages.push(dd.list || dd.posts || [])
      })
      ALL_CACHE = pages.flat().map(normalizePost)
      return ALL_CACHE
    })()
    try { return await ALL_LOADING } finally { ALL_LOADING = null }
  }

  /* ---------- 查询：分类 / 关键词 / 标签 / 排序 ---------- */
  function applyQuery(list, q) {
    q = q || {}
    let out = list

    if (q.cat && q.cat !== '全部') out = out.filter((p) => p.category === q.cat)
    if (q.tag) out = out.filter((p) => (p.tags || []).indexOf(q.tag) > -1)

    const kw = (q.q || '').trim().toLowerCase()
    if (kw) {
      out = out.filter((p) => {
        const hay = [p.title, p.excerpt, p.author && p.author.name, p.category, (p.tags || []).join(' ')]
          .join(' ').toLowerCase()
        return hay.indexOf(kw) > -1
      })
    }

    const sort = q.sort || 'new'
    if (sort === 'hot') out = out.slice().sort((a, b) => b.likes - a.likes)
    else if (sort === 'comments') out = out.slice().sort((a, b) => b.commentCount - a.commentCount)
    else out = out.slice().sort((a, b) => b.timestamp - a.timestamp)

    return out
  }

  async function mockFeed(page, query) {
    const size = CFG.PAGE_SIZE
    /* 首屏直读第 1 页（最快首屏），同时后台预热全量缓存 */
    const plain = !query || (!query.cat || query.cat === '全部') && !query.q && !query.tag && (!query.sort || query.sort === 'new')
    if (!ALL_CACHE && page === 1 && plain) {
      loadAllMock().catch(() => {}) // 后台预热，不阻塞首屏
      const res = await request(fill(CFG.MOCK.feed, { page: 1 }))
      const d = res.data || res
      const list = (d.list || d.posts || []).map(normalizePost)
      return { list, hasMore: (d.hasMore ?? list.length > 0), total: d.total ?? list.length }
    }
    const filtered = applyQuery(await loadAllMock(), query)
    const list = filtered.slice((page - 1) * size, page * size)
    return { list, hasMore: page * size < filtered.length, total: filtered.length }
  }

  /* 分类 / 标签 / 作者 汇总（mock 从全量统计；remote 取第 1 页尽力而为） */
  async function facets() {
    try {
      const all = CFG.SOURCE === 'remote' ? (await remoteFeed(1, {})).list : await loadAllMock()
      const tags = {}
      all.forEach((p) => (p.tags || []).forEach((t) => { tags[t] = (tags[t] || 0) + 1 }))
      return {
        categories: categoriesOf(all),
        tags: Object.keys(tags).sort((a, b) => tags[b] - tags[a]),
        total: all.length,
      }
    } catch (e) {
      return {
        categories: ['全部', '文学', '小说', '科幻', '历史', '社科', '成长', '心理', '自然', '教育'],
        tags: ['深夜读书', '一周一书', '读书笔记', '我的书架', '金句摘抄', '读完就写'],
        total: 0,
      }
    }
  }

  async function mockDetail(id) {
    if (id.startsWith('fb-')) {
      const p = FALLBACK.find((x) => x.id === id)
      if (!p) throw new Error('not found')
      return buildFallbackDetail(p)
    }
    const res = await request(fill(CFG.MOCK.detail, { id }))
    const d = res.data || res
    return normalizeDetail(d, id)
  }

  /* ==========================================================
   *  Remote 来源（第三方内容 API）
   * ========================================================== */
  async function remoteFeed(page, query) {
    query = query || {}
    const res = await request(fill(CFG.REMOTE.feed, {
      page, size: CFG.PAGE_SIZE,
      cat: !query.cat || query.cat === '全部' ? '' : query.cat,
      q: query.q || '', tag: query.tag || '', sort: query.sort || 'new',
    }))
    const d = res.data || res
    const posts = (d.list || d.posts || d.items || d.data || []).map(normalizePost)
    /* 若第三方接口不支持筛选，这里再兜一层本地过滤，保证交互始终有效 */
    const filtered = applyQuery(posts, query)
    return {
      list: filtered.length === posts.length ? posts : filtered,
      hasMore: d.hasMore ?? (d.has_more ?? posts.length >= CFG.PAGE_SIZE),
      total: d.total ?? filtered.length,
    }
  }

  async function remoteDetail(id) {
    const res = await request(fill(CFG.REMOTE.detail, { id }))
    const d = res.data || res
    return normalizeDetail(d, id)
  }

  /* ---------- 详情归一化 ---------- */
  function normalizeDetail(d, id) {
    const base = normalizePost(d)
    return {
      ...base,
      id: base.id || id,
      contentHtml: d.contentHtml || d.content || d.body || '<p>' + (d.excerpt || '内容加载中…') + '</p>',
      book: d.book || null,
      comments: (d.comments || base.comments || []).map((c) => ({
        id: c.id || Math.random().toString(36).slice(2),
        user: c.user || c.username || c.author || '匿名读者',
        avatarText: (c.user || c.username || '读')[0],
        content: c.content || c.text || '',
        time: c.time || (c.timestamp ? fmtTime(c.timestamp) : ''),
        likes: c.likes || 0,
        liked: false,
      })),
      related: d.related || [],
    }
  }

  /* file:// 打开时的详情兜底 */
  function buildFallbackDetail(p) {
    return normalizeDetail({
      ...p,
      contentHtml: `<p>${p.excerpt}</p><h2>为什么读它</h2><p>选这本书其实是偶然。图书馆的灯光偏暖，书脊上有一道旧折痕，像被很多人温柔地翻过。</p><blockquote>你读过的每一页，都有人正在读。</blockquote><p>读的过程中我一直在想一个问题：我们读书，到底是在读别人，还是在读自己？如果你也在读书月里读到了这本书，欢迎在评论区和我交换感受。</p>`,
      related: FALLBACK.filter((x) => x.id !== p.id).slice(0, 2).map((x) => ({ id: x.id, title: x.title, cover: x.cover, time: x.time })),
    }, p.id)
  }

  /* ==========================================================
   *  对外 API
   * ========================================================== */
  async function getFeed(page, query) {
    if (CFG.SOURCE === 'remote') {
      try {
        const r = await remoteFeed(page, query)
        if (r.list.length) return r
        throw new Error('remote empty')
      } catch (e) {
        console.warn('[api] remote feed 失败，回退本地：', e.message)
      }
    }
    if (location.protocol === 'file:') throw new Error('file:// 下无法读取 mock JSON')
    return mockFeed(page, query)
  }

  async function getDetail(id) {
    if (CFG.SOURCE === 'remote') {
      try { return await remoteDetail(id) } catch (e) { console.warn('[api] remote detail 失败，回退本地：', e.message) }
    }
    if (location.protocol !== 'file:') {
      try { return await mockDetail(id) } catch (e) { console.warn('[api] mock detail 失败，走兜底：', e.message) }
    }
    const p = FALLBACK.find((x) => x.id === id)
    if (p) return buildFallbackDetail(p)
    throw new Error('内容不存在')
  }

  /* 点赞/评论上报：mock 模式仅本地生效；remote 配置了地址则上报 */
  async function reportLike(id, liked) {
    if (CFG.SOURCE === 'remote' && CFG.REMOTE.like) {
      try { await request(fill(CFG.REMOTE.like, { id }) + (liked ? '?liked=1' : '?liked=0'), { method: 'POST' }) } catch (e) { /* 上报失败不阻塞交互 */ }
    }
    return true
  }
  async function reportComment(id, text) {
    if (CFG.SOURCE === 'remote' && CFG.REMOTE.comment) {
      try { await request(fill(CFG.REMOTE.comment, { id }), { method: 'POST', body: JSON.stringify({ content: text }) }) } catch (e) {}
    }
    return true
  }

  function categoriesOf(posts) {
    const set = new Set()
    posts.forEach((p) => p.category && set.add(p.category))
    return ['全部', ...set]
  }

  window.API = { getFeed, getDetail, facets, reportLike, reportComment, categoriesOf, fallbackList: FALLBACK, fmtTime }
})()
