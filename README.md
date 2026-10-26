# 📖 2026 校园读书月 · 阅见世界

移动端优先、桌面多列的**纯静态**读书月宣传 + 读书感受信息流网站。

> 接手开发先读 [`agent.md`](agent.md)（硬性要求 / 踩过的坑 / 提交发布流程），再看 [`plan.md`](plan.md)（进度 / 决策 / 下一步）。

无需后端、无需构建：整个目录可直接放到任意静态服务器（或 CDN / OSS）。`file://` 直接双击打开也能用，只是读不到 mock JSON，会降级到内置兜底数据。

视觉风格是「**纸墨 · 书房**」：米纸底、松烟墨字、朱砂印章、青瓷绿点缀；宋体标题、日历卡倒计时、便签纸条、邮戳时间、书签丝带投稿按钮。动效围绕纸与墨（飘浮墨点、书写式标题、翻页视差、页面堆叠、封面显影、阅读进度、便签错峰浮现），全部尊重 `prefers-reduced-motion`。

另备一套**夜读模式**：暖黑纸 + 米字 + 亮朱砂，左下角一键切换并记忆偏好（`localStorage: rm-theme`）。

## 快速开始

```bash
# 本地测试（推荐，信息流需要 http 环境才能读取 mock JSON）
cd reading-month
python3 -m http.server 4173
# 打开 http://127.0.0.1:4173/index.html
```

## 页面结构

| 页面 | 说明 |
| --- | --- |
| `index.html` | **首屏 = 读书月介绍页**（活动主题、倒计时、数据统计、下滑引导），下滑进入**主界面 = 读书感受信息流**，页尾是活动规则与站内投稿表单 |
| `detail.html` | 感受详情页，内容来自 API：正文、留言墙、点赞 / 收藏 / 分享、相关阅读 |
| `author.html` | 作者主页：资料卡 + TA 的全部书评与评论 |

## 功能清单

- **介绍页**：手绘翻书插画、日轮与远山、纸面颗粒、canvas 飘浮墨点、书写式标题、朱砂竖排小印、日历卡倒计时、便签式数据、下滑引导、吸顶导航
- **滚动视差**：首屏分层移动并渐隐，信息流以「压在上面的一页」圆角 + 阴影叠入
- **信息流**：封面图（做旧相纸滤镜）、标题、简介、邮戳时间、评论数、点赞数；卡片带轻微纸片倾斜与顶部齿孔，可点击进详情
- **评论也进流**：每 4 篇书评穿插 1 条评论，做成「引文条」——引号包住的评论正文 + 原书评缩略图 + 跳转链接（直达该书的留言区）
- **作者主页**：头像 / 昵称可点，进入 `author.html?id=u01`，看这位同学的全部书评与评论、获赞统计与常用标签
- **无限滚动**：底部哨兵 + IntersectionObserver，共 120 条 / 15 页（96 篇书评 + 24 条评论）；首屏只请求 page-1，其余 14 页空闲预取
- **搜索**：关键词实时搜索（320ms 防抖），命中标题 / 简介 / 作者 / 分类 / 标签 / 原书评标题，荧光笔式高亮
- **筛选 / 排序**：10 个分类 + 全部、8 个标签、三种排序（刚出炉 / 最多共鸣 / 聊得热闹）；筛选摘要可一键重置
- **详情页**：宋体书页正文 + 首字下沉 + 中文首行缩进、引文块、书腰卡、便签留言墙、阅读进度条、相关阅读、点赞收藏、分享
- **夜读模式**：日间「米纸」/ 夜间「暖黑」两套配色；`<head>` 内联脚本提前应用，刷新不闪白
- **站内投稿表单**（本机闭环）：
  - `#submitForm`：昵称（≤20 字）、书名（≤40 字）、分类、正文（300–2000 字，实时字数与「还差 N 字」提示）
  - 校验通过后生成编号 `RM-YYYYMMDD-NNN`，写入 `localStorage: rm_submissions`，显示成功态
  - 表单下方「我的投稿」独立成列（`#sfMineList`），**不参与信息流筛选**；支持刷新回显、二次确认清空
  - 「用邮件发送」是唯一真实出口：`mailto:` 预填编号 / 昵称 / 书名 / 分类 / 正文；不做假后端、不承诺自动送达
  - 投稿卡不伪造统计：点赞 / 评论 / 浏览均为 0，标「本机保存」，整卡不跳转
