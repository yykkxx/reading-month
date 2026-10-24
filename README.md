# 📖 2026 校园读书月 · 阅见世界

移动端优先的**纯静态**读书月宣传 + 读书感受信息流网站。无需后端、无需构建，直接把整个目录丢到任意静态服务器（或 CDN / OSS）即可上线。

视觉风格为「**纸墨 · 书房**」：米纸底、松烟墨字、朱砂印章、青瓷绿点缀；宋体标题、日历卡倒计时、便签纸条、邮戳时间、书签丝带投稿按钮 —— 有书卷气，不做霓虹科技感。

动效也围绕「纸与墨」：飘浮墨点、书写式标题、翻页视差、页面堆叠、封面显影、阅读进度、便签错峰浮现，全部尊重 `prefers-reduced-motion`。

另备一套**夜读模式**：暖黑纸 + 米字 + 亮朱砂，左下角一键切换并记忆偏好（`localStorage: rm-theme`）。

## 快速开始

```bash
# 本地测试（推荐，信息流需要 http 环境才能读取 mock JSON）
cd reading-month
python3 -m http.server 4173
# 打开 http://127.0.0.1:4173/index.html
```

也可以直接双击 `index.html` 打开 —— 此时 `file://` 协议读不到 mock JSON，站点会自动降级为**内置静态兜底数据**，页面依然完整可用（不会白屏）。

## 页面结构

| 页面 | 说明 |
| --- | --- |
| `index.html` | **首屏 = 读书月介绍页**（活动主题、倒计时、数据统计、下滑引导），下滑进入**主界面 = 读书感受信息流** |
| `detail.html` | 感受详情页，内容同样来自 API |
| `author.html` | 作者主页：资料卡 + TA 的全部书评与评论 |

## 功能清单

- **介绍页**：手绘翻书插画（书页轻翻、墨线生长）、日轮与远山、纸面颗粒、canvas 飘浮墨点、书写式标题（逐行墨迹展开）、朱砂竖排小印、毛笔弧线、日历卡倒计时、便签式数据、下滑引导、吸顶导航
- **滚动视差**：首屏随滚动分层移动并渐隐，信息流以「压在上面的一页」圆角+阴影叠入
- **信息流**：封面图（做旧相纸滤镜）、标题、简介、邮戳时间、评论数、点赞数；卡片带轻微纸片倾斜与顶部齿孔，可点击进详情
- **评论也进流**：每 4 篇书评穿插 1 条评论，做成与书评截然不同的「引文条」——引号包住的评论正文 + 原书评缩略图 + 跳转链接（直达该书的留言区），桌面端横跨整行形成小板块
- **作者主页**：信息流与详情页的头像/昵称都可点，进入 `author.html?id=u01`，看这位同学的全部书评与评论、获赞统计与常用标签
- **无限滚动**：底部哨兵 + IntersectionObserver，接近底部自动加载下一页（共 120 条 / 15 页：96 篇书评 + 24 条评论）
- **搜索**：关键词实时搜索（320ms 防抖），命中标题 / 简介 / 作者 / 分类 / 标签，荧光笔式高亮
- **筛选**：11 个分类 + 8 个标签，可点击切换，也可点击已选标签取消
- **排序**：刚出炉 / 最多共鸣（按点赞）/ 聊得热闹（按评论）
- **筛选摘要**：当前条件 + 已显示条数 + 一键重置
- **详情页**：宋体书页正文 + 首字下沉 + 中文首行缩进、引文块、书腰卡、便签留言墙（胶带 + 随机纸色 + 逐张浮现）、阅读进度条、封面随滚动推近（`animation-timeline` 渐进增强）、相关阅读、点赞收藏、分享
- **夜读模式**：日间「米纸」/ 夜间「暖黑」两套配色，切换即记忆；`<head>` 内联脚本提前应用，刷新不闪白
- **书卷细节**：页眉题记、标题下随滚动画出的手绘横线、印章「按下」落款动画
- **提交投稿**：右下角悬浮按钮，跳转 `https://www.baidu.com`（可在 `js/config.js` 的 `SUBMIT_URL` 修改）
- 移动端适配：`viewport-fit=cover`、`100svh`、安全区 `env()`、输入框 16px（避免 iOS 聚焦放大）、触摸友好的点击区域、`prefers-reduced-motion` 降级
- 无障碍：正文对比度 ≥ 4.5:1、语义化标签、`aria-*` 状态、图片 `alt`

## 目录

