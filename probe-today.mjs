import { JSDOM } from 'jsdom'
const url = 'http://127.0.0.1:4173/index.html'
const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true })
await new Promise(r => setTimeout(r, 2500))
const d = dom.window.document
const box = d.querySelector('#todayPage')
console.log('hidden:', box?.hidden)
console.log('title:', d.querySelector('.today__title')?.textContent?.trim())
console.log('excerpt len:', d.querySelector('.today__excerpt')?.textContent?.length)
console.log('author:', d.querySelector('.today__author')?.textContent?.trim())
console.log('hrefs:', [...d.querySelectorAll('#todayPage a')].map(a => a.getAttribute('href')))
console.log('h2 count:', d.querySelectorAll('h2').length, 'todayTitle:', d.querySelectorAll('#todayTitle').length)
const req = dom.window.performance?.getEntriesByType?.('resource')?.filter(e=>e.name.includes('page-1'))?.length
console.log('page-1 fetches:', req)
