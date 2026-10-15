import type {
  Activity,
  BaselineSnapshot,
  BriefMetadata,
  CurrencyCode,
  Dependency,
  EngineLimits,
  Incident,
  RecoveryCostDraft,
  RecoveryOption,
} from "./types";
import { DEFAULT_LIMITS } from "./types";
import { currencyExponent } from "./currency";
import { error, failure, success, type Result } from "../engine/errors";
import { validateGraph } from "../engine/graph";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);
const has = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);
const isSafeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value);
export const idIsValid = (value: unknown): value is string =>
  isString(value) &&
  value.length > 0 &&
  !["__proto__", "constructor", "prototype"].includes(value);
export const isIsoInstant = (value: unknown): value is string =>
  isString(value) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() ===
    value.replace(
      /(?:\.(\d{1,3}))?Z$/,
      (_, digits: string | undefined) => `.${(digits ?? "").padEnd(3, "0")}Z`,
    );
const isIsoDate = (value: unknown): value is string =>
  isString(value) &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const isTimezone = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
};
const arrayOf = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value) &&
  Array.from(value).every((_, index) =>
    Object.prototype.hasOwnProperty.call(value, index),
  );

export const shapeErrors = (
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): ReturnType<typeof error>[] => {
  if (!isRecord(value))
    return [error("INVALID_SHAPE", path, "Value must be an object.")];
  const allowed = new Set([...required, ...optional]);
  return [
    ...required
      .filter((key) => !has(value, key))
      .map((key) =>
        error(
          "INVALID_SHAPE",
          `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`,
          "Required field is missing.",
        ),
      ),
    ...Object.keys(value)
      .filter((key) => !allowed.has(key))
      .map((key) =>
        error(
          "INVALID_SHAPE",
          `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`,
          "Unexpected field.",
        ),
      ),
  ];
};
const textErrors = (
  value: unknown,
  path: string,
  maximum: number,
  nullable = false,
): ReturnType<typeof error>[] =>
  (nullable && value === null) || (isString(value) && value.length <= maximum)
    ? []
    : [
        error(
          "INVALID_TEXT",
          path,
          "Text exceeds its limit or has an invalid type.",
        ),
      ];
const notesErrors = (
  value: unknown,
  path: string,
): ReturnType<typeof error>[] => {
  if (!Array.isArray(value))
    return [error("INVALID_SHAPE", path, "Expected a text array.")];
  if (value.length > 100)
    return [error("LIMIT_EXCEEDED", path, "Too many text items.")];
  return Array.from(value).flatMap((item, index) =>
    textErrors(item, `${path}/${index}`, 2000),
  );
};

const duplicateErrors = (
  values: readonly string[],
  path: string,
): ReturnType<typeof error>[] => {
  const seen = new Set<string>();
  const errors: ReturnType<typeof error>[] = [];
  values.forEach((value, index) => {
    if (seen.has(value))
      errors.push(
        error(
          "DUPLICATE_ID",
          `${path}/${index}/id`,
          "Identifier must be unique.",
          value,
        ),
      );
    seen.add(value);
  });
  return errors;
};

