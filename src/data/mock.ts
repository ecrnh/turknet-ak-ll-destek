/**
 * All mock data for the Turknet prototype. No backend; stores seed from here.
 */

export const USER = {
  firstName: "Çağrı",
  name: "ECREN KOYUNCU",
  initials: "EK",
  subscriberNo: "4896005",
  location: "İstanbul/Ümraniye",
  phone: "0532 418 22 17",
  packageName: "Fiber 100 Mbps Limitsiz",
  packageSpeed: 100,
  modemSerial: "MOD-7F3A21",
  modemModel: "Turknet ZTE F6640 GPON",
};

export const MANAGED_ACCOUNTS = [
  {
    id: "ayse",
    name: "Ayşe Koyuncu",
    short: "Ayşe K.",
    honorific: "Ayşe Hanım",
    relation: "Anne",
    initials: "AK",
    subscriberNo: "3720118",
    location: "İstanbul/Kadıköy",
    phone: "0533 761 40 09",
    packageName: "Fiber 50 Mbps Limitsiz",
    scopes: { view: true, ticket: true, video: true, appointment: true, bills: true, plan: true, payment: false, cancel: false },
    grantedAt: new Date("2026-09-14T10:20:00+03:00").getTime(),
  },
];

export type ScopeKey = "view" | "ticket" | "video" | "appointment" | "bills" | "plan" | "payment" | "cancel";
export type ScopeGroup = "view" | "tech" | "appointment" | "finance";

/** Family permissions. Finance items marked `ownerApproval` still need the owner's approval every time. */
export const SCOPES: { key: ScopeKey; group: ScopeGroup; label: string; desc: string; default: boolean; ownerApproval?: boolean }[] = [
  { key: "view", group: "view", label: "İşlemleri görüntüleme", desc: "Mevcut abonelik, aktif talepler, randevu detayları ve süreç takibi", default: true },
  { key: "ticket", group: "tech", label: "Teknik destek ve sorun giderme", desc: "Sorun gidermeyi başlatır, bağlantı durumunu görür, teknik yardım ister", default: true },
  { key: "video", group: "tech", label: "Görüntülü destek başlat", desc: "Uzmanla görüntülü görüşme yapabilir", default: true },
  { key: "appointment", group: "appointment", label: "Randevu yönetimi", desc: "Randevuları görür, uygun saat seçer, değişiklik ister", default: false },
  { key: "bills", group: "finance", label: "Faturaları görüntüle", desc: "Yalnızca açıkça izin verirsen faturaları görür", default: false },
  { key: "payment", group: "finance", label: "Fatura ödeme", desc: "Her ödeme senin ek onayınla yapılır", default: false, ownerApproval: true },
  { key: "plan", group: "finance", label: "Paket değişikliği", desc: "Her değişiklik senin ek onayınla yapılır", default: false, ownerApproval: true },
  { key: "cancel", group: "finance", label: "İptal ve iade talepleri", desc: "Her talep senin ek onayınla yapılır", default: false, ownerApproval: true },
];

export const SCOPE_GROUPS: { id: ScopeGroup; title: string }[] = [
  { id: "view", title: "1. İşlemleri görüntüleme" },
  { id: "tech", title: "2. Teknik destek işlemleri" },
  { id: "appointment", title: "3. Randevu yönetimi" },
  { id: "finance", title: "4. Finansal işlemler" },
];

export const defaultScopes = (): Record<ScopeKey, boolean> => Object.fromEntries(SCOPES.map((s) => [s.key, s.default])) as Record<ScopeKey, boolean>;

export const RELATIONS = ["Anne", "Baba", "Eş", "Çocuk", "Diğer"] as const;

export const HERO_SLIDES = [
  { id: "campaign", kind: "campaign" as const },
  {
    id: "video",
    kind: "feature" as const,
    eyebrow: "YENİ",
    title: "Görüntülü Destek",
    text: "Uzmanımız kameradan modemini görsün, sorunu birlikte çözelim. Ailen de görüşmeye katılsın.",
    cta: "Görüşme Başlat",
    to: "/goruntulu-destek",
    icon: "video",
  },
  {
    id: "qr",
    kind: "feature" as const,
    eyebrow: "YENİ",
    title: "QR ile Temassız Destek",
    text: "Modemindeki QR'ı okut, arızanı form doldurmadan bildir.",
    cta: "QR'ı Tara",
    to: "/qr/tara",
    icon: "qr",
  },
  {
    id: "hybrid",
    kind: "feature" as const,
    eyebrow: "ÜCRETSİZ · ABONELİĞİNE DAHİL",
    title: "Kesintide Bağlı Kal: Hibrit İnternet",
    text: "Kesinti 24 saati aşarsa yedek bağlantını uygulamadan ücretsiz etkinleştir.",
    cta: "Nasıl Çalışır?",
    to: "/hibrit",
    icon: "router",
  },
  {
    id: "agents",
    kind: "feature" as const,
    eyebrow: "GIGA",
    title: "Sorun mu Var? Birlikte Çözelim",
    text: "Bağlantınla ilgili bir sorun yaşarsan GIGA ile birkaç basit kontrolle çoğu sorunu dakikalar içinde çözebilirsin.",
    cta: "GIGA ile Tanış",
    to: "/ajanlar",
    icon: "bot",
  },
  {
    id: "fiber",
    kind: "feature" as const,
    eyebrow: "FİBER",
    title: "1.000 Mbps Hız Fiber ile Seninle!",
    text: "Adresinde fiber altyapı var. Tek dokunuşla hızını yükselt.",
    cta: "Hızımı Yükselt",
    to: "/islem/hiz-yukseltme",
    icon: "zap",
  },
  {
    id: "referral",
    kind: "feature" as const,
    eyebrow: "ARKADAŞINI GETİR",
    title: "Birlikte Kazanın",
    text: "Her gelen arkadaşın için ikiniz de 1 ay ücretsiz internet kazanın.",
    cta: "Davet Et",
    to: "/islem/arkadasini-getir",
    icon: "heart",
  },
];

