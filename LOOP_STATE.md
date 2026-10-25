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
8. 每轮结束更新本文件第 4 节表格。停止条件：`overall ≥ 88` 且结构验收无大问题，或达到最大轮数 14。

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

---

## 3. 环境与工具（客观事实采集）

- 本地服务：`cd reading-month && python3 -m http.server 4173`（已在跑）
- 无头浏览器：`/data/data/com.termux/files/usr/lib/chromium/chromium-launcher.sh`（Chromium 156，可 `--headless=new`）
- 客观事实采集器：`node /data/dsh/cosmo/tooling/audit.mjs http://127.0.0.1:4173 /data/dsh/cosmo/tooling/reports/<name>.json`（多视口布局溢出、focus/hover、对比度、夜读白块、无障碍树、网络体积、控制台错误、信息流/搜索实测）
- 单点探针：`node /data/dsh/cosmo/tooling/probe.mjs <url> <宽> <高> --file=<js文件>`（返回页面内 JS 的 JSON 结果）
- 测试：`node tools/smoke.mjs`（51） / `node tools/dom-test.mjs`（46）
- 推送：`TOKEN=$(python3 -c ...) node tools/push-api.mjs yykkxx reading-month main`
- 模型无视觉能力 → 截图不可读；评价走 DOM/计算样式/可访问性/HTML 语义的文本证据，属**降级评价**，需标注。

---

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

---

## 5. 当前状态

- 当前保留版本：R10 保留版（`3b67166`）
- 当前最高分：**79**（design 78 / originality 79 / technical 80 / function 80 / perf 78 / anti_ai 80）
- 连续无提升轮数：0
- 已用轮数：10 / 14
- 检查点：`loop-v0`=1d46397、`loop-r1-before`=6a39acb、`loop-r2-before`=3aae555、`loop-r3-before`=b9d53ac、`loop-r4-before`=d8e5526、`loop-r5-before`=47debb7、`loop-r6-before`=6227298
- 决策口径：以加权总分（保留一位小数）为准；**提高 ≥0.5 才保留**，持平或更低即回滚；若评价在本轮引入 high 级新回归也回滚
- 下一步（第 11 轮假设）：站点收口——页脚、canonical/OG/结构化数据（canonical 必须带 id，避免上一版回滚原因）、serif 400 真实字面、缓存键统一、主 CTA hover、作者资料卡宽度、投稿卡死链与统计占位 → 预期 perf_a11y_seo/design 上升

## 6. 失败记录

- **R6（SEO/页脚）回滚**：加权 74.95 vs 当前 74.75，等于打平；新增「canonical 通用 URL 与 sitemap ?id= 深链矛盾」「详情夜间 theme-color 被覆写」两个问题。结论：SEO/页脚工作有效但不该单独成轮，后续与深链 canonical/结构化数据/性能一起做。

数据层遗留（低优先）：mock 分页里存在 1 处时间戳非严格递减（post-096 后接 post-007），应用层 `api.js` 会按 timestamp 排序，用户无感知；待内容类轮次顺手修。

## 7. 结构验收记录

（尚未进行）
