import { API } from "@/constants";
import { LoginRequest, Token } from "@/models";
import { setToken } from "@/utils";
const baseUrl = `${API.BASE_URL}/auth`;

export async function login(credentials: LoginRequest): Promise<Token> {
  const res = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const token = (await res.json()) as Token;
  setToken(token.access_token);
  return token;
}
