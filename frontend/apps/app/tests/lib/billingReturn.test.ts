// SPDX-License-Identifier: AGPL-3.0-or-later
import { Licence } from "@pyxie/api-client";
import { makeTestUser } from "@pyxie/providers/src/testUtils";
import { describe, expect, it } from "vitest";
import { type BillingSnapshot, billingOutcome } from "@/lib/billingReturn";

const noLicence: BillingSnapshot = { licence: Licence.NONE, cancels: false };
const subscribed: BillingSnapshot = { licence: Licence.SUBSCRIPTION, cancels: false };
const cancellingSubscription: BillingSnapshot = { licence: Licence.SUBSCRIPTION, cancels: true };

describe("billingOutcome", () => {
  it("reports a new subscription", () => {
    expect(billingOutcome(noLicence, makeTestUser({ licence: Licence.SUBSCRIPTION }))).toBe("subscribed");
  });

  // The case that made `cancels` necessary: Gumroad leaves a cancelled-at-period-end subscription
  // reading as an active licence until the period ends, so licence alone can't reveal the pending cancel.
  it("reports a cancel-at-period-end even though the licence is unchanged", () => {
    const after = makeTestUser({ licence: Licence.SUBSCRIPTION, licence_cancels_at_period_end: true });
    expect(billingOutcome(subscribed, after)).toBe("cancelled");
  });

  it("reports an immediate revoke", () => {
    expect(billingOutcome(subscribed, makeTestUser({ licence: Licence.NONE }))).toBe("cancelled");
  });

  it("reports an uncancel as a subscription", () => {
    const after = makeTestUser({ licence: Licence.SUBSCRIPTION, licence_cancels_at_period_end: false });
    expect(billingOutcome(cancellingSubscription, after)).toBe("subscribed");
  });

  it("reports reaching a perpetual licence as achieved, from either standing", () => {
    expect(billingOutcome(noLicence, makeTestUser({ licence: Licence.PERPETUAL }))).toBe("achieved");
    expect(billingOutcome(subscribed, makeTestUser({ licence: Licence.PERPETUAL }))).toBe("achieved");
  });

  it("stays silent when nothing changed", () => {
    expect(billingOutcome(subscribed, makeTestUser({ licence: Licence.SUBSCRIPTION }))).toBeNull();
    expect(billingOutcome(noLicence, makeTestUser({ licence: Licence.NONE }))).toBeNull();
  });

  // While the webhook is still in flight the user reads exactly as it did before, which must not be
  // mistaken for "they changed nothing" - the caller retries on null.
  it("stays silent while a cancellation is still only known to Gumroad", () => {
    const after = makeTestUser({ licence: Licence.SUBSCRIPTION, licence_cancels_at_period_end: false });
    expect(billingOutcome(subscribed, after)).toBeNull();
  });
});
