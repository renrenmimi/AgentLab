import type { Metadata } from "next";
import "./globals.css";
import Nav from "./nav";
import { LangProvider } from "@/lib/i18n";

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
    <html lang="zh-CN">
      <body>
        <LangProvider>
          <Nav />
          {children}
        </LangProvider>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
