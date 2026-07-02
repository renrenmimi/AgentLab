import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentLab — 看得见的 Agent",
  description: "把 AI agent 的运行过程拆成慢动作的可视化教学",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
