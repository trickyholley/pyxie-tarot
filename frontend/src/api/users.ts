import { API } from "@/constants";
import { APIError, UserCreate, UserRead } from "@/models";
const baseUrl = `${API.BASE_URL}/users`;

export async function createUser(user: UserCreate): Promise<UserRead> {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body.detail ?? "Sign-up failed");
  }

  return await res.json();
}
