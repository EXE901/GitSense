import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { AuthProvider } from '@/components/auth/auth-provider'
import { ScrollRestoration } from '@/components/layout/scroll-restoration'
import { ThemeProvider } from '@/components/theme/theme-provider'
import './globals.css'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim()
  || (process.env.NODE_ENV === 'production' ? 'https://gitsense.tech' : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'GitSense — Engineering Intelligence for GitHub Workspaces',
  description: 'Operational analytics for GitHub repositories. Issue trends, stale backlog pressure, contributor concentration, and grounded workspace briefings for engineering teams.',
  applicationName: 'GitSense',
  keywords: ['GitHub', 'issue tracking', 'engineering analytics', 'DevOps', 'workspace health', 'operational insights', 'developer productivity'],
  authors: [{ name: 'GitSense' }],
  openGraph: {
    title: 'GitSense — Engineering Intelligence for GitHub Workspaces',
    description: 'Operational analytics for GitHub repositories — backlog pressure, stale signals, contributor concentration, and grounded workspace briefings.',
    type: 'website',
    siteName: 'GitSense',
    images: [{ url: '/logos/symbol.svg', width: 1200, height: 1200, alt: 'GitSense' }],
  },
  icons: {
    icon: [
      { url: '/logos/symbol.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/logos/symbol.svg',
    apple: '/logos/symbol.svg',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
    { media: '(prefers-color-scheme: light)', color: '#f8fbff' },
  ],
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased font-sans overflow-x-hidden">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var key = 'gitsense:theme';
                var stored = window.localStorage.getItem(key);
                var theme = stored === 'dark' || stored === 'light'
                  ? stored
                  : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                if (stored && stored !== 'dark' && stored !== 'light') {
                  window.localStorage.removeItem(key);
                }
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme;
              } catch (error) {
                document.documentElement.classList.add('dark');
                document.documentElement.dataset.theme = 'dark';
                document.documentElement.style.colorScheme = 'dark';
              }
            })();
          `}
        </Script>
        <Script id="scroll-restoration-mode" strategy="beforeInteractive">
          {`history.scrollRestoration = 'manual'`}
        </Script>
        <ThemeProvider>
          <AuthProvider>
            <ScrollRestoration />
            {children}
          </AuthProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
