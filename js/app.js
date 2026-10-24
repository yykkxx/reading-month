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
   * 一、倒计时
   * ====================================================================== */
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

    /* 本届已结束则滚到下一届，演示环境永远有倒计时 */
    let year = new Date().getFullYear()
    let range = rangeOf(year)
    if (Date.now() > range.end.getTime()) {
      year += 1
      range = rangeOf(year)
    }

    const beforeStart = Date.now() < range.start.getTime()

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

      if (elHint && elFeed) {
        elHint.classList.toggle('is-hidden', elFeed.getBoundingClientRect().top < vh * 0.35)
      }
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

    const ctaRule = $('#ctaRule')
    if (ctaRule) {
      ctaRule.addEventListener('click', (e) => {
        e.preventDefault()
        toast('活动规则：读书月期间每读完一本书，即可投稿一篇读书感受；优秀作品会在感受墙首页推荐。', true)
      })
    }

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
  function initCounters() {
    const nodes = $$('[data-count]')
    if (!nodes.length) return

    const run = (el) => {
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

    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        run(entry.target)
        io.unobserve(entry.target)
      })
    }, { threshold: 0.4 })
    nodes.forEach((el) => io.observe(el))
  }

  function initHeroEffects() {
    if (FX.initInkCanvas) FX.initInkCanvas($('#inkCanvas'))
    if (FX.initHeroParallax) FX.initHeroParallax($('#intro'))
    if (FX.developImages) FX.developImages(document)
  }

  /* ========================================================================
   * 四、信息流
   * ====================================================================== */
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
    parts.push(`排序「<b>${SORT_LABEL[q.sort] || '刚出炉'}</b>`)

    elSummary.hidden = false
    elSummary.innerHTML = parts.join(' · ') +
      (feed.shown ? ` · 已显示 ${feed.shown} 篇` : '') +
      ' <button class="reset" id="resetAll" type="button">重置</button>'
  }

  function syncChips() {
    const q = feed.query
    $$('.chip', elChips).forEach((c) => c.classList.toggle('is-on', c.dataset.cat === q.cat))
    $$('.chip', elTags).forEach((c) => c.classList.toggle('is-on', c.dataset.tag === q.tag))
    $$('.chip', elSorts).forEach((c) => c.classList.toggle('is-on', c.dataset.sort === q.sort))
  }

  function syncSearchClear() {
    if (elSearchClear && elSearchInput) elSearchClear.hidden = !elSearchInput.value
  }

  /* 任一条件变化：清空列表，回到第 1 页 */
  function resetFeed(patch) {
    Object.assign(feed.query, patch || {})
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
    if (!elList || feed.loading || feed.ended) return

    const token = ++feed.token
    feed.loading = true
    elList.setAttribute('aria-busy', 'true')

    const first = feed.page === 0
    if (first) {
      elList.innerHTML = Array.from({ length: 3 }, UI.skeletonHTML).join('')
      setStatus('loading')
    }

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

      const exhausted = res.hasMore === false || (res.list || []).length === 0
      if (exhausted) {
        feed.ended = true
        if (!feed.shown) elList.innerHTML = UI.emptyHTML()
        setStatus(feed.shown ? 'end' : 'idle')
      } else {
        setStatus('loading')
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
      feed.shown = fallback.length
      feed.ended = true
      setStatus('end')
      if (elApiHint) {
        elApiHint.innerHTML = `⚠️ 已启用静态兜底数据（<code>${location.protocol}</code> 下读不到 mock JSON）。建议用本地服务器访问，或在 <code>config.js</code> 接入远程 API`
      }
      toast('已启用静态兜底数据 · 建议用本地服务器访问')
      return
    }

    if (!feed.shown) {
      elList.innerHTML = UI.emptyHTML('内容加载失败', '请检查网络或数据接口后重试')
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

    if (elList) {
      elList.addEventListener('click', (e) => {
        if (e.target.closest('#chipReset') || e.target.closest('#resetAll')) {
          resetFeed({ q: '', cat: '全部', tag: '', sort: 'new' })
          return
        }
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
          `<button class="chip" type="button" role="tab" aria-selected="${c === feed.query.cat}" data-cat="${UI.esc(c)}">${UI.esc(c)}</button>`
        ).join('')
      }

      if (elTags && facets.tags && facets.tags.length) {
        elTags.innerHTML = '<span class="chips__label" aria-hidden="true">#</span>' +
          facets.tags.slice(0, 10).map((t) =>
            `<button class="chip" type="button" role="tab" aria-selected="false" data-tag="${UI.esc(t)}">${UI.esc(t)}</button>`
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
    fab.addEventListener('click', () => {
      if (CFG.SOURCE === 'mock') toast('正在前往投稿页（演示环境 → 百度）', true)
    })
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

    if (elApiHint) {
      const src = CFG.SOURCE === 'remote' ? '远程 API' : '本地 Mock API'
      elApiHint.innerHTML = `数据来源：${src} · <code>mock/api/posts/page-N.json</code> · 纯静态，可在 <code>config.js</code> 切换远程接口`
    }

    if (UI.bindLike) UI.bindLike(elList)
    initFilters()
    initSubmit()
    syncChips()
    renderSummary()
    setStatus('idle')

    loadMore()
    initFacets()

    if (FX.revealOnScroll) {
      FX.revealOnScroll(document)
    } else {
      /* effects.js 未加载时的兜底，避免内容一直不可见 */
      $$('.js-reveal').forEach((el) => el.classList.add('is-visible'))
    }
  }

  boot()
})()
