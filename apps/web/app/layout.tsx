import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans, Space_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

// Headings (hero 800, sections 700)
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

// Body, buttons, forms, navigation
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});

// Stats and labels (optional)
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "ApplyFlow",
  description: "Track your job applications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("font-sans", bricolage.variable, plexSans.variable, spaceMono.variable)}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}