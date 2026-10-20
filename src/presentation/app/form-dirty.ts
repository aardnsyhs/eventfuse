import { createContext } from "react";

export const FormDirtyContext = createContext<() => void>(() => {});
