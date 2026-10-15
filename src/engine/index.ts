import type { ComparisonRequest, EngineRequest } from "../domain/engine-api";
import type {
  BaselineSnapshot,
  BriefMetadata,
  DecisionBrief,
  RecoveryCostDraft,
  ScenarioResult,
} from "../domain/types";
import { DEFAULT_LIMITS } from "../domain/types";
import {
  idIsValid,
  isRecord,
  parseRecoveryCost,
  shapeErrors,
  validateBaseline as validateSnapshot,
  validateIncident,
  validateLimits,
  validateCurrency,
  validateRecoveryOption,
} from "../domain/validation";
import { buildDecisionBrief as buildBrief } from "./brief";
import { compareRecoveries as compare } from "./compare";
import { calculateScenario } from "./scenarios";
import { error, failure, success, type Result } from "./errors";
export type { Result, ErrorCode, ValidationError } from "./errors";
export type * from "../domain/types";
export type * from "../domain/engine-api";

export const validateBaseline = (
  input: unknown,
  mode: "draft" | "runnable",
): Result<BaselineSnapshot> => validateSnapshot(input, mode);

export const validateRequest = (input: unknown): Result<EngineRequest> => {
  if (!isRecord(input))
    return failure(error("INVALID_SHAPE", "/", "Request must be an object."));
  if (
    input.kind !== "baseline" &&
    input.kind !== "incident" &&
    input.kind !== "recovery"
  )
    return failure(error("INVALID_SHAPE", "/kind", "Unknown request kind."));
  const required = [
    "kind",
    "baseline",
    "currency",
    "limits",
    "scenarioId",
    ...(input.kind !== "baseline" ? ["incident"] : []),
    ...(input.kind === "recovery" ? ["recovery"] : []),
  ];
  const shape = shapeErrors(input, required, [], "");
  if (shape.length) return failure(...shape);
  if (!idIsValid(input.scenarioId))
    return failure(
      error(
        "INVALID_TEXT",
        "/scenarioId",
        "Scenario ID must be a safe nonempty string.",
      ),
    );
  const limits = validateLimits(input.limits);
  if (!limits.ok) return limits;
  const baseline = validateSnapshot(input.baseline, "runnable", limits.value);
  if (!baseline.ok) return baseline;
  const currency = validateCurrency(input.currency as string);
  if (!currency.ok) return currency;
  if (input.kind !== "baseline") {
    const incident = validateIncident(input.incident, baseline.value);
    if (!incident.ok) return incident;
    if (incident.value.startDelayMinutes > limits.value.maxMinute)
      return failure(
        error(
          "OUT_OF_RANGE",
          "/incident/startDelayMinutes",
          "Delay exceeds the configured minute range.",
          incident.value.id,
        ),
      );
    if (input.kind === "recovery") {
      const recovery = validateRecoveryOption(
        input.recovery,
        baseline.value,
        incident.value,
        input.currency as string,
        limits.value,
      );
      if (!recovery.ok) return recovery;
    }
  }
  return success(structuredClone(input) as unknown as EngineRequest);
};

export const calculate = (request: EngineRequest): Result<ScenarioResult> => {
  const valid = validateRequest(request);
  if (!valid.ok) return valid;
  const result = calculateScenario(valid.value);
  return result.ok
    ? success(
        result.value.recovery ?? result.value.incident ?? result.value.baseline,
      )
    : result;
};

export const compareRecoveries = (request: ComparisonRequest) =>
  compare(request);
export const buildDecisionBrief = (
  request: ComparisonRequest,
  selectedRecoveryOptionId: string,
  metadata: BriefMetadata,
): Result<DecisionBrief> =>
  buildBrief(request, selectedRecoveryOptionId, metadata);
export { parseRecoveryCost, DEFAULT_LIMITS };
export type { RecoveryCostDraft };
