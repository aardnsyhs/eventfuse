import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { openDemo, DEMO_EVENT_ID } from "@/demo/install";
import { useWorkspaceContext } from "@/presentation/app/workspace-context";
import { Errors } from "@/presentation/forms";
import { EventEditor } from "@/presentation/EventEditor";

type OpenedWorkspace = { key: string; notice: string };
export function Bootstrap({ children }: { children: ReactNode }) {
  const { registry, openWorkspace, setActiveWorkspace } = useWorkspaceContext();
  const operation = useRef<Promise<OpenedWorkspace> | null>(null);
  const [ready, setReady] = useState(false),
    [failure, setFailure] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let mounted = true;
    if (!operation.current)
      operation.current = (async () => {
        let pointer: { namespace?: string; eventId?: string } | null = null;
        try {
          pointer = JSON.parse(
            sessionStorage.getItem("eventfuse:active") ?? "null",
          );
        } catch {
          /* A missing session pointer does not affect validated durable documents. */
        }
        const user =
          pointer?.namespace === "workspace" &&
          typeof pointer.eventId === "string";
        const owner = openWorkspace(
          user ? "workspace" : "demo",
          user ? pointer!.eventId! : DEMO_EVENT_ID,
        );
        let notice = "";
        if (user) {
          const loaded = await owner.load("workspace", owner.eventId);
          if (!loaded.ok || !loaded.value)
            throw new Error(
              loaded.ok
                ? "The saved event was not found. Its original record was preserved."
                : `${loaded.errors[0].code}: ${loaded.errors[0].message}`,
            );
        } else {
          const loaded = await openDemo(
            owner,
            registry.runtime.nextStorageRevision,
            registry.runtime.port,
          );
          if (!loaded.ok) throw new Error(loaded.message);
          if (loaded.origin === "session-only") notice = loaded.message;
        }
        return { key: owner.key, notice };
      })();
    void operation.current.then(
      (opened) => {
        if (mounted) {
          setActiveWorkspace(opened.key);
          setNotice(opened.notice);
          setReady(true);
        }
      },
      (error) => {
        if (mounted)
          setFailure(
            error instanceof Error
              ? error.message
              : "Workspace could not be opened.",
          );
      },
    );
    return () => {
      mounted = false;
    };
  }, [openWorkspace, registry, setActiveWorkspace]);
  if (failure)
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1>Stored workspace needs attention</h1>
        <Errors message={failure} />
        <p>
          Nothing was overwritten. Recover the original browser record or create
          a separate workspace. Reload this page after recovering the record.
        </p>
        <EventEditor
          create
          onCreated={() => {
            setReady(true);
            setFailure(null);
          }}
        />
      </main>
    );
  if (!ready)
    return (
      <main className="p-8">
        <p role="status">Opening local workspace…</p>
      </main>
    );
  return (
    <>
      {notice && (
        <p
          role="alert"
          className="border-l-2 border-warning bg-warning-soft p-4 text-sm"
        >
          {notice}
        </p>
      )}
      {children}
    </>
  );
}
