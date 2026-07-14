// SYSDesigner 品牌标记（BrandMark）。
// 「由小到大、用连线串起的三个节点」——寓意全书主线：把一套系统从
// 单台服务器扩展到百万用户，同时抽象成一张上升的系统拓扑，呼应
// 「看得见的系统设计 / See System Design」。
// 纯 SVG、用 currentColor 上色，故可随处复用（侧栏用白色，其它场景继承文字色）。

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.92}
      >
        <line x1="5.5" y1="18.5" x2="12" y2="12" />
        <line x1="12" y1="12" x2="18.5" y2="5.5" />
      </g>
      <circle cx="5.5" cy="18.5" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <circle cx="18.5" cy="5.5" r="3.1" fill="currentColor" />
    </svg>
  );
}
