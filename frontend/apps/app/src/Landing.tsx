// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, Card, CardContent, Logo } from "@ui/components";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import screenshot from "@/assets/pyxie-screenshot.jpg";
import { AppRoute } from "@/lib/routes.ts";

export default function Landing() {
  const { t } = useTranslation("marketing");

  return (
    <div className="max-w-2xl mx-auto my-8 text-center">
      <div className="m-4 flex flex-col items-center">
        <Logo className="size-20 mb-8" />
        <h1 className="text-3xl font-bold italic">{t("landing.title")}</h1>
        <h2 className="text-xl italic">{t("landing.subtitle")}</h2>
      </div>
      <Card className="m-4 p-4">
        <CardContent className="flex flex-col items-center gap-4 text-lg">
          <p>
            <Trans i18nKey="landing.description" ns="marketing" components={{ i: <i /> }} />
          </p>
          <Button
            className="w-64"
            disabled
            variant="secondary"
            nativeButton={false}
            render={<Link to={AppRoute.Root} />}
          >
            <span className="line-through">{t("landing.tryQuickSpread")}</span> {t("landing.comingSoon")}
          </Button>
          <Button className="w-64" nativeButton={false} render={<Link to={AppRoute.Login} />}>
            {t("landing.loginOrSignup")}
          </Button>
          <hr className="w-full" />
          <img
            alt={t("landing.screenshotAlt")}
            className="rounded-lg h-110 w-54 border border-primary shadow-lg shadow-primary"
            src={screenshot}
          />
        </CardContent>
      </Card>
    </div>
  );
}