const validateEvent = (
  value: unknown,
  path: string,
): Result<BaselineSnapshot["event"]> => {
  if (!isRecord(value))
    return failure(error("INVALID_SHAPE", path, "Event must be an object."));
  const required = [
    "id",
    "name",
    "description",
    "date",
    "timezone",
    "location",
    "referenceInstant",
    "createdAt",
    "updatedAt",
    "schemaVersion",
  ];
  const errors = shapeErrors(value, required, [], path);
  if (errors.length) return failure(...errors);
  if (!idIsValid(value.id))
    errors.push(
      error(
        "INVALID_TEXT",
        `${path}/id`,
        "ID must be a non-empty safe string.",
      ),
    );
  if (!isString(value.name) || value.name.trim().length === 0)
    errors.push(
      error("INVALID_TEXT", `${path}/name`, "Name must not be blank."),
    );
  if (!isNullableString(value.description) || !isNullableString(value.location))
    errors.push(
      error("INVALID_SHAPE", path, "Nullable text field is invalid."),
    );
  if (!isIsoDate(value.date))
    errors.push(
      error("INVALID_DATE", `${path}/date`, "Date must be a valid ISO date."),
    );
  if (!isTimezone(value.timezone))
    errors.push(
      error(
        "INVALID_TIMEZONE",
        `${path}/timezone`,
        "Timezone must be a known IANA timezone.",
      ),
    );
  if (
    !isIsoInstant(value.referenceInstant) ||
    Date.parse(value.referenceInstant) % 60000 !== 0
  )
    errors.push(
      error(
        "INVALID_DATE",
        `${path}/referenceInstant`,
        "Reference instant must be minute-aligned UTC.",
      ),
    );
  if (!isIsoInstant(value.createdAt) || !isIsoInstant(value.updatedAt))
    errors.push(
      error(
        "INVALID_DATE",
        path,
        "Audit timestamps must be valid UTC instants.",
      ),
    );
  if (
    isIsoInstant(value.createdAt) &&
    isIsoInstant(value.updatedAt) &&
    Date.parse(value.updatedAt) < Date.parse(value.createdAt)
  )
    errors.push(
      error(
        "INVALID_DATE",
        `${path}/updatedAt`,
        "Updated time must not precede created time.",
      ),
    );
  errors.push(
    ...textErrors(value.name, `${path}/name`, 200),
    ...textErrors(value.description, `${path}/description`, 10000, true),
    ...textErrors(value.location, `${path}/location`, 10000, true),
  );
  if (value.schemaVersion !== 1)
    errors.push(
      error(
        "UNSUPPORTED_SCHEMA",
        `${path}/schemaVersion`,
        "Only schema version 1 is supported.",
      ),
    );
  return errors.length
    ? failure(...errors)
    : success(value as unknown as BaselineSnapshot["event"]);
};

const validateActivity = (
  value: unknown,
  index: number,
  eventId: string,
  limits: EngineLimits,
): ReturnType<typeof success<Activity>> | ReturnType<typeof failure> => {
  const path = `/baseline/activities/${index}`;
  if (!isRecord(value))
    return failure(error("INVALID_SHAPE", path, "Activity must be an object."));
  const required = [
    "id",
    "eventId",
    "name",
    "ownerName",
    "earliestStartMinute",
    "durationMinutes",
    "classification",
    "notes",
    "isMilestone",
  ];
  const errors = shapeErrors(value, required, [], path);
  if (errors.length) return failure(...errors);
  if (!idIsValid(value.id))
    errors.push(
      error(
        "INVALID_TEXT",
        `${path}/id`,
        "ID must be a non-empty safe string.",
      ),
    );
  if (value.eventId !== eventId)
    errors.push(
      error(
        "EVENT_MISMATCH",
        `${path}/eventId`,
        "Activity belongs to another event.",
        String(value.id),
      ),
    );
  if (!isString(value.name) || value.name.trim().length === 0)
    errors.push(
      error("INVALID_TEXT", `${path}/name`, "Name must not be blank."),
    );
  if (!isNullableString(value.ownerName) || !isNullableString(value.notes))
    errors.push(
      error("INVALID_SHAPE", path, "Nullable text field is invalid."),
    );
  for (const [key, numberValue] of [
    ["earliestStartMinute", value.earliestStartMinute],
    ["durationMinutes", value.durationMinutes],
  ] as const) {
    if (!isSafeInteger(numberValue))
      errors.push(
        error(
          "INVALID_NUMBER",
          `${path}/${key}`,
          "Value must be a safe integer.",
        ),
      );
    else if (numberValue < 0 || numberValue > limits.maxMinute)
      errors.push(
        error(
          "OUT_OF_RANGE",
          `${path}/${key}`,
          "Value is outside the configured minute range.",
          String(value.id),
        ),
      );
  }
  errors.push(
    ...textErrors(value.name, `${path}/name`, 200),
    ...textErrors(value.ownerName, `${path}/ownerName`, 200, true),
    ...textErrors(value.notes, `${path}/notes`, 10000, true),
  );
  if (
    !isString(value.classification) ||
    !["normal", "approval_required", "protected"].includes(value.classification)
  )
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/classification`,
        "Unknown activity classification.",
      ),
    );
  if (typeof value.isMilestone !== "boolean")
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/isMilestone`,
        "Milestone flag must be boolean.",
      ),
    );
  if (value.isMilestone === true && value.durationMinutes !== 0)
    errors.push(
      error(
        "MILESTONE_DURATION",
        `${path}/durationMinutes`,
        "Milestones must have zero duration.",
        String(value.id),
      ),
    );
  return errors.length
    ? failure(...errors)
    : success(value as unknown as Activity);
};

