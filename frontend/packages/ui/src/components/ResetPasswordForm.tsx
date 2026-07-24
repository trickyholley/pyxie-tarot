import { SubmitEventHandler, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "./base-ui";

export type ResetPasswordMode = "request" | "confirm";

interface ResetPasswordFormProps {
  mode: ResetPasswordMode;
  onSubmit: (value: string) => Promise<void>;
  logoSrc?: string;
  logoAlt?: string;
}

const STRINGS = {
  request: {
    title: "Forgot password",
    description: "Enter your email and we'll send you a reset link",
    submitIdle: "Send reset link",
    submitBusy: "Sending...",
    success: "If that email is registered, a reset link is on its way.",
    error: "Could not send reset link",
  },
  confirm: {
    title: "Reset password",
    description: "Choose a new password for your account",
    submitIdle: "Reset password",
    submitBusy: "Resetting...",
    success: "Your password has been reset. You can now log in.",
    error: "Could not reset password. The link may have expired.",
  },
} as const;

export default function ResetPasswordForm({ mode, onSubmit, logoSrc, logoAlt }: ResetPasswordFormProps) {
  const isConfirm = mode === "confirm";
  const strings = STRINGS[mode];

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);

    if (isConfirm && newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(isConfirm ? newPassword : email);
      setSucceeded(true);
    } catch {
      setError(strings.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-32">
      {logoSrc && (
        <div className="flex justify-center mb-6">
          <img src={logoSrc} alt={logoAlt ?? "Logo"} className="size-24" />
        </div>
      )}
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-3xl">{strings.title}</CardTitle>
          <CardDescription>{strings.description}</CardDescription>
        </CardHeader>
        {succeeded ? (
          <CardContent>
            <p className="text-sm">{strings.success}</p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4 my-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              {isConfirm ? (
                <>
                  <div>
                    <Label className="mb-2" htmlFor="newPassword">
                      New password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-2" htmlFor="confirmPassword">
                      Confirm password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="mb-2" htmlFor="email">
                    Email
                  </Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? strings.submitBusy : strings.submitIdle}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
