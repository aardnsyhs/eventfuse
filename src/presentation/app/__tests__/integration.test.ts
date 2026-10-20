import { describe, expect, it } from "vitest";
import {
  createLocalPersistence,
  storageKey,
} from "@/infrastructure/persistence/local-storage";
import {
  MemoryStorage,
  createMemoryLocks,
} from "@/infrastructure/persistence/memory";
import { createWorkspaceRegistry } from "@/presentation/app/workspace";
import { stableSnapshot } from "@/presentation/app/store";
import { createWriteTokens } from "@/presentation/app/persistence";
import { formatMoney, costInput } from "@/presentation/app/format";
import { barGeometry } from "@/presentation/app/geometry";
import { eventTime, resolveLocalTime } from "@/presentation/app/time";
import { wholeMinute, signedMinute } from "@/presentation/app/live";
import { createDemoDocument } from "@/demo/seed";
import { openDemo } from "@/demo/install";
import { selectWorkspace } from "@/application";
import type { BrowserRuntime } from "@/presentation/app/persistence";

const runtime = (
  storage = new MemoryStorage(),
  locks = true,
): BrowserRuntime => ({
  port: createLocalPersistence(
    storage,
    locks ? createMemoryLocks() : undefined,
  ),
  capabilities: {
    storage: "available",
    locks: locks ? "available" : "unavailable",
    detail: "test",
  },
  nextStorageRevision: createWriteTokens(),
});
const jakarta = {
  date: "2026-10-15",
  timezone: "Asia/Jakarta",
  referenceInstant: "2026-10-15T01:00:00Z",
};

describe("event-local forms and exact display", () => {
  it("uses Jakarta rather than the host timezone, and displays overnight dates", () => {
    expect(resolveLocalTime(jakarta, "17:00")).toEqual({
      ok: true,
      minute: 540,
      iso: "2026-10-15T10:00:00Z",
    });
    expect(eventTime(jakarta, 1020)).toBe("2026-10-16 01:00");
  });
  it.each([
    "2026-02-30T08:00",
    "2026-10-15T24:00",
    "2026-10-15T08:00:01",
    "2026-10-15T08:00:00",
    "",
    "8:00",
  ])("rejects invalid or sub-minute wall input %s", (input) => {
    expect(resolveLocalTime(jakarta, input).ok).toBe(false);
  });
  it("rejects a DST gap and requires an explicit occurrence for a fold", () => {
    const ny = { ...jakarta, timezone: "America/New_York", date: "2026-03-08" };
    expect(resolveLocalTime(ny, "02:30")).toMatchObject({
      ok: false,
      code: "NONEXISTENT_TIME",
    });
    const folded = { ...ny, date: "2026-11-01" };
    expect(resolveLocalTime(folded, "01:30")).toMatchObject({
      ok: false,
      code: "AMBIGUOUS_TIME",
      candidates: ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"],
    });
    const chosen = resolveLocalTime(folded, "01:30", "2026-11-01T06:30:00Z");
    expect(chosen).toMatchObject({ ok: true, iso: "2026-11-01T06:30:00Z" });
    expect(resolveLocalTime(folded, "01:30", "2026-11-01T07:30:00Z").ok).toBe(
      false,
    );
  });
  it("supports a thirty-minute DST transition and a skipped calendar date", () => {
    expect(
      resolveLocalTime(
        { ...jakarta, timezone: "Australia/Lord_Howe", date: "2026-04-05" },
        "01:45",
      ),
    ).toMatchObject({ ok: false, code: "AMBIGUOUS_TIME" });
    expect(
      resolveLocalTime(
        { ...jakarta, timezone: "Pacific/Apia", date: "2011-12-30" },
        "08:00",
      ),
    ).toMatchObject({ ok: false, code: "NONEXISTENT_TIME" });
  });
  it("rejects invalid zones and reference instants", () => {
    expect(
      resolveLocalTime({ ...jakarta, timezone: "Not/AZone" }, "08:00").ok,
    ).toBe(false);
    expect(
      resolveLocalTime(
        { ...jakarta, referenceInstant: "2026-10-15T01:00:01Z" },
        "08:00",
      ).ok,
    ).toBe(false);
  });
  it.each(["", "1e2", "1.5", "-1", "NaN", "9007199254740992"])(
    "retains invalid raw minute text without coercing %s",
    (input) => {
      expect(() => wholeMinute(input)).toThrow();
    },
  );
  it("allows zero and signed recovery changes", () => {
    expect(wholeMinute("0")).toBe(0);
    expect(signedMinute("-120")).toBe(-120);
  });
  it.each([
    ["USD", null, "Not entered"],
    ["USD", 0, "$0.00"],
    ["USD", 125, "$1.25"],
    ["JPY", 125, "¥125"],
    ["ZZZ", 100, "ZZZ: currency metadata unavailable"],
    ["USD", Number.MAX_SAFE_INTEGER, "$90,071,992,547,409.91"],
  ])("displays %s amount %s exactly", (currency, amount, expected) => {
    expect(formatMoney(amount as number | null, currency as string)).toBe(
      expected,
    );
  });
  it("round-trips minor-unit form text without float division", () => {
    expect(costInput(Number.MAX_SAFE_INTEGER, "USD")).toBe("90071992547409.91");
    expect(costInput(0, "USD")).toBe("0.00");
  });
  it("places parallel bars and horizon milestones from timing values", () => {
    expect(barGeometry(120, 240, 600)).toEqual({ left: "20%", width: "20%" });
    expect(barGeometry(600, 600, 600)).toEqual({ left: "100%", width: "0%" });
    expect(barGeometry(0, 120, 600)).toEqual({ left: "0%", width: "20%" });
  });
});

