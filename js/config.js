/* ==========================================================================
 * config.js —— 全局配置
 * 想接真实第三方 API，只改这里：SOURCE 改成 'remote'，填好 REMOTE 地址即可。
 * ========================================================================== */
window.READING_MONTH = {
  /* 内容来源：
   *   'mock'   → 读取本地 mock/api/**（当前本地测试用，无需后端、无需联网）
   *   'remote' → 请求 REMOTE 里配置的第三方内容 API
   */
  SOURCE: 'mock',

  /* 每页条数（无限下拉的分页大小） */
  PAGE_SIZE: 8,

  /* 第三方内容 API 配置（示例占位，接入时替换真实域名与字段） */
  REMOTE: {
    // 信息流：{page} {size} {cat} 会被自动替换
    feed: 'https://api.example.com/v1/reading/posts?page={page}&size={size}&cat={cat}',
    // 详情：{id} 会被自动替换
    detail: 'https://api.example.com/v1/reading/posts/{id}',
    // 点赞上报（可选，留空则只做本地乐观更新）
    like: '',
    // 评论提交（可选）
    comment: '',
    headers: { Accept: 'application/json' },
    timeout: 8000,
    retry: 2,
  },

  /* 本地 Mock API 路径（SOURCE='mock' 时生效） */
  MOCK: {
    feed: 'mock/api/posts/page-{page}.json',
    detail: 'mock/api/detail/{id}.json',
  },

  /* 右下角「提交投稿」跳转的地址 */
  SUBMIT_URL: 'https://www.baidu.com',

  /* 活动周期：读书月 4/23 — 5/23，跨年后自动滚动到下一年 */
  ACTIVITY: { startMonth: 4, startDay: 23, endMonth: 5, endDay: 23 },

  /* 静态兜底数据量：当 mock JSON 也读不到时（例如 file:// 直接双击打开）使用 */
  FALLBACK_COUNT: 24,
}
