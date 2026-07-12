import { SubmitEventHandler, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "./ui";

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    // TODO: wire up API call later
    console.log({ identifier, password });
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your email or username below to log in to your account</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent>
            <div>
              <Label htmlFor="identifier">Email or username</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="m@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Button type="button" onClick={() => setShowPassword((p) => !p)}>
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit">Login</Button>
            <p>
              Don't have an account? <a href="/signup">Sign up</a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
