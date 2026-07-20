import { authAPI, userAPI } from "@pyxie/api-client";
import { ApiError } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import { AuthForm, InsufficientRoleError } from "@pyxie/ui";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type AuthMode = "login" | "signup";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("login");
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    try {
      const { access_token, user } = await authAPI.login({ username, password, client: "admin" });
      login(access_token, user);
      navigate("/users", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setShowPendingDialog(true);
        throw new InsufficientRoleError();
      }
      throw err; // 401, network errors, etc. — AuthForm shows inline error
    }
  };

  const handleSignup = async (username: string, password: string, email?: string) => {
    // AuthForm's shared onSubmit signature makes email optional, but its signup mode
    // always requires the field before calling this handler.
    if (!email) return;
    await userAPI.createUser({ username, password, email });
    setShowPendingDialog(true);
  };

  const handleSubmit = mode === "login" ? handleLogin : handleSignup;

  const handleDialogClose = () => {
    setShowPendingDialog(false);
    setMode("login");
  };

  return (
    <>
      <AuthForm mode={mode} onSubmit={handleSubmit} onModeChange={setMode} />

      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account created</DialogTitle>
            <DialogDescription>
              Your account has been created successfully, but it doesn't have access yet. Please ask an existing admin
              to promote your role so you can log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleDialogClose}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
