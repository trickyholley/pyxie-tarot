// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI, ClientType, userAPI } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import { AuthForm, SignupBotDefense } from "@pyxie/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";

type AuthMode = "login" | "signup";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const [mode, setMode] = useState<AuthMode>("login");

  const handleLogin = async (username: string, password: string) => {
    const { access_token, refresh_token, user } = await authAPI.login({
      username,
      password,
      client: ClientType.APP,
    });
    login(access_token, user, refresh_token);
    navigate(AppRoute.Home, { replace: true });
  };

  const handleSignup = async (username: string, password: string, email?: string, botDefense?: SignupBotDefense) => {
    // AuthForm's shared onSubmit signature makes email optional, but signup mode always requires it.
    if (!email) return;
    await userAPI.createUser({ username, password, email, client: ClientType.APP, ...botDefense });
    const { access_token, refresh_token, user } = await authAPI.login({
      username,
      password,
      client: ClientType.APP,
    });
    login(access_token, user, refresh_token);
    navigate(AppRoute.Home, { replace: true });
  };

  const handleSubmit = mode === "login" ? handleLogin : handleSignup;

  return (
    <AuthForm
      mode={mode}
      onSubmit={handleSubmit}
      onModeChange={setMode}
      onForgotPassword={() => navigate(AppRoute.ForgotPassword)}
      strings={{
        login: t("login", { returnObjects: true }),
        signup: t("signup", { returnObjects: true }),
        shared: t("shared", { returnObjects: true }),
      }}
    />
  );
}
