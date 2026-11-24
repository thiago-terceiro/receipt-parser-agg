"use client";

import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dir?: "ltr" | "rtl";
  children?: React.ReactNode;
};

type SelectTriggerProps = Omit<React.ComponentProps<"button">, "size"> & {
  size?: "sm" | "default";
};

type SelectValueProps = {
  className?: string;
  placeholder?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
};

type SelectContentProps = React.ComponentProps<"div"> & {
  position?: "item-aligned" | "popper";
  align?: "start" | "center" | "end";
};

type SelectItemProps = Omit<React.ComponentProps<"option">, "value"> & {
  value: string;
  children?: React.ReactNode;
};

type SelectGroupProps = React.ComponentProps<"div">;
type SelectLabelProps = React.ComponentProps<"div">;
type SelectSeparatorProps = React.ComponentProps<"div">;
type SelectScrollButtonProps = React.ComponentProps<"div">;

type CollectedSelectItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CollectedTriggerMeta = {
  className?: string;
  size: "sm" | "default";
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
  placeholder?: string;
};

export const extractNodeText = (node: React.ReactNode): string => {
  if (node == null || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractNodeText).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractNodeText(node.props.children);
  }
  return "";
};

const extractWrapperSizingClasses = (className?: string): string => {
  if (!className) {
    return "";
  }

  return className
    .split(/\s+/)
    .filter((token) =>
      /^(?:[a-z0-9[\]:-]+:)?(?:w-|min-w-|max-w-|flex-1)/.test(token),
    )
    .join(" ");
};

function SelectTrigger(_props: SelectTriggerProps) {
  return null;
}

function SelectValue(_props: SelectValueProps) {
  return null;
}

function SelectContent(_props: SelectContentProps) {
  return null;
}

function SelectGroup(_props: SelectGroupProps) {
  return null;
}

function SelectLabel(_props: SelectLabelProps) {
  return null;
}

function SelectItem(_props: SelectItemProps) {
  return null;
}

function SelectSeparator(_props: SelectSeparatorProps) {
  return null;
}

function SelectScrollUpButton(_props: SelectScrollButtonProps) {
  return null;
}

function SelectScrollDownButton(_props: SelectScrollButtonProps) {
  return null;
}

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  required,
  children,
}: SelectProps) {
  const triggerMeta: CollectedTriggerMeta = {
    size: "default",
  };
  const items: CollectedSelectItem[] = [];

  const collectFromNodes = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      if (child.type === SelectTrigger) {
        const props = child.props as SelectTriggerProps;
        triggerMeta.className = props.className;
        triggerMeta.size = props.size ?? "default";
        triggerMeta.id = props.id;
        triggerMeta.ariaLabel = props["aria-label"];
        triggerMeta.ariaLabelledBy = props["aria-labelledby"];
        triggerMeta.disabled = props.disabled;
        collectFromNodes(props.children);
        return;
      }

      if (child.type === SelectValue) {
        const props = child.props as SelectValueProps;
        if (props.placeholder) {
          triggerMeta.placeholder = props.placeholder;
        }
        return;
      }

      if (child.type === SelectItem) {
        const props = child.props as SelectItemProps;
        items.push({
          value: props.value,
          label: extractNodeText(props.children).trim() || props.value,
          disabled: props.disabled,
        });
        return;
      }

      const elementProps = child.props as { children?: React.ReactNode };
      if (elementProps.children) {
        collectFromNodes(elementProps.children);
      }
    });
  };

  collectFromNodes(children);

  const isDisabled = Boolean(disabled || triggerMeta.disabled);
  const hasEmptyOption = items.some((item) => item.value === "");
  const wrapperSizingClasses = extractWrapperSizingClasses(triggerMeta.className);
  const controlledValue =
    value !== undefined
      ? value
      : undefined;

  return (
    <div
      data-slot="select"
      className={cn(
        "relative inline-flex min-w-0 max-w-full items-center",
        wrapperSizingClasses,
      )}
    >
      <select
        data-slot="select-trigger"
        data-size={triggerMeta.size}
        id={triggerMeta.id}
        name={name}
        required={required}
        disabled={isDisabled}
        aria-label={triggerMeta.ariaLabel}
        aria-labelledby={triggerMeta.ariaLabelledBy}
        value={controlledValue}
        defaultValue={controlledValue === undefined ? (defaultValue ?? "") : undefined}
        onChange={(event) => onValueChange?.(event.target.value)}
        className={cn(
          "inline-flex w-full min-w-0 appearance-none items-center justify-between gap-2 rounded-md border border-input bg-transparent py-2 pl-3 pr-9 text-sm whitespace-nowrap text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[size=default]:h-9 data-[size=sm]:h-8 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 cursor-pointer",
          triggerMeta.className,
        )}
      >
        {triggerMeta.placeholder && !hasEmptyOption ? (
          <option value="" disabled hidden>
            {triggerMeta.placeholder}
          </option>
        ) : null}
        {items.map((item) => (
          <option
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className="bg-popover text-popover-foreground"
          >
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-3 size-4 text-muted-foreground opacity-60"
      />
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
