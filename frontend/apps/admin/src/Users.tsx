import { adminAPI, Role, User } from "@pyxie/api-client";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@pyxie/ui";
import { useEffect, useState } from "react";
import CreateUserDialog from "@/components/CreateUserDialog";
import DateRangeFilter, { DateRange, formatDateParam } from "@/components/DateRangeFilter";
import DeleteUserDialog from "@/components/DeleteUserDialog";
import RoleChangeDialog from "@/components/RoleChangeDialog";
import TablePagination from "@/components/TablePagination";
import UserEditDialog from "@/components/UserEditDialog";
import UsersTable from "@/components/UsersTable";
import { errorMessage } from "@/lib/errors";
import { useDebounce } from "@/lib/useDebounce";

const PAGE_SIZE = 20;

const ROLE_FILTER_ITEMS: Record<Role | "all", string> = {
  all: "All roles",
  user: "user",
  admin: "admin",
};

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
  const [editingUser, setEditingUser] = useState<User | null>(null);
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
    <div className="w-4/5 min-w-2xl mx-auto p-4">
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

          <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
        </div>

        <CreateUserDialog onCreated={(user) => setUsers((prev) => [user, ...prev])} />
      </div>

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}

      <UsersTable
        users={users}
        onEdit={setEditingUser}
        onRoleChange={(user, role) => setRoleChange({ user, role })}
        onDelete={setPendingDelete}
      />

      <TablePagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} />

      <UserEditDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSaved={(updated) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          setEditingUser(null);
        }}
      />

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
