# 📖 2026 校园读书月 · 阅见世界

移动端优先的**纯静态**读书月宣传 + 读书感受信息流网站。无需后端、无需构建，直接把整个目录丢到任意静态服务器（或 CDN / OSS）即可上线。

视觉风格为「**纸墨 · 书房**」：米纸底、松烟墨字、朱砂印章、青瓷绿点缀；宋体标题、日历卡倒计时、便签纸条、邮戳时间、书签丝带投稿按钮 —— 有书卷气，不做霓虹科技感。

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

## 功能清单

- **介绍页**：手绘翻书插画（书页轻翻、墨线生长）、日轮与远山、纸面颗粒、朱砂竖排小印、毛笔弧线、日历卡倒计时、便签式数据、下滑引导、吸顶导航
- **信息流**：封面图（做旧相纸滤镜）、标题、简介、邮戳时间、评论数、点赞数；卡片带轻微纸片倾斜与顶部齿孔，可点击进详情
- **无限滚动**：底部哨兵 + IntersectionObserver，接近底部自动加载下一页（共 96 篇 / 12 页）
- **搜索**：关键词实时搜索（350ms 防抖），命中标题 / 简介 / 作者 / 分类 / 标签，关键词高亮
- **筛选**：11 个分类 + 8 个标签，可点击切换，也可点击已选标签取消
- **排序**：刚出炉 / 最多共鸣（按点赞）/ 聊得热闹（按评论）
- **筛选摘要**：当前条件 + 已显示条数 + 一键重置
- **详情页**：宋体书页正文 + 首字下沉、引文块、书腰卡、便签留言墙（带胶带与随机纸色）、相关阅读、点赞收藏、分享
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
│   ├── ui.js                 模板层：卡片 / 骨架屏 / 详情页模板 / 关键词高亮
│   ├── app.js                首页逻辑：倒计时、滚动引导、无限流、搜索筛选
│   └── detail.js             详情逻辑：按 id 拉取、点赞收藏评论分享
├── tools/
│   └── smoke.mjs             无浏览器冒烟测试（node tools/smoke.mjs）
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

详情接口额外返回 `contentHtml`、`book`、`comments`、`related`。

## 本地测试

```bash
node tools/smoke.mjs      # 38 项断言：分页/分类/搜索/排序/模板契约/XSS/兜底
node mock/gen-mock.mjs    # 重新生成 mock 数据（时间戳严格递减，保证分页稳定）
```

## 本地测试记录

- `mock/api` 共 12 页 × 8 条 = 96 条内容 + 96 份详情，全部为内联 SVG 封面（无外链、无版权风险）
- 已验证：分页无重复（时间戳单调，首屏与翻页同口径排序）、11 个分类逐页翻到底条数一致、标签筛选无越界、点赞 / 评论排序正确、关键词搜索结果相关、无结果返回空态、关键词高亮且防 XSS、详情模板 id/class 契约完整
- 字体：优先 `Noto Serif SC`（Google Fonts，失败自动回落到系统宋体），无外链图片，封面均为内联 SVG

## 修改投稿地址

`js/config.js` → `SUBMIT_URL`。默认演示为百度。
