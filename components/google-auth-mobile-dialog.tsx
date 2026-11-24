"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ReactNode } from "react";

type GoogleAuthMobileDialogProps = {
  open: boolean;
  title: string;
  authBlock: ReactNode;
  preferencesBlock: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export const GoogleAuthMobileDialog = ({
  open,
  title,
  authBlock,
  preferencesBlock,
  onOpenChange,
}: GoogleAuthMobileDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="mobile-controls-dialog fixed left-3 right-3 top-3 w-auto max-w-none rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-2xl backdrop-blur-[24px]"
        aria-describedby={undefined}
      >
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft-muted)] p-4 shadow-2xs">
            {authBlock}
          </div>
          <div className="flex flex-col gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft-muted)] p-4 shadow-2xs">
            {preferencesBlock}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
