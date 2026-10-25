# plan.md — 项目进度与规划

> 最后更新：2026-10-26
> 接手流程：先读 `agent.md`（硬性要求 / 坑 / 提交发布），再读本文件（进度 / 决策 / 下一步），最后看 `README.md`（功能与数据接入）。

---

## 0. 现状快照

| 项 | 值 |
| --- | --- |
| 线上地址 | https://yykkxx.github.io/reading-month/ |
| 仓库 | https://github.com/yykkxx/reading-month （public，`main`） |
| 部署 | GitHub Pages，`main` 根目录，推送后 30–90s 重建 |
| 本地路径 | `/data/dsh/cosmo/reading-month` |
| 技术栈 | 纯静态 HTML/CSS/JS，无构建、无运行时依赖 |
| 信息流 | 120 条 / 15 页（96 篇书评 + 24 条评论），每页 8 条 |
| 作者 | 20 位（`u01`–`u20`，各有书评 / 评论） |
| 详情数据 | 96 份书评详情，`commentCount === comments.length` |
| 首屏统计 | page-1 与 `mock/api/totals.json` 均带 `96 / 24 / 20`；首屏读汇总，不再等 15 页预取 |
| 字体 | 自托管 `fonts/` 四个 woff：Serif 400/700/900 + Sans 400；约 817KB |
| 投稿 | 站内表单本机闭环（`#submitForm` + `rm_submissions`），mailto 出口，无假后端 |
| 测试 | `tools/smoke.mjs` 51 项（零依赖）+ `tools/dom-test.mjs` 46 项（jsdom） |
| 最近提交 | R12 结构验收 + 文档同步（`git log -1`） |

最近提交记录：

```
R12 docs/code: 文档同步 + page-1 totals + 字体 preload + 首屏统计小修
R11  feat: 站点收口——页脚、带 id 的 canonical/OG、结构化数据、serif 400 真字面
R10  fix: 一致性收口——我的投稿不污染筛选、评论文案诚实、数字同源
R9   perf: 字体自托管 + 空闲预取，首屏请求 89→26
R8   feat: 站内投稿表单闭环（校验/编号/本机持久化/信息流置顶）
R7   fix: 首屏不遮挡、活动届次与统计自洽、作者页版式对齐
```

---

## 1. 已完成（第 1–11 轮）

### 内容与信息流
- [x] 重做 mock 内容层：96 篇独立书评（32 本书 × 3 个角度）、320 条短评池、20 位作者、纸墨封面与真实头像，全部内联 SVG
- [x] 混合流：每 4 篇书评穿插 1 条评论，评论卡带原书评缩略图 + 跳转（`#comments`）
- [x] 无限滚动（哨兵 + 主动补页）、首屏 page-1 快速路径、其余 14 页空闲预取（并发 ≤3）
- [x] 骨架屏、静态兜底（`file://` 也能看）、错误态

### 搜索与筛选
- [x] 关键词搜索（320ms 防抖），命中标题 / 简介 / 评论正文 / 作者 / 分类 / 标签 / 原书评标题
- [x] 荧光笔式高亮，先转义再包 `<mark>`，防 XSS
- [x] 10 个分类 + 全部、8 个标签、三种排序（刚出炉 / 最多共鸣 / 聊得热闹）
- [x] 筛选摘要 + 一键重置；URL 支持 `?tag=` / `?cat=` / `?q=` 预置

### 详情页
- [x] 宋体书页正文、首字下沉、中文首行缩进、引文块、书腰卡
- [x] 阅读进度条、阅读时长、封面滚动推近（`animation-timeline` 渐进增强）
- [x] 便签留言墙（胶带 + 多纸色 + 错峰浮现），留言点赞 / 本地发布
- [x] 点赞、收藏（localStorage 记忆）、分享（Web Share → 剪贴板兜底）
- [x] 相关阅读、`#comments` 锚点二次定位

