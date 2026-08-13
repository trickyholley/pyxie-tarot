// SPDX-License-Identifier: AGPL-3.0-or-later
import { Role, User, adminAPI, errorMessage } from "@pyxie/api-client";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@pyxie/ui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import CreateUserDialog from "@/components/CreateUserDialog";
import DateRangeFilter, { DateRange, formatDateParam } from "@/components/DateRangeFilter";
import DeleteUserDialog from "@/components/DeleteUserDialog";
import RoleChangeDialog from "@/components/RoleChangeDialog";
import TablePagination from "@/components/TablePagination";
import UserEditDialog from "@/components/UserEditDialog";
import UsersTable from "@/components/UsersTable";
import { useAdminList } from "@/lib/useAdminList";
import { useDebounce } from "@/lib/useDebounce";
import { useDeleteConfirm } from "@/lib/useDeleteConfirm";

export default function Users() {
  const { t } = useTranslation("users");
  const ROLE_FILTER_ITEMS: Record<Role | "all", string> = {
    all: t("roleFilter.all"),
    user: t("roleFilter.user"),
    admin: t("roleFilter.admin"),
  };
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleChange, setRoleChange] = useState<{ user: User; role: Role } | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const fetchUsers = useCallback(
    (skip: number, limit: number) =>
      adminAPI.listUsers(skip, limit, {
        search: debouncedSearch || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        createdFrom: dateRange?.from && formatDateParam(dateRange.from),
        createdTo: dateRange?.to && formatDateParam(dateRange.to),
      }),
    [debouncedSearch, roleFilter, dateRange],
  );
  const {
    items: users,
    setItems: setUsers,
    totalPages,
    loading,
    error,
    page,
    setPage,
  } = useAdminList(fetchUsers, t("loadError"));

  const { pendingDelete, setPendingDelete, deleting, confirmDelete } = useDeleteConfirm<User>(
    (id) => adminAPI.deleteUser(id),
    setUsers,
    t("deleteError"),
  );

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

  const confirmRoleChange = async () => {
    if (!roleChange) return;
    setSavingRole(true);
    try {
      const updated = await adminAPI.updateUserRole(roleChange.user.id, roleChange.role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setRoleChange(null);
    } catch (err) {
      toast.error(errorMessage(err, t("updateRoleError")));
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="w-4/5 min-w-2xl mx-auto p-4">
      <div className="mb-4 flex justify-between gap-2">
        <div className="flex gap-2">
          <Input
            placeholder={t("searchPlaceholder")}
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
              <SelectItem value="all">{t("roleFilter.all")}</SelectItem>
              <SelectItem value="user">{t("roleFilter.user")}</SelectItem>
              <SelectItem value="admin">{t("roleFilter.admin")}</SelectItem>
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
