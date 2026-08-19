import type { Metadata } from "next";
import "./globals.css";
import { LangProvider, langScript } from "@/lib/i18n";
import { ThemeProvider, ShellProvider, themeScript } from "./theme-provider";
import Sidebar from "./sidebar";
import Toolbar from "./toolbar";
import CommandPalette from "./command-palette";

export const metadata: Metadata = {
  title: "AgentLab — See Inside the Agent",
  description:
    "An interactive course that takes an AI agent apart and plays it back in slow motion: the messages array, the tools, and the loop that ties them together. English and 中文.",
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
              <div className="app-shell">
                <Sidebar />
                <div className="main-col">
                  <Toolbar />
                  <main className="workspace">{children}</main>
                </div>
              </div>
              <CommandPalette />
            </ShellProvider>
          </ThemeProvider>
        </LangProvider>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