const validateDependency = (
  value: unknown,
  index: number,
  eventId: string,
  activityIds: Set<string>,
  limits: EngineLimits,
): ReturnType<typeof success<Dependency>> | ReturnType<typeof failure> => {
  const path = `/baseline/dependencies/${index}`;
  if (!isRecord(value))
    return failure(
      error("INVALID_SHAPE", path, "Dependency must be an object."),
    );
  const required = [
    "id",
    "eventId",
    "predecessorId",
    "successorId",
    "type",
    "lagMinutes",
  ];
  const errors = shapeErrors(value, required, [], path);
  if (errors.length) return failure(...errors);
  if (!idIsValid(value.id))
    errors.push(
      error(
        "INVALID_TEXT",
        `${path}/id`,
        "ID must be a non-empty safe string.",
      ),
    );
  if (value.eventId !== eventId)
    errors.push(
      error(
        "EVENT_MISMATCH",
        `${path}/eventId`,
        "Dependency belongs to another event.",
        String(value.id),
      ),
    );
  for (const [key, id] of [
    ["predecessorId", value.predecessorId],
    ["successorId", value.successorId],
  ] as const)
    if (!idIsValid(id) || !activityIds.has(id))
      errors.push(
        error(
          "INVALID_REFERENCE",
          `${path}/${key}`,
          "Activity reference does not exist.",
          String(value.id),
          [String(id)],
        ),
      );
  if (value.predecessorId === value.successorId)
    errors.push(
      error(
        "SELF_DEPENDENCY",
        path,
        "An activity cannot depend on itself.",
        String(value.id),
        [String(value.predecessorId)],
      ),
    );
  if (value.type !== "finish_to_start")
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/type`,
        "Only finish-to-start dependencies are supported.",
      ),
    );
  if (!isSafeInteger(value.lagMinutes))
    errors.push(
      error(
        "INVALID_NUMBER",
        `${path}/lagMinutes`,
        "Lag must be a safe integer.",
      ),
    );
  else if (value.lagMinutes < 0 || value.lagMinutes > limits.maxMinute)
    errors.push(
      error(
        "OUT_OF_RANGE",
        `${path}/lagMinutes`,
        "Lag is outside the configured range.",
        String(value.id),
      ),
    );
  return errors.length
    ? failure(...errors)
    : success(value as unknown as Dependency);
};

const validateMilestone = (
  value: unknown,
  index: number,
  eventId: string,
  activityIds: Set<string>,
  limits: EngineLimits,
):
  | ReturnType<typeof success<BaselineSnapshot["milestones"][number]>>
  | ReturnType<typeof failure> => {
  const path = `/baseline/milestones/${index}`;
  if (!isRecord(value))
    return failure(
      error("INVALID_SHAPE", path, "Milestone must be an object."),
    );
  const required = ["id", "eventId", "activityId", "deadlineMinute", "label"];
  const errors = shapeErrors(value, required, [], path);
  if (errors.length) return failure(...errors);
  if (!idIsValid(value.id))
    errors.push(
      error(
        "INVALID_TEXT",
        `${path}/id`,
        "ID must be a non-empty safe string.",
      ),
    );
  if (value.eventId !== eventId)
    errors.push(
      error(
        "EVENT_MISMATCH",
        `${path}/eventId`,
        "Milestone belongs to another event.",
        String(value.id),
      ),
    );
  if (!idIsValid(value.activityId) || !activityIds.has(value.activityId))
    errors.push(
      error(
        "INVALID_REFERENCE",
        `${path}/activityId`,
        "Activity reference does not exist.",
        String(value.id),
        [String(value.activityId)],
      ),
    );
  if (!isSafeInteger(value.deadlineMinute))
    errors.push(
      error(
        "INVALID_NUMBER",
        `${path}/deadlineMinute`,
        "Deadline must be a safe integer.",
      ),
    );
  else if (value.deadlineMinute < 0 || value.deadlineMinute > limits.maxMinute)
    errors.push(
      error(
        "OUT_OF_RANGE",
        `${path}/deadlineMinute`,
        "Deadline is outside the configured range.",
      ),
    );
  errors.push(...textErrors(value.label, `${path}/label`, 200));
  if (!isString(value.label) || value.label.trim().length === 0)
    errors.push(
      error("INVALID_TEXT", `${path}/label`, "Label must not be blank."),
    );
  return errors.length
    ? failure(...errors)
    : success(value as unknown as BaselineSnapshot["milestones"][number]);
};

export const validateBaseline = (
  input: unknown,
  mode: "draft" | "runnable",
  limits: EngineLimits = DEFAULT_LIMITS,
): Result<BaselineSnapshot> => {
  if (!isRecord(input))
    return failure(
      error("INVALID_SHAPE", "/baseline", "Baseline must be an object."),
    );
  const limitResult = validateLimits(limits);
  if (!limitResult.ok) return limitResult;
  const errors = shapeErrors(
    input,
    ["baselineVersion", "event", "activities", "dependencies", "milestones"],
    [],
    "/baseline",
  );
  if (errors.length) return failure(...errors);
  if (!["draft", "runnable"].includes(mode))
    return failure(error("INVALID_SHAPE", "/mode", "Unknown validation mode."));
  if (!idIsValid(input.baselineVersion))
    errors.push(
      error(
        "INVALID_TEXT",
        "/baseline/baselineVersion",
        "Baseline version must be a non-empty safe string.",
      ),
    );
  const eventResult = validateEvent(input.event, "/baseline/event");
  if (!eventResult.ok) return failure(...errors, ...eventResult.errors);
  const eventId = eventResult.ok ? eventResult.value.id : "";
  if (!arrayOf(input.activities))
    return failure(
      error("INVALID_SHAPE", "/baseline/activities", "Expected an array."),
    );
  if (input.activities.length > limits.maxActivities)
    errors.push(
      error(
        "LIMIT_EXCEEDED",
        "/baseline/activities",
        "Activity limit exceeded.",
      ),
    );
  if (!arrayOf(input.dependencies))
    return failure(
      error("INVALID_SHAPE", "/baseline/dependencies", "Expected an array."),
    );
  if (input.dependencies.length > limits.maxDependencies)
    errors.push(
      error(
        "LIMIT_EXCEEDED",
        "/baseline/dependencies",
        "Dependency limit exceeded.",
      ),
    );
  if (errors.some((e) => e.code === "LIMIT_EXCEEDED"))
    return failure(...errors);
  if (!arrayOf(input.milestones))
    return failure(
      error("INVALID_SHAPE", "/baseline/milestones", "Expected an array."),
    );
  if (input.milestones.length > limits.maxMilestones)
    errors.push(
      error(
        "LIMIT_EXCEEDED",
        "/baseline/milestones",
        "Milestone limit exceeded.",
      ),
    );
  if (errors.length) return failure(...errors);
  const activities = arrayOf(input.activities)
    ? input.activities.map((value, index) =>
        validateActivity(value, index, eventId, limits),
      )
    : [];
  for (const result of activities)
    if (!result.ok) errors.push(...result.errors);
  const activityValues = activities
    .filter((result): result is { ok: true; value: Activity } => result.ok)
    .map((result) => result.value);
  errors.push(
    ...duplicateErrors(
      activityValues.map((activity) => activity.id),
      "/baseline/activities",
    ),
  );
  if (errors.length) return failure(...errors);
  const activityIds = new Set(activityValues.map((activity) => activity.id));
  const dependencies = arrayOf(input.dependencies)
    ? input.dependencies.map((value, index) =>
        validateDependency(value, index, eventId, activityIds, limits),
      )
    : [];
  for (const result of dependencies)
    if (!result.ok) errors.push(...result.errors);
  const dependencyValues = dependencies
    .filter((result): result is { ok: true; value: Dependency } => result.ok)
    .map((result) => result.value);
  errors.push(
    ...duplicateErrors(
      dependencyValues.map((dependency) => dependency.id),
      "/baseline/dependencies",
    ),
  );
  const pairs = new Set<string>();
  dependencyValues.forEach((dependency, index) => {
    const pair = JSON.stringify([
      dependency.predecessorId,
      dependency.successorId,
    ]);
    if (pairs.has(pair))
      errors.push(
        error(
          "DUPLICATE_DEPENDENCY",
          `/baseline/dependencies/${index}`,
          "Dependency pair must be unique.",
          dependency.id,
        ),
      );
    pairs.add(pair);
  });
  const milestones = arrayOf(input.milestones)
    ? input.milestones.map((value, index) =>
        validateMilestone(value, index, eventId, activityIds, limits),
      )
    : [];
  for (const result of milestones)
    if (!result.ok) errors.push(...result.errors);
  const milestoneValues = milestones
    .filter(
      (
        result,
      ): result is {
        ok: true;
        value: BaselineSnapshot["milestones"][number];
      } => result.ok,
    )
    .map((result) => result.value);
  errors.push(
    ...duplicateErrors(
      milestoneValues.map((milestone) => milestone.id),
      "/baseline/milestones",
    ),
  );
  if (mode === "runnable" && activityValues.length === 0)
    errors.push(
      error(
        "OUT_OF_RANGE",
        "/baseline/activities",
        "Runnable baseline needs at least one activity.",
      ),
    );
  if (mode === "runnable" && milestoneValues.length === 0)
    errors.push(
      error(
        "OUT_OF_RANGE",
        "/baseline/milestones",
        "Runnable baseline needs at least one critical milestone.",
      ),
    );
  if (errors.length) return failure(...errors);
  const baseline: BaselineSnapshot = {
    baselineVersion: input.baselineVersion as string,
    event: eventResult.ok
      ? eventResult.value
      : (() => {
          throw new Error("unreachable");
        })(),
    activities: activityValues,
    dependencies: dependencyValues,
    milestones: milestoneValues,
  };
  const graphResult = validateGraph(baseline);
  return graphResult.ok ? success(baseline) : failure(...graphResult.errors);
};

export const validateCurrency = (
  currency: CurrencyCode,
  path = "/currency",
): Result<number> => {
  const exponent = currencyExponent(currency);
  return exponent === null
    ? failure(error("UNKNOWN_CURRENCY", path, "Currency is not supported."))
    : success(exponent);
};

export const parseRecoveryCost = (
  input: RecoveryCostDraft,
  currency: CurrencyCode,
): Result<number | null> => {
  const currencyResult = validateCurrency(currency);
  if (!currencyResult.ok) return currencyResult;
  if (
    !isRecord(input) ||
    (input.kind !== "not_entered" && input.kind !== "editing")
  )
    return failure(error("INVALID_SHAPE", "/costDraft", "Invalid cost draft."));
  const shape = shapeErrors(
    input,
    input.kind === "editing" ? ["kind", "text"] : ["kind"],
    [],
    "/costDraft",
  );
  if (shape.length) return failure(...shape);
  if (input.kind === "editing" && !isString(input.text))
    return failure(
      error("INVALID_SHAPE", "/costDraft/text", "Cost text must be a string."),
    );
  if (input.kind === "not_entered" || input.text.trim() === "")
    return success(null);
  const text = input.text.trim();
  const exponent = currencyResult.value;
  if (
    /^-\d+(?:\.\d+)?$/.test(text) ||
    (/^\d+(?:\.\d+)?$/.test(text) &&
      (text.split(".")[1]?.length ?? 0) > exponent)
  )
    return failure(
      error(
        "OUT_OF_RANGE",
        "/costDraft/text",
        "Negative cost or excessive currency precision.",
      ),
    );
  const pattern =
    exponent === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.(\\d{1,${exponent}}))?$`);
  if (!pattern.test(text))
    return failure(
      error(
        "INVALID_NUMBER",
        "/costDraft/text",
        "Cost must be a non-negative decimal amount.",
      ),
    );
  const [whole, fraction = ""] = text.split(".");
  const minorText = `${whole}${fraction.padEnd(exponent, "0")}`;
  const amount = Number(minorText);
  return Number.isSafeInteger(amount)
    ? success(amount)
    : failure(
        error(
          "OUT_OF_RANGE",
          "/costDraft/text",
          "Cost exceeds the safe integer range.",
        ),
      );
};

