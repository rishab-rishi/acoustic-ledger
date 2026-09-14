import type { Metadata } from "next";
import { JetBrains_Mono, Saira, Saira_Condensed } from "next/font/google";
import "./globals.css";

const saira = Saira({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sairaCondensed = Saira_Condensed({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Acoustic Ledger",
    template: "%s · Acoustic Ledger",
  },
  description:
    "High-fidelity studio monitors, headphones, and equalizers tuned for a balanced profile — accurate, not overpowering.",
  authors: [{ name: "Cold-Start" }],
  creator: "Cold-Start",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${saira.variable} ${sairaCondensed.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
