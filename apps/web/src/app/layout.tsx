import type {Metadata} from 'next';
import Script from 'next/script';
import {GeistMono, GeistSans} from 'geist/font';

import './styles.css';

export const metadata: Metadata = {
  title: 'Kairos',
  description: 'Policy-authorized adaptive execution on Monad.',
};

const enableDevTools =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS !== '1';

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {enableDevTools ? (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
            <Script
              src="//unpkg.com/react-scan/dist/auto.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          </>
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
