import type { BrainHubSnapshot } from '../contracts.ts'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import remote from '../../lib/typert.remote-client.js'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { BrainSettingsSection, type BrainSettingsInjected } from './BrainSettingsSection.tsx'
import { en, zh, type BrainSettingsLocaleKey } from './locales.ts'

export type { BrainSettingsInjected, BrainSettingsProps } from './BrainSettingsSection.tsx'
export type { BrainSettingsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'settings.brain': BrainSettingsLocaleKey }
}

/** Locale namespace owned by the Memory & Learning settings package. */
export const NS = 'settings.brain'
export const inject = ['slots', 'locale', 'remote']

/** Mount generated RPC metadata and a disposable, lazy provider-status settings entry. */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const unmountRemote = await ctx.remote.$mount(remote)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-brain: dictionaries')
  ctx.inject(['remote.missherBrain'], brainCtx => {
  const t = brainCtx.locale.bind(NS)
  const load = async (): Promise<BrainHubSnapshot> => {
    const result = await brainCtx.remote.missherBrain.snapshot()
    if (!result.ok) throw new Error(`missherBrain.snapshot failed: ${result.error.code}`)
    return result.value
  }
  brainCtx.slots.inject('settings.section', () => brainCtx.slots.register({
    name: 'settings.section', id: 'brain', order: 9,
    label: () => t('section'), locale: NS, inject: (): BrainSettingsInjected => ({ load }),
  }, BrainSettingsSection))
  })
  return unmountRemote
}
