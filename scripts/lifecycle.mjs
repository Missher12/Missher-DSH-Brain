/** Install, run, remove, and restore the archive in a fresh official profile. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const root = resolve(import.meta.dirname, '..')
const packageInfo = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const archive = resolve(process.argv[2])
const cli = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
const run = join(root, '.artifacts', `lifecycle-${Date.now()}`)
await mkdir(join(run, 'home'), { recursive: true })
await mkdir(join(run, 'project'), { recursive: true })
const env = { PATH: process.env.PATH, HOME: join(run, 'home'), DSH_HOME: join(run, 'dsh'),
  TMPDIR: run, NO_COLOR: '1', DSH_TELEMETRY_MODE: 'DISABLED', BRAIN_PROBE_PROJECT: join(run, 'project') }
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const hash = digest(await readFile(archive))
const frozen = join(run, `${hash}.tgz`)
await copyFile(archive, frozen)
async function command(args, label, extra = {}) {
  const child = spawn(process.execPath, [cli, ...args], { cwd: run, env: { ...env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', data => { output += data }); child.stderr.on('data', data => { output += data })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM') }, 180000)
  const code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done) })
  clearTimeout(timer)
  await writeFile(join(run, `${label}.log`), output.replace(/(token=)[^\s"'<>]+/g, '$1[REDACTED]'))
  assert(!timedOut && code === 0, `${label} failed: code=${code}, timedOut=${timedOut}; see isolated log`)
  return output
}
await command(['--profile', 'brain-proof', '--from-default-profile', 'headless', '--dump-config'], 'create')
await command(['plugin', '--profile', 'brain-proof', 'add', frozen, '--config.ignore-scripts=true'], 'install')
console.log('Brain installed in isolated official profile')
const patch = join(run, 'probe.patch.json')
await writeFile(patch, JSON.stringify([{ id: 'headless-startup', disabled: true }, { id: 'headless-runner', disabled: true },
  { id: 'session-title-llm', disabled: true }, { id: 'llm-deepseek', disabled: true },
  { insert: [{ id: 'brain-proof', name: pathToFileURL(join(root, 'scripts/profile-probe.mjs')).href }] }]))
const keep = join(env.DSH_HOME, 'neighbor.keep')
await writeFile(keep, 'Synthetic adjacent store; preserve bytes.\n')
const original = digest(await readFile(keep))
const phases = []
for (const phase of ['installed', 'absent', 'restored']) {
  if (phase === 'absent') await command(['plugin', '--profile', 'brain-proof', 'remove', 'dsh-missher-brain'], 'remove')
  if (phase === 'restored') await command(['plugin', '--profile', 'brain-proof', 'add', frozen, '--config.ignore-scripts=true'], 'reinstall')
  const dump = await command(['--profile', 'brain-proof', '--dump-config'], `${phase}-composition`)
  assert.equal(dump.includes('dsh-missher-brain'), phase !== 'absent')
  const result = join(run, `${phase}.json`)
  await command(['--profile', 'brain-proof', '--patch', patch], `${phase}-host`, { BRAIN_PROBE_PHASE: phase, BRAIN_PROBE_RESULT: result })
  phases.push(JSON.parse(await readFile(result, 'utf8')))
  assert.equal(digest(await readFile(keep)), original)
  console.log(`Brain lifecycle ${phase} passed`)
}
const evidence = { package: 'dsh-missher-brain', version: packageInfo.version, archiveSha256: hash, officialHarness: '0.1.5-rc.2', cordis: '4.0.2',
  syntheticOnly: true, adjacentDataPreserved: true, phases }
await writeFile(join(run, 'result.json'), JSON.stringify(evidence, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, evidence: join(run, 'result.json'), ...evidence }))
