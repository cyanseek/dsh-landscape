import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('..', import.meta.url)
const [pages, refresh] = await Promise.all([
  readFile(new URL('.github/workflows/pages.yml', root), 'utf8'),
  readFile(new URL('.github/workflows/refresh-landscape.yml', root), 'utf8'),
])

test('successful snapshot refreshes trigger a Pages deployment from the latest main commit', () => {
  assert.match(refresh, /^name: Refresh landscape$/m)
  assert.match(pages, /\n  workflow_run:\n    workflows: \["Refresh landscape"\]\n    types: \[completed\]\n    branches: \[main\]/)
  assert.match(pages, /if: \$\{\{ github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion == 'success' \}\}/)
  assert.match(pages, /\n  workflow_dispatch:\n/)
  assert.match(pages, /uses: actions\/checkout@v7/)
})