describe("stable browser workspace owners", () => {
  it("reuses each namespace/id and releases only after its last owner", () => {
    const registry = createWorkspaceRegistry(runtime()),
      a = registry.acquire("demo", "launch");
    expect(registry.acquire("demo", "launch")).toBe(a);
    expect(registry.acquire("workspace", "launch")).not.toBe(a);
    a.dispose();
    expect(registry.peek(a.key)).toBe(a);
    a.dispose();
    expect(registry.peek(a.key)).toBeUndefined();
    const next = registry.acquire("demo", "launch");
    expect(next).not.toBe(a);
    a.dispose();
    expect(registry.peek(next.key)).toBe(next);
  });
  it("keeps snapshots stable and unsubscribes disposed owners during async load", async () => {
    const env = runtime();
    let complete!: () => void;
    const gate = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const registry = createWorkspaceRegistry({
      ...env,
      port: {
        ...env.port,
        async load() {
          await gate;
          return { ok: true, value: createDemoDocument() };
        },
      },
    });
    const owner = registry.acquire("demo", "launch");
    let changes = 0;
    owner.subscribe(() => changes++);
    expect(stableSnapshot(owner)).toBe(stableSnapshot(owner));
    const pending = owner.load("demo", "launch");
    expect(changes).toBe(1);
    owner.dispose();
    complete();
    await pending;
    expect(changes).toBe(1);
    expect(owner.dispatch({ type: "baseline.validate" }).ok).toBe(false);
    expect((await owner.save()).ok).toBe(false);
    expect((await owner.load("demo", "launch")).ok).toBe(false);
  });
  it("seeds through real persistence and restores selected proposals and briefs", async () => {
    const env = runtime(),
      registry = createWorkspaceRegistry(env),
      owner = registry.acquire("demo", "launch");
    expect(
      (await openDemo(owner, env.nextStorageRevision, env.port)).origin,
    ).toBe("seeded");
    const view = selectWorkspace(owner.getSnapshot()),
      incident = view.appliedIncident!.id,
      option = view.optionResults[0].recoveryOptionId;
    expect(
      owner.dispatch({
        type: "selection.set",
        expectedIncidentId: incident,
        id: option,
      }).ok,
    ).toBe(true);
    expect(
      owner.dispatch({
        type: "brief.prepare",
        expectedIncidentId: incident,
        metadata: {
          id: "test-brief",
          authorLabel: null,
          createdAt: "2026-10-15T02:00:00Z",
          nextActions: [],
          assumptionsAndConstraints: [],
        },
      }).ok,
    ).toBe(true);
    expect((await owner.save()).ok).toBe(true);
    const restored = createWorkspaceRegistry(env).acquire("demo", "launch");
    expect(
      (await openDemo(restored, env.nextStorageRevision, env.port)).origin,
    ).toBe("restored");
    expect(selectWorkspace(restored.getSnapshot()).selected?.id).toBe(option);
    expect(selectWorkspace(restored.getSnapshot()).briefView?.id).toBe(
      "test-brief",
    );
  });
  it("refuses corrupt demo hydration without writing over the original", async () => {
    const storage = new MemoryStorage();
    storage.setItem(storageKey("demo", "launch"), "{broken");
    const before = storage.writes;
    const env = runtime(storage),
      owner = createWorkspaceRegistry(env).acquire("demo", "launch");
    const result = await openDemo(owner, env.nextStorageRevision, env.port);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("STORAGE_CORRUPT");
    expect(storage.writes).toBe(before);
    expect(owner.getSnapshot().document).toBeNull();
  });
  it("runs a calculated, explicitly unsaved demo when locks are unavailable", async () => {
    const storage = new MemoryStorage(),
      env = runtime(storage, false),
      owner = createWorkspaceRegistry(env).acquire("demo", "launch");
    const result = await openDemo(owner, env.nextStorageRevision, env.port);
    expect(result.origin).toBe("session-only");
    expect(result.message).toContain("LOCK_UNAVAILABLE");
    const view = selectWorkspace(owner.getSnapshot());
    expect(view.impact?.milestoneImpacts[0].breachMinutes).toBe(120);
    expect(view.optionResults).toHaveLength(2);
    expect(view.selected).toBeNull();
    expect(storage.writes).toBe(0);
    expect(owner.getSnapshot().persistence.status).toBe("unsaved");
  });
  it("uses distinct cryptographic write tokens", () => {
    const tokens = createWriteTokens();
    expect(new Set(Array.from({ length: 100 }, tokens)).size).toBe(100);
  });
});
