"use client";

// 读过哪些站，存在这台设备的 localStorage 里。
// 没有账号，没有任何东西被发出去，侧栏上有一个清除按钮。
// 十四站是一条路，不是一份清单——一个人需要知道自己走到哪了。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { STOPS } from "@/lib/stops";

const KEY = "agentlab-visited";

type Ctx = { visited: Set<string>; reset: () => void };
const ProgressContext = createContext<Ctx>({ visited: new Set(), reset: () => {} });

export function ProgressProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [visited, setVisited] = useState<Set<string>>(new Set());

  // 首帧之后再读：服务端渲染出来的 HTML 里不该有「已读」标记，
  // 否则每个人拿到的第一帧都是同一份，然后跳变。
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const list: unknown = JSON.parse(raw);
      if (Array.isArray(list)) {
        const known = new Set(STOPS.map((s) => s.href));
        setVisited(new Set(list.filter((x): x is string => typeof x === "string" && known.has(x))));
      }
    } catch {
      /* 隐私模式下读不了，就当没有进度 */
    }
  }, []);

  useEffect(() => {
    if (!STOPS.some((s) => s.href === path)) return;
    setVisited((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      try {
        window.localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* 写不了就只在这一次会话里记着 */
      }
      return next;
    });
  }, [path]);

  const reset = useCallback(() => {
    setVisited(new Set());
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ProgressContext.Provider value={useMemo(() => ({ visited, reset }), [visited, reset])}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);
