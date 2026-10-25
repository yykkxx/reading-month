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
- **投放**：https://yykkxx.github.io/reading-month/ （GitHub Pages，`main` 分支根目录）

---

## 2. 硬性要求（改代码前先确认没违反）

1. **保持纯静态**
   - 不加构建工具、不加运行时框架、不引 npm 运行时依赖
   - `jsdom` 只允许作为测试用的 devDependency（`node_modules/` 已 gitignore）

2. **字体必须自托管**
   - 只使用 `fonts/` 下的 woff：Noto Serif SC **400 / 700 / 900** + Noto Sans SC **400**
   - 通过 `css/style.css` 的 `@font-face` 引用，**禁止 Google Fonts、gstatic、任何外部字体 CDN**
   - 三页最多 2 条字体 preload，且必须是正文会用到的 **Regular 400 + Bold 700**；不要 preload Black
   - 字重必须成套：只放 700/900 会让 400 正文被合成粗体 / 回退系统字体，这是明确踩过的坑（见第 5 节）

3. **不引外部图片**
   - 封面、头像、插画全部是**内联 SVG data URI**（`mock/gen-mock.mjs` 生成）
   - 唯一位图是 `assets/og-cover.png`（1200×630 分享封面）
   - 外链图片 / 图床一律禁止

4. **文本必须转义**
   - 所有插进 HTML 的用户内容走 `UI.esc()` / `UI.hl()`，禁止直接拼接原始字符串
   - 关键词高亮是先转义再包 `<mark>`，不要反过来

5. **数据层不能被绕过**
   - 页面里不允许写死信息流数据；一律 `API.getFeed / getDetail / getUser / getUserPosts`
   - 新增接口时，mock 与 remote 两条路径都要实现，并保持返回结构一致
   - `API.getAll()` 只用于统计等只读兜底；首屏统计不要为了 3 个数字触发 15 页预取

6. **移动端优先**
   - 默认样式按 360–430px 写；桌面增强一律放在 `@media (min-width: …)` 里
   - 输入框字号不得小于 16px（否则 iOS 聚焦会放大页面）
   - 使用 `env(safe-area-inset-*)`、`100svh`

7. **动效可关闭**
   - 所有动画 / 视差 / 画布必须尊重 `prefers-reduced-motion: reduce`
   - 画布在不可见或页面隐藏时要暂停（`effects.js` 已有实现，复用它）

8. **夜读模式必须覆盖新组件**
   - 主题变量在 `html[data-theme="night"]` 下重定义
   - 任何**硬编码的浅色**（`#fffdf6`、`rgba(247,242,231,…)` 等）都要补一条夜读覆盖，否则夜里会出现刺眼白块
   - 新增页面要带 `theme.js` 和左下角 `.theme-toggle`

9. **用户可见的 class 要语义化**
   - 结构 / 组件 class 用 `block__element` 命名；状态 class 用 `is-*`，且必须同时有 CSS 与 JS 双向对应
   - 禁止 `dev-*`、`dev-pending`、`is-loading` 这类没有真实语义、只开发期存在的临时 class 留在用户可见 DOM
   - 不要用“只有评审能看到”的隐藏 class 或元素；隐藏只允许用于真实的交互状态（`hidden`、`aria-hidden`、动画初始态）

10. **localStorage 键名固定，改动要同步文档**
    | 键 | 用途 | 写入位置 |
    | --- | --- | --- |
    | `rm-theme` | `day` / `night` | `js/theme.js` |
    | `rm_liked_ids` | 已点赞书评 id 数组 | `js/ui.js`、`js/detail.js` |
    | `rm_star_ids` | 已收藏书评 id 数组 | `js/detail.js` |
    | `rm_cmt_liked` | 已点赞留言 id 数组 | `js/detail.js` |
    | `rm_cmts` | 本机发布的留言（最多 50 条） | `js/detail.js` |
    | `rm_submissions` | 本机投稿（最多 30 条） | `js/submit.js` |

