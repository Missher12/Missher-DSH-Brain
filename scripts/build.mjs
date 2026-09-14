/** Compile this package and generate strict Remote metadata with the official generator. */
import { build } from 'esbuild'
import { cp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { WorkspaceTypertGenerator } from '@deepseek-ai/dsh-typert-generator'
const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.host.json'], { cwd: root, stdio: 'inherit' })
const scratch = join(root, '.artifacts/typert-build')
await rm(scratch, { recursive: true, force: true })
const staged = join(scratch, 'packages/brain')
await mkdir(staged, { recursive: true })
await cp(join(root, 'src'), join(staged, 'src'), { recursive: true })
for (const file of ['tsconfig.json', 'tsconfig.base.json', 'tsconfig.client.json']) await cp(join(root, file), join(staged, file))
await cp(join(root, 'tsconfig.host.json'), join(staged, 'tsconfig.host.json'))
await writeFile(join(staged, 'package.json'), JSON.stringify(manifest, null, 2))
await symlink(join(root, 'node_modules'), join(scratch, 'node_modules'), 'dir')
// The official generator recognizes protocol markers only when the protocol owns a workspace registration.
// Stage its published declarations unchanged for analysis; runtime imports still use the exact npm package.
const protocol = join(scratch, 'packages/protocol')
await mkdir(protocol, { recursive: true })
await mkdir(join(protocol, 'src'), { recursive: true })
for (const file of await readdir(join(root, 'node_modules/@deepseek-ai/dsh-typert-protocol/lib/types'))) {
  if (file.endsWith('.d.ts')) await cp(join(root, 'node_modules/@deepseek-ai/dsh-typert-protocol/lib/types', file), join(protocol, 'src', file.replace(/\.d\.ts$/, '.ts')))
}
await cp(join(root, 'node_modules/@deepseek-ai/dsh-typert-protocol/package.json'), join(protocol, 'package.json'))
await writeFile(join(protocol, 'tsconfig.json'), JSON.stringify({ compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', target: 'ES2024', skipLibCheck: true }, include: ['src/**/*.ts'] }))
const stagedConfig = JSON.parse(await readFile(join(staged, 'tsconfig.base.json'), 'utf8'))
stagedConfig.compilerOptions.paths = { '@deepseek-ai/dsh-typert-protocol': ['../protocol/src/index.ts'] }
await writeFile(join(staged, 'tsconfig.base.json'), JSON.stringify(stagedConfig))
await writeFile(join(scratch, 'tsconfig.host.json'), JSON.stringify({ compilerOptions: { ...stagedConfig.compilerOptions, rootDir: '.', paths: { '@deepseek-ai/dsh-typert-protocol': ['./packages/protocol/src/index.ts'] } }, files: [], references: [{ path: 'packages/brain/tsconfig.host.json' }, { path: 'packages/protocol/tsconfig.json' }] }))
const generator = new WorkspaceTypertGenerator(scratch)
const artifacts = generator.generate([manifest.name], ['host'])
if (artifacts.length !== 1 || !artifacts[0].remote) throw new Error('Expected one generated Host and Remote contribution')
for (const item of artifacts) {
  for (const [name, contents] of Object.entries({ 'typert.host.js': item.js, 'typert.host.d.ts': item.dts, 'typert.remote-client.js': item.remote.js, 'typert.remote-client.d.ts': item.remote.dts })) {
    await writeFile(join(root, 'lib', name), contents)
  }
}
await build({ entryPoints: [join(root, 'src/index.ts')], outfile: join(root, 'lib/index.js'), bundle: true, packages: 'external', format: 'esm', platform: 'node', target: 'node22', tsconfig: join(root, 'tsconfig.host.json') })
if (process.argv.includes('--host-only')) process.exit(0)
execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.client.json'], { cwd: root, stdio: 'inherit' })
const client = await build({ entryPoints: [join(root, 'src/client/index.ts')], outfile: join(root, 'lib/client.js'), write: false,
  bundle: true, format: 'cjs', platform: 'browser', target: 'es2022', tsconfig: join(root, 'tsconfig.client.json'), jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'], loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  define: { 'process.env.NODE_ENV': '"production"' } })
const javascript = client.outputFiles.find(file => file.path.endsWith('.js'))?.text
if (javascript === undefined) throw new Error('Client build did not produce JavaScript')
const css = client.outputFiles.find(file => file.path.endsWith('.css'))?.text
const styleWrapper = css === undefined ? 'return module.exports;' : `const original=module.exports;return {...original,apply(ctx,...args){ctx.effect(()=>{const style=document.createElement('style');style.dataset.missherBrain='settings';style.textContent=${JSON.stringify(css)};document.head.appendChild(style);return()=>style.remove();},'missher-brain: settings styles');return original.apply(ctx,...args);}};`
await writeFile(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;\n${javascript}\n${styleWrapper}\n}});\n`)
console.log(JSON.stringify({ built: manifest.name, version: manifest.version, strictRemote: true, cssBytes: css?.length ?? 0 }))
