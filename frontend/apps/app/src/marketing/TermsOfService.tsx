// SPDX-License-Identifier: AGPL-3.0-or-later
import { ScrollTextIcon } from "lucide-react";
import { AppRoute } from "@/lib/routes.ts";
import { TERMS_OF_SERVICE_EFFECTIVE_DATE } from "./policyContent.ts";
import PolicyPage from "./PolicyPage.tsx";

export default function TermsOfService() {
  return (
    <PolicyPage
      docKey="termsOfService"
      icon={ScrollTextIcon}
      effectiveDate={TERMS_OF_SERVICE_EFFECTIVE_DATE}
      path={AppRoute.TermsOfService}
    />
  );
}
