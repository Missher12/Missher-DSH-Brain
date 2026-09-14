import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { augmentPreStepDecision } from './injection.ts'
import type { BrainHubSnapshot, BrainProvider, BrainProviderStatus } from './contracts.ts'
import { BrainProviderRegistry } from './registry.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    missherBrain: BrainHub
  }
}

/**
 * Create the stable pathless project identity shared by local providers.
 * @param cwd Canonical session working directory, retained only for this calculation.
 * @returns SHA-256 project identity without the source path.
 */
export function brainProjectKey(cwd: string): string {
  return createHash('sha256').update(resolve(cwd)).digest('hex')
}

/** Deployment limits; omitted fields preserve the original Desktop defaults. */
export interface BrainConfig {
  maxItems?: number
  maxBytes?: number
  timeoutMs?: number
  statusTimeoutMs?: number
}

/** Validated optional profile configuration. */
export const Config: z<BrainConfig> = z.object({
  maxItems: z.number().min(1).max(6).step(1),
  maxBytes: z.number().min(1).max(4000).step(1),
  timeoutMs: z.number().min(1).max(5000).step(1),
  statusTimeoutMs: z.number().min(1).max(5000).step(1),
})

/** Resolve all defaulted fields before lifecycle registration. */
function resolveConfig(input: BrainConfig): Required<BrainConfig> {
  const config = { maxItems: 6, maxBytes: 4000, timeoutMs: 150, statusTimeoutMs: 300, ...input }
  for (const [key, value] of Object.entries(config)) {
    const maximum = key === 'maxItems' ? 6 : key === 'maxBytes' ? 4000 : 5000
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new RangeError(`brain ${key} must be an integer between 1 and ${maximum}`)
  }
  return config
}


/** Single error-redacting provider status read for the settings snapshot. */
async function providerStatus(provider: BrainProvider, timeoutMs: number): Promise<BrainProviderStatus> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      provider.status(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { reject(new Error('brain provider status timeout')) }, timeoutMs)
        timer.unref()
      }),
    ])
  } catch {
    return { state: 'unavailable', count: 0 }
  } finally {
    clearTimeout(timer)
  }
}

/** Coordinates bounded local-knowledge providers and exposes pathless status. */
export default class BrainHub extends TypertRemoteService {
  static Config = Config
  private readonly config: Required<BrainConfig>
  private readonly registry = new BrainProviderRegistry()

  constructor(ctx: Context, input: BrainConfig = {}) {
    super(ctx, 'missherBrain')
    this.config = resolveConfig(input)
    const lifetime = new AbortController()
    ctx.effect(() => () => {
      lifetime.abort(new Error('brain hub disposed'))
      this.registry.clear()
    }, 'missher-brain: lifetime')
    ctx.on('agent/pre-step', async ({ agent, turn, step, signal }, next): Promise<PreStepDecision> => {
      const decision = await next()
      const { cwd, origin, delegationDepth } = agent.session.header
      if (cwd === undefined) return decision
      return augmentPreStepDecision({
        decision,
        providers: this.registry.list(),
        projectKey: brainProjectKey(cwd),
        sessionId: agent.session.id,
        turn,
        topLevel: origin !== 'subagent' && (delegationDepth ?? 0) === 0,
        step,
        signal: AbortSignal.any([signal, lifetime.signal]),
        timeoutMs: this.config.timeoutMs,
        maxItems: this.config.maxItems,
        maxBytes: this.config.maxBytes,
      })
    }, { prepend: true })
  }

  /**
   * Register one factual-memory or procedural-learning provider.
   * @param provider Provider whose prepared contributions enter shared arbitration.
   * @returns Disposer for this exact registration.
   */
  register(provider: BrainProvider): () => void {
    return this.registry.register(provider)
  }

  /**
   * Snapshot the providers currently participating in recall.
   * @returns Providers in deterministic registration order.
   */
  listProviders(): readonly BrainProvider[] {
    return this.registry.list()
  }

  /**
   * Read only pathless facts; provider failures become unavailable rows.
   * @returns Current provider availability and resolved arbitration limits.
   */
  @Remote('snapshot')
  async snapshot(): Promise<BrainHubSnapshot> {
    const providers = this.registry.list()
    const providerStatuses = await Promise.all(providers.map(async provider => ({
      provider,
      status: await providerStatus(provider, this.config.statusTimeoutMs),
    })))
    return {
      generatedAt: Date.now(),
      limits: { maxItems: this.config.maxItems, maxBytes: this.config.maxBytes, timeoutMs: this.config.timeoutMs },
      providers: providerStatuses.map(({ provider, status }) => ({
        id: provider.id,
        byteBudget: provider.byteBudget,
        ...status,
      })),
    }
  }
}

export * from './arbiter.ts'
export * from './contracts.ts'
export * from './injection.ts'
export * from './registry.ts'
