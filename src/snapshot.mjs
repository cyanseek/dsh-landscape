import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertValidSnapshot } from './schema.mjs'

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLED_SNAPSHOT = join(SOURCE_ROOT, 'data', 'snapshot.json')
const BUNDLED_ALIASES = join(SOURCE_ROOT, 'data', 'capability-aliases.json')
const REMOTE_SNAPSHOT = 'https://raw.githubusercontent.com/cyanseek/dsh-landscape/main/data/snapshot.json'
const SNAPSHOT_RESPONSE_LIMIT = 8_000_000

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function readResponseText(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Snapshot response is too large')
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error('Snapshot response is too large')
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks, total).toString('utf8')
}

async function fetchJson(url, timeoutMs = 1800) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json', 'user-agent': 'dsh-landscape/0.1.0' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} while loading snapshot`)
  return JSON.parse(await readResponseText(response, SNAPSHOT_RESPONSE_LIMIT))
}

function cachePath() {
  return join(homedir(), '.cache', 'dsh-landscape', 'snapshot-v1.json')
}

async function saveCache(snapshot) {
  const target = cachePath()
  const temporary = `${target}.tmp-${process.pid}`
  try {
    await mkdir(dirname(target), { recursive: true })
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, target)
  } catch {
    // Cache failure must never make the bundled fallback unusable.
  }
}

export async function loadAliases(path = BUNDLED_ALIASES) {
  const aliases = await readJson(path)
  if (aliases.schemaVersion !== '1.0.0' || !Array.isArray(aliases.capabilities)) {
    throw new Error('Invalid capability alias map')
  }
  return aliases
}

export async function loadSnapshot(options = {}) {
  const source = options.source ?? options.snapshot
  const offline = options.offline ?? process.env.DSH_LANDSCAPE_OFFLINE === '1'

  if (source) {
    const snapshot = /^https?:\/\//i.test(source)
      ? await fetchJson(source, options.timeoutMs ?? 5000)
      : await readJson(isAbsolute(source) ? source : resolve(process.cwd(), source))
    return { snapshot: assertValidSnapshot(snapshot), provenance: source }
  }

  if (!offline) {
    try {
      const snapshot = assertValidSnapshot(await fetchJson(REMOTE_SNAPSHOT, options.timeoutMs))
      await saveCache(snapshot)
      return { snapshot, provenance: REMOTE_SNAPSHOT }
    } catch {
      try {
        const snapshot = assertValidSnapshot(await readJson(cachePath()))
        return { snapshot, provenance: cachePath() }
      } catch {
        // Fall through to the bundled known-good snapshot.
      }
    }
  }

  const snapshot = assertValidSnapshot(await readJson(BUNDLED_SNAPSHOT))
  return { snapshot, provenance: BUNDLED_SNAPSHOT }
}

export function snapshotFreshness(snapshot, now = Date.now()) {
  const ageHours = Math.max(0, (now - Date.parse(snapshot.generatedAt)) / 3_600_000)
  const staleAfterHours = Number(snapshot.coverage?.staleAfterHours ?? 24)
  return {
    generatedAt: snapshot.generatedAt,
    ageHours: Math.round(ageHours * 10) / 10,
    staleAfterHours,
    fresh: ageHours <= staleAfterHours,
  }
}
