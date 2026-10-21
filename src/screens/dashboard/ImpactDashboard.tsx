import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, FlaskConical, Inbox, MessageSquare, Smartphone, Star, Timer, Truck, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TurknetLogo } from "@/components/layout/headers";
import { CASE_BASELINE } from "@/data/mock";
import { useAppStore } from "@/features/core/appStore";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

const [AUG, SEP] = CASE_BASELINE.months;
const pct = (a: number, b: number) => Math.round((a / b) * 1000) / 10;
const liveChatAug = pct(AUG.toLiveChat, AUG.fromAssistant);
const liveChatSep = pct(SEP.toLiveChat, SEP.fromAssistant);
const selfAug = pct(AUG.digitalRepair, AUG.digitalRepair + AUG.fromAssistant);
const selfSep = pct(SEP.digitalRepair, SEP.digitalRepair + SEP.fromAssistant);
const mau = CASE_BASELINE.mobileUsers.ios + CASE_BASELINE.mobileUsers.android;

const BASE_BARS = [
  { name: "Toplam kayıt", Ağustos: AUG.total, Eylül: SEP.total },
  { name: "Teknik kayıt", Ağustos: AUG.technical, Eylül: SEP.technical },
  { name: "Asistandan kayıt", Ağustos: AUG.fromAssistant, Eylül: SEP.fromAssistant },
  { name: "Canlı chat'e giden", Ağustos: AUG.toLiveChat, Eylül: SEP.toLiveChat },
  { name: "Dijital onarım", Ağustos: AUG.digitalRepair, Eylül: SEP.digitalRepair },
];

const PROJECTION = [
  { m: "Ağu", chat: liveChatAug, self: selfAug },
  { m: "Eyl", chat: liveChatSep, self: selfSep },
  { m: "Eki (pilot)", chat: 50.1, self: 72.4 },
  { m: "Kas", chat: 46.0, self: 75.5 },
  { m: "Ara", chat: 42.5, self: 78.2 },
  { m: "Oca (hedef)", chat: 40.0, self: 80.0 },
];

const FUNNELS = [
  { f: "Görüntülü Destek", key: "video", steps: [100, 38, 31] },
  { f: "QR ile Destek", key: "qr", steps: [100, 52, 46] },
  { f: "Hediye GB", key: "gift", steps: [100, 71, 64] },
  { f: "AI Ajanlar", key: "ai", steps: [100, 88, 84] },
];

const DROPOFF = [
  { f: "Görüntülü Destek", points: [["Konu seçimi", 8], ["Kamera izni", 14], ["Bekleme", 6], ["Görüşme", 4]] },
  { f: "QR ile Destek", points: [["Tarama", 9], ["Analiz", 3], ["Talep onayı", 5]] },
  { f: "Aile Yetkilendirme", points: [["Kişi bilgisi", 6], ["Kapsam", 4], ["KVKK", 7], ["OTP", 9]] },
] as const;

const AB = [
  { f: "QR ile Destek", metric: "Kayıt açma süresi", control: "Asistan + form", variant: "QR tek dokunuş", effect: "-%60", dur: "4 hafta", n: "2 × 12.000 abone", good: true },
  { f: "Görüntülü Destek", metric: "Saha ziyareti oranı", control: "Chat → saha randevusu", variant: "Görüntülü uzman", effect: "-%25", dur: "6 hafta", n: "2 × 8.500 teknik kayıt", good: true },
  { f: "Kesinti Telafisi", metric: "Kesinti dönemi destek çağrısı", control: "Sadece SMS bilgilendirme", variant: "Proaktif kart + hediye GB", effect: "-%35", dur: "Kesinti bazlı, 3 olay", n: "Etkilenen bölge aboneleri", good: true },
  { f: "AI Ajanlar", metric: "Asistandan canlı chat'e geçiş", control: "Reaktif asistan", variant: "Proaktif Hız Koruyucu", effect: "-%18", dur: "4 hafta", n: "2 × 20.000 abone", good: true },
  { f: "Aile Yetkilendirme", metric: "65+ yaş self-servis çözüm", control: "Yetki yok", variant: "Yakın yönetimi", effect: "+%22", dur: "8 hafta", n: "2 × 3.000 hane", good: true },
];

function Kpi({ icon: Icon, label, base, target, note, down }: { icon: typeof Star; label: string; base: string; target: string; note: string; down?: boolean }) {
  return (
    <div className="rounded-card bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 text-magenta" /> {label}
      </div>
      <div className="mt-3 flex items-end gap-3">
        <p className="text-3xl font-bold text-primary">{target}</p>
        <span className={cn("mb-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold", "bg-success-soft text-success")}>
          {down ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />} hedef
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Baz: {base}</p>
      <p className="mt-2 text-xs text-foreground">{note}</p>
    </div>
  );
}

