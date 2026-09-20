// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { Button, Card, CardContent } from "@pyxie/ui";
import { Home as HomeIcon, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";

export default function Home() {
  const { t } = useTranslation("home");
  const { user } = useAuth();
  useHeader({ title: t("title"), icon: HomeIcon });

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">{t("greeting", { username: user?.username })}</p>
          <Button nativeButton={false} render={<Link to={AppRoute.Reading} />}>
            <Sparkles data-icon="inline-start" />
            {t("startReading")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
