import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLive } from "@/presentation/app/live";
import { useWorkspaceContext } from "@/presentation/app/workspace-context";
import { motion, useReducedMotion } from "motion/react";
import { Confirm, Errors } from "@/presentation/forms";
import { createDemoDocument } from "@/demo/seed";
import { Status } from "@/presentation/shared";

export function WorkspaceStatus() {
  const { controller, state, view, dispatch } = useLive();
  const { capabilities, refreshCatalog, registry } = useWorkspaceContext();
  const reduced = useReducedMotion();
  const [notice, setNotice] = useState(""),
    [external, setExternal] = useState(false);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key?.includes(controller.eventId)) setExternal(true);
    };
    window.addEventListener("storage", changed);
    const unload = (event: BeforeUnloadEvent) => {
      if (
        registry.openKeys().some((key) => {
          const current = registry.peek(key)!.getSnapshot();
          return current.document && current.persistence.status !== "saved";
        })
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("beforeunload", unload);
    };
  }, [controller, registry]);
  const busy = ["loading", "saving"].includes(state.persistence.status);
  return (
    <section
      aria-label="Workspace saving"
      className="space-y-3 border-b bg-card px-5 py-3 md:px-10"
    >
      <div className="flex flex-wrap items-center gap-3">
        <motion.div
          key={`${state.persistence.status}:${view.status}`}
          initial={reduced ? false : { opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.12 }}
        >
          <Status
            tone={state.persistence.status === "saved" ? "success" : "warning"}
          >
            {state.persistence.status === "saved"
              ? "Saved in this browser"
              : state.persistence.status === "saving"
                ? "Saving…"
                : state.persistence.status === "loading"
                  ? "Loading…"
                  : "Unsaved in this tab"}
          </Status>
        </motion.div>
        <span className="text-xs">
          {controller.namespace === "demo"
            ? "Fictional demo"
            : "Your local event"}{" "}
          · {view.status}
        </span>
        <Button
          className="min-h-11"
          disabled={!view.actions.save}
          onClick={() => {
            setNotice("");
            void controller.save().then((result) => {
              if (result.ok) {
                setNotice("Workspace saved in this browser.");
                setExternal(false);
                void refreshCatalog();
              }
            });
          }}
        >
          Save workspace
        </Button>
        {!busy && (
          <Confirm
            label="Reload saved workspace"
            action={async () => {
              const result = await controller.load(
                controller.namespace,
                controller.eventId,
                true,
              );
              if (result.ok) {
                setExternal(false);
                setNotice(
                  result.value
                    ? "Saved workspace restored."
                    : "No saved record exists. Your in-memory event was preserved.",
                );
              }
            }}
          >
            Reload the saved record and discard this tab's unsaved changes?
            Existing saved data will be preserved.
          </Confirm>
        )}
        {!busy && controller.namespace === "demo" && (
          <Confirm
            label="Reset demo"
            action={() => {
              const result = dispatch({
                type: "demo.reset",
                seed: createDemoDocument(),
                confirmed: true,
              });
              if (result.ok) {
                setNotice(
                  "Demo reset in this tab. Save explicitly to replace the stored demo.",
                );
                setExternal(false);
              }
            }}
          >
            Reset this fictional demo, including its scenario preferences and
            brief history? Your separate local events are preserved.
          </Confirm>
        )}
        <a
          className="inline-flex min-h-11 min-w-11 items-center underline"
          href="#workspace"
        >
          Events
        </a>
        <a
          className="inline-flex min-h-11 min-w-11 items-center underline"
          href="#landing"
        >
          About
        </a>
      </div>
      {capabilities.locks === "unavailable" && (
        <p role="status" className="text-sm">
          Web Locks unavailable. Reads and in-memory editing work; saving is
          refused to protect other tabs.
        </p>
      )}
      {capabilities.storage === "unavailable" && (
        <p role="alert" className="text-sm">
          Browser storage unavailable. This session is not durable. Keep this
          tab open or copy a prepared brief.
        </p>
      )}
      {external && (
        <p role="alert" className="text-sm">
          Another tab changed this event. Save will check the stored revision.
          Reload explicitly to use the newer record; unsaved work will be
          discarded only after confirmation.
        </p>
      )}
      <Errors errors={view.errors} />
      {state.persistence.error && (
        <p className="text-sm">
          This tab's work is preserved. Retry Save for a temporary failure. For
          a conflict or corrupt record, reload after resolving the record, or
          create a separate event. No force overwrite is available.
        </p>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {notice}
      </p>
    </section>
  );
}
