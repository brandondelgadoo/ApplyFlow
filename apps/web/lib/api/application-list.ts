import { APPLICATION_STATUSES, JOB_SOURCES } from "@applyflow/shared";
import { ApiError } from "./responses";

// ?sort= values. "updated" is the default: most recent status change first.
const sorts = ["updated", "company", "applied", "status", "created"] as const;
type ApplicationSort = (typeof sorts)[number];

export type ApplicationListQuery = {
  search?: string;
  status?: (typeof APPLICATION_STATUSES)[number];
  source?: (typeof JOB_SOURCES)[number];
  from?: string;
  to?: string;
  sort: ApplicationSort;
  // true means the archived list. Otherwise archived applications stay hidden.
  archived: boolean;
};

type StatusEntry = { status: string; status_date: string };
type InterviewEntry = {
  id: string;
  round: string;
  interview_type: string;
  scheduled_at: string;
};

export type ApplicationListItem = {
  latest_status_date: string | null;
  // Blank when the Applied step was skipped.
  date_applied: string | null;
  next_interview: InterviewEntry | null;
  latest_interview_round: string | null;
};

function parameter(url: URL, name: string) {
  const value = url.searchParams.get(name)?.trim();
  return value ? value : undefined;
}

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError("VALIDATION_ERROR", "Enter the date as YYYY-MM-DD.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ApiError("VALIDATION_ERROR", "Enter the date as YYYY-MM-DD.");
  }
  return value;
}

export function parseApplicationListQuery(url: URL): ApplicationListQuery {
  const status = parameter(url, "status");
  if (status && !APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
    throw new ApiError("VALIDATION_ERROR", "Pick one of the statuses.");
  }
  const source = parameter(url, "source");
  if (source && !JOB_SOURCES.includes(source as (typeof JOB_SOURCES)[number])) {
    throw new ApiError("VALIDATION_ERROR", "Pick one of the job sources.");
  }
  const sort = parameter(url, "sort") ?? "updated";
  if (!sorts.includes(sort as ApplicationSort)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Sort by updated, company, applied, status, or created.",
    );
  }
  const archived = parameter(url, "archived");
  if (archived && archived !== "true" && archived !== "false") {
    throw new ApiError("VALIDATION_ERROR", "archived must be true or false.");
  }
  const from = parameter(url, "from");
  const to = parameter(url, "to");
  const start = from ? calendarDate(from) : undefined;
  const end = to ? calendarDate(to) : undefined;
  if (start && end && start > end) {
    throw new ApiError("VALIDATION_ERROR", "The start date can't be after the end date.");
  }

  return {
    search: parameter(url, "search"),
    status: status as ApplicationListQuery["status"],
    source: source as ApplicationListQuery["source"],
    from: start,
    to: end,
    sort: sort as ApplicationSort,
    archived: archived === "true",
  };
}

// Commas and wildcards would change the database filter, so they are removed
// from the words being searched. The original URL is not what search looks at.
export function applicationSearchFilter(search: string | undefined) {
  const term = search
    ?.replace(/[%_\\",().*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!term) return null;
  const pattern = `"%${term}%"`;
  return ["company", "position", "location"]
    .map((column) => `${column}.ilike.${pattern}`)
    .join(",");
}

function latestStatusDate(history: StatusEntry[]) {
  return history.reduce<string | null>((latest, entry) => {
    if (!latest || entry.status_date > latest) return entry.status_date;
    return latest;
  }, null);
}

function dateApplied(history: StatusEntry[]) {
  const applied = history.filter((entry) => entry.status === "Applied");
  if (applied.length === 0) return null;
  return applied.reduce(
    (earliest, entry) => (entry.status_date < earliest ? entry.status_date : earliest),
    applied[0].status_date,
  );
}

function scheduledTime(interview: InterviewEntry) {
  const time = Date.parse(interview.scheduled_at);
  return Number.isNaN(time) ? null : time;
}

function nextInterview(interviews: InterviewEntry[], now: Date) {
  const upcoming = interviews
    .filter((interview) => {
      const time = scheduledTime(interview);
      return time !== null && time >= now.getTime();
    })
    .sort((a, b) => scheduledTime(a)! - scheduledTime(b)!);
  if (!upcoming[0]) return null;
  const { id, round, interview_type, scheduled_at } = upcoming[0];
  return { id, round, interview_type, scheduled_at };
}

function latestInterviewRound(interviews: InterviewEntry[]) {
  const latest = interviews.reduce<InterviewEntry | null>((current, interview) => {
    const time = scheduledTime(interview);
    if (time === null) return current;
    if (!current || time > scheduledTime(current)!) return interview;
    return current;
  }, null);
  return latest?.round ?? null;
}

type SortableApplication = ApplicationListItem & {
  company: string;
  position: string;
  status: string;
  created_at: string;
};

// from/to use the latest status date, because every application has one.
// Date applied is blank when that step was skipped, so it can't bound the list.
export function filterAndSortApplications<T extends SortableApplication>(
  items: T[],
  query: ApplicationListQuery,
) {
  const filtered = items.filter((item) => {
    if (query.from && (!item.latest_status_date || item.latest_status_date < query.from)) {
      return false;
    }
    if (query.to && (!item.latest_status_date || item.latest_status_date > query.to)) {
      return false;
    }
    return true;
  });

  const statusOrder = new Map(APPLICATION_STATUSES.map((status, index) => [status, index]));
  const newestDateFirst = (left: string | null, right: string | null) => {
    if (left === right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return left < right ? 1 : -1;
  };

  return filtered.sort((left, right) => {
    if (query.sort === "company") {
      return (
        left.company.localeCompare(right.company) || left.position.localeCompare(right.position)
      );
    }
    if (query.sort === "applied") {
      return newestDateFirst(left.date_applied, right.date_applied);
    }
    if (query.sort === "status") {
      return (
        (statusOrder.get(left.status as (typeof APPLICATION_STATUSES)[number]) ?? 0) -
          (statusOrder.get(right.status as (typeof APPLICATION_STATUSES)[number]) ?? 0) ||
        left.company.localeCompare(right.company)
      );
    }
    if (query.sort === "created") {
      return right.created_at.localeCompare(left.created_at);
    }
    return (
      newestDateFirst(left.latest_status_date, right.latest_status_date) ||
      right.created_at.localeCompare(left.created_at)
    );
  });
}

export function toApplicationListItem<
  T extends { status_history?: StatusEntry[] | null; interviews?: InterviewEntry[] | null },
>(row: T, now = new Date()) {
  const { status_history, interviews, ...application } = row;
  return {
    ...application,
    latest_status_date: latestStatusDate(status_history ?? []),
    date_applied: dateApplied(status_history ?? []),
    next_interview: nextInterview(interviews ?? [], now),
    latest_interview_round: latestInterviewRound(interviews ?? []),
  };
}
