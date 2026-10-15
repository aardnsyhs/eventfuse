import { useId, useState } from "react";
import { usePendingForm } from "@/presentation/app/usePendingForm";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AppError } from "@/application";

export function Field({
  label,
  hint,
  ...props
}: ComponentProps<typeof Input> & { label: string; hint?: string }) {
  const generated = useId(),
    id = props.id ?? generated;
  return (
    <div className="min-w-0 space-y-2">
      <Label
        htmlFor={id}
        className="font-mono text-xs leading-relaxed text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-12 min-w-0 rounded border-muted-foreground bg-card text-base"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
export function Choice({
  label,
  children,
  ...props
}: ComponentProps<"select"> & { label: string }) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <Label
        htmlFor={id}
        className="font-mono text-xs leading-relaxed text-muted-foreground"
      >
        {label}
      </Label>
      <select
        {...props}
        id={id}
        className="min-h-12 w-full min-w-0 rounded border border-muted-foreground bg-card px-3 text-base"
      >
        {children}
      </select>
    </div>
  );
}
export function TextArea({
  label,
  ...props
}: ComponentProps<"textarea"> & { label: string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="font-mono text-xs leading-relaxed text-muted-foreground"
      >
        {label}
      </Label>
      <textarea
        {...props}
        id={id}
        className="min-h-24 w-full rounded border border-muted-foreground bg-card p-3 text-base"
      />
    </div>
  );
}
export function Errors({
  errors,
  message,
}: {
  errors?: readonly AppError[];
  message?: string | null;
}) {
  if (!message && !errors?.length) return null;
  return (
    <div
      role="alert"
      className="space-y-2 border-l-2 border-destructive bg-danger-soft p-4 text-sm"
    >
      {message && <p>{message}</p>}
      {errors?.map((error, index) => (
        <p key={index}>
          <strong>{error.code}</strong> {error.message}{" "}
          <span className="font-mono text-xs">{error.path}</span>
          {error.validationErrors?.map((e) => (
            <span key={e.path + e.code} className="block font-mono text-xs">
              {e.code} {e.path}: {e.message}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
export function Editor({
  label,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  label: string;
  title: string;
  description: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dirty, setDirty] = useState(false);
  usePendingForm(open && dirty);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (
          !next &&
          dirty &&
          !window.confirm("Discard these unapplied form changes?")
        )
          return;
        setDirty(false);
        onOpenChange(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="min-h-11 h-auto whitespace-normal py-3"
          />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-none border border-muted-foreground p-6 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-9 text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div
          onChangeCapture={() => setDirty(true)}
          onClickCapture={(event) => {
            if ((event.target as Element).closest("button")) setDirty(true);
          }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function Confirm({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action: () => void | Promise<void>;
}) {
  // Confirmation is required for destructive resets and draft replacement.
  return (
    <Button
      variant="outline"
      className="min-h-11 h-auto whitespace-normal py-3"
      onClick={() => {
        if (window.confirm(typeof children === "string" ? children : label))
          void action();
      }}
    >
      {label}
    </Button>
  );
}