```
reading-month/
├── index.html                首页：介绍页 + 信息流
├── detail.html               详情页
├── css/style.css             全部样式（设计变量 / 卡片 / 详情 / FAB / 响应式）
├── js/
│   ├── config.js             全局配置：数据源、分页大小、投稿地址、活动周期
│   ├── api.js                数据层：mock / remote 双通道 + 查询（搜索/筛选/排序）+ 兜底
│   ├── ui.js                 模板层：卡片 / 骨架屏 / 详情页 / 空态插画 / 关键词高亮
│   ├── effects.js            视效层：墨点画布 / 视差 / 封面显影 / 阅读进度
│   ├── theme.js              夜读模式：主题切换与偏好记忆
│   ├── app.js                首页逻辑：倒计时、滚动引导、无限流、搜索筛选
│   └── detail.js             详情逻辑：按 id 拉取、点赞收藏评论分享
├── tools/
│   ├── smoke.mjs             数据/模板冒烟测试（node tools/smoke.mjs，零依赖）
│   └── dom-test.mjs          真实 DOM 端到端测试（需 npm i -D jsdom）
├── mock/
│   ├── gen-mock.mjs          数据生成脚本（node mock/gen-mock.mjs）
│   └── api/
│       ├── posts/page-1..12.json   信息流分页接口
│       └── detail/post-001..096.json  详情接口
└── README.md
```

## 接入真实第三方 API

当前为本地测试模式（`SOURCE: 'mock'`），读取 `mock/api/**`。接真实接口只改 `js/config.js`：

```js
SOURCE: 'remote',
REMOTE: {
  feed:   'https://api.example.com/v1/reading/posts?page={page}&size={size}&cat={cat}&q={q}&tag={tag}&sort={sort}',
  detail: 'https://api.example.com/v1/reading/posts/{id}',
  like:   'https://api.example.com/v1/reading/posts/{id}/like',   // 可选
  comment:'https://api.example.com/v1/reading/posts/{id}/comments', // 可选
  headers: { Accept: 'application/json' },
  timeout: 8000,
}
```

数据层会自动做字段归一化，兼容常见的字段命名差异（`list/posts/items`、`likes/like_count`、`author/username`、`content/body` 等）。即使第三方接口不支持搜索或排序，前端也会在本地兜一层过滤，保证交互始终有效。

若远程接口失败，会自动回退到本地 mock；再失败则用内置兜底数据，页面不会白屏。

## 数据字段

信息流列表项：

```json
{
  "id": "post-001",
  "title": "《活着》读后感：把日子过成一条河",
  "cover": "https://...jpg",
  "excerpt": "熬夜读到第三章，窗外天都亮了…",
  "author": { "name": "青柠不加冰", "avatar": "...", "college": "文学院" },
  "time": "2026-04-23 21:00",
  "timestamp": 1776950400000,
  "likes": 391,
  "commentCount": 7,
  "views": 3421,
  "liked": false,
  "category": "文学",
  "tags": ["深夜读书", "一周一书"],
  "comments": [{ "user": "…", "content": "…", "time": "…", "likes": 12 }]
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

详情接口额外返回 `contentHtml`、`book`、`comments`、`related`；作者接口返回 `name / avatar / college / bio / stats{posts,comments,likes,views} / tags`。

## 本地测试

```bash
node tools/smoke.mjs                      # 51 项断言（零依赖）：分页/混排/分类/搜索/排序/作者/模板/XSS/兜底
npm i -D jsdom && node tools/dom-test.mjs # 40 项断言：真实 DOM 下的渲染、显影、评论卡、倒计时、筛选、排序、搜索、空态、夜读切换、点赞、详情、发评论、作者页
node mock/gen-mock.mjs                    # 重新生成 mock 数据（时间戳严格递减，保证分页稳定）
```

## 本地测试记录

- `mock/api` 共 15 页 × 8 条 = 120 条信息流（96 篇书评 + 24 条评论）+ 96 份书评详情 + 20 份作者主页，全部为内联 SVG 封面（无外链、无版权风险）
- 已验证：分页无重复、混排按时间倒序、每条评论都指向有效书评、11 个分类逐页翻到底条数一致、标签筛选无越界、点赞 / 评论排序正确、关键词搜索结果相关、无结果返回空态、关键词高亮且防 XSS、详情模板 id/class 契约完整
- jsdom 端到端：首页卡片渲染、封面显影类清除、倒计时、分类/标签、排序、搜索收窄与高亮、空态插画、夜读模式切换与记忆、点赞计数、详情页标题/正文/评论/阅读进度/发评论，均通过
- 夜读配色对比度：正文 15.2:1、次级文字 5.2:1、朱砂文字 5.7:1、红底奶油字 4.6:1，均达 AA
- 字体：优先 `Noto Serif SC`（Google Fonts，失败自动回落到系统宋体），无外链图片，封面均为内联 SVG

## 修改投稿地址

`js/config.js` → `SUBMIT_URL`。默认演示为百度。
