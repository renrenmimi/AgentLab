import type { Metadata } from "next";
import "./globals.css";
import { LangProvider, langScript } from "@/lib/i18n";
import { ThemeProvider, ShellProvider, themeScript } from "./theme-provider";
import Sidebar from "./sidebar";
import Toolbar from "./toolbar";
import CommandPalette from "./command-palette";
import SelfTest from "./selftest";
import { ProgressProvider } from "./progress";

export const metadata: Metadata = {
  title: "AgentLab — See inside the agent",
  description:
    "An interactive course that takes an AI agent apart and plays it back in slow motion: the messages array, the tools, and the loop that ties them together. Available in English and Chinese.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No-flash theme: set data-theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* No-flash language: set data-lang + <html lang> before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
      </head>
      <body>
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
