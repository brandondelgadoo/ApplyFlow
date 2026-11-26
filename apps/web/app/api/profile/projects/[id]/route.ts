// PATCH edits one of the user's projects. DELETE removes it.
// Built in lib/api/profile-lists.ts, shared with the other profile lists.
import { projectsList, profileListItemRoutes } from "../../../../../lib/api/profile-lists";

export const dynamic = "force-dynamic";

export const { PATCH, DELETE, OPTIONS } = profileListItemRoutes(projectsList);
