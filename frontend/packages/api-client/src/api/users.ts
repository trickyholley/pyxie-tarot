import {API} from "@api-client/constants";
import {UserAuth} from "@api-client/models";
import {apiFetch} from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/users`;

export function getMe(): Promise<Response> {
  return apiFetch(`${baseUrl}/me`, { method: "GET" });
}

export function createUser(user: UserAuth): Promise<Response> {
  return apiFetch(baseUrl, {
    method: "POST",
    body: JSON.stringify(user),
  });
}
