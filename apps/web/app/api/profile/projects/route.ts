// GET lists the user's projects in their saved order. POST adds one at the end.
// Built in lib/api/profile-lists.ts, shared with the other profile lists.
import { projectsList, profileListRoutes } from "../../../../lib/api/profile-lists";

export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = profileListRoutes(projectsList);