### 作者与投稿
- [x] 作者页：资料卡（学院 / 加入时间 / 简介 / 书评数 / 评论数 / 获赞 / 标签）+ 全部作品续加载
- [x] 站内投稿表单：昵称 / 书名 / 分类 / 300–2000 字正文、实时字数、编号 `RM-YYYYMMDD-NNN`
- [x] 本机持久化 `rm_submissions`、成功态、刷新回显、二次确认清空、「用邮件发送」mailto
- [x] 「我的投稿」独立成列（`#sfMineList`），不进入信息流、不污染筛选 / 空态 / 摘要
- [x] 投稿卡不伪造统计：点赞 / 评论 / 浏览为 0，标「本机保存」，整卡不跳转

### 视觉与主题
- [x] 「纸墨 · 书房」整体视觉（替换初版深色科技风）
- [x] 夜读模式（暖黑纸），`localStorage` 记忆，`<head>` 内联脚本防闪白
- [x] 墨点画布、视差、封面显影、书写式标题、页间花饰、印章动画
- [x] 跨文档 View Transitions、`:focus-visible` 焦点框、跳过导航链接
- [x] 首屏统计不再先摆 0 / 等 2–3 秒：改为 800ms 内出数

### 工程、性能与 SEO
- [x] 数据层 mock / remote 双通道 + 字段归一化 + 失败回退
- [x] 字体自托管（`fonts/` + `@font-face`），移除 Google Fonts；首屏请求 89 → 26
- [x] page-1 只请求 1 次并全站共享；统计只读 `totals` 汇总，不再触发全量预取
- [x] 三页页脚、canonical / OG / Twitter 卡、首页 Event JSON-LD、`robots.txt`、`sitemap.xml`、`assets/og-cover.png`
- [x] 测试进仓库：`tools/smoke.mjs`（51）、`tools/dom-test.mjs`（46）；生成器自检数据契约
- [x] `?v=` 资源版本号、`.gitignore`（node_modules 等）

---

## 2. 关键决策（及原因）

1. **纯静态 + 数据层抽象**
   学校项目没有后端预算，用静态 mock 即可上线；但把数据访问全部收在 `js/api.js`，`config.js` 一个开关切远程，避免以后接真实接口时重写页面。

2. **视觉选「纸墨 · 书房」而不是科技感**
   这是读书月，内容属性偏人文；米纸 + 宋体 + 朱砂 + 便签比霓虹渐变更贴合。所有装饰（书页、印章、邮戳、书签）都服务于「书」这个母题。

3. **评论单独成卡、混入同一条流**
   做成引文条：正文加引号、左侧青瓷绿书脊线、下方缩略图 + 跳转链接；桌面端跨整行，形成小板块。

4. **信息流数据时间戳必须单调**
   分页依赖稳定排序。生成器用固定基准 + 时间游标，按 page 数字序严格递减；否则会出现重复 / 漏条。

5. **测试放在仓库里**
   没有后端也能验证数据层与模板契约；jsdom 测试覆盖真实交互（筛选、搜索、夜读、作者页），避免「看起来没坏其实坏了」。

6. **投稿只做本机闭环，不伪造后端**
   没有收稿接口就不写「已送达编辑部」；编号 + localStorage + mailto 是当前能力上限，文案必须如实说明。

7. **推送走临时 remote / Git Data API**
   `github.com:443` 在部分网络不通，但 `api.github.com` 可用。本地内置 `tools/push-api.mjs`：按 blob sha 与远端 tree 比对，只传变化文件，不依赖远端 commit 对象。
   已知副作用：GitHub 会改写提交身份（noreply + UTC），远端 SHA 与本地不同但 tree 一致；`github.com` 恢复后需 `git fetch && git reset --hard origin/main` 再继续用 `git push`。token 只放环境变量。

---

## 3. 下一步（按优先级）

### P0 · 字体减重（当前最大性能项）
- [ ] 将 4 个 woff 转 woff2（同样 965 字子集预计 817KB → 300KB 左右）
- [ ] 或按页面拆分 serif / sans 子集，让详情页不必下载 Black
- [ ] 保持 `document.fonts` 三档 serif 字重 loaded；preload 最多 2 条

### P1 · 真实内容 API 与投稿后端
- [ ] 在 `config.js` 的 `REMOTE` 填真实地址（feed / detail / user / userPosts / like / comment）
- [ ] 核对字段映射（`normalizePost / normalizeDetail / normalizeComment`）与 CORS
- [ ] 投稿 / 评论接真实接口（当前 `rm_submissions`、`rm_cmts` 只在本机）
- [ ] 未知详情 id 不再发 404：列表侧校验或改成可选查询

