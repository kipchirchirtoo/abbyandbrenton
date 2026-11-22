import type { Metadata, Viewport } from 'next';
import './globals.css';
import './site.css';
import './rsvp.css';

// Deliberately minimal: this applies to EVERY page, including the private-access screen.
// Event details (date, venue) are added only by the (site) layout when the site is public.
export const metadata: Metadata = {
  title: 'Abigael & Brenton',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Great+Vibes&family=Jost:wght@300;400;500&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
