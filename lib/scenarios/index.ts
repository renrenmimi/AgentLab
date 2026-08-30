//的五次运行：一次顺利的，四次出问题的。
// 顺利那次是默认场景，也是其余四次的对照组。

import type { Scenario } from "./types";
import { happyPath } from "./happy-path";
import { willNotStop } from "./will-not-stop";
import { wrongTool } from "./wrong-tool";
import { historyTooLong } from "./history-too-long";
import { toolFails } from "./tool-fails";

export * from "./types";

export const scenarios: Scenario[] = [
  happyPath,
  willNotStop,
  wrongTool,
  historyTooLong,
  toolFails,
];
