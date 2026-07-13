import {SubmitEventHandler, useState} from "react";
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label} from "./ui";

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
    <div className="max-w-lg mx-auto mt-64">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-3xl">Log in</CardTitle>
          <CardDescription>Enter your credentials below to use your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 my-4">
            <div>
              <Label className="mb-2" htmlFor="identifier">
                Username
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="PyxieAdmin"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
            <Button type="submit">Login</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