export type OpItem = {
  slug: string;
  title: string;
  icon: string;
  to: string;
  isNew?: boolean;
};

export const SUBSCRIPTION_OPS: OpItem[] = [
  { slug: "hiz-yukseltme", title: "Hız Yükseltme", icon: "speed-up", to: "/islem/hiz-yukseltme" },
  { slug: "fiyat-sabitle", title: "12 Ay Fiyat Sabitle", icon: "price", to: "/islem/fiyat-sabitle" },
  { slug: "dondur", title: "Hizmeti Dondur", icon: "freeze", to: "/islem/dondur" },
  { slug: "tasi", title: "İnternetini Taşı", icon: "move", to: "/tasinma", isNew: true },
  { slug: "iptal", title: "Aboneliğini İptal Et", icon: "cancel", to: "/islem/iptal" },
];

export const INTERNET_OPS: OpItem[] = [
  { slug: "hiz-testi", title: "Hız Testi", icon: "gauge", to: "/hiz-testi" },
  { slug: "kullanim", title: "Kullanımını Gör", icon: "chart", to: "/islem/kullanim" },
  { slug: "ping", title: "Ping Testi", icon: "ping", to: "/islem/ping" },
];

export const SUPPORT_OPS: OpItem[] = [
  { slug: "takip", title: "Benim İçin Takip Et", icon: "track", to: "/takip", isNew: true },
  { slug: "ai-usta", title: "GIGA Teknik", icon: "usta", to: "/ai-usta", isNew: true },
  { slug: "fatura-kalkani", title: "Fatura Kalkanı", icon: "shield", to: "/fatura-kalkani", isNew: true },
  { slug: "baglanti", title: "Bağlantım", icon: "network", to: "/baglanti", isNew: true },
  { slug: "video", title: "Görüntülü Destek", icon: "video", to: "/goruntulu-destek", isNew: true },
  { slug: "qr", title: "QR ile Destek", icon: "qr", to: "/qr", isNew: true },
  { slug: "hibrit", title: "Hibrit İnternet", icon: "router", to: "/hibrit", isNew: true },
];

export const OPS_LIST = [
  { title: "Yardım & Destek", to: "/yardim" },
  { title: "Modem Şifre Bilgisi", to: "/islem/modem-sifre" },
  { title: "Statik IP", to: "/islem/statik-ip" },
  { title: "Teknik Bilgiler", to: "/islem/teknik-bilgiler" },
  { title: "Paket ve Ürün Bilgileri", to: "/islem/paket-bilgileri" },
  { title: "Güvenli İnternet", to: "/islem/guvenli-internet" },
];

