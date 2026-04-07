"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MaterialIcon } from "./material-icon"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/lib/notification-context"

const navItems = [
  { href: "/", icon: "home_app_logo", label: "Home" },
  { href: "/mechanics", icon: "search", label: "Explore" },
  { href: "/map", icon: "explore", label: "Map" },
  { href: "/profile", icon: "account_circle", label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { totalUnread } = useNotifications()

  const handleNav = async (href: string) => {
    if (href === "/") {
      router.push(href)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?message=salamat')
    } else {
      router.push(href)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-foreground/10 px-8 py-4 pb-8 max-w-lg mx-auto flex justify-between items-center z-[2000]">
      {navItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        return (
          <button
            key={item.href}
            onClick={() => handleNav(item.href)}
            className={`flex flex-col items-center gap-1.5 transition-colors relative ${isActive ? "text-turbo-orange" : "text-muted-foreground"}`}
          >
            <div className="relative">
              <MaterialIcon name={item.icon} className="font-bold" />
              {item.label === "Profile" && totalUnread > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black px-1 min-w-[16px] h-4 rounded-full border-2 border-midnight flex items-center justify-center animate-in zoom-in duration-300">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
