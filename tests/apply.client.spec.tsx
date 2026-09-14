// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { Context, Service } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { SlotRegistry as SlotRegistryType } from '@deepseek-ai/dsh-client-ui-renderer/client'

import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { apply, inject, NS } from '../src/client/index.ts'
import { BrainSettingsSection, type BrainSettingsInjected } from '../src/client/BrainSettingsSection.tsx'

// Published official clients use the browser module loader, not Node ESM exports.
const require = createRequire(import.meta.url)
function browserModule(name: string): Record<string, unknown> {
  let result: Record<string, unknown> = {}
  const text = readFileSync(require.resolve(`${name}/client`), 'utf8')
  new Function('window', text)({ __ModuleLoader__: { load: (entry: { factory: (require: NodeRequire) => Record<string, unknown> }) => { result = entry.factory(require) } } })
  return result
}
const { SlotRegistry } = browserModule('@deepseek-ai/dsh-client-ui-renderer') as { SlotRegistry: typeof SlotRegistryType }

Object.defineProperty(navigator, 'languages', { configurable: true, value: ['zh-CN'] })
afterEach(cleanup)

const SNAPSHOT = {
  generatedAt: 1,
  limits: { maxItems: 6, maxBytes: 4_000, timeoutMs: 150 },
  providers: [
    { id: 'memory', state: 'ready' as const, count: 12, byteBudget: 3_000 },
    { id: 'evolution', state: 'ready' as const, count: 3, byteBudget: 2_000 },
  ],
}

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  let language = 'zh'
  const dictionaries = new Map<string, Record<string, Record<string, string>>>()
  const locale = {
    register: (namespace: string, entries: Record<string, Record<string, string>>) => {
      dictionaries.set(namespace, entries)
      return () => dictionaries.delete(namespace)
    },
    bind: (namespace: string) => (key: string) => dictionaries.get(namespace)?.[language]?.[key] ?? key,
    setLocale: (value: string) => { language = value },
  }
  ctx.provide('locale', locale)
  class RemoteService extends Service {
    constructor(serviceCtx: Context) { super(serviceCtx, 'remote') }
  }
  const remote = new RemoteService(ctx)
  const unmount = vi.fn(async () => undefined)
  Object.assign(remote, { $mount: vi.fn(async () => unmount) })
  const snapshot = vi.fn().mockResolvedValue({ ok: true, value: SNAPSHOT })
  const remoteFiber = ctx.plugin({ apply(owner: Context) { owner.provide('remote.missherBrain', { snapshot }) } })
  await remoteFiber.await()
  return { ctx, remoteFiber, unmount, slots: ctx.get('slots') as InstanceType<typeof SlotRegistry>, locale, snapshot }
}

describe('ui-settings-brain browser plugin', () => {
  it('registers one lazy localized Memory & Learning section', async () => {
    expect(inject).toEqual(['slots', 'locale', 'remote'])
    const b = await bench()
    b.slots.register({
      name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' } },
    } as never, () => null)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    const entry = b.slots.entries('settings.section')[0]!
    expect(entry.component).toBe(BrainSettingsSection)
    expect(entry.options).toMatchObject({ id: 'brain', order: 9 })
    expect(entry.locale).toBe(NS)
    expect(resolveSlotLabel(entry.options.label)).toBe('记忆与学习')
    expect(b.snapshot).not.toHaveBeenCalled()

    const injected = (entry.inject as unknown as () => BrainSettingsInjected)()
    await expect(injected.load()).resolves.toEqual(SNAPSHOT)
    b.snapshot.mockResolvedValueOnce({ ok: false, error: { code: 'REMOTE_ERROR', message: 'private detail' } })
    await expect(injected.load()).rejects.toThrow('missherBrain.snapshot failed: REMOTE_ERROR')

    b.locale.setLocale('en')
    expect(resolveSlotLabel(b.slots.entries('settings.section')[0]!.options.label)).toBe('Memory & Learning')
    await b.ctx.fiber.dispose()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    expect(b.unmount).toHaveBeenCalledOnce()
  })
})

it('retains only Settings when an unrelated page registry is present and disposes its Remote', async () => {
  const b = await bench()
  const register = vi.fn(() => () => undefined)
  b.ctx.provide('missherWorkbenchPages', { register })
  b.slots.register({ name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' } } } as never, () => null)
  try {
    const client = b.ctx.plugin({ inject: [...inject], apply })
    await client.await()
    expect(register).not.toHaveBeenCalled()
    expect(b.slots.entries('settings.section')).toHaveLength(1)
    expect(b.slots.entries('settings.section')[0]!.component).toBe(BrainSettingsSection)
    await b.remoteFiber.dispose()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    await client.dispose()
    expect(b.unmount).toHaveBeenCalledOnce()
  } finally { await b.ctx.fiber.dispose() }
})
