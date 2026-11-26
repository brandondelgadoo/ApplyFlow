// GET lists the user's work experience in their saved order. POST adds one at the end.
// Built in lib/api/profile-lists.ts, shared with the other profile lists.
import { jobsList, profileListRoutes } from "../../../../lib/api/profile-lists";

export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = profileListRoutes(jobsList);
