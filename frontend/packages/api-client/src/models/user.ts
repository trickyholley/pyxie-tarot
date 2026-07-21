export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface UserAuth {
  email: string;
  username: string;
  password: string;
}