export function ImpactDashboard() {
  const events = useAppStore((s) => s.events);
  const feedback = useAppStore((s) => s.feedback);
  const ratings = useAppStore((s) => s.ratings);
  const saved = useAppStore((s) => s.savedFieldVisits);
  const records = useAppStore((s) => s.records);

  const count = (name: string, prefix: string) => events.filter((e) => e.name === name && e.feature.startsWith(prefix)).length;
  const avgCsat = ratings.length ? (ratings.reduce((n, r) => n + r.csat, 0) / ratings.length).toFixed(1) : "—";
  const npsList = ratings.filter((r) => r.nps != null).map((r) => r.nps as number);
  const nps = npsList.length ? Math.round(((npsList.filter((n) => n >= 9).length - npsList.filter((n) => n <= 6).length) / npsList.length) * 100) : null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-muted" aria-label="Uygulamaya dön">
            <ArrowLeft className="size-5" />
          </Link>
          <TurknetLogo className="text-4xl" />
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-primary">Etki Panosu</h1>
            <p className="text-xs text-muted-foreground">Self-servis & proaktif destek · Ağustos–Eylül gerçek veriler baz çizgisi, hedefler projeksiyon</p>
          </div>
          <span className="hidden rounded-full bg-magenta-soft px-3 py-1.5 text-xs font-semibold text-magenta sm:inline">Demo verisi + canlı prototip olayları</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi icon={Smartphone} label="Mobil uygulama MAU" base={`${fmtNum(mau)} (iOS 310K · Android 108K)`} target="480K" note="+%15 · yeni self-servis akışları ile asistan yerine uygulama" />
          <Kpi icon={Wrench} label="Self-servis çözüm oranı" base={`Ağu %${selfAug} → Eyl %${selfSep}`} target="%80" note="Dijital onarım / (dijital onarım + asistandan kayıt)" />
          <Kpi icon={MessageSquare} label="Canlı chat'e düşen oran" base={`Eyl ${fmtNum(SEP.toLiveChat)} / ${fmtNum(SEP.fromAssistant)} = %${liveChatSep}`} target="%40" down note={`Ağustos %${liveChatAug} idi. Her 1 puan ≈ 1.000 chat/ay`} />
          <Kpi icon={Truck} label="Saha ekibi gönderilmeden çözülen" base="Baz ~8.200 / ay" target="12.400 / ay" note={`Görüntülü destek + QR + ajanlar. Prototipte bu oturumda: ${saved + records.filter((r) => r.fieldVisitAvoided).length}`} />
          <Kpi icon={Timer} label="Ortalama çözüm süresi" base="26 saat (saha randevulu)" target="4 saat" down note="QR talep otomatik dolum + görüntülü uzaktan çözüm" />
          <Kpi icon={Star} label="CSAT / NPS" base="CSAT 3,9 · NPS +18" target="4,4 · +32" note={`Prototipte toplanan: CSAT ${avgCsat} (${ratings.length} yanıt)${nps != null ? ` · NPS ${nps}` : ""}`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Dijital asistan baz çizgisi (Ağustos → Eylül)</p>
            <p className="text-xs text-muted-foreground">Dijital onarım +%{Math.round(((SEP.digitalRepair - AUG.digitalRepair) / AUG.digitalRepair) * 100)}, canlı chat −%{Math.round(((AUG.toLiveChat - SEP.toLiveChat) / AUG.toLiveChat) * 100)}</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer>
                <BarChart data={BASE_BARS} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <Tooltip formatter={(v: number) => fmtNum(v)} />
                  <Legend />
                  <Bar dataKey="Ağustos" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Eylül" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Hedef projeksiyonu (%)</p>
            <p className="text-xs text-muted-foreground">Canlı chat'e düşen oran ↓ · self-servis çözüm oranı ↑</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer>
                <LineChart data={PROJECTION} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[30, 90]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip formatter={(v: number) => `%${v}`} />
                  <Legend />
                  <Line type="monotone" dataKey="self" name="Self-servis çözüm" stroke="var(--chart-4)" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="chat" name="Canlı chat'e düşen" stroke="var(--chart-2)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Özellik bazlı kullanım hunisi</p>
            <p className="text-xs text-muted-foreground">Bilgilendirme → başlatma → tamamlama (hedef pilot oranları) · parantez içi: bu oturumdaki canlı olaylar</p>
            <div className="mt-4 space-y-5">
              {FUNNELS.map((f) => {
                const live = [count("feature_opened", f.key), count("flow_started", f.key), count("flow_completed", f.key)];
                return (
                  <div key={f.f}>
                    <p className="mb-2 text-sm font-semibold">{f.f}</p>
                    {["Bilgilendirme", "Başlatma", "Tamamlama"].map((label, i) => (
                      <div key={label} className="mb-1.5 flex items-center gap-3 text-xs">
                        <span className="w-24 text-muted-foreground">{label}</span>
                        <div className="h-6 flex-1 rounded-lg bg-muted">
                          <div className={cn("flex h-6 items-center justify-end rounded-lg px-2 font-bold text-primary-foreground", i === 0 ? "bg-primary" : i === 1 ? "bg-primary-soft" : "bg-magenta")} style={{ width: `${f.steps[i]}%` }}>
                            %{f.steps[i]}
                          </div>
                        </div>
                        <span className="w-8 text-right text-muted-foreground">({live[i]})</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="font-semibold text-primary">Kullanıcı yolculuğu terk noktaları</p>
            <p className="text-xs text-muted-foreground">Adım bazında terk oranı (flow_abandoned) · en yüksek nokta vurgulu</p>
            <div className="mt-4 space-y-5">
              {DROPOFF.map((d) => {
                const max = Math.max(...d.points.map((p) => p[1]));
                return (
                  <div key={d.f}>
                    <p className="mb-2 text-sm font-semibold">{d.f}</p>
                    <div className="flex items-end gap-2">
                      {d.points.map(([step, v]) => (
                        <div key={step} className="flex flex-1 flex-col items-center gap-1">
                          <span className={cn("text-xs font-bold", v === max ? "text-destructive" : "text-muted-foreground")}>%{v}</span>
                          <div className={cn("w-full rounded-t-lg", v === max ? "bg-destructive" : "bg-chart-5")} style={{ height: v * 5 }} />
                          <span className="text-center text-[10px] leading-tight text-muted-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="rounded-2xl bg-warning-soft p-3 text-xs">Aksiyon: kamera izni ekranında metin sadeleştirme + "Kamerasız devam et" seçeneği; OTP adımında otomatik SMS okuma.</p>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-3 flex items-center gap-2 font-semibold text-primary"><FlaskConical className="size-5 text-magenta" /> A/B test planı</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AB.map((a) => (
              <div key={a.f} className="rounded-card bg-card p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-primary">{a.f}</p>
                  <span className="rounded-full bg-success-soft px-2.5 py-1 text-sm font-bold text-success">{a.effect}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Birincil metrik: {a.metric}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-muted p-2.5">
                    <p className="font-bold text-muted-foreground">A · Kontrol</p>
                    <p className="mt-0.5">{a.control}</p>
                  </div>
                  <div className="rounded-xl bg-magenta-soft p-2.5">
                    <p className="font-bold text-magenta">B · Varyant</p>
                    <p className="mt-0.5">{a.variant}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Süre: {a.dur} · Örneklem: {a.n}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-card bg-card p-5 shadow-card lg:col-span-2">
            <p className="font-semibold text-primary">Canlı analitik olaylar</p>
            <p className="text-xs text-muted-foreground">feature_opened · flow_started · flow_completed · flow_abandoned (prototipte üretilen, konsola da yazılır)</p>
            <div className="mt-3 max-h-80 overflow-y-auto">
              {events.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Henüz olay yok. Uygulamada bir akışı deneyin.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-card text-muted-foreground">
                    <tr>
                      <th className="py-2">Zaman</th>
                      <th>Olay</th>
                      <th>Özellik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 80).map((e) => (
                      <tr key={e.id} className="border-t border-border">
                        <td className="py-1.5 text-muted-foreground">{fmtDateTime(e.time)}</td>
                        <td>
                          <span className={cn("rounded-full px-2 py-0.5 font-semibold", e.name === "flow_completed" ? "bg-success-soft text-success" : e.name === "flow_abandoned" ? "bg-destructive-soft text-destructive" : "bg-muted")}>{e.name}</span>
                        </td>
                        <td className="font-mono">{e.feature}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-card bg-card p-5 shadow-card">
              <p className="flex items-center gap-2 font-semibold text-primary"><Inbox className="size-4 text-magenta" /> Talep Kutusu</p>
              <p className="text-xs text-muted-foreground">"Bu işlemi uygulamadan yapamadın mı?" yanıtları</p>
              {feedback.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Henüz talep yok.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {feedback.map((f) => (
                    <li key={f.id} className="rounded-xl bg-muted p-2.5 text-xs">
                      <p className="font-semibold">{f.op}</p>
                      {f.text && <p className="text-muted-foreground">{f.text}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-card bg-card p-5 shadow-card">
              <p className="flex items-center gap-2 font-semibold text-primary"><Star className="size-4 text-magenta" /> CSAT yanıtları</p>
              {ratings.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Henüz yanıt yok.</p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-xs">
                  {ratings.slice(0, 10).map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span className="font-mono">{r.feature}</span>
                      <span className="font-semibold">{r.csat}/5{r.nps != null ? ` · NPS ${r.nps}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
