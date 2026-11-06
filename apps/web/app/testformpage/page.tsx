import type { Metadata } from "next";
import TestForm from "./test-form";

// Test page for extension
export const metadata: Metadata = {
  title: "Test application",
  robots: { index: false, follow: false },
};

export default function TestFormPage() {
  return <TestForm />;
}
