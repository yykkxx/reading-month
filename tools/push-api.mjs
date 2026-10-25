#!/usr/bin/env node
/**
 * tools/push-api.mjs —— 在 github.com:443 不可达时，用 GitHub Git Data API 推送。
 *
 *   TOKEN=ghp_xxx node tools/push-api.mjs <owner> <repo> [branch]
 *
 * 原理：不依赖本地存在远端 commit 对象，而是把「本地 index 的 blob sha」
 *       与「远端 tree 的 blob sha」逐个比对，只上传有变化的文件。
 *
 * 注意：GitHub 会把提交身份改写为 noreply 账号，因此远端 commit SHA 与本地
 *       可能不同，但 tree（内容）完全一致。后续如 github.com 恢复，先
 *       `git fetch origin && git reset --hard origin/main` 再继续用 git push。
 *
 * token 只从环境变量读取，不写文件、不打印。
 */
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const API = 'https://api.github.com'
const TOKEN = process.env.TOKEN || process.env.GITHUB_TOKEN || ''
const [owner, repo, branch = 'main'] = process.argv.slice(2)

if (!TOKEN || !owner || !repo) {
  console.error('用法：TOKEN=ghp_xxx node tools/push-api.mjs <owner> <repo> [branch]')
  process.exit(1)
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} ${method} ${path}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

/* 本地 index：路径 → blob sha */
const local = new Map()
for (const line of git('ls-files', '-s').split('\n')) {
  if (!line.trim()) continue
  const [meta, path] = line.split('\t')
  const [mode, sha] = meta.split(' ')
  if (mode !== '100644' && mode !== '100755') continue // 跳过子模块等
  local.set(path, { sha, mode })
}

const ref = await call('GET', `/repos/${owner}/${repo}/git/ref/heads/${branch}`)
const remoteSha = ref.object.sha
const remoteCommit = await call('GET', `/repos/${owner}/${repo}/git/commits/${remoteSha}`)
const remoteTree = remoteCommit.tree.sha

const tree = await call('GET', `/repos/${owner}/${repo}/git/trees/${remoteTree}?recursive=1`)
const remote = new Map()
for (const entry of tree.tree || []) {
  if (entry.type === 'blob') remote.set(entry.path, entry.sha)
}

const changed = []
for (const [path, { sha, mode }] of local) {
  if (remote.get(path) !== sha) changed.push({ path, sha, mode })
}
const deleted = [...remote.keys()].filter((p) => !local.has(p))

console.log(`本地文件 ${local.size} / 远端文件 ${remote.size}`)
console.log(`需要上传 ${changed.length}，删除 ${deleted.length}`)
if (!changed.length && !deleted.length) {
  console.log('✅ 内容已一致，无需推送')
  process.exit(0)
}

const items = []
const CONCURRENCY = 6
for (let i = 0; i < changed.length; i += CONCURRENCY) {
  const batch = changed.slice(i, i + CONCURRENCY)
  const results = await Promise.all(batch.map(async (f) => {
    const content = fs.readFileSync(f.path).toString('base64')
    const blob = await call('POST', `/repos/${owner}/${repo}/git/blobs`, { content, encoding: 'base64' })
    return { path: f.path, mode: f.mode, type: 'blob', sha: blob.sha }
  }))
  items.push(...results)
  process.stdout.write(`\r上传 ${Math.min(i + CONCURRENCY, changed.length)}/${changed.length}`)
}
if (changed.length) process.stdout.write('\n')

for (const p of deleted) items.push({ path: p, mode: '100644', type: 'blob', sha: null })

const newTree = await call('POST', `/repos/${owner}/${repo}/git/trees`, { base_tree: remoteTree, tree: items })

const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim() || 'reading-month'
const email = execFileSync('git', ['config', 'user.email'], { encoding: 'utf8' }).trim() || 'noreply@users.noreply.github.com'
const message = execFileSync('git', ['log', '-1', '--pretty=%B'], { encoding: 'utf8' }).trim()

const commit = await call('POST', `/repos/${owner}/${repo}/git/commits`, {
  message,
  tree: newTree.sha,
  parents: [remoteSha],
  author: { name, email, date: new Date().toISOString() },
  committer: { name, email, date: new Date().toISOString() },
})

await call('PATCH', `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
  sha: commit.sha,
  force: false, // 父提交就是远端 head，属于快进
})

console.log('✅ 推送完成')
console.log('   tree  :', newTree.sha)
console.log('   commit:', commit.sha)
console.log('   url   :', `https://github.com/${owner}/${repo}/commit/${commit.sha}`)
console.log('\n提示：GitHub 会改写提交身份，远端 SHA 可能与本地不同（内容一致）。')
