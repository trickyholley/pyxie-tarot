// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { Dispatch, SetStateAction, useState } from "react";

/** Drives an admin list page's "pending delete" confirmation dialog: confirm, call `deleteFn`, drop the item. */
export function useDeleteConfirm<T extends { id: string }>(
  deleteFn: (id: string) => Promise<void>,
  setItems: Dispatch<SetStateAction<T[]>>,
  deleteError: string,
) {
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteFn(pendingDelete.id);
      setItems((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, deleteError));
    } finally {
      setDeleting(false);
    }
  };

  return { pendingDelete, setPendingDelete, deleting, confirmDelete };
}
