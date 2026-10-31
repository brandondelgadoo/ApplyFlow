// Shared code used by both apps/web and apps/extension.
// Import it with: import { APPLICATION_STATUSES } from "@applyflow/shared";
// schemas/common.ts is left out on purpose: it's only used inside the schemas.

// Lists of allowed values, and a type for each.
export * from "./applications";
export * from "./interviews";
export * from "./answers";
export * from "./profile";

// Error codes the website and extension can get back.
export * from "./errors";

// Zod schemas that check data before it's saved.
export * from "./schemas/application";
export * from "./schemas/profile";

// The shared function for calling the ApplyFlow API.
export * from "./api-client";

// Settings returned by the API.
export * from "./settings";
