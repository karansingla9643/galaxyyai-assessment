import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Magica- AI Workflow Builder",
  description: "Build powerful LLM workflows with drag-and-drop simplicity. Powered by Google Gemini.",
  keywords: ["AI", "workflow", "LLM", "automation", "Gemini", "no-code"],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Magica- AI Workflow Builder",
    description: "Build powerful LLM workflows with drag-and-drop simplicity. Powered by Google Gemini.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Magica- AI Workflow Builder",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" className="h-full">
        <body className={`${inter.variable} font-sans h-full antialiased bg-white text-gray-900`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
