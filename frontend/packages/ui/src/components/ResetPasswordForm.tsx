// SPDX-License-Identifier: AGPL-3.0-or-later
import { ArrowLeft } from "lucide-react";
import { SubmitEventHandler, useState } from "react";
import AuthCard from "./AuthCard";
import { Button, CardContent, CardFooter, Input, Label } from "./base-ui";

export type ResetPasswordMode = "request" | "confirm";

interface ResetPasswordModeStrings {
  title: string;
  description: string;
  submitIdle: string;
  submitBusy: string;
  success: string;
  error: string;
}

export interface ResetPasswordFormStrings {
  request: ResetPasswordModeStrings;
  confirm: ResetPasswordModeStrings;
  backToLogin: string;
  passwordMismatch: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  emailLabel: string;
}

interface ResetPasswordFormProps {
  mode: ResetPasswordMode;
  onSubmit: (value: string) => Promise<void>;
  onBack?: () => void;
  strings: ResetPasswordFormStrings;
}

/** `request` collects an email to send the reset link; `confirm` collects the new password once the link is followed. */
export default function ResetPasswordForm({ mode, onSubmit, onBack, strings: allStrings }: ResetPasswordFormProps) {
  const isConfirm = mode === "confirm";
  const strings = allStrings[mode];

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
      setError(allStrings.passwordMismatch);
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
    <AuthCard title={strings.title} description={strings.description}>
      {succeeded ? (
        <>
          <CardContent>
            <p className="text-sm">{strings.success}</p>
          </CardContent>
          {onBack && (
            <CardFooter>
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft />
                {allStrings.backToLogin}
              </Button>
            </CardFooter>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 my-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {isConfirm ? (
              <>
                <div>
                  <Label className="mb-2" htmlFor="newPassword">
                    {allStrings.newPasswordLabel}
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
                    {allStrings.confirmPasswordLabel}
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
                  {allStrings.emailLabel}
                </Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {onBack && (
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft />
                {allStrings.backToLogin}
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? strings.submitBusy : strings.submitIdle}
            </Button>
          </CardFooter>
        </form>
      )}
    </AuthCard>
  );
}
