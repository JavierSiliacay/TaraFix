import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import 'leaflet/dist/leaflet.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'TaraFix - Find Freelance Mechanics in the Philippines',
  description: 'Connect with expert freelance mechanics and technicians for on-demand, on-site auto repairs anywhere in the Philippines.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaraFix',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { Toaster } from "@/components/ui/sonner"
import { AvatarSync } from "@/components/avatar-sync"
import { PWAProvider } from "@/lib/pwa-context"
import { NotificationProvider } from "@/lib/notification-context"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <PWAProvider>
          <NotificationProvider>
            <AvatarSync />
            {children}
          </NotificationProvider>
        </PWAProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
