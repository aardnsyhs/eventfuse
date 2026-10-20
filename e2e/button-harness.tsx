import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";

export function mountButtons() {
  const host = document.createElement("section");
  host.setAttribute("aria-label", "Button regression fixture");
  host.className = "fixed inset-0 z-90 overflow-auto bg-card p-6";
  document.body.append(host);
  createRoot(host).render(
    <div className="grid gap-3">
      {(
        [
          "default",
          "outline",
          "secondary",
          "ghost",
          "destructive",
          "link",
        ] as const
      ).map((variant) => (
        <div key={variant} className="flex flex-wrap gap-3">
          <Button variant={variant}>{variant} action</Button>
          <Button variant={variant} disabled>
            {variant} disabled
          </Button>
          <Button variant={variant} aria-busy disabled>
            {variant} loading
          </Button>
          <Button variant={variant} aria-pressed>
            {variant} selected
          </Button>
        </div>
      ))}
    </div>,
  );
}
