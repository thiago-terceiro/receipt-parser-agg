import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xs shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985]",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] focus-visible:ring-destructive/20",
        outline:
          "border border-[var(--border)] bg-[var(--surface-plain-soft)] text-foreground shadow-2xs hover:bg-[var(--surface-plain)] hover:border-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985]",
        secondary:
          "border border-[var(--border)] bg-[var(--surface-plain-soft)] text-foreground shadow-2xs hover:-translate-y-0.5 hover:bg-[var(--surface-plain)] hover:shadow-xs active:translate-y-0 active:scale-[0.985]",
        ghost:
          "hover:bg-[var(--surface-accent)] hover:text-accent-foreground active:scale-[0.985]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9.5 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6.5 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8.5 gap-1.5 rounded-full px-3.5 has-[>svg]:px-2.5",
        lg: "h-11 rounded-full px-6 text-[0.95rem] has-[>svg]:px-4",
        icon: "size-9.5",
        "icon-xs": "size-6.5 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8.5",
        "icon-lg": "size-10.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
