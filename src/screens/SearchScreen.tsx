import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Flame, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLink, EmptyState, NewBadge } from "@/components/tn/primitives";
import { POPULAR_SEARCHES, SEARCH_INDEX } from "@/data/mock";
import { track } from "@/lib/analytics";

const norm = (s: string) => s.toLocaleLowerCase("tr-TR");

export function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const results = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return [];
    return SEARCH_INDEX.filter((i) => norm(i.title).includes(t) || norm(i.keywords).includes(t));
  }, [q]);

  return (
    <div>
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-background px-3 pb-3 pt-3">
        <button onClick={() => router.history.back()} aria-label="Geri" className="flex h-11 w-11 items-center justify-center rounded-full text-primary">
          <ArrowLeft className="size-6" />
        </button>
        <div className="flex h-12 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 shadow-sm">
          <Search className="size-5" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="İşlem veya Sayfa Ara" aria-label="Ara" className="h-full flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
          {q && (
            <button onClick={() => setQ("")} aria-label="Temizle" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        {!q ? (
          <>
            <p className="mb-3 mt-3 flex items-center gap-1.5 text-lg font-semibold text-primary">
              <Flame className="size-5 fill-orange text-orange-deep" /> Popüler Aramalar
            </p>
            <div className="flex flex-wrap gap-3">
              {POPULAR_SEARCHES.map((p) => (
                <button key={p} onClick={() => setQ(p)} className="min-h-12 rounded-full border-2 border-primary/20 bg-card px-5 font-semibold text-primary">
                  {p}
                </button>
              ))}
            </div>
            <p className="mb-3 mt-7 text-lg font-semibold text-primary">Yeni Özellikler</p>
            <div className="flex flex-wrap gap-3">
              {["Görüntülü Destek", "QR ile Destek", "Hibrit İnternet", "GIGA", "Aile Yetkilendirme"].map((p) => (
                <button key={p} onClick={() => setQ(p.split(" ")[0] ?? p)} className="min-h-12 rounded-full border-2 border-magenta/30 bg-magenta-soft px-5 font-semibold text-magenta">
                  {p}
                </button>
              ))}
            </div>
          </>
        ) : results.length === 0 ? (
          <EmptyState icon={SearchX} title="Sonuç bulunamadı" text={`"${q}" için bir işlem bulamadık. Yardım Merkezi'ne sorabilirsin.`} />
        ) : (
          <div className="divide-y divide-border rounded-card bg-card px-5 shadow-card" aria-live="polite">
            {results.map((r) => (
              <AppLink key={r.title} to={r.to} onClick={() => track("cta_clicked", "search", { q, result: r.title })} className="flex min-h-[60px] items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    {r.title} {r.isNew && <NewBadge />}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.section}</p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </AppLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
