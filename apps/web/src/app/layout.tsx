import type {Metadata} from 'next';
import {GeistMono, GeistSans} from 'geist/font';

import {DevTools} from '@/components/dev-tools';

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
      <body>
        {children}
        {enableDevTools ? <DevTools /> : null}
      </body>
    </html>
  );
}
