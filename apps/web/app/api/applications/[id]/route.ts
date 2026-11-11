import { applicationUpdateSchema, cleanJobUrl, type ApplicationUpdate } from "@applyflow/shared";
import { getCurrentUser } from "../../../../lib/auth/get-current-user";
import {
  toApplicationDetail,
  type ApplicationDetailRow,
} from "../../../../lib/api/application-detail";
import { throwIfDatabaseError } from "../../../../lib/api/database-error";
import { apiOptions, withApi } from "../../../../lib/api/handler";
import { ApiError, successResponse } from "../../../../lib/api/responses";
import { timeZoneFromRequest } from "../../../../lib/api/today";

export const dynamic = "force-dynamic";

const detailColumns = [
  "id, user_id, company, position, location, posting_url, posting_url_clean, application_url, application_url_clean, source, job_description, notes, status, resume_id, offer_decision, offer_deadline, archived_at, created_at, updated_at",
  "status_history(id, status, status_date, created_at)",
  "interviews(id, round, interview_type, scheduled_at, interviewer, notes, outcome, created_at)",
  "resumes(id, name, file_type, archived_at, deleted_at)",
  "application_answers(created_at, answers(id, question, answer, category, source))",
].join(", ");

const applicationColumns =
  "id, user_id, company, position, location, posting_url, posting_url_clean, application_url, application_url_clean, source, job_description, notes, status, resume_id, offer_decision, offer_deadline, archived_at, created_at, updated_at";

const applicationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ApplicationRow = {
  id: string;
  status: string;
};

function changesFrom(update: ApplicationUpdate) {
  const changes: Record<string, string | null | boolean> = {};
  const text = [
    "company",
    "position",
    "location",
    "source",
    "job_description",
    "notes",
    "resume_id",
    "offer_decision",
    "offer_deadline",
  ] as const;
  for (const field of text) {
    if (update[field] !== undefined) changes[field] = update[field];
  }
  if (update.posting_url !== undefined) {
    changes.posting_url = update.posting_url;
    changes.posting_url_clean = update.posting_url ? cleanJobUrl(update.posting_url) : null;
  }
  if (update.application_url !== undefined) {
    changes.application_url = update.application_url;
    changes.application_url_clean = update.application_url
      ? cleanJobUrl(update.application_url)
      : null;
  }
  if (update.archived !== undefined) {
    changes.archived_at = update.archived ? new Date().toISOString() : null;
  }
  return changes;
}

function applicationId(request: Request) {
  const segment = new URL(request.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  return decodeURIComponent(segment);
}

export const GET = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);
  const id = applicationId(request);
  // A missing row and a bad id look the same, including when the row is someone else's.
  if (!applicationIdPattern.test(id)) {
    throw new ApiError("NOT_FOUND", "That application wasn't found.");
  }

  const found = await supabase
    .from("applications")
    .select(detailColumns)
    .eq("id", id)
    .eq("user_id", user.id)
    .setHeader("x-timezone", timeZoneFromRequest(request))
    .maybeSingle()
    .overrideTypes<ApplicationDetailRow, { merge: false }>();
  throwIfDatabaseError(found.error);
  if (!found.data) throw new ApiError("NOT_FOUND", "That application wasn't found.");
  return successResponse(toApplicationDetail(found.data));
});

export const PATCH = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);
  const id = applicationId(request);
  if (!applicationIdPattern.test(id)) {
    throw new ApiError("NOT_FOUND", "That application wasn't found.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Request body must be JSON.");
  }
  const parsed = applicationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Check the application and try again.",
    );
  }

  const timeZone = timeZoneFromRequest(request);
  const current = await supabase
    .from("applications")
    .select(applicationColumns)
    .eq("id", id)
    .eq("user_id", user.id)
    .setHeader("x-timezone", timeZone)
    .maybeSingle()
    .overrideTypes<ApplicationRow, { merge: false }>();
  throwIfDatabaseError(current.error);
  if (!current.data) throw new ApiError("NOT_FOUND", "That application wasn't found.");

  const update = parsed.data;
  if (
    (update.offer_decision !== undefined || update.offer_deadline !== undefined) &&
    current.data.status !== "Offer"
  ) {
    throw new ApiError(
      "OFFER_DECISION_NOT_ALLOWED",
      "The offer decision can only be set while the status is Offer.",
    );
  }

  if (update.resume_id) {
    const resume = await supabase
      .from("resumes")
      .select("id, deleted_at")
      .eq("id", update.resume_id)
      .eq("user_id", user.id)
      .maybeSingle()
      .overrideTypes<{ id: string; deleted_at: string | null }, { merge: false }>();
    throwIfDatabaseError(resume.error);
    if (!resume.data || resume.data.deleted_at) {
      throw new ApiError("VALIDATION_ERROR", "Choose one of your resumes.");
    }
  }

  const changes = changesFrom(update);
  if (Object.keys(changes).length === 0) return successResponse(current.data);

  const saved = await supabase
    .from("applications")
    .update(changes)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(applicationColumns)
    .setHeader("x-timezone", timeZone)
    .maybeSingle()
    .overrideTypes<ApplicationRow, { merge: false }>();
  throwIfDatabaseError(saved.error);
  if (!saved.data) throw new ApiError("NOT_FOUND", "That application wasn't found.");
  return successResponse(saved.data);
});

export const DELETE = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);
  const id = applicationId(request);
  if (!applicationIdPattern.test(id)) {
    throw new ApiError("NOT_FOUND", "That application wasn't found.");
  }

  // History, interviews, and "answers used" links cascade from this row.
  // An answer saved from the job stays in the library; the database clears
  // only saved_from_application_id.
  const removed = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .setHeader("x-timezone", timeZoneFromRequest(request))
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();
  throwIfDatabaseError(removed.error);
  if (!removed.data) throw new ApiError("NOT_FOUND", "That application wasn't found.");
  return successResponse({ id: removed.data.id });
});

export const OPTIONS = apiOptions;
