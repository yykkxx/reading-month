# agent.md — 接手这个项目前先读这里

> **第一步：读 `plan.md`**（当前进度、已完成模块、下一步规划、技术债）
> **第二步：读 `README.md`**（功能清单、数据接入、目录说明）
> 本文件只讲**硬性要求、容易踩的坑、提交与发布流程**。

---

## 1. 这个项目是什么

2026 校园读书月的宣传 + 读书感受信息流网站。

- **纯静态**：没有构建步骤、没有后端、没有运行时依赖，`index.html` 直接用浏览器打开也不用打包
- **移动端优先**：先保证 360px 宽，再逐步叠加 760 / 1100 / 1360 断点
- **桌面端多列**：≥760px 信息流双列，≥1360px 三列，评论卡横跨整行
- **视觉风格**：纸墨 · 书房（米纸底、宋体、朱砂印章、便签、邮戳、书签丝带），**不要做成霓虹科技感**
- **数据层**：所有内容走 `js/api.js`，当前是本地 mock（`mock/api/**`），可一键切到远程 API
- **线上**：https://yykkxx.github.io/reading-month/ （GitHub Pages，`main` 分支根目录）

---

## 2. 硬性要求（改代码前先确认没违反）

1. **保持纯静态**
   - 不加构建工具、不加运行时框架、不引 npm 运行时依赖
   - `jsdom` 只允许作为测试用的 devDependency（已在 `.gitignore` 里忽略 `node_modules/`）

2. **不引外部图片**
   - 封面、头像、插画全部是**内联 SVG data URI**（`mock/gen-mock.mjs` 生成）
   - 唯一的外链是 Google Fonts，且必须保持**非阻塞加载**（`preload + onload`），不能用会阻塞首屏的 `<link rel="stylesheet">`

3. **文本必须转义**
   - 所有插进 HTML 的用户内容走 `UI.esc()` / `UI.hl()`，禁止直接拼接原始字符串
   - 关键词高亮是先转义再包 `<mark>`，不要反过来

4. **数据层不能被绕过**
   - 页面里不允许写死信息流数据；一律 `API.getFeed / getDetail / getUser / getUserPosts`
   - 新增接口时，mock 与 remote 两条路径都要实现，并保持返回结构一致

5. **移动端优先**
   - 默认样式按 360–430px 写；桌面增强一律放在 `@media (min-width: …)` 里
   - 输入框字号不得小于 16px（否则 iOS 聚焦会放大页面）
   - 使用 `env(safe-area-inset-*)`、`100svh`

6. **动效可关闭**
   - 所有动画/视差/画布必须尊重 `prefers-reduced-motion: reduce`
   - 画布在不可见或页面隐藏时要暂停（`effects.js` 已有实现，复用它）

7. **夜读模式必须覆盖新组件**
   - 主题变量在 `html[data-theme="night"]` 下重定义
   - 任何**硬编码的浅色**（`#fffdf6`、`rgba(247,242,231,…)` 等）都要补一条夜读覆盖，否则夜里会出现刺眼白块
   - 新增页面要带 `theme.js` 和左下角 `.theme-toggle`

8. **不提交敏感信息**
   - 不提交 token、`node_modules`、`*.bundle`、测试产生的临时文件
   - 改了 `css/js` 记得把 HTML 里的 `?v=` 版本号一起改（防缓存）

---

## 3. 目录与职责

```
reading-month/
├── index.html          介绍页（首屏）+ 感受墙（信息流/搜索/筛选）
├── detail.html         书评详情（正文/评论/相关阅读）
├── author.html         作者主页（资料卡 + TA 的书评与评论）
├── css/style.css       全部样式（变量 → 组件 → 响应式 → 夜读覆盖）
├── js/
│   ├── config.js       数据源开关、分页大小、投稿地址、活动周期
│   ├── api.js          数据层：mock/remote 双通道 + 归一化 + 查询 + 兜底
│   ├── ui.js           模板层：书评卡 / 评论卡 / 详情 / 作者卡 / 空态
│   ├── effects.js      视效层：墨点画布 / 视差 / 封面显影 / 阅读进度
│   ├── theme.js        夜读模式与偏好记忆（localStorage: rm-theme）
│   ├── app.js          首页：倒计时、滚动 UI、信息流控制器、筛选
│   ├── detail.js       详情页交互
│   └── author.js       作者页交互（含分页补页）
├── mock/
│   ├── gen-mock.mjs    数据生成脚本（改数据结构先改这里）
│   └── api/            分页 / 详情 / 用户 / comments.json / index.json
└── tools/
    ├── smoke.mjs       零依赖断言（node tools/smoke.mjs）
    └── dom-test.mjs    jsdom 端到端（npm i -D jsdom）
```

