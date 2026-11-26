// PATCH edits one of the user's schools. DELETE removes it.
// Built in lib/api/profile-lists.ts, shared with the other profile lists.
import { educationList, profileListItemRoutes } from "../../../../../lib/api/profile-lists";

export const dynamic = "force-dynamic";

export const { PATCH, DELETE, OPTIONS } = profileListItemRoutes(educationList);
