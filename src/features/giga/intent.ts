/**
 * GIGA's request understanding (pure, testable).
 *
 * Instead of "first keyword wins", every topic collects a score from weighted
 * word stems. Text is normalised (Turkish lower-case, diacritics folded) so
 * "faturam neden yuksek" and "Faturam neden yüksek?" read the same, and short
 * typos ("fatrua", "taşnmak") still match. A separate status signal ("ne
 * durumda", "nerede", "ne zaman") turns a topic into a question about an
 * existing process instead of starting a new one.
 */
import type { UstaIssueId } from "@/data/mock";

export type GigaTopic =
  | "human"
  | "video"
  | "privacy"
  | "hallet"
  | "relocation"
  | "billing"
  | "refund"
  | "payment"
  | "speed"
  | "outage"
  | "modem"
  | "wifi"
  | "internet"
  | "hybrid"
  | "family"
  | "subscription"
  | "upgrade"
  | "track"
  | "greeting"
  | "thanks"
  | "yes"
  | "no";

/** Folds Turkish characters so typed text with or without diacritics matches. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[âî]/g, (c) => (c === "â" ? "a" : "i"))
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Rule = [stem: string, weight: number];

/** Word stems per topic (already normalised). Multi-word stems match as phrases. */
const RULES: Record<Exclude<GigaTopic, "track" | "yes" | "no" | "greeting" | "thanks">, Rule[]> = {
  human: [["temsilci", 4], ["canli destek", 4], ["insanla", 4], ["gercek kisi", 4], ["musteri hizmet", 4], ["operator", 4], ["uzmana bagla", 4], ["uzmanla gorus", 4], ["uzmanla konus", 4], ["biriyle konus", 3], ["yetkiliyle", 3], ["uzman istiyorum", 4]],
  video: [["goruntulu", 4], ["video", 3], ["kamerali gorus", 4], ["yuz yuze", 3]],
  privacy: [["izliyor", 4], ["izleme", 3], ["gizlilik", 4], ["kisisel veri", 4], ["verilerim", 3], ["kvkk", 4], ["neyi kontrol", 4], ["ne kontrol", 3], ["hangi bilgi", 3], ["mesajlarimi", 3], ["gecmisimi", 3], ["gezinme", 3]],
  hallet: [["hallet", 4], ["benim icin yap", 3]],
  relocation: [["tasin", 4], ["nakl", 4], ["yeni adres", 4], ["adres degis", 4], ["adresimi degis", 4], ["ev degis", 3], ["yeni ev", 3], ["baska eve", 3], ["baska sehre", 3], ["tasiyorum", 4], ["tasima", 3]],
  billing: [["fatura", 3], ["mukerrer", 4], ["iki kez", 3], ["iki kere", 3], ["tutarsiz", 4], ["borc", 3], ["ucret", 2], ["tahsil", 3], ["pahali", 3], ["yuksek", 1], ["fazla", 1], ["zam", 2], ["itiraz", 3], ["neden bu kadar", 2], ["kampanya bitti", 2]],
  refund: [["iade", 4], ["param geri", 4], ["geri odeme", 4]],
  payment: [["nasil ode", 4], ["odeme yap", 3], ["otomatik odeme", 4], ["talimat", 3], ["son odeme", 3], ["kartla", 2], ["kredi karti", 2], ["ode", 1]],
  speed: [["yavas", 4], ["hiz dus", 4], ["hizim", 3], ["dusuk hiz", 4], ["hiz sorun", 4], ["donuyor", 3], ["kasiyor", 3], ["takiliyor", 3], ["gecikme", 3], ["ping", 2], ["lag", 2], ["yuklenmiyor", 2], ["hizi dusuk", 4], ["mbps", 2]],
  outage: [["calismiyor", 4], ["kesildi", 4], ["kesinti", 4], ["internet kesik", 4], ["hat kesik", 4], ["internet yok", 4], ["baglanti yok", 4], ["kopuyor", 3], ["koptu", 3], ["baglanamiyorum", 4], ["baglanmiyor", 4], ["gitti", 2], ["girmiyor", 3], ["acilmiyor", 2], ["cokmus", 3], ["cekmiyor", 1]],
  modem: [["modem", 3], ["isik", 3], ["led", 2], ["kirmizi", 3], ["yanip son", 3], ["router", 3], ["fotograf", 2]],
  wifi: [["wifi", 4], ["wi-fi", 4], ["kablosuz", 4], ["sinyal", 3], ["cekmiyor", 2], ["kapsama", 2], ["odada", 1], ["qr", 3]],
  internet: [["internet", 1], ["sorun", 1], ["problem", 1], ["ariza", 2], ["teknik", 1], ["baglanti", 1]],
  hybrid: [["hibrit", 4], ["yedek baglanti", 4], ["yedek internet", 4], ["gecici internet", 4], ["mobil internet", 3], ["box", 3], ["sim kart", 2]],
  family: [["annem", 3], ["babam", 3], ["anne", 2], ["baba", 2], ["aile", 3], ["yetki", 3], ["ebeveyn", 3], ["yakinim", 3]],
  subscription: [["iptal", 4], ["dondur", 4], ["aboneligi kapat", 4]],
  upgrade: [["paket", 2], ["yukselt", 4], ["1000", 3], ["fiber", 3], ["daha hizli", 3], ["gigabit", 3]],
};

