/* ==========================================================================
 * detail.js —— 详情页
 *   内容 / 评论 / 相关阅读来自 API；点赞、收藏、评论乐观更新并本地留存。
 * ========================================================================== */
(function () {
  'use strict'

  const CFG = window.READING_MONTH || {}
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
  const readSet = (key) => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch (e) { return new Set() }
  }
  const writeSet = (key, set) => {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))) } catch (e) { /* 隐私模式忽略 */ }
  }
  const likedSet = readSet(LSK)
  const starSet = readSet(SSK)

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

  function renderError(err) {
    const msg = err && err.message ? err.message : '未知错误'
    root.innerHTML = `
<header class="detail-top is-solid">
  <button class="icon-btn" id="btnBack" type="button" aria-label="返回">${UI.icons.back}</button>
  <span class="detail-top__title">内容不存在</span>
</header>
<div class="shell" style="padding-top:96px">
  ${UI.emptyHTML('没有找到这篇读书感受', msg)}
</div>`
    root.setAttribute('aria-busy', 'false')

    const back = $('#btnBack')
    if (back) back.addEventListener('click', goBack)

    const reset = $('#chipReset')
    if (reset) reset.addEventListener('click', () => { location.href = 'index.html#feed' })
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
      barLike.addEventListener('click', () => {
        const on = barLike.classList.toggle('is-liked')
        barLike.setAttribute('aria-pressed', String(on))
        if (on) likedSet.add(pid); else likedSet.delete(pid)
        writeSet(LSK, likedSet)
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
        id: 'c-' + Date.now(),
        user: '我',
        avatarText: '我',
        content: text,
        time: API.fmtTime ? API.fmtTime(Date.now()) : new Date().toLocaleString(),
        likes: 0,
      }

      const empty = list.querySelector('.empty')
      if (empty) empty.remove()

      list.insertAdjacentHTML('afterbegin', UI.cmtHTML(c, 0))
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
    if (list) {
      list.addEventListener('click', (e) => {
        const likeBtn = e.target.closest('.cmt-like')
        if (likeBtn) {
          const on = likeBtn.classList.toggle('is-liked')
          likeBtn.style.color = on ? 'var(--like)' : ''
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

    const tc = document.querySelector('meta[name="theme-color"]')
    if (tc) tc.setAttribute('content', CFG.THEME_COLOR || '#f6f1e6')
  }

  boot()
})()
