"use client";

// 读过哪些站，存在这台设备的 localStorage 里。
// 没有账号，没有任何东西被发出去，侧栏上有一个清除按钮。
// 十四站是一条路，不是一份清单——一个人需要知道自己走到哪了。
//
// 两条规则：
// 1. 这一次才第一次到的那一站，离开之后才算「已读」。计数和侧栏上的勾用的是
//    同一个集合：第一次打开第 1 站时，不会一进来就显示「1 / 14 已读」而又没有勾。
// 2. 每次写入前先读一遍存储、合并之后再写，并监听其他标签页的写入。两个标签页
//    各走各的，不会用自己那一份覆盖掉对方走过的站。

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
const KNOWN = new Set(STOPS.map((s) => s.href));

type Ctx = { visited: Set<string>; reset: () => void };
const ProgressContext = createContext<Ctx>({ visited: new Set(), reset: () => {} });

function readStored(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return new Set();
    return new Set(list.filter((x): x is string => typeof x === "string" && KNOWN.has(x)));
  } catch {
    /* 隐私模式下读不了，就当没有进度 */
    return new Set();
  }
}

function writeStored(stops: Set<string>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...stops]));
  } catch {
    /* 写不了就只在这一次会话里记着 */
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  // 到过的每一站，包括正在看的这一站。
  const [arrived, setArrived] = useState<Set<string>>(new Set());
  // 这一次才第一次到的那一站；离开之前不算已读。
  const [fresh, setFresh] = useState<string | null>(null);

  // 首帧之后再读：服务端渲染出来的 HTML 里不该有「已读」标记，
  // 否则每个人拿到的第一帧都是同一份，然后跳变。
  useEffect(() => {
    setArrived(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) setArrived(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!KNOWN.has(path)) {
      setFresh(null);
      return;
    }
    const merged = readStored();
    const firstTime = !merged.has(path);
    merged.add(path);
    if (firstTime) writeStored(merged);
    setArrived(merged);
    setFresh(firstTime ? path : null);
  }, [path]);

  const reset = useCallback(() => {
    setArrived(new Set());
    setFresh(null);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const visited = useMemo(() => {
    if (!fresh) return arrived;
    const read = new Set(arrived);
    read.delete(fresh);
    return read;
  }, [arrived, fresh]);

  return (
    <ProgressContext.Provider value={useMemo(() => ({ visited, reset }), [visited, reset])}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);
