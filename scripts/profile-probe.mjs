/** Synthetic in-process AgentLoop proof loaded only by the isolated official profile. */
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { createUserMessage, LlmAdapter } from '@deepseek-ai/dsh-llm'
export const inject = ['agents', 'agentLoop', 'llm']
export async function apply(ctx) {
  try { await probe(ctx) }
  catch (error) { process.stderr.write(String(error.stack ?? error) + "\n"); process.exitCode = 1 }
  finally { setImmediate(() => { void ctx.root.fiber.dispose() }) }
}
async function probe(ctx) {
  const installed = process.env.BRAIN_PROBE_PHASE !== 'absent'
  const brain = ctx.get('missherBrain')
  assert.equal(Boolean(brain), installed)
  if (!installed) {
    await writeFile(process.env.BRAIN_PROBE_RESULT, JSON.stringify({ phase: 'absent', brainAbsent: true }))
    return
  }
  let seen = null
  class FixtureAdapter extends LlmAdapter {
    async listModels(provider) { return [{ provider, id: 'fixture', name: 'Brain local fixture' }] }
    async resolveModel(provider, id) { return { provider, id, name: 'Brain local fixture', context: { contextWindow: 65536 }, defaultMaxTokens: 128 } }
    async *stream(input) {
      seen = input.messages
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'Synthetic local response.' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Synthetic local response.' } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
  const unregisterAdapter = ctx.llm.registerAdapter(['brain-local-fixture'], new FixtureAdapter())
  let accepted = 0, canceled = 0, calls = 0
  const unregister = brain.register({ protocolVersion: 1, id: 'memory', byteBudget: 3000,
    async status() { return { state: 'ready', count: 1 } },
    async prepare(input) {
      assert.match(input.projectKey, /^[0-9a-f]{64}$/)
      assert.equal(input.query, 'bluewidget')
      calls++
      return { items: [{ handle: 'fixture-handle', providerId: 'memory', kind: 'reviewed-memory',
        text: 'Synthetic bluewidget reviewed fact.', reference: 'memory:fixture-source', recordedAt: '2026-01-01', score: 1, pinned: false }],
        async accept(handles) { assert.deepEqual(handles, ['fixture-handle']); accepted++ },
        async cancel() { canceled++ } }
    } })
  const handle = await ctx.agents.create({ sessionId: `brain-${process.env.BRAIN_PROBE_PHASE}`,
    meta: { cwd: process.env.BRAIN_PROBE_PROJECT }, agentOptions: { provider: 'brain-local-fixture', model: 'fixture' } })
  try {
    await handle.agent.whenIdle()
    handle.agent.followup(createUserMessage({ content: [{ type: 'text', text: 'bluewidget' }], source: { kind: 'user' } }))
    await handle.agent.whenIdle()
    const events = handle.agent.session.snapshotEvents()
    const recall = events.filter(event => event.type === 'user/message' && event.data.source.kind === 'plugin' && event.data.source.plugin === 'missher-brain')
    assert.equal(recall.length, 1)
    assert.equal(calls, 1)
    assert.equal(accepted, 1)
    assert.equal(canceled, 0)
    assert(events.some(event => event.type === 'assistant/message'))
    const text = recall[0].data.content[0].text
    assert(Buffer.byteLength(text) <= 4000)
    assert(text.includes('memory:fixture-source'))
    assert(JSON.stringify(seen).includes(text.replaceAll('\n', '\\n')) || JSON.stringify(seen).includes('memory:fixture-source'))
    assert.equal((await brain.snapshot()).providers[0].count, 1)
    await writeFile(process.env.BRAIN_PROBE_RESULT, JSON.stringify({ phase: process.env.BRAIN_PROBE_PHASE,
      installed: true, singleLoggedRecall: true, sourceAttributed: true, fixtureReceivedRecall: true,
      accepted, canceled, calls, bytes: Buffer.byteLength(text), externalRequests: 0 }))
  } finally {
    await handle.dispose()
    unregister()
    assert.equal(brain.listProviders().length, 0)
    unregisterAdapter()
  }
}
