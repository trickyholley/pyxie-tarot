import {User} from "@api-client/models";

export type ClientType = "app" | "admin";

export interface Token {
  access_token: string;
  token_type?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
  client?: ClientType;
}
