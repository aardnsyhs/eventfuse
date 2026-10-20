import {
  Children,
  isValidElement,
  useId,
  useRef,
  useState,
  useContext,
} from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useConfirmation } from "@/presentation/app/confirmation-context";
import { FormDirtyContext } from "@/presentation/app/form-dirty";

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
  value,
  onChange,
  disabled,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  value: string;
  disabled?: boolean;
  onChange: (event: { target: { value: string } }) => void;
}) {
  const id = useId();
  const markDirty = useContext(FormDirtyContext);
  const items = Children.toArray(children)
    .filter(isValidElement<ComponentProps<"option">>)
    .map((option) => ({
      value: String(option.props.value ?? option.props.children),
      label: option.props.children,
      disabled: option.props.disabled,
    }));
  return (
    <div className="min-w-0 space-y-2">
      <Label
        htmlFor={id}
        className="font-mono text-xs leading-relaxed text-muted-foreground"
      >
        {label}
      </Label>
      <Select
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) {
            if (next !== value) markDirty();
            onChange({ target: { value: next } });
          }
        }}
      >
        <SelectTrigger id={id} className={`w-full ${className ?? ""}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={item.disabled}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
  const trigger = useRef<HTMLButtonElement | null>(null);
  const ask = useConfirmation();
  usePendingForm(open && dirty);
  return (
    <Dialog
      open={open}
      onOpenChange={async (next) => {
        if (
          !next &&
          dirty &&
          !(await ask(
            "Discard these unapplied form changes?",
            "Discard form changes?",
            trigger.current,
          ))
        )
          return;
        setDirty(false);
        onOpenChange(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            ref={trigger}
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
          <FormDirtyContext value={() => setDirty(true)}>
            {children}
          </FormDirtyContext>
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
  const ask = useConfirmation();
  return (
    <Button
      variant="outline"
      className="min-h-11 h-auto whitespace-normal py-2.5"
      onClick={async () => {
        if (
          await ask(
            typeof children === "string"
              ? children
              : Children.toArray(children).join(""),
            label,
          )
        )
          void action();
      }}
    >
      {label}
    </Button>
  );
}
