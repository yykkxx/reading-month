/* ==========================================================================
 * ui.js —— 模板层：信息流卡片 / 骨架屏 / 详情页 / 空态插画
 * 只产出 HTML 字符串，不绑定事件、不碰请求；所有文本统一在此转义。
 * ========================================================================== */
(function () {
  'use strict'

  /* ---------- 基础工具 ---------- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

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

  /* 关键词高亮：先转义再包 <mark>，不会注入标签 */
  function hl(text, kw) {
    const t = esc(text)
    const k = String(kw || '').trim()
    if (!k) return t
    try {
      const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      return t.replace(re, (m) => '<mark>' + m + '</mark>')
    } catch (e) { return t }
  }

  /* ---------- 图标 ---------- */
  const icons = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.7C7.2 17.4 3.5 14.2 3.5 10.2 3.5 7.4 5.7 5.3 8.3 5.3c1.5 0 3 .7 3.7 2 .8-1.3 2.2-2 3.7-2 2.6 0 4.8 2.1 4.8 4.9 0 4-3.7 7.2-8.5 10.5z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a7.5 7.5 0 0 1-7.5 7.5c-1.3 0-2.6-.3-3.6-.9L4 20l1.4-4.4A7.5 7.5 0 0 1 11.5 4.5h1A7.5 7.5 0 0 1 20 12z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="6" r="2.4"/><circle cx="17.5" cy="18" r="2.4"/><path d="M8.3 10.9l6.9-3.6M8.3 13.1l6.9 3.6"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c3-1 5.7-1 8 .5v13c-2.3-1.5-5-1.5-8-.5zM20 5.5c-3-1-5.7-1-8 .5v13c2.3-1.5 5-1.5 8-.5z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  }

  /* ---------- 空态插画：书架上摊开的一本书 ---------- */
  function emptyHTML(title, hint) {
    return `
<div class="empty">
  <svg class="empty__art" viewBox="0 0 132 92" aria-hidden="true" fill="none">
    <path class="empty__shelf" d="M10 78h112" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 6" opacity=".4"/>
    <path class="empty__book-l" d="M66 26c-12-6-27-6-40-2v40c13-4 28-4 40 2" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    <path class="empty__book-r" d="M66 26c12-6 27-6 40-2v40c-13-4-28-4-40 2" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M66 26v40" stroke="currentColor" stroke-width="2.4"/>
    <path d="M36 42c8-2 16-2 22 0M36 52c8-2 16-2 22 0M74 42c8-2 16-2 22 0M74 52c8-2 16-2 22 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>
    <path d="M98 14l2.4 4.6L105 21l-4.6 2.4L98 28l-2.4-4.6L91 21l4.6-2.4z" fill="currentColor" opacity=".3"/>
    <circle cx="32" cy="16" r="2" fill="currentColor" opacity=".25"/>
  </svg>
  <b>${esc(title || '这里还没有读书感受')}</b>
  <small>${esc(hint || '换个关键词，或放宽筛选条件试试')}</small>
  <button class="chip" id="chipReset" type="button">重置全部筛选</button>
</div>`
  }

  /* ---------- 信息流卡片 ---------- */
  function cardHTML(p, i, kw) {
    const avatar = p.author.avatar
      ? `<img src="${esc(p.author.avatar)}" alt="" loading="lazy" onerror="this.remove()">`
      : ''

    const hot = (p.comments || []).slice(0, 2).map((c) =>
      `<li><b>${esc(c.user)}</b><span>${esc(c.content)}</span></li>`).join('')

    const tags = (p.tags || []).slice(0, 3).map((t) => `<span># ${esc(t)}</span>`).join('')

    return `
<article class="card" data-id="${esc(p.id)}" data-cat="${esc(p.category)}"
         data-href="detail.html?id=${encodeURIComponent(p.id)}"
         style="animation-delay:${Math.min(i, 6) * 70}ms">
  <a class="card__link" href="detail.html?id=${encodeURIComponent(p.id)}" aria-label="阅读全文：${esc(p.title)}">
    <span class="card__media">
      <span class="card__cat">${esc(p.category)}</span>
      <img class="dev-pending" src="${esc(p.cover)}" alt="《${esc(p.title)}》配图" loading="lazy" decoding="async">
      <span class="card__time-on-img">${icons.clock}${esc(p.time)}</span>
    </span>
    <h3 class="card__title">${hl(p.title, kw)}</h3>
  </a>
  <div class="card__body">
    <p class="card__excerpt">${hl(p.excerpt, kw)}</p>
    ${tags ? `<div class="card__tags">${tags}</div>` : ''}
    ${hot ? `<ul class="card__hot">${hot}</ul>` : ''}
    <footer class="card__foot">
      <div class="card__author">
        ${p.author.id
          ? `<a class="card__author-link" href="author.html?id=${encodeURIComponent(p.author.id)}" aria-label="查看 ${esc(p.author.name)} 的主页">${avatar}<b>${esc(p.author.name)}${p.author.college ? ' · ' + esc(p.author.college) : ''}</b></a>`
          : `<div class="card__author-link">${avatar}<b>${esc(p.author.name)}${p.author.college ? ' · ' + esc(p.author.college) : ''}</b></div>`}
      </div>
      <div class="card__acts">
        <button class="act act--like${p.liked ? ' is-liked' : ''}" type="button" aria-label="点赞" aria-pressed="${!!p.liked}">
          ${icons.heart}<span class="n">${abbr(p.likes)}</span>
        </button>
        <span class="act" aria-label="评论数">${icons.comment}<span class="n">${abbr(p.commentCount)}</span></span>
        <span class="act" aria-label="阅读数">${icons.eye}<span class="n">${abbr(p.views)}</span></span>
      </div>
    </footer>
  </div>
</article>`
  }

  /* ---------- 信息流中的评论卡（风格区别于书评） ---------- */
  function commentCardHTML(c, i, kw) {
    const href = c.target && c.target.id
      ? `detail.html?id=${encodeURIComponent(c.target.id)}#comments`
      : 'index.html#feed'

    const avatar = c.author.avatar
      ? `<img src="${esc(c.author.avatar)}" alt="" loading="lazy" onerror="this.remove()">`
      : `<span class="comment-card__avatar-text">${esc((c.author.name || '读')[0])}</span>`

    const name = `${esc(c.author.name)}${c.author.college ? ' · ' + esc(c.author.college) : ''}`

    return `
<article class="card card--comment" data-id="${esc(c.id)}" data-href="${href}"
         style="animation-delay:${Math.min(i, 6) * 70}ms">
  <div class="comment-card">
    <div class="comment-card__main">
      <div class="comment-card__head">
        ${c.author.id
          ? `<a class="card__author-link" href="author.html?id=${encodeURIComponent(c.author.id)}">${avatar}<b>${name}</b></a>`
          : `<span class="card__author-link">${avatar}<b>${name}</b></span>`}
        <span class="comment-card__badge">评论</span>
        <time class="comment-card__time">${esc(c.time)}</time>
      </div>
      <p class="comment-card__text">${hl(c.content, kw)}</p>
    </div>

    <a class="comment-card__target" href="${href}" aria-label="打开这篇书评：${esc(c.target ? c.target.title : '')}">
      <img class="comment-card__thumb dev-pending" src="${esc(c.target ? c.target.cover : '')}" alt="" loading="lazy">
      <span class="comment-card__target-meta">
        <i>TA 评论了这篇书评</i>
        <b>${esc(c.target ? c.target.title : '')}</b>
      </span>
      ${icons.arrow}
    </a>
  </div>

  <footer class="card__foot comment-card__foot">
    <span class="comment-card__hint">${icons.comment} 去书评下接着聊</span>
    <div class="card__acts">
      <button class="act act--like${c.liked ? ' is-liked' : ''}" type="button" aria-label="点赞" aria-pressed="${!!c.liked}">
        ${icons.heart}<span class="n">${abbr(c.likes)}</span>
      </button>
    </div>
  </footer>
</article>`
  }

  /* 信息流统一入口：书评 / 评论 */
  function feedItemHTML(item, i, kw) {
    return item && item.type === 'comment'
      ? commentCardHTML(item, i, kw)
      : cardHTML(item, i, kw)
  }

  /* ---------- 骨架屏 ---------- */
  function skeletonHTML() {
    return `
<div class="skeleton" aria-hidden="true">
  <div class="skeleton__media sk"></div>
  <div class="skeleton__line is-title sk"></div>
  <div class="skeleton__line sk"></div>
  <div class="skeleton__line is-short sk"></div>
</div>`
  }

  /* ---------- 列表点赞：事件委托，只绑定一次 ---------- */
  function bindLike(root) {
    if (!root || root.dataset.likeBound) return
    root.dataset.likeBound = '1'

    root.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.act--like')
      if (!btn) return
      ev.preventDefault()
      ev.stopPropagation()

      const card = btn.closest('[data-id]')
      const id = card && card.dataset.id
      const on = btn.classList.toggle('is-liked')
      btn.setAttribute('aria-pressed', String(on))

      const n = btn.querySelector('.n')
      if (n) {
        const base = Number(btn.dataset.base || n.textContent.replace(/[^0-9.]/g, '')) || 0
        btn.dataset.base = base
        n.textContent = abbr(Math.max(0, base + (on ? 1 : -1)))
      }

      root.dispatchEvent(new CustomEvent('feedlike', { bubbles: true, detail: { id, liked: on } }))
      if (window.API) API.reportLike(id, on)
    })
  }

  /* ---------- 详情页骨架 ---------- */
  function detailSkeleton() {
    return `
<div class="detail-skeleton" aria-hidden="true">
  <div class="skeleton__media sk" style="aspect-ratio:4/3"></div>
  <div class="shell">
    <div class="skeleton__line is-title sk" style="margin-top:22px"></div>
    <div class="skeleton__line sk"></div>
    <div class="skeleton__line sk"></div>
    <div class="skeleton__line is-short sk"></div>
  </div>
</div>`
  }

  /* ---------- 评论便签 ---------- */
  function cmtHTML(c, i) {
    const idx = Math.min(i || 0, 8)
    const av = c.avatar
      ? `<img src="${esc(c.avatar)}" alt="" class="cmt__av" style="object-fit:cover">`
      : `<span class="cmt__av">${esc(c.avatarText || (c.user || '读')[0])}</span>`

    return `
<div class="cmt" data-cid="${esc(c.id)}" style="--ci:${idx}">
  ${av}
  <div class="cmt__main">
    <div class="cmt__top"><b>${esc(c.user)}</b><time>${esc(c.time)}</time></div>
    <p class="cmt__text">${esc(c.content)}</p>
    <div class="cmt__acts">
      <button class="cmt-like" type="button">${icons.heart}赞</button>
      <button class="cmt-reply" type="button">回复</button>
    </div>
  </div>
</div>`
  }

  /* ---------- 详情页 ---------- */
  function detailHTML(d) {
    const comments = d.comments || []
    const related = (d.related || []).map((r) => `
      <a class="related__item" href="detail.html?id=${encodeURIComponent(r.id)}">
        <img class="dev-pending" src="${esc(r.cover || '')}" alt="" loading="lazy">
        <div><b>${esc(r.title || '')}</b><time>${esc((r.time || '').slice(0, 16))}</time></div>
      </a>`).join('')

    const plain = String(d.contentHtml || '').replace(/<[^>]+>/g, '')
    const readMin = Math.max(1, Math.round(plain.length / 380))

    return `
<div class="detail-progress" id="readProgress" aria-hidden="true"></div>

<header class="detail-top" id="detailTop">
  <button class="icon-btn" id="btnBack" type="button" aria-label="返回">${icons.back}</button>
  <span class="detail-top__title">${esc(d.title)}</span>
  <button class="icon-btn" id="btnShare" type="button" aria-label="分享">${icons.share}</button>
</header>

<article class="article">
  <div class="article__hero">
    <img class="dev-pending" src="${esc(d.cover)}" alt="${esc(d.title)} 配图">
  </div>

  <div class="shell">
    <div class="article__inner">
      <span class="article__cat">${esc(d.category || '读书感受')}</span>
      <h1 class="article__title">${esc(d.title)}</h1>
      <div class="article__meta">
        <span>${icons.clock}${esc(d.time)}</span>
        <span>${icons.book}约 ${readMin} 分钟读完</span>
        <span>${icons.eye}${abbr(d.views)} 阅读</span>
      </div>
      <div class="article__author">
        ${d.author.id
          ? `<a class="article__author-link" href="author.html?id=${encodeURIComponent(d.author.id)}" aria-label="查看 ${esc(d.author.name)} 的主页">
               <img src="${esc(d.author.avatar || '')}" alt="" onerror="this.remove()">
               <div><b>${esc(d.author.name)}</b><i>${esc(d.author.college || '校园读者')}</i></div>
             </a>`
          : `<div class="article__author-link">
               <img src="${esc(d.author.avatar || '')}" alt="" onerror="this.remove()">
               <div><b>${esc(d.author.name)}</b><i>${esc(d.author.college || '校园读者')}</i></div>
             </div>`}
        <button class="follow" id="btnFollow" type="button">+ 关注</button>
      </div>
    </div>

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
        <h3>读书伙伴的留言</h3><span>${comments.length} 条</span>
      </div>
      <div id="cmtList">
        ${comments.map((c, i) => cmtHTML(c, i)).join('') || '<p class="empty"><b>还没有人留言</b><small>来贴上第一张便签吧</small></p>'}
      </div>
    </section>

    ${related ? `<section class="related"><h3>还可以读读</h3>${related}</section>` : ''}
  </div>
</article>

<div class="detail-bar" id="detailBar">
  <input class="detail-bar__input" id="cmtInput" type="text" placeholder="写下你的读书感受…" maxlength="200" enterkeyhint="send" aria-label="写下评论">
  <button class="detail-bar__btn" id="barLike" type="button" aria-label="点赞本文">${icons.heart}</button>
  <button class="detail-bar__btn" id="barStar" type="button" aria-label="收藏">${icons.star}</button>
  <button class="detail-bar__send" id="btnSend" type="button">发送</button>
</div>`.trim()
  }

  /* ---------- 作者主页资料卡 ---------- */
  function profileHTML(u) {
    const st = u.stats || {}
    const tags = (u.tags || []).slice(0, 5)
      .map((t) => `<a class="profile__tag" href="index.html?tag=${encodeURIComponent(t)}#feed" data-tag="${esc(t)}"># ${esc(t)}</a>`).join('')

    return `
<header class="author-top is-solid" id="authorTop">
  <button class="icon-btn" id="backBtn" type="button" aria-label="返回">${icons.back}</button>
  <span class="author-top__title">作者主页</span>
  <button class="icon-btn" id="shareBtn" type="button" aria-label="分享">${icons.share}</button>
</header>

<section class="profile">
  <div class="profile__head">
    <img class="profile__avatar" src="${esc(u.avatar || '')}" alt="${esc(u.name)} 的头像" onerror="this.remove()">
    <div class="profile__id">
      <h1 class="profile__name">${esc(u.name)}</h1>
      <p class="profile__sub">${esc(u.college || '校园读者')}${u.joined ? ' · ' + esc(u.joined) + ' 加入' : ''}</p>
    </div>
  </div>
  ${u.bio ? `<p class="profile__bio">${esc(u.bio)}</p>` : ''}
  <ul class="profile__stats">
    <li><b>${abbr(st.posts)}</b><i>篇感受</i></li>
    <li><b>${abbr(st.comments)}</b><i>条评论</i></li>
    <li><b>${abbr(st.likes)}</b><i>获赞</i></li>
  </ul>
  ${tags ? `<div class="profile__tags">${tags}</div>` : ''}
</section>`
  }

  window.UI = {
    esc, abbr, hl, timeAgo, icons,
    cardHTML, commentCardHTML, feedItemHTML, skeletonHTML, emptyHTML, cmtHTML,
    detailHTML, detailSkeleton, profileHTML, bindLike,
  }
})()
