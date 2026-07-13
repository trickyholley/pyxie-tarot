import {API} from "@/constants";
import {User} from "@/models";

const baseUrl = `${API.BASE_URL}/admin/users`;

export async function listUsers(skip?: number, limit?: number): Promise<User[]> {
  const res = await fetch(`${baseUrl}?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return await res.json();
}

export async function getUser(userId: string): Promise<User> {
  const res = await fetch(`${baseUrl}?user_id=${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return await res.json();
}
