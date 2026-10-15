import type { ReactNode } from "react";
import {
  Check,
  Clock3,
  TriangleAlert,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLive } from "@/presentation/app/live";
import { formatDateLabel } from "@/presentation/app/format";
import type { Screen } from "@/presentation/app/routes";

export function Kicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-xs leading-relaxed tracking-[0.7px] uppercase text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
export function Heading({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  const { view } = useLive();
  return (
    <div className="space-y-3">
      <Kicker>{eyebrow}</Kicker>
      <h1
        tabIndex={-1}
        className="text-[2.125rem] leading-[1.08] font-semibold tracking-[-1.5px] outline-none md:text-[2.75rem]"
      >
        {children}
      </h1>
      {view.event && (
        <Kicker>{formatDateLabel(view.event).toUpperCase()}</Kicker>
      )}
    </div>
  );
}
export function Status({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const Icon = {
    neutral: ShieldCheck,
    success: Check,
    warning: Clock3,
    danger: TriangleAlert,
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-[2px] border px-2 py-1 font-mono text-[0.6875rem] leading-snug uppercase",
        {
          "text-muted-foreground border-muted-foreground": tone === "neutral",
          "border-primary bg-secondary text-primary": tone === "success",
          "border-warning bg-warning-soft text-warning": tone === "warning",
          "border-destructive bg-danger-soft text-destructive":
            tone === "danger",
        },
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {children}
    </span>
  );
}
export function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <aside
      className={cn(
        "space-y-2 border-l-2 p-4 text-sm leading-relaxed",
        tone === "warning"
          ? "border-warning bg-warning-soft"
          : tone === "success"
            ? "border-primary bg-secondary"
            : "border-border bg-secondary/50",
      )}
    >
      <p className="font-semibold">{title}</p>
      <div className="text-muted-foreground">{children}</div>
    </aside>
  );
}
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("min-w-0 space-y-5 border bg-card p-5 md:p-7", className)}
    >
      {children}
    </section>
  );
}
export function LinkButton({
  to,
  children,
  secondary = false,
  className,
}: {
  to: Screen;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Button
      nativeButton={false}
      role="link"
      variant={secondary ? "outline" : "default"}
      className={cn("min-h-11 h-auto whitespace-normal px-4 py-3", className)}
      render={<a href={`#${to}`} />}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Button>
  );
}
export function PreviewField({
  id,
  label,
  value,
  hint,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="font-mono text-xs font-normal leading-relaxed tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        readOnly
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-12 rounded bg-card text-sm"
      />
      {hint && (
        <p
          id={`${id}-hint`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
export function PreviewFooter() {
  return (
    <footer className="border-t px-5 py-8 md:px-10">
      <Kicker>Local browser workspace · hypothetical simulation</Kicker>
      <p className="mt-2 text-xs text-muted-foreground">
        Saved only in this browser when you choose Save workspace. Copy and
        print retain the proposal's assumptions and approval warnings.
      </p>
    </footer>
  );
}
