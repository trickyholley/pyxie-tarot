import {authAPI} from "@pyxie/api-client";
import {useAuth} from "@pyxie/providers";
import {LoginForm} from "@pyxie/ui";
import {useNavigate} from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (username: string, password: string) => {
    const { access_token, user } = await authAPI.login({ username, password });
    login(access_token, user);
    navigate("/users", { replace: true });
  };

  return <LoginForm onSubmit={handleSubmit} />;
}
