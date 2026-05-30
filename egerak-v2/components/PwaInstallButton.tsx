"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isIosSafariBrowser() {
  if (!isIosDevice()) return false;
  return !/(crios|fxios|edgios)/i.test(window.navigator.userAgent);
}

function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
  }, []);

  useEffect(() => {
    if (installed) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowIosHint(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [installed]);

  const canNativeInstall = deferredPrompt != null;
  const canShowIosHint = isIosSafariBrowser() && !installed;
  const visible = !installed && (canNativeInstall || canShowIosHint);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    if (canShowIosHint) {
      setShowIosHint((v) => !v);
    }
  }, [deferredPrompt, canShowIosHint]);

  return { visible, install, showIosHint, canShowIosHint };
}

function IosInstallHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-slate-500 leading-snug", className)}>
      Tekan ikon <span className="font-medium text-slate-600">Kongsi</span> (Share), kemudian pilih{" "}
      <span className="font-medium text-slate-600">Tambah ke Skrin Utama</span>.
    </p>
  );
}

type Props = {
  variant: "menu-block" | "nav-link";
  className?: string;
};

export default function PwaInstallButton({ variant, className }: Props) {
  const { visible, install, showIosHint, canShowIosHint } = usePwaInstall();

  if (!visible) return null;

  if (variant === "nav-link") {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => void install()}
          className="rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1.5 text-xs whitespace-nowrap"
        >
          Pasang App
        </button>
        {showIosHint && canShowIosHint && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-slate-200 bg-white p-3 text-left shadow-lg">
            <IosInstallHint />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <button type="button" className="btn-secondary w-full justify-center" onClick={() => void install()}>
        Pasang App
      </button>
      {showIosHint && canShowIosHint && <IosInstallHint className="mt-2 px-1" />}
    </div>
  );
}
