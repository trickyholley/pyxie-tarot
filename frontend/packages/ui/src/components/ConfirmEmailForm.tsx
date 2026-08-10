// SPDX-License-Identifier: AGPL-3.0-or-later
import { SubmitEventHandler, useEffect, useState } from "react";
import AuthCard from "./AuthCard";
import { Button, CardContent, CardFooter, Input, Label } from "./base-ui";

export type ConfirmEmailMode = "resend" | "confirm";

interface ConfirmEmailModeStrings {
  title: string;
  description: string;
  submitIdle: string;
  submitBusy: string;
  success: string;
  error: string;
}

export interface ConfirmEmailFormStrings {
  resend: ConfirmEmailModeStrings;
  confirm: ConfirmEmailModeStrings;
  emailLabel: string;
}

interface ConfirmEmailFormProps {
  mode: ConfirmEmailMode;
  onSubmit: (email: string) => Promise<void>;
  strings: ConfirmEmailFormStrings;
}

/** `resend` shows an email form; `confirm` submits the URL's token immediately on mount, no form shown. */
export default function ConfirmEmailForm({ mode, onSubmit, strings: allStrings }: ConfirmEmailFormProps) {
  const isConfirm = mode === "confirm";
  const strings = allStrings[mode];

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
                {allStrings.emailLabel}
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
