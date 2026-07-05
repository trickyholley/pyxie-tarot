import { API } from "@/constants";
import { setToken } from "@/utils";
import { APIError, LoginRequest, Token } from "@/models";
const baseUrl = `${API.BASE_URL}/auth`;

export async function login(credentials: LoginRequest): Promise<Token> {
  const res = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body.detail ?? "Login failed");
  }

  const token = (await res.json()) as Token;
  setToken(token.access_token);
  return token;
}
