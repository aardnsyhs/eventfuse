import { useId, useState } from "react";
import { usePendingForm } from "@/presentation/app/usePendingForm";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className,
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
      <div className="relative">
        <select
          {...props}
          id={id}
          className={cn(
            "min-h-11 w-full min-w-0 appearance-none rounded-lg border border-border bg-card pr-10 pl-3 py-2 text-base text-foreground transition-colors hover:border-border-hover focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring outline-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}

export function TextArea({
  label,
  ...props
}: ComponentProps<typeof Textarea> & { label: string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="font-mono text-xs leading-relaxed text-muted-foreground"
      >
        {label}
      </Label>
      <Textarea {...props} id={id} />
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
      className="space-y-2 border-l-2 border-destructive bg-danger-soft p-4 text-sm text-foreground"
    >
      {message && <p className="font-medium text-destructive">{message}</p>}
      {errors?.map((error, index) => (
        <p key={index}>
          <strong>{error.code}</strong> {error.message}{" "}
          <span className="font-mono text-xs text-muted-foreground">
            {error.path}
          </span>
          {error.validationErrors?.map((e) => (
            <span
              key={e.path + e.code}
              className="block font-mono text-xs text-muted-foreground"
            >
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
            className="min-h-11 h-auto whitespace-normal py-2.5"
          />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-9 text-2xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
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
      className="min-h-11 h-auto whitespace-normal py-2.5"
      onClick={() => {
        if (window.confirm(typeof children === "string" ? children : label))
          void action();
      }}
    >
      {label}
    </Button>
  );
}