export const GENERIC_OPS: Record<string, { title: string; desc: string; cta?: string; facts?: [string, string][] }> = {
  "hiz-yukseltme": {
    title: "Hız Yükseltme",
    desc: "Adresinde 1.000 Mbps'e kadar fiber altyapı mevcut. Mevcut paketin: Fiber 100 Mbps.",
    cta: "1.000 Mbps'e Yükselt",
    facts: [["Mevcut hız", "100 Mbps"], ["Maksimum altyapı", "1.000 Mbps"], ["Fark", "+₺150/ay"]],
  },
  "fiyat-sabitle": {
    title: "12 Ay Fiyat Sabitle",
    desc: "12 aylık peşin ödeyerek yılda ₺2.400 tasarruf et, fiyatın 12 ay boyunca sabit kalsın.",
    cta: "Peşin Öde ve Sabitle",
    facts: [["Aylık", "₺749,90"], ["Tasarruf", "₺2.400"], ["Taksit", "Vade farksız 3"]],
  },
  dondur: { title: "Hizmeti Dondur", desc: "Hizmetini 1-3 ay arası dondurabilirsin. Dondurma süresince ücret alınmaz.", cta: "Dondurma Talebi Oluştur" },
  tasi: { title: "İnternetini Taşı", desc: "Yeni adresini gir, altyapı kontrolünü hemen yapalım.", cta: "Adres Kontrolü Yap" },
  iptal: { title: "Aboneliğini İptal Et", desc: "Gitmeden önce: 12 ay peşin ödemede kalan aylar iade edilir. İptal talebi için kimlik doğrulaması gerekir.", cta: "İptal Talebi Başlat" },
  kullanim: { title: "Kullanımını Gör", desc: "Bu ay toplam 412 GB kullandın. Limitsiz paketindesin.", facts: [["İndirme", "387 GB"], ["Yükleme", "25 GB"], ["Günlük ort.", "19,6 GB"]] },
  ping: { title: "Ping Testi", desc: "Gecikme değerin oyun ve görüntülü görüşme için ideal seviyede.", facts: [["Ping", "8 ms"], ["Jitter", "1 ms"], ["Paket kaybı", "%0"]] },
  "modem-sifre": { title: "Modem Şifre Bilgisi", desc: "Modem arayüz şifren güvenlik nedeniyle SMS ile gönderilir.", cta: "SMS ile Gönder" },
  "statik-ip": { title: "Statik IP", desc: "Sabit IP adresi ile uzaktan erişim ve sunucu hizmetleri kullanabilirsin.", cta: "Statik IP Talep Et", facts: [["Aylık", "₺49,90"]] },
  "teknik-bilgiler": { title: "Teknik Bilgiler", desc: "Hattının teknik değerleri.", facts: [["Altyapı", "GPON Fiber"], ["Santral", "Ümraniye-Çakmak"], ["Modem", "ZTE F6640"], ["Seri No", "MOD-7F3A21"]] },
  "paket-bilgileri": { title: "Paket ve Ürün Bilgileri", desc: "Fiber 100 Mbps Limitsiz — taahhütsüz.", facts: [["Paket", "Fiber 100 Mbps"], ["Aylık", "₺949,90"], ["Başlangıç", "3 Mar 2023"]] },
  "guvenli-internet": { title: "Güvenli İnternet", desc: "BTK Güvenli İnternet profili seçebilirsin: Standart, Aile, Çocuk.", cta: "Profil Seç" },
  "arkadasini-getir": { title: "Arkadaşını Getir", desc: "Davet linkini paylaş; arkadaşın Turknet'li olunca ikiniz de 1 ay ücretsiz internet kazanın.", cta: "Davet Linkini Paylaş", facts: [["Sayende gelenler", "1"], ["Kazanılan", "1 ay"]] },
  "yeni-abonelik": { title: "Yeni Abonelik", desc: "Yeni bir adres için abonelik başlat.", cta: "Başvuru Başlat" },
  "sifre-degistir": { title: "Şifre Değiştir", desc: "Hesap şifreni değiştir. Yeni şifre en az 8 karakter olmalı.", cta: "Şifreyi Güncelle" },
  belgelerim: { title: "Belgelerim", desc: "Sözleşme ve abonelik belgelerin.", facts: [["Abonelik sözleşmesi", "PDF"], ["KVKK aydınlatma metni", "PDF"], ["Aile yetki belgeleri", "PDF"]] },
  "deneyim-programi": { title: "Deneyim Programı", desc: "Yeni özellikleri herkesten önce dene, görüşlerinle Turknet'i birlikte geliştirelim.", cta: "Programa Katıl" },
  "bizi-degerlendirin": { title: "Bizi Değerlendirin", desc: "Uygulamamızı mağazada puanlayarak destek olabilirsin.", cta: "Mağazada Puanla" },
  "otomatik-odeme": { title: "Otomatik Ödeme Talimatı Ver", desc: "Kartını kaydet, faturaların son ödeme gününde otomatik ödensin.", cta: "Kart Ekle" },
  "fatura-tercih": { title: "Fatura Tercihlerimi Düzenle", desc: "E-fatura ve SMS bildirim tercihlerin.", facts: [["E-posta", "cagri.k***@gmail.com"], ["SMS", "Açık"]] },
  "fatura-adres": { title: "Fatura Gönderim Adresini Düzenle", desc: "Faturalarının gönderileceği adres.", facts: [["Adres", "Çakmak Mah. Ümraniye/İstanbul"]] },
};

export const HELP_CATEGORIES = [
  { title: "İnternet Bağlantı Sorunları", icon: "router", prompt: "İnternetim çalışmıyor" },
  { title: "Fatura ve Ödeme İşlemleri", icon: "receipt", prompt: "Faturamı nasıl öderim?" },
  { title: "Hizmet & Ürünler", icon: "hand", prompt: "Hangi paketler var?" },
  { title: "İptal İşlemleri", icon: "target", prompt: "Aboneliğimi iptal etmek istiyorum" },
  { title: "Bilgi", icon: "info", prompt: "Modem ışıkları ne anlama geliyor?" },
];

export const CHAT_TOPICS = [
  {
    title: "İNTERNET SORUNLARI",
    items: ["İnternetim çalışmıyor", "Hızım düşük", "Modem ışığı kırmızı yanıyor", "Wi-Fi sinyali zayıf", "Kesinti var mı?"],
  },
  {
    title: "FATURA İŞLEMLERİ",
    items: ["Faturamı nasıl öderim?", "Otomatik ödeme talimatı", "Faturam neden yüksek geldi?", "Geçmiş faturalarım"],
  },
  {
    title: "ABONELİK İŞLEMLERİ",
    items: ["Hızımı yükseltmek istiyorum", "Hizmeti dondurma", "Nakil işlemi", "Annemin hesabını yönetmek istiyorum"],
  },
];

export const POPULAR_QUESTIONS = ["Hızım düşük", "İnternetim çalışmıyor", "Kesinti var mı?", "Faturamı nasıl öderim?", "Modem ışıkları"];

