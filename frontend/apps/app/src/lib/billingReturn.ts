// SPDX-License-Identifier: AGPL-3.0-or-later
import { Tier, type User } from "@pyxie/api-client";

export type BillingOutcome = "subscribed" | "cancelled";

/**
 * Polar keeps a cancelled-at-period-end subscription `active`, so `tier` alone can't see a cancellation -
 * `cancels` is what makes that case visible.
 */
export interface BillingSnapshot {
  tier: Tier;
  cancels: boolean;
}

// sessionStorage, not React state: on web, opening Polar is a real navigation away, so the snapshot has
// to outlive the page. It's per-tab and cleared by the browser on tab close, which is exactly the
// lifetime we want - a stale snapshot would pop a modal at someone days later.
const SNAPSHOT_KEY = "pyxie:billing-snapshot";

export function takeBillingSnapshot(user: User): void {
  const snapshot: BillingSnapshot = { tier: user.tier, cancels: user.tier_cancels_at_period_end };
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function readBillingSnapshot(): BillingSnapshot | null {
  const raw = sessionStorage.getItem(SNAPSHOT_KEY);
  return raw === null ? null : (JSON.parse(raw) as BillingSnapshot);
}

export function clearBillingSnapshot(): void {
  sessionStorage.removeItem(SNAPSHOT_KEY);
}

/** How much support is standing, as a single scale - a cancelled-at-period-end Star sits between
 * a renewing one and no subscription at all
 */
function supportStanding(tier: Tier, cancelsAtPeriodEnd: boolean): number {
  if (tier !== Tier.STAR) return 0;
  return cancelsAtPeriodEnd ? 1 : 2;
}

/** Diffs the pre-Polar snapshot against the freshly re-read user, returning what changed - or
 * null when nothing did, which is both "they only updated their card" and "the webhook hasn't landed
 * yet". The caller distinguishes those two by retrying, not by anything visible here.
 *
 * Going up covers a first subscription, a resubscribe, and an uncancel; going down covers both a
 * cancel-at-period-end (still Star until it elapses) and an outright revoke.
 */
export function billingOutcome(before: BillingSnapshot, after: User): BillingOutcome | null {
  const was = supportStanding(before.tier, before.cancels);
  const now = supportStanding(after.tier, after.tier_cancels_at_period_end);

  if (now === was) return null;
  return now > was ? "subscribed" : "cancelled";
}
