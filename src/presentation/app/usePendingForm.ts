import { useLayoutEffect } from "react";
import { guardNavigation } from "@/presentation/app/navigation";

export function usePendingForm(dirty: boolean) {
  useLayoutEffect(() => {
    if (!dirty) return;
    const removeGuard = guardNavigation(() =>
      window.confirm("Leave these unapplied form changes? They will be lost."),
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
  }, [dirty]);
}
