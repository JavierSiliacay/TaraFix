"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { usePWA } from "@/lib/pwa-context";

export function PWAInstallButton() {
  const { isInstallable, installApp } = usePWA();

  if (!isInstallable) return null;

  return (
    <Button
      onClick={installApp}
      variant="outline"
      size="sm"
      className="gap-2 bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary h-8 w-8 sm:w-auto p-0 sm:px-3"
      title="Install App"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install App</span>
    </Button>
  );
}
