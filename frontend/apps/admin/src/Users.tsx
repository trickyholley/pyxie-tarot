import { adminAPI, Role, User } from "@pyxie/api-client";
import {
  Badge,
  Button,
  Input,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
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
import { useDebounce } from "@/lib/useDebounce";

const PAGE_SIZE = 20;

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [roleChange, setRoleChange] = useState<{ user: User; role: Role } | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    adminAPI
      .listUsers((page - 1) * PAGE_SIZE, PAGE_SIZE, debouncedSearch || undefined)
      .then((result) => {
        if (!cancelled) {
          setUsers(result.items);
          setTotal(result.total);
        }
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
  }, [debouncedSearch, page]);

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

  return (
    <div className="max-w-3xl p-4">
      <div className="mb-4 flex justify-between gap-2">
        <Input
          placeholder="Search by username or email…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <CreateUserDialog onCreated={(user) => setUsers((prev) => [user, ...prev])} />
      </div>

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}

      {/* Table stays mounted (never swapped for a loading placeholder) and always renders PAGE_SIZE
          rows (real + blank filler, each pinned to h-12.5) so its height — and the pagination below
          it — never shifts between pages, even on a short last page. */}
      <div style={{ height: `calc(2.5rem + ${PAGE_SIZE} * 3.125rem)` }}>
        <Table className={loading ? "opacity-60" : undefined}>
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
              <TableRow key={user.id} className="h-12.5">
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
            {Array.from({ length: Math.max(0, PAGE_SIZE - users.length) }).map((_, i) => (
              <TableRow key={`filler-${i}`} className="h-12.5">
                <TableCell colSpan={5} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination className="mt-4 justify-start">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={loading || page <= 1}
              className={loading || page <= 1 ? "pointer-events-none opacity-50" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setPage((p) => Math.max(1, p - 1));
              }}
            />
          </PaginationItem>
          <PaginationItem className="flex items-center px-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={loading || page >= totalPages}
              className={loading || page >= totalPages ? "pointer-events-none opacity-50" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setPage((p) => Math.min(totalPages, p + 1));
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

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
