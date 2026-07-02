"use client";

import { useEffect, useMemo, useState } from "react";
import { steps, type ChatItem, type MsgCard } from "@/lib/scenario";

export default function LoopChapter() {
  const [cursor, setCursor] = useState(0);
  const [auto, setAuto] = useState(false);

  const atEnd = cursor >= steps.length - 1;
  const nextAction = atEnd ? null : steps[cursor + 1].action;

  const state = useMemo(() => {
    const chat: ChatItem[] = [];
    const msgs: MsgCard[] = [];
    let round = 0;
    let stopReason: string | null = null;
    let tokens = 0;
    for (let i = 0; i <= cursor; i++) {
      const s = steps[i];
      if (s.chat) chat.push(...s.chat);
      if (s.msgs) msgs.push(...s.msgs);
      if (s.round !== undefined) round = s.round;
      if (s.stopReason !== undefined) stopReason = s.stopReason;
      if (s.tokens !== undefined) tokens = s.tokens;
    }
    return { chat, msgs, round, stopReason, tokens };
  }, [cursor]);

  useEffect(() => {
    if (!auto) return;
    if (cursor >= steps.length - 1) {
      setAuto(false);
      return;
    }
    const t = setTimeout(
      () => setCursor((c) => Math.min(c + 1, steps.length - 1)),
      1800
    );
    return () => clearTimeout(t);
  }, [auto, cursor]);

  const advance = () => setCursor((c) => Math.min(c + 1, steps.length - 1));
  const reset = () => {
    setCursor(0);
    setAuto(false);
  };

  return (
    <main className="page">
      <div className="header">
        <h1>AgentLab · 看得见的 Agent</h1>
        <span className="badge">第 4 章 · 循环</span>
      </div>

      <div className="narration appear" key={`n-${cursor}`}>
        {steps[cursor].narration}
      </div>

      <div className="grid">
        <section className="panel" aria-label="对话面板">
          <div className="panel-title">对话 —— 普通人看到的样子</div>
          {state.chat.map((item, i) => (
            <ChatRow
              key={i}
              item={item}
              pending={
                item.kind === "tool_call" && i === state.chat.length - 1
              }
            />
          ))}
        </section>

        <section className="panel" aria-label="透视面板">
          <div className="panel-title">透视 —— 发给 API 的 messages 数组</div>
          {state.msgs.map((card, i) => (
            <div
              key={i}
              className={`card appear ${
                card.color === "purple"
                  ? "card-purple"
                  : card.color === "teal"
                    ? "card-teal"
                    : ""
              }`}
            >
              <div className="card-tag">{card.tag}</div>
              <div className={`card-body ${card.mono ? "mono" : ""}`}>
                {card.body}
              </div>
            </div>
          ))}
          <div className="status">
            <span>循环第 {state.round} 轮</span>
            <span className={state.stopReason === "end_turn" ? "done" : ""}>
              stop_reason: {state.stopReason ?? "—"}
            </span>
            <span>累计 {state.tokens.toLocaleString()} tokens</span>
          </div>
        </section>
      </div>

      <div className="controls">
        <button className="btn" onClick={reset} disabled={cursor === 0}>
          重置
        </button>
        {nextAction ? (
          <button className="btn btn-primary" onClick={advance}>
            {nextAction}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={reset}>
            重新播放
          </button>
        )}
        <button
          className="btn"
          onClick={() => setAuto((a) => !a)}
          disabled={atEnd}
        >
          {auto ? "暂停" : "自动播放"}
        </button>
        <span className="step-count">
          第 {cursor + 1} / {steps.length} 步
        </span>
      </div>
    </main>
  );
}

function ChatRow({ item, pending }: { item: ChatItem; pending: boolean }) {
  switch (item.kind) {
    case "user":
      return <div className="bubble-user appear">{item.text}</div>;
    case "assistant":
      return <div className="bubble-assistant appear">{item.text}</div>;
    case "tool_call":
      return (
        <div className="tool-chip appear">
          <div className="tool-chip-head">
            工具调用请求
            {pending && <span className="tool-pending">等待执行</span>}
          </div>
          <div className="mono" style={{ marginTop: 4, color: "var(--teal)" }}>
            {item.name}(&quot;{item.arg}&quot;)
          </div>
        </div>
      );
    case "tool_output":
      return <div className="tool-output appear">{item.text}</div>;
  }
}
