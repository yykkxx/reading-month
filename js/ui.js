/* ==========================================================================
 * ui.js —— 表现层：小工具 + 渲染模板（首页信息流 & 详情页共用）
 * ========================================================================== */
(function () {
  'use strict'

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

  /* 数字缩写：1280 → 1.3k */
  function abbr(n) {
    n = Number(n) || 0
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
    return String(n)
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
    if (diff < 86400000 * 30) return Math.floor(diff / 86400000) + ' 天前'
    return (window.API && API.fmtTime ? API.fmtTime(ts) : '').slice(0, 10)
  }

  /* SVG 图标 */
  const icons = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.7C7.2 17.4 3.5 14.2 3.5 10.2 3.5 7.4 5.7 5.3 8.3 5.3c1.5 0 3 .7 3.7 2 .8-1.3 2.2-2 3.7-2 2.6 0 4.8 2.1 4.8 4.9 0 4-3.7 7.2-8.5 10.5z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a7.5 7.5 0 0 1-7.5 7.5c-1.3 0-2.6-.3-3.6-.9L4 20l1.4-4.4A7.5 7.5 0 0 1 11.5 4.5h1A7.5 7.5 0 0 1 20 12z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M14.5 4.5l3 3L9 16H6v-3l8.5-8.5z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="6" r="2.4"/><circle cx="17.5" cy="18" r="2.4"/><path d="M8.3 10.9l6.9-3.6M8.3 13.1l6.9 3.6"/></svg>',
  }

  /* 关键词高亮（先转义再包 <mark>，保证不会注入标签） */
  function hl(text, kw) {
    const t = esc(text)
    const k = String(kw || '').trim()
    if (!k) return t
    try {
      const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return t.replace(re, (m) => `<mark>${m}</mark>`)
    } catch (e) { return t }
  }

  /* ---------- 首页：信息流卡片 ---------- */
  function cardHTML(p, i, kw) {
    const av = p.author.avatar
      ? `<img src="${esc(p.author.avatar)}" alt="" loading="lazy" onerror="this.remove()">`
      : ''
    const hot = (p.comments || []).slice(0, 2).map((c) =>
      `<li><b>${esc(c.user)}</b><span>${esc(c.content)}</span></li>`).join('')

    return `
<article class="card" data-id="${esc(p.id)}" data-cat="${esc(p.category)}" data-href="detail.html?id=${encodeURIComponent(p.id)}"
         style="animation-delay:${Math.min(i, 6) * 70}ms" itemscope itemtype="https://schema.org/BlogPosting">
  <a class="card__link" href="detail.html?id=${encodeURIComponent(p.id)}" aria-label="阅读全文：${esc(p.title)}">
    <div class="card__media">
      <span class="card__cat">${esc(p.category)}</span>
      <img src="${esc(p.cover)}" alt="《${esc(p.title)}》封面插图" loading="lazy" decoding="async">
      <time class="card__time-on-img">${icons.clock}${esc(p.time)}</time>
    </div>
    <h3 class="card__title" itemprop="headline">${hl(p.title, kw)}</h3>
  </a>
  <div class="card__body">
    <p class="card__excerpt">${hl(p.excerpt, kw)}</p>
    ${p.tags && p.tags.length ? `<div class="card__tags">${p.tags.slice(0, 3).map((t) => `<span># ${esc(t)}</span>`).join('')}</div>` : ''}
    ${hot ? `<ul class="card__hot">${hot}</ul>` : ''}
    <footer class="card__foot">
      <div class="card__author">${av}<b>${esc(p.author.name)}${p.author.college ? ' · ' + esc(p.author.college) : ''}</b></div>
      <div class="card__acts">
        <button class="act act--like${p.liked ? ' is-liked' : ''}" aria-label="点赞" aria-pressed="${!!p.liked}">
          ${icons.heart}<span class="n">${abbr(p.likes)}</span>
        </button>
        <span class="act">${icons.comment}<span class="n">${abbr(p.commentCount)}</span></span>
        <span class="act">${icons.eye}<span class="n">${abbr(p.views)}</span></span>
      </div>
    </footer>
  </div>
</article>`
  }

  function skeletonHTML() {
    return `
<div class="skeleton" aria-hidden="true">
  <div class="skeleton__media sk"></div>
  <div class="skeleton__line is-title sk"></div>
  <div class="skeleton__line sk"></div>
  <div class="skeleton__line is-short sk"></div>
</div>`
  }

  /* 列表点赞：就地更新 DOM，并同步到全局点赞记录（app.js 消费） */
  function bindLike(root) {
    root.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('.act--like')
      if (!btn) return
      ev.preventDefault()
      ev.stopPropagation()
      const card = btn.closest('[data-id]')
      const id = card && card.dataset.id
      const on = btn.classList.toggle('is-liked')
      btn.setAttribute('aria-pressed', on)
      const n = btn.querySelector('.n')
      if (n && id) {
        const base = Number(btn.dataset.base || n.textContent.replace(/[^0-9.]/g, '')) || 0
        btn.dataset.base = base
        n.textContent = UI.abbr(Math.max(0, base + (on ? 1 : -1)))
      }
      root.dispatchEvent(new CustomEvent('feedlike', { bubbles: true, detail: { id, liked: on } }))
      if (window.API) API.reportLike(id, on)
    })
  }

  /* 详情页 favors：正文骨架 */
  function detailSkeleton() {
    return `
<div class="detail-skeleton" aria-hidden="true">
  <div class="skeleton__media sk" style="aspect-ratio:4/3;border-radius:0"></div>
  <div class="shell">
    <div class="skeleton__line is-title sk" style="margin-top:20px"></div>
    <div class="skeleton__line sk"></div>
    <div class="skeleton__line sk"></div>
    <div class="skeleton__line is-short sk"></div>
  </div>
</div>`
  }

  /* ---------- 详情页：整体 HTML ---------- */
  function detailHTML(d) {
    const hotComments = d.comments || []
    const related = (d.related || []).map((r) => `
      <a class="related__item" href="detail.html?id=${encodeURIComponent(r.id)}">
        <img src="${esc(r.cover || '')}" alt="" loading="lazy">
        <div><b>${esc(r.title || '')}</b><time>${esc((r.time || '').slice(0, 16))}</time></div>
      </a>`).join('')

    return `
<div class="detail-top" id="detailTop">
  <button class="icon-btn" id="btnBack" aria-label="返回">${icons.back}</button>
  <span class="detail-top__title">${esc(d.title)}</span>
  <button class="icon-btn" id="btnShare" aria-label="分享">${icons.share}</button>
</div>

<article class="article">
  <header>
    <div class="article__hero"><img src="${esc(d.cover)}" alt="${esc(d.title)} 配图"></div>
    <div class="shell">
      <div class="article__inner">
        <span class="article__cat">${esc(d.category || '读书感受')}</span>
        <h1 class="article__title" itemprop="headline">${esc(d.title)}</h1>
        <div class="article__meta">
          <span>${icons.clock}${esc(d.time)}</span>
          <span>${icons.eye}${abbr(d.views)} 阅读</span>
          <span>${icons.comment}${abbr(d.commentCount)} 评论</span>
        </div>
        <div class="article__author">
          <img src="${esc(d.author.avatar || '')}" alt="" onerror="this.remove()">
          <div><b>${esc(d.author.name)}</b><i>${esc(d.author.college || '校园读者')}</i></div>
          <button class="follow" id="btnFollow">+ 关注</button>
        </div>
      </div>
    </div>
  </header>

  <div class="shell">
    <div class="prose" id="prose">${d.contentHtml}</div>

    ${d.book ? `
    <div class="bookcard">
      <span class="bookcard__ico">📖</span>
      <div>
        <b>本书信息：《${esc(d.book.name)}》</b>
        <p>作者 ${esc(d.book.author || '—')} · ${esc(d.book.publisher || '')}</p>
      </div>
    </div>` : ''}

    <div class="detail-stats">
      <div><b>${abbr(d.likes)}</b><i>点赞</i></div>
      <div><b>${abbr(d.commentCount)}</b><i>评论</i></div>
      <div><b>${abbr(d.views)}</b><i>阅读</i></div>
    </div>

    <section class="comments" id="comments">
      <div class="comments__head">
        <h3>读书伙伴的评论</h3><span>${hotComments.length} 条</span>
      </div>
      <div id="cmtList">
        ${hotComments.map((c) => cmtHTML(c)).join('') || '<p class="empty">还没有评论，来抢第一楼吧～</p>'}
      </div>
    </section>

    ${related ? `<section class="related"><h3>相关阅读</h3>${related}</section>` : ''}
  </div>
</article>

<div class="detail-bar" id="detailBar">
  <input class="detail-bar__input" id="cmtInput" placeholder="友善评论，交流读书感受…" maxlength="200">
  <button class="detail-bar__btn" id="barLike" aria-label="点赞本文${d.liked ? '，已赞' : ''}">${icons.heart}</button>
  <button class="detail-bar__btn" id="barStar" aria-label="收藏">${icons.star}</button>
  <button class="detail-bar__send" id="btnSend">发送</button>
</div>`.trim()
  }

  function cmtHTML(c) {
    const av = c.avatar
      ? `<img src="${esc(c.avatar)}" alt="" style="width:36px;height:36px;border-radius:50%">`
      : `<span class="cmt__av">${esc(c.avatarText || c.user[0] || '读')}</span>`
    return `
<div class="cmt" data-cid="${esc(c.id)}">
  ${av}
  <div class="cmt__main">
    <div class="cmt__top"><b>${esc(c.user)}</b><time>${esc(c.time)}</time></div>
    <p class="cmt__text">${esc(c.content)}</p>
    <div class="cmt__acts">
      <button class="cmt-like"><svg viewBox="0 0 24 24"><path d="M8 10v10H5V10h3zM18 10c0-1-.8-2-2-2h-4.2l.7-4.1c.1-.6-.1-1.2-.6-1.6l-1-.8L6 6.5V10"/></svg>赞</button>
      <button class="cmt-reply">回复</button>
    </div>
  </div>
</div>`
  }

  window.UI = { esc, abbr, cardHTML, skeletonHTML, detailSkeleton, detailHTML, cmtHTML, icons, bindLike, timeAgo }
})()
