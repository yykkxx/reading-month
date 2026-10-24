/* ==========================================================================
 * detail.js —— 详情页逻辑：按 ?id= 从 API 拉取内容并渲染
 *  - 内容/评论/相关阅读全部来自 API（当前为本地 mock/api/detail/{id}.json）
 *  - 点赞、收藏、评论走乐观更新；remote 模式下同步上报
 * ========================================================================== */
(function () {
  'use strict'
  const CFG = window.READING_MONTH
  const API = window.API
  const UI = window.UI

  const root = document.getElementById('detailRoot')
  const elToast = document.getElementById('toast')

  const $ = (s) => document.querySelector(s)
  const $$ = (s) => Array.from(document.querySelectorAll(s))

  let toastTimer
  function toast(text, long) {
    elToast.textContent = text
    elToast.classList.add('is-in')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => elToast.classList.remove('is-in'), long ? 3800 : 2400)
  }

  /* ---------- 取 id ---------- */
  const q = new URLSearchParams(location.search)
  let pid = q.get('id') || ''
  if (!pid) {
    /* 从 location.hash 里兜（#?id=post-001 兼容写法） */
    const m = location.hash.match(/id=([^&]+)/)
    if (m) pid = decodeURIComponent(m[1])
  }
  if (!pid) pid = 'post-001' // 缺省给第一篇，保证空链接也能看

  /* ---------- 骨架 ---------- */
  root.innerHTML = UI.detailSkeleton()

  /* local 点赞/收藏记忆 */
  const LSK = 'rm_liked_ids'
  const SSK = 'rm_star_ids'
  const readSet = (k) => { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')) } catch { return new Set() } }
  const writeSet = (k, set) => { try { localStorage.setItem(k, JSON.stringify([...set])) } catch {} }

  const likedSet = readSet(LSK)
  const starSet = readSet(SSK)

  /* ---------- 渲染 ---------- */
  async function boot() {
    try {
      const d = await API.getDetail(pid)
      d.liked = likedSet.has(pid) || d.liked
      render(d)
    } catch (err) {
      console.warn('[detail]', err)
      root.innerHTML = `
<div class="detail-top" id="detailTop">
  <button class="icon-btn" id="btnBack" aria-label="返回">${UI.icons.back}</button>
  <span class="detail-top__title">内容不存在</span>
</div>
<div class="shell" style="padding-top:110px">
  <div class="empty"><b>🔍</b>没有找到这篇读书感受<br><small style="font-size:12px">${UI.esc(String(err.message || err))}</small><br>
  <a href="index.html" class="btn btn--primary" style="margin-top:18px;display:inline-flex">回到感受墙</a></div>
</div>`
      $('#btnBack').addEventListener('click', goBack)
    }
  }

  function render(d) {
    root.innerHTML = UI.detailHTML(d)
    document.title = d.title + ' · 2026 校园读书月'

    const detail = d // 闭包持有，交互可见

    /* 返回 */
    $('#btnBack').addEventListener('click', goBack)

    /* 分享（移动端优先 navigator.share，回退复制链接） */
    $('#btnShare').addEventListener('click', async () => {
      const url = location.href
      try {
        if (navigator.share) await navigator.share({ title: detail.title, text: detail.excerpt, url })
        else {
          await navigator.clipboard.writeText(url)
          toast('链接已复制，快去分享这篇感受吧')
        }
      } catch { /* 用户取消分享 */ }
    })

    /* 顶栏随滚动变实底 */
    const top = $('#detailTop')
    const titleEl = $('.detail-top__title')
    const prose = $('#prose')
    addEventListener('scroll', () => {
      const y = scrollY
      top.classList.toggle('is-solid', y > 40)
      titleEl.textContent = y > prose.offsetTop - 60 ? detail.title : ''
    }, { passive: true })

    /* 关注按钮 */
    $('#btnFollow').addEventListener('click', (e) => {
      const b = e.currentTarget
      b.classList.toggle('is-on')
      b.textContent = b.classList.contains('is-on') ? '已关注' : '+ 关注'
      toast(b.classList.contains('is-on') ? '关注成功，TA 的新感受会出现在你的信息流' : '已取消关注')
    })

    /* 文章点赞 */
    const barLike = $('#barLike')
    if (detail.liked) barLike.classList.add('is-liked')
    barLike.addEventListener('click', async () => {
      const on = barLike.classList.toggle('is-liked')
      detail.liked = on
      if (on) likedSet.add(pid); else likedSet.delete(pid)
      writeSet(LSK, likedSet)
      barLike.setAttribute('aria-label', '点赞本文' + (on ? '，已赞' : ''))
      toast(on ? '已点赞 ❤' : '已取消点赞')
      API.reportLike(pid, on)
    })

    /* 收藏 */
    const barStar = $('#barStar')
    if (starSet.has(pid)) barStar.classList.add('is-star')
    barStar.addEventListener('click', () => {
      const on = barStar.classList.toggle('is-star')
      if (on) starSet.add(pid); else starSet.delete(pid)
      writeSet(SSK, starSet)
      toast(on ? '已收藏，可在「我的书架」查看' : '已取消收藏')
    })

    /* 评论发送 */
    const input = $('#cmtInput')
    const list = $('#cmtList')
    function pushComment(text) {
      const c = {
        id: 'c-' + Date.now(),
        user: '我',
        avatarText: '我',
        content: text,
        time: UI && API.fmtTime ? API.fmtTime(Date.now()) : new Date().toLocaleString(),
        likes: 0,
      }
      const empty = list.querySelector('.empty')
      if (empty) empty.remove()
      list.insertAdjacentHTML('afterbegin', UI.cmtHTML(c))
      list.firstElementChild.classList.add('cmt')
      API.reportComment(pid, text)
      toast('评论已贴上留言墙（当前为本地测试）')
    }
    $('#btnSend').addEventListener('click', () => {
      const v = input.value.trim()
      if (!v) { toast('先写点读书感受再发送吧～'); input.focus(); return }
      pushComment(v)
      input.value = ''
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) $('#btnSend').click()
    })

    /* 评论点赞 / 回复（本地交互演示） */
    list.addEventListener('click', async (e) => {
      const likeBtn = e.target.closest('.cmt-like')
      if (likeBtn) {
        likeBtn.classList.toggle('is-liked')
        likeBtn.style.color = likeBtn.classList.contains('is-liked') ? 'var(--like)' : ''
        if (likeBtn.classList.contains('is-liked')) toast('已赞该评论')
        return
      }
      const replyBtn = e.target.closest('.cmt-reply')
      if (replyBtn) {
        const who = replyBtn.closest('.cmt').querySelector('.cmt__top b').textContent
        input.value = '回复 @' + who + '：'
        input.focus()
        input.setSelectionRange(input.value.length, input.value.length)
      }
    })

    /* “相关阅读”卡片直接跳转（<a> 原生） */

    /* 首屏出现动画：正文淡入 */
    requestAnimationFrame(() => {
      $$('.article, .article__inner').forEach((e) => { e.style.opacity = '0'; e.style.transform = 'translateY(14px)'; e.style.transition = 'all .6s cubic-bezier(.22,1,.36,1)' })
      requestAnimationFrame(() => $$('.article, .article__inner').forEach((e) => { e.style.opacity = '1'; e.style.transform = 'none' }))
    })

    updateMeta(d)
  }

  /* 返回逻辑：有历史则回退，否则回首页 */
  function goBack() {
    if (history.length > 1 && document.referrer && document.referrer.includes(location.host)) history.back()
    else location.href = 'index.html#feed'
  }

  /* 给搜索引擎 / 社交分享填充 meta（详情页复用同一份 HTML，内容靠 JS 注入） */
  function updateMeta(d) {
    const desc = (d.excerpt || '').slice(0, 90)

    const set = (selector, value) => {
      const el = document.querySelector(selector)
      if (el) el.setAttribute('content', value)
    }
    set('meta[name="description"]', desc)

    const ensure = (prop) => {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', prop)
        document.head.appendChild(el)
      }
      return el
    }
    ensure('og:title').setAttribute('content', d.title)
    ensure('og:description').setAttribute('content', desc)

    const tc = document.querySelector('meta[name="theme-color"]')
    if (tc) tc.setAttribute('content', '#f6f1e6')
  }

  boot()

  addEventListener('error', (e) => console.warn('[runtime]', e.message))
})()
