// SPDX-License-Identifier: AGPL-3.0-or-later
import { User } from "@api-client/models";

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

export interface PasswordResetRequest {
  email: string;
  client?: ClientType;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface EmailConfirmationRequest {
  email: string;
}

export interface EmailConfirmationConfirm {
  token: string;
}
