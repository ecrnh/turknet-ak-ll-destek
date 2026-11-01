# Roadmap — Otonom Müşteri Deneyimi Platformu

## Tur 1 (tamamlandı)
- [x] Ortak veri modeli, iş akışı motoru, işlem günlüğü, bildirim servisi, mock servisler
- [x] Senaryo motoru + Senaryo Demo Paneli
- [x] Taşınma, geçici internet/hibrit, Fatura Kalkanı, AI Usta, proaktif arıza, Benim İçin Takip Et

## Tur 2 — Master prompt v2 (3 ürün alanı + UX writing)
- [x] Merkezi kullanıcı dostu durum dili (tek sözlük), "siz" dili, 3 soru (ne oluyor / benden ne bekleniyor / sonra ne olacak)
- [x] Akıllı bildirim katmanı: yalnızca karar, önemli aşama, gecikme, başlangıç, çözüm push; rutinler sessiz
- [x] Ana sayfa "Size nasıl yardımcı olabilirim?": metne göre akışı gerçekten başlat, emin değilse netleştirme iste
- [x] Takip merkezi kartları: başlangıç, durum, son adım, sıradaki, sizden beklenen, tahmini süre, detay
- [x] Teknik detayları gör (ikinci seviye) — detay, bağlantı, takip ekranları
- [x] AI Usta: sesli triyaj (IVR) + SMS ile uygulamaya geçiş, yeni güvenli adımlar, Uyguladım / Sorun devam ediyor, memnuniyet sorusu
- [x] Fatura Kalkanı: müşteri onayıyla inceleme başlatma (Daha Sonra seçeneği)
- [x] Hız Optimizasyon Ajanı: paket vs ölçülen hız, olası nedenler, uzaktan iyileştirme, önce/sonra; olmazsa iş emri
- [x] TürkNet Box: SIM/cihaz durumu, kota, uygulamadan aç/kapa; hibritten ayrı
- [x] Bağlantım: bağlantı sağlığı kartı (normal / performans düşüşü / kontrol / bölgesel / teknik ekip)
- [x] Teknik Destek ve İşlemlerim giriş noktaları (Yardım, İşlemler)
- [x] Senaryolar: 2 = kesinti + Box aç/kapa, 3 = onaylı inceleme, 4 = IVR→SMS→AI Usta, 5 = proaktif + hız
- [x] Panel: süreçlerin son durumu, onay gereken adımlar, bildirim türü
- [x] Testler: tüm senaryo yolları uçtan uca + yeni kurallar; tarayıcı kontrolü (masaüstü + mobil)

## Tur 3 — Ücretsiz Hibrit İnternet
- [x] Hediye GB özelliğini tamamen kaldır (ekranlar, kartlar, bildirimler, panel, arama, sohbet, pano, testler)
- [x] Eski ücretli hibrit teklifini ve Kesinti Yedekleme (yedek altyapı) akışını kaldır
- [x] Kesinti takibi: ilk 24 saat yalnızca bilgi kartı + push; 24 saat sonra ücretsiz teklif + push
- [x] Aktivasyon ekranı: açıklama, ücretsiz vurgusu, cihaz/SIM/kapsama kontrolü, onay
- [x] Alternatifler: cihaz yok (Cihaz Talep Et + teslimat), kapsama yok, vazgeçme, başarısız + tekrar dene, ana bağlantıya dönüş
- [x] Panel "Hibrit" sekmesi + Senaryo B (5 sonuç yolu); testler