export const validateIncident = (
  value: unknown,
  baseline: BaselineSnapshot,
  path = "/incident",
): Result<Incident> => {
  if (!isRecord(value))
    return failure(error("INVALID_SHAPE", path, "Incident must be an object."));
  const errors = shapeErrors(
    value,
    [
      "id",
      "eventId",
      "baselineVersion",
      "title",
      "description",
      "targetActivityId",
      "startDelayMinutes",
      "createdAt",
    ],
    [],
    path,
  );
  if (errors.length) return failure(...errors);
  if (!idIsValid(value.id))
    errors.push(error("INVALID_TEXT", `${path}/id`, "ID is invalid."));
  if (value.eventId !== baseline.event.id)
    errors.push(
      error(
        "EVENT_MISMATCH",
        `${path}/eventId`,
        "Incident belongs to another event.",
        String(value.id),
      ),
    );
  if (value.baselineVersion !== baseline.baselineVersion)
    errors.push(
      error(
        "STALE_BASELINE",
        `${path}/baselineVersion`,
        "Incident references another baseline revision.",
        String(value.id),
        [String(value.baselineVersion), baseline.baselineVersion],
      ),
    );
  if (!isString(value.title) || value.title.trim() === "")
    errors.push(
      error("INVALID_TEXT", `${path}/title`, "Title must not be blank."),
    );
  if (!isNullableString(value.description))
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/description`,
        "Description must be text or null.",
      ),
    );
  if (
    !idIsValid(value.targetActivityId) ||
    !baseline.activities.some(
      (activity) => activity.id === value.targetActivityId,
    )
  )
    errors.push(
      error(
        "INVALID_REFERENCE",
        `${path}/targetActivityId`,
        "Incident target does not exist.",
        String(value.id),
        [String(value.targetActivityId)],
      ),
    );
  if (!isSafeInteger(value.startDelayMinutes))
    errors.push(
      error(
        "INVALID_NUMBER",
        `${path}/startDelayMinutes`,
        "Delay must be a safe integer.",
      ),
    );
  else if (value.startDelayMinutes < 0)
    errors.push(
      error(
        "OUT_OF_RANGE",
        `${path}/startDelayMinutes`,
        "Delay cannot be negative.",
      ),
    );
  errors.push(
    ...textErrors(value.title, `${path}/title`, 200),
    ...textErrors(value.description, `${path}/description`, 10000, true),
  );
  if (!isIsoInstant(value.createdAt))
    errors.push(
      error(
        "INVALID_DATE",
        `${path}/createdAt`,
        "Created time must be a valid UTC instant.",
      ),
    );
  return errors.length
    ? failure(...errors)
    : success(value as unknown as Incident);
};

export const validateRecoveryOption = (
  value: unknown,
  baseline: BaselineSnapshot,
  incident: Incident,
  currency: CurrencyCode,
  limits: EngineLimits,
  path = "/recovery",
): Result<RecoveryOption> => {
  if (!isRecord(value))
    return failure(
      error("INVALID_SHAPE", path, "Recovery option must be an object."),
    );
  const errors = shapeErrors(
    value,
    [
      "id",
      "incidentId",
      "name",
      "description",
      "costMinorUnits",
      "currency",
      "modifications",
      "approvalStatus",
      "assumptionNotes",
      "status",
    ],
    ["approvalRequirements", "approvalContext"],
    path,
  );
  if (errors.length) return failure(...errors);
  if (!idIsValid(value.id))
    errors.push(error("INVALID_TEXT", `${path}/id`, "ID is invalid."));
  if (value.incidentId !== incident.id)
    errors.push(
      error(
        "INCIDENT_MISMATCH",
        `${path}/incidentId`,
        "Option references another incident.",
        String(value.id),
      ),
    );
  if (!isString(value.name) || value.name.trim() === "")
    errors.push(
      error("INVALID_TEXT", `${path}/name`, "Name must not be blank."),
    );
  if (!isNullableString(value.description))
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/description`,
        "Description must be text or null.",
      ),
    );
  if (value.costMinorUnits !== null && !isSafeInteger(value.costMinorUnits))
    errors.push(
      error(
        "INVALID_NUMBER",
        `${path}/costMinorUnits`,
        "Cost must be a safe integer or null.",
        String(value.id),
      ),
    );
  else if (typeof value.costMinorUnits === "number" && value.costMinorUnits < 0)
    errors.push(
      error(
        "OUT_OF_RANGE",
        `${path}/costMinorUnits`,
        "Cost must be null or a non-negative safe integer.",
        String(value.id),
      ),
    );
  if (value.currency !== currency)
    errors.push(
      error(
        "CURRENCY_MISMATCH",
        `${path}/currency`,
        "Option currency must match the request currency.",
        String(value.id),
      ),
    );
  errors.push(
    ...textErrors(value.name, `${path}/name`, 200),
    ...textErrors(value.description, `${path}/description`, 10000, true),
    ...notesErrors(value.assumptionNotes, `${path}/assumptionNotes`),
  );
  if (has(value, "approvalContext"))
    errors.push(
      ...textErrors(
        value.approvalContext,
        `${path}/approvalContext`,
        10000,
        true,
      ),
    );
  if (has(value, "approvalRequirements")) {
    if (!Array.isArray(value.approvalRequirements))
      errors.push(
        error(
          "INVALID_SHAPE",
          `${path}/approvalRequirements`,
          "Approval requirements must be an array.",
        ),
      );
    else if (value.approvalRequirements.length > 100)
      errors.push(
        error(
          "LIMIT_EXCEEDED",
          `${path}/approvalRequirements`,
          "Too many approval requirements.",
        ),
      );
    else
      Array.from(value.approvalRequirements).forEach((item, index) => {
        const p = `${path}/approvalRequirements/${index}`;
        const shape = shapeErrors(item, ["approverLabel", "condition"], [], p);
        errors.push(...shape);
        if (!shape.length && isRecord(item))
          errors.push(
            ...textErrors(item.approverLabel, `${p}/approverLabel`, 200),
            ...textErrors(item.condition, `${p}/condition`, 2000),
          );
      });
  }
  const costRequirements = Array.isArray(value.approvalRequirements)
    ? value.approvalRequirements
    : [];
  if (
    !arrayOf(value.modifications) ||
    value.modifications.length > limits.maxModifications
  )
    errors.push(
      error(
        "LIMIT_EXCEEDED",
        `${path}/modifications`,
        "Modification limit exceeded.",
        String(value.id),
      ),
    );
  const seen = new Set<string>();
  if (Array.isArray(value.modifications))
    value.modifications.forEach((mod, index) => {
      if (!isRecord(mod)) {
        errors.push(
          error(
            "INVALID_SHAPE",
            `${path}/modifications/${index}`,
            "Modification must be an object.",
          ),
        );
        return;
      }
      const shape = shapeErrors(
        mod,
        ["activityId", "field", "operation", "valueMinutes"],
        [],
        `${path}/modifications/${index}`,
      );
      if (shape.length) {
        errors.push(...shape);
        return;
      }
      const key = JSON.stringify([mod.activityId, mod.field]);
      if (seen.has(key))
        errors.push(
          error(
            "DUPLICATE_MODIFICATION",
            `${path}/modifications/${index}`,
            "Each activity and field may be modified once.",
            String(mod.activityId),
          ),
        );
      seen.add(key);
      if (
        !baseline.activities.some((activity) => activity.id === mod.activityId)
      )
        errors.push(
          error(
            "INVALID_REFERENCE",
            `${path}/modifications/${index}/activityId`,
            "Modification target does not exist.",
            String(value.id),
            [String(mod.activityId)],
          ),
        );
      if (
        !isString(mod.field) ||
        !["earliest_start", "duration"].includes(mod.field) ||
        !isString(mod.operation) ||
        !["set", "add"].includes(mod.operation)
      )
        errors.push(
          error(
            "INVALID_SHAPE",
            `${path}/modifications/${index}`,
            "Modification field or operation is invalid.",
            String(value.id),
          ),
        );
      if (!isSafeInteger(mod.valueMinutes))
        errors.push(
          error(
            "INVALID_NUMBER",
            `${path}/modifications/${index}/valueMinutes`,
            "Modification value must be a safe integer.",
            String(value.id),
          ),
        );
    });
  if (
    !isString(value.approvalStatus) ||
    !["not_required", "pending", "confirmed"].includes(value.approvalStatus)
  )
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/approvalStatus`,
        "Approval status is invalid.",
        String(value.id),
      ),
    );
  if (
    !Array.isArray(value.assumptionNotes) ||
    value.assumptionNotes.some((note) => !isString(note))
  )
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/assumptionNotes`,
        "Assumption notes must be strings.",
        String(value.id),
      ),
    );
  if (!isString(value.status) || !["draft", "selected"].includes(value.status))
    errors.push(
      error(
        "INVALID_SHAPE",
        `${path}/status`,
        "Option status is invalid.",
        String(value.id),
      ),
    );
  if (value.approvalStatus === "not_required" && costRequirements.length > 0)
    errors.push(
      error(
        "APPROVAL_REQUIRED",
        `${path}/approvalStatus`,
        "Approval-required options cannot be not_required.",
        String(value.id),
      ),
    );
  if (errors.length) return failure(...errors);
  const option = value as unknown as RecoveryOption;
  for (const [index, modification] of option.modifications.entries()) {
    const activity = baseline.activities.find(
      (a) => a.id === modification.activityId,
    )!;
    const p = `${path}/modifications/${index}/valueMinutes`;
    const nextDuration =
      modification.operation === "set"
        ? modification.valueMinutes
        : activity.durationMinutes + modification.valueMinutes;
    if (
      modification.operation === "set" &&
      (modification.valueMinutes < 0 ||
        modification.valueMinutes > limits.maxMinute)
    )
      errors.push(
        error(
          "OUT_OF_RANGE",
          p,
          "Set value is outside configured limits.",
          activity.id,
        ),
      );
    else if (modification.field === "duration") {
      if (!Number.isSafeInteger(nextDuration))
        errors.push(
          error(
            "OVERFLOW",
            p,
            "Duration arithmetic exceeds safe integers.",
            activity.id,
          ),
        );
      else if (nextDuration < 0 || nextDuration > limits.maxMinute)
        errors.push(
          error(
            "OUT_OF_RANGE",
            p,
            "Duration is outside configured limits.",
            activity.id,
          ),
        );
      else if (activity.isMilestone && nextDuration !== 0)
        errors.push(
          error(
            "MILESTONE_DURATION",
            p,
            "Milestones must retain zero duration.",
            activity.id,
          ),
        );
      else if (
        activity.classification === "protected" &&
        nextDuration < activity.durationMinutes
      )
        errors.push(
          error(
            "PROTECTED_DURATION",
            p,
            "Protected activity duration cannot be shortened.",
            activity.id,
          ),
        );
    }
    if (
      activity.classification === "approval_required" &&
      option.approvalStatus === "not_required"
    )
      errors.push(
        error(
          "APPROVAL_REQUIRED",
          `${path}/approvalStatus`,
          "This modification requires approval.",
          activity.id,
        ),
      );
  }
  if (errors.length) return failure(...errors);
  return success({
    ...option,
    approvalRequirements: costRequirements,
    approvalContext: option.approvalContext ?? null,
  });
};

