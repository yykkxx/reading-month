/**
 * 生成离线 Mock 数据（模拟第三方内容 API）
 *   node mock/gen-mock.mjs
 * 产出：
 *   mock/api/posts/page-1.json  信息流分页列表（每页 8 条，共 12 页 = 96 条，用于无限滚动）
 *   mock/api/detail/{id}.json   每条内容的详情
 */
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PAGE_SIZE = 8
const PAGE_COUNT = 12
const TOTAL = PAGE_SIZE * PAGE_COUNT

/* ---------- 可复现随机 ---------- */
let seed = 20260423
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1))

/* ---------- 素材：本地内联 SVG 封面（无网络、无版权问题） ---------- */
const COVER_ART = [
  { name: '书页', a: '#6C5CE7', b: '#00C2A8' },
  { name: '夜读', a: '#2B2A4C', b: '#8E7CFF' },
  { name: '晨光', a: '#FF7A59', b: '#FFC46B' },
  { name: '深海', a: '#0F3D5C', b: '#22C1C3' },
  { name: '纸墨', a: '#7A4E2D', b: '#E0A96D' },
  { name: '雨林', a: '#1B7A4B', b: '#9BE15D' },
  { name: '星河', a: '#1B1B3A', b: '#FF6FB5' },
  { name: '赛博', a: '#231557', b: '#22D3EE' },
]

function coverSvg(i, id) {
  const art = COVER_ART[i % COVER_ART.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${art.a}"/><stop offset="1" stop-color="${art.b}"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <g fill="#fff" opacity="0.16">
    <circle cx="120" cy="90" r="70"/><circle cx="700" cy="420" r="110"/><circle cx="620" cy="120" r="34"/>
  </g>
  <g stroke="#fff" stroke-opacity="0.5" fill="none" stroke-width="3">
    <rect x="300" y="140" width="200" height="250" rx="8"/>
    <path d="M400 140v250"/>
    <path d="M330 200h50M330 240h50M330 280h50M420 200h50M420 240h50M420 280h50"/>
  </g>
  <rect width="800" height="500" fill="url(#v)"/>
  <text x="40" y="460" fill="#fff" fill-opacity="0.85" font-family="sans-serif" font-size="26">${art.name} · ${id.toUpperCase()}</text>
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\n\s*/g, ''))
}

/* ---------- 文案素材 ---------- */
const TITLES = [
  '《活着》读后感：把日子过成一条河',
  '在《三体》里，我第一次对宇宙感到害怕',
  '读《人类简史》：我们为什么相信故事',
  '《小王子》教会我的三件事，与长大有关',
  '《月亮与六便士》：满地都是六便士，他却抬头看见了月亮',
  '《平凡的世界》里，最打动我的不是奋斗，是温柔',
  '《房思琪的初恋乐园》：文字可以很美，也可以很痛',
  '《百年孤独》读了三遍，才懂开头那句话',
  '《瓦尔登湖》：一个人也可以活得很好',
  '《围城》里的比喻，值一整本摘抄本',
  '《你当像鸟飞往你的山》：教育是一场自我救赎',
  '《红楼梦》里的春天，藏着所有人的少年时代',
  '《边城》：所有等待，最后都成了风景',
  '《苏东坡传》：把苦难活成诗的人',
  '《尘埃落定》：傻子比聪明人看得更远',
  '《追风筝的人》：为你，千千万万遍',
  '《深度工作》：我戒掉手机的第 21 天',
  '《非暴力沟通》读后：我终于学会说“我需要”',
  '《昆虫记》里的夏天，比童年还长',
  '《万历十五年》：历史里没有一个人是配角',
  '《我们仨》：最好的家，是三个人都在',
  '《城南旧事》：成长就是一次次说再见',
  '《罪与罚》：一个人能不能越过自己的良心',
  '《寂静的春天》：我们欠自然一句抱歉',
  '《呼兰河传》：祖父的园子，永远有太阳',
  '《解忧杂货店》：所有认真写下的信都会有人读',
  '《杀死一只知更鸟》：同理心是最贵的教养',
  '《白鹿原》：土地记得每一个离开的人',
  '《我与地坛》：想清楚了死，才能好好活',
  '《小径分岔的花园》：时间是无数个可能的分叉',
  '《三毛全集》：流浪的人也需要一盏灯',
  '《看见》：真相常常躲在细节里',
]

