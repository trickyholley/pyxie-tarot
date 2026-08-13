// SPDX-License-Identifier: AGPL-3.0-or-later
import { ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./base-ui";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/** Shared "delete this?" dialog shell - callers supply the entity-specific copy and translation lookups. */
export default function ConfirmDeleteDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  deleting,
  onOpenChange,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{cancelLabel}</DialogClose>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={deleting}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
