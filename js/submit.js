/* submit.js —— 站内投稿闭环（纯本机）
 * 校验 → 编号 → localStorage(rm_submissions) → 顶部「我的投稿」卡 → 刷新回显
 * 另给一条真实出口：mailto 预填（不假装后端）。
 */
(function () {
  'use strict'
  const UI = window.UI, API = window.API || {}
  const $ = (s) => document.querySelector(s)
  const $$ = (s) => Array.from(document.querySelectorAll(s))
  const KEY = 'rm_submissions', LIMIT = 30, MIN = 300, MAX = 2000, MAIL = 'readingmonth@campus.edu.cn'
  const COVER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#efe7d6"/><rect x="30" y="30" width="580" height="300" fill="none" stroke="#b4452f" stroke-opacity=".28"/><path d="M320 118c-34-17-76-17-112-6v118c36-11 78-11 112 6M320 118c34-17 76-17 112-6v118c-36-11-78-11-112 6M320 118v118" fill="none" stroke="#5f5143" stroke-width="3" stroke-linejoin="round"/><text x="320" y="282" text-anchor="middle" font-family="Songti SC,serif" font-size="19" fill="#b4452f" letter-spacing="6">我 的 投 稿</text></svg>')
  const form = $('#submitForm'); if (!form || !UI) return
  const [fieldsEl, doneEl, noEl, errEl, nameEl, bookEl, catEl, bodyEl, countEl, rowEl, clearEl] =
    ['#sfFields', '#sfDone', '#sfNo', '#sfErr', '#sfName', '#sfBook', '#sfCat', '#sfBody', '#sfCount', '#sfMyRow', '#sfClear'].map($)
  let mine = read(), lastNo = '', toastTimer = 0, armTimer = 0
  const chars = (s) => Array.from(String(s || '')).length
  const pad = (n) => String(n).padStart(2, '0')
  const byTime = (a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)
  function read() {
    try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter((s) => s && s.no && s.body).slice(0, LIMIT) : [] } catch (e) { return [] }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mine.slice(0, LIMIT))) } catch (e) { /* 忽略 */ } }
  function toast(text) {
    const el = $('#toast'); if (!el) return
    el.textContent = text; el.classList.add('is-in')
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('is-in'), 2400)
  }

  /* 校验 / 实时字数：错误具体到差几个字 */
  const setInvalid = (on) => $$('#sfName, #sfBook, #sfCat, #sfBody').forEach((n) => n.setAttribute('aria-invalid', on ? 'true' : 'false'))
  function fail(msg, el) {
    errEl.textContent = msg; errEl.hidden = false; setInvalid(false)
    if (el) { el.setAttribute('aria-invalid', 'true'); el.focus() }
    return false
  }
  function clearErr() { errEl.textContent = ''; errEl.hidden = true; setInvalid(false) }
  function paintCount() {
    const n = chars(bodyEl.value.trim()); countEl.textContent = `已写 ${n} 字 / 至少 ${MIN} 字` + (n < MIN ? ` · 还差 ${MIN - n} 字` : n > MAX ? ` · 超出 ${n - MAX} 字` : '')
    countEl.classList.toggle('is-short', n < MIN); countEl.classList.toggle('is-over', n > MAX)
  }
  function validate() {
    const name = nameEl.value.trim(), book = bookEl.value.trim(), body = bodyEl.value.trim(), n = chars(body)
    if (!name) return fail('请先写下昵称。', nameEl)
    if (chars(name) > 20) return fail('昵称最多 20 字，请再删一点。', nameEl)
    if (!book) return fail('请先写下书名。', bookEl)
    if (chars(book) > 40) return fail('书名最多 40 字，请再删一点。', bookEl)
    if (n < MIN) return fail(`正文还差 ${MIN - n} 字（至少 ${MIN} 字）。`, bodyEl)
    if (n > MAX) return fail(`正文超出 ${n - MAX} 字（最多 ${MAX} 字）。`, bodyEl)
    clearErr(); return true
  }
  /* 编号 / 顶部卡片 */
  function makeNo(ts, seq) {
    const d = new Date(ts); return `RM-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${String(seq).padStart(3, '0')}`
  }
  const nextSeq = () => mine.reduce((m, s) => Math.max(m, parseInt(String(s.no).slice(-3), 10) || 0), 0) + 1
  function mineCardHTML(sub, i) {
    const post = {
      id: sub.id, title: sub.book, excerpt: Array.from(String(sub.body)).slice(0, 80).join(''), cover: COVER,
      author: { name: sub.name, avatar: '', college: '' }, time: UI.timeAgo ? UI.timeAgo(sub.timestamp) : sub.time,
      timestamp: sub.timestamp, likes: 0, commentCount: 0, views: 1, category: sub.category,
      tags: ['我的投稿'], comments: [], liked: false,
    }
    return UI.cardHTML(post, i, '').replace('<article class="card"', '<article class="card" data-mine="1"')
      .replace(/detail\.html\?id=[^"]+/g, '#submitForm').replace('aria-label="阅读全文：', 'aria-label="我的投稿：')
      .replace('</article>', '<span class="card__mine">我的投稿</span></article>')
  }
  function paintCards() {
    syncRow()
    const list = $('#feedList'); if (!list) return
    list.querySelectorAll('[data-mine="1"]').forEach((n) => n.remove())
    if (!mine.length) return
    list.insertAdjacentHTML('afterbegin', mine.slice().sort(byTime).map(mineCardHTML).join(''))
    if (window.FX && FX.developImages) FX.developImages(list); if (UI.bindLike) UI.bindLike(list)
  }
  function syncRow() {
    if (rowEl) { rowEl.hidden = !mine.length; if (mine.length) $('#sfMyCount').textContent = String(mine.length) }
  }
  function ensureMine() {
    syncRow()
    const list = $('#feedList')
    if (list && mine.length && !list.querySelector('[data-mine="1"]')) paintCards()
  }
  function showDone(no) {
    lastNo = no; noEl.textContent = no; fieldsEl.hidden = true; doneEl.hidden = false
    doneEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#sfAgain').focus({ preventScroll: true })
  }
  function resetForm() {
    form.reset(); paintCount(); clearErr(); lastNo = ''
    doneEl.hidden = true; fieldsEl.hidden = false
    nameEl.focus({ preventScroll: true })
  }
  function submit() {
    if (!validate()) return
    const ts = Date.now(), no = makeNo(ts, nextSeq())
    mine.unshift({
      id: 'mine-' + no, no, time: API.fmtTime ? API.fmtTime(ts) : new Date(ts).toLocaleString('zh-CN'), timestamp: ts,
      name: nameEl.value.trim(), book: bookEl.value.trim(), category: catEl.value, body: bodyEl.value.trim(),
    })
    mine = mine.sort(byTime).slice(0, LIMIT)
    save(); showDone(no); paintCards(); toast('投稿已贴上感受墙')
  }
  function sendMail() {
    if (!validate()) return
    const name = nameEl.value.trim(), book = bookEl.value.trim()
    const text = `投稿编号：${lastNo || makeNo(Date.now(), nextSeq())}\n昵称：${name}\n书名：${book}\n分类：${catEl.value}\n\n${bodyEl.value.trim()}\n`
    toast('已打开邮件客户端，记得点发送')
    location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(`投稿 + 《${book}》 + ${name}`) + '&body=' + encodeURIComponent(text)
  }
  /* 入口锚点较深：先关掉平滑滚动，避免信息流补页把目标顶走 */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#submitForm"]'); if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey) return
    e.preventDefault(); const h = document.documentElement; h.style.scrollBehavior = 'auto'; form.scrollIntoView({ block: 'start' }); h.style.scrollBehavior = ''; history.replaceState(null, '', '#submitForm')
  }, true)
  form.addEventListener('submit', (e) => { e.preventDefault(); submit() })
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit() } })
  bodyEl.addEventListener('input', paintCount)
  $('#sfMail').addEventListener('click', sendMail)
  $('#sfAgain').addEventListener('click', resetForm)
  $('#sfView').addEventListener('click', () => {
    ensureMine()
    const card = $('#feedList [data-mine="1"]')
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    else toast('你的投稿就在感受墙最上面')
  })
  const disarm = () => { clearTimeout(armTimer); delete clearEl.dataset.armed; clearEl.textContent = '清空'; clearEl.classList.remove('is-arming') }
  clearEl.addEventListener('click', () => {
    if (clearEl.dataset.armed) {
      disarm(); mine = []; save(); paintCards()
      if (!doneEl.hidden) resetForm()
      toast('已清空本机投稿记录')
      return
    }
    clearEl.dataset.armed = '1'; clearEl.textContent = '再点一次清空'; clearEl.classList.add('is-arming')
    armTimer = setTimeout(disarm, 3000)
  })
  /* 启动：刷新回显；信息流重渲染后自动补回 */
  paintCount(); ensureMine()
  const list = $('#feedList')
  if (list && 'MutationObserver' in window) new MutationObserver(ensureMine).observe(list, { childList: true })
  window.addEventListener('load', ensureMine)
})()
