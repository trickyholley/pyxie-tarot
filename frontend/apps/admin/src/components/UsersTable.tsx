import { Role, User } from "@pyxie/api-client";
import {
  Badge,
  Button,
  cn,
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
import { Pencil, Trash2 } from "lucide-react";
import TruncatedText from "@/components/TruncatedText";

interface UsersTableProps {
  users: User[];
  loading: boolean;
  pageSize: number;
  onEdit: (user: User) => void;
  onRoleChange: (user: User, role: Role) => void;
  onDelete: (user: User) => void;
}

export default function UsersTable({ users, loading, pageSize, onEdit, onRoleChange, onDelete }: UsersTableProps) {
  return (
    // Table stays mounted (never swapped for a loading placeholder) and always renders pageSize
    // rows (real + blank filler, each pinned to h-12.5) so its height — and the pagination below
    // it — never shifts between pages, even on a short last page.
    <div style={{ height: `calc(2.5rem + ${pageSize} * 3.125rem)` }}>
      <Table className={cn("table-fixed", loading && "opacity-60")}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-3/12">Username</TableHead>
            <TableHead className="w-3/12">Email</TableHead>
            <TableHead className="w-2/12">Role</TableHead>
            <TableHead className="w-2/12">Created</TableHead>
            <TableHead className="w-2/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="h-12.5">
              <TableCell>
                <TruncatedText value={user.username} />
              </TableCell>
              <TableCell>
                <TruncatedText value={user.email} />
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
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(user)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onDelete(user)}>
                    <Trash2 />
                  </Button>
                </div>
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
