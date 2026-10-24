/* ==========================================================================
 * app.js —— 首页逻辑：介绍页引导 → 无限信息流 → 分类筛选 → 右下角投稿
 * ========================================================================== */
(function () {
  'use strict'
  const CFG = window.READING_MONTH
  const API = window.API
  const UI = window.UI

  const $ = (s, r) => (r || document).querySelector(s)
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s))

  const elList = $('#feedList')
  const elStatus = $('#feedStatus')
  const elProgress = $('#progress')
  const elTopbar = $('#topbar')
  const elBackTop = $('#backTop')
  const elHint = $('#scrollHint')
  const elChips = $('#chips')
  const elApiHint = $('#apiHint')
  const elToast = $('#toast')
  const elSorts = $('#sorts')
  const elTags = $('#tags')
  const elSearchForm = $('#searchForm')
  const elSearchInput = $('#searchInput')
  const elSearchClear = $('#searchClear')
  const elSummary = $('#filterSummary')

  const esc = (s) => UI.esc(s)

  /* 点赞交互：整表委托一次，所有卡片（含之后插入的）都生效 */
  UI.bindLike(elList)

  /* ---------- Toast ---------- */
  let toastTimer
  function toast(text, long) {
    elToast.textContent = text
    elToast.classList.add('is-in')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => elToast.classList.remove('is-in'), long ? 3800 : 2400)
  }

  /* ---------- 数据源标签 ---------- */
  const srcLabel = CFG.SOURCE === 'remote' ? '远程 API' : '本地 Mock API'
  elApiHint.innerHTML = `数据来源：${srcLabel} · <code>mock/api/posts/page-N.json</code> · 纯静态，可在 <code>config.js</code> 切换远程接口`

  /* 空态 */
  const emptyHTML = `
<div class="empty"><b>📚</b>书架上没有找到符合条件的读书感受<br><small style="font-size:12px">换个关键词，或放宽筛选条件试试</small><br><button class="chip" id="chipReset" style="margin-top:12px">重置全部筛选</button></div>`

  /* =========================================================
   * 一、倒计时 + 数字滚动
   * ========================================================= */
  function nextCycle() {
    const y = new Date().getFullYear()
    return {
      start: new Date(y, CFG.ACTIVITY.startMonth - 1, CFG.ACTIVITY.startDay),
      end: new Date(y, CFG.ACTIVITY.endMonth - 1, CFG.ACTIVITY.endDay, 23, 59, 59),
    }
  }
  const { start, end } = nextCycle()
  const cd = { d: $('#cdDay'), h: $('#cdHour'), m: $('#cdMin'), s: $('#cdSec') }
  function tickCountdown() {
    let ms = end - Date.now()
    if (ms < 0) ms = 0 // 已结束显示 0
    if (Date.now() < start) ms = end - start // 未开始也显示总时长
    const d = Math.floor(ms / 86400000)
    const h = Math.floor(ms % 86400000 / 3600000)
    const m = Math.floor(ms % 3600000 / 60000)
    const s = Math.floor(ms % 60000 / 1000)
    cd.d.textContent = pad(d); cd.h.textContent = pad(h); cd.m.textContent = pad(m); cd.s.textContent = pad(s)
  }
  const pad = (n) => String(n).padStart(2, '0')
  tickCountdown()
  setInterval(tickCountdown, 1000)

  /* 数据统计的数字滚动 */
  const counters = $$('[data-count]')
  const seen = new WeakSet()
  function runCounter(elm) {
    if (seen.has(elm)) return
    seen.add(elm)
    const target = Number(elm.dataset.count) || 0
    const t0 = performance.now()
    const dur = 1400
    ;(function step(t) {
      const k = Math.min(1, (t - t0) / dur)
      elm.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString()
      if (k < 1) requestAnimationFrame(step)
    })(t0)
  }

  /* =========================================================
   * 二、介绍页 → 主界面 的滚动引导
   * ========================================================= */
  const feedEl = $('#feed')

  /* 首次进入时给 URL 加锚点，下方使用 a[href="#feed"] 的跳转都可生效 */
  if (!location.hash) history.replaceState(null, '', '#intro')

  /* 顶部进度条（0~1）＋ 吸顶导航显隐 ＋ 回到顶部显隐 */
  function onScrollUI() {
    const y = window.scrollY
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight)
    elProgress.style.width = Math.min(100, y / max * 100).toFixed(2) + '%'
    elTopbar.classList.toggle('is-in', y > innerHeight * 0.6)
    elBackTop.classList.toggle('is-in', y > innerHeight * 1.2)
    if (feedEl && elHint) {
      const feedTop = feedEl.getBoundingClientRect().top
      if (feedTop < innerHeight * 0.2 && elHint && !elHint.classList.contains('is-hidden')) {
        elHint.classList.add('is-hidden')
      }
    }
  }
  addEventListener('scroll', onScrollUI, { passive: true })
  onScrollUI()

  /* 下滑提示按钮 → 平滑滚动到主界面 */
  if (elHint) elHint.addEventListener('click', () => feedEl.scrollIntoView({ behavior: 'smooth' }))

  /* 点「活动规则」弹 toast（演示用；正式替换为规则页链接） */
  const ctaRule = $('#ctaRule')
  if (ctaRule) ctaRule.addEventListener('click', (e) => {
    e.preventDefault()
    toast('活动规则页建设中：读书月期间每读完 1 本书可投稿 1 篇感受，优秀作品将在感受墙展示。')
  })

  /* 「进入感受墙」很多场合会与 hash 加载冲突，这里改为 JS 控制 */
  const ctaStart = $('#ctaStart')
  if (ctaStart) ctaStart.addEventListener('click', (e) => {
    e.preventDefault()
    feedEl.scrollIntoView({ behavior: 'smooth' })
  })

  /* IntersectionObserver：进入 feed 后触发数字滚动；导航高亮 */
  const ioHead = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-seen')
        if (en.target === feedEl) counters.forEach(runCounter)
        ioHead.unobserve(en.target)
      }
    })
  }, { threshold: 0.18 })
  $$('.reveal-in').forEach((e) => ioHead.observe(e))
  ioHead.observe(feedEl)

  /* 双向导航高亮 */
  const links = $$('.topbar__link')
  const ioNav = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return
      const id = en.target.id
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + id))
    })
  }, { threshold: 0.35 })
  ;[feedEl, $('#intro')].forEach((e) => e && ioNav.observe(e))

  /* =========================================================
   * 三、无限滚动信息流 + 搜索 / 筛选
   * ========================================================= */
  const state = {
    page: 0, loading: false, ended: false,
    sentinel: null, listedIds: new Set(),
    /* 查询条件：分类 cat、关键词 q、标签 tag、排序 sort */
    query: { cat: '全部', q: '', tag: '', sort: 'new' },
    /* 已渲染的总条数，用于筛选摘要 */
    shown: 0,
  }

  function setStatus(mode) {
    if (mode === 'loading') {
      elStatus.className = 'feed__status'
      elStatus.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>正在翻下一页…</span>`
      elStatus.hidden = false
    } else if (mode === 'end') {
      elStatus.className = 'feed__status is-end'
      elStatus.innerHTML = `<span>❦ 这一册翻完了 · 共 ${state.shown} 篇感受</span>`
      elStatus.hidden = false
    } else {
      elStatus.hidden = true
    }
  }

  /* 底部哨兵，接近底部自动翻页 */
  const elSentinel = $('#feedSentinel')
  function mountSentinel() {
    if (state.sentinel) return // 只挂一次；后续页面复用同一哨兵
    state.sentinel = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting && !state.loading && !state.ended) loadNext() })
    }, { rootMargin: '600px 0px' })
    state.sentinel.observe(elSentinel)
  }

  async function loadNext() {
    if (state.loading || state.ended) return
    state.loading = true
    elList.setAttribute('aria-busy', 'true')

    /* 骨架屏只在真正空列表时出现，翻页保持当前内容不闪动 */
    const first = state.page === 0
    if (first) {
      elList.innerHTML = Array.from({ length: 4 }, UI.skeletonHTML).join('')
      setStatus('loading')
    }

    const page = state.page + 1
    try {
      const res = await API.getFeed(page, state.query)
      const posts = res.list

      const fresh = posts.filter((p) => !state.listedIds.has(p.id))
      fresh.forEach((p) => state.listedIds.add(p.id))

      const html = fresh.map((p, i) => UI.cardHTML(p, i, state.query.q)).join('')
      if (first) elList.innerHTML = html || emptyHTML
      else if (html) elList.insertAdjacentHTML('beforeend', html)

      /* 结束判断：接口说没了 / 这一页空了 / 已渲染完全部 */
      const exhausted = res.hasMore === false || posts.length === 0 ||
        (typeof res.total === 'number' && state.listedIds.size >= res.total)

      state.page = page
      state.shown = state.listedIds.size
      mountSentinel()
      renderSummary()

      if (exhausted) {
        state.ended = true
        /* 有内容但确实到底 → 显示到底提示；完全没内容 → 空态 */
        if (state.listedIds.size === 0 && !html) elList.innerHTML = emptyHTML
        setStatus(state.listedIds.size === 0 ? 'hidden' : 'end')
      } else {
        setStatus('loading')
      }
    } catch (err) {
      if (state.listedIds.size === 0) {
        /* file:// 或 mock 不可用：用内置静态兜底数据 */
        const fb = API.fallbackList
        if (fb.length) {
          elList.innerHTML = fb.map((p, i) => UI.cardHTML(p, i)).join('')
          renderChips(API.categoriesOf(fb))
          state.shown = fb.length
          state.ended = true
          setStatus('end')
          elApiHint.innerHTML = `⚠️ 静态兜底数据（<code>${location.protocol}</code> 下读不到 mock JSON）。建议用本地服务器访问，或在 <code>config.js</code> 接入远程 API`
          toast('已启用静态兜底数据 · 建议用本地服务器访问')
        } else {
          elList.innerHTML = emptyHTML
          setStatus('hidden')
          elApiHint.textContent = '数据加载失败：' + (err.message || err)
        }
      } else {
        state.ended = true
        setStatus('end')
        toast('内容加载失败，已停止自动加载')
      }
      console.warn('[feed] load error:', err)
    } finally {
      state.loading = false
      elList.setAttribute('aria-busy', 'false')
    }
  }

  /* ---------- 分类筛选 ---------- */
  function renderChips(cats) {
    elChips.innerHTML = cats.map((c) =>
      `<button class="chip" role="tab" aria-selected="${c === state.query.cat}" data-cat="${UI.esc(c)}">${UI.esc(c)}</button>`).join('')
    syncChips()
  }
  function syncChips() {
    $$('.chip', elChips).forEach((c) => c.classList.toggle('is-on', c.dataset.cat === state.query.cat))
    $$('.chip', elTags).forEach((c) => c.classList.toggle('is-on', c.dataset.tag === state.query.tag))
    $$('.chip', elSorts).forEach((c) => c.classList.toggle('is-on', c.dataset.sort === state.query.sort))
  }

  /* 统一重置：任一筛选条件变化后重新从第 1 页加载 */
  function resetFeed(patch) {
    Object.assign(state.query, patch)
    state.page = 0
    state.ended = false
    state.listedIds.clear()
    state.shown = 0
    elList.innerHTML = ''
    setStatus('hidden')
    syncChips()
    renderSummary()
    syncSearchClear()
    loadNext()
  }

  /* 当前筛选条件摘要 */
  function renderSummary() {
    const q = state.query
    const parts = []
    if (q.q) parts.push(`关键词「<b>${UI.esc(q.q)}</b>」`)
    if (q.cat && q.cat !== '全部') parts.push(`分类「<b>${UI.esc(q.cat)}</b>」`)
    if (q.tag) parts.push(`标签「<b>${UI.esc(q.tag)}</b>」`)
    const sortName = { new: '最新', hot: '最热', comments: '评论最多' }[q.sort] || '最新'
    parts.push(`排序「<b>${sortName}</b>」`)
    elSummary.hidden = false
    elSummary.innerHTML = parts.join(' · ') +
      (state.shown ? ` · 已显示 ${state.shown} 篇` : '') +
      ` <button class="reset" id="resetAll">重置</button>`
  }

  elChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip')
    if (!chip || chip.dataset.cat === state.query.cat) return
    resetFeed({ cat: chip.dataset.cat })
  })

  elTags.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip')
    if (!chip) return
    const tag = chip.dataset.tag === state.query.tag ? '' : chip.dataset.tag
    resetFeed({ tag })
  })

  elSorts.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip')
    if (!chip || chip.dataset.sort === state.query.sort) return
    resetFeed({ sort: chip.dataset.sort })
  })

  elList.addEventListener('click', (e) => {
    if (e.target.closest('#chipReset')) resetFeed({ q: '', cat: '全部', tag: '', sort: 'new' })
    if (e.target.closest('#resetAll')) resetFeed({ q: '', cat: '全部', tag: '', sort: 'new' })
  })

  /* ---------- 搜索：输入防抖 + 提交 + 清空 ---------- */
  let searchTimer
  function syncSearchClear() { elSearchClear.hidden = !elSearchInput.value }

  elSearchInput.addEventListener('input', () => {
    syncSearchClear()
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      const v = elSearchInput.value.trim()
      if (v === state.query.q) return
      resetFeed({ q: v })
    }, 350)
  })

  elSearchForm.addEventListener('submit', (e) => {
    e.preventDefault()
    clearTimeout(searchTimer)
    const v = elSearchInput.value.trim()
    if (v === state.query.q) { if (v) toast(`正在查看「${v}」的搜索结果`); return }
    resetFeed({ q: v })
  })

  elSearchClear.addEventListener('click', () => {
    clearTimeout(searchTimer)
    elSearchInput.value = ''
    syncSearchClear()
    resetFeed({ q: '' })
    elSearchInput.focus()
  })

  /* 卡片显示数据源 */
  elList.addEventListener('feedlike', (e) => {
    if (e.detail.liked) toast('感谢点赞 · 已同步到「我的点赞」')
  })

  /* 卡片点击 → 详情页 */
  elList.addEventListener('click', (e) => {
    if (e.target.closest('.act--like')) return // 点赞不跳转
    const card = e.target.closest('[data-id]')
    if (!card) return
    if (e.target.closest('a')) return
    location.href = card.dataset.href || ('detail.html?id=' + encodeURIComponent(card.dataset.id))
  })

  /* =========================================================
   * 四、右下角「提交投稿」
   * ========================================================= */
  const fab = $('#fabSubmit')
  if (CFG.SUBMIT_URL && fab) fab.href = CFG.SUBMIT_URL
  if (fab) {
    fab.addEventListener('click', (e) => {
      /* 保留跳转能力，同时留痕提示（正式投产时可移除 toast） */
      if (CFG.SOURCE === 'mock') toast('正在前往投稿页（演示环境 → 百度）…', true)
    })
  }

  /* =========================================================
   * 五、回到顶部
   * ========================================================= */
  elBackTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))

  /* =========================================================
   * 启动
   * ========================================================= */
  elList.setAttribute('aria-busy', 'false')
  setStatus('hidden')
  renderSummary()
  loadNext()                                   // 首屏立即加载，不等筛选条件
  API.facets().then((f) => {                   // 分类 / 标签独立获取（来自 API 全量数据）
    if (f.categories && f.categories.length) renderChips(f.categories)
    if (elTags && f.tags && f.tags.length) {
      elTags.innerHTML = `<span class="chips__label">#</span>` + f.tags.slice(0, 10).map((t) =>
        `<button class="chip" role="tab" aria-selected="false" data-tag="${UI.esc(t)}">${UI.esc(t)}</button>`).join('')
      syncChips()
    }
  }).catch(() => {})

  /* 错误兜底：全局异常提示 */
  addEventListener('error', (e) => console.warn('[runtime]', e.message))
})()
