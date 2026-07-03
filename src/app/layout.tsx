import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F2 Experience Builder",
  description:
    "Gated, human-QC workflow that generates Future 2 / HISD Experiences — Scope & Sequence, daily lesson plans, and slide decks — with downloadable .docx and .pptx.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}