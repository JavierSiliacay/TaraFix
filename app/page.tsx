"use client"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { LocationPicker } from "@/components/location-picker"
import { MaterialIcon } from "@/components/material-icon"
import dynamic from "next/dynamic"

const MapView = dynamic(() => import("./map/map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse" />
})

import { JoinNetworkForm } from "@/components/join-network-form"
import { getMechanics } from "@/lib/actions"
import type { Mechanic } from "@/lib/types"
import { useEffect, useState } from "react"

const serviceCategories = [
  { icon: "handyman", label: "General Fix" },
  { icon: "oil_barrel", label: "Engine" },
  { icon: "speed", label: "Brakes" },
  { icon: "tire_repair", label: "Tires" },
  { icon: "electrical_services", label: "Electric" },
  { icon: "battery_charging_full", label: "Battery" },
]

const howItWorks = [
  { icon: "location_on", title: "Pin It", desc: "Set your location on the map" },
  { icon: "chat_bubble", title: "Pick It", desc: "Connect with a pro nearby" },
  { icon: "verified", title: "Fix It", desc: "Get it serviced on-site" },
]

import { PWAInstallButton } from "@/components/pwa-install-button"
import { WelcomeModal } from "@/components/welcome-modal"

export default function HomePage() {
  const [topMechanics, setTopMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMechanics() {
      try {
        const data = await getMechanics()
        // Sort by rating and reviews to get the absolute best
        const sorted = [...data].sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating
          return (b.review_count || 0) - (a.review_count || 0)
        })
        setTopMechanics(sorted.slice(0, 6)) // Top 6 pros
      } catch (err) {
        console.error("Failed to load featured mechanics", err)
      } finally {
        setLoading(false)
      }
    }
    loadMechanics()
  }, [])
  return (
    <div className="min-h-screen pb-32 overflow-x-hidden">
      <WelcomeModal />
      <AppHeader
        rightAction={
          <div className="flex items-center gap-3">
            <PWAInstallButton />
            <Link href="/register-mechanic">
              <span className="text-[10px] font-black uppercase tracking-widest text-turbo-orange border border-turbo-orange/30 px-3 py-1.5 rounded-full hover:bg-turbo-orange hover:text-midnight transition-all cursor-pointer">
                Register as mechanic
              </span>
            </Link>
          </div>
        }
      />

      <main className="max-w-lg mx-auto">
        {/* Interactive Map Hero */}
        <section className="relative w-full h-[55vh] overflow-hidden bg-slate-900 border-b border-foreground/5">
          <div className="absolute inset-0 z-0">
            <MapView mechanics={[]} />
          </div>
          <div className="absolute inset-0 hero-gradient pointer-events-none" />
          <div className="relative h-full flex flex-col justify-end p-6 pb-20 pointer-events-none z-10 animate-in">
            <span className="text-turbo-orange font-bold text-[10px] uppercase tracking-[0.4em] mb-3 bg-turbo-orange/10 w-fit px-3 py-1 rounded backdrop-blur-sm border border-turbo-orange/20">
              On-Demand Repairs
            </span>
            <h1 className="text-4xl font-extrabold text-foreground leading-[1.1] tracking-tight text-balance">
              Need a Fix? <span className="text-electric-blue">We come to you.</span>
            </h1>
            <p className="mt-4 text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] max-w-[200px] leading-relaxed">
              Philippines' First Freelance Mechanics network
            </p>
          </div>
        </section>

        {/* Explore Button */}
        <section className="px-6 -mt-16 relative z-10">
          <Link href="/mechanics">
            <button className="w-full bg-white text-midnight font-black py-4 rounded-2xl flex items-center justify-center gap-3 orange-glow hover:scale-[1.02] active:scale-95 transition-all shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-turbo-orange scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
              <MaterialIcon name="explore" className="relative z-10 text-xl" />
              <span className="relative z-10 text-sm tracking-[0.2em]">EXPLORE MECHANICS</span>
            </button>
          </Link>
        </section>

        {/* How It Works */}
        <section className="mt-14 px-5">
          <div className="flex items-center gap-2 mb-8 animate-in">
            <div className="h-0.5 w-6 bg-turbo-orange/50" />
            <h3 className="text-foreground font-black text-sm uppercase tracking-widest">How it Works</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {howItWorks.map((step, i) => (
              <div key={step.title} className={`animate-in stagger-${i + 1}`}>
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-electric-blue/10 flex items-center justify-center text-electric-blue mb-3">
                    <MaterialIcon name={step.icon} className="text-xl" />
                  </div>
                  <h4 className="text-[11px] font-bold text-foreground mb-1">{step.title}</h4>
                  <p className="text-[9px] text-muted-foreground leading-tight">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Service Categories */}
        <section className="mt-14 px-5">
          <div className="flex items-center justify-between mb-6 px-1 animate-in">
            <h3 className="text-foreground font-bold text-lg tracking-tight italic">Service Categories</h3>
            <span className="text-turbo-orange text-xs font-bold uppercase tracking-tighter">View All</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {serviceCategories.map((item, i) => (
              <div key={item.label} className={`flex flex-col items-center gap-3 animate-in stagger-${(i % 3) + 1}`}>
                <div className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center text-foreground group hover:border-turbo-orange/50 hover:bg-white/5 transition-all cursor-pointer">
                  <MaterialIcon name={item.icon} className="text-3xl group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter text-center">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Mechanics */}
        <section className="mt-16 mb-6 overflow-hidden">
          <div className="px-6 flex items-center justify-between mb-8">
            <div>
              <h3 className="text-foreground font-black text-xl tracking-tighter italic uppercase">Top-Rated Pros</h3>
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">Vetted & Active Technicians</p>
            </div>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-turbo-orange" />
              <div className="w-1.5 h-1.5 rounded-full bg-turbo-orange/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-turbo-orange/10" />
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 no-scrollbar pb-4">
            {loading ? (
              // Shared Loading State
              [1, 2, 3].map((n) => (
                <div key={n} className="shrink-0 w-44 glass-card p-4 rounded-3xl animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-white/5" />
                    <div className="flex-1">
                      <div className="h-2 w-16 bg-white/5 rounded mb-2" />
                      <div className="h-2 w-8 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded mb-3" />
                  <div className="h-2 w-12 bg-white/5 rounded" />
                </div>
              ))
            ) : topMechanics.length > 0 ? (
              topMechanics.map((pro, i) => (
                <Link 
                  key={pro.id} 
                  href={`/mechanics/${pro.id}`}
                  className="shrink-0 w-44 glass-card p-4 rounded-3xl shop-card-glow cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl overflow-hidden border border-white/5">
                      {pro.image_url ? (
                        <img src={pro.image_url} alt={pro.name} className="w-full h-full object-cover" />
                      ) : (
                        <MaterialIcon name="person" className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{pro.name}</h4>
                      <div className="flex items-center text-turbo-orange text-[10px] font-bold">
                        <MaterialIcon name="star" className="text-[10px] mr-1" filled />
                        {Number(pro.rating).toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium mb-3 line-clamp-1">
                    {pro.specializations?.[0] || "General Mechanic"}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                    <span className="text-electric-blue">{pro.review_count || 0} Reviews</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${pro.is_available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {pro.is_available ? 'Live' : 'Off'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="w-full text-center py-8 glass-card rounded-3xl">
                <p className="text-xs text-muted-foreground">No pros available yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Trust Section */}
        <section className="mt-10 px-6 py-12 bg-slate-900/50 border-y border-foreground/5 animate-in">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-foreground italic tracking-tighter uppercase">The Tara<span className="text-electric-blue">Fix</span> Promise</h2>
            <div className="w-12 h-0.5 bg-turbo-orange mx-auto mt-2" />
          </div>
          <div className="flex flex-col gap-8">
            <div className="flex gap-5">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-electric-blue/10 border border-electric-blue/20 text-electric-blue flex items-center justify-center">
                <MaterialIcon name="verified_user" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Verified Mechanics</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Vetted technicians for safety and skill.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-turbo-orange/10 border border-turbo-orange/20 text-turbo-orange flex items-center justify-center">
                <MaterialIcon name="receipt_long" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Transparent Estimates</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Get quotes before the work begins.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency SOS */}
        <section className="mt-20 px-6 animate-in">
          <div className="bg-gradient-to-br from-red-600 to-orange-600 p-[1px] rounded-[2.5rem] shadow-2xl shadow-red-500/20 group cursor-pointer hover:scale-[1.02] transition-transform active:scale-95">
            <div className="bg-midnight rounded-[2.45rem] p-8 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/10 blur-[80px] pointer-events-none group-hover:bg-red-600/20 transition-colors" />
              <div className="w-16 h-16 rounded-3xl bg-red-600 flex items-center justify-center text-white mb-6 shadow-xl shadow-red-600/40 relative">
                <div className="absolute inset-0 rounded-3xl bg-red-600 animate-ping opacity-20" />
                <MaterialIcon name="emergency_share" className="text-3xl relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-2 italic uppercase tracking-tighter">STUCK ON THE ROAD?</h3>
              <p className="text-[10px] text-muted-foreground mb-8 max-w-[220px] font-black uppercase tracking-widest leading-relaxed">
                Connect with emergency responders in <span className="text-red-500">60 seconds</span> or less.
              </p>
              <button className="w-full bg-red-600 text-white font-black py-4 rounded-2xl text-[10px] tracking-[0.25em] hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 uppercase italic">
                ENGAGE EMERGENCY PROTOCOL
              </button>
            </div>
          </div>
        </section>

        {/* Developer Contact Section */}
        <section className="mt-20 mb-12 px-5 animate-in">
          <div className="glass-card p-8 rounded-[2.5rem] flex flex-col items-center text-center border-white/5 relative group">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-background border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Developer Contact
            </div>
            
            <p className="text-sm text-foreground/80 font-medium leading-relaxed mb-8 max-w-[280px]">
              If you have any complaints or concerns regarding the system, please reach out to the Developer.
            </p>

            <div className="flex items-center gap-6">
              {/* Facebook Icon */}
              <a 
                href="https://www.facebook.com/siliacayjavier" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group/fb flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center text-[#1877F2] transition-all duration-300 group-hover/fb:scale-110 group-hover/fb:bg-[#1877F2] group-hover/fb:text-white group-hover/fb:shadow-[0_0_20px_rgba(24,119,242,0.4)]">
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-0 group-hover/fb:opacity-100 transition-opacity">Facebook</span>
              </a>

              {/* GitHub Icon */}
              <a 
                href="https://github.com/javiersiliacay" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group/gh flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white transition-all duration-300 group-hover/gh:scale-110 group-hover/gh:bg-white group-hover/gh:text-midnight group-hover/gh:shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-0 group-hover/gh:opacity-100 transition-opacity">GitHub</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
