// Same-day order matches issue #10. Ghosted sits after Applied and before
// Screening. Rejected and Withdrawn are last, so nothing follows them.
const statusSortKey: Record<string, number> = {
  Saved: 1,
  Applying: 2,
  Applied: 3,
  Ghosted: 3.5,
  Screening: 4,
  Interviewing: 5,
  Offer: 6,
  Rejected: 7,
  Withdrawn: 7,
};

type StatusEntry = {
  status: string;
  status_date: string;
  created_at: string;
};

type InterviewEntry = {
  id: string;
  round: string;
  scheduled_at: string;
  created_at: string;
};

type ResumeEntry = {
  id: string;
  name: string;
  file_type: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type AnswerLink = {
  created_at: string;
  answers: {
    id: string;
    question: string;
    answer: string;
    category: string;
    source: string;
  } | null;
};

export type ApplicationDetailRow = {
  id: string;
  status_history: StatusEntry[] | null;
  interviews: InterviewEntry[] | null;
  resumes: ResumeEntry | null;
  application_answers: AnswerLink[] | null;
};

function byStatusTimeline(left: StatusEntry, right: StatusEntry) {
  if (left.status_date !== right.status_date) return left.status_date < right.status_date ? -1 : 1;
  const stage = (statusSortKey[left.status] ?? 0) - (statusSortKey[right.status] ?? 0);
  if (stage !== 0) return stage;
  return left.created_at < right.created_at ? -1 : left.created_at > right.created_at ? 1 : 0;
}

function byScheduledTime(left: InterviewEntry, right: InterviewEntry) {
  const leftTime = Date.parse(left.scheduled_at);
  const rightTime = Date.parse(right.scheduled_at);
  if (leftTime !== rightTime) return leftTime - rightTime;
  return left.created_at < right.created_at ? -1 : left.created_at > right.created_at ? 1 : 0;
}

function resumeUsed(resume: ResumeEntry | ResumeEntry[] | null | undefined) {
  if (!resume) return null;
  return Array.isArray(resume) ? (resume[0] ?? null) : resume;
}

export function toApplicationDetail<
  T extends {
    status_history?: StatusEntry[] | null;
    interviews?: InterviewEntry[] | null;
    resumes?: ResumeEntry | ResumeEntry[] | null;
    application_answers?: AnswerLink[] | null;
  },
>(row: T) {
  const { status_history, interviews, resumes, application_answers, ...application } = row;
  const answersUsed = (application_answers ?? []).flatMap((link) => {
    if (!link.answers) return [];
    return [{ ...link.answers, used_at: link.created_at }];
  });
  answersUsed.sort((left, right) =>
    left.used_at < right.used_at ? -1 : left.used_at > right.used_at ? 1 : 0,
  );

  return {
    ...application,
    status_history: [...(status_history ?? [])].sort(byStatusTimeline),
    interviews: [...(interviews ?? [])].sort(byScheduledTime),
    resume: resumeUsed(resumes),
    answers_used: answersUsed,
  };
}
