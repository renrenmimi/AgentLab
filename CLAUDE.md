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

## 学习路线（三站，已上线）

用户反馈后从"六章"重组为"三站"闭环：先懂 → 再看 → 亲手写。

目标受众下限：**刚会 print("hello world") 的完全新手**。为此有三个机制：
① 术语词典 `lib/glossary.tsx`——正文里 `[[key:显示文字]]` 标记的词可点击弹出
小白解释（API、数组、token 等），`RichText` 组件负责渲染；
② `/build` 先教后练——每个空先出一张 🎒"新知识"卡（`Blank.lesson` 字段）教会
这个空需要的概念，再提问；③ 开场幕从 print("hello world") 出发建立信心。

1. **`/` 什么是 Agent** ✅ — 六幕 CSS 动画（print 开场 → 文字进出 → 没有手 →
   工具=手 → 循环 → 公式揭晓）。数据在 `lib/intro.ts`，页面 `app/page.tsx`。
2. **`/loop` 看它怎么跑** ✅ — 慢动作可视化：对话面板 + messages 数组透视 +
   代码对照（31 行 agent 骨架逐步点亮）。数据 `lib/scenario.ts`，页面
   `app/loop/page.tsx`。
3. **`/build` 亲手写一个** ✅ — 同一份 31 行骨架挖 8 个空，每空先教后练；
   配常见错误的**针对性纠错**（如 role 填 tool → 解释为何是 user），
   3 次答错解锁"看答案"；全对后"运行"回放控制台动画 + 彩带庆祝。
   数据 `lib/build.ts`，页面 `app/build/page.tsx`。

后续想法（原六章路线的剩余部分）：权限关卡（允许/拒绝工具执行）、
接真实 Claude API 的真实模式。

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
- 每一站都是"数据文件 + 页面文件"一对：`lib/intro.ts`↔`app/page.tsx`、
  `lib/scenario.ts`↔`app/loop/page.tsx`、`lib/build.ts`↔`app/build/page.tsx`。
  顶部三站导航在 `app/nav.tsx`（layout 里挂载）。新增站点沿用这个模式。
- **中英双语**：`lib/i18n.tsx` 提供 `LangProvider`/`useLang`/`t()` 和界面词典 `ui`；
  所有数据文件的文案都是 `{ zh, en }` 成对（类型 `L`），语言偏好存 localStorage，
  导航栏「中 / EN」切换。新增文案必须两种语言都写。
- 真实模式接 API 时用官方 `@anthropic-ai/sdk`。

## 环境注意

- **本机默认 Node 是 16，跑不动 Next 15**。已提供 `.nvmrc`（Node 22），
  任何 npm 命令前先 `nvm use`，或用绝对路径
  `~/.nvm/versions/node/v22.21.1/bin`。
- `npm run dev` 默认 3000 端口；构建验证用 `npm run build`（含类型检查）。

## GitHub

仓库：https://github.com/renrenmimi/AgentLab（目前 private，main 分支）。
提交/推送要用户明确要求才做。
