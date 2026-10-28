# LOOP_STATE.md — 自主迭代循环状态

> 本文件是本项目「自主改进循环」的唯一状态源。**重启后第一件事**：读本文件末尾的「当前状态」，再读 `plan.md` / `agent.md`。
> 项目：2026 校园读书月 · 阅读信息流（纯静态，`main` 分支 → GitHub Pages）
> 循环控制器：Lead agent；生成与评价均由独立上下文子代理完成，Lead 不自评。

---

## 1. 循环规则（固定，不随轮次改变）

1. 每轮**只验证一个假设**：由上一轮评价暴露的问题中挑**一条**，写清「改什么 / 预期哪项分数上升」。
2. 生成子代理在**独立上下文**里改代码，改动有边界（单轮 ≤ 6 个文件、≤ 400 行 diff；不动测试断言来「通过」）。
3. Lead 自检：`node tools/smoke.mjs` + `node tools/dom-test.mjs` 必须全绿 → 再跑 `tooling/audit.mjs` 采集客观事实。不通过 → 回滚 + 记录失败，不重试死路。
4. 通过后：提交（普通 fast-forward 追加提交）+ 推送到 `main`（不 force、不 reset 远端、不改写历史）。
5. **独立评价子代理**：只给它「评价当前站点实际呈现给用户的效果」的任务 + 评分标准；**不给**生成者代码、解释、我的思考。它自行选择截图/浏览器快照/可访问性树/DOM/HTML 语义等可靠方式；截图不可用时降级并标注。
6. 决策：`overall` 高于当前分 → 保留（更新状态）；不高于 → 回滚到本轮检查点（`git revert` + 推送），假设记为失败。
7. 连续 3 轮无提升 → 停下做一次**结构验收**：技术债、文件结构腐烂、是否存在为讨好评价者的作弊/隐藏内容。
8. 每轮结束更新本文件第 4 节表格。停止条件：`overall ≥ 88` 且结构验收无大问题，或达到最大轮数 18（R13 起按用户新要求顺延，见第 5 节）。

## 2. 评分标准（评价子代理使用，0–100 加权）

| 维度 | 权重 | 关注点 |
| --- | --- | --- |
| 设计质量 design | 20% | 视觉语言统一、层级与留白、排版细节、响应式断点表现、夜读模式 |
| 原创性 originality | 15% | 「纸墨·书房」母题是否真的贯穿、是否有模板感/套壳感、内容是否像真实校园活动 |
| 技术执行 technical | 20% | 语义化 HTML、数据层抽象、模板转义、控制台无错、CSS 结构、无死代码 |
| 功能性 function | 20% | 信息流/搜索/筛选/排序/无限滚动/详情/作者页/主题切换/交互反馈真实可用 |
| 性能·可访问性·SEO | 15% | 请求数与体积、阻塞资源、CLS、对比度、键盘可达、ARIA、meta/结构化数据 |
| 反 AI 默认痕迹 | 10% | 白底紫渐变、UI 库默认外观、卡片套卡片、纯黑文字、占位内容、无 hover/focus、假数据冒充真数据 |

`overall = 0.20*design + 0.15*originality + 0.20*technical + 0.20*function + 0.15*perf + 0.10*anti_ai`

**用户追加要求（从 R13 起再次强调）**：主要精力放在**视觉效果、动画与动效设计**上。

**用户追加要求（从 R12 起生效）**：评价重点放在**视觉效果、动画与动效设计、能否吸引读者产生阅读兴趣**。六维加权仍用于跨轮比较；评价子代理另须给出三个焦点子分 `visual_impact / motion_craft / reading_appeal`（不进入 overall），`next_instruction` 必须针对这三项中最弱的一环。

---

## 3. 环境与工具（客观事实采集）

> 环境已于 R13 迁移：workspace 在 `/root/workspaces/cosmo`，旧 `/data/dsh/cosmo` 路径作废；本机可跑真实无头 Chromium。

