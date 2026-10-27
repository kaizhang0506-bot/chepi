import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '御彩星绘 · 汽车车衣设计工作台', description: '从灵感到车身，汽车彩绘母版与分层设计工作台' };
export default function Layout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
