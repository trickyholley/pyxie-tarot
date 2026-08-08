// SPDX-License-Identifier: AGPL-3.0-or-later
import { Eye, EyeOff } from "lucide-react";
import { SubmitEventHandler, useMemo, useState } from "react";
import AuthCard from "./AuthCard";
import { Button, CardContent, CardFooter, Input, Label } from "./base-ui";

type AuthMode = "login" | "signup";

// Thrown by the parent when the backend rejects with 403 (insufficient role).
// AuthForm catches this silently — the parent shows a dialog instead.
export class InsufficientRoleError extends Error {
  constructor() {
    super("Insufficient role");
    this.name = "InsufficientRoleError";
  }
}

export interface AuthFormModeStrings {
  title: string;
  description: string;
  submitIdle: string;
  submitBusy: string;
  togglePrompt: string;
  toggleLink: string;
  error: string;
}

export interface AuthFormStrings {
  login: AuthFormModeStrings;
  signup: AuthFormModeStrings;
  shared: {
    usernameLabel: string;
    emailLabel: string;
    passwordLabel: string;
    confirmPasswordLabel: string;
    passwordMismatch: string;
    show: string;
    hide: string;
    forgotPassword: string;
    usernamePlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    strength: { tooShort: string; weak: string; fair: string; good: string };
  };
}

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (username: string, password: string, email?: string) => Promise<void>;
  onModeChange: (mode: AuthMode) => void;
  onForgotPassword?: () => void;
  strings: AuthFormStrings;
}

interface StrengthResult {
  score: 0 | 1 | 2 | 3;
  label: string;
}

function evaluatePasswordStrength(password: string, labels: AuthFormStrings["shared"]["strength"]): StrengthResult {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const scoreLabels = [labels.tooShort, labels.weak, labels.fair, labels.good] as const;
  return { score: score as StrengthResult["score"], label: scoreLabels[score] };
}

const STRENGTH_COLOURS: Record<number, string> = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-yellow-500",
  3: "bg-green-500",
};

export default function AuthForm({
  mode,
  onSubmit,
  onModeChange,
  onForgotPassword,
  strings: allStrings,
}: AuthFormProps) {
  const isSignup = mode === "signup";
  const strings = allStrings[mode];
  const shared = allStrings.shared;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => evaluatePasswordStrength(password, shared.strength), [password, shared.strength]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);

    if (isSignup && password !== confirmPassword) {
      setError(shared.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(username, password, isSignup ? email : undefined);
    } catch (err) {
      if (err instanceof InsufficientRoleError) {
        // Parent handles this via dialog — no inline error
        return;
      }
      setError(strings.error);
    } finally {
      setSubmitting(false);
    }
  };

  const otherMode: AuthMode = isSignup ? "login" : "signup";

  return (
    <AuthCard title={strings.title} description={strings.description}>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4 my-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label className="mb-2" htmlFor="identifier">
              {shared.usernameLabel}
            </Label>
            <Input
              id="identifier"
              type="text"
              placeholder={shared.usernamePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          {isSignup && (
            <div>
              <Label className="mb-2" htmlFor="email">
                {shared.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={shared.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <div className="flex justify-between mb-2">
              <Label htmlFor="password">{shared.passwordLabel}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={showPassword ? shared.hide : shared.show}
                onClick={() => setShowPassword((p) => !p)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={shared.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {isSignup && password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-6 rounded-full transition-colors ${
                        i < strength.score ? STRENGTH_COLOURS[strength.score] : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}
          </div>
          {!isSignup && onForgotPassword && (
            <Button type="button" variant="link" className="h-auto self-end p-0 text-sm" onClick={onForgotPassword}>
              {shared.forgotPassword}
            </Button>
          )}
          {isSignup && (
            <div>
              <Label className="mb-2" htmlFor="confirmPassword">
                {shared.confirmPasswordLabel}
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder={shared.passwordPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? strings.submitBusy : strings.submitIdle}
          </Button>
          <span className="text-sm text-muted-foreground">
            {strings.togglePrompt}{" "}
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => onModeChange(otherMode)}>
              {strings.toggleLink}
            </Button>
          </span>
        </CardFooter>
      </form>
    </AuthCard>
  );
}
