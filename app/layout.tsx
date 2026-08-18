import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

// Recommended by ui-ux-pro-max's design-system generator for this product
// type ("dashboard, data, analytics, code, technical, precise") — a more
// deliberate pairing than the create-next-app default, and it's genuinely
// domain-appropriate: this whole app is prices, floats, and hash names.
const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Skin Bots",
  description: "Control panel for the skin-watching and buy-order bots",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
