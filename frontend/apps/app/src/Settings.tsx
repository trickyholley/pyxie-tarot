import { useAuth } from "@pyxie/providers";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@pyxie/ui";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
