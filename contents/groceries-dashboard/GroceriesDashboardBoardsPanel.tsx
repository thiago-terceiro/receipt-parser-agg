"use client";

import { Copy, LoaderCircle, Plus, Share2, Users } from "lucide-react";
import { useState } from "react";

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
import type { BoardMemberSummary, BoardSummary } from "@/lib/boards";
import type { Messages } from "@/lib/i18n/messages";
import { logInfo, logWarn, withSpan } from "@/lib/observability";
import {
  observabilityAttributes,
  observabilityEvents,
  observabilityFields,
} from "@/lib/observability-schema";

type GroceriesDashboardBoardsPanelProps = {
  activeBoard: BoardSummary;
  boards: BoardSummary[];
  members: BoardMemberSummary[];
  translations: Messages;
  isBoardSwitchPending?: boolean;
  onBoardActivated: (boardId: string) => void;
};

const getRoleLabel = (translations: Messages, role: BoardSummary["role"]) => {
  return role === "owner"
    ? translations.groceries.boards.roleOwner
    : translations.groceries.boards.roleEditor;
};

const GroceriesDashboardBoardsPanelContent = ({
  activeBoard,
  boards,
  members,
  translations,
  isBoardSwitchPending = false,
  onBoardActivated,
}: GroceriesDashboardBoardsPanelProps) => {
  const [boardName, setBoardName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  type CreatedBoardPayload = {
    board: {
      id: string;
      name?: string;
    };
  };

  type CreatedInvitePayload = {
    invite: {
      inviteUrl: string;
    };
  };

  const handleBoardChange = async (boardId: string) => {
    if (!boardId || boardId === activeBoard.id || isBoardSwitchPending) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await withSpan("ui.boards.switch_active", async (span) => {
        const response = await fetch("/api/boards/active", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ boardId }),
        });
        const payload = (await response.json()) as { error?: string };

        span.setAttributes({
          [observabilityAttributes.httpStatusCode]: response.status,
        });

        if (!response.ok) {
          throw new Error(
            payload.error || translations.groceries.boards.switchFailed,
          );
        }
      });

      logInfo("Switched active board in browser.", {
        [observabilityFields.event]: observabilityEvents.uiBoardsSwitchSuccess,
      });
      onBoardActivated(boardId);
    } catch (requestError) {
      logWarn("Switching active board failed in browser.", {
        [observabilityFields.event]: observabilityEvents.uiBoardsSwitchFailed,
        [observabilityFields.errorMessage]:
          requestError instanceof Error
            ? requestError.message
            : translations.groceries.boards.switchFailed,
      });
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
      const payload = await withSpan<CreatedBoardPayload>("ui.boards.create", async (span) => {
        const response = await fetch("/api/boards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: boardName }),
        });
        const parsedPayload = (await response.json()) as {
          board?: { id?: string; name?: string };
          error?: string;
        };

        span.setAttributes({
          [observabilityAttributes.httpStatusCode]: response.status,
          [observabilityAttributes.boardNameProvided]: Boolean(boardName.trim()),
        });

        if (!response.ok || !parsedPayload.board?.id) {
          throw new Error(parsedPayload.error || translations.groceries.boards.createFailed);
        }

        return {
          board: {
            id: parsedPayload.board.id,
            name: parsedPayload.board.name,
          },
        };
      });
      const createdBoard = payload.board;

      setStatusMessage(
        translations.groceries.boards.boardCreated(
          createdBoard.name || boardName.trim(),
        ),
      );
      logInfo("Created board in browser.", {
        [observabilityFields.event]: observabilityEvents.uiBoardsCreateSuccess,
      });
      setBoardName("");
      setIsCreatingBoard(false);
      onBoardActivated(createdBoard.id);
    } catch (requestError) {
      logWarn("Creating board failed in browser.", {
        [observabilityFields.event]: observabilityEvents.uiBoardsCreateFailed,
        [observabilityFields.errorMessage]:
          requestError instanceof Error
            ? requestError.message
            : translations.groceries.boards.createFailed,
      });
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
      const payload = await withSpan<CreatedInvitePayload>("ui.boards.invites.create", async (span) => {
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
        const parsedPayload = (await response.json()) as {
          error?: string;
          invite?: { inviteUrl?: string };
        };

        span.setAttributes({
          [observabilityAttributes.httpStatusCode]: response.status,
          [observabilityAttributes.inviteHasEmailRestriction]: Boolean(inviteEmail.trim()),
        });

        if (!response.ok || !parsedPayload.invite?.inviteUrl) {
          throw new Error(parsedPayload.error || translations.groceries.boards.inviteFailed);
        }

        return {
          invite: {
            inviteUrl: parsedPayload.invite.inviteUrl,
          },
        };
      });
      const inviteUrl = payload.invite.inviteUrl;

      setInviteLink(
        new URL(inviteUrl, window.location.origin).toString(),
      );
      setStatusMessage(translations.groceries.boards.inviteCreated);
      logInfo("Created board invite in browser.", {
        [observabilityFields.event]: observabilityEvents.uiBoardsInvitesCreateSuccess,
        [observabilityAttributes.inviteHasEmailRestriction]: Boolean(inviteEmail.trim()),
      });
    } catch (requestError) {
      logWarn("Creating board invite failed in browser.", {
        [observabilityFields.event]: observabilityEvents.uiBoardsInvitesCreateFailed,
        [observabilityFields.errorMessage]:
          requestError instanceof Error
            ? requestError.message
            : translations.groceries.boards.inviteFailed,
      });
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
            <SelectTrigger
              className="min-w-[220px] rounded-full border-[var(--border)] bg-[var(--surface-plain-soft)] max-[760px]:w-full"
              aria-label={translations.groceries.boards.selectBoard}
            >
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

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsCreatingBoard(true)}
            disabled={isBoardSwitchPending}
          >
            <Plus className="size-4" />
            <span>{translations.groceries.boards.createBoard}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsMembersOpen(true)}
            disabled={isBoardSwitchPending}
          >
            <Users className="size-4" />
            <span>{translations.groceries.boards.members}</span>
          </Button>

          {activeBoard.role === "owner" ? (
            <Button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              disabled={isBoardSwitchPending}
            >
              <Share2 className="size-4" />
              <span>{translations.groceries.boards.invite}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {isBoardSwitchPending ? (
        <div
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle className="size-4 animate-spin" />
          <span>{translations.groceries.boards.switching}</span>
        </div>
      ) : null}

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
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-foreground">
                {translations.groceries.boards.createBoardPlaceholder}
              </span>
              <input
                type="text"
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                placeholder={translations.groceries.boards.createBoardPlaceholder}
                className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none transition-colors focus:border-[var(--accent)]"
              />
            </label>

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
                <label htmlFor="board-invite-link-input" className="text-sm font-semibold text-foreground">
                  {translations.groceries.boards.inviteLinkLabel}
                </label>
                <div className="flex gap-2 max-[640px]:flex-col">
                  <input
                    id="board-invite-link-input"
                    type="text"
                    readOnly
                    value={inviteLink}
                    aria-label={translations.groceries.boards.inviteLinkLabel}
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

export const GroceriesDashboardBoardsPanel = (
  props: GroceriesDashboardBoardsPanelProps,
) => {
  return (
    <GroceriesDashboardBoardsPanelContent
      key={props.activeBoard.id}
      {...props}
    />
  );
};