// SPDX-License-Identifier: AGPL-3.0-or-later
import { Tier } from "@pyxie/api-client";
import { makeTestUser } from "@pyxie/providers/src/testUtils";
import { describe, expect, it } from "vitest";
import { type BillingSnapshot, billingOutcome } from "@/lib/billingReturn";

const asFool: BillingSnapshot = { tier: Tier.FOOL, cancels: false };
const asStar: BillingSnapshot = { tier: Tier.STAR, cancels: false };
const asCancellingStar: BillingSnapshot = { tier: Tier.STAR, cancels: true };

describe("billingOutcome", () => {
  it("reports a new subscription", () => {
    expect(billingOutcome(asFool, makeTestUser({ tier: Tier.STAR }))).toBe("subscribed");
  });

  // The case that made this function necessary: Polar leaves a cancelled-at-period-end subscription
  // `active`, so the tier is identical on both sides and only the flag reveals what happened.
  it("reports a cancel-at-period-end even though the tier is unchanged", () => {
    const after = makeTestUser({ tier: Tier.STAR, tier_cancels_at_period_end: true });
    expect(billingOutcome(asStar, after)).toBe("cancelled");
  });

  it("reports an immediate revoke", () => {
    expect(billingOutcome(asStar, makeTestUser({ tier: Tier.FOOL }))).toBe("cancelled");
  });

  it("reports an uncancel as a subscription", () => {
    const after = makeTestUser({ tier: Tier.STAR, tier_cancels_at_period_end: false });
    expect(billingOutcome(asCancellingStar, after)).toBe("subscribed");
  });

  // Updating a card is a trip to Polar that changes nothing we track - it must stay silent rather
  // than congratulating or thanking anyone.
  it("stays silent when nothing changed", () => {
    expect(billingOutcome(asStar, makeTestUser({ tier: Tier.STAR }))).toBeNull();
    expect(billingOutcome(asFool, makeTestUser({ tier: Tier.FOOL }))).toBeNull();
  });

  // While the webhook is still in flight the user reads exactly as it did before, which must not be
  // mistaken for "they changed nothing" - the caller retries on null.
  it("stays silent while a cancellation is still only known to Polar", () => {
    const after = makeTestUser({ tier: Tier.STAR, tier_cancels_at_period_end: false });
    expect(billingOutcome(asStar, after)).toBeNull();
  });
});
