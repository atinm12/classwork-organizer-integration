import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Classwork Organizer",
  description: "Upcoming assignments and tests from Canvas and your course pages, in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
