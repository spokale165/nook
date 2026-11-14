import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Nook — Find a flatmate you click with',
  description: 'Match on budget, area and mindset. List a room, or find a flat with someone.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
