import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ConfirmationContext } from "@/presentation/app/confirmation-context";

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{
    message: string;
    title: string;
  } | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const cancel = useRef<HTMLButtonElement | null>(null);
  const confirmedFocus = useRef<HTMLElement | null>(null);
  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    if (confirmed && confirmedFocus.current)
      returnFocus.current = confirmedFocus.current;
    setRequest(null);
    resolve?.(confirmed);
  }, []);
  const ask = useCallback(
    (
      message: string,
      title = "Confirm this action",
      focusOnConfirm?: HTMLElement | null,
    ) => {
      // Concurrent requests cannot authorize an action the user has not reviewed.
      if (resolver.current) return Promise.resolve(false);
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      confirmedFocus.current = focusOnConfirm ?? null;
      setRequest({ message, title });
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
      });
    },
    [],
  );
  useEffect(
    () => () => {
      resolver.current?.(false);
      resolver.current = null;
    },
    [],
  );
  return (
    <ConfirmationContext value={ask}>
      {children}
      <AlertDialog
        open={!!request}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
      >
        <AlertDialogContent
          initialFocus={cancel}
          finalFocus={() =>
            returnFocus.current?.isConnected ? returnFocus.current : false
          }
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{request?.title}</AlertDialogTitle>
            <AlertDialogDescription>{request?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancel} onClick={() => settle(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => settle(true)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext>
  );
}
