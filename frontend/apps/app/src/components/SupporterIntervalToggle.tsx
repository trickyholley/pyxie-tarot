// SPDX-License-Identifier: AGPL-3.0-or-later
import { type BillingInterval } from "@pyxie/api-client";
import { Badge, Switch } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface SupporterIntervalToggleProps {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}

/** Monthly/annual switch for the Star tier card (issue #79) - a single two-state Switch rather than a
 * dedicated tab/segmented control, since there's only ever these two intervals to choose between. */
export default function SupporterIntervalToggle({ value, onChange }: SupporterIntervalToggleProps) {
  const { t } = useTranslation("settings");
  const isAnnual = value === "annual";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={isAnnual ? "text-muted-foreground" : "font-medium"}>{t("supporter.interval.monthly")}</span>
      <Switch checked={isAnnual} onCheckedChange={(checked) => onChange(checked ? "annual" : "monthly")} />
      <span className={isAnnual ? "font-medium" : "text-muted-foreground"}>{t("supporter.interval.annual")}</span>
      <Badge variant="outline">{t("supporter.interval.annualSavings")}</Badge>
    </div>
  );
}