export const POPULAR_SEARCHES = [
  "İnternet Bağlantı Sorunları",
  "Faturalarım",
  "Tüm Destek Kayıtları",
  "Hizmet İptal",
  "Hizmet Dondurma",
  "Statik IP",
  "Peşin Ödeme Kampanyası",
  "Arkadaşını Getir Birlikte Kazanın",
  "İnternetini Yeni Adresine Taşı",
  "Yardım & Destek",
];

export const SEARCH_INDEX: { title: string; to: string; keywords: string; isNew?: boolean; section: string }[] = [
  { title: "İnternet Bağlantı Sorunları", to: "/yardim", keywords: "internet bağlantı sorun arıza çalışmıyor", section: "Yardım" },
  { title: "Faturalarım", to: "/faturalar", keywords: "fatura ödeme borç", section: "Fatura" },
  { title: "Geçmiş Faturalarım", to: "/faturalar/gecmis", keywords: "fatura geçmiş pdf", section: "Fatura" },
  { title: "Tüm Destek Kayıtları", to: "/destek-kayitlari", keywords: "destek kayıt talep ticket", section: "Destek" },
  { title: "Hizmet İptal", to: "/islem/iptal", keywords: "iptal abonelik", section: "Abonelik" },
  { title: "Hizmet Dondurma", to: "/islem/dondur", keywords: "dondur", section: "Abonelik" },
  { title: "Statik IP", to: "/islem/statik-ip", keywords: "statik ip", section: "İnternet" },
  { title: "Peşin Ödeme Kampanyası", to: "/islem/fiyat-sabitle", keywords: "peşin kampanya sabit fiyat 12 ay", section: "Kampanya" },
  { title: "Arkadaşını Getir Birlikte Kazanın", to: "/islem/arkadasini-getir", keywords: "arkadaş davet referans", section: "Kampanya" },
  { title: "Taşınma ve Nakil · İnternetini Yeni Adresine Taşı", to: "/tasinma", keywords: "giga taşı taşınma nakil adres", isNew: true, section: "Yeni" },
  { title: "İşlemlerim · Benim İçin Takip Et", to: "/takip", keywords: "giga takip süreç talep durum otonom", isNew: true, section: "Yeni" },
  { title: "GIGA Teknik", to: "/ai-usta", keywords: "giga teknik ai usta yapay zeka modem ışık çalışmıyor görsel fotoğraf", isNew: true, section: "Yeni" },
  { title: "Fatura Kalkanı", to: "/fatura-kalkani", keywords: "giga fatura borç ödeme mükerrer iade kalkan", isNew: true, section: "Yeni" },
  { title: "Hibrit İnternet · ücretsiz yedek bağlantı", to: "/hibrit", keywords: "hibrit yedek bağlantı kesinti 24 saat ücretsiz internet yok", isNew: true, section: "Yeni" },
  { title: "Bağlantım", to: "/baglanti", keywords: "bağlantı durum sağlık geçici mobil internet box", isNew: true, section: "Yeni" },
  { title: "Yardım & Destek", to: "/yardim", keywords: "yardım destek", section: "Yardım" },
  { title: "Hız Testi", to: "/hiz-testi", keywords: "hız test speed", section: "İnternet" },
  { title: "Hız Yükseltme", to: "/islem/hiz-yukseltme", keywords: "hız yükselt paket fiber 1000", section: "Abonelik" },
  { title: "Dijital Onarım", to: "/dijital-onarim", keywords: "dijital onarım arıza tamir", section: "Yardım" },
  { title: "Görüntülü Destek", to: "/goruntulu-destek", keywords: "görüntülü video kamera uzman modem kablo", isNew: true, section: "Yeni" },
  { title: "Aile Yetkilendirme", to: "/aile", keywords: "aile yetki anne baba ebeveyn yetkili kişi", isNew: true, section: "Yeni" },
  { title: "QR ile Destek Talebi", to: "/qr", keywords: "qr kod temassız etiket tara", isNew: true, section: "Yeni" },
  { title: "QR Tara", to: "/qr/tara", keywords: "qr tara okut", isNew: true, section: "Yeni" },
  { title: "GIGA · akıllı dijital yardımcın", to: "/ajanlar", keywords: "giga ai yapay zeka ajan asistan otomatik yardımcı", isNew: true, section: "Yeni" },
  { title: "Hız Koruyucu", to: "/ajanlar/hiz", keywords: "giga hız düşük yavaş ajan", isNew: true, section: "Yeni" },
  { title: "Bildirimler", to: "/bildirimler", keywords: "bildirim", section: "Hesap" },
  { title: "Tercihlerim / Büyük Yazı", to: "/tercihler", keywords: "tercih büyük yazı basit mod erişilebilirlik", section: "Hesap" },
  { title: "İşlem Geçmişi", to: "/islem-gecmisi", keywords: "işlem geçmiş", section: "Hesap" },
  { title: "Etki Panosu", to: "/dashboard", keywords: "dashboard kpi etki pano", section: "Sunum" },
];

