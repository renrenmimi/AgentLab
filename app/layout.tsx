import type { Metadata } from "next";
import "./globals.css";
import { LangProvider, langScript } from "@/lib/i18n";
import { SITE } from "@/lib/meta";
import { ThemeProvider, ShellProvider, themeScript } from "./theme-provider";
import Sidebar from "./sidebar";
import Toolbar from "./toolbar";
import CommandPalette from "./command-palette";
import SelfTest from "./selftest";
import { ProgressProvider } from "./progress";

export const metadata: Metadata = {
  // 分享一条链接时，别人看到的就是这几行。绝对地址由 metadataBase 补全，
  // 因为抓取器不认相对路径。
  metadataBase: new URL("https://agent-lab-blond.vercel.app"),
  title: {
    default: SITE.title.en,
    template: "%s",
  },
  description: SITE.description.en,
  openGraph: {
    title: SITE.title.en,
    description: SITE.description.en,
    siteName: SITE.name,
    type: "website",
    images: [{ url: "/og?s=/", width: 1200, height: 630, alt: SITE.title.en }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title.en,
    description: SITE.description.en,
    images: ["/og?s=/"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* The pre-paint scripts: data-theme, data-sidebar, data-lang and
            <html lang>, set before the first paint. They are the first thing
            the parser meets in <body> rather than sitting in <head>: React
            matches hand-written <head> nodes one by one while the webpack
            runtime removes the chunk <script> tags it has finished loading from
            that same <head>, and on a cold load the two interleaved often
            enough that hydration failed (React error #418) on about one load in
            five. The providers write the attributes back after mounting, so a
            client re-render for any other reason cannot lose them either. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
        <LangProvider>
          <ThemeProvider>
            <ShellProvider>
              <ProgressProvider>
                <div className="app-shell">
                  <Sidebar />
                  <div className="main-col">
                    <Toolbar />
                    <div className="workspace">{children}</div>
                  </div>
                </div>
                <CommandPalette />
                <SelfTest />
              </ProgressProvider>
            </ShellProvider>
          </ThemeProvider>
        </LangProvider>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