---

## 4. 数据契约

信息流是**混合流**：书评（`type` 缺省）+ 评论（`type: "comment"`），按 `timestamp` 倒序分页。

分页文件 `mock/api/posts/page-N.json`：

```json
{
  "code": 0,
  "data": {
    "page": 1, "pageSize": 8, "total": 120, "hasMore": true,
    "list": [ /* 书评 或 评论 */ ]
  }
}
```

**书评**关键字段：`id / title / cover / excerpt / author{id,name,avatar,college} / time / timestamp / likes / commentCount / views / category / tags[] / comments[]`

**评论**关键字段：

```json
{
  "type": "comment",
  "id": "cf-001",
  "content": "评论正文",
  "author": { "id": "u08", "name": "一只热爱排版的猫", "college": "法学院" },
  "time": "2026-04-23 20:41",
  "timestamp": 1776948060000,
  "likes": 42,
  "category": "文学",
  "target": { "id": "post-001", "title": "…", "cover": "data:image/svg+xml,…" }
}
```

**作者** `mock/api/users/{id}.json`：`id / name / avatar / college / joined / bio / stats{posts,comments,likes,views} / tags[]`

对外 API（`js/api.js` 挂到 `window.API`）：
`getFeed(page, query) / getDetail(id) / getUser(id) / getUserPosts(id, page) / facets() / reportLike / reportComment / fallbackList`

`query` 形如 `{ cat, q, tag, sort }`，`sort ∈ new | hot | comments`。

---

## 5. 踩过的坑（改之前先看，别再踩）

| 现象 | 原因 | 正确做法 |
| --- | --- | --- |
| 无限滚动出现重复卡片 | mock 时间戳不单调，首屏直读与缓存分页边界错位 | 生成器用**递增/递减游标**保证时间严格递减；首屏快速路径也要按 `timestamp` 排序 |
| 短页面不自动补页、状态卡在「正在翻页」 | `autoFill()` 在 `finally` 之前调用，`loading` 还是 `true` | 补页必须放在 `finally` **之后**（`app.js`、`author.js` 都有这个点） |
| 作者页只显示第一页，评论「不见了」 | `IntersectionObserver` 首次已相交，之后不再触发 | 每次加载完主动检测哨兵位置并补页 |
| 桌面端封面塌陷 | `.card__media` 是 `<span>`，不是块级 | CSS 里必须有 `display: block` |
| 封面模糊/褪色一直不恢复 | `.dev-pending` 被 `.card__media img` 的 `filter` 覆盖 | 选择器写成 `img.dev-pending`（同优先级、后出现） |
| 评论卡在网格里错位 | 评论卡需要整行 | `@media (min-width:760px) { .card--comment { grid-column: 1/-1 } }` |
| 改完样式没生效 | 浏览器缓存旧 JS/CSS | HTML 引用的 `?v=` 版本号一起改 |
| 刷新时先白后黑 | 主题在 JS 里才应用 | `<head>` 内联脚本先读 `localStorage` 设置 `data-theme` |
| 详情页 `#comments` 不定位 | 内容异步渲染，锚点已错过 | 渲染完成后 `scrollIntoView()` 二次定位 |
| iOS 输入框一聚焦就放大 | 字号 <16px | 输入框统一 `font-size: 16px` |
| 本地测试命令把自己杀了 | `pkill -f "http.server 4173"` 会匹配到同一条命令里的启动语句 | 用 `ps` 找 PID 再 `kill`，或分两次执行 |

---

## 6. 本地运行与测试

