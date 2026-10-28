/* ==========================================================================
 * effects.js —— 视觉增强层（与业务逻辑解耦，可单独移除）
 *
 *   1. initInkCanvas      首屏飘浮的墨点 / 纸屑（canvas，按面积自适应密度）
 *   2. initHeroParallax   滚动时首屏的分层视差（写入 CSS 变量 --sp）
 *   3. developImages      封面「显影」：模糊 + 褪色 → 清晰
 *   4. initReadingProgress详情页顶部阅读进度
 *   5. revealOnScroll     通用滚动入场（.js-reveal → .is-visible）
 *   6. initHeroPan        详情页封面：随滚动把推近收回到 1.0
 *   7. initHeroPause      首屏无限循环装饰离屏暂停（.hero--paused）
 *
 * 全部尊重 prefers-reduced-motion；画布与滚动动效在不可见时自动暂停。
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
    root.querySelectorAll('img.is-cover-loading').forEach((img) => {
      const done = () => img.classList.remove('is-cover-loading')
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

  /* ------------------------------------------------------------------
   * 6. 详情页封面推近
   *    view() 时间线在本页解析到的滚动容器是 body（它并不真的滚动），
   *    进度恒定在 1% 左右，等于空转；这里改为按封面自身的视口位置
   *    直接算进度并逐帧写 transform（只写 scale/translate，不动布局）。
   * ---------------------------------------------------------------- */
  function initHeroPan(root) {
    const img = (root || document).querySelector('.article__hero img')
    if (!img) return
    /* 降低动效：不绑监听、不写 transform，保持 1.0 */
    if (reduceMotion) return

    /* 量参数用未被 transform 放大的外层相框，否则 rect 会随 scale 反馈 */
    const box = img.closest('.article__hero') || img.parentElement || img
    const FROM = 1.07    // 封面还在视口里时的推近量
    const SPAN = 0.07    // 滚到封面整体越过顶边时收回 1.0
    let raf = 0
    let shown = -1
    let idle = 0
    let inView = true

    function apply() {
      raf = 0
      if (document.hidden || !inView) return
      const rect = box.getBoundingClientRect()
      const h = rect.height || 1
      /* 结束点：封面完全滚出顶部后，再多走 10% 视口高收尾，
         否则最后几像素会先收满，看起来像一次跳变而不是推近 */
      const end = h + (window.innerHeight || 0) * 0.1
      /* 0 = 封面完整可见（含刚进入视口）；1 = 推近已收回到 1.0 */
      const p = Math.min(1, Math.max(0, -rect.top / end))
      const s = FROM - SPAN * p
      const ty = (p - 1) * 1.5           // 1.07 时 -1.5%，落回时 0
      const key = Math.round(s * 10000)
      if (key === shown) return
      shown = key
      img.style.transform = 'scale(' + s.toFixed(4) + ') translateY(' + ty.toFixed(2) + '%)'
      /* 只在推近进行中提合成层；滚完 / 停手 / 离屏都撤掉，不留常驻层 */
      img.style.willChange = p > 0 && p < 1 ? 'transform' : ''
      clearTimeout(idle)
      if (p > 0 && p < 1) idle = setTimeout(() => { img.style.willChange = '' }, 200)
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    function halt() {
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
      clearTimeout(idle)
      img.style.willChange = ''
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) halt()
      else onScroll()
    })

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting
        if (inView) onScroll()
        else halt()
      }, { rootMargin: '80px' }).observe(img)
    }

    apply()
  }

  /* ------------------------------------------------------------------
   * 7. 首屏装饰离屏暂停
   *    无限循环的翻页 / 墨线 / 飞鸟 / 日轮只在 hero 可见时跑；
   *    与墨点画布同一套 visible 策略，不用定时器轮询。
   * ---------------------------------------------------------------- */
  function initHeroPause(hero) {
    if (!hero || reduceMotion || !('IntersectionObserver' in window)) return
    new IntersectionObserver(([entry]) => {
      hero.classList.toggle('hero--paused', !entry.isIntersecting)
    }, { threshold: 0 }).observe(hero)
  }

  window.FX = { initInkCanvas, initHeroParallax, developImages, initReadingProgress, revealOnScroll, initHeroPan, initHeroPause, reduceMotion }
})()
