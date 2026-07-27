// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import {
  EmailConfirmationConfirm,
  EmailConfirmationRequest,
  LoginRequest,
  LoginResponse,
  PasswordResetConfirm,
  PasswordResetRequest,
} from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/auth`;

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const res = await apiFetch(`${baseUrl}/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  return (await res.json()) as LoginResponse;
}

export async function requestPasswordReset(payload: PasswordResetRequest): Promise<void> {
  await apiFetch(`${baseUrl}/password-reset/request`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmPasswordReset(payload: PasswordResetConfirm): Promise<void> {
  await apiFetch(`${baseUrl}/password-reset/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestEmailConfirmation(payload: EmailConfirmationRequest): Promise<void> {
  await apiFetch(`${baseUrl}/email-confirmation/request`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmEmailConfirmation(payload: EmailConfirmationConfirm): Promise<void> {
  await apiFetch(`${baseUrl}/email-confirmation/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
