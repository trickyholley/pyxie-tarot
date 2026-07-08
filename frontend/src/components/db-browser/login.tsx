import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUser, login } from "@/api";
import { ROUTES } from "@/constants";
import { UserAuth } from "@/models";
import { isAuthenticated } from "@/utils";

type Mode = "signin" | "signup";

export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  if (isAuthenticated()) {
    navigate(`/${ROUTES.DB_USERS}`);
    return null;
  }

  const isSignUp = mode === "signup";

  const toggleMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const payload: UserAuth = { email, username, password };
        await createUser(payload);
        await login({ email, password });
      } else {
        await login({ email, password });
      }

      navigate(`/${ROUTES.DB_USERS}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "2rem auto" }}>
      <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>

        {isSignUp && (
          <div style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="username">Username</label>
            <br />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>

        {error && <p style={{ color: "red", fontSize: "0.85rem" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={toggleMode}
          style={{
            background: "none",
            border: "none",
            color: "blue",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {isSignUp ? "Sign In" : "Sign Up"}
        </button>
      </p>
    </div>
  );
}
