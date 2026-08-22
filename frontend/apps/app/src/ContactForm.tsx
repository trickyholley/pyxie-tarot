// SPDX-License-Identifier: AGPL-3.0-or-later
import { contactAPI, errorMessage } from "@pyxie/api-client";
import { useAuth, useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, Input, Label, Textarea, toast } from "@pyxie/ui";
import { MessageCircleHeartIcon } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import NoAuthPageHeader from "@/components/NoAuthPageHeader.tsx";

export default function ContactForm() {
  const { t } = useTranslation("settings");
  const { withLoading } = useLoading();
  const { user } = useAuth();

  const [email, setEmail] = useState(user?.email ?? "");
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
    <div className="flex flex-col gap-4 p-4">
      <NoAuthPageHeader title={t("contact.title")} icon={MessageCircleHeartIcon} />
      <Card className="mx-auto w-full max-w-sm">
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
              {t("contact.send")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
