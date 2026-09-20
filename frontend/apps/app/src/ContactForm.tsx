// SPDX-License-Identifier: AGPL-3.0-or-later
import { contactAPI, errorMessage, getCachedEmail } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, CardContent, Input, Label, LogoCard, Textarea, toast } from "@pyxie/ui";
import { MessageCircleHeartIcon, Send } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { homeRoute } from "@/lib/homeRoute.ts";

export default function ContactForm() {
  const { t } = useTranslation("settings");
  const { t: tm } = useTranslation("marketing");
  const { withLoading } = useLoading();

  const [email, setEmail] = useState(() => getCachedEmail() ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await withLoading(contactAPI.sendContactMessage(email, message));
      setMessage("");
      toast.success(t("contact.sentToast"));
    } catch (err) {
      toast.error(errorMessage(err, t("contact.error")));
    } finally {
      setSending(false);
    }
  };

  return (
    <LogoCard
      title={t("contact.title")}
      icon={MessageCircleHeartIcon}
      fullHeight={false}
      headerExtra={
        <Link to={homeRoute()} className="text-sm text-muted-foreground underline underline-offset-4">
          {tm("backToHome")}
        </Link>
      }
    >
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-2" htmlFor="email">
              {t("contact.emailLabel")}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("contact.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Textarea
            aria-label={t("contact.messageLabel")}
            placeholder={t("contact.placeholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <Button type="submit" disabled={sending || !message.trim() || !email.trim()}>
            <Send data-icon="inline-start" />
            {t("contact.send")}
          </Button>
        </form>
      </CardContent>
    </LogoCard>
  );
}
