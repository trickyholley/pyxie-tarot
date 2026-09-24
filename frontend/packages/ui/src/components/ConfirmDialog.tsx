// SPDX-License-Identifier: AGPL-3.0-or-later
import { Check, LucideIcon, X } from "lucide-react";
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

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  confirmIcon?: LucideIcon;
  /** Disables the confirm button while its action is in flight. */
  pending?: boolean;
  /** Disables the confirm button until the extra `children` (e.g. a password field) are satisfied. */
  confirmDisabled?: boolean;
  /** Extra body content between the description and the buttons. */
  children?: ReactNode;
}

/** Shared "are you sure?" dialog shell - callers supply the copy and any translation lookups. */
export default function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onOpenChange,
  onConfirm,
  variant = "default",
  confirmIcon: ConfirmIcon = Check,
  pending = false,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            <X data-icon="inline-start" />
            {cancelLabel}
          </DialogClose>
          <Button type="button" variant={variant} onClick={onConfirm} disabled={pending || confirmDisabled}>
            <ConfirmIcon data-icon="inline-start" />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