11. **投稿只做本机闭环，禁止伪造后端成功**
    - 表单在 `#submitForm`：昵称 / 书名 / 分类 / 正文（300–2000 字），实时字数
    - 编号格式 `RM-YYYYMMDD-NNN`，只写 `rm_submissions`，成功文案必须说明「已保存在本机」
    - 唯一真实出口是「用邮件发送」的 `mailto:`；不得写「已提交给编辑部」「一周内查看」等承诺
    - 「我的投稿」在 `#sfMineList` 独立成列，不进入信息流、不参与筛选 / 空态 / 筛选摘要
    - 投稿卡不伪造统计：点赞 / 评论 / 浏览为 0，标「本机保存」，整卡不跳转

12. **不提交敏感信息**
    - 不提交 token、`node_modules`、`*.bundle`、测试产生的临时文件
    - 改了 `css/js` 记得把 HTML 里的 `?v=` 版本号一起改（当前 `20261026t`，防缓存）

13. **文档跟代码同一次提交**
    - 改了功能、数据契约、测试数量、字体 / 存储键，必须同步 `README.md`、`plan.md`、本文件
    - 文档里不写已不存在的实现或占位投稿地址

---

## 3. 目录与职责

```
reading-month/
├── index.html          介绍页（首屏）+ 感受墙 + 活动规则 / 投稿表单
├── detail.html         书评详情（正文/评论/相关阅读）
├── author.html         作者主页（资料卡 + TA 的书评与评论）
├── robots.txt          抓取规则
├── sitemap.xml         站点地图
├── css/style.css       全部样式（变量 → 组件 → 响应式 → 夜读）
├── fonts/              自托管字体：serif 400/700/900 + sans 400
├── assets/og-cover.png 1200×630 分享封面
├── js/
│   ├── config.js       数据源开关、分页大小、站内投稿入口、活动周期
│   ├── api.js          数据层：mock/remote 双通道 + 归一化 + 查询 + 兜底
│   ├── ui.js           模板层：书评卡 / 评论卡 / 详情 / 作者卡 / 空态
│   ├── effects.js      视效层：墨点画布 / 视差 / 封面显影 / 阅读进度
│   ├── theme.js        夜读模式与偏好记忆（localStorage: rm-theme）
│   ├── app.js          首页：倒计时、滚动 UI、信息流控制器、筛选、首屏统计
│   ├── detail.js       详情页交互
│   ├── author.js       作者页交互（含分页补页）
│   └── submit.js       站内投稿表单（校验 / 编号 / 本机存储 / mailto）
├── mock/
│   ├── gen-mock.mjs    数据生成脚本（改数据结构先改这里）
│   └── api/            page-1..15 / totals.json / detail / users
└── tools/
    ├── smoke.mjs       零依赖断言（node tools/smoke.mjs）
    └── dom-test.mjs    jsdom 端到端（node tools/dom-test.mjs）
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
    "totals": { "posts": 96, "comments": 24, "authors": 20 },
    "list": [ /* 书评 或 评论 */ ]
  }
}
```

- `totals` **只在 page-1** 下发，由生成器从真实数据计算（`posts` / `comments` / `authors`）
- `mock/api/totals.json` 是同一份汇总的独立小文件，首屏统计读它；不要为了统计重复请求 page-1，更不要触发 `API.getAll()` 的 15 页预取
- 所有 `page-N.json` 拼起来后，按 page 数字序**时间戳严格递减且唯一**
- 每篇书评的 `commentCount === comments.length`（生成器自检，模板也以此展示）

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
`getFeed(page, query) / getDetail(id) / getUser(id) / getUserPosts(id, page) / getAll() / facets() / reportLike / reportComment / fallbackList / fmtTime`

`query` 形如 `{ cat, q, tag, sort }`，`sort ∈ new | hot | comments`。

---

## 5. 踩过的坑（改之前先看，别再踩）

