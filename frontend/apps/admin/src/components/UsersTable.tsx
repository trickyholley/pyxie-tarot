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
import { Pencil, Trash2 } from "lucide-react";
import TruncatedText from "@/components/TruncatedText";

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onRoleChange: (user: User, role: Role) => void;
  onDelete: (user: User) => void;
}

export default function UsersTable({ users, onEdit, onRoleChange, onDelete }: UsersTableProps) {
  return (
    // 65rem caps height at Users.tsx's PAGE_SIZE (20 rows * 3.125rem + 2.5rem header); shrinks below
    // that on shorter viewports.
    <div className="h-[min(65rem,calc(100vh-14rem))] overflow-y-auto *:data-[slot=table-container]:overflow-visible">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted hover:bg-muted">
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
        </TableBody>
      </Table>
    </div>
  );
}
