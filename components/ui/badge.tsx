import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-2xs [a&]:hover:bg-blue-500/20",
        secondary:
          "border-[var(--border)] bg-[var(--surface-plain-soft)] text-foreground shadow-2xs [a&]:hover:bg-[var(--surface-plain)]",
        destructive:
          "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 shadow-2xs focus-visible:ring-destructive/20 [a&]:hover:bg-red-500/20",
        outline:
          "border-[var(--border)] bg-[var(--surface-plain-soft)] text-foreground shadow-2xs [a&]:hover:bg-[var(--surface-plain)]",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
