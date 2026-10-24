/* ==========================================================================
 * theme.js —— 夜读模式
 *   默认保持「米纸」日间主题；用户手动切换后写入 localStorage。
 *   页面 <head> 里的内联脚本会先读一次，避免刷新时闪白。
 * ========================================================================== */
(function () {
  'use strict'

  const KEY = 'rm-theme'
  const root = document.documentElement
  const META_DAY = '#f6f1e6'
  const META_NIGHT = '#15120e'

  function current() {
    try { return localStorage.getItem(KEY) === 'night' ? 'night' : 'day' } catch (e) { return 'day' }
  }

  function apply(theme, persist) {
    const night = theme === 'night'

    if (night) root.setAttribute('data-theme', 'night')
    else root.removeAttribute('data-theme')

    if (persist) {
      try { localStorage.setItem(KEY, night ? 'night' : 'day') } catch (e) { /* 隐私模式忽略 */ }
    }

    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(night))
      btn.setAttribute('aria-label', night ? '切换到日间模式' : '切换到夜读模式')
      btn.title = night ? '日间模式' : '夜读模式'
      const icon = btn.querySelector('.theme-toggle__ico')
      if (icon) icon.textContent = night ? '☀' : '☾'
    })

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', night ? META_NIGHT : META_DAY)

    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: night ? 'night' : 'day' } }))
  }

  function init() {
    apply(current(), false)

    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night'
        apply(next, true)
      })
    })
  }

  window.Theme = { apply, current }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
