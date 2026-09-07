// SPDX-License-Identifier: AGPL-3.0-or-later
import { type BillingInterval } from "@pyxie/api-client";
import { LabeledSwitch } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface SupporterIntervalToggleProps {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}

/** Monthly/annual toggle for the Star tier (issue #79), built on the shared LabeledSwitch. */
export default function SupporterIntervalToggle({ value, onChange }: SupporterIntervalToggleProps) {
  const { t } = useTranslation("settings");

  return (
    <LabeledSwitch
      checked={value === "annual"}
      onCheckedChange={(checked) => onChange(checked ? "annual" : "monthly")}
      offOption={{ label: t("supporter.interval.monthly") }}
      onOption={{ label: t("supporter.interval.annual") }}
    />
  );
}
