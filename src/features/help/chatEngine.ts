import type { NetStatus } from "@/features/core/appStore";

export interface ChatAction {
  label: string;
  to?: string;
  run?: "speed-agent" | "digital-repair";
}

export interface BotReply {
  text: string;
  actions?: ChatAction[];
  agent?: "speed";
}

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

/** Scripted assistant. Every answer routes to a self-service flow instead of a live agent. */
export function botReply(input: string, net: { status: NetStatus; speed: number }): BotReply {
  const t = input.toLocaleLowerCase("tr-TR");

  if (has(t, "hız", "yavaş", "düşük")) {
    return {
      text: "Hız Koruyucu Ajan devreye giriyor. Hattını şimdi inceliyorum, adımları canlı olarak burada göreceksin.",
      agent: "speed",
    };
  }
  if (has(t, "kesinti", "çalışmıyor", "internet yok", "bağlantı", "koptu")) {
    if (net.status === "down" || net.status === "mobile") {
      return {
        text:
          net.status === "mobile"
            ? "Ana bağlantınızdaki kesinti sürüyor; şu an Hibrit İnternet yedek bağlantınız üzerinden bağlısınız. Ana bağlantı düzelince otomatik olarak geri döneceğiz."
            : "İnternet bağlantınızda kesinti tespit ettik. Teknik ekibimiz sorunun çözümü için çalışıyor. Kesinti 24 saati aşarsa ücretsiz Hibrit İnternet ile bağlı kalabilirsiniz.",
        actions: [{ label: "Kesinti durumunu gör", to: "/hibrit" }],
      };
    }
    return {
      text: "Bölgende kesinti görünmüyor. Modemini birlikte kontrol edelim: önce Dijital Onarım'ı dene, olmazsa QR ile temassız talep açabilir veya uzmanımızla görüntülü görüşebilirsin.",
      actions: [
        { label: "Dijital Onarımı çalıştır", to: "/dijital-onarim" },
        { label: "QR ile talep aç", to: "/qr/tara" },
        { label: "Görüntülü destek başlat", to: "/goruntulu-destek" },
      ],
    };
  }
  if (has(t, "modem", "ışık", "kablo", "kırmızı", "led")) {
    return {
      text: "Modem ışıklarını görmeden yorum yapmak zor. Uzmanımız kameradan modemini görüp kabloları birlikte kontrol edebilir — saha ekibi beklemene gerek kalmaz.",
      actions: [
        { label: "Görüntülü destek başlat", to: "/goruntulu-destek" },
        { label: "QR ile talep aç", to: "/qr/tara" },
      ],
    };
  }
  if (has(t, "wi-fi", "wifi", "sinyal")) {
    return {
      text: "Wi-Fi sinyalini QR taramasıyla ölçebilirim: kanal yoğunluğu ve sinyal gücü dahil 6 kontrol, 20 saniyede.",
      actions: [
        { label: "QR ile analiz et", to: "/qr/tara" },
        { label: "Görüntülü destek başlat", to: "/goruntulu-destek" },
      ],
    };
  }
  if (has(t, "anne", "baba", "aile", "yetki", "ebeveyn")) {
    return {
      text: "Aile Yetkilendirme ile yakınının hesabında destek talebi açabilir, görüntülü destekte onu da görüşmeye ekleyebilirsin. Fatura ödeme ve iptal varsayılan olarak kapalıdır.",
      actions: [{ label: "Aile Yetkilendirme", to: "/aile" }],
    };
  }
  if (has(t, "hibrit", "yedek", "kesinti uzun")) {
    return {
      text: "Hibrit İnternet aboneliğinize dahildir, ek ücret ödemezsiniz. Kesinti 24 saati aşarsa yedek internet cihazınız üzerinden bağlantınızı uygulamadan etkinleştirebilirsiniz.",
      actions: [{ label: "Hibrit İnternet", to: "/hibrit" }],
    };
  }
  if (has(t, "fatura", "öde", "ödeme", "otomatik")) {
    return {
      text: "Ödenmemiş faturan bulunmuyor. Otomatik ödeme talimatı verirsen bir daha takip etmene gerek kalmaz.",
      actions: [
        { label: "Faturalarım", to: "/faturalar" },
        { label: "Otomatik ödeme talimatı", to: "/islem/otomatik-odeme" },
      ],
    };
  }
  if (has(t, "iptal", "dondur", "nakil", "taşı")) {
    return {
      text: "Bu işlemleri uygulamadan yapabilirsin.",
      actions: [
        { label: "Hizmeti Dondur", to: "/islem/dondur" },
        { label: "İnternetini Taşı", to: "/islem/tasi" },
        { label: "Aboneliğini İptal Et", to: "/islem/iptal" },
      ],
    };
  }
  if (has(t, "paket", "yükselt", "1000", "fiber")) {
    return { text: "Adresinde 1.000 Mbps fiber altyapı var!", actions: [{ label: "Hızımı yükselt", to: "/islem/hiz-yukseltme" }] };
  }
  return {
    text: "Bunu uygulamada birlikte çözebiliriz. Aşağıdaki seçeneklerden biri işini görecektir.",
    actions: [
      { label: "Görüntülü destek başlat", to: "/goruntulu-destek" },
      { label: "QR ile talep aç", to: "/qr/tara" },
      { label: "Tüm destek kayıtlarım", to: "/destek-kayitlari" },
    ],
  };
}
