# CLAUDE.md — AgentLab

AI agent 教学应用的项目背景。新会话请先读完这份文件再动手。

## 这是什么

**AgentLab（看得见的 Agent）**：面向零基础学习者的可视化教学网站，
把 AI agent 的运行过程拆成慢动作。核心比喻：左边是普通人看到的对话，
右边是"X 光片"——实时展示发给 API 的 messages 数组如何一步步长大。
要传达的唯一核心结论：**agent = 一个数组 + 一个循环**。

项目主人是初学者，正在通过"做这个教学应用"来学习 agent 原理本身
（做真实模式必须亲手写 agent 循环；做讲解必须把概念想透）。
所以：代码要简单可读优先于工程完备，解释要多，别过度抽象。

## 课程路线图（六章）

1. **模型** — 极简聊天框，体会 LLM 只是"文字进、文字出"，它没有手
2. **对话** — 透视面板登场：看到每次都是把整个历史数组重发一遍（API 无状态）
3. **工具** — 学习者当 agent 的"手"：模型只会请求，执行永远在你这边
4. **循环** ✅ 已完成（MVP）— 单步推进一次完整 agent 运行
5. **权限** — 循环里加"允许 / 拒绝"关卡（对应 Claude Code 的权限模式）
6. **造一个** — 学习者自己写个小工具，接真实 Claude API 跑起来

## 关键设计决策

- **模拟模式 + 真实模式双轨**。模拟模式回放 `lib/scenario.ts` 里的录制数据，
  零成本、无需 API key、可分享；真实模式（规划中）走 Next.js API route
  服务端代理调用 Claude API——**key 只放服务端环境变量，绝不进浏览器**。
  前五章模拟模式就够，第六章才需要真实模式。
- **按钮文字即循环节拍**：主按钮的 label 就是流程的下一拍
  （发送任务 → 把数组发给模型 → 执行工具 → 把结果发回模型 → …），
  这是最重要的教学机制，别改成普通的"下一步"。
- 每一步配讲解条（narration）；工具请求挂"等待执行"徽标强调"模型没有手"。

## 技术栈与结构

- Next.js 15 (App Router) + TypeScript + React 19，纯 CSS（无 Tailwind，
  刻意减少依赖）。深色模式用 `prefers-color-scheme` 自适应。
- 结构刻意保持两个核心文件：`lib/scenario.ts`（教学数据 + 类型）、
  `app/page.tsx`（全部 UI）。新章节可以各自一个 route（`app/ch1/page.tsx` 等），
  但保持"数据文件 + 页面文件"的简单模式。
- 真实模式接 API 时用官方 `@anthropic-ai/sdk`。

## 环境注意

- **本机默认 Node 是 16，跑不动 Next 15**。已提供 `.nvmrc`（Node 22），
  任何 npm 命令前先 `nvm use`，或用绝对路径
  `~/.nvm/versions/node/v22.21.1/bin`。
- `npm run dev` 默认 3000 端口；构建验证用 `npm run build`（含类型检查）。

## GitHub

仓库：https://github.com/renrenmimi/AgentLab（目前 private，main 分支）。
提交/推送要用户明确要求才做。
