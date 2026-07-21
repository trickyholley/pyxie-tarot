import { Role, User } from "@pyxie/api-client";
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

interface RoleChangeDialogProps {
  pending: { user: User; role: Role } | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function RoleChangeDialog({ pending, saving, onOpenChange, onConfirm }: RoleChangeDialogProps) {
  return (
    <Dialog open={pending !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role?</DialogTitle>
          <DialogDescription>
            Set {pending?.user.username}&apos;s role to &quot;{pending?.role}&quot;? This changes what they can access.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={onConfirm} disabled={saving}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
