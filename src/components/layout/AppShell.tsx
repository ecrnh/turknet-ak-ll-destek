import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BarChart3, Eye, SlidersHorizontal, Signal, Wifi, BatteryMedium, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useAppStore } from "@/features/core/appStore";
import { DemoPanel } from "@/features/demo/DemoPanel";
import { HelpCenterSheet } from "@/features/help/HelpCenterSheet";
import { OutageOverlay, RestoredOverlay } from "@/features/giftData/components/OutageOverlays";
import { rehydrateAll } from "@/features/demo/scenarios";
import { fmtClock } from "@/lib/format";
import { BottomNav } from "./BottomNav";
import { ActingBanner, PushBanner, Splash } from "./Overlays";
import { TurknetLogo } from "./headers";

const NO_NAV = ["/goruntulu-destek/gorusme", "/qr/tara"];

function StatusBar() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden h-8 shrink-0 items-center justify-between bg-card px-6 text-xs font-semibold text-foreground sm:flex" aria-hidden>
      <span>{fmtClock(now)}</span>
      <span className="flex items-center gap-1.5">
        <Wifi className="size-3.5" />
        <Signal className="size-3.5" />
        <BatteryMedium className="size-4" />
      </span>
    </div>
  );
}

function PhoneApp() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const scroller = useRef<HTMLElement>(null);
  const showNav = !NO_NAV.some((p) => path.startsWith(p));

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [path]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background [transform:translateZ(0)]">
      <StatusBar />
      <ActingBanner />
      <main ref={scroller} id="tn-scroll" className={showNav ? "flex-1 overflow-y-auto pb-28 no-scrollbar" : "flex-1 overflow-y-auto no-scrollbar"}>
        <Outlet />
      </main>
      {showNav && <BottomNav />}
      <HelpCenterSheet />
      <OutageOverlay />
      <RestoredOverlay />
      <PushBanner />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

/** Desktop: centred 390x844 device frame + presenter panel. Mobile: full screen. */
export function AppShell() {
  const [ready, setReady] = useState(false);
  const bigText = useAppStore((s) => s.prefs.bigText);
  const demoPanel = useAppStore((s) => s.prefs.demoPanel);
  const setPref = useAppStore((s) => s.setPref);
  const [mobilePanel, setMobilePanel] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    rehydrateAll().then(() => setReady(true));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.bigtext = String(bigText);
  }, [bigText]);

  if (path.startsWith("/dashboard")) {
    return ready ? <Outlet /> : <div className="h-dvh"><Splash /></div>;
  }

  return (
    <div className="min-h-dvh w-full sm:flex sm:items-center sm:justify-center sm:gap-10 sm:p-6">
      <aside className="hidden max-w-[260px] xl:block">
        <TurknetLogo className="text-6xl" />
        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-magenta">Product Bootcamp · Final Case</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-primary">Self-servis ve proaktif destek prototipi</h1>
        <p className="mt-3 text-sm text-muted-foreground">Görüntülü Destek + Aile Yetkilendirme, QR ile Temassız Destek, Kesinti Telafisi ve AI Ajanlar.</p>
        <Link to="/dashboard" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-float">
          <BarChart3 className="size-4" /> Etki Panosu
        </Link>
      </aside>

      <div className="relative h-dvh w-full overflow-hidden bg-background sm:h-[844px] sm:w-[390px] sm:shrink-0 sm:rounded-[48px] sm:border-[10px] sm:border-device sm:shadow-device">
        {ready ? <PhoneApp /> : <Splash />}
      </div>

      {ready && demoPanel && (
        <aside className="hidden w-[300px] shrink-0 rounded-card bg-card p-5 shadow-card lg:block">
          <DemoPanel onHide={() => setPref("demoPanel", false)} />
        </aside>
      )}
      {ready && !demoPanel && (
        <button onClick={() => setPref("demoPanel", true)} className="fixed right-4 top-4 hidden min-h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-primary shadow-card lg:flex">
          <Eye className="size-4" /> Demo Paneli
        </button>
      )}

      {ready && (
        <>
          <button onClick={() => setMobilePanel(true)} aria-label="Demo paneli" className="fixed right-3 top-3 z-[90] flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float lg:hidden">
            <SlidersHorizontal className="size-5" />
          </button>
          {mobilePanel && (
            <div className="fixed inset-0 z-[95] flex justify-end bg-primary-deep/50 lg:hidden" onClick={() => setMobilePanel(false)}>
              <div className="h-full w-[320px] max-w-[90%] overflow-y-auto bg-card p-5" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 flex justify-end">
                  <button onClick={() => setMobilePanel(false)} aria-label="Kapat" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
                    <X className="size-5" />
                  </button>
                </div>
                <DemoPanel />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
