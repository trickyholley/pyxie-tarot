import { adminAPI, Role, User } from "@pyxie/api-client";
import {
  Badge,
  Button,
  Calendar,
  Input,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { CalendarIcon, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import CreateUserDialog from "@/components/CreateUserDialog";
import DeleteUserDialog from "@/components/DeleteUserDialog";
import EditableCell from "@/components/EditableCell";
import RoleChangeDialog from "@/components/RoleChangeDialog";
import { errorMessage } from "@/lib/errors";
import { useDebounce } from "@/lib/useDebounce";

const PAGE_SIZE = 20;

const ROLE_FILTER_ITEMS: Record<Role | "all", string> = {
  all: "All roles",
  user: "user",
  admin: "admin",
};

type DateRange = { from: Date | undefined; to?: Date | undefined };

function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
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

  const handleRoleFilterChange = (value: Role | "all") => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleDateRangeChange = (value: DateRange | undefined) => {
    setDateRange(value);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    adminAPI
      .listUsers((page - 1) * PAGE_SIZE, PAGE_SIZE, {
        search: debouncedSearch || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        createdFrom: dateRange?.from && formatDateParam(dateRange.from),
        createdTo: dateRange?.to && formatDateParam(dateRange.to),
      })
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
  }, [debouncedSearch, roleFilter, dateRange, page]);

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
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-4 flex justify-between gap-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search by username or email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64 shrink-0"
          />

          <Select
            items={ROLE_FILTER_ITEMS}
            value={roleFilter}
            onValueChange={(value) => value !== null && handleRoleFilterChange(value as Role | "all")}
          >
            <SelectTrigger className="w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" className="w-56 shrink-0 justify-start">
                  <CalendarIcon />
                  <span className="truncate">
                    {dateRange?.from
                      ? dateRange.to
                        ? `${dateRange.from.toLocaleDateString()} – ${dateRange.to.toLocaleDateString()}`
                        : dateRange.from.toLocaleDateString()
                      : "Created date"}
                  </span>
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0">
              <Calendar mode="range" selected={dateRange} onSelect={handleDateRangeChange} />
              {dateRange && (
                <div className="border-t p-2">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => handleDateRangeChange(undefined)}>
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

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
