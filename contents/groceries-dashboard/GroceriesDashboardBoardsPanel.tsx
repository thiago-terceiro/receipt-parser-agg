"use client";

import { Copy, Plus, Share2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPathname, useRouter } from "@/i18n/navigation";
import type { BoardMemberSummary, BoardSummary } from "@/lib/boards";
import { type AppLocale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type GroceriesDashboardBoardsPanelProps = {
  activeBoard: BoardSummary;
  boards: BoardSummary[];
  currentMonth: string;
  locale: AppLocale;
  members: BoardMemberSummary[];
  selectedMonth: string;
  translations: Messages;
};

const buildBoardHref = (
  basePath: string,
  boardId: string,
  currentMonth: string,
  selectedMonth: string,
) => {
  const searchParams = new URLSearchParams();
  searchParams.set("board", boardId);

  if (selectedMonth !== currentMonth) {
    searchParams.set("month", selectedMonth);
  }

  return `${basePath}?${searchParams.toString()}`;
};

const getRoleLabel = (translations: Messages, role: BoardSummary["role"]) => {
  return role === "owner"
    ? translations.groceries.boards.roleOwner
    : translations.groceries.boards.roleEditor;
};

export const GroceriesDashboardBoardsPanel = ({
  activeBoard,
  boards,
  currentMonth,
  locale,
  members,
  selectedMonth,
  translations,
}: GroceriesDashboardBoardsPanelProps) => {
  const router = useRouter();
  const groceriesPath = useMemo(
    () => getPathname({ locale, href: "/groceries" }),
    [locale],
  );
  const [boardName, setBoardName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setInviteEmail("");
    setInviteLink(null);
    setStatusMessage(null);
  }, [activeBoard.id]);

  const navigateToBoard = (boardId: string) => {
    router.push(buildBoardHref(groceriesPath, boardId, currentMonth, selectedMonth));
  };

  const handleBoardChange = async (boardId: string) => {
    if (!boardId || boardId === activeBoard.id) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/boards/active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ boardId }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          payload.error || translations.groceries.boards.switchFailed,
        );
      }

      navigateToBoard(boardId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : translations.groceries.boards.switchFailed,
      );
    }
  };

  const handleCreateBoard = async () => {
    if (!boardName.trim()) {
      setError(translations.groceries.boards.nameRequired);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: boardName }),
      });
      const payload = (await response.json()) as {
        board?: { id?: string; name?: string };
        error?: string;
      };

      if (!response.ok || !payload.board?.id) {
        throw new Error(payload.error || translations.groceries.boards.createFailed);
      }

      setStatusMessage(
        translations.groceries.boards.boardCreated(
          payload.board.name || boardName.trim(),
        ),
      );
      setBoardName("");
      setIsCreatingBoard(false);
      navigateToBoard(payload.board.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : translations.groceries.boards.createFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvite = async () => {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    setInviteLink(null);

    try {
      const response = await fetch(`/api/boards/${activeBoard.id}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail.trim() ? inviteEmail : null,
          role: "editor",
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        invite?: { inviteUrl?: string };
      };

      if (!response.ok || !payload.invite?.inviteUrl) {
        throw new Error(payload.error || translations.groceries.boards.inviteFailed);
      }

      setInviteLink(
        new URL(payload.invite.inviteUrl, window.location.origin).toString(),
      );
      setStatusMessage(translations.groceries.boards.inviteCreated);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : translations.groceries.boards.inviteFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatusMessage(translations.groceries.boards.inviteCopied);
    } catch {
      setError(translations.groceries.boards.copyFailed);
    }
  };

  return (
    <section className="grid gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface-plain)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[0.78rem] uppercase tracking-[0.2em] text-[var(--accent-dark)]">
            <span>{translations.groceries.boards.sectionLabel}</span>
            <Badge
              variant="outline"
              className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-2.5 py-1"
            >
              {getRoleLabel(translations, activeBoard.role)}
            </Badge>
          </div>
          <div>
            <h2 className="m-0 text-[1.55rem] font-semibold tracking-[-0.04em]">
              {activeBoard.name}
            </h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              {translations.groceries.boards.membersCount(members.length)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-[760px]:w-full">
          <Select value={activeBoard.id} onValueChange={handleBoardChange}>
            <SelectTrigger className="min-w-[220px] rounded-full border-[var(--border)] bg-[var(--surface-plain-soft)] max-[760px]:w-full">
              <SelectValue placeholder={translations.groceries.boards.selectBoard} />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="secondary" onClick={() => setIsCreatingBoard(true)}>
            <Plus className="size-4" />
            <span>{translations.groceries.boards.createBoard}</span>
          </Button>

          <Button type="button" variant="secondary" onClick={() => setIsMembersOpen(true)}>
            <Users className="size-4" />
            <span>{translations.groceries.boards.members}</span>
          </Button>

          {activeBoard.role === "owner" ? (
            <Button type="button" onClick={() => setIsInviteOpen(true)}>
              <Share2 className="size-4" />
              <span>{translations.groceries.boards.invite}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {statusMessage ? (
        <Alert>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Dialog open={isCreatingBoard} onOpenChange={setIsCreatingBoard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations.groceries.boards.createBoardTitle}</DialogTitle>
            <DialogDescription>
              {translations.groceries.boards.createBoardDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 pt-4">
            <input
              type="text"
              value={boardName}
              onChange={(event) => setBoardName(event.target.value)}
              placeholder={translations.groceries.boards.createBoardPlaceholder}
              className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none transition-colors focus:border-[var(--accent)]"
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsCreatingBoard(false)}>
                {translations.common.cancel}
              </Button>
              <Button type="button" onClick={handleCreateBoard} disabled={isSubmitting}>
                {translations.groceries.boards.createBoardSubmit}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations.groceries.boards.inviteTitle}</DialogTitle>
            <DialogDescription>
              {translations.groceries.boards.inviteDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 pt-4">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-foreground">
                {translations.groceries.boards.inviteEmailLabel}
              </span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder={translations.groceries.boards.inviteEmailPlaceholder}
                className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none transition-colors focus:border-[var(--accent)]"
              />
            </label>

            {inviteLink ? (
              <div className="grid gap-2 rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] p-4">
                <span className="text-sm font-semibold text-foreground">
                  {translations.groceries.boards.inviteLinkLabel}
                </span>
                <div className="flex gap-2 max-[640px]:flex-col">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="h-11 flex-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-sm text-foreground outline-none"
                  />
                  <Button type="button" variant="secondary" onClick={handleCopyInviteLink}>
                    <Copy className="size-4" />
                    <span>{translations.groceries.boards.copyInviteLink}</span>
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsInviteOpen(false)}>
                {translations.common.cancel}
              </Button>
              <Button type="button" onClick={handleCreateInvite} disabled={isSubmitting}>
                {translations.groceries.boards.createInvite}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations.groceries.boards.membersTitle}</DialogTitle>
            <DialogDescription>
              {translations.groceries.boards.membersDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 pt-4">
            {members.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">
                {translations.groceries.boards.noMembers}
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-semibold text-foreground">
                      {member.displayName || member.email || member.userId}
                    </p>
                    <p className="m-0 truncate text-sm text-muted-foreground">
                      {member.email || member.userId}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-[var(--border)] bg-[var(--surface-plain)]">
                    {member.role === "owner"
                      ? translations.groceries.boards.roleOwner
                      : translations.groceries.boards.roleEditor}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};