/* ==========================================================================
 * app.js —— 首页逻辑
 *   一、倒计时        二、滚动进度 / 导航
 *   三、首屏视效      四、信息流（分页 / 搜索 / 筛选 / 排序）
 *   五、投稿入口
 * ========================================================================== */
(function () {
  'use strict'

  const CFG = window.READING_MONTH || {}
  const API = window.API
  const UI = window.UI
  const FX = window.FX || {}

  const $ = (sel, root) => (root || document).querySelector(sel)
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel))

  /* ---------- 元素 ---------- */
  const elProgress = $('#progress')
  const elTopbar = $('#topbar')
  const elHint = $('#scrollHint')
  const elBackTop = $('#backTop')
  const elFeed = $('#feed')
  const elSubmit = $('#submit')
  const elList = $('#feedList')
  const elStatus = $('#feedStatus')
  const elSentinel = $('#feedSentinel')
  const elChips = $('#chips')
  const elTags = $('#tags')
  const elSorts = $('#sorts')
  const elSearchForm = $('#searchForm')
  const elSearchInput = $('#searchInput')
  const elSearchClear = $('#searchClear')
  const elSummary = $('#filterSummary')
  const elApiHint = $('#apiHint')
  const elFab = $('#fabSubmit')
  const elToast = $('#toast')

  /* ---------- Toast ---------- */
  let toastTimer = 0
  function toast(text, long) {
    if (!elToast) return
    elToast.textContent = text
    elToast.classList.add('is-in')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => elToast.classList.remove('is-in'), long ? 3600 : 2200)
  }

  /* ========================================================================
   * 一、倒计时与届次
   *   活动周期每年 4/23 — 5/23。还没到本届闭幕就算本届，过了闭幕就滚到下一届；
   *   届次由年份推导（2026 = 第 12 届），徽章、倒计时说明与页面标题共用这一届。
   * ====================================================================== */
  const EDITION_BASE = { year: 2026, edition: 12 }

  function initCountdown() {
    const box = $('#countdown')
    if (!box) return

    const act = CFG.ACTIVITY || { startMonth: 4, startDay: 23, endMonth: 5, endDay: 23 }
    const cd = { d: $('#cdDay'), h: $('#cdHour'), m: $('#cdMin'), s: $('#cdSec') }
    const pad = (n) => String(n).padStart(2, '0')

    const rangeOf = (year) => ({
      start: new Date(year, act.startMonth - 1, act.startDay, 0, 0, 0),
      end: new Date(year, act.endMonth - 1, act.endDay, 23, 59, 59),
    })

    /* 取「正在进行或即将开始」的那一届：过了 5/23 闭幕就滚到下一届 */
    let year = new Date().getFullYear()
    let range = rangeOf(year)
    if (Date.now() > range.end.getTime()) {
      year += 1
      range = rangeOf(year)
    }

    const edition = EDITION_BASE.edition + (year - EDITION_BASE.year)
    const beforeStart = Date.now() < range.start.getTime()

    /* 徽章 / 倒计时说明 / 页面标题都指向同一届，年份与届次不再打架 */
    const badgeText = $('.hero__badge .badge-text')
    if (badgeText) badgeText.textContent = `${year} 校园读书月 · 第 ${edition} 届`

    const label = $('#cdLabel')
    if (label) {
      label.textContent = beforeStart
        ? `距离下一届读书月 · ${year} 年 ${act.startMonth} 月 ${act.startDay} 日开幕`
        : `本届读书月还剩 · ${act.endMonth} 月 ${act.endDay} 日闭幕`
      label.hidden = false
    }

    if (document.title.indexOf(' 校园读书月') > -1) {
      document.title = document.title.replace(/\d{4}(?= 校园读书月)/, year)
    }
    const desc = $('meta[name="description"]')
    if (desc && desc.content.indexOf(' 校园读书月') > -1) {
      desc.content = desc.content.replace(/\d{4}(?= 校园读书月)/, year)
    }

    function render() {
      const target = beforeStart ? range.start.getTime() : range.end.getTime()
      const ms = Math.max(0, target - Date.now())
      if (cd.d) cd.d.textContent = pad(Math.floor(ms / 86400000))
      if (cd.h) cd.h.textContent = pad(Math.floor((ms % 86400000) / 3600000))
      if (cd.m) cd.m.textContent = pad(Math.floor((ms % 3600000) / 60000))
      if (cd.s) cd.s.textContent = pad(Math.floor((ms % 60000) / 1000))
    }

    let timer = 0
    const start = () => { clearInterval(timer); timer = setInterval(render, 1000) }

    render()
    start()

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInterval(timer)
      else { render(); start() }
    })
  }

  /* ========================================================================
   * 二、滚动进度 / 导航 / 回顶
   * ====================================================================== */
  function initScrollUI() {
    let ticking = false
    let barShown = null
    let topShown = null
    let fabShown = null

    function apply() {
      ticking = false
      const y = window.scrollY || 0
      const vh = window.innerHeight || 1
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)

      if (elProgress) elProgress.style.width = Math.min(100, (y / max) * 100).toFixed(2) + '%'

      const showBar = y > vh * 0.55
      if (showBar !== barShown) {
        if (elTopbar) elTopbar.classList.toggle('is-in', showBar)
        barShown = showBar
      }

      const showTop = y > vh * 1.1
      if (showTop !== topShown) {
        if (elBackTop) elBackTop.classList.toggle('is-in', showTop)
        topShown = showTop
      }

      /* 投稿书签首屏不出现：等信息流顶上来再淡入，避免压住首屏两个 CTA */
      const showFab = elFeed ? elFeed.getBoundingClientRect().top < vh * 0.35 : false
      if (showFab !== fabShown) {
        if (elFab) elFab.classList.toggle('is-in', showFab)
        fabShown = showFab
      }

      if (elHint && elFeed) {
        elHint.classList.toggle('is-hidden', elFeed.getBoundingClientRect().top < vh * 0.35)
      }

      /* 跳到投稿区块时先按住无限滚动，别让新卡片把目标顶走 */
      const subTop = feedHold && elSubmit ? elSubmit.getBoundingClientRect().top : 0
      if (feedHold && subTop < vh) feedHoldSeen = true
      else if (feedHold && feedHoldSeen) { feedHold = false; feedHoldSeen = false; autoFill() }
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(apply) }
    }, { passive: true })
    window.addEventListener('resize', apply, { passive: true })
    apply()

    if (elBackTop) {
      elBackTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }

    const gotoFeed = () => elFeed && elFeed.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (elHint) elHint.addEventListener('click', gotoFeed)
    const ctaStart = $('#ctaStart')
    if (ctaStart) ctaStart.addEventListener('click', (e) => { e.preventDefault(); gotoFeed() })

    /* 导航高亮 */
    const links = $$('.topbar__link')
    if (links.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const hash = '#' + entry.target.id
          links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === hash))
        })
      }, { threshold: 0.35 })
      ;[elFeed, $('#intro')].forEach((el) => el && io.observe(el))
    }
  }

  /* ========================================================================
   * 三、数字滚动 + 首屏视效
   * ====================================================================== */
  function countUp(el) {
    if (el.dataset.done) return
    el.dataset.done = '1'
    const target = Number(el.dataset.count) || 0
    const t0 = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1300)
      const eased = 1 - Math.pow(1 - k, 3)
      el.textContent = Math.round(target * eased).toLocaleString('zh-CN')
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  function initCounters() {
    /* 首屏统计由 initStats() 拿到真实数据后再填，不在这里预跑 */
    const nodes = $$('[data-count]').filter((el) => !el.dataset.stat)
    if (!nodes.length) return

    if (!('IntersectionObserver' in window)) { nodes.forEach(countUp); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        countUp(entry.target)
        io.unobserve(entry.target)
      })
    }, { threshold: 0.4 })
    nodes.forEach((el) => io.observe(el))
  }

  /* 首屏统计：和感受墙同源统计（书评 / 留言 / 分享者），不再写死宣传数字 */
  function statAuthorKey(item) {
    const a = item && item.author
    return (a && (a.id || a.name)) || ''
  }

  async function initStats() {
    const nodes = $$('.stats [data-stat]')
    if (!nodes.length) return
    const paint = (counts) => {
      nodes.forEach((el) => {
        el.dataset.count = String(Number(counts[el.dataset.stat]) || 0)
        delete el.dataset.done
        countUp(el)
      })
    }
    try {
      const all = []
      for (let page = 1; page <= 30; page++) {
        const res = await API.getFeed(page, { cat: '全部', sort: 'new' })
        const list = res.list || []
        all.push(...list)
        if (!res.hasMore || !list.length) break
      }
      const posts = all.filter((item) => item.type !== 'comment')
      paint({
        posts: posts.length,
        comments: all.length - posts.length,
        authors: new Set(posts.map(statAuthorKey).filter(Boolean)).size,
      })
    } catch (err) {
      /* file:// 或接口不可用：用内置兜底数据量，保证数字和真正渲染出来的内容一致 */
      const fb = API.fallbackList || []
      paint({
        posts: fb.length,
        comments: 0,
        authors: new Set(fb.map(statAuthorKey).filter(Boolean)).size,
      })
    }
  }

  function initHeroEffects() {
    if (FX.initInkCanvas) FX.initInkCanvas($('#inkCanvas'))
    if (FX.initHeroParallax) FX.initHeroParallax($('#intro'))
    if (FX.developImages) FX.developImages(document)
  }

  /* ========================================================================
   * 四、信息流
   * ====================================================================== */
  let feedHold = false, feedHoldSeen = false

  const feed = {
    page: 0,
    loading: false,
    ended: false,
    token: 0,
    ids: new Set(),
    shown: 0,
    query: { cat: '全部', q: '', tag: '', sort: 'new' },
  }

  const SORT_LABEL = { new: '刚出炉', hot: '最多共鸣', comments: '聊得热闹' }

  function setStatus(mode) {
    if (!elStatus) return
    if (mode === 'loading') {
      elStatus.className = 'feed__status'
      elStatus.hidden = false
      elStatus.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>正在翻下一页…</span>'
    } else if (mode === 'end') {
      elStatus.className = 'feed__status is-end'
      elStatus.hidden = false
      elStatus.innerHTML = `<span>❦ 这一册翻完了 · 共 ${feed.shown} 篇感受</span>`
    } else {
      /* 空闲：className 一并回到基础态，避免 is-end 的样式残留 */
      elStatus.className = 'feed__status'
      elStatus.hidden = true
    }
  }

  function renderSummary() {
    if (!elSummary) return
    const q = feed.query
    const active = !!q.q || !!q.tag || (q.cat && q.cat !== '全部') || (q.sort && q.sort !== 'new')

    if (!active) {
      elSummary.hidden = true
      elSummary.innerHTML = ''
      return
    }

    const parts = []
    if (q.q) parts.push(`关键词「<b>${UI.esc(q.q)}</b>」`)
    if (q.cat && q.cat !== '全部') parts.push(`分类「<b>${UI.esc(q.cat)}</b>」`)
    if (q.tag) parts.push(`标签「<b>${UI.esc(q.tag)}</b>」`)
    parts.push(`排序「<b>${SORT_LABEL[q.sort] || '刚出炉'}</b>」`)

    elSummary.hidden = false
    elSummary.innerHTML = parts.join(' · ') +
      (feed.shown ? ` · 已显示 ${feed.shown} 篇` : '') +
      ' <button class="reset" id="resetAll" type="button">重置</button>'
  }

  /* 三组都是「可切换按钮」：视觉 is-on 与 aria-pressed 必须同时同步 */
  function syncChips() {
    const q = feed.query
    const mark = (chip, on) => {
      chip.classList.toggle('is-on', on)
      chip.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
    $$('.chip', elChips).forEach((c) => mark(c, c.dataset.cat === q.cat))
    $$('.chip', elTags).forEach((c) => mark(c, c.dataset.tag === q.tag))
    $$('.chip', elSorts).forEach((c) => mark(c, c.dataset.sort === q.sort))
  }

  function syncSearchClear() {
    if (elSearchClear && elSearchInput) elSearchClear.hidden = !elSearchInput.value
  }

  /* 任一条件变化：清空列表，回到第 1 页 */
  function resetFeed(patch) {
    Object.assign(feed.query, patch || {})
    /* 重置（关键词被清空）时把搜索框一起清掉，空态里不该还留着旧词 */
    if (elSearchInput && !feed.query.q) elSearchInput.value = ''
    feed.page = 0
    feed.ended = false
    feed.ids.clear()
    feed.shown = 0
    feed.token += 1
    feed.loading = false
    if (elList) elList.innerHTML = ''
    setStatus('idle')
    syncChips()
    renderSummary()
    syncSearchClear()
    loadMore()
  }

  async function loadMore() {
    if (!elList || feed.loading || feed.ended || feedHold) return

    const token = ++feed.token
    feed.loading = true
    elList.setAttribute('aria-busy', 'true')

    const first = feed.page === 0
    if (first) elList.innerHTML = Array.from({ length: 3 }, UI.skeletonHTML).join('')
    /* 只有真正在请求时才显示「正在翻下一页…」 */
    setStatus('loading')

    try {
      const res = await API.getFeed(feed.page + 1, feed.query)
      if (token !== feed.token) return

      const fresh = (res.list || []).filter((p) => !feed.ids.has(p.id))
      fresh.forEach((p) => feed.ids.add(p.id))

      const html = fresh.map((p, i) => UI.feedItemHTML(p, i, feed.query.q)).join('')
      if (first) elList.innerHTML = html
      else if (html) elList.insertAdjacentHTML('beforeend', html)

      feed.page += 1
      feed.shown = feed.ids.size

      if (FX.developImages) FX.developImages(elList)
      if (UI.bindLike) UI.bindLike(elList)

      const exhausted = res.hasMore === false || (res.list || []).length === 0
      if (exhausted) {
        feed.ended = true
        if (!feed.shown) elList.innerHTML = UI.emptyHTML()
        setStatus(feed.shown ? 'end' : 'idle')
      } else {
        setStatus('idle')
      }

      renderSummary()
    } catch (err) {
      if (token !== feed.token) return
      handleLoadError(err)
    } finally {
      if (token === feed.token) {
        feed.loading = false
        elList.setAttribute('aria-busy', 'false')
      }
    }

    /* 放在 finally 之后：此时 loading 已复位，短页面才能继续补页 */
    if (token === feed.token && !feed.ended) autoFill()
  }

  /* 结果太少（大屏 / 窄分类）时自动补页，避免底部留白 */
  function autoFill() {
    if (feed.loading || feed.ended || !elSentinel) return
    if (elSentinel.getBoundingClientRect().top < window.innerHeight + 700) {
      setTimeout(() => { if (!feed.loading && !feed.ended) loadMore() }, 160)
    }
  }

  function handleLoadError(err) {
    console.warn('[feed]', err)
    const fallback = API.fallbackList || []

    if (!feed.shown && fallback.length) {
      elList.innerHTML = fallback.map((p, i) => UI.feedItemHTML(p, i, '')).join('')
      if (FX.developImages) FX.developImages(elList)
      if (UI.bindLike) UI.bindLike(elList)
      feed.shown = fallback.length
      feed.ended = true
      setStatus('end')
      if (elApiHint) {
        elApiHint.textContent = '当前为离线试读内容，仅展示部分读书感受'
      }
      toast('当前为离线试读内容')
      return
    }

    if (!feed.shown) {
      elList.innerHTML = UI.emptyHTML('内容加载失败', '请检查网络后重试')
      setStatus('idle')
    } else {
      feed.ended = true
      setStatus('end')
      toast('加载失败，已停止自动加载')
    }
  }

  /* ---------- 筛选 / 搜索 ---------- */
  function initFilters() {
    if (elChips) {
      elChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip')
        if (!chip || chip.dataset.cat === feed.query.cat) return
        resetFeed({ cat: chip.dataset.cat })
      })
    }

    if (elTags) {
      elTags.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip')
        if (!chip) return
        resetFeed({ tag: chip.dataset.tag === feed.query.tag ? '' : chip.dataset.tag })
      })
    }

    if (elSorts) {
      elSorts.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip')
        if (!chip || chip.dataset.sort === feed.query.sort) return
        resetFeed({ sort: chip.dataset.sort })
      })
    }

    /* 重置：摘要条在 #filterSummary、空态按钮在 #feedList，都不保证在同一个容器里 → 委托到 document */
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#resetAll, #chipReset')) return
      resetFeed({ q: '', cat: '全部', tag: '', sort: 'new' })
    })

    if (elList) {
      elList.addEventListener('click', (e) => {
        if (e.target.closest('.act--like')) return
        const card = e.target.closest('[data-id]')
        if (!card || e.target.closest('a')) return
        location.href = card.dataset.href || ('detail.html?id=' + encodeURIComponent(card.dataset.id))
      })

      elList.addEventListener('feedlike', (e) => {
        if (e.detail && e.detail.liked) toast('这一篇被你先喜欢了')
      })
    }

    /* 搜索：输入防抖 + 表单提交 + 清空 */
    let timer = 0
    if (elSearchInput) {
      elSearchInput.addEventListener('input', () => {
        syncSearchClear()
        clearTimeout(timer)
        timer = setTimeout(() => {
          const v = elSearchInput.value.trim()
          if (v !== feed.query.q) resetFeed({ q: v })
        }, 320)
      })
    }

    if (elSearchForm) {
      elSearchForm.addEventListener('submit', (e) => {
        e.preventDefault()
        clearTimeout(timer)
        const v = elSearchInput ? elSearchInput.value.trim() : ''
        if (v === feed.query.q) { if (v) toast(`正在查看「${v}」的搜索结果`); return }
        resetFeed({ q: v })
      })
    }

    if (elSearchClear) {
      elSearchClear.addEventListener('click', () => {
        if (!elSearchInput) return
        clearTimeout(timer)
        elSearchInput.value = ''
        syncSearchClear()
        resetFeed({ q: '' })
        elSearchInput.focus()
      })
    }

    /* 无限滚动哨兵 */
    if (elSentinel && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) loadMore() })
      }, { rootMargin: '700px 0px' })
      io.observe(elSentinel)
    }
  }

  async function initFacets() {
    try {
      const facets = await API.facets()

      if (elChips && facets.categories && facets.categories.length) {
        elChips.innerHTML = facets.categories.map((c) =>
          `<button class="chip" type="button" aria-pressed="${c === feed.query.cat}" data-cat="${UI.esc(c)}">${UI.esc(c)}</button>`
        ).join('')
      }

      if (elTags && facets.tags && facets.tags.length) {
        elTags.innerHTML = '<span class="chips__label" aria-hidden="true">#</span>' +
          facets.tags.slice(0, 10).map((t) =>
            `<button class="chip" type="button" aria-pressed="false" data-tag="${UI.esc(t)}">${UI.esc(t)}</button>`
          ).join('')
      }

      syncChips()
    } catch (err) {
      console.warn('[facets]', err)
    }
  }

  /* ========================================================================
   * 五、投稿入口
   * ====================================================================== */
  function initSubmit() {
    const fab = $('#fabSubmit')
    if (!fab) return
    if (CFG.SUBMIT_URL) fab.href = CFG.SUBMIT_URL
    const holdSubmit = () => {
      feedHold = true; feedHoldSeen = false; feed.token += 1; feed.loading = false
      elList.setAttribute('aria-busy', 'false'); setStatus('idle')
    }
    document.addEventListener('click', (e) => { if (e.target.closest('a[href="#submit"]')) holdSubmit() }, true)
  }

  /* ========================================================================
   * 启动
   * ====================================================================== */
  function boot() {
    /* 支持从作者主页等处带条件进入：?tag= / ?cat= / ?q= */
    const params = new URLSearchParams(location.search)
    if (params.get('tag')) feed.query.tag = params.get('tag')
    if (params.get('cat')) feed.query.cat = params.get('cat')
    if (params.get('q')) feed.query.q = params.get('q')
    if (elSearchInput && feed.query.q) elSearchInput.value = feed.query.q

    initCountdown()
    initScrollUI()
    initCounters()
    initHeroEffects()

    feedHold = location.hash === '#submit'
    if (UI.bindLike) UI.bindLike(elList)
    initFilters()
    initSubmit()
    syncChips()
    renderSummary()
    setStatus('idle')

    loadMore()
    initFacets()
    initStats()

    if (FX.revealOnScroll) {
      FX.revealOnScroll(document)
    } else {
      /* effects.js 未加载时的兜底，避免内容一直不可见 */
      $$('.js-reveal').forEach((el) => el.classList.add('is-visible'))
    }
  }

  boot()
})()
