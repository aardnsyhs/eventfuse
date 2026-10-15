import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openDemo, DEMO_EVENT_ID } from "@/demo/install";
import { useWorkspaceContext } from "@/presentation/app/workspace-context";
import { Errors } from "@/presentation/forms";
import { cn } from "@/lib/utils";

export function DemoEntry({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { registry, controller, openWorkspace, setActiveWorkspace } =
    useWorkspaceContext();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const operation = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <div className="min-w-0">
      <Button
        nativeButton={false}
        role="link"
        disabled={busy}
        className={cn("min-h-11 h-auto whitespace-normal px-4 py-3", className)}
        render={<a href="#workspace" />}
        onClick={(event) => {
          event.preventDefault();
          if (operation.current) return;
          if (
            controller?.namespace === "workspace" &&
            controller.getSnapshot().persistence.status !== "saved" &&
            !window.confirm(
              "Switch to the fictional demo? This local event stays in memory, but must be saved before this tab closes.",
            )
          )
            return;
          operation.current = true;
          setBusy(true);
          setError(null);
          const owner = openWorkspace("demo", DEMO_EVENT_ID);
          const opened = owner.getSnapshot().document
            ? Promise.resolve({ ok: true, message: "" })
            : openDemo(
                owner,
                registry.runtime.nextStorageRevision,
                registry.runtime.port,
              );
          void opened
            .then((result) => {
              if (!mounted.current) return;
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setActiveWorkspace(owner.key);
              try {
                sessionStorage.setItem(
                  "eventfuse:active",
                  JSON.stringify({ namespace: "demo", eventId: DEMO_EVENT_ID }),
                );
              } catch {
                /* The demo remains usable without an optional reload pointer. */
              }
              window.location.hash = "workspace";
            })
            .catch(() => {
              if (mounted.current)
                setError(
                  "The fictional demo could not be opened. Existing work was preserved.",
                );
            })
            .finally(() => {
              operation.current = false;
              if (mounted.current) setBusy(false);
            });
        }}
      >
        {busy ? "Opening demo…" : children}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
      <Errors message={error} />
    </div>
  );
}
