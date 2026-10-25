/* ==========================================================================
 * author.js —— 作者主页：资料卡 + TA 发过的读书感受（分页加载）
 * ========================================================================== */
(function () {
  'use strict'

  const API = window.API
  const UI = window.UI
  const FX = window.FX || {}

  const root = document.getElementById('authorRoot')
  const elToast = document.getElementById('toast')
  const $ = (sel) => document.querySelector(sel)

  const id = new URLSearchParams(location.search).get('id') || ''

  const state = { page: 0, loading: false, hasMore: true, total: 0, posts: 0, comments: 0, user: null }

  /* ---------- Toast ---------- */
  let toastTimer = 0
  function toast(text, long) {
    if (!elToast) return
    elToast.textContent = text
    elToast.classList.add('is-in')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => elToast.classList.remove('is-in'), long ? 3600 : 2200)
  }

  /* ---------- 骨架 ---------- */
  function skeletonHTML() {
    return `
<header class="author-top is-solid">
  <button class="icon-btn" id="backBtn" type="button" aria-label="返回">${UI.icons.back}</button>
  <span class="author-top__title">作者主页</span>
</header>
<div class="shell" style="padding-top:82px" aria-hidden="true">
  <div class="profile profile--skeleton">
    <div class="sk" style="width:76px;height:76px;border-radius:50%"></div>
    <div style="flex:1">
      <div class="skeleton__line is-title sk" style="margin:0 0 10px"></div>
      <div class="skeleton__line sk" style="margin:0;width:55%"></div>
    </div>
  </div>
  <div class="skeleton__line is-title sk" style="margin-top:26px"></div>
  <div class="skeleton__line sk"></div>
  <div class="skeleton__line is-short sk"></div>
</div>`
  }

  /* ---------- 出错 ---------- */
  function fail(message) {
    if (!root) return
    root.innerHTML = `
<header class="author-top is-solid">
  <button class="icon-btn" id="backBtn" type="button" aria-label="返回">${UI.icons.back}</button>
  <span class="author-top__title">作者主页</span>
</header>
<div class="shell" style="padding-top:92px">
  ${UI.emptyHTML('没有找到这位同学', message || '链接可能有误，回感受墙看看吧')}
</div>`
    root.setAttribute('aria-busy', 'false')
    bindBack()
    const reset = $('#chipReset')
    if (reset) reset.addEventListener('click', () => { location.href = 'index.html#feed' })
  }

  /* ---------- 渲染 ---------- */
  function render(user) {
    state.user = user
    document.title = `${user.name} · 2026 校园读书月`

    root.innerHTML = UI.profileHTML(user) + `
<div class="shell author__body">
  <h2 class="author__sec">TA 写下的 <span id="authorCount"></span></h2>
  <div class="feed__list" id="authorPosts" aria-live="polite"></div>
  <div id="authorSentinel" style="height:1px" aria-hidden="true"></div>
  <div class="feed__status" id="authorStatus" hidden></div>
</div>`

    root.setAttribute('aria-busy', 'false')

    bindBack()
    bindShare(user)
    if (FX.developImages) FX.developImages(root)

    /* 书评卡与评论卡都走同一套点赞委托，首页/详情共用 rm_liked_ids */
    const posts = $('#authorPosts')
    if (UI.bindLike) UI.bindLike(posts)
    if (posts) posts.addEventListener('feedlike', (e) => { if (e.detail && e.detail.liked) toast('这一篇被你先喜欢了') })

    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) loadPosts() })
      }, { rootMargin: '600px 0px' })
      : null

    if (io) {
      const sentinel = $('#authorSentinel')
      if (sentinel) io.observe(sentinel)
    }

    loadPosts()
  }

  /* ---------- 加载作品 ---------- */
  async function loadPosts() {
    if (state.loading || !state.hasMore) return
    state.loading = true

    const list = $('#authorPosts')
    const status = $('#authorStatus')
    const count = $('#authorCount')

    if (state.page === 0) {
      if (list) list.innerHTML = Array.from({ length: 2 }, UI.skeletonHTML).join('')
      if (status) {
        status.hidden = false
        status.className = 'feed__status'
        status.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>正在翻开 TA 的笔记…</span>'
      }
    }

    try {
      const res = await API.getUserPosts(id, state.page + 1)
      state.page += 1
      state.total = res.total || state.total
      state.hasMore = !!res.hasMore

      const html = res.list.map((p, i) => UI.feedItemHTML(p, i, '')).join('')

      if (state.page === 1 && list) list.innerHTML = html
      else if (list && html) list.insertAdjacentHTML('beforeend', html)

      if (FX.developImages) FX.developImages(list)
      if (UI.bindLike) UI.bindLike(list)

      /* 标题与列表底部同一口径：按实际渲染条目数计算，未加载完时先用资料总数 */
      res.list.forEach((p) => { if (p.type === 'comment') state.comments += 1; else state.posts += 1 })
      const st = (state.user && state.user.stats) || {}
      if (count) count.textContent = `共 ${state.hasMore ? st.posts || 0 : state.posts} 篇书评 · ${state.hasMore ? st.comments || 0 : state.comments} 条评论`

      if (!state.total && list) {
        list.innerHTML = UI.emptyHTML('TA 还没有发过感受', '等 TA 读完下一本书吧')
      }

      if (status) {
        if (state.hasMore) {
          status.hidden = true
        } else {
          status.hidden = false
          status.className = 'feed__status is-end'
          status.innerHTML = `<span>❦ 共 ${state.posts} 篇书评 · ${state.comments} 条评论 · 已经翻到底了</span>`
        }
      }
    } catch (err) {
      console.warn('[author]', err)
      if (list) list.innerHTML = UI.emptyHTML('加载失败', '请稍后再试')
      if (status) status.hidden = true
    } finally {
      state.loading = false
    }

    /* 关键：短页面 / 大屏下哨兵不再产生新的交叉事件，这里主动补齐 */
    autoFill()
  }

  function autoFill() {
    if (state.loading || !state.hasMore) return
    const sentinel = $('#authorSentinel')
    if (!sentinel) return
    if (sentinel.getBoundingClientRect().top < window.innerHeight + 600) {
      setTimeout(() => { if (!state.loading && state.hasMore) loadPosts() }, 150)
    }
  }

  /* ---------- 交互 ---------- */
  function bindBack() {
    const back = $('#backBtn')
    if (!back) return
    back.addEventListener('click', () => {
      const fromSameSite = document.referrer && document.referrer.indexOf(location.host) > -1
      if (history.length > 1 && fromSameSite) history.back()
      else location.href = 'index.html#feed'
    })
  }

  function bindShare(user) {
    const btn = $('#shareBtn')
    if (!btn) return
    btn.addEventListener('click', async () => {
      const url = location.href
      try {
        if (navigator.share) {
          await navigator.share({ title: user.name + ' 的读书主页', text: user.bio || '来看看 TA 的读书感受', url })
          return
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url)
          toast('链接已复制，去分享这位同学的主页吧')
          return
        }
        throw new Error('no clipboard')
      } catch (err) {
        if (err && err.name === 'AbortError') return
        toast('复制失败，可长按地址栏复制链接')
      }
    })
  }

  /* ---------- 启动 ---------- */
  if (!id) {
    fail('缺少作者 id')
  } else if (root) {
    root.innerHTML = skeletonHTML()
    API.getUser(id)
      .then(render)
      .catch((err) => fail(err && err.message))
  }
})()
