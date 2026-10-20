import { useWorkspaceHandle } from "@/presentation/app/hooks";
import { useRequiredController } from "@/presentation/app/workspace-context";

export function useLive() {
  const controller = useRequiredController();
  return useWorkspaceHandle(controller);
}
export const auditInstant = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function wholeMinute(text: string): number {
  if (!/^\d+$/.test(text.trim()) || !Number.isSafeInteger(Number(text)))
    throw new Error("Enter a whole number of minutes, zero or greater.");
  return Number(text);
}
export function signedMinute(text: string): number {
  if (!/^-?\d+$/.test(text.trim()) || !Number.isSafeInteger(Number(text)))
    throw new Error("Enter a signed whole number of minutes.");
  return Number(text);
}
