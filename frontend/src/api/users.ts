import { API } from "../constant";
const baseUrl = `${API.BASE_URL}/users`;

export async function createUser(user: UserCreate): Promise<UserRead> {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? "Sign-up failed");
  }

  return res.json() as Promise<UserRead>;
}
