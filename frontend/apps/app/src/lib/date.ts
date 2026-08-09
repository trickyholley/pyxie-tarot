// SPDX-License-Identifier: AGPL-3.0-or-later

// `entry_date` is "YYYY-MM-DD" with no timezone - `new Date(dateString)` treats it as UTC midnight,
// shifting the displayed day in timezones behind UTC. Anchor to local midnight instead.
export function parseDateOnly(dateString: string): Date {
  return new Date(`${dateString}T00:00:00`);
}

export function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
