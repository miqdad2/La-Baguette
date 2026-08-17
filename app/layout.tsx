import type { Metadata } from "next";
import "./globals.css";
import "./cake-creator.css";

export const metadata: Metadata = {
  title: "La Baguette Interactive",
  description: "Discover La Baguette Kuwait through an interactive collection of cakes, pastries, sweets and ice cream.",
  other: { "codex-preview": "development" },
  icons: { icon: "/assets/la-baguette-mark.png", shortcut: "/assets/la-baguette-mark.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
