import {API} from "@/constants";
import {User, UserAuth} from "@/models";
import {apiFetch} from "@/utils";

const baseUrl = `${API.BASE_URL}/users`;

export function getMe(): Promise<User> {
  return apiFetch<User>(`${baseUrl}/me`, { method: "GET" });
}

export function createUser(user: UserAuth): Promise<User> {
  return apiFetch<User>(baseUrl, {
    method: "POST",
    body: JSON.stringify(user),
  });
}