export const LED_GUIDE = [
  { key: "power", name: "Power", states: [["Yeşil sabit", "Modem açık, normal"], ["Kapalı", "Elektrik yok, adaptörü kontrol et"]] },
  { key: "fiber", name: "DSL / Fiber (PON)", states: [["Yeşil sabit", "Hat bağlı"], ["Yanıp sönüyor", "Hat senkronize oluyor"], ["Kırmızı (LOS)", "Fiber kablo takılı değil / sinyal yok"]] },
  { key: "internet", name: "Internet", states: [["Yeşil sabit", "İnternete bağlı"], ["Kapalı", "Oturum açılamadı"]] },
  { key: "wifi", name: "Wi-Fi", states: [["Yeşil yanıp sönüyor", "Veri aktarımı var"], ["Kapalı", "Wi-Fi kapalı, düğmeyi kontrol et"]] },
] as const;

export const VIDEO_TOPICS = [
  { id: "lights", label: "Modem ışıkları", icon: "lightbulb" },
  { id: "cable", label: "Kablo / bağlantı", icon: "cable" },
  { id: "wifi", label: "Wi-Fi sinyali", icon: "wifi" },
  { id: "setup", label: "Kurulum", icon: "wrench" },
  { id: "other", label: "Diğer", icon: "more" },
] as const;

export const CALL_CHECKLIST = [
  "Fiber kablo takılı mı?",
  "Adaptör prizde mi?",
  "Modemi yeniden başlat",
  "Kablo uçlarını kontrol et",
];

export const QR_CHECKS = [
  { key: "line", label: "Hat durumu" },
  { key: "signal", label: "Sinyal gücü" },
  { key: "optic", label: "Optik güç seviyesi" },
  { key: "dns", label: "DNS / ağ geçidi" },
  { key: "wifi", label: "Wi-Fi kanal yoğunluğu" },
  { key: "drops", label: "Son 24 saat kopma geçmişi" },
] as const;

export const INVOICES = [
  { id: "INV-2026-09", period: "Eylül 2026", amount: 749.9, status: "Ödendi", date: "2026-09-05" },
  { id: "INV-2026-08", period: "Ağustos 2026", amount: 749.9, status: "Ödendi", date: "2026-08-05" },
  { id: "INV-2026-07", period: "Temmuz 2026", amount: 749.9, status: "Ödendi", date: "2026-07-05" },
  { id: "INV-2026-06", period: "Haziran 2026", amount: 949.9, status: "Ödendi", date: "2026-06-05" },
  { id: "INV-2026-05", period: "Mayıs 2026", amount: 949.9, status: "Ödendi", date: "2026-05-05" },
];

export const MISSING_OPS = [
  "Modem değişimi talebi",
  "Taahhüt bilgisi görme",
  "Fatura itirazı",
  "Adres değişikliği",
  "Kurulum randevusu değiştirme",
  "Diğer",
];

/* Case baseline data (Ağustos → Eylül) */
export const CASE_BASELINE = {
  mobileUsers: { ios: 310_000, android: 108_000, online: 111_000 },
  months: [
    { month: "Ağustos", total: 390_411, technical: 199_079, fromAssistant: 114_497, toLiveChat: 66_088, digitalRepair: 155_219 },
    { month: "Eylül", total: 381_071, technical: 203_374, fromAssistant: 102_364, toLiveChat: 55_750, digitalRepair: 237_394 },
  ],
};

export const AGENT_DEFS = [
  { id: "speed", name: "Hız Koruyucu", desc: "Hızında belirgin bir düşüş olursa izin verdiğin güvenli uzaktan düzeltmeleri dener.", icon: "gauge", to: "/ajanlar/hiz" },
  { id: "backup", name: "Kesinti Takibi", desc: "Kesintinin güncel durumunu gösterir; 24 saati aşarsa ücretsiz Hibrit İnternet'i hatırlatır.", icon: "route", to: "/hibrit" },
  { id: "modem", name: "Modem Sağlık Kontrolü", desc: "Modem ve bağlantı durumuyla ilgili teknik kontrolleri yapar; bir sorun görünürse haber verir.", icon: "router", to: "/ajanlar/kontroller" },
  { id: "bill", name: "Fatura Hatırlatıcı", desc: "Son ödeme gününü hatırlatır, olağan dışı tutarları açıklar.", icon: "receipt", to: "/fatura-kalkani" },
] as const;

export type AgentId = (typeof AGENT_DEFS)[number]["id"];

export const SPEED_FIX_STEPS = [
  "Hız düşüşü tespit edildi: 100 Mbps paketinde 20 Mbps ölçüldü",
  "Kök neden analizi: Wi-Fi kanal 6 %87 yoğun · hat sinyali normal · bölge yoğunluğu düşük",
  "Wi-Fi kanalı 6 → 11 olarak değiştirildi (5 GHz bandı açıldı)",
  "Hat profili yenilendi (GPON Fiber-100)",
  "Modem uzaktan yeniden başlatıldı",
  "Doğrulama ölçümü tamamlandı: 98 Mbps",
];


/* ======================================================================
 * Otonom Müşteri Deneyimi Platformu — DEMO verileri.
 * Bunların hiçbiri gerçek TurkNet, operatör, CRM, fatura veya ağ sistemi
 * yanıtı değildir. Mock servisler (src/features/workflow/mockServices.ts)
 * yalnızca bu verileri döndürür.
 * ==================================================================== */