const EXCERPTS = [
  '熬夜读到第三章，窗外天都亮了。那一刻我觉得文字像灯，把心里看不见的地方照亮了一小块。',
  '本来是抱着完成任务的心态翻开的，结果一口气读到下午。合上书的时候，房间里安静得能听见自己的心跳。',
  '书里那句话被我抄在了笔记本第一页：“人的一生，是自己一次次选择的总和。”',
  '最打动我的不是情节，而是作者写日常的那种耐心——原来平凡的生活也值得被认真描述。',
  '读完之后我绕着操场走了三圈。有些书就是这样，读完你不想说话，只想走一走。',
  '以为是本薄薄的小书，结果是本厚厚的镜子。照见了很多我一直回避的东西。',
  '最喜欢书里那位配角，戏份不多，却每次出场都让人心里一暖。',
  '读到一半时忍不住在页边写满了字，后来发现同一段话，我前后两次的理解完全不同。',
  '这本书让我重新整理了书架，也重新整理了一点自己的生活。',
  '通勤路上读的，地铁到站了也舍不得放下，硬是坐过了两站。',
  '有些句子像老朋友，隔着几十年的纸张，依然准确地拍了拍我的肩膀。',
  '读完的第一个念头是：想把它借给最好的朋友，又有点舍不得。',
]

const COMMENTS = [
  '写得真好，收藏了！',
  '这本书我也读过，看到你这段又想重读一遍。',
  '同感，读到后面眼泪都下来了。',
  '请问这个版本是哪个译者的？',
  '读书月我也要开始打卡了，一起加油！',
  '“文字像灯”这个比喻太喜欢了。',
  '已经在图书馆预约了，谢谢推荐📚',
  '这段话我抄在本子上了。',
  '看完你的感受，我决定今晚就翻第一章。',
  '图书馆三楼有这本，借阅码 3-215。',
  '被标题吸引进来，果然没让我失望。',
  '第一次看到有人这样解读，学到了。',
  '点赞，希望多写点读书笔记。',
  '刚读完这本，我们的感受几乎一模一样。',
  '好文，转给室友了。',
]

const NICKNAMES = [
  '青柠不加冰', '晚八点读书人', '图书馆常驻居民', '半页纸', '南山有木', '墨鱼丸子',
  '凌晨四点的书页', '一只热爱排版的猫', '折角爱好者', '读不完的卡尔维诺', '灯塔与船',
  '自习室 305', '橘子汽水', '晚风翻书', '青苔与旧书', '借书卡收藏家', '沉默的读者',
  '三行批注', '理科生的文学梦', '耳机里的诗',
]

const CATEGORIES = ['文学', '小说', '科幻', '历史', '社科', '成长', '心理', '自然', '教育', '传记']
const TAGS = ['深夜读书', '一周一书', '读书笔记', '我的书架', '金句摘抄', '读完就写', '通勤阅读', '经典重读']

const AUTHORS = [
  '余华', '刘慈欣', '尤瓦尔·赫拉利', '圣埃克苏佩里', '毛姆', '路遥', '林奕含', '加西亚·马尔克斯',
  '梭罗', '钱锺书', '塔拉·韦斯特弗', '曹雪芹', '沈从文', '林语堂', '阿来', '卡勒德·胡赛尼',
  '卡尔·纽波特', '马歇尔·卢森堡', '法布尔', '黄仁宇', '杨绛', '林海音', '陀思妥耶夫斯基',
  '蕾切尔·卡森', '萧红', '东野圭吾', '哈珀·李', '陈忠实', '史铁生', '博尔赫斯',
]

const BOOKS = [
  ['活着', '余华', '作家出版社'], ['三体', '刘慈欣', '重庆出版社'], ['人类简史', '尤瓦尔·赫拉利', '中信出版社'],
  ['小王子', '圣埃克苏佩里', '人民文学出版社'], ['月亮与六便士', '毛姆', '上海译文出版社'],
  ['平凡的世界', '路遥', '北京十月文艺出版社'], ['房思琪的初恋乐园', '林奕含', '北京联合出版公司'],
  ['百年孤独', '加西亚·马尔克斯', '南海出版公司'], ['瓦尔登湖', '梭罗', '译林出版社'],
  ['围城', '钱锺书', '人民文学出版社'], ['你当像鸟飞往你的山', '塔拉·韦斯特弗', '南海出版公司'],
  ['红楼梦', '曹雪芹', '人民文学出版社'], ['边城', '沈从文', '北岳文艺出版社'], ['苏东坡传', '林语堂', '湖南文艺出版社'],
  ['尘埃落定', '阿来', '人民文学出版社'], ['追风筝的人', '卡勒德·胡赛尼', '上海人民出版社'],
  ['深度工作', '卡尔·纽波特', '江西人民出版社'], ['非暴力沟通', '马歇尔·卢森堡', '华夏出版社'],
  ['昆虫记', '法布尔', '商务印书馆'], ['万历十五年', '黄仁宇', '中华书局'], ['我们仨', '杨绛', '三联书店'],
  ['城南旧事', '林海音', '人民文学出版社'], ['罪与罚', '陀思妥耶夫斯基', '上海译文出版社'],
  ['寂静的春天', '蕾切尔·卡森', '上海译文出版社'], ['呼兰河传', '萧红', '人民文学出版社'],
  ['解忧杂货店', '东野圭吾', '南海出版公司'], ['杀死一只知更鸟', '哈珀·李', '译林出版社'],
  ['白鹿原', '陈忠实', '人民文学出版社'], ['我与地坛', '史铁生', '人民文学出版社'],
  ['小径分岔的花园', '博尔赫斯', '上海译文出版社'],
]

