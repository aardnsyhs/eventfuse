import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "group/button inline-flex max-w-full shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-normal transition-colors select-none focus-visible:border-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:bg-muted! disabled:text-muted-foreground! disabled:border-border! disabled:opacity-100! data-disabled:pointer-events-none data-disabled:bg-muted! data-disabled:text-muted-foreground! data-disabled:opacity-100! aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active aria-pressed:bg-primary-active shadow-xs",
        outline:
          "border-input bg-card text-foreground hover:bg-secondary hover:text-foreground active:bg-muted aria-pressed:bg-secondary aria-expanded:bg-secondary aria-expanded:text-foreground shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted active:bg-card aria-pressed:bg-muted aria-expanded:bg-muted aria-expanded:text-secondary-foreground",
        ghost:
          "text-foreground hover:bg-muted hover:text-foreground active:bg-secondary aria-pressed:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-danger-soft text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground active:bg-destructive active:text-destructive-foreground focus-visible:border-ring",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-11 h-auto gap-1.5 px-3 py-2 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 h-auto gap-2 px-4 py-3 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 text-base",
        icon: "size-11 min-h-11 min-w-11 p-0",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12 min-h-12 min-w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