export const CUSTOMER = { id: "CUST-4896005", name: USER.name, firstName: USER.firstName, phone: USER.phone };

export const SUBSCRIPTION = {
  id: "SUB-4896005",
  customerId: "CUST-4896005",
  packageName: USER.packageName,
  speed: USER.packageSpeed,
  commitmentEnd: "30 Haz 2027",
  modem: USER.modemModel,
  hybridReady: true,
  debt: 0,
};

export interface DemoAddress {
  id: string;
  line: string;
  district: string;
  city: string;
}

export const CURRENT_ADDRESS: DemoAddress & { port: string } = {
  id: "ADR-0001",
  line: "Atatürk Mah. Çakmak Cd. No:12 D:5",
  district: "Ümraniye",
  city: "İstanbul",
  port: "Ümraniye-Çakmak OLT · Port 3/14",
};

export const DEMO_NEW_ADDRESS: DemoAddress = {
  id: "ADR-0002",
  line: "Caferağa Mah. Moda Cd. No:48 D:3",
  district: "Kadıköy",
  city: "İstanbul",
};

export const DEMO_NEW_ADDRESS_PARTS = { city: "İstanbul", district: "Kadıköy", neighborhood: "Caferağa Mah.", street: "Moda Cd.", building: "No:48 D:3" };

export const DEMO_MOVE_DATE = "2026-11-10";

export const APPOINTMENT_SLOTS = [
  { id: "slot-1", label: "3 Kas Salı · 16:00–18:00" },
  { id: "slot-2", label: "4 Kas Çarşamba · 09:00–12:00" },
  { id: "slot-3", label: "4 Kas Çarşamba · 13:00–17:00" },
  { id: "slot-4", label: "5 Kas Perşembe · 18:00–20:00" },
];

/** Demo field teams for appointment matching (no real technician system). */
export const FIELD_TEAMS = [
  { id: "T-KDK-07", name: "Kadıköy Saha Ekibi 7" },
  { id: "T-KDK-12", name: "Kadıköy Saha Ekibi 12" },
  { id: "T-USK-03", name: "Üsküdar Saha Ekibi 3" },
] as const;

export const TEAMS = {
  infra: "Altyapı Planlama Ekibi",
  relocation: "Nakil Operasyon Ekibi",
  field: "Saha Teknik Ekibi",
  finance: "Finans · Tahsilat Mutabakat Ekibi",
  tech: "Canlı Teknik Destek (2. seviye)",
  logistics: "Lojistik · Cihaz Gönderim",
} as const;

export const TEMP_MOBILE_OFFER = {
  title: "TürkNet Box · geçici internet",
  device: "SIM kartlı TürkNet Box (4.5G, iade edilir)",
  price: "Örnek ücret: ₺199/ay (demo)",
  quota: "100 GB / ay",
  coverage: "Kadıköy Moda: 4.5G sinyal iyi (demo kapsama verisi)",
  delivery: "Kurye ile 1 iş günü (tahmini, demo)",
  terms: [
    "Sabit internetiniz hazır olana kadar geçerlidir; kurulumda otomatik sona erer.",
    "Cihaz 15 gün içinde iade edilmezse cihaz bedeli faturaya yansır (demo koşul).",
    "Siz onay vermeden sipariş verilmez, ücret yansımaz.",
    "Varsayımsal ürün konsepti: mobil operatör iş ortaklığı varsayılmıştır (demo).",
  ],
};

export const BILLING_SEED = {
  bill: { id: "INV-2026-10", period: "Ekim 2026", amount: 749.9, due: "28 Eki 2026" },
  payment: { id: "PAY-88213", amount: 749.9, at: "27 Eki 2026 21:14", channel: "Kredi kartı (**** 4417)", ref: "BNK-5521907" },
  duplicate: { id: "PAY-88214", amount: 749.9, at: "27 Eki 2026 21:16", channel: "Otomatik ödeme talimatı", ref: "BNK-5521931" },
};

/** Masked saved card for the auto-payment demo; full card numbers are never stored. */
export const SAVED_CARD = "Kayıtlı kart •••• 4417";

/** Active discounts shown on the invoice card (demo). */
export const BILL_DISCOUNTS = ["12 ay sabit fiyat", "Fiber kampanya indirimi −₺200,00", "Online fatura indirimi"];

export const BILLING_CHECKS = [
  { code: "paid_but_debt", label: "Ödeme yapılmasına rağmen borç görünmesi" },
  { code: "duplicate_payment", label: "Mükerrer ödeme veya fatura kaydı" },
  { code: "after_cancel", label: "İptal sonrası oluşan ücretler" },
  { code: "freeze_dates", label: "Dondurma / yeniden başlatma tarihleri" },
  { code: "campaign", label: "Kampanya ve indirim tutarı" },
  { code: "prepaid", label: "Ön ödemeli dönem ile aylık fatura" },
  { code: "equipment", label: "Cihaz / ekipman bedeli" },
  { code: "app_vs_detail", label: "Uygulama tutarı ile fatura detayı" },
] as const;

