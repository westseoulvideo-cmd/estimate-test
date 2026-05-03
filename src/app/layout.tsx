import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '견적서 계산기',
  description: '영상제작 견적 계산기',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
