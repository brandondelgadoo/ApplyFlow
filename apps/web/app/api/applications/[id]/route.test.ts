import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/api/responses";

const { getCurrentUser, from } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../../../../lib/auth/get-current-user", () => ({ getCurrentUser }));

import { DELETE, GET, PATCH } from "./route";

const applicationId = "00000000-0000-4000-8000-000000000010";

function query(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const name of [
    "select",
    "update",
    "delete",
    "eq",
    "maybeSingle",
    "setHeader",
    "overrideTypes",
  ]) {
    builder[name] = vi.fn(self);
  }
  builder.then = (
    onFulfilled: (value: typeof result) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

function request(id = applicationId) {
  return new Request(`http://localhost:3000/api/applications/${id}?user_id=user-b`, {
    headers: { Origin: "http://localhost:3000", Authorization: "Bearer token" },
  });
}

let applications: ReturnType<typeof query>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("API_ALLOWED_WEB_ORIGINS", "http://localhost:3000");
  applications = query({
    data: {
      id: applicationId,
      user_id: "user-a",
      company: "Google",
      position: "Intern",
      status_history: [
        {
          id: "h1",
          status: "Saved",
          status_date: "2026-11-01",
          created_at: "2026-11-01T00:00:00Z",
        },
      ],
      interviews: [],
      resumes: null,
      application_answers: [],
    },
    error: null,
  });
  from.mockImplementation((table: string) => {
    if (table === "applications") return applications;
    throw new Error(`unexpected table ${table}`);
  });
  getCurrentUser.mockResolvedValue({ user: { id: "user-a" }, supabase: { from } });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/applications/:id", () => {
  it("returns the application scoped to the logged-in user", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      id: applicationId,
      company: "Google",
      resume: null,
      answers_used: [],
    });
    expect(body.data.status_history).toHaveLength(1);
    expect(applications.eq).toHaveBeenCalledWith("id", applicationId);
    expect(applications.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(applications.eq).not.toHaveBeenCalledWith("user_id", "user-b");
  });

  it("answers 404 when the application is missing or belongs to someone else", async () => {
    applications = query({ data: null, error: null });
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "That application wasn't found." },
    });
  });

  it("answers 404 for a bad id without querying", async () => {
    const response = await GET(request("not-an-id"));
    expect(response.status).toBe(404);
    expect(from).not.toHaveBeenCalled();
  });

  it("stops an unauthenticated caller before querying", async () => {
    getCurrentUser.mockRejectedValue(new ApiError("UNAUTHORIZED", "Please sign in."));
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("hides database error details", async () => {
    applications = query({
      data: null,
      error: { code: "XX000", message: "private database detail" },
    });
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });
});

const resumeId = "00000000-0000-4000-8000-000000000020";

