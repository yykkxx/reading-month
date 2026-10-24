/* ==========================================================================
 * effects.js —— 视觉增强层（与业务逻辑解耦，可单独移除）
 *
 *   1. initInkCanvas      首屏飘浮的墨点 / 纸屑（canvas，按面积自适应密度）
 *   2. initHeroParallax   滚动时首屏的分层视差（写入 CSS 变量 --sp）
 *   3. developImages      封面「显影」：模糊 + 褪色 → 清晰
 *   4. initReadingProgress详情页顶部阅读进度
 *   5. revealOnScroll     通用滚动入场（.js-reveal → .is-visible）
 *
 * 全部尊重 prefers-reduced-motion；画布在不可见时自动暂停。
 * ========================================================================== */
(function () {
  'use strict'

  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  /* ------------------------------------------------------------------
   * 1. 墨点画布
   * ---------------------------------------------------------------- */
  function initInkCanvas(canvas) {
    if (!canvas || !canvas.getContext) return
    const ctx = canvas.getContext('2d')
    const COLORS = ['93,71,50', '172,74,52', '78,110,93', '201,138,45']

    let w = 0, h = 0, dpr = 1, parts = [], raf = 0, last = 0, visible = true

    function make() {
      const petal = Math.random() < 0.15
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: petal ? 2.4 + Math.random() * 2 : 0.7 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 0.13,
        vy: -(0.06 + Math.random() * 0.2),
        a: 0.1 + Math.random() * 0.26,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.012,
        phase: Math.random() * Math.PI * 2,
        petal,
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.max(12, Math.min(36, Math.round((w * h) / 26000)))
      parts = Array.from({ length: n }, make)
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        ctx.save()
        ctx.translate(p.x, p.y)
        if (p.petal) { ctx.rotate(p.rot); ctx.scale(1, 0.52) }
        ctx.beginPath()
        ctx.arc(0, 0, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')'
        ctx.fill()
        ctx.restore()
      }
    }

    function step(t) {
      raf = 0
      if (!visible) return
      const dt = Math.min(48, t - (last || t))
      last = t
      const k = dt / 16.7
      const sway = t / 2600
      for (const p of parts) {
        p.y += p.vy * k
        p.x += p.vx * k + Math.sin(sway + p.phase) * 0.12
        p.rot += p.vr * k
        if (p.y < -14) { p.y = h + 12; p.x = Math.random() * w }
        if (p.x < -14) p.x = w + 12
        else if (p.x > w + 14) p.x = -12
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    const start = () => { if (!raf && !reduceMotion && visible) raf = requestAnimationFrame(step) }
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    resize()
    if (reduceMotion) draw()
    else start()

    let rz = 0
    window.addEventListener('resize', () => {
      clearTimeout(rz)
      rz = setTimeout(resize, 180)
    }, { passive: true })

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop()
      else start()
    })

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        visible ? start() : stop()
      }, { threshold: 0 }).observe(canvas)
    }
  }

  /* ------------------------------------------------------------------
   * 2. 首屏视差：把滚动进度写进 --sp（0~1），由 CSS 消费
   * ---------------------------------------------------------------- */
  function initHeroParallax(hero) {
    if (!hero) return
    let ticking = false

    function apply() {
      ticking = false
      const vh = window.innerHeight || 1
      const sp = Math.min(1, Math.max(0, (window.scrollY || 0) / vh))
      hero.style.setProperty('--sp', sp.toFixed(3))
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(apply) }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    apply()
  }

  /* ------------------------------------------------------------------
   * 3. 封面显影
   * ---------------------------------------------------------------- */
  function developImages(root) {
    if (!root) return
    root.querySelectorAll('img.dev-pending').forEach((img) => {
      const done = () => img.classList.remove('dev-pending')
      if (img.src.startsWith('data:') || (img.complete && img.naturalWidth)) {
        requestAnimationFrame(done)
      } else {
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
        /* file:// 或极慢网络下的兜底，避免一直糊着 */
        setTimeout(done, 2500)
      }
    })
  }

  /* ------------------------------------------------------------------
   * 4. 详情页阅读进度
   * ---------------------------------------------------------------- */
  function initReadingProgress(el) {
    if (!el) return
    let ticking = false

    function apply() {
      ticking = false
      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      const p = Math.min(1, Math.max(0, (window.scrollY || 0) / max))
      el.style.width = (p * 100).toFixed(2) + '%'
      el.classList.toggle('is-full', p > 0.985)
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(apply) }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    apply()
  }

  /* ------------------------------------------------------------------
   * 5. 通用滚动入场
   * ---------------------------------------------------------------- */
  function revealOnScroll(root) {
    const targets = Array.from((root || document).querySelectorAll('.js-reveal'))
    if (!targets.length) return
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        io.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    targets.forEach((el) => io.observe(el))
  }

  window.FX = { initInkCanvas, initHeroParallax, developImages, initReadingProgress, revealOnScroll, reduceMotion }
})()