export const AI_USTA_STEPS = [
  {
    id: "power",
    title: "Modeminin güç kablosunun takılı olduğundan emin ol",
    text: "Güç kablosu hem modemde hem prizde yerine oturmuş olsun. Fiber (WAN) kablosu da modemin altında takılı görünmeli.",
    safe: "Güvenli adım: kabloyu bükme, reset tuşuna basma.",
    cta: "Kontrol ettim",
  },
  {
    id: "reboot",
    title: "Şimdi modemini kapatıp 20 saniye bekleyelim",
    text: "Modemin arkasındaki güç düğmesiyle kapat, 20 saniye bekle ve tekrar aç.",
    safe: "Güvenli adım: ayarların silinmez.",
    cta: "Tamam, açtım",
  },
];

/** Replaces step 1 when the customer said the cables are not (or may not be) connected. */
export const AI_USTA_CABLE_STEP = {
  id: "cable",
  title: "Modeminin kablo bağlantılarını kontrol edelim",
  text: "Modemin arkasındaki fiber kablo yuvasına tam oturmalı, güç kablosu da hem modemde hem prizde takılı olmalı. Gevşek görünen kabloyu çıkarıp yerine sıkıca tak.",
  safe: "Güvenli adım: fiber kabloyu bükme, ucuna dokunma, reset tuşuna basma.",
  cta: "Kabloları kontrol ettim",
};

/** "İnternetim çalışmıyor" → what exactly? Kept for the whole session. `finding`/`fix` are the simulated detected issue and remote action. */
export const USTA_ISSUES = [
  { id: "no_connect", label: "İnternete hiç bağlanamıyorum.", issue: "İnternete hiç bağlanamıyor", check: "session", finding: "İnternet oturumun kapanmış görünüyor; modemin hatta bağlı ama internete çıkamıyor.", fix: "İnternet oturumunu uzaktan yeniliyorum", fixed: "İnternet oturumunu uzaktan yeniledim" },
  { id: "slow", label: "İnternetim yavaş.", issue: "İnternet yavaş", check: "line", finding: "Hattında paketine göre belirgin bir hız düşüşü görünüyor.", fix: "Hat ayarlarını uzaktan yeniliyorum", fixed: "Hat ayarlarını uzaktan yeniledim" },
  { id: "drops", label: "Bağlantım sürekli kopuyor.", issue: "Bağlantı sürekli kopuyor", check: "line", finding: "Son saatlerde bağlantında sık kopma görünüyor.", fix: "Hattını uzaktan yeniden eşitliyorum", fixed: "Hattını uzaktan yeniden eşitledim" },
  { id: "wifi", label: "Wi-Fi ağıma bağlanamıyorum.", issue: "Wi-Fi ağına bağlanamıyor", check: "diag", finding: "Wi-Fi kanalın çevredeki ağlar nedeniyle çok yoğun görünüyor.", fix: "Wi-Fi'ını daha az yoğun bir kanala alıyorum", fixed: "Wi-Fi'ını daha az yoğun bir kanala aldım" },
] as const;
export type UstaIssueId = (typeof USTA_ISSUES)[number]["id"];

/** Digital repair checks, in the order the customer sees them. All results are simulated. */
export const REPAIR_CHECKS = [
  { id: "modem", label: "Modem bağlantı durumu", running: "Modeminin hatta bağlı olup olmadığına bakıyorum…", ok: "Modemin hatta bağlı görünüyor" },
  { id: "session", label: "İnternet oturumu", running: "İnternet oturumunu kontrol ediyorum…", ok: "İnternet oturumun açık görünüyor" },
  { id: "line", label: "Hat ve altyapı durumu", running: "Hattını ve altyapını kontrol ediyorum…", ok: "Hattında bir sorun görünmüyor" },
  { id: "regional", label: "Bölgesel arıza bilgisi", running: "Bölgende bilinen bir arıza var mı bakıyorum…", ok: "Bölgende bilinen bir arıza yok" },
  { id: "diag", label: "Bağlantı teşhisleri", running: "Bağlantı teşhislerini çalıştırıyorum…", ok: "Teşhislerde sorun bulunmadı" },
] as const;

export const CABLE_STATES = [
  { id: "ok", label: "Takılı", say: "Kablolar takılı" },
  { id: "unsure", label: "Emin değilim", say: "Kablolardan emin değil" },
  { id: "loose", label: "Takılı değil / gevşek", say: "Kablo takılı değil veya gevşek" },
] as const;
export type CableState = (typeof CABLE_STATES)[number]["id"];


/** Modem light picker for the simulated camera. `internet` is the light GIGA Teknik reads. */
export const MODEM_LIGHTS = [
  { key: "power", name: "Power" },
  { key: "wan", name: "WAN / PON" },
  { key: "internet", name: "Internet" },
  { key: "wifi", name: "Wi-Fi" },
] as const;

export const INTERNET_LIGHT_STATES = [
  { id: "red", label: "Kırmızı", ok: false, say: "İnternet ışığı kırmızı; modem internete çıkamıyor. Kablolarla başlayıp adım adım ilerleyelim." },
  { id: "off", label: "Kapalı", ok: false, say: "İnternet ışığı yanmıyor görünüyor. Kablolarla başlayıp adım adım ilerleyelim." },
  { id: "blink", label: "Yanıp sönüyor", ok: false, say: "İnternet ışığı yanıp sönüyor; modem bağlanmaya çalışıyor olabilir. Birlikte kontrol edelim." },
  { id: "green", label: "Yeşil", ok: true, say: "Işıklar normal görünüyor. Yine de bağlantını adım adım kontrol edelim." },
] as const;

