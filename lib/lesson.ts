// 第 4 站往后各站共用的内容结构。
// 每一站都是「一段标题 + 若干段正文（可带一个常见疑问）」，
// 页面各自再插入自己的互动部分。

import type { L } from "@/lib/i18n";

export type Block = {
  title: L;
  paras: L[];
  faq?: { q: L; a: L };
};

export type LessonMeta = {
  title: L;
  subtitle: L;
  // 整站唯一一句最想让人带走的话，渲染在页面末尾。
  takeaway: L;
};