/** Order breaks ties: the more specific / more urgent topic wins. */
const PRIORITY: (keyof typeof RULES)[] = ["human", "video", "privacy", "refund", "payment", "relocation", "billing", "hybrid", "speed", "outage", "wifi", "modem", "family", "subscription", "upgrade", "hallet", "internet"];

const STATUS: Rule[] = [["ne durumda", 4], ["durumu", 3], ["durum", 2], ["ne oldu", 3], ["nerede", 3], ["ne asamada", 4], ["takip", 3], ["ne zaman", 2], ["sonuclandi", 3], ["ilerliyor mu", 3], ["basvurum", 2], ["talebim", 2], ["islemim", 3], ["islemlerim", 3], ["kaydim", 2], ["devam eden", 3], ["kaldigim", 3], ["ogren", 1]];
const YES = ["evet", "olur", "tamam", "baslat", "hadi", "baslayalim", "isterim", "lutfen", "devam et", "ok", "tabii", "tabi", "peki"];
const NO = ["hayir", "istemiyorum", "gerek yok", "vazgec", "sonra", "simdi degil"];
const GREETING = ["merhaba", "selam", "gunaydin", "iyi aksamlar", "iyi gunler", "hey", "slm", "mrb"];
const THANKS = ["tesekkur", "sagol", "eyvallah", "cok iyi", "harika", "super"];

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
    {
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Swapped neighbours ("fatrua") count as one typo.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + 1);
    }
  return dp[a.length]![b.length]!;
}

/** A stem matches a word that starts with it, or (stems of 6+ letters) one typo away. Shorter stems stay exact to avoid "model"→"modem" style mix-ups. */
function tokenMatches(token: string, stem: string): boolean {
  if (token.startsWith(stem)) return true;
  if (stem.length < 6 || token.length < stem.length - 1) return false;
  for (let len = stem.length - 1; len <= stem.length + 1; len++) {
    if (editDistance(token.slice(0, len), stem) <= 1) return true;
  }
  return false;
}

function matches(text: string, tokens: string[], stem: string): boolean {
  if (stem.includes(" ")) return text.includes(stem);
  if (stem.length <= 3) return tokens.includes(stem);
  return tokens.some((t) => tokenMatches(t, stem));
}

function score(text: string, tokens: string[], rules: Rule[]): number {
  return rules.reduce((sum, [stem, w]) => (matches(text, tokens, stem) ? sum + w : sum), 0);
}

const onlyWords = (tokens: string[], list: string[]) => tokens.length > 0 && tokens.length <= 4 && tokens.every((t) => list.some((w) => w.split(" ").includes(t) || t.startsWith(w)));

export interface Understanding {
  /** Best topic, or null when nothing matched. */
  topic: GigaTopic | null;
  /** Second topic with a meaningful score (e.g. "taşınıyorum, faturam da yüksek"). */
  also: GigaTopic | null;
  /** The customer asks about an existing process rather than starting one. */
  isStatus: boolean;
  /** GIGA Teknik problem type already known from the sentence (so it is not asked again). */
  ustaIssue: UstaIssueId | null;
  confidence: "high" | "low" | "none";
  scores: Partial<Record<GigaTopic, number>>;
}

export function understand(input: string): Understanding {
  const text = normalize(input);
  const tokens = text.split(" ").filter(Boolean);
  const none: Understanding = { topic: null, also: null, isStatus: false, ustaIssue: null, confidence: "none", scores: {} };
  if (!tokens.length) return none;

  const statusScore = score(text, tokens, STATUS);
  const scores: Partial<Record<GigaTopic, number>> = {};
  for (const t of PRIORITY) {
    const s = score(text, tokens, RULES[t]);
    if (s > 0) scores[t] = s;
  }
  // "İnternet" alone is weak; a specific problem word beats the generic topic.
  const ranked = PRIORITY.filter((t) => scores[t]).sort((a, b) => scores[b]! - scores[a]! || PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
  const top = ranked[0] ?? null;

  if (!top || (top === "internet" && scores.internet! < 2 && statusScore >= 2)) {
    if (statusScore >= 2) return { ...none, topic: "track", isStatus: true, confidence: "high", scores };
    if (onlyWords(tokens, YES)) return { ...none, topic: "yes", confidence: "high" };
    if (onlyWords(tokens, NO)) return { ...none, topic: "no", confidence: "high" };
    if (tokens.some((t) => GREETING.some((g) => t.startsWith(g))) && tokens.length <= 4) return { ...none, topic: "greeting", confidence: "high" };
    if (tokens.some((t) => THANKS.some((g) => t.startsWith(g)))) return { ...none, topic: "thanks", confidence: "high" };
    if (!top) return none;
  }

  const second = ranked.find((t) => t !== top && t !== "internet" && scores[t]! >= 3 && !(top === "outage" && t === "modem") && !(top === "modem" && t === "outage")) ?? null;
  const isStatus = statusScore >= 2 && !["human", "video", "privacy", "payment"].includes(top);

  let ustaIssue: UstaIssueId | null = null;
  if (top === "outage" || top === "modem" || top === "wifi" || top === "internet") {
    if (scores.wifi) ustaIssue = "wifi";
    else if (["kopuyor", "koptu", "gidip geliyor"].some((s) => matches(text, tokens, s))) ustaIssue = "drops";
    else if (scores.outage) ustaIssue = "no_connect";
  }

  return {
    topic: top,
    also: second,
    isStatus,
    ustaIssue,
    confidence: scores[top]! >= 3 ? "high" : "low",
    scores,
  };
}
