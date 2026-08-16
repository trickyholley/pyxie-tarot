// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  DiaryEntry,
  EntryCard,
  Spread,
  SpreadPosition,
  diaryEntriesAPI,
  getToken,
  refreshNativeWidget,
} from "@pyxie/api-client";

const STORAGE_KEY = "pyxie:pending-diary-entry";
const LOCAL_ID_PREFIX = "local:";

/** A diary entry queued locally because it couldn't reach the server yet. Snapshots everything needed to
 * both resume the reading UI and (re)submit it once back online. `serverId` is filled in as soon as the
 * create POST lands, even if a later step (the submit PATCH) still fails - so a retry never double-creates.
 * `spread_id` is only meaningful (and only read) when `serverId` is still null - once an entry already
 * exists server-side, syncing it is a PATCH that never needs its originating spread again. */
interface PendingDiaryEntry {
  localId: string;
  ownerId: string | null;
  serverId: string | null;
  spread_id: string;
  spread_name: string;
  num_cards: number;
  positions: SpreadPosition[];
  promptTexts: string[];
  cards: EntryCard[];
  entry_date: string;
  entry_text: string;
  replies: string[];
  submitted: boolean;
  created_at: string;
  updated_at: string;
}

/** Fields needed to queue a submit-time PATCH for an entry that isn't already queued (i.e. it was
 * autosaved while online, and only the final submit failed offline). */
export interface PendingSubmitMeta {
  spreadName: string;
  numCards: number;
  positions: SpreadPosition[];
  promptTexts: string[];
  cards: EntryCard[];
  entryDate: string;
}

/** True for a fetch failure that couldn't reach the network at all, as opposed to a real (e.g. validation)
 * error response - only the former should be queued for later rather than surfaced immediately. */
export function isOffline(err: unknown): boolean {
  return err instanceof TypeError || !navigator.onLine;
}

export function isPendingLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

/** Decodes the `sub` (user id) claim from a JWT without a full parsing dependency - just enough to scope
 * the pending entry to whichever account created it. */
function decodeOwnerId(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

function currentOwnerId(): string | null {
  const token = getToken();
  return token && decodeOwnerId(token);
}

function writePending(entry: PendingDiaryEntry): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

/** Reads back the pending entry, but only if it belongs to whoever is currently logged in - a previous
 * user's queued entry on a shared device stays inert rather than syncing to (or being visible to) a
 * different account. */
function getOwnPendingEntry(): PendingDiaryEntry | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  const pending = raw ? (JSON.parse(raw) as PendingDiaryEntry) : null;
  return pending && pending.ownerId === currentOwnerId() ? pending : null;
}

/** Queues a freshly-drawn spread that couldn't be autosaved because the device is offline. Returns the
 * local id to treat as this entry's id for the rest of the reading flow. */
export function queueNewEntry(spread: Spread, cards: EntryCard[], entryDate: string): string {
  const now = new Date().toISOString();
  const localId = `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`;
  writePending({
    localId,
    ownerId: currentOwnerId(),
    serverId: null,
    spread_id: spread.id,
    spread_name: spread.name,
    num_cards: spread.num_cards,
    positions: spread.positions,
    promptTexts: spread.prompts,
    cards,
    entry_date: entryDate,
    entry_text: "",
    replies: [],
    submitted: false,
    created_at: now,
    updated_at: now,
  });
  return localId;
}

/** Queues the final submit (reflection text + replies) for `id`, whether it's a local-only entry not yet
 * synced at all, or one that was already autosaved server-side and only the submit PATCH went offline. */
export function queueSubmit(id: string, entryText: string, replies: string[], meta: PendingSubmitMeta): void {
  const now = new Date().toISOString();
  const existing = isPendingLocalId(id) ? getOwnPendingEntry() : null;

  writePending({
    localId: existing?.localId ?? id,
    ownerId: existing?.ownerId ?? currentOwnerId(),
    serverId: existing?.serverId ?? (isPendingLocalId(id) ? null : id),
    spread_id: existing?.spread_id ?? "",
    spread_name: existing?.spread_name ?? meta.spreadName,
    num_cards: existing?.num_cards ?? meta.numCards,
    positions: existing?.positions ?? meta.positions,
    promptTexts: existing?.promptTexts ?? meta.promptTexts,
    cards: existing?.cards ?? meta.cards,
    entry_date: existing?.entry_date ?? meta.entryDate,
    entry_text: entryText,
    replies,
    submitted: true,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
}

/** Synthesizes a `DiaryEntry`-shaped object from the pending queue, for offline resume/"today" checks. */
function pendingEntryAsDiaryEntry(pending: PendingDiaryEntry): DiaryEntry {
  return {
    id: pending.localId,
    user_id: pending.ownerId ?? "",
    entry_date: pending.entry_date,
    entry_text: pending.entry_text,
    spread_name: pending.spread_name,
    num_cards: pending.num_cards,
    positions: pending.positions,
    cards: pending.cards,
    prompts: pending.promptTexts.map((prompt, i) => ({ prompt, reply: pending.replies[i] ?? "" })),
    submitted: pending.submitted,
    created_at: pending.created_at,
    updated_at: pending.updated_at,
  };
}

export function getPendingEntryForToday(entryDate: string): DiaryEntry | null {
  const pending = getOwnPendingEntry();
  return pending && pending.entry_date === entryDate ? pendingEntryAsDiaryEntry(pending) : null;
}

/** Pushes the queued entry to the server, if there is one and it's actually reachable now. Safe to call
 * speculatively (mount, `online` event, before checking "today's" entry) - a no-op when nothing's queued,
 * and silently leaves the entry queued again if the network is still unavailable. */
export async function syncPendingEntry(): Promise<void> {
  const pending = getOwnPendingEntry();
  if (!pending) return;

  try {
    let serverId = pending.serverId;
    if (!serverId) {
      const created = await diaryEntriesAPI.createDiaryEntry({
        spread_id: pending.spread_id,
        entry_date: pending.entry_date,
        entry_text: pending.submitted ? pending.entry_text : "",
        cards: pending.cards,
        replies: pending.submitted ? pending.replies : [],
      });
      serverId = created.id;
      writePending({ ...pending, serverId });
    }

    if (pending.submitted) {
      await diaryEntriesAPI.updateDiaryEntry(serverId, {
        entry_text: pending.entry_text,
        replies: pending.replies,
        submitted: true,
      });
    }

    localStorage.removeItem(STORAGE_KEY);
    refreshNativeWidget();
  } catch {
    // Still offline (or a real server error, e.g. a duplicate entry already created for today from
    // another device) - either way, no conflict-resolution UI for this yet, so it just stays queued.
  }
}
