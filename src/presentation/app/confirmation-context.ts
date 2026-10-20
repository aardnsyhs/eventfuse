import { createContext, useContext } from "react";

export type ConfirmationRequest = (
  message: string,
  title?: string,
  confirmedFocus?: HTMLElement | null,
) => Promise<boolean>;
export const ConfirmationContext = createContext<ConfirmationRequest | null>(
  null,
);
export function useConfirmation() {
  const request = useContext(ConfirmationContext);
  if (!request) throw new Error("ConfirmationProvider is required.");
  return request;
}
