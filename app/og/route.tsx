// 分享卡片。一个路由生成全部十五张：/og?s=/cost
//
// 用的是这门课自己的视觉语言——深色底、紫色强调、等宽的序号——
// 而不是另画一张。ImageResponse 来自 next/og，是 Next 自带的，没有新增依赖。
// 卡面用英文：ImageResponse 的默认字体没有中文字形，与其画出方块，不如不画。

import { ImageResponse } from "next/og";
import { SEO, SITE } from "@/lib/meta";
import { HREFS } from "@/lib/order";

export const runtime = "nodejs";

const BG = "#0d1016";
const PANEL = "#151b25";
const TEXT = "#f0f2f6";
const MUTED = "#97a2b4";
const ACCENT = "#8a7cf6";

export function GET(request: Request) {
  const href = new URL(request.url).searchParams.get("s") ?? "/";
  const seo = SEO[href] ?? SEO["/"];
  const index = HREFS.indexOf(href);
  const label =
    index === -1 ? SITE.name : `${SITE.name} · stop ${index + 1} of ${HREFS.length}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BG,
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ color: MUTED, fontSize: 26, letterSpacing: 0.5 }}>{label}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              color: TEXT,
              fontSize: 66,
              lineHeight: 1.15,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            {seo.title.en}
          </div>
          <div style={{ color: MUTED, fontSize: 28, lineHeight: 1.45, maxWidth: 940 }}>
            {seo.description.en.length > 150
              ? seo.description.en.slice(0, 147) + "…"
              : seo.description.en}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderTop: `1px solid ${PANEL}`,
            paddingTop: 26,
            color: MUTED,
            fontSize: 24,
          }}
        >
          <span style={{ color: ACCENT }}>agent = one array + one loop</span>
          <span>·</span>
          <span>English and Chinese</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