- 本地服务：`cd /root/workspaces/cosmo/reading-month && python3 -m http.server 4173`（已常驻）
- 真实浏览器：Chrome for Testing 156 arm64（`/root/ws-tools/chrome/chrome-headless-shell-linux-arm64/chrome-headless-shell`），经 `playwright-core` 驱动
- **渲染事实采集（主力）**：`node /root/ws-tools/render.mjs http://127.0.0.1:4173 <outDir>`
  16 场景（360/390/768/1440 × 日/夜 × 首页/信息流/详情/作者）截图 + `facts.json`（首屏可见文字、hero/卡片/首条书评矩形、横向溢出、计算样式、CSS 变量、标题大纲、图片 alt、小触点、纯黑文字、夜读白块、控制台错误、失败请求、reduced-motion）+ `summary.txt`
- 截图像素分析：`python3 /root/workspaces/cosmo/tooling/png-stats.py <outDir>`（配色占比、亮度、近白/近黑/纯黑、饱和度、紫色色相、硬边界、渐变行）
- 自写探针：在 `/root/ws-tools` 可直接 `import { chromium } from 'playwright-core'`，`executablePath` 指向上面的 chrome，参数 `--no-sandbox`
- 测试：`node tools/smoke.mjs`（51） / `node tools/dom-test.mjs`（46）
- 推送：`TOKEN=$(python3 -c "print(open('/root/workspaces/cosmo/githubtokens.txt').read().split('：',1)[1].strip())") node tools/push-api.mjs yykkxx reading-month main`（github.com 不通，只能走 API）
- 模型无视觉能力 → 评价走真实渲染的几何/计算样式/DOM/可访问性 + PNG 像素统计，属**降级评价**，必须标注。

## 4. 轮次记录

