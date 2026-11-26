// The endpoints for the profile's repeatable lists (#36): schools (education), work experience
// (jobs) and projects. All three work the same way, so the route files only pick a list and
// re-export the handlers built here:
//
//   GET    /api/profile/<list>          the user's items, in their saved order
//   POST   /api/profile/<list>          add an item at the end of the list
//   PATCH  /api/profile/<list>/:id      edit an item
//   DELETE /api/profile/<list>/:id      remove an item
//   PUT    /api/profile/<list>/order    save a new order, all at once
//
// user_id, profile_id and sort_order always come from the server, never from the request.
// The schemas drop unknown keys, so a request can't send them.
import {
  MAX_PROFILE_LIST_ITEMS,
  educationCreateSchema,
  educationUpdateSchema,
  jobCreateSchema,
  jobUpdateSchema,
  profileListOrderSchema,
  projectCreateSchema,
  projectUpdateSchema,
  type Database,
} from "@applyflow/shared";
import { getCurrentUser } from "../auth/get-current-user";
import { throwIfDatabaseError } from "./database-error";
import { apiOptions, withApi } from "./handler";
import { ApiError, successResponse } from "./responses";

type Supabase = Awaited<ReturnType<typeof getCurrentUser>>["supabase"];
type Tables = Database["public"]["Tables"];

export type ProfileListName = "education" | "jobs" | "projects";

// What the route needs from a Zod schema in @applyflow/shared. Written out here because
// zod is a dependency of the shared package, not of the website.
type Schema<Output> = {
  safeParse(
    data: unknown,
  ): { success: true; data: Output } | { success: false; error: { issues: { message: string }[] } };
};

// A saved item as the API sends it back. user_id and profile_id are left out:
// the caller already knows whose items these are.
type ItemRow<T extends ProfileListName> = Omit<Tables[T]["Row"], "user_id" | "profile_id">;

type ProfileList<T extends ProfileListName> = {
  table: T;
  // Used in messages: "That school wasn't found.", "You can have at most 20 schools."
  singular: string;
  plural: string;
  // The columns the API sends back. One string, so it's easy to compare with the Row type.
  columns: string;
  createSchema: Schema<Partial<Tables[T]["Insert"]>>;
  updateSchema: Schema<Partial<Tables[T]["Update"]>>;
  // The schemas only compare fields sent in the same request. On an edit, this compares
  // the sent fields with the saved item too, e.g. a new end date against the saved start date.
  // Returns the first problem, or null.
  checkWithSaved: (saved: ItemRow<T>, update: Partial<Tables[T]["Update"]>) => string | null;
};

// Picks the sent value, or the saved one when the field wasn't sent.
// null counts as sent: it means "clear it".
function merged<V>(sent: V | undefined, saved: V): V {
  return sent === undefined ? saved : sent;
}

// Only checks when the edit touches one of the fields, so an unrelated edit never fails
// because of what's already saved.
function sentAny(update: object, fields: string[]) {
  return fields.some((field) => (update as Record<string, unknown>)[field] !== undefined);
}

export const educationList: ProfileList<"education"> = {
  table: "education",
  singular: "school",
  plural: "schools",
  columns:
    "id, school, degree, major, gpa, start_date, graduation_date, sort_order, created_at, updated_at",
  createSchema: educationCreateSchema,
  updateSchema: educationUpdateSchema,
  checkWithSaved: (saved, update) => {
    if (!sentAny(update, ["start_date", "graduation_date"])) return null;
    const start = merged(update.start_date, saved.start_date);
    const end = merged(update.graduation_date, saved.graduation_date);
    return start && end && end < start ? "Graduation date can't be before the start date" : null;
  },
};

export const jobsList: ProfileList<"jobs"> = {
  table: "jobs",
  singular: "job",
  plural: "jobs",
  columns:
    "id, job_title, company, location, start_date, end_date, currently_work_here, description, sort_order, created_at, updated_at",
  createSchema: jobCreateSchema,
  updateSchema: jobUpdateSchema,
  checkWithSaved: (saved, update) => {
    if (!sentAny(update, ["start_date", "end_date", "currently_work_here"])) return null;
    const start = merged(update.start_date, saved.start_date);
    const end = merged(update.end_date, saved.end_date);
    const current = merged(update.currently_work_here, saved.currently_work_here);
    if (start && end && end < start) return "End date can't be before the start date";
    if (current && end) return "Leave the end date empty if you still work here";
    return null;
  },
};

export const projectsList: ProfileList<"projects"> = {
  table: "projects",
  singular: "project",
  plural: "projects",
  columns:
    "id, project_name, role, technologies, project_link, start_date, end_date, description, sort_order, created_at, updated_at",
  createSchema: projectCreateSchema,
  updateSchema: projectUpdateSchema,
  checkWithSaved: (saved, update) => {
    if (!sentAny(update, ["start_date", "end_date"])) return null;
    const start = merged(update.start_date, saved.start_date);
    const end = merged(update.end_date, saved.end_date);
    return start && end && end < start ? "End date can't be before the start date" : null;
  },
};

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The :id at the end of /api/profile/<list>/:id.
function itemId(request: Request) {
  const segment = new URL(request.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  return decodeURIComponent(segment);
}

// Bad JSON is the caller's mistake, so it's a 400, not a 500.
async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Send the item as JSON.");
  }
}

function parse<Output>(schema: Schema<Output>, body: unknown): Output {
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiError("VALIDATION_ERROR", result.error.issues[0].message);
  return result.data;
}

// The three tables share user_id, id and sort_order, but TypeScript can't follow a query on
// "one of three tables" through supabase-js's types. Each list's own types (the schemas and
// ItemRow) still check what goes in and comes out, so only the query builder is loosened here.
function itemsTable(supabase: Supabase, table: ProfileListName) {
  return supabase.from(table as "education");
}

