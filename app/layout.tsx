import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import 'leaflet/dist/leaflet.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'TaraFix - Find Freelance Mechanics in the Philippines',
  description: 'Connect with expert freelance mechanics and technicians for on-demand, on-site auto repairs anywhere in the Philippines.',
}

export const viewport: Viewport = {
  themeColor: '#0a0f18',
  width: 'device-width',
  initialScale: 1,
}

import { AvatarSync } from "@/components/avatar-sync"
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
        <NotificationProvider>
          <AvatarSync />
          {children}
        </NotificationProvider>
      </body>
    </html>
  )
}