| 轮 | 假设（改什么→预期变好） | design | orig | tech | func | perf | antiAI | overall | 决策 | 一句话教训 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 基线（无改动） | 74 | 71 | 65 | 66 | 57 | 54 | 66 | 记录基线 | 站点有真实设计语言，但「假闭环 + 开发文案 + 隐形状态」拉低可信度 |
| 1 | 把百度占位投稿改成站内真实投稿信息区块，清除开发文案 → 预期 function/anti_ai 上升 | 74 | 70 | 67 | 71 | 62 | 60 | **68** | 保留（+2） | 假闭环一拆，可信度立刻回来；但内容重复与隐形状态仍是主要扣分项 |
| 2 | 让筛选/搜索/空态的可见性与 ARIA 状态跟真实状态一致（[hidden]、重置委托、清空输入、aria-pressed）→ 预期 technical/function/a11y 上升 | 74 | 70 | 68 | 74 | 63 | 59 | **69** | 保留（+1） | 状态机修好只换来 1 分，说明分数瓶颈已从「能不能用」转到「像不像真的」 |
| 3 | 内容真实性：96 篇文案/封面/头像去模板化 + related 排除自身 → 预期 originality/anti_ai 上升 | 76 | 78 | 71 | 68 | 62 | 66 | **71** | 保留（+2） | 内容一真，原创性 +8；但功能分因「数字口径不一致」掉了 6 分，下一轮必须先修计数闭环 |
| 4 | 互动计数由同一份 localStorage 状态驱动，并统一作者页篇数口径 → 预期 function/technical 上升 | 79 | 80 | 75 | 74 | 62 | 67 | **74** | 保留（+3） | 数字对上点击，function +6；下一轮攻键盘可达性与悬停反馈（a11y 长期 62） |
| 5 | 键盘可达性 + 悬停状态（顶栏/回顶 visibility、skip link、main、7 类 hover、夜读 related hover）→ 预期 perf_a11y/design 上升 | 79 | 80 | 77 | 75 | 65 | 68 | **75** | 保留（+1） | a11y +3，但 `.act:hover` 误伤了非交互的计数 span，下次补 hover 要区分交互与展示元素 |
| 6 | SEO/分享/页脚收口（canonical/OG/og:image/robots/sitemap/footer/noscript）→ 预期 perf_a11y_seo 与 design 上升 | 78 | 79 | 77 | 74 | 70 | 68 | 75（加权 74.95） | **回滚** | perf +5 是真的，但总分只打平且新增 canonical 与 sitemap 深链矛盾；单轮只做 SEO 换不来分数，后续要跟深链/结构化数据一起做 |
| 7 | 首屏不遮挡 + 活动届次/统计自洽 + 作者页栅格 + hover 收窄 + 评论卡分类 → 预期 design/anti_ai/function 上升 | 79 | 79 | 78 | 76 | 67 | 70 | **76** | 保留（+1，加权 +0.75） | 数字与布局自洽确实加分；但「首页滚到 2027、其余页仍 2026」的新回归说明活动口径要整站统一 |
| 8 | 站内投稿表单闭环（表单/校验/编号/localStorage/置顶卡/刷新回显）+ 整站届次统一 → 预期 function/anti_ai 上升 | 79 | 79 | 77 | 79 | 68 | 75 | **77** | 保留（+1） | 表单真实可用；但「已贴上感受墙，编辑小组会一周内查看」把本机存储说成收稿，假闭环从入口变成了承诺 |
| 9 | 字体自托管 + 空闲预取/去重 page-1 → 预期 perf_a11y_seo 上升 | 78 | 79 | 78 | 78 | 77 | 76 | **78** | 保留（+1，perf +9） | 首屏请求 89→26、字体 2.6MB→0.6MB 直接兑现 9 分；但只子集了 3 个字面，serif 400 变成假粗体 |
| 10 | 一致性收口（我的投稿隔离、诚实文案、评论数同源、96/120、错误页、alt、净化）→ 预期 technical/function/anti_ai 上升 | 78 | 79 | 80 | 80 | 78 | 80 | **79** | 保留（+1） | 数字与文案终于同源，technical/function/anti_ai 齐到 80；剩下的是 SEO/页脚、serif 400 与细节 |
| 11 | 站点收口（页脚、带 id 的 canonical/OG/JSON-LD、robots/sitemap、serif 400 真字面、CTA hover、资料卡宽度）→ 预期 perf_a11y_seo/design/anti_ai 上升 | 80 | 79 | 80 | 81 | 76 | 82 | **80** | 保留（+1） | 收口补齐后 design/anti_ai 到 80+；代价是字体 817KB 让 perf 掉 2 分，首屏统计仍要等全量预取 |
| 12 | 文档事实对齐 + 首屏统计改读 `totals.json` + serif 400 preload + 视口内计数器立即启动 → 预期 technical/perf 上升 | 81 | 81 | 79 | 82 | 75 | 81 | **80**（加权 79.9） | **回滚** | 定向修补换不来分：统计反而出现 18→96 跳变的新回归；真正的瓶颈是**首屏 100vh 海报里没有任何可读内容**（首条书评在 1437px），且 16 个 mock JSON/720KB 预取仍在 |
| 13 | 首屏从纯海报变成「海报 + 一条真实书评」：hero 收到 70/78svh，首屏加「今日一页」卡（数据走 API.getFeed(1)，取不到整块隐藏）→ 预期 reading_appeal/visual_impact 上升 | 84 | 86 | 82 | 83 | 74 | 87 | **83** | 保留（+3） | 首屏有钩子就能涨 3 分；但今日一页=信息流第一卡，下滑即重复；动效 49 个 running / 18 个无限循环成了新的最弱项（motion_craft 74） |
| 14 | 动效收敛：三处无限循环（CTA 扫光/下滑提示/FAB 摇摆）改为一次性或 hover，飞鸟 7→2、墨线 4→2、周期 7.5→14s，首批 8 卡 40ms 错峰入场 + 今日卡一次性进场 → 预期 motion_craft/perf 上升 | 82 | 78 | 82 | 84 | 76 | 80 | **81** | **回滚** | 「少动」不等于「更好」：动效数量降了（running 20→8、infinite 18→6），但 originality 86→78、anti_ai 87→80 反跌 —— 删掉飞鸟让右侧空了、视觉记忆点变少；同时暴露 heroPan 空转、关注假闭环、?v 不一致三个真问题 |

---

## 5. 当前状态

