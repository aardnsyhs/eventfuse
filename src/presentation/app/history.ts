import type { WorkspaceDocument } from "@/application";
import { calculate } from "@/engine";
export function inspectBaseline(document: WorkspaceDocument, version: string) {
  const baseline = document.baselineVersions[version];
  if (!baseline) return null;
  return {
    baseline,
    result: calculate({
      kind: "baseline",
      baseline,
      currency: document.currency,
      limits: document.limits,
      scenarioId: `historical:${version}`,
    }),
  };
}