| 现象 | 原因 | 正确做法 |
| --- | --- | --- |
| `hidden` 元素仍然显示 | 组件自身 `display:flex/grid` 覆盖了 UA 的 `[hidden]{display:none}` | 基础样式必须有 `[hidden]{display:none!important}`；不要在每个组件里重复写 `[hidden]` 补丁 |
| 正文 400 字重发粗 / 字形回退系统字体 | 只自托管 700/900，400 用 `local()` 假声明兜底 | 字重必须成套：400/700/900 + sans 400；preload Regular + Bold |
| 首屏统计 2–3 秒才出数 | `initStats` 等 `API.getAll()` 的 15 页预取 | 读 page-1 / `totals.json` 的汇总，拿不到才退回 `getAll()` |
| 无限滚动出现重复卡片 | mock 时间戳不单调，首屏直读与缓存分页边界错位 | 生成器用**递减游标**保证时间严格递减；首屏与全量用同一 `timestamp` 排序 |
| 短页面不自动补页、状态卡在「正在翻页」 | `autoFill()` 在 `finally` 之前调用，`loading` 还是 `true` | 补页必须放在 `finally` **之后**（`app.js`、`author.js` 都有这个点） |
| 作者页只显示第一页，评论「不见了」 | `IntersectionObserver` 首次已相交，之后不再触发 | 每次加载完主动检测哨兵位置并补页 |
| 桌面端封面塌陷 | `.card__media` 是 `<span>`，不是块级 | CSS 里必须有 `display: block` |
| 封面一直不显影 | `img.is-cover-loading` 的 `opacity/filter` 被 `.card__media img` 覆盖 | 选择器写成 `img.is-cover-loading`（同优先级、后出现）；加载完成后由 `developImages` 移除 class |
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
node mock/gen-mock.mjs             # 重新生成 mock 数据（时间戳会变，之后务必重跑测试）
```

改完必须跑：`node tools/smoke.mjs` + `node tools/dom-test.mjs`，**全绿才算完成**。

> 测试里的断言数字（120 条 / 96 篇 / 24 条 / 51 项 / 46 项）来自当前数据量；如果改了生成器，先同步断言再提交，不允许为了过测试删断言。

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

**方式 B：`github.com` 不通时走 Git Data API（仓库已内置脚本）**

```bash
TOKEN='<你的 token>' node tools/push-api.mjs yykkxx reading-month main
```

脚本会：读取远端 tree → 用 `git ls-files -s` 的 blob sha 与远端逐个比对 → 只上传变化的文件 → 建 commit → 更新 `refs/heads/main`。

要点：

- **不依赖本地存在远端 commit 对象**（`github.com` 不通时拿不到），所以按 blob 内容比对，而不是 `git diff`
- GitHub 会把提交身份改写成 `noreply` 账号、时间转 UTC，**远端 commit SHA 与本地可能不同**，但 tree 内容完全一致
- 因此如果之后 `github.com` 恢复，**不要直接 `git push`**（会被判为非快进）。先：

```bash
git fetch origin
git reset --hard origin/main      # 内容与本地一致，只是提交号不同
```

- 推送后同样要检查线上内容（见 7.3）

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

- 抽查页面与数据：`/`、`/author.html?id=u08`、`/mock/api/posts/page-1.json`、`/mock/api/totals.json`

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
- [ ] 投稿表单：必填 / 字数 / 编号 / 刷新回显 / 清空 / mailto；「我的投稿」不影响信息流筛选
- [ ] 首屏统计 800ms 内出数，且 `page-*.json` 在 1.2s 内只请求 1 次
- [ ] 控制台无报错；`tools/smoke.mjs`、`tools/dom-test.mjs` 全绿
- [ ] 资源版本号已更新，三页一致

---

## 9. 不要做的事

- ❌ 引入 React/Vue/Tailwind/构建链——这是纯静态站点
- ❌ 直接把数据写进 HTML/JS 常量绕过 `api.js`
- ❌ 用外链图片、图床或外部字体 CDN
- ❌ 只子集部分字重 / 用 `local()` 假声明冒充自托管
- ❌ 把浅色写死在组件里而不给夜读覆盖
- ❌ 为了 3 个统计数字预取 15 页，或让首屏统计等全量预取
- ❌ 把本机投稿 / 评论写成已送达后端
- ❌ 用 `dev-*` / `is-loading` 之类临时 class 或隐藏文案讨好评审
- ❌ 在 `github.com` 不通时硬等；换 API 方式
- ❌ 提交 token、`node_modules`、`.bundle`
- ❌ 改完只跑 `node --check` 就当完事——必须跑两个测试套件
