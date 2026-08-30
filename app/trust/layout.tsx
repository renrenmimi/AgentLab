// 这一站自己的 <title> 和描述。页面本身是 client component，导不出 metadata，
// 所以由这一层来导。文案在 lib/meta.ts，一句一句写的。
import { stopMetadata } from "@/lib/meta";

export const metadata = stopMetadata("/trust");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
