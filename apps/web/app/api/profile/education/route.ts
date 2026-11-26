// GET lists the user's schools in their saved order. POST adds one at the end.
// Built in lib/api/profile-lists.ts, shared with the other profile lists.
import { educationList, profileListRoutes } from "../../../../lib/api/profile-lists";

export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = profileListRoutes(educationList);