- **本地互动记忆**：

  | 键 | 用途 |
  | --- | --- |
  | `rm-theme` | 夜读 / 日间主题 |
  | `rm_liked_ids` | 已点赞的书评 id |
  | `rm_star_ids` | 已收藏的书评 id |
  | `rm_cmt_liked` | 已点赞的留言 id |
  | `rm_cmts` | 本机新发的留言（详情页回显） |
  | `rm_submissions` | 本机投稿记录（最多 30 条） |

- **字体自托管**：`fonts/` 四个 woff 子集 —— Noto Serif SC 400 / 700 / 900 + Noto Sans SC 400；三页均以 `@font-face` 引用，不请求 Google Fonts 或任何外部字体 CDN
- **移动端适配**：`viewport-fit=cover`、`100svh`、安全区 `env()`、输入框 16px（避免 iOS 聚焦放大）、触摸友好的点击区域、`prefers-reduced-motion` 降级
- **无障碍**：正文对比度 ≥ 4.5:1、语义化标签、`aria-*` 状态、图片 `alt`、键盘跳转链接与 `:focus-visible` 焦点环

## 目录

```
reading-month/
├── index.html                首页：介绍页 + 信息流 + 活动规则 / 投稿表单
├── detail.html               详情页
├── author.html               作者页
├── robots.txt / sitemap.xml  抓取与站点地图
├── css/style.css             全部样式（设计变量 / 组件 / 响应式 / 夜读）
├── fonts/                    自托管字体子集（Serif 400/700/900 + Sans 400）
├── assets/og-cover.png       1200×630 分享封面（唯一的位图素材）
├── js/
│   ├── config.js             全局配置：数据源、分页大小、站内投稿入口、活动周期
│   ├── api.js                数据层：mock / remote 双通道 + 查询（搜索/筛选/排序）+ 兜底
│   ├── ui.js                 模板层：卡片 / 骨架屏 / 详情 / 空态 / 关键词高亮
│   ├── effects.js            视效层：墨点画布 / 视差 / 封面显影 / 阅读进度
│   ├── theme.js              夜读模式：主题切换与偏好记忆
│   ├── app.js                首页：倒计时、滚动引导、信息流、搜索筛选、首屏统计
│   ├── detail.js             详情：按 id 拉取、点赞收藏评论分享
│   ├── author.js             作者页：资料卡、作品续加载
│   └── submit.js             站内投稿：校验 / 编号 / 本机存储 / mailto
├── tools/
│   ├── smoke.mjs             数据/模板冒烟测试（node tools/smoke.mjs，零依赖）
│   └── dom-test.mjs          真实 DOM 端到端测试（需 npm i -D jsdom）
├── mock/
│   ├── gen-mock.mjs          数据生成脚本（node mock/gen-mock.mjs）
│   └── api/
│       ├── posts/page-1..15.json    信息流分页（每页 8 条）
│       ├── totals.json             首屏统计汇总（posts / comments / authors）
│       ├── detail/post-001..096.json  书评详情
│       └── users/u01..u20.json     作者主页
└── README.md
```

## 接入真实第三方 API

当前为本地 mock 模式（`SOURCE: 'mock'`），读取 `mock/api/**`。接真实接口只改 `js/config.js`：

```js
SOURCE: 'remote',
REMOTE: {
  feed:      'https://api.example.com/v1/reading/posts?page={page}&size={size}&cat={cat}&q={q}&tag={tag}&sort={sort}',
  detail:    'https://api.example.com/v1/reading/posts/{id}',
  user:      'https://api.example.com/v1/reading/users/{id}',
  userPosts: 'https://api.example.com/v1/reading/users/{id}/posts?page={page}&size={size}',
  like:      'https://api.example.com/v1/reading/posts/{id}/like',     // 可选
  comment:   'https://api.example.com/v1/reading/posts/{id}/comments', // 可选
  headers: { Accept: 'application/json' },
  timeout: 8000,
}
```

数据层会自动做字段归一化，兼容常见的字段命名差异（`list/posts/items`、`likes/like_count`、`author/username`、`content/body` 等）。第三方接口不支持搜索或排序时，前端会在本地兜一层过滤。远程失败会自动回退本地 mock，再失败则用内置兜底数据，页面不会白屏。

