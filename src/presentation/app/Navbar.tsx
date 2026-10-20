import { Status } from "@/presentation/shared";
import { ThemeToggle } from "@/presentation/app/ThemeToggle";
import { DemoEntry } from "@/presentation/DemoEntry";
import type { Screen } from "@/presentation/app/routes";

export function AppHeader({
  mode,
  namespace = "demo",
}: {
  mode: "landing" | "app";
  screen?: Screen;
  namespace?: "demo" | "workspace";
}) {
  return (
    <header
      id={mode === "landing" ? "landing" : undefined}
      className="border-b border-border bg-background/95 transition-colors print:hidden"
    >
      <div className="mx-auto flex flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-10">
        <div className="flex items-center gap-6">
          <a
            href={mode === "landing" ? "#landing" : "#workspace"}
            onClick={
              mode === "landing"
                ? () => {
                    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                  }
                : undefined
            }
            className="inline-flex min-h-11 items-center text-[1.4375rem] font-bold tracking-[-0.8px] text-foreground transition-colors hover:text-primary"
            aria-label={mode === "app" ? "EventFuse workspace" : undefined}
          >
            EventFuse
          </a>

          {mode === "landing" ? (
            <nav
              aria-label="About EventFuse"
              className="hidden items-center gap-6 font-mono text-xs text-muted-foreground md:flex"
            >
              <a
                href="#why"
                className="inline-flex min-h-11 items-center transition-colors hover:text-foreground"
              >
                Why EventFuse
              </a>
              <a
                href="#workflow"
                className="inline-flex min-h-11 items-center transition-colors hover:text-foreground"
              >
                The workflow
              </a>
              <span>Fictional demo</span>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="hidden sm:inline-flex">
            <Status tone="neutral">
              {namespace === "demo" ? "Fictional demo" : "Local event"}
            </Status>
          </span>
          <ThemeToggle />
          {mode === "landing" && <DemoEntry>Open demo</DemoEntry>}
        </div>
      </div>
    </header>
  );
}
