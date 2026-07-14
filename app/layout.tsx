import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { ThemeProvider, ShellProvider, themeScript } from "./theme-provider";
import Sidebar from "./sidebar";
import Toolbar from "./toolbar";
import CommandPalette from "./command-palette";

export const metadata: Metadata = {
  title: "AgentLab — 看得见的 Agent · See Inside the Agent",
  description:
    "把 AI agent 的运行过程拆成慢动作的可视化教学 · A visual, slow-motion walkthrough of how AI agents work",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* No-flash theme: set data-theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