function patchRequest(body: unknown, id = applicationId) {
  return new Request(`http://localhost:3000/api/applications/${id}`, {
    method: "PATCH",
    headers: {
      Origin: "http://localhost:3000",
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/applications/:id", () => {
  const saved = {
    id: applicationId,
    user_id: "user-a",
    company: "Google",
    position: "Intern",
    status: "Saved",
    resume_id: null,
    offer_decision: null,
    offer_deadline: null,
    archived_at: null,
  };

  function stage(
    read: { data: unknown; error: unknown },
    write?: { data: unknown; error: unknown },
  ) {
    const reads = query(read);
    const writes = query(write ?? read);
    const resumes = query({ data: { id: resumeId, deleted_at: null }, error: null });
    let calls = 0;
    from.mockImplementation((table: string) => {
      if (table === "resumes") return resumes;
      calls += 1;
      return calls === 1 ? reads : writes;
    });
    return { reads, writes, resumes };
  }

  it("changes the company and leaves every other column alone", async () => {
    const { writes } = stage(
      { data: saved, error: null },
      { data: { ...saved, company: "Stripe" }, error: null },
    );
    const response = await PATCH(patchRequest({ company: "Stripe" }));
    expect(response.status).toBe(200);
    expect(writes.update).toHaveBeenCalledWith({ company: "Stripe" });
  });

  it("stores a cleaned URL and clears both copies when the URL is removed", async () => {
    const { writes } = stage({ data: saved, error: null });
    await PATCH(
      patchRequest({ posting_url: "https://jobs.example.com/role/1?utm_source=linkedin" }),
    );
    expect(writes.update).toHaveBeenCalledWith({
      posting_url: "https://jobs.example.com/role/1?utm_source=linkedin",
      posting_url_clean: "https://jobs.example.com/role/1",
    });

    await PATCH(patchRequest({ posting_url: null }));
    expect(writes.update).toHaveBeenCalledWith({ posting_url: null, posting_url_clean: null });
  });

  it("rejects an offer decision unless the status is Offer", async () => {
    const { writes } = stage({ data: saved, error: null });
    const rejected = await PATCH(patchRequest({ offer_decision: "Accepted" }));
    expect(rejected.status).toBe(422);
    expect(await rejected.json()).toEqual({
      error: {
        code: "OFFER_DECISION_NOT_ALLOWED",
        message: "The offer decision can only be set while the status is Offer.",
      },
    });
    expect(writes.update).not.toHaveBeenCalled();

    stage({ data: { ...saved, status: "Offer" }, error: null });
    const allowed = await PATCH(patchRequest({ offer_decision: "Accepted" }));
    expect(allowed.status).toBe(200);
  });

  it("rejects a deleted or someone else's resume", async () => {
    const deleted = stage({ data: saved, error: null });
    from.mockImplementation((table: string) => {
      if (table === "resumes")
        return query({ data: { id: resumeId, deleted_at: "2026-11-01T00:00:00Z" }, error: null });
      return deleted.reads;
    });
    const response = await PATCH(patchRequest({ resume_id: resumeId }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Choose one of your resumes.");
    expect(deleted.writes.update).not.toHaveBeenCalled();
  });

  it("saves a resume that belongs to the user and is not deleted", async () => {
    const { writes, resumes } = stage({ data: saved, error: null });
    const response = await PATCH(patchRequest({ resume_id: resumeId }));
    expect(response.status).toBe(200);
    expect(resumes.eq).toHaveBeenCalledWith("id", resumeId);
    expect(resumes.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(writes.update).toHaveBeenCalledWith({ resume_id: resumeId });
  });

  it("answers DUPLICATE_URL when the new URL is already tracked", async () => {
    stage(
      { data: saved, error: null },
      {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      },
    );
    const response = await PATCH(patchRequest({ posting_url: "https://jobs.example.com/role/1" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("DUPLICATE_URL");
  });

  it("answers 404 when the application is missing", async () => {
    const { writes } = stage({ data: null, error: null });
    const response = await PATCH(patchRequest({ company: "Stripe" }));
    expect(response.status).toBe(404);
    expect(writes.update).not.toHaveBeenCalled();
  });

  it("archives and unarchives", async () => {
    const { writes } = stage({ data: saved, error: null });
    await PATCH(patchRequest({ archived: true }));
    expect(writes.update).toHaveBeenCalledWith({ archived_at: expect.any(String) });
    await PATCH(patchRequest({ archived: false }));
    expect(writes.update).toHaveBeenCalledWith({ archived_at: null });
  });
});

function deleteRequest(id = applicationId) {
  return new Request(`http://localhost:3000/api/applications/${id}?user_id=user-b`, {
    method: "DELETE",
    headers: { Origin: "http://localhost:3000", Authorization: "Bearer token" },
  });
}

describe("DELETE /api/applications/:id", () => {
  it("deletes only the logged-in user's application", async () => {
    applications = query({ data: { id: applicationId }, error: null });
    const response = await DELETE(deleteRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id: applicationId } });
    expect(applications.delete).toHaveBeenCalled();
    expect(applications.eq).toHaveBeenCalledWith("id", applicationId);
    expect(applications.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(applications.eq).not.toHaveBeenCalledWith("user_id", "user-b");
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("applications");
  });

  it("answers 404 when nothing was deleted", async () => {
    applications = query({ data: null, error: null });
    const response = await DELETE(deleteRequest());
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("answers 404 for a bad id without querying", async () => {
    const response = await DELETE(deleteRequest("not-an-id"));
    expect(response.status).toBe(404);
    expect(from).not.toHaveBeenCalled();
  });

  it("stops an unauthenticated caller before deleting", async () => {
    getCurrentUser.mockRejectedValue(new ApiError("UNAUTHORIZED", "Please sign in."));
    const response = await DELETE(deleteRequest());
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });
});
