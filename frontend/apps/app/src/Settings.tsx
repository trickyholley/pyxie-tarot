// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { Button, Card, CardContent } from "@pyxie/ui";
import { useNavigate } from "react-router-dom";
import { CURRENT_VERSION } from "@/lib/changelog.ts";
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
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={handleLogout}>
            Log out
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/changelog")}>
            What's new
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Pyxie Tarot v{CURRENT_VERSION}</p>
    </div>
  );
}