- 当前保留版本：R13（`b899fcb`，远端 `c10600c`；R14 已 revert，线上回到 R13 内容）
- 当前最高分：**83**（design 84 / originality 86 / technical 82 / function 83 / perf_a11y_seo 74 / anti_ai 87）
- 最新评价的焦点子分（R14 评价）：visual_impact 84 / reading_appeal 83 / **motion_craft 72（最弱）**
- 连续无提升轮数：1（R14 回滚）
- 已用轮数：14 / 18
- 决策口径：以加权总分（保留一位小数）为准；**提高 ≥0.5 才保留**，持平或更低即回滚；若评价引入 high 级新回归也回滚
- R14 评价确认的遗留问题（按严重度，供 R15+ 挑选）：
  1. [medium] 「关注」假闭环：toast 承诺「进你的信息流」，不落库、刷新回退（js/detail.js:173-181）
  2. [medium] 详情页 `.article__hero img` 的 heroPan 滚动驱动实测无效（0/150/300/500/800 五个位置 transform 恒 1.00636）
  3. [medium] 移动端小触点：评论赞/回复 23px、关注 36px、导航 38px、今日作者 23px（建议 ≥44px）
  4. [medium] detail/author 的 OG/description 靠 JS 写入，静态 head 是通用文案
  5. [low] 6 个 14s 无限 SVG 动画离屏后仍 running（canvas 有 IO 暂停，两套策略不一致）
  6. [low] `?v=` 跨页不一致（同 88KB CSS 两个缓存键）
  7. [low] 「今日一页」= 信息流第一卡 post-001，下滑即重复
  8. [low] 四款 CJK woff 835KB 占 1.08MB 的 77%
- **下一步（第 15 轮假设，针对最弱的 motion_craft 72，但方向是「让动效真实生效」而不是「减少动效」）**：
  - 修详情页 `heroPan`：`@supports (animation-timeline: view())` 里的 `.article__hero img` 用 `animation-range` 让封面随滚动真实推进（0/300/600 三个位置的 `transform` 必须互不相等，例如 scale 1.07→1.035→1.0），reduce 下恒 1.0
  - 6 个无限 SVG 动画（pageflip-l/r、inkflow×2、flywave×2）在 hero 不可见时暂停（复用已有的 IntersectionObserver 思路，或用 `animation-play-state` 由 JS 切），可见时恢复
  - 不改视觉语言、不删装饰、不动信息流与数据层；预期 motion_craft 与 perf_a11y_seo 上升，overall ≥83.5

## 6. 失败记录

- **R6（SEO/页脚）回滚**：加权 74.95 vs 当前 74.75，等于打平；新增「canonical 通用 URL 与 sitemap ?id= 深链矛盾」「详情夜间 theme-color 被覆写」两个问题。结论：SEO/页脚工作有效但不该单独成轮，后续与深链 canonical/结构化数据/性能一起做。
- **R14（动效收敛）回滚**：加权 80.55 vs 82.5，`overall` 83→81。动效数量确实降了（1s running 20→8、infinite 18→6、reduce 仍 0），但 originality 86→78、anti_ai 87→80、design 84→82 反跌：删掉固定飞鸟后桌面右侧空了一档、视觉记忆点变少，被评价者读成「为收敛而收敛」。教训：阅读站的动效要**减少噪音、增加意图**，不能只做减法；下一轮改成「修好本该生效的滚动驱动 + 离屏暂停」，保留装饰但让它们只在可见时跑。
- **R12（文档同步 + totals + preload + 计数器）回滚**：加权 79.9 vs 79.65，+0.25 未达 +0.5 门槛；并引入「首屏统计 18/5/4 → 96/24/20 跳变」的新回归。结论：在首屏结构性问题（海报占满一屏、读者看不到内容）没解决前，做统计口径 / 预加载这类局部优化无法转化为分数；下一轮必须先解决阅读吸引力。

数据层遗留（低优先）：mock 分页里存在 1 处时间戳非严格递减（post-096 后接 post-007），应用层 `api.js` 会按 timestamp 排序，用户无感知；待内容类轮次顺手修。

## 7. 结构验收记录

（尚未进行）
