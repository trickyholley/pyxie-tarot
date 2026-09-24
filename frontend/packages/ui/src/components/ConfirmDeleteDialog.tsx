// SPDX-License-Identifier: AGPL-3.0-or-later
import { Trash2 } from "lucide-react";
import ConfirmDialog, { ConfirmDialogProps } from "./ConfirmDialog";

export interface ConfirmDeleteDialogProps extends Omit<ConfirmDialogProps, "variant" | "confirmIcon" | "pending"> {
  deleting: boolean;
}

/** `ConfirmDialog` preset for "delete this?" - callers supply the entity-specific copy and translation lookups. */
export default function ConfirmDeleteDialog({ deleting, ...props }: ConfirmDeleteDialogProps) {
  return <ConfirmDialog {...props} variant="destructive" confirmIcon={Trash2} pending={deleting} />;
}
