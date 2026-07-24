import { authAPI, userAPI } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import { AuthForm } from "@pyxie/ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

type AuthMode = "login" | "signup";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("login");

  const handleLogin = async (username: string, password: string) => {
    const { access_token, user } = await authAPI.login({ username, password, client: "app" });
    login(access_token, user);
    navigate("/home", { replace: true });
  };

  const handleSignup = async (username: string, password: string, email?: string) => {
    // AuthForm's shared onSubmit signature makes email optional, but its signup mode
    // always requires the field before calling this handler.
    if (!email) return;
    await userAPI.createUser({ username, password, email });
    const { access_token, user } = await authAPI.login({ username, password, client: "app" });
    login(access_token, user);
    navigate("/home", { replace: true });
  };

  const handleSubmit = mode === "login" ? handleLogin : handleSignup;

  return (
    <AuthForm
      mode={mode}
      onSubmit={handleSubmit}
      onModeChange={setMode}
      onForgotPassword={() => navigate("/forgot-password")}
      logoSrc={logo}
      logoAlt="Pyxie Tarot"
    />
  );
}
