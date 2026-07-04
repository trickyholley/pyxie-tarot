import { BASE_URL } from "../constant";
import { setToken } from "../util";
const baseUrl = `${BASE_URL}/auth`;

export async function login(credentials: LoginRequest): Promise<Token> {
  const res = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? "Login failed");
  }

  const token = (await res.json()) as Token;
  setToken(token.access_token);
  return token;
}
