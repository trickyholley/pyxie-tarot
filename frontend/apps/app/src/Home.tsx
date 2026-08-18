// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { Home as HomeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHeader } from "@/lib/header.tsx";

export default function Home() {
  const { t } = useTranslation("home");
  const { user } = useAuth();
  useHeader({ title: t("title"), icon: HomeIcon });

  return (
    <div className="flex flex-col items-center gap-4 p-4 text-muted-foreground">
      {t("greeting", { username: user?.username })}
    </div>
  );
}