/* ---------- 生成 ---------- */
const pad = (n) => String(n).padStart(2, '0')
const BASE = new Date('2026-04-23T21:00:00+08:00').getTime() // 读书月期间，基准时间

function fmtTime(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const posts = []
for (let i = 0; i < TOTAL; i++) {
  const id = 'post-' + String(i + 1).padStart(3, '0')
  const book = BOOKS[i % BOOKS.length]
  const ts = BASE - i * int(35, 260) * 60 * 1000
  const commentCount = int(3, 9)
  const comments = Array.from({ length: commentCount }, (_, k) => ({
    id: `${id}-c${k + 1}`,
    user: pick(NICKNAMES),
    avatarText: pick(NICKNAMES).slice(0, 1),
    content: pick(COMMENTS),
    time: fmtTime(ts + int(5, 5000) * 60 * 1000),
    likes: int(0, 96),
  }))

  const title = TITLES[i % TITLES.length]
  const post = {
    id,
    title,
    cover: coverSvg(i, id),
    excerpt: EXCERPTS[i % EXCERPTS.length],
    // 列表 API 常见结构：作者 + 时间 + 统计
    author: {
      name: pick(NICKNAMES),
      avatar: coverSvg(i + 3, 'a' + i),
      college: pick(['文学院', '计算机学院', '外国语学院', '新闻传播学院', '医学院', '数学学院', '法学院', '艺术学院']),
    },
    time: fmtTime(ts),
    timestamp: ts,
    likes: int(12, 986),
    commentCount,
    views: int(120, 8600),
    liked: false,
    category: CATEGORIES[i % CATEGORIES.length],
    tags: [pick(TAGS), pick(TAGS)].filter((v, k, a) => a.indexOf(v) === k),
    comments: comments.slice(0, 2), // 列表里只带 2 条热评（真实 API 常见）
  }
  posts.push(post)

  const detail = {
    code: 0,
    data: {
      ...post,
      book: { name: book[0], author: book[1], publisher: book[2], isbn: '978-' + int(1000000000, 9999999999) },
      contentHtml: [
        `<p>${post.excerpt}</p>`,
        `<h2>为什么读它</h2>`,
        `<p>选这本书其实是偶然。${pick(EXCERPTS)}图书馆的灯光偏暖，书脊上有一道旧折痕，像被很多人温柔地翻过。</p>`,
        `<blockquote>${pick(EXCERPTS)}</blockquote>`,
        `<p>读的过程中我一直在想一个问题：我们读书，到底是在读别人，还是在读自己？${pick(EXCERPTS)}</p>`,
        `<h2>我记住的三句话</h2>`,
        `<ul><li>${pick(EXCERPTS)}</li><li>${pick(EXCERPTS)}</li><li>${pick(EXCERPTS)}</li></ul>`,
        `<p>${pick(EXCERPTS)}如果你也在读书月里读到了这本书，欢迎在评论区和我交换感受。</p>`,
      ].join(''),
      comments,
      related: [],
    },
  }
  detail.data.related = [
    { id: posts[Math.max(0, i - 1)].id, title: posts[Math.max(0, i - 1)].title, cover: posts[Math.max(0, i - 1)].cover, time: posts[Math.max(0, i - 1)].time },
    { id: posts[Math.max(0, i - 2)].id, title: posts[Math.max(0, i - 2)].title, cover: posts[Math.max(0, i - 2)].cover, time: posts[Math.max(0, i - 2)].time },
  ]

  await writeFile(join(ROOT, 'api/detail', `${id}.json`), JSON.stringify(detail, null, 2))
}

// 信息流分页
const totalPages = Math.ceil(TOTAL / PAGE_SIZE)
for (let p = 1; p <= totalPages; p++) {
  const slice = posts.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE)
  await writeFile(
    join(ROOT, 'api/posts', `page-${p}.json`),
    JSON.stringify({ code: 0, data: { page: p, pageSize: PAGE_SIZE, total: TOTAL, hasMore: p < totalPages, list: slice } }, null, 2),
  )
}

// 索引（方便调试）
await writeFile(join(ROOT, 'api/index.json'), JSON.stringify({ total: TOTAL, pageSize: PAGE_SIZE, totalPages, ids: posts.map((p) => p.id) }, null, 2))
await writeFile(join(ROOT, 'api/comments.json'), JSON.stringify(COMMENTS, null, 2))

console.log(`✅ 生成完成：${TOTAL} 条内容 / ${totalPages} 页列表 / ${TOTAL} 份详情`)
