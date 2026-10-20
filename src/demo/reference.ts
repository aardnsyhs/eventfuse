import { restoreState, selectWorkspace } from "@/application";
import { createDemoDocument } from "@/demo/seed";

export const referenceDemo = selectWorkspace(
  restoreState(createDemoDocument()),
);