export type InternetLight = (typeof INTERNET_LIGHT_STATES)[number]["id"];

/** Voice menu of the simulated call (GIGA sesli destek). */
export const IVR_MENU = [
  { id: "no_internet", key: "1", label: "İnternetim hiç çalışmıyor", issue: "İnternet hiç çalışmıyor" },
  { id: "slow", key: "2", label: "İnternetim yavaş", issue: "İnternet yavaş" },
  { id: "drops", key: "3", label: "Bağlantım sık sık kopuyor", issue: "Bağlantı sık sık kopuyor" },
  { id: "modem", key: "4", label: "Modemimde sorun var", issue: "Modemde sorun var" },
  { id: "other", key: "5", label: "Diğer işlemler", issue: "Diğer işlemler" },
] as const;

export const INTENT_KEYWORDS: { intent: "billing" | "ai_usta" | "relocation" | "temp_internet" | "speed" | "track"; words: string[] }[] = [
  { intent: "billing", words: ["borç", "ödeme", "ödedim", "fatura", "mükerrer", "iade", "tahsil", "ücret", "tutarsız"] },
  { intent: "relocation", words: ["taşın", "nakil", "yeni adres", "adres değiş", "ev değiş", "taşı"] },
  { intent: "temp_internet", words: ["geçici internet", "mobil internet", "hibrit", "yedek bağlantı", "yedek internet", "box"] },
  { intent: "speed", words: ["yavaş", "hız düş", "hızım", "düşük hız", "hız sorun", "donuyor", "kasıyor"] },
  { intent: "ai_usta", words: ["çalışmıyor", "kesildi", "kesinti", "ışık", "modem", "internet yok", "bağlantı yok", "kopuyor", "bağlanamıyorum", "gitti"] },
  { intent: "track", words: ["takip", "durum", "talebim", "işlemim", "ne oldu", "nerede", "devam eden"] },
];

/* ---------------- GIGA · TürkNet'in akıllı dijital yardımcısı ---------------- */
export const GIGA = {
  name: "GIGA",
  tagline: "TürkNet'in akıllı dijital yardımcısı",
  /** GIGA screen greeting; `{name}` is the customer's (or managed profile's) first name. */
  welcome: ["Merhaba, hoş geldin {name}!", "Bugün senin için ne yapabilirim?"],
  /** Home page GIGA area. */
  homeGreeting: "İnternetinle veya TürkNet işlemlerinle ilgili bir konuda yardıma mı ihtiyacın var?",
  /** Suggestions only, never a required menu: the customer can always write their own sentence. */
  starters: ["İnternetimle ilgili sorun var.", "Faturamı kontrol et.", "Taşınmak istiyorum.", "İşlemimin durumunu öğren."],
  placeholder: "İhtiyacını yaz ya da söyle…",
  /** One assistant, six capabilities; the home page has no shortcuts for these, so the chat is the way in. `prompt` is what tapping the capability says to GIGA. */
  capabilities: [
    { id: "teknik", name: "Bağlantı sorunu", desc: "Bağlantı ve modem sorunlarını birlikte çözelim", icon: "usta", to: "/ai-usta", prompt: "İnternetim çalışmıyor" },
    { id: "fatura", name: "Fatura Kalkanı", desc: "Faturanı açıklarım, farklı görünen tutarları birlikte inceleriz", icon: "shield", to: "/fatura-kalkani", prompt: "Faturamda tutarsızlık var" },
    { id: "tasinma", name: "Taşınma ve Nakil", desc: "Yeni adresini kontrol edip süreci başlatalım", icon: "route", to: "/tasinma", prompt: "Taşınacağım" },
    { id: "takip", name: "İşlemlerim", desc: "Devam eden işlemlerinin güncel durumu", icon: "track", to: "/takip", prompt: "İşlemimin durumunu öğren." },
    { id: "hibrit", name: "Hibrit İnternet", desc: "Kesintide yedek bağlantın ve Box durumu", icon: "router", to: "/hibrit", prompt: "Hibrit İnternet" },
    { id: "hallet", name: "Benim İçin Hallet", desc: "Ne istediğini söyle, süreci birlikte başlatalım", icon: "hand", to: "/hallet", prompt: "Benim için hallet" },
  ],
  /** How an action is labelled so the customer always knows who does what. */
  modes: {
    auto: "Ben yaparım",
    approval: "Onayın gerekir",
    human: "Uzmana bağlanır",
  },
  can: ["Bağlantını ve modem durumunu kontrol etmek", "İzin verdiğin uzaktan düzeltmeleri yapıp tekrar ölçmek", "Faturanı ödeme kayıtlarınla karşılaştırmak", "Taşınma ve randevu aşamalarını takip etmek"],
  needsApproval: ["Fatura incelemesi başlatmak, iade veya borç düzeltmesi", "Nakil başvurusu ve randevu oluşturmak", "Hibrit İnternet ve TürkNet Box'ı etkinleştirmek", "Otomatik ödeme talimatı vermek"],
} as const;
