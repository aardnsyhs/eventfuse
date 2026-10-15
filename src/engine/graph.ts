import type { Activity, BaselineSnapshot, Dependency, Id } from '../domain/types'
import { error, failure, success, type Result } from './errors'

const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0

export interface GraphData {
  readonly activitiesById: Readonly<Record<Id, Activity>>
  readonly dependenciesBySuccessor: Readonly<Record<Id, readonly Dependency[]>>
  readonly dependenciesByPredecessor: Readonly<Record<Id, readonly Dependency[]>>
  readonly topologicalOrder: readonly Id[]
}

export const validateGraph = (baseline: BaselineSnapshot): Result<GraphData> => {
  const activitiesById: Record<Id, Activity> = Object.create(null) as Record<Id, Activity>
  for (const activity of baseline.activities) activitiesById[activity.id] = activity
  const incoming: Record<Id, number> = Object.create(null) as Record<Id, number>
  const dependenciesBySuccessor: Record<Id, Dependency[]> = Object.create(null) as Record<Id, Dependency[]>
  const dependenciesByPredecessor: Record<Id, Dependency[]> = Object.create(null) as Record<Id, Dependency[]>
  for (const id of Object.keys(activitiesById)) { incoming[id] = 0; dependenciesBySuccessor[id] = []; dependenciesByPredecessor[id] = [] }
  for (const dependency of baseline.dependencies) {
    incoming[dependency.successorId] += 1
    dependenciesBySuccessor[dependency.successorId].push(dependency)
    dependenciesByPredecessor[dependency.predecessorId].push(dependency)
  }
  for (const deps of Object.values(dependenciesBySuccessor)) deps.sort((a, b) => ordinal(a.id, b.id))
  for (const deps of Object.values(dependenciesByPredecessor)) deps.sort((a, b) => ordinal(a.id, b.id))

  const ready = Object.keys(activitiesById).filter((id) => incoming[id] === 0).sort(ordinal)
  const topologicalOrder: Id[] = []
  while (ready.length > 0) {
    const id = ready.shift() as Id
    topologicalOrder.push(id)
    for (const dependency of dependenciesByPredecessor[id]) {
      incoming[dependency.successorId] -= 1
      if (incoming[dependency.successorId] === 0) {
        ready.push(dependency.successorId)
        ready.sort(ordinal)
      }
    }
  }
  if (topologicalOrder.length === baseline.activities.length) return success({ activitiesById, dependenciesBySuccessor, dependenciesByPredecessor, topologicalOrder })

  const unresolved = new Set(Object.keys(activitiesById).filter((id) => !topologicalOrder.includes(id)))
  const visiting = new Set<Id>()
  const visited = new Set<Id>()
  const path: Id[] = []
  let witness: Id[] = []
  const visit = (id: Id): boolean => {
    if (visiting.has(id)) { const index = path.indexOf(id); witness = [...path.slice(index), id]; return true }
    if (visited.has(id) || !unresolved.has(id)) return false
    visiting.add(id); path.push(id)
    for (const dependency of dependenciesByPredecessor[id]) if (visit(dependency.successorId)) return true
    path.pop(); visiting.delete(id); visited.add(id); return false
  }
  for (const id of [...unresolved].sort(ordinal)) if (visit(id)) break
  return failure(error('CYCLE', '/baseline/dependencies', 'Dependency graph contains a cycle.', null, witness))
}
