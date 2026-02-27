import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { GlobalGradientDefs } from "@/components/global-gradient-defs";
import { UILanguageProvider } from "@/providers/ui-language-provider";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDirection } from "@/lib/languages";
import type { LanguageCode } from "@/lib/languages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Quizzer",
  description: "AI-powered quiz generation platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read user's language from session server-side so <html lang dir> is
  // correct on the initial HTML response — no flash, works with SSR.
  let lang: LanguageCode = "en";
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userLang = (session?.user as { language?: string })?.language;
    if (userLang) lang = userLang as LanguageCode;
  } catch {
    // Not authenticated — fall back to "en"
  }

  const dir = getDirection(lang) ?? "ltr";

  return (
    <html lang={lang} dir={dir}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DirectionProvider dir={dir}>
          <GlobalGradientDefs />
          <QueryProvider>
            <UILanguageProvider initialLang={lang}>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </UILanguageProvider>
          </QueryProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}