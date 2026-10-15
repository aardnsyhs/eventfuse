import type {
  ComparisonRequest,
  RecoveryComparison,
} from "../domain/engine-api";
import {
  validateBaseline,
  validateCurrency,
  validateIncident,
  validateLimits,
  validateRecoveryOption,
  idIsValid,
  isRecord,
  shapeErrors,
} from "../domain/validation";
import { calculateScenario } from "./scenarios";
import { error, failure, success, type Result } from "./errors";

const ordinal = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const compareRecoveries = (
  request: ComparisonRequest,
): Result<RecoveryComparison> => {
  const shape = shapeErrors(
    request,
    [
      "baseline",
      "currency",
      "limits",
      "incident",
      "scenarioIds",
      "alternatives",
    ],
    [],
    "",
  );
  if (shape.length) return failure(...shape);
  const limits = validateLimits(request.limits);
  if (!limits.ok) return limits;
  const baseline = validateBaseline(request.baseline, "runnable", limits.value);
  if (!baseline.ok) return baseline;
  const currency = validateCurrency(request.currency);
  if (!currency.ok) return currency;
  const incident = validateIncident(request.incident, baseline.value);
  if (!incident.ok) return incident;
  if (!Array.isArray(request.alternatives))
    return failure(
      error("INVALID_SHAPE", "/alternatives", "Alternatives must be an array."),
    );
  if (request.alternatives.length === 0)
    return failure(
      error(
        "OUT_OF_RANGE",
        "/alternatives",
        "At least one alternative is required.",
      ),
    );
  if (request.alternatives.length > 3)
    return failure(
      error(
        "TOO_MANY_ALTERNATIVES",
        "/alternatives",
        "No more than three alternatives are supported.",
      ),
    );
  const ids = new Set<string>();
  for (const [index, option] of request.alternatives.entries()) {
    if (!isRecord(option) || !idIsValid(option.id))
      return failure(
        error(
          "INVALID_SHAPE",
          `/alternatives/${index}/id`,
          "Option must have a valid ID.",
        ),
      );
    if (ids.has(option.id))
      return failure(
        error(
          "DUPLICATE_ID",
          `/alternatives/${index}/id`,
          "Option IDs must be unique.",
          option.id,
        ),
      );
    ids.add(option.id);
    if (option.incidentId !== incident.value.id)
      return failure(
        error(
          "INCIDENT_MISMATCH",
          `/alternatives/${index}/incidentId`,
          "Option must reference the shared incident.",
          option.id,
        ),
      );
    if (option.currency !== request.currency)
      return failure(
        error(
          "CURRENCY_MISMATCH",
          `/alternatives/${index}/currency`,
          "Option must use the shared currency.",
          option.id,
        ),
      );
  }
  const scenarioShape = shapeErrors(
    request.scenarioIds,
    ["baseline", "incident", "recoveries"],
    [],
    "/scenarioIds",
  );
  if (scenarioShape.length) return failure(...scenarioShape);
  const recoveriesShape = shapeErrors(
    request.scenarioIds.recoveries,
    [...ids],
    [],
    "/scenarioIds/recoveries",
  );
  if (recoveriesShape.length) return failure(...recoveriesShape);
  const scenarioIds = [
    ["/scenarioIds/baseline", request.scenarioIds.baseline],
    ["/scenarioIds/incident", request.scenarioIds.incident],
    ...[...ids].map((id) => [
      `/scenarioIds/recoveries/${id.replace(/~/g, "~0").replace(/\//g, "~1")}`,
      request.scenarioIds.recoveries[id],
    ]),
  ];
  const seenScenarios = new Set<string>();
  for (const [path, id] of scenarioIds) {
    if (!idIsValid(id))
      return failure(
        error(
          "INVALID_TEXT",
          path,
          "Scenario ID must be a safe nonempty string.",
        ),
      );
    if (seenScenarios.has(id))
      return failure(
        error("DUPLICATE_ID", path, "Scenario IDs must be unique.", id),
      );
    seenScenarios.add(id);
  }
  const baselineRequest = {
    kind: "baseline" as const,
    baseline: baseline.value,
    currency: request.currency,
    limits: request.limits,
    scenarioId: request.scenarioIds.baseline,
  };
  const baselineResult = calculateScenario(baselineRequest);
  if (!baselineResult.ok) return baselineResult;
  const incidentRequest = {
    kind: "incident" as const,
    baseline: baseline.value,
    currency: request.currency,
    limits: request.limits,
    scenarioId: request.scenarioIds.incident,
    incident: incident.value,
  };
  const incidentResult = calculateScenario(incidentRequest);
  if (!incidentResult.ok) return incidentResult;
  const alternatives = request.alternatives
    .map((option, index) => {
      const optionValidation = validateRecoveryOption(
        option,
        baseline.value,
        incident.value,
        request.currency,
        request.limits,
        `/alternatives/${index}`,
      );
      if (!optionValidation.ok)
        return { recoveryOptionId: option.id, result: optionValidation };
      const scenarioId = request.scenarioIds.recoveries[option.id];
      if (!scenarioId)
        return {
          recoveryOptionId: option.id,
          result: failure(
            error(
              "INVALID_REFERENCE",
              `/scenarioIds/recoveries/${option.id}`,
              "Scenario ID is required.",
              option.id,
            ),
          ),
        };
      const calculated = calculateScenario({
        kind: "recovery",
        baseline: baseline.value,
        currency: request.currency,
        limits: request.limits,
        scenarioId,
        incident: incident.value,
        recovery: optionValidation.value,
      });
      return {
        recoveryOptionId: option.id,
        result: calculated.ok
          ? success(
              calculated.value.recovery as NonNullable<
                typeof calculated.value.recovery
              >,
            )
          : failure(
              ...calculated.errors.map((e) => ({
                ...e,
                path: e.path.replace(
                  /^\/recovery(?=\/|$)/,
                  `/alternatives/${index}`,
                ),
              })),
            ),
      };
    })
    .sort((a, b) => ordinal(a.recoveryOptionId, b.recoveryOptionId));
  return success(
    structuredClone({
      baseline: baselineResult.value.baseline,
      unmitigated: incidentResult.value.incident as NonNullable<
        typeof incidentResult.value.incident
      >,
      alternatives,
    }),
  );
};