```bash
cd /data/dsh/cosmo/reading-month
python3 -m http.server 4173        # 打开 http://127.0.0.1:4173/index.html

node tools/smoke.mjs               # 51 项，零依赖：分页/混排/搜索/排序/作者/模板/XSS/兜底
npm i -D jsdom                     # 只装一次（node_modules 已 gitignore）
node tools/dom-test.mjs            # 46 项：真实 DOM 下的渲染、筛选、搜索、夜读、点赞、详情、作者页
node mock/gen-mock.mjs             # 重新生成 mock 数据（会改变时间戳，之后务必重跑测试）
```

改完必须跑：`node tools/smoke.mjs` + `node tools/dom-test.mjs`，**全绿才算完成**。

> 测试里的断言的数字（120 条 / 24 条评论 / 51 项等）来自当前数据量；如果改了生成器，记得同步更新断言。

---

## 7. 提交与发布（务必按这个流程）

### 7.1 提交

```bash
cd /data/dsh/cosmo/reading-month
git status                     # 确认没有 node_modules / token / 临时文件
git add -A
git commit -m "feat: 一句话说明

- 做了什么
- 为什么这么做
- 测试：smoke 51 + dom 46 全过"
```

提交信息用 `feat / fix / style / refactor / docs / test` 前缀，正文写清「改了什么、为什么、怎么验证」。

### 7.2 推送

`github.com:443` 在部分网络下会超时，`api.github.com` 通常可用。按下面顺序尝试：

**方式 A：临时 remote（推荐，token 不在仓库里留痕）**

```bash
TOK='<你的 token>'
git remote add auth "https://x-access-token:${TOK}@github.com/yykkxx/reading-month.git"
git push auth main
git remote remove auth           # 推完立刻删
grep -rn "ghp_" .git/config || echo "无残留"
```

**方式 B：`github.com` 不通时走 Git Data API**

用 API 创建 blob → tree → commit → 更新 `refs/heads/main`（单条 commit 快进）。脚本思路见 `plan.md` 的「关键决策」，核心是用 `api.github.com`，token 只放环境变量，不落盘。

### 7.3 发布验证（不能只看 200）

- GitHub Pages 需要约 30–90 秒重建
- 轮询**线上文件内容**而不是状态码，例如：

```bash
for i in $(seq 1 10); do
  sleep 12
  n=$(curl -sS "https://yykkxx.github.io/reading-month/js/author.js?cb=$RANDOM" | grep -c "autoFill")
  [ "$n" -ge 1 ] && break
done
```

- 抽查页面与数据：`/`、`/author.html?id=u08`、`/mock/api/posts/page-1.json`

### 7.4 Token 安全

- token 只出现在命令的环境变量里，**绝不写进文件、提交、日志**
- 用完提醒用户吊销；推送后检查 `.git/config`、仓库文件、`git log` 无 `ghp_` 残留

---

## 8. 每次改动后的验收清单

- [ ] 360px 宽（小屏）无横向滚动、无重叠
- [ ] 390px / 760px / 1440px 三档布局正常（信息流列数、评论卡整行）
- [ ] 日间 / 夜读两套主题都检查（重点是新增的硬编码颜色）
- [ ] 搜索、分类、标签、排序、无限滚动、回顶
- [ ] 书评卡 → 详情；评论卡 → 详情 `#comments`；头像/昵称 → 作者页
- [ ] 作者页：书评 + 评论都在，超过 8 条能继续加载
- [ ] 控制台无报错；`tools/smoke.mjs`、`tools/dom-test.mjs` 全绿
- [ ] 资源版本号已更新

---

## 9. 不要做的事

- ❌ 引入 React/Vue/Tailwind/构建链——这是纯静态站点
- ❌ 直接把数据写进 HTML/JS 常量绕过 `api.js`
- ❌ 用外链图片或图床
- ❌ 把浅色写死在组件里而不给夜读覆盖
- ❌ 在 `github.com` 不通时硬等；换 API 方式
- ❌ 提交 token、`node_modules`、`.bundle`
- ❌ 改完只跑 `node --check` 就当完事——必须跑两个测试套件
