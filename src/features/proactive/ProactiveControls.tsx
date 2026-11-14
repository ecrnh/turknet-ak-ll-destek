import { featureForPath, proactiveMessage } from "./rules";
import { useProactive } from "./store";

/** Presenter-only test controls (never inside the phone). */
export function ProactiveControls() {
  const last = useProactive((s) => s.lastSignal);
  const seenCount = useProactive((s) => s.seen.size);
  const fire = (type: "rage_click" | "quick_back") => {
    const path = window.location.pathname;
    const f = featureForPath(path);
    useProactive.getState().reset();
    useProactive.getState().emit({ type, path, feature: f.feature, intent: f.intent, left: path, at: Date.now() });
  };
  return (
    <div className="mb-4 rounded-xl border border-border p-3">
      <p className="text-xs font-bold text-primary">Proaktif GIGA (test)</p>
      <p className="mt-1 text-[11px] text-muted-foreground">Gerçek kullanım: aynı butona 2 sn'de 3 kez dokun ya da bir sayfaya girip 7 sn içinde geri dön. Gösterilen sinyaller: {seenCount}</p>
      {last && <p className="mt-1 text-[11px] text-foreground">Son: {last.type === "rage_click" ? "Öfkeli tıklama" : "Hızlı geri dönüş"} · {last.feature} — “{proactiveMessage(last)}”</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => useProactive.getState().reset()} className="min-h-8 rounded-full bg-muted px-3 text-[11px] font-semibold">Sıfırla</button>
        <button onClick={() => fire("rage_click")} className="min-h-8 rounded-full bg-muted px-3 text-[11px] font-semibold">Öfkeli tıklama tetikle</button>
        <button onClick={() => fire("quick_back")} className="min-h-8 rounded-full bg-muted px-3 text-[11px] font-semibold">Hızlı dönüş tetikle</button>
      </div>
    </div>
  );
}
