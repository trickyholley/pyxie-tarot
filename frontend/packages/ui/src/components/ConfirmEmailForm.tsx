// SPDX-License-Identifier: AGPL-3.0-or-later
import { SubmitEventHandler, useEffect, useState } from "react";
import AuthCard from "./AuthCard";
import { Button, CardContent, CardFooter, Input, Label } from "./base-ui";

export type ConfirmEmailMode = "resend" | "confirm";

interface ConfirmEmailFormProps {
  mode: ConfirmEmailMode;
  onSubmit: (email: string) => Promise<void>;
}

const STRINGS = {
  resend: {
    title: "Resend confirmation",
    description: "Enter your email and we'll send you a new confirmation link",
    submitIdle: "Send confirmation link",
    submitBusy: "Sending...",
    success: "If that email is registered and unconfirmed, a confirmation link is on its way.",
    error: "Could not send confirmation link",
  },
  confirm: {
    title: "Confirm email",
    description: "Confirming your email address...",
    submitIdle: "",
    submitBusy: "",
    success: "Your email has been confirmed.",
    error: "Could not confirm email. The link may have expired.",
  },
} as const;

export default function ConfirmEmailForm({ mode, onSubmit }: ConfirmEmailFormProps) {
  const isConfirm = mode === "confirm";
  const strings = STRINGS[mode];

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(isConfirm);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    if (!isConfirm) return;

    onSubmit("")
      .then(() => setSucceeded(true))
      .catch(() => setError(strings.error))
      .finally(() => setSubmitting(false));
    // Run once on mount to confirm the token already present in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email);
      setSucceeded(true);
    } catch {
      setError(strings.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title={strings.title} description={isConfirm ? undefined : strings.description}>
      {isConfirm ? (
        <CardContent>
          <p className="text-sm">{submitting ? strings.description : error ? error : strings.success}</p>
        </CardContent>
      ) : succeeded ? (
        <CardContent>
          <p className="text-sm">{strings.success}</p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 my-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label className="mb-2" htmlFor="email">
                Email
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? strings.submitBusy : strings.submitIdle}
            </Button>
          </CardFooter>
        </form>
      )}
    </AuthCard>
  );
}
