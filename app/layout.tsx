import type { Metadata } from "next";
import { Italiana, Pinyon_Script, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Providers from "@/src/components/providers/Providers";
import "./globals.css";

const italiana = Italiana({
  variable: "--font-italiana",
  subsets: ["latin"],
  weight: ["400"],
});

const pinyonScript = Pinyon_Script({
  variable: "--font-pinyon-script",
  subsets: ["latin"],
  weight: ["400"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "NextVibe — Organizer Portal",
  description: "Manage your events, analyze real-time statistics, and connect with your attendees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${italiana.variable} ${pinyonScript.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
