import { AdminSpread } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pyxie/ui";

interface DeleteSpreadDialogProps {
  spread: AdminSpread | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteSpreadDialog({ spread, deleting, onOpenChange, onConfirm }: DeleteSpreadDialogProps) {
  return (
    <Dialog open={spread !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete spread?</DialogTitle>
          <DialogDescription>This will permanently delete {spread?.name}. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
