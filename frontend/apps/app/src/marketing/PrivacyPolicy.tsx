// SPDX-License-Identifier: AGPL-3.0-or-later
import { ShieldIcon } from "lucide-react";
import { AppRoute } from "@/lib/routes.ts";
import { PRIVACY_POLICY_EFFECTIVE_DATE } from "./policyContent.ts";
import PolicyPage from "./PolicyPage.tsx";

export default function PrivacyPolicy() {
  return (
    <PolicyPage
      docKey="privacyPolicy"
      icon={ShieldIcon}
      effectiveDate={PRIVACY_POLICY_EFFECTIVE_DATE}
      path={AppRoute.PrivacyPolicy}
    />
  );
}
