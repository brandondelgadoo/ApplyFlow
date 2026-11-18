import { describe, expect, it } from "vitest";
import { toApplicationDetail } from "./application-detail";

describe("toApplicationDetail", () => {
  it("orders the timeline, interviews, and answers, and names the resume", () => {
    const detail = toApplicationDetail({
      id: "app-1",
      company: "Google",
      resumes: {
        id: "resume-1",
        name: "Swe.pdf",
        file_type: "PDF",
        archived_at: null,
        deleted_at: null,
      },
      status_history: [
        { status: "Ghosted", status_date: "2026-11-03", created_at: "2026-11-03T12:00:00Z" },
        { status: "Applied", status_date: "2026-11-03", created_at: "2026-11-03T09:00:00Z" },
        { status: "Saved", status_date: "2026-11-01", created_at: "2026-11-01T09:00:00Z" },
      ],
      interviews: [
        {
          id: "later",
          round: "Final",
          scheduled_at: "2026-12-01T15:00:00Z",
          created_at: "2026-11-02T00:00:00Z",
        },
        {
          id: "earlier",
          round: "Technical",
          scheduled_at: "2026-11-20T15:00:00Z",
          created_at: "2026-11-02T00:00:00Z",
        },
      ],
      application_answers: [
        {
          created_at: "2026-11-04T00:00:00Z",
          answers: {
            id: "answer-2",
            question: "Why us?",
            answer: "The product.",
            category: "Why this company",
            source: "Written by user",
          },
        },
        {
          created_at: "2026-11-03T00:00:00Z",
          answers: {
            id: "answer-1",
            question: "About you",
            answer: "I build things.",
            category: "Tell us about yourself",
            source: "Written by user",
          },
        },
      ],
    });

    expect(detail.status_history.map((entry) => entry.status)).toEqual([
      "Saved",
      "Applied",
      "Ghosted",
    ]);
    expect(detail.interviews.map((interview) => interview.id)).toEqual(["earlier", "later"]);
    expect(detail.resume).toMatchObject({ id: "resume-1", name: "Swe.pdf" });
    expect(detail.answers_used.map((answer) => answer.id)).toEqual(["answer-1", "answer-2"]);
    expect(detail).not.toHaveProperty("resumes");
    expect(detail).not.toHaveProperty("application_answers");
  });

  it("leaves the resume and answers empty when none were used", () => {
    const detail = toApplicationDetail({
      status_history: [],
      interviews: [],
      resumes: null,
      application_answers: [{ created_at: "2026-11-03T00:00:00Z", answers: null }],
    });
    expect(detail.resume).toBeNull();
    expect(detail.answers_used).toEqual([]);
  });
});
