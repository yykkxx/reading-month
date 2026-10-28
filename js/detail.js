/* ==========================================================================
 * detail.js —— 详情页
 *   内容 / 评论 / 相关阅读来自 API；点赞、收藏、评论乐观更新并本地留存。
 * ========================================================================== */
(function () {
  'use strict'

  const SITE_URL = 'https://yykkxx.github.io/reading-month/'
  const API = window.API
  const UI = window.UI
  const FX = window.FX || {}

  const root = document.getElementById('detailRoot')
  const elToast = document.getElementById('toast')
  const $ = (sel) => document.querySelector(sel)

  /* ---------- Toast ---------- */
  let toastTimer = 0
  function toast(text, long) {
    if (!elToast) return
    elToast.textContent = text
    elToast.classList.add('is-in')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => elToast.classList.remove('is-in'), long ? 3600 : 2200)
  }

  /* ---------- 取 id ---------- */
  const params = new URLSearchParams(location.search)
  let pid = params.get('id') || ''
  if (!pid) {
    const m = location.hash.match(/id=([^&]+)/)
    if (m) pid = decodeURIComponent(m[1])
  }
  if (!pid) pid = 'post-001'

  /* ---------- 本地记录 ---------- */
  const LSK = 'rm_liked_ids'
  const SSK = 'rm_star_ids'
  const CSK = 'rm_cmt_liked'
  const CMTK = 'rm_cmts'
  const readSet = (key) => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch (e) { return new Set() }
  }
  const writeSet = (key, set) => {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))) } catch (e) { /* 隐私模式忽略 */ }
  }
  function readLocalCmts() {
    try { const arr = JSON.parse(localStorage.getItem(CMTK) || '[]'); return Array.isArray(arr) ? arr : [] } catch (e) { return [] }
  }
  function saveLocalCmt(c) {
    /* 只留最近 50 条，超出丢最旧的 */
    try { localStorage.setItem(CMTK, JSON.stringify(readLocalCmts().concat([c]).slice(-50))) } catch (e) { /* 隐私模式忽略 */ }
  }
  const likedSet = readSet(LSK)
  const starSet = readSet(SSK)
  const cmtLikedSet = readSet(CSK)

  /* 统计数字以模板里的 data-base 为基准重算，持久化状态与数字始终同源 */
  const statEl = (kind) => $('.detail-stats [data-stat="' + kind + '"]')
  function paintLikeStat(liked) {
    const el = statEl('like'); if (!el) return
    const base = Number(el.dataset.base)
    if (Number.isFinite(base)) el.textContent = UI.abbr(Math.max(0, base + (liked ? 1 : 0)))
  }

  /* ========================================================================
   * 渲染
   * ====================================================================== */
  async function boot() {
    if (root) root.innerHTML = UI.detailSkeleton()

    try {
      const data = await API.getDetail(pid)
      data.liked = likedSet.has(pid) || data.liked
      render(data)
    } catch (err) {
      renderError(err)
    }
  }

  function render(d) {
    document.title = d.title + ' · 2026 校园读书月'
    root.innerHTML = UI.detailHTML(d)
    root.setAttribute('aria-busy', 'false')

    if (FX.developImages) FX.developImages(root)
    if (FX.initReadingProgress) FX.initReadingProgress($('#readProgress'))
    /* 封面滚动推近：渲染完成后才有 .article__hero img，所以在这里接 */
    if (FX.initHeroPan) FX.initHeroPan(root)

    restoreLocalCmts() // 先回填本机留言，bind 里的点赞态恢复才能覆盖到它们
    bind(d)
    updateMeta(d)

    /* 正文淡入（交给 CSS，避免内联样式满天飞） */
    requestAnimationFrame(() => document.body.classList.add('is-ready'))

    /* 从评论卡跳来时定位到留言区 */
    if (location.hash === '#comments') {
      setTimeout(() => {
        const box = document.getElementById('comments')
        if (box) box.scrollIntoView({ block: 'start' })
      }, 120)
    }
  }

  /* 本机留言回填：刷新后仍在，计数按模板原值 + 本地条数重算（只加一次） */
  function restoreLocalCmts() {
    const list = $('#cmtList')
    if (!list) return
    const mine = readLocalCmts().filter((c) => c && c.postId === pid)
    if (!mine.length) return
    const empty = list.querySelector('.empty')
    if (empty) empty.remove()
    list.insertAdjacentHTML('afterbegin', mine.slice().reverse().map((c, i) => UI.cmtHTML(c, i)).join(''))

    const head = $('#cmtCount')
    if (head) {
      const n = (Number(head.dataset.base) || 0) + mine.length
      head.dataset.base = String(n); head.textContent = n + ' 条'
    }
    const stat = statEl('comment')
    if (stat) {
      const n = (Number(stat.dataset.base) || 0) + mine.length
      stat.dataset.base = String(n); stat.textContent = UI.abbr(n)
    }
  }

  function renderError(err) {
    console.warn('[detail]', err)
    root.innerHTML = `
<header class="detail-top is-solid">
  <button class="icon-btn" id="btnBack" type="button" aria-label="返回">${UI.icons.back}</button>
  <span class="detail-top__title">读书感受</span>
</header>
<div class="shell" style="padding-top:96px">
  ${UI.emptyHTML('这篇感受还没被贴上', '它可能已经被作者移出感受墙，也可能这个链接已经过期。',
    { primaryText: '回到感受墙', primaryHref: 'index.html#feed', secondaryText: '看看热门', secondaryHref: 'index.html?sort=hot#feed' })}
</div>`
    root.setAttribute('aria-busy', 'false')

    const back = $('#btnBack')
    if (back) back.addEventListener('click', goBack)
  }

  /* ========================================================================
   * 交互
   * ====================================================================== */
  function bind(d) {
    const top = $('#detailTop')
    const titleBar = $('.detail-top__title')
    const articleTitle = $('.article__title')

    if ($('#btnBack')) $('#btnBack').addEventListener('click', goBack)
    if ($('#btnShare')) $('#btnShare').addEventListener('click', () => share(d))

    /* 顶栏状态 + 标题回填（单次 scroll，rAF 节流） */
    if (top) {
      let ticking = false
      const apply = () => {
        ticking = false
        const solid = window.scrollY > 48
        top.classList.toggle('is-solid', solid)
        if (titleBar && articleTitle) {
          const passed = articleTitle.getBoundingClientRect().bottom < 60
          titleBar.textContent = passed ? d.title : ''
        }
      }
      window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(apply) }
      }, { passive: true })
      apply()
    }

    /* 关注 */
    const follow = $('#btnFollow')
    if (follow) {
      follow.addEventListener('click', () => {
        const on = follow.classList.toggle('is-on')
        follow.textContent = on ? '已关注' : '+ 关注'
        toast(on ? '关注成功，TA 的新感受会出现在你的信息流' : '已取消关注')
      })
    }

    /* 文章点赞 */
    const barLike = $('#barLike')
    if (barLike) {
      if (d.liked) barLike.classList.add('is-liked')
      barLike.setAttribute('aria-pressed', String(!!d.liked))
      paintLikeStat(!!d.liked)
      barLike.addEventListener('click', () => {
        const on = barLike.classList.toggle('is-liked')
        barLike.setAttribute('aria-pressed', String(on))
        if (on) likedSet.add(pid); else likedSet.delete(pid)
        writeSet(LSK, likedSet)
        paintLikeStat(on)
        toast(on ? '已点赞 ❤' : '已取消点赞')
        API.reportLike(pid, on)
      })
    }

    /* 收藏 */
    const barStar = $('#barStar')
    if (barStar) {
      if (starSet.has(pid)) barStar.classList.add('is-star')
      barStar.addEventListener('click', () => {
        const on = barStar.classList.toggle('is-star')
        if (on) starSet.add(pid); else starSet.delete(pid)
        writeSet(SSK, starSet)
        toast(on ? '已收藏到本机' : '已取消收藏')
      })
    }

    /* 评论 */
    const input = $('#cmtInput')
    const list = $('#cmtList')

    const send = () => {
      if (!input || !list) return
      const text = input.value.trim()
      if (!text) { toast('先写点读书感受再发送吧～'); input.focus(); return }

      const c = {
        postId: pid,
        id: 'c-' + Date.now(),
        user: '我',
        avatarText: '我',
        content: text,
        time: '刚刚',
        timestamp: Date.now(),
        likes: 0,
        local: true,
      }

      const empty = list.querySelector('.empty')
      if (empty) empty.remove()

      list.insertAdjacentHTML('afterbegin', UI.cmtHTML(c, 0))
      saveLocalCmt(c)

      /* 头部的「N 条」与统计区的评论数同步 +1 */
      const head = $('#cmtCount')
      if (head) { const n = (Number(head.dataset.base) || 0) + 1; head.dataset.base = String(n); head.textContent = n + ' 条' }
      const stat = statEl('comment')
      if (stat) { const n = (Number(stat.dataset.base) || 0) + 1; stat.dataset.base = String(n); stat.textContent = UI.abbr(n) }

      input.value = ''
      API.reportComment(pid, text)
      toast('留言已贴上')
    }

    const sendBtn = $('#btnSend')
    if (sendBtn) sendBtn.addEventListener('click', send)
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) send()
      })
    }

    /* 评论点赞 / 回复 */
    const paintCmt = (btn, on) => {
      btn.classList.toggle('is-liked', on); btn.style.color = on ? 'var(--like)' : ''
      const n = btn.querySelector('.n'); const base = Number(btn.dataset.base)
      if (n && Number.isFinite(base)) n.textContent = UI.abbr(Math.max(0, base + (on ? 1 : 0)))
    }

    if (list) {
      /* 刷新后恢复留言的点赞态与数字 */
      list.querySelectorAll('.cmt').forEach((item) => {
        const btn = item.querySelector('.cmt-like')
        if (btn && item.dataset.cid && cmtLikedSet.has(item.dataset.cid)) paintCmt(btn, true)
      })
      list.addEventListener('click', (e) => {
        const likeBtn = e.target.closest('.cmt-like')
        if (likeBtn) {
          const item = likeBtn.closest('.cmt')
          const cid = item && item.dataset.cid
          const on = !likeBtn.classList.contains('is-liked')
          paintCmt(likeBtn, on)
          if (cid) { if (on) cmtLikedSet.add(cid); else cmtLikedSet.delete(cid); writeSet(CSK, cmtLikedSet) }
          if (on) toast('已赞这条留言')
          return
        }
        const replyBtn = e.target.closest('.cmt-reply')
        if (replyBtn && input) {
          const who = replyBtn.closest('.cmt').querySelector('.cmt__top b').textContent
          input.value = '回复 @' + who + '：'
          input.focus()
          input.setSelectionRange(input.value.length, input.value.length)
        }
      })
    }
  }

  /* ---------- 分享 ---------- */
  async function share(d) {
    const url = location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: d.title, text: d.excerpt, url })
        return
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
        toast('链接已复制，去分享这篇感受吧')
        return
      }
      throw new Error('no clipboard')
    } catch (err) {
      if (err && err.name === 'AbortError') return // 用户取消
      toast('复制失败，可长按地址栏复制链接')
    }
  }

  /* ---------- 返回 ---------- */
  function goBack() {
    const fromSameSite = document.referrer && document.referrer.indexOf(location.host) > -1
    if (history.length > 1 && fromSameSite) history.back()
    else location.href = 'index.html#feed'
  }

  /* ---------- meta ---------- */
  function updateMeta(d) {
    const desc = String(d.excerpt || '').slice(0, 90)

    const setContent = (selector, value) => {
      const el = document.querySelector(selector)
      if (el) el.setAttribute('content', value)
    }
    setContent('meta[name="description"]', desc)

    const ensure = (property) => {
      let el = document.querySelector(`meta[property="${property}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        document.head.appendChild(el)
      }
      return el
    }
    ensure('og:title').setAttribute('content', d.title)
    ensure('og:description').setAttribute('content', desc)

    /* 带 id 的规范化地址：模板页不放通用 canonical，深链才不会被归并 */
    const url = SITE_URL + 'detail.html?id=' + encodeURIComponent(pid)
    if (!document.querySelector('link[rel="canonical"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="canonical">')
    document.querySelector('link[rel="canonical"]').setAttribute('href', url)
    ensure('og:url').setAttribute('content', url)

    /* theme-color 跟随当前主题，夜读不再被日间色覆写 */
    const tc = document.querySelector('meta[name="theme-color"]')
    const night = document.documentElement.getAttribute('data-theme') === 'night'
    if (tc) tc.setAttribute('content', night ? '#15120e' : '#f6f1e6')
  }

  boot()
})()
