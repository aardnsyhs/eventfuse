import type { ComparisonRequest } from "../domain/engine-api";
import type { BriefMetadata, DecisionBrief } from "../domain/types";
import { validateBriefMetadata } from "../domain/validation";
import { compareRecoveries } from "./compare";
import { error, failure, success, type Result } from "./errors";

export const buildDecisionBrief = (
  request: ComparisonRequest,
  selectedRecoveryOptionId: string,
  metadata: BriefMetadata,
): Result<DecisionBrief> => {
  const validMetadata = validateBriefMetadata(metadata);
  if (!validMetadata.ok) return validMetadata;
  const comparison = compareRecoveries(request);
  if (!comparison.ok) return comparison;
  if (request.alternatives.filter((o) => o.status === "selected").length !== 1)
    return failure(
      error(
        "SELECTION_MISMATCH",
        "/alternatives",
        "Exactly one option must have selected status.",
      ),
    );
  const selected = request.alternatives.find(
    (option) => option.id === selectedRecoveryOptionId,
  );
  if (!selected)
    return failure(
      error(
        "SELECTION_MISMATCH",
        "/selectedRecoveryOptionId",
        "Selected option is not part of the comparison.",
        selectedRecoveryOptionId,
      ),
    );
  if (selected.status !== "selected")
    return failure(
      error(
        "SELECTION_MISMATCH",
        "/alternatives",
        "Selected option must have selected status.",
        selected.id,
      ),
    );
  const selectedResult = comparison.value.alternatives.find(
    (alternative) => alternative.recoveryOptionId === selected.id,
  )?.result;
  if (!selectedResult?.ok)
    return failure(
      error(
        "SELECTION_MISMATCH",
        "/alternatives",
        "Selected option must calculate successfully.",
        selected.id,
      ),
    );
  const snapshots = comparison.value.alternatives.filter(
    (
      alternative,
    ): alternative is typeof alternative & {
      result: { ok: true; value: NonNullable<typeof selectedResult.value> };
    } => alternative.result.ok,
  );
  const incident = request.incident;
  const createdAt = metadata.createdAt;
  const brief: DecisionBrief = {
    id: metadata.id,
    eventId: request.baseline.event.id,
    incidentId: incident.id,
    selectedRecoveryOptionId: selected.id,
    baselineVersion: request.baseline.baselineVersion,
    authorLabel: metadata.authorLabel,
    createdAt,
    eventSnapshot: request.baseline.event,
    incidentSnapshot: incident,
    recoverySnapshot: selected,
    comparisonOptionSnapshots: snapshots.map(
      (snapshot) =>
        request.alternatives.find(
          (option) => option.id === snapshot.recoveryOptionId,
        )!,
    ),
    comparisonResultSnapshots: snapshots.map(
      (snapshot) => snapshot.result.value,
    ),
    baselineSnapshot: comparison.value.baseline,
    unmitigatedSnapshot: comparison.value.unmitigated,
    scenarioSnapshot: selectedResult.value,
    assumptionsAndConstraints: metadata.assumptionsAndConstraints,
    nextActions: metadata.nextActions,
    hypothetical: true,
    approvalDisclaimer:
      "Hypothetical simulation. Operational validation is required. Selection does not authorize work; pending approvals remain outstanding.",
  };
  return success(structuredClone(brief));
};
