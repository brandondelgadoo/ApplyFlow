// Hiring-order rules for an application's status history.
// The database triggers in the status-rules migration enforce the same rules.
// Entries are ordered by date, then by stage (a later stage wins on the same date),
// then by when they were added.

import type { ApplicationStatus } from "./applications";

// One status change. statusDate is YYYY-MM-DD. createdAt breaks same-day, same-stage ties.
export type StatusHistoryEntry = {
  status: ApplicationStatus;
  statusDate: string;
  createdAt: string;
};

// Why a timeline was rejected. These match the error codes the API already uses.
// A future date is VALIDATION_ERROR (400). The other two are 422.
export type StatusRuleError = "INVALID_STATUS_ORDER" | "VALIDATION_ERROR" | "LAST_STATUS_ENTRY";

// Main hiring ladder. Ghosted, Rejected, and Withdrawn are handled separately.
const PIPELINE_RANK: Partial<Record<ApplicationStatus, number>> = {
  Saved: 1,
  Applying: 2,
  Applied: 3,
  Screening: 4,
  Interviewing: 5,
  Offer: 6,
};

// Same-day ordering. Ghosted sits after Applied and before Screening.
// Rejected and Withdrawn sort last, because nothing can follow them.
function sortKey(status: ApplicationStatus): number {
  if (status === "Ghosted") return 3.5;
  if (status === "Rejected" || status === "Withdrawn") return 7;
  return PIPELINE_RANK[status] ?? 0;
}

function byTimelineOrder(a: StatusHistoryEntry, b: StatusHistoryEntry): number {
  if (a.statusDate !== b.statusDate) return a.statusDate < b.statusDate ? -1 : 1;
  const stage = sortKey(a.status) - sortKey(b.status);
  if (stage !== 0) return stage;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

// The status the application should show: the last entry after timeline ordering.
export function latestStatus(entries: readonly StatusHistoryEntry[]): ApplicationStatus | null {
  if (entries.length === 0) return null;
  return [...entries].sort(byTimelineOrder).at(-1)?.status ?? null;
}

// Today's calendar date in a time zone, as YYYY-MM-DD.
// At 9pm in Miami it is still "today" there, even though the server clock is already tomorrow.
export function todayInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Returns null when the timeline is legal.
// Pass `today` (YYYY-MM-DD) to also reject dates after that day.
export function validateStatusHistory(
  entries: readonly StatusHistoryEntry[],
  today?: string,
): StatusRuleError | null {
  const ordered = [...entries].sort(byTimelineOrder);
  // Highest main-ladder stage seen so far. Ghosted does not move it.
  let highWater: number | null = null;
  let closed = false;

  for (const entry of ordered) {
    if (today !== undefined && entry.statusDate > today) return "VALIDATION_ERROR";
    if (closed) return "INVALID_STATUS_ORDER";

    if (entry.status === "Rejected" || entry.status === "Withdrawn") {
      closed = true;
      continue;
    }

    if (entry.status === "Ghosted") {
      // Ghosted is only allowed once the person has actually applied.
      if (highWater === null || highWater < 3) return "INVALID_STATUS_ORDER";
      continue;
    }

    const rank = PIPELINE_RANK[entry.status];
    if (rank === undefined) return "INVALID_STATUS_ORDER";
    // Forward only. Skipping ahead is fine; the same stage or an earlier one is not.
    if (highWater !== null && rank <= highWater) return "INVALID_STATUS_ORDER";
    highWater = rank;
  }

  return null;
}

// Deleting a status entry. The last remaining one has to stay.
// `remaining` is the timeline after the entry is removed.
export function validateStatusDeletion(
  remaining: readonly StatusHistoryEntry[],
  beforeCount: number,
  today?: string,
): StatusRuleError | null {
  if (beforeCount <= 1) return "LAST_STATUS_ENTRY";
  return validateStatusHistory(remaining, today);
}
