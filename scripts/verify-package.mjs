/** Validate publish contents and public-only dependencies without running a Host. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
assert.equal(pkg.name, 'dsh-missher-brain')
assert.equal(pkg.version, '0.1.2')
assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
for (const [name, version] of Object.entries(pkg.peerDependencies)) assert.equal(version, name === '@deepseek-ai/cordis' ? '4.0.2' : '0.1.5-rc.2')
assert(!JSON.stringify(pkg).includes('dsh-client-runtime'))
const releaseUrl = `https://github.com/Missher12/dsh-missher-brain/releases/download/v${pkg.version}/${pkg.name}-${pkg.version}.tgz`
for (const file of ['README.md', 'README.zh.md', 'AGENT.md']) {
  const document = await readFile(join(root, file), 'utf8')
  assert(document.includes(`dsh plugin --profile web add ${releaseUrl}`), `${file}: fixed install command`)
  assert(!/\/Users\/|\/private\/|\.worktrees\/|\.artifacts\//.test(document), `${file}: private path`)
}

for (const entry of Object.values(pkg.exports)) {
  for (const path of typeof entry === 'string' ? [entry] : Object.values(entry)) assert((await stat(join(root, path))).isFile())
}
const client = await readFile(join(root, 'lib/client.js'), 'utf8')
assert(client.startsWith('window.__ModuleLoader__.load('))
assert(!client.includes('dsh-client-runtime'))
assert(!client.includes('missherWorkbenchPages'))
assert(!client.includes('/Users/'))
const { TYPERT } = await import('../lib/typert.host.js')
const { TYPERT_REMOTE } = await import('../lib/typert.remote-client.js')
assert.equal(TYPERT.package, pkg.name)
assert(JSON.stringify(TYPERT_REMOTE).includes('missherBrain/snapshot'))
const [archive] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }))
const names = archive.files.map(file => file.path)
for (const file of ['lib/index.js', 'lib/client.js', 'lib/typert.host.js', 'lib/typert.remote-client.js', 'cordis.patch.yml', 'LICENSE', 'SOURCE_PROVENANCE.json', 'AGENT_INTEGRATION.md', 'README.zh.md', 'AGENT.md']) assert(names.includes(file), file)
assert(!names.some(name => /(?:^|\/)(?:node_modules|\.artifacts|tests|dist)(?:\/|$)|\.(?:db|sqlite|key)$/.test(name)))
console.log(JSON.stringify({ ok: true, package: pkg.name, version: pkg.version, files: names.length, strictRemote: true, publicPeersOnly: true }))
