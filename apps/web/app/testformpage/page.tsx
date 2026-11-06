import type { Metadata } from "next";
import TestForm from "./test-form";

// Internal practice page for the extension team. It isn't linked from anywhere and is
// kept out of search results, so it can't be found or indexed by accident.
export const metadata: Metadata = {
  title: "Test application",
  robots: { index: false, follow: false },
};

export default function TestFormPage() {
  return <TestForm />;
}
