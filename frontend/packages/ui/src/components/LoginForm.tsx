import {SubmitEventHandler, useState} from "react";
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label} from "./ui";

interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void>;
}

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await onSubmit(username, password);
    } catch {
      setError("Invalid username or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-64">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-3xl">Log in</CardTitle>
          <CardDescription>Enter your credentials below to use your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 my-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div>
              <Label className="mb-2" htmlFor="identifier">
                Username
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
            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="password">Password</Label>
                <Button type="button" onClick={() => setShowPassword((p) => !p)}>
                  {showPassword ? "Hide" : "Show"}
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
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
