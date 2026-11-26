// PUT saves a new order for the user's projects, all at once.
// Built in lib/api/profile-lists.ts, shared with the other profile lists.
import { projectsList, profileListOrderRoutes } from "../../../../../lib/api/profile-lists";

export const dynamic = "force-dynamic";

export const { PUT, OPTIONS } = profileListOrderRoutes(projectsList);
