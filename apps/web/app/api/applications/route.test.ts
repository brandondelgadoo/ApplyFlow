import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../lib/api/responses";
import { todayInTimeZone } from "../../../lib/api/today";

const { getCurrentUser, from } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../../../lib/auth/get-current-user", () => ({ getCurrentUser }));

import { GET, POST } from "./route";

const timeZone = "America/New_York";
const today = todayInTimeZone(timeZone);

function query(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const name of ["select", "eq", "single", "setHeader", "is", "not", "or"]) {
    builder[name] = vi.fn(self);
  }
  builder.insert = vi.fn(self);
  builder.update = vi.fn(self);
  builder.then = (
    onFulfilled: (value: typeof result) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

const created = {
  id: "app-1",
  user_id: "user-a",
  company: "Google",
  position: "Software Engineer Intern",
  location: null,
  posting_url: null,
  posting_url_clean: null,
  application_url: null,
  application_url_clean: null,
  source: null,
  job_description: null,
  notes: null,
  status: "Saved",
  resume_id: null,
  offer_decision: null,
  offer_deadline: null,
  archived_at: null,
  created_at: "2026-11-09T00:00:00Z",
  updated_at: "2026-11-09T00:00:00Z",
};

let applications: ReturnType<typeof query>;
let historyReads: ReturnType<typeof query>;
let historyWrites: ReturnType<typeof query>;

function request(body: unknown, timezone = timeZone) {
  return new Request("http://localhost:3000/api/applications", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      Authorization: "Bearer token",
      "Content-Type": "application/json",
      "X-Timezone": timezone,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("API_ALLOWED_WEB_ORIGINS", "http://localhost:3000");
  applications = query({ data: created, error: null });
  historyReads = query({ data: [], error: null });
  historyWrites = query({ data: null, error: null });
  let historyCalls = 0;
  from.mockImplementation((table: string) => {
    if (table === "applications") return applications;
    historyCalls += 1;
    return historyCalls === 1 ? historyReads : historyWrites;
  });
  getCurrentUser.mockResolvedValue({ user: { id: "user-a" }, supabase: { from } });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/applications", () => {
  it("creates a Saved application for today when status and date are left out", async () => {
    const response = await POST(
      request({ company: "Google", position: "Software Engineer Intern" }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: created });
    expect(applications.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company: "Google",
        position: "Software Engineer Intern",
        status: "Saved",
        posting_url: null,
        posting_url_clean: null,
      }),
    );
    expect(historyWrites.insert).toHaveBeenCalledWith({
      application_id: "app-1",
      status: "Saved",
      status_date: today,
    });
  });

  it("stores the original URL and a copy with the tracking params removed", async () => {
    await POST(
      request({
        company: "Google",
        position: "Software Engineer Intern",
        posting_url: "https://jobs.example.com/role/1?utm_source=linkedin",
      }),
    );
    expect(applications.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        posting_url: "https://jobs.example.com/role/1?utm_source=linkedin",
        posting_url_clean: "https://jobs.example.com/role/1",
      }),
    );
  });

  it("updates the trigger's first entry instead of adding a second one", async () => {
    historyReads = query({
      data: [{ id: "history-1", status_date: today }],
      error: null,
    });
    const response = await POST(
      request({
        company: "Google",
        position: "Software Engineer Intern",
        status: "Applied",
        status_date: "2026-11-03",
      }),
    );
    expect(response.status).toBe(201);
    expect(applications.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Applied" }),
    );
    expect(historyWrites.update).toHaveBeenCalledWith({ status_date: "2026-11-03" });
    expect(historyWrites.insert).not.toHaveBeenCalled();
  });

  it("answers DUPLICATE_URL when the database rejects the URL", async () => {
    applications = query({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const response = await POST(
      request({
        company: "Google",
        position: "Software Engineer Intern",
        posting_url: "https://jobs.example.com/role/1",
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "DUPLICATE_URL", message: "You already saved this job." },
    });
    expect(from).not.toHaveBeenCalledWith("status_history");
  });

  it("rejects a future starting date before writing anything", async () => {
    const response = await POST(
      request({
        company: "Google",
        position: "Software Engineer Intern",
        status_date: "2999-01-01",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "That date can't be in the future." },
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a missing company", async () => {
    const response = await POST(request({ company: "   ", position: "Intern" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(from).not.toHaveBeenCalled();
  });

  it("stops an unauthenticated caller before reading or writing", async () => {
    getCurrentUser.mockRejectedValue(new ApiError("UNAUTHORIZED", "Please sign in."));
    const response = await POST(request({ company: "Google", position: "Intern" }));
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });
});

function listRequest(query = "") {
  return new Request(`http://localhost:3000/api/applications${query}`, {
    headers: { Origin: "http://localhost:3000", Authorization: "Bearer token" },
  });
}

describe("GET /api/applications", () => {
  it("returns active applications for the logged-in user, with the card fields", async () => {
    applications = query({
      data: [
        {
          ...created,
          offer_decision: "Pending",
          offer_deadline: "2026-12-01",
          status_history: [
            { status: "Saved", status_date: "2026-11-01" },
            { status: "Applied", status_date: "2026-11-03" },
          ],
          interviews: [
            {
              id: "past",
              round: "Technical",
              interview_type: "Video",
              scheduled_at: "2020-01-01T15:00:00Z",
            },
            {
              id: "next",
              round: "Final",
              interview_type: "Onsite",
              scheduled_at: "2999-01-01T15:00:00Z",
            },
          ],
        },
      ],
      error: null,
    });
    const response = await GET(listRequest("?user_id=user-b&status=Applied"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "app-1",
      offer_decision: "Pending",
      offer_deadline: "2026-12-01",
      date_applied: "2026-11-03",
      latest_status_date: "2026-11-03",
      latest_interview_round: "Final",
      next_interview: { id: "next", round: "Final" },
    });
    expect(body.data[0].status_history).toBeUndefined();
    expect(applications.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(applications.eq).toHaveBeenCalledWith("status", "Applied");
    expect(applications.eq).not.toHaveBeenCalledWith("user_id", "user-b");
    expect(applications.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("asks for archived applications only when archived=true", async () => {
    applications = query({ data: [], error: null });
    const response = await GET(listRequest("?archived=true"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [] });
    expect(applications.not).toHaveBeenCalledWith("archived_at", "is", null);
    expect(applications.is).not.toHaveBeenCalled();
  });

  it("drops an application outside the requested dates", async () => {
    applications = query({
      data: [
        {
          ...created,
          company: "Inside",
          status_history: [{ status: "Applied", status_date: "2026-11-03" }],
          interviews: [],
        },
        {
          ...created,
          id: "app-2",
          company: "Outside",
          status_history: [{ status: "Applied", status_date: "2026-01-01" }],
          interviews: [],
        },
      ],
      error: null,
    });
    const response = await GET(listRequest("?from=2026-11-01&to=2026-11-30"));
    const body = await response.json();
    expect(body.data.map((entry: { company: string }) => entry.company)).toEqual(["Inside"]);
  });

  it("rejects an unknown status before querying", async () => {
    const response = await GET(listRequest("?status=Hired"));
    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