// The function from the #36 migration. The generated types (#33) won't list it until the
// migration is pushed to Dev and `pnpm db:types` runs, so its shape is written out here.
type ReorderClient = {
  rpc(
    fn: "reorder_profile_list",
    args: { list_name: ProfileListName; ordered_ids: string[] },
  ): PromiseLike<{ data: boolean | null; error: { code?: string; message?: string } | null }>;
};

async function listItems<T extends ProfileListName>(
  supabase: Supabase,
  userId: string,
  list: ProfileList<T>,
) {
  // created_at breaks ties, e.g. two items added at the same moment.
  const result = await itemsTable(supabase, list.table)
    .select(list.columns)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfDatabaseError(result.error);
  return (result.data ?? []) as unknown as ItemRow<T>[];
}

function notFound(singular: string): never {
  // Also used when the item is someone else's, so the API never confirms it exists.
  throw new ApiError("NOT_FOUND", `That ${singular} wasn't found.`);
}

// Handlers for /api/profile/<list>.
export function profileListRoutes<T extends ProfileListName>(list: ProfileList<T>) {
  const GET = withApi(async (request) => {
    const { user, supabase } = await getCurrentUser(request);
    return successResponse(await listItems(supabase, user.id, list));
  });

  const POST = withApi(async (request) => {
    const { user, supabase } = await getCurrentUser(request);
    const item = parse(list.createSchema, await readJson(request));

    // Every user gets a profile row at sign-up (the #8 trigger), so this should never happen.
    const profile = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    throwIfDatabaseError(profile.error);
    if (!profile.data) throw new ApiError("NOT_FOUND", "Profile was not found.");

    // A new item goes at the end, so the user's existing order never changes.
    const existing = await itemsTable(supabase, list.table)
      .select("sort_order")
      .eq("user_id", user.id);
    throwIfDatabaseError(existing.error);
    const rows = existing.data ?? [];

    // The reorder endpoint takes at most this many ids, so more items could never be reordered.
    if (rows.length >= MAX_PROFILE_LIST_ITEMS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `You can have at most ${MAX_PROFILE_LIST_ITEMS} ${list.plural}.`,
      );
    }
    const sortOrder = rows.reduce((last, row) => Math.max(last, row.sort_order + 1), 0);

    const created = await itemsTable(supabase, list.table)
      .insert({
        ...(item as Tables["education"]["Insert"]),
        user_id: user.id,
        profile_id: profile.data.id,
        sort_order: sortOrder,
      })
      .select(list.columns)
      .single();
    throwIfDatabaseError(created.error);
    if (!created.data) throw new Error(`Adding the ${list.singular} returned no row.`);
    return successResponse(created.data as unknown as ItemRow<T>, 201);
  });

  return { GET, POST, OPTIONS: apiOptions };
}

// Handlers for /api/profile/<list>/:id.
export function profileListItemRoutes<T extends ProfileListName>(list: ProfileList<T>) {
  const PATCH = withApi(async (request) => {
    const { user, supabase } = await getCurrentUser(request);
    const id = itemId(request);
    // A bad id and a missing item look the same.
    if (!idPattern.test(id)) notFound(list.singular);

    const update = parse(list.updateSchema, await readJson(request));
    // Checked after parsing, so a body with only unknown keys (like sort_order) counts as empty.
    if (Object.keys(update).length === 0) {
      throw new ApiError("VALIDATION_ERROR", "Nothing to update.");
    }

    const saved = await itemsTable(supabase, list.table)
      .select(list.columns)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    throwIfDatabaseError(saved.error);
    if (!saved.data) notFound(list.singular);

    const problem = list.checkWithSaved(saved.data as unknown as ItemRow<T>, update);
    if (problem) throw new ApiError("VALIDATION_ERROR", problem);

    const result = await itemsTable(supabase, list.table)
      .update(update as Tables["education"]["Update"])
      .eq("id", id)
      .eq("user_id", user.id)
      .select(list.columns)
      .maybeSingle();
    throwIfDatabaseError(result.error);
    // Deleted between the read and the update.
    if (!result.data) notFound(list.singular);
    return successResponse(result.data as unknown as ItemRow<T>);
  });

  const DELETE = withApi(async (request) => {
    const { user, supabase } = await getCurrentUser(request);
    const id = itemId(request);
    if (!idPattern.test(id)) notFound(list.singular);

    // The gap left in sort_order is fine: the order stays the same, and new items still go
    // after the highest one.
    const removed = await itemsTable(supabase, list.table)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    throwIfDatabaseError(removed.error);
    if (!removed.data) notFound(list.singular);
    return successResponse({ id: removed.data.id });
  });

  return { PATCH, DELETE, OPTIONS: apiOptions };
}

// Handlers for /api/profile/<list>/order.
export function profileListOrderRoutes<T extends ProfileListName>(list: ProfileList<T>) {
  const PUT = withApi(async (request) => {
    const { user, supabase } = await getCurrentUser(request);
    const { ids } = parse(profileListOrderSchema, await readJson(request));

    // One transaction in the database: the ids must be exactly the user's items, each once,
    // or nothing changes. A missing id, an extra id and someone else's id all fail the same
    // way, so the answer never says whether someone else's id exists.
    const result = await (supabase as unknown as ReorderClient).rpc("reorder_profile_list", {
      list_name: list.table,
      ordered_ids: ids,
    });
    throwIfDatabaseError(result.error);
    if (result.data !== true) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Send every one of your ${list.plural} once, in the new order.`,
      );
    }

    // Send the list back in its new order, the same shape as GET.
    return successResponse(await listItems(supabase, user.id, list));
  });

  return { PUT, OPTIONS: apiOptions };
}
