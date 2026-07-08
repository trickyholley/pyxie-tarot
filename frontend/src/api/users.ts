import { API } from "@/constants";
import { User, UserAuth } from "@/models";
import { authedFetch } from "@/utils";

const baseUrl = `${API.BASE_URL}/users`;

export async function listUsers(skip?: number, limit?: number): Promise<User[]> {
  const res = await authedFetch(`${baseUrl}?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return await res.json();
}

export async function getUser(id: string): Promise<User> {
  const res = await authedFetch(baseUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  return await res.json();
}

export async function createUser(user: UserAuth): Promise<User> {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  return await res.json();
}
