import { lazy, Suspense, useEffect, useSyncExternalStore } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { workflow } from "@/presentation/app/routes";
import type { Screen } from "@/presentation/app/routes";
import { Landing } from "@/presentation/screens/Landing";
import { Workspace } from "@/presentation/screens/Workspace";
import { Scenario } from "@/presentation/screens/Scenario";
import { Compare } from "@/presentation/screens/Compare";
import { Brief } from "@/presentation/screens/Brief";
import { PreviewFooter, Status } from "@/presentation/shared";
import { WorkspaceProvider } from "@/presentation/app/WorkspaceProvider";
import { Bootstrap } from "@/presentation/app/Bootstrap";
import { WorkspaceStatus } from "@/presentation/app/WorkspaceStatus";
import { useLive } from "@/presentation/app/live";
import { subscribeNavigation } from "@/presentation/app/navigation";

const Blueprint = lazy(() =>
  import("@/presentation/screens/Blueprint").then((module) => ({
    default: module.Blueprint,
  })),
);

const screens: readonly string[] = [
  "landing",
  "workspace",
  ...workflow.map((item) => item.route),
];
const getScreen = (): Screen =>
  screens.includes(window.location.hash.slice(1))
    ? (window.location.hash.slice(1) as Screen)
    : "landing";
function WorkspaceApp() {
  const screen = useSyncExternalStore(
    subscribeNavigation,
    getScreen,
    () => "landing" as const,
  );
  const { controller } = useLive();
  const reduced = useReducedMotion();
  useEffect(() => {
    document.title = `EventFuse · ${screen === "landing" ? "Know what breaks before it happens" : screen === "workspace" ? "Workspace" : workflow.find((item) => item.route === screen)?.label}`;
    document
      .querySelector<HTMLElement>("main h1")
      ?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [screen, controller.key]);
  return (
    <>
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="sr-only fixed top-3 left-3 z-100 bg-card p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      {screen === "landing" ? (
        <Landing />
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-3 md:px-10 md:py-5">
            <a
              href="#workspace"
              className="inline-flex min-h-11 items-center text-[1.4375rem] font-bold tracking-[-0.8px]"
              aria-label="EventFuse workspace"
            >
              EventFuse
            </a>
            <Status>
              {controller.namespace === "demo"
                ? "Fictional demo"
                : "Local event"}
            </Status>
          </header>
          <WorkspaceStatus key={`status:${controller.key}`} />
          <nav
            aria-label="Production workflow"
            className="grid grid-cols-4 border-b px-5 md:flex md:gap-10 md:px-10"
          >
            {workflow.map((item, i) => (
              <a
                key={item.route}
                href={`#${item.route}`}
                aria-current={screen === item.route ? "page" : undefined}
                className={`relative flex min-h-12 items-center justify-center py-3 text-xs md:justify-start md:font-mono md:text-[0.8125rem] ${screen === item.route ? "font-semibold text-primary" : "text-muted-foreground"}`}
              >
                <span className="min-w-0 wrap-anywhere text-center md:hidden">
                  {item.mobile}
                </span>
                <span className="hidden md:inline">
                  0{i + 1} {item.label}
                </span>
                {screen === item.route && (
                  <motion.span
                    layoutId="workflow-indicator"
                    transition={{ duration: reduced ? 0 : 0.16 }}
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                  />
                )}
              </a>
            ))}
          </nav>
          <main
            key={`workspace:${controller.key}`}
            id="main-content"
            tabIndex={-1}
            className="mx-auto max-w-[1600px] space-y-7 px-5 py-7 outline-none md:px-10 md:py-10"
          >
            {screen === "workspace" && <Workspace />}
            {screen === "blueprint" && (
              <Suspense fallback={<p role="status">Opening blueprint…</p>}>
                <Blueprint />
              </Suspense>
            )}
            {screen === "scenario" && <Scenario />}
            {screen === "compare" && <Compare />}
            {screen === "brief" && <Brief />}
          </main>
          <PreviewFooter />
        </>
      )}
    </>
  );
}
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <WorkspaceProvider>
        <Bootstrap>
          <WorkspaceApp />
        </Bootstrap>
      </WorkspaceProvider>
    </MotionConfig>
  );
}
