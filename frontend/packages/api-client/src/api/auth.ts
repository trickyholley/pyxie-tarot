import {API} from "@/constants";
import {LoginRequest, LoginResponse} from "@/models";
import {apiFetch} from "@/utils.ts";

const baseUrl = `${API.BASE_URL}/auth`;

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const res = await apiFetch(`${baseUrl}/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  return (await res.json()) as LoginResponse;
}
