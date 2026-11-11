import { cleanJobUrl, newApplicationSchema } from "@applyflow/shared";
import { getCurrentUser } from "../../../lib/auth/get-current-user";
import {
  applicationSearchFilter,
  filterAndSortApplications,
  parseApplicationListQuery,
  toApplicationListItem,
} from "../../../lib/api/application-list";
import { throwIfDatabaseError } from "../../../lib/api/database-error";
import { apiOptions, withApi } from "../../../lib/api/handler";
import { ApiError, successResponse } from "../../../lib/api/responses";
import { timeZoneFromRequest, todayInTimeZone } from "../../../lib/api/today";

export const dynamic = "force-dynamic";

const applicationColumns =
  "id, user_id, company, position, location, posting_url, posting_url_clean, application_url, application_url_clean, source, job_description, notes, status, resume_id, offer_decision, offer_deadline, archived_at, created_at, updated_at";

const listColumns = `${applicationColumns}, status_history(status, status_date), interviews(id, round, interview_type, scheduled_at)`;

type StatusRow = { id: string; status_date: string };

function urlPair(url: string | undefined) {
  if (!url) return { original: null, clean: null };
  return { original: url, clean: cleanJobUrl(url) };
}

// Issue #10's trigger inserts this row when that migration is applied: the
// status comes from the application, and the date is today in x-timezone.
// A chosen date replaces that today. If the trigger isn't applied yet, this
// insert is the first entry, so manual add still records one.
async function ensureFirstStatus(
  supabase: Awaited<ReturnType<typeof getCurrentUser>>["supabase"],
  applicationId: string,
  status: string,
  statusDate: string,
  timeZone: string,
) {
  const existing = await supabase
    .from("status_history")
    .select("id, status_date")
    .eq("application_id", applicationId)
    .setHeader("x-timezone", timeZone);
  throwIfDatabaseError(existing.error);
  const rows = (existing.data ?? []) as StatusRow[];

  if (rows.length === 1 && rows[0].status_date === statusDate) return;
  if (rows.length === 1) {
    const updated = await supabase
      .from("status_history")
      .update({ status_date: statusDate })
      .eq("id", rows[0].id)
      .setHeader("x-timezone", timeZone);
    throwIfDatabaseError(updated.error);
    return;
  }
  if (rows.length > 1) {
    throw new Error("A new application already has several status entries.");
  }

  const inserted = await supabase
    .from("status_history")
    .insert({ application_id: applicationId, status, status_date: statusDate })
    .setHeader("x-timezone", timeZone);
  throwIfDatabaseError(inserted.error);
}

export const GET = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);
  const query = parseApplicationListQuery(new URL(request.url));
  // user_id comes from the verified login, never from the query string.
  let rows = supabase.from("applications").select(listColumns).eq("user_id", user.id);
  rows = query.archived ? rows.not("archived_at", "is", null) : rows.is("archived_at", null);
  if (query.status) rows = rows.eq("status", query.status);
  if (query.source) rows = rows.eq("source", query.source);
  const search = applicationSearchFilter(query.search);
  if (search) rows = rows.or(search);

  const listed = await rows.setHeader("x-timezone", timeZoneFromRequest(request));
  throwIfDatabaseError(listed.error);
  const items = (listed.data ?? []).map((row) => toApplicationListItem(row));
  return successResponse(filterAndSortApplications(items, query));
});

export const POST = withApi(async (request) => {
  const { supabase } = await getCurrentUser(request);
  const timeZone = timeZoneFromRequest(request);
  const today = todayInTimeZone(timeZone);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Request body must be JSON.");
  }

  const parsed = newApplicationSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Check the application and try again.",
    );
  }

  const status = parsed.data.status ?? "Saved";
  const statusDate = parsed.data.status_date ?? today;
  if (statusDate > today) {
    throw new ApiError("VALIDATION_ERROR", "That date can't be in the future.");
  }

  const posting = urlPair(parsed.data.posting_url);
  const application = urlPair(parsed.data.application_url);
  const created = await supabase
    .from("applications")
    .insert({
      company: parsed.data.company,
      position: parsed.data.position,
      location: parsed.data.location ?? null,
      source: parsed.data.source ?? null,
      job_description: parsed.data.job_description ?? null,
      notes: parsed.data.notes ?? null,
      status,
      posting_url: posting.original,
      posting_url_clean: posting.clean,
      application_url: application.original,
      application_url_clean: application.clean,
    })
    .select(applicationColumns)
    .setHeader("x-timezone", timeZone)
    .single();
  throwIfDatabaseError(created.error);
  if (!created.data) throw new Error("Creating the application returned no row.");

  await ensureFirstStatus(supabase, created.data.id, status, statusDate, timeZone);
  return successResponse(created.data, 201);
});

export const OPTIONS = apiOptions;
