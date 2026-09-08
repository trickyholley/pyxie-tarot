// SPDX-License-Identifier: AGPL-3.0-or-later
import { Licence, type User } from "@pyxie/api-client";

export type BillingOutcome = "subscribed" | "achieved" | "cancelled";

// licence alone doesn't contain whether a cancellation is pending
// cancels serves that purpose
export interface BillingSnapshot {
  licence: Licence;
  cancels: boolean;
  takenAt: number;
}

// Save to sessionStorage so the app responds to a user who navigates off to Gumroad correctly
// which refreshes the app and loses state
const SNAPSHOT_KEY = "pyxie:billing-snapshot";

export function takeBillingSnapshot(user: User): void {
  const snapshot: BillingSnapshot = {
    licence: user.licence,
    cancels: user.licence_cancels_at_period_end,
    takenAt: Date.now(),
  };
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function readBillingSnapshot(): BillingSnapshot | null {
  const raw = sessionStorage.getItem(SNAPSHOT_KEY);
  return raw === null ? null : (JSON.parse(raw) as BillingSnapshot);
}

export function clearBillingSnapshot(): void {
  sessionStorage.removeItem(SNAPSHOT_KEY);
}

/**
 * Comparisons for billing outcome
 * 3 - perpetual licence
 * 2 - sub will renew
 * 1 - sub will cancel
 */
function supportStanding(licence: Licence, cancelsAtPeriodEnd: boolean): number {
  if (licence === Licence.PERPETUAL || licence === Licence.COMP) return 3;
  if (licence === Licence.SUBSCRIPTION) return cancelsAtPeriodEnd ? 1 : 2;
  return 0;
}

/**
 * Describes what happened with the user's supporter status
 * A null return tells useBillingReturn to retry
 */
export function billingOutcome(before: BillingSnapshot, after: User): BillingOutcome | null {
  const was = supportStanding(before.licence, before.cancels);
  const now = supportStanding(after.licence, after.licence_cancels_at_period_end);

  if (now === was) return null;
  if (now < was) return "cancelled";
  return now === 3 ? "achieved" : "subscribed";
}
