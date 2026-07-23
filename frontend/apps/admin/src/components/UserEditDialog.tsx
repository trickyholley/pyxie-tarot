import { adminAPI, User } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";

interface UserEditDialogProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: User) => void;
}

export default function UserEditDialog({ user, onOpenChange, onSaved }: UserEditDialogProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updated = await adminAPI.updateUser(user.id, { username, email });
      toast.success("User updated");
      onSaved(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update user"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Role changes and deletion are handled from the table.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="edit-username">
              Username
            </Label>
            <Input id="edit-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <Label className="mb-2" htmlFor="edit-email">
              Email
            </Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
