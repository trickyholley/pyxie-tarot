import { Role, User } from "@pyxie/api-client";
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
} from "@pyxie/ui";
import { Trash2 } from "lucide-react";
import EditableCell from "@/components/EditableCell";

interface UsersTableProps {
  users: User[];
  loading: boolean;
  pageSize: number;
  onUpdateField: (userId: string) => (payload: { username?: string; email?: string }) => Promise<void>;
  onRoleChange: (user: User, role: Role) => void;
  onDelete: (user: User) => void;
}

export default function UsersTable({
  users,
  loading,
  pageSize,
  onUpdateField,
  onRoleChange,
  onDelete,
}: UsersTableProps) {
  return (
    // Table stays mounted (never swapped for a loading placeholder) and always renders pageSize
    // rows (real + blank filler, each pinned to h-12.5) so its height — and the pagination below
    // it — never shifts between pages, even on a short last page.
    <div style={{ height: `calc(2.5rem + ${pageSize} * 3.125rem)` }}>
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
                <EditableCell value={user.username} onSave={(username) => onUpdateField(user.id)({ username })} />
              </TableCell>
              <TableCell>
                <EditableCell value={user.email} onSave={(email) => onUpdateField(user.id)({ email })} />
              </TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(role) => role !== null && role !== user.role && onRoleChange(user, role)}
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
                <Button variant="ghost" size="icon-xs" onClick={() => onDelete(user)}>
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {Array.from({ length: Math.max(0, pageSize - users.length) }).map((_, i) => (
            <TableRow key={`filler-${i}`} className="h-12.5">
              <TableCell colSpan={5} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
