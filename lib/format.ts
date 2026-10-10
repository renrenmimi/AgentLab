// 数字的千分位写法，两种语言都是 1,000。
//
// 不能用不带参数的 toLocaleString()：它跟随浏览器的区域设置，而不是这门课的语言。
// 页面在服务器上预渲染时得到 "1,000"，德语浏览器里得到 "1.000"，文字对不上，
// hydration 就会失败，整个文档在客户端重新渲染一遍——每一次打开都是如此。
// 写死 "en-US" 之后，服务器和每一个浏览器算出来的是同一串字。

export function grouped(n: number): string {
  return n.toLocaleString("en-US");
}
