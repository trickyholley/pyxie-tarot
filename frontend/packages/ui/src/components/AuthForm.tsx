import { SubmitEventHandler, useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "./ui";

type AuthMode = "login" | "signup";

// Thrown by the parent when the backend rejects with 403 (insufficient role).
// AuthForm catches this silently — the parent shows a dialog instead.
export class InsufficientRoleError extends Error {
  constructor() {
    super("Insufficient role");
    this.name = "InsufficientRoleError";
  }
}

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (username: string, password: string, email?: string) => Promise<void>;
  onModeChange: (mode: AuthMode) => void;
}

const STRINGS = {
  login: {
    title: "Log in",
    description: "Enter your credentials below to use your account",
    submitIdle: "Login",
    submitBusy: "Logging in...",
    togglePrompt: "Don't have an account?",
    toggleLink: "Sign up",
    error: "Invalid username or password",
  },
  signup: {
    title: "Sign up",
    description: "Create an account below to get started",
    submitIdle: "Sign up",
    submitBusy: "Creating account...",
    togglePrompt: "Already have an account?",
    toggleLink: "Log in",
    error: "Could not create account",
  },
  shared: {
    usernameLabel: "Username",
    emailLabel: "Email",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    passwordMismatch: "Passwords do not match",
    show: "Show",
    hide: "Hide",
  },
} as const;

interface StrengthResult {
  score: 0 | 1 | 2 | 3;
  label: string;
}

function evaluatePasswordStrength(password: string): StrengthResult {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Too short", "Weak", "Fair", "Good"] as const;
  return { score: score as StrengthResult["score"], label: labels[score] };
}

const STRENGTH_COLOURS: Record<number, string> = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-yellow-500",
  3: "bg-green-500",
};

export default function AuthForm({ mode, onSubmit, onModeChange }: AuthFormProps) {
  const isSignup = mode === "signup";
  const strings = STRINGS[mode];

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);

    if (isSignup && password !== confirmPassword) {
      setError(STRINGS.shared.passwordMismatch);
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
    <div className="max-w-lg mx-auto mt-64">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-3xl">{strings.title}</CardTitle>
          <CardDescription>{strings.description}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 my-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label className="mb-2" htmlFor="identifier">
                {STRINGS.shared.usernameLabel}
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="PyxieAdmin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {isSignup && (
              <div>
                <Label className="mb-2" htmlFor="email">
                  {STRINGS.shared.emailLabel}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="reader@pyxie.tarot"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="password">{STRINGS.shared.passwordLabel}</Label>
                <Button type="button" onClick={() => setShowPassword((p) => !p)}>
                  {showPassword ? STRINGS.shared.hide : STRINGS.shared.show}
                </Button>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="hunter2"
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
                  <span
                    className="text-xs text-muted-
foreground"
                  >
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
            {isSignup && (
              <div>
                <Label className="mb-2" htmlFor="confirmPassword">
                  {STRINGS.shared.confirmPasswordLabel}
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="hunter2"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
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
      </Card>
    </div>
  );
}
