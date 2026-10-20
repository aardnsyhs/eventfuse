import { useLayoutEffect } from "react";
import { guardNavigation } from "@/presentation/app/navigation";
import { useConfirmation } from "@/presentation/app/confirmation-context";

export function usePendingForm(dirty: boolean) {
  const ask = useConfirmation();
  useLayoutEffect(() => {
    if (!dirty) return;
    const removeGuard = guardNavigation(() =>
      ask(
        "Leave these unapplied form changes? They will be lost.",
        "Leave unapplied changes?",
      ),
    );
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      removeGuard();
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty, ask]);
}
