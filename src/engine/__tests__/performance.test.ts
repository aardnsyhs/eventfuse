/// <reference types="node" />
import { createHash } from 'node:crypto'
import { cpus, platform, release, arch } from 'node:os'
import { version, stdout } from 'node:process'
import { expect, it } from 'vitest'
import { calculate } from '../index'
import { generatedDag } from './fixtures'

it('measures the public engine on a reproducible 50-activity branched DAG', () => {
  const baseline = generatedDag(50, 2026)
  const request = { ...baseline, kind: 'incident' as const, incident: { id: 'benchmark-incident', eventId: baseline.baseline.event.id, baselineVersion: baseline.baseline.baselineVersion, title: 'Benchmark delay', description: null, targetActivityId: 'a000', startDelayMinutes: 240, createdAt: baseline.baseline.event.createdAt } }
  for (let i = 0; i < 100; i++) if (!calculate(request).ok) throw new Error('Benchmark input invalid')
  const timings: number[] = []
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    const result = calculate(request)
    timings.push(performance.now() - start)
    if (!result.ok) throw new Error('Benchmark calculation failed')
  }
  timings.sort((a, b) => a - b)
  expect(calculate(request).ok).toBe(true)
  stdout.write(JSON.stringify({ benchmark: '50-activity-incident', seed: 2026, activities: 50, dependencies: request.baseline.dependencies.length, datasetSha256: createHash('sha256').update(JSON.stringify(request)).digest('hex'), warmupRuns: 100, measuredRuns: 1000, node: version, os: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0]?.model, logicalCpus: cpus().length, p50Ms: timings[499], p95Ms: timings[949], maxMs: timings[999], scope: 'Public calculate including validation, baseline and incident schedules and explanations; Node runtime, excluding rendering/storage.' }) + '\n')
})
