// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ClientType } from "./client-type";
import { User } from "./user";

export interface Token {
  access_token: string;
  token_type?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
  refresh_token?: string; // app only - admin has no refresh flow
}

export interface LoginRequest {
  username: string;
  password: string;
  client?: ClientType;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LogoutRequest {
  refresh_token: string;
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
  client?: ClientType;
}

export interface EmailConfirmationConfirm {
  token: string;
}
