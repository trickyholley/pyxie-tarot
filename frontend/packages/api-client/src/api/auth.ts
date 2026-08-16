// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import {
  EmailConfirmationConfirm,
  EmailConfirmationRequest,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  RefreshRequest,
  RefreshResponse,
} from "@api-client/models";
import { postJson, postVoid } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/auth`;

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return postJson(`${baseUrl}/login`, credentials);
}

export function refresh(payload: RefreshRequest): Promise<RefreshResponse> {
  return postJson(`${baseUrl}/refresh`, payload);
}

export function logout(payload: LogoutRequest): Promise<void> {
  return postVoid(`${baseUrl}/logout`, payload);
}

export function requestPasswordReset(payload: PasswordResetRequest): Promise<void> {
  return postVoid(`${baseUrl}/password-reset/request`, payload);
}

export function confirmPasswordReset(payload: PasswordResetConfirm): Promise<void> {
  return postVoid(`${baseUrl}/password-reset/confirm`, payload);
}

export function requestEmailConfirmation(payload: EmailConfirmationRequest): Promise<void> {
  return postVoid(`${baseUrl}/email-confirmation/request`, payload);
}

export function confirmEmailConfirmation(payload: EmailConfirmationConfirm): Promise<void> {
  return postVoid(`${baseUrl}/email-confirmation/confirm`, payload);
}
