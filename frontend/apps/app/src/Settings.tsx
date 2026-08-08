// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { Button, Card, CardContent } from "@pyxie/ui";
import { useNavigate } from "react-router-dom";
import { useHeader } from "@/lib/header.tsx";

export default function Settings() {
  useHeader({ title: "Settings" });
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-4">
      <Card className="w-full max-w-sm">
        <CardContent>
          <Button type="button" variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
