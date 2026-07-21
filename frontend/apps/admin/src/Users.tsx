import { adminAPI, Role, User } from "@pyxie/api-client";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@pyxie/ui";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import CreateUserDialog from "@/components/CreateUserDialog";
import DeleteUserDialog from "@/components/DeleteUserDialog";
import EditableCell from "@/components/EditableCell";
import RoleChangeDialog from "@/components/RoleChangeDialog";
import { errorMessage } from "@/lib/errors";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleChange, setRoleChange] = useState<{ user: User; role: Role } | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    adminAPI
      .listUsers()
      .then((page) => {
        if (!cancelled) setUsers(page.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, "Failed to load users"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateUserField = (userId: string) => async (payload: { username?: string; email?: string }) => {
    const updated = await adminAPI.updateUser(userId, payload);
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  const confirmRoleChange = async () => {
    if (!roleChange) return;
    setSavingRole(true);
    try {
      const updated = await adminAPI.updateUserRole(roleChange.user.id, roleChange.role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setRoleChange(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update role"));
    } finally {
      setSavingRole(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminAPI.deleteUser(pendingDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete user"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4">{error}</div>;

  return (
    <div className="max-w-3xl p-4">
      <div className="mb-4 flex justify-end">
        <CreateUserDialog onCreated={(user) => setUsers((prev) => [user, ...prev])} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <EditableCell value={user.username} onSave={(username) => updateUserField(user.id)({ username })} />
              </TableCell>
              <TableCell>
                <EditableCell value={user.email} onSave={(email) => updateUserField(user.id)({ email })} />
              </TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(role) => role !== null && role !== user.role && setRoleChange({ user, role })}
                >
                  <SelectTrigger size="sm">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      <SelectValue />
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-xs" onClick={() => setPendingDelete(user)}>
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RoleChangeDialog
        pending={roleChange}
        saving={savingRole}
        onOpenChange={(open) => !open && setRoleChange(null)}
        onConfirm={() => void confirmRoleChange()}
      />

      <DeleteUserDialog
        user={pendingDelete}
        deleting={deleting}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
