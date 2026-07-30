// SPDX-License-Identifier: AGPL-3.0-or-later

// Backend `entry_date` fields are plain "YYYY-MM-DD" strings with no time zone. Parsing them via
// `new Date(dateString)` treats them as UTC midnight, which can shift the displayed day by one in
// timezones behind UTC. Anchor to local midnight instead so display always matches what was sent.
export function parseDateOnly(dateString: string): Date {
  return new Date(`${dateString}T00:00:00`);
}

export function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