## 数据字段

信息流列表项：

```json
{
  "id": "post-001",
  "title": "《活着》读后感：把日子过成一条河",
  "cover": "data:image/svg+xml;charset=utf-8,...",
  "excerpt": "熬夜读到第三章，窗外天都亮了…",
  "author": { "id": "u07", "name": "青柠不加冰", "avatar": "...", "college": "文学院" },
  "time": "2026-05-20 21:00",
  "timestamp": 1776950400000,
  "likes": 391,
  "commentCount": 1,
  "views": 3421,
  "liked": false,
  "category": "文学",
  "tags": ["深夜读书", "一周一书"],
  "comments": [{ "id": "…", "user": "…", "content": "…", "time": "…", "likes": 12 }]
}
```

评论条目（`type: "comment"`）：

```json
{
  "type": "comment",
  "id": "cf-001",
  "content": "被标题吸引进来，果然没让我失望。",
  "author": { "id": "u08", "name": "一只热爱排版的猫", "college": "法学院" },
  "time": "2026-04-23 20:41",
  "timestamp": 1776948060000,
  "likes": 42,
  "category": "文学",
  "tags": ["深夜读书"],
  "target": { "id": "post-001", "title": "《活着》读后感：把日子过成一条河", "cover": "data:image/svg+xml,..." }
}
```

分页文件 `page-N.json` 的 `data` 顶层：

```json
{
  "page": 1, "pageSize": 8, "total": 120, "hasMore": true,
  "totals": { "posts": 96, "comments": 24, "authors": 20 },
  "list": []
}
```

- `totals` 只在 page-1 下发，由生成器从真实数据算出；`mock/api/totals.json` 是同一份汇总的独立小文件，首屏统计读它，避免与信息流重复请求 page-1、也不触发 15 页预取
- 每篇详情的 `commentCount === comments.length`，时间戳按 page 数字序严格递减
- 详情接口额外返回 `contentHtml`、`book`、`comments`、`related`；作者接口返回 `id / name / avatar / college / joined / bio / stats{posts,comments,likes,views} / tags`

## 本地测试

```bash
node tools/smoke.mjs                      # 51 项断言（零依赖）：分页/混排/分类/搜索/排序/作者/模板/XSS/兜底
npm i -D jsdom && node tools/dom-test.mjs # 46 项断言：真实 DOM 下的渲染、显影、评论卡、倒计时、筛选、排序、搜索、空态、夜读切换、点赞、详情、发评论、作者页
node mock/gen-mock.mjs                    # 重新生成 mock 数据（时间戳严格递减，保证分页稳定）
```

## 本地测试记录

- `mock/api`：15 页 × 8 条 = 120 条信息流（96 篇书评 + 24 条评论）+ 96 份书评详情 + 20 份作者主页；封面全部为内联 SVG（无外链、无版权风险）
- 数据自检：分页无重复、混排按时间倒序、每条评论都指向有效书评、分类逐页翻到底条数一致、标签筛选无越界、点赞 / 评论排序正确、关键词搜索结果相关、关键词高亮防 XSS、详情模板契约完整、`commentCount === comments.length`
- jsdom 端到端：首页卡片渲染、封面显影类清除、倒计时、分类 / 标签、排序、搜索收窄与高亮、空态、夜读切换与记忆、点赞计数、详情页标题 / 正文 / 评论 / 阅读进度 / 发评论、作者页续加载，均通过
- 首屏统计：`mock/api/totals.json` 在首屏优先请求，实测约 700–800ms 出现首个数字，800ms 快照三格均已不是「—」（`data-count` 已是 96 / 24 / 20），动画收尾为 96 / 24 / 20；1.2s 内 `posts/page-*.json` 请求数为 1
- 字体：`fonts/` 四个 woff 子集（Serif 400/700/900 + Sans 400），`document.fonts` 三档 serif 字重均为 loaded；无 Google Fonts / gstatic 请求
- 已知边界：字体总量约 817KB（woff 非 woff2、965 字子集）；信息流空闲预取仍会拉取其余 14 页（约 719KB），这是筛选 / 搜索跨全量生效的代价
