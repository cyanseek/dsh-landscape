import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { createLandscapeTool } from '../src/plugin.mjs'
import { loadAliases, loadSnapshot } from '../src/snapshot.mjs'

test('real DSH 0.1.7-rc.2 executes, removes, and remounts the read-only preflight tool', async () => {
  const ctx = new Context()
  const prompt = await ctx.plugin(SystemPrompt)
  const tools = await ctx.plugin(ToolRuntime)
  const { snapshot } = await loadSnapshot({ offline: true })
  const aliases = await loadAliases()
  let dispose
  try {
    const definition = createLandscapeTool({
      loadSnapshot: async () => ({ snapshot }),
      loadAliases: async () => aliases,
      now: Date.parse(snapshot.generatedAt),
    })
    dispose = ctx.tools.register(definition)
    const input = { name: 'dsh_landscape', callId: ToolCallId('verify'), signal: new AbortController().signal,
      arguments: { need: 'browser automation', fresh: false } }
    const result = await ctx.tools.execute(input)
    assert.equal(result.isError, false, JSON.stringify(result))
    assert.equal(result.value.query, 'browser automation')
    assert.equal(typeof result.value.coverage.complete, 'boolean')
    dispose()
    assert.equal((await ctx.tools.execute(input)).isError, true)
    dispose = ctx.tools.register(definition)
    assert.equal((await ctx.tools.execute(input)).isError, false)
  } finally {
    dispose?.()
    await tools.dispose()
    await prompt.dispose()
  }
})
