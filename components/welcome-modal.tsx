"use client";

import { useEffect, useState } from "react";
import { X, Smartphone, ShieldCheck, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/lib/pwa-context";

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { isInstallable, installApp, isInstalled } = usePWA();

  useEffect(() => {
    // Show modal if it's the first time and not already installed
    const hasSeenWelcome = localStorage.getItem("tarafix_welcome_seen");
    if (!hasSeenWelcome && !isInstalled) {
      // Delay slightly for a smoother entrance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("tarafix_welcome_seen", "true");
  };

  const handleInstall = async () => {
    await installApp();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-midnight/80 backdrop-blur-md" 
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md overflow-hidden bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Top Banner/Background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-turbo-orange/20 to-electric-blue/20 blur-2xl -z-10" />
        
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-turbo-orange rounded-2xl flex items-center justify-center shadow-lg shadow-turbo-orange/20">
              <img src="/logo.png" alt="TaraFix" className="w-16 h-16 object-contain" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
              Welcome to <span className="italic">Tara<span className="text-electric-blue">Fix</span></span>
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              The Philippines' first on-demand network for expert freelance mechanics. 
              Get your vehicle fixed right where you are.
            </p>
          </div>

          <div className="space-y-4 mb-8 text-sm">
            <div className="flex items-center gap-4 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-turbo-orange" />
              </div>
              <p>On-demand repairs at your location</p>
            </div>
            <div className="flex items-center gap-4 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-electric-blue" />
              </div>
              <p>Verified expert mechanics only</p>
            </div>
            <div className="flex items-center gap-4 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-turbo-orange" />
              </div>
              <p>Real-time booking & tracking</p>
            </div>
          </div>

          <div className="space-y-3">
            {isInstallable && (
              <Button 
                onClick={handleInstall}
                className="w-full bg-turbo-orange hover:bg-turbo-orange/90 text-white font-bold py-6 rounded-xl shadow-lg shadow-turbo-orange/20 gap-2 text-base"
              >
                <Smartphone className="h-5 w-5" />
                Install Mobile App
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="w-full text-white/40 hover:text-white hover:bg-white/5 py-6 rounded-xl font-medium"
            >
              Continue to Website
            </Button>
          </div>
          
          <p className="text-[10px] text-center text-white/30 mt-6 uppercase tracking-widest font-black">
            Available on iOS and Android via Browser
          </p>
        </div>
      </div>
    </div>
  );
}
