// SPDX-License-Identifier: AGPL-3.0-or-later
import { contactAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, Textarea, toast } from "@pyxie/ui";
import { MessageCircleHeartIcon } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHeader } from "@/lib/header.tsx";

export default function ContactForm() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("contact.title"), backTo: "/settings", icon: MessageCircleHeartIcon });
  const { withLoading } = useLoading();

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await withLoading(contactAPI.sendContactMessage(message));
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
      <Card className="w-full max-w-sm">
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Textarea
              aria-label={t("contact.messageLabel")}
              placeholder={t("contact.placeholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <Button type="submit" disabled={sending || !message.trim()}>
              {t("contact.send")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