export const validateLimits = (limits: unknown): Result<EngineLimits> => {
  const errors = shapeErrors(
    limits,
    Object.keys(DEFAULT_LIMITS),
    [],
    "/limits",
  );
  if (errors.length || !isRecord(limits)) return failure(...errors);
  for (const [key, value] of Object.entries(limits))
    if (!isSafeInteger(value) || value < 0)
      errors.push(
        error(
          "INVALID_NUMBER",
          `/limits/${key}`,
          "Limit must be a non-negative safe integer.",
        ),
      );
  return errors.length
    ? failure(...errors)
    : success(limits as unknown as EngineLimits);
};

export const validateBriefMetadata = (
  value: unknown,
): Result<BriefMetadata> => {
  const errors = shapeErrors(
    value,
    [
      "id",
      "authorLabel",
      "createdAt",
      "nextActions",
      "assumptionsAndConstraints",
    ],
    [],
    "/metadata",
  );
  if (errors.length || !isRecord(value)) return failure(...errors);
  if (!idIsValid(value.id))
    errors.push(
      error("INVALID_TEXT", "/metadata/id", "Brief ID must be valid."),
    );
  errors.push(
    ...textErrors(value.authorLabel, "/metadata/authorLabel", 200, true),
    ...notesErrors(value.nextActions, "/metadata/nextActions"),
    ...notesErrors(
      value.assumptionsAndConstraints,
      "/metadata/assumptionsAndConstraints",
    ),
  );
  if (!isIsoInstant(value.createdAt))
    errors.push(
      error(
        "INVALID_DATE",
        "/metadata/createdAt",
        "Brief timestamp must be a valid UTC instant.",
      ),
    );
  return errors.length
    ? failure(...errors)
    : success(value as unknown as BriefMetadata);
};
