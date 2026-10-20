export const workflow = [
  { route: "blueprint", label: "Blueprint", mobile: "Plan" },
  { route: "scenario", label: "Scenario Lab", mobile: "Disrupt" },
  { route: "compare", label: "Recovery Compare", mobile: "Compare" },
  { route: "brief", label: "Decision Brief", mobile: "Brief" },
] as const;
export type Screen =
  | "landing"
  | "workspace"
  | (typeof workflow)[number]["route"];
