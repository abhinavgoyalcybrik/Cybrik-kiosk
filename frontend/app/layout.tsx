import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./passport-kiosk.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-kiosk-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-kiosk-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-kiosk-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cybrik EduGraph | Colorful admissions made simple",
  description: "A vibrant university discovery experience with fast, profile-based recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${fraunces.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
