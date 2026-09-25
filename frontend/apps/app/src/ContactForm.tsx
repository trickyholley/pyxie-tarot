// SPDX-License-Identifier: AGPL-3.0-or-later
import { contactAPI, errorMessage, getCachedEmail } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import {
  Alert,
  AlertDescription,
  Button,
  CardContent,
  Input,
  Label,
  LogoCard,
  Textarea,
  useTransientFlag,
} from "@pyxie/ui";
import { MessageCircleHeartIcon, OctagonXIcon, Send } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { homeRoute } from "@/lib/homeRoute.ts";

export default function ContactForm() {
  const { t } = useTranslation("settings");
  const { t: tm } = useTranslation("marketing");
  const { t: tc } = useTranslation("common");
  const { withLoading } = useLoading();

  const [email, setEmail] = useState(() => getCachedEmail() ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, flagSent] = useTransientFlag();

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    try {
      await withLoading(contactAPI.sendContactMessage(email, message));
      setMessage("");
      flagSent();
    } catch (err) {
      setSendError(errorMessage(err, t("contact.error")));
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
          {sendError && (
            <Alert variant="destructive">
              <OctagonXIcon />
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            status={sending ? "pending" : sent ? "success" : "idle"}
            successLabel={tc("success")}
            disabled={!message.trim() || !email.trim()}
          >
            <Send data-icon="inline-start" />
            {t("contact.send")}
          </Button>
        </form>
      </CardContent>
    </LogoCard>
  );
}