### P2 · 首屏与预取策略
- [ ] 把 15 个分页文件合并成单个 `feed.json`（或加 index），空闲预取从 15 请求降到 1
- [ ] 预取完成前筛选只覆盖 page-1 的限制在 UI 上说明，或改为按需分页查询
- [ ] 字体 CLS / LCP 复测，保持 CLS 0

### P3 · 内容与图片
- [ ] 用真实书封替换内联 SVG 占位（需版权确认）
- [ ] 封面 `width/height` 或 `aspect-ratio` 已由容器比例基本规避，补真实图后复测
- [ ] 相关阅读从「相邻 id」升级为按分类 / 标签关联

### P4 · SEO / 可访问性
- [ ] 详情页 / 作者页在静态 HTML 中给默认 canonical / OG，或构建期生成深链
- [ ] 详情页 / 作者页补 JSON-LD
- [ ] 收藏按钮补 `aria-pressed`；分享在无剪贴板权限时给可操作替代
- [ ] 读屏走查评论卡与作者页

### P5 · 工程
- [ ] 可选加 `package.json` 记录 jsdom 版本与测试脚本
- [ ] 简单 CI（push 时跑 smoke + dom-test）
- [ ] 把 `?v=` 版本号改成脚本自动注入，避免手改遗漏

---

## 4. 已知问题 / 技术债

| 项 | 说明 | 影响 |
| --- | --- | --- |
| 字体体积 | 4 个 woff 共约 817KB，非 woff2；子集 965 字，仍有少量字形回退系统字体 | 中（首屏带宽） |
| 预取 15 页 | 信息流空闲预取仍拉 14 个分页文件（约 719KB），是筛选 / 搜索跨全量的代价 | 中（移动网络） |
| remote 未接 | `config.js` 仍是 `api.example.com` 示例，真实接口 / 字段未核对 | 中（上线前必做） |
| 投稿 / 评论仅本机 | `rm_submissions`、`rm_cmts` 只存 localStorage，换设备 / 清缓存即丢失 | 中（无账号体系） |
| 图片占位 | 96 张封面为内联 SVG，没有真实书封；`og-cover.png` 是唯一位图 | 中（真实感） |
| 深链 SEO | 详情 / 作者的 canonical、OG 靠运行时 JS 注入，静态 HTML 无 | 中（非 JS 抓取） |
| 未知 id 404 | `detail.html?id=不存在` 仍会请求对应 JSON 并留下 404 | 低（控制台噪音） |
| 无 CI | 测试靠手动执行，提交前容易漏跑 | 低 |
| 无浏览器截图 | 评审环境无视觉能力，布局靠 DOM / 计算样式 / 几何矩形推演 | 低（已有 audit/probe 兜底） |

---

## 5. 如何继续（给下一个会话的操作顺序）

1. 读 `agent.md` → 读本文件 → 读 `README.md`
2. 起本地服务并跑测试：

```bash
cd /data/dsh/cosmo/reading-month
python3 -m http.server 4173 &
node tools/smoke.mjs
node tools/dom-test.mjs        # 需要 jsdom（node_modules 已装）
```

3. 先做 P0 字体减重；改完跑两个测试套件并复测首屏请求 / 字体加载
4. 更新 `?v=` → `git commit` → 推送（流程见 `agent.md` 第 7 节）
5. 推送后轮询线上文件内容确认部署，再更新本文件的「现状快照」与「已完成」

---

## 6. 验收标准（本项目的「完成」定义）

- 移动端 360px 起可用，桌面多列不塌
- 日间 / 夜读都成立，不出现白块或低对比文字
- 信息流可无限下拉、无重复、评论与书评混排自然
- 搜索 / 分类 / 标签 / 排序结果正确
- 书评 → 详情、评论 → 详情留言区、头像 → 作者页，三条链路都通
- 投稿表单能本机闭环；文案不承诺不存在的后端
- `tools/smoke.mjs` + `tools/dom-test.mjs` 全绿
- 线上部署验证通过（看内容，不只看 200）
