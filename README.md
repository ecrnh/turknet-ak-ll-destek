# Turknet Akıllı Destek

# GÖREV
Turknet mobil uygulamasının (müşteri self-servis uygulaması) mevcut tasarım diline birebir sadık kalan, MOBİL-ÖNCELİKLİ (390x844 çerçeve, masaüstünde ortalanmış telefon çerçevesi içinde) bir interaktif prototip geliştir. Bu bir Product Bootcamp final case sunumu için demo prototipidir: backend yok, tüm veri mock/state'tir, ama her akış uçtan uca tıklanabilir ve gerçekçi hissettirmelidir. Dil: Türkçe. Teknoloji: React + TypeScript + Tailwind + shadcn/ui + React Router + lucide-react + framer-motion. Veriler localStorage'da kalıcı olsun.

# CASE BAĞLAMI (ürün kararlarını buna göre ver)
Turknet, dijital kanalları merkeze alıyor. Mobil kullanıcılar: iOS 310K, Android 108K; online işlem: 111K. En çok kullanılan işlem fatura ödeme. Dijital asistan verisi (Ağustos → Eylül): toplam destek kaydı 390.411 → 381.071; teknik destek kaydı 199.079 → 203.374; asistandan açılan destek kaydı 114.497 → 102.364; asistandan sonra canlı chat'e gidenler 66.088 → 55.750; asistandan dijital onarım yapanlar 155.219 → 237.394. Müşteri geri bildirimi: "Bazı işlemleri uygulamadan yapamıyorum, mecbur asistana yazıyorum." Hedef: uygulama kullanımını artırmak, destek çağrısı/saha ekibi ihtiyacını azaltmak, self-servis ve proaktif destek sunmak.

# TASARIM SİSTEMİ (mevcut Turknet uygulamasından)
- Renkler: koyu erik/mor birincil (#4A0A5E civarı, başlıklar ve primary butonlar), canlı magenta/pembe vurgu (#FF1493 civarı: aktif tab alt çizgisi, bildirim rozeti, bilgi ikonları), kampanya kartlarında turuncu→kırmızı-turuncu gradient (#FF8A3D → #FF4D00), "Arkadaşını Getir" tarzı kartlarda açık pembe gradient (#FFF0FA → #FCE4F5), sayfa arka planı açık gri (#F4F4F6), kartlar beyaz.
- Köşeler çok yuvarlak (kart 24px, buton/pill 999px), yumuşak gölgeler, ikonlar ince çizgili (lucide), ikon kutuları açık pembe zemin üzerinde yuvarlak kare.
- Tipografi: temiz sans-serif (Inter / Plus Jakarta Sans), başlıklar koyu mor ve semibold.
- Online durumu yeşil nokta ile "Çevrimiçi".
- Başarılı/uyarı/hata durumları için tutarlı toast ve banner bileşenleri.

# MEVCUT UYGULAMA İSKELETİ (aynen kur)
Alt navigasyon: Ana Sayfa | İşlemler | (ortada yüzen mor yuvarlak "?" yardım butonu) | Faturalarım | Hesabım. Aktif tab'in altında magenta çizgi.

1) ANA SAYFA
- Üstte beyaz bar: sol "t" logosu, ortada arama kutusu "İşlem veya Sayfa Ara", sağda zil ikonu ve kırmızı/pembe rozet (12).
- Koyu mor gradient hero carousel (7 nokta): "12 Aylık Peşin Ödeme ile Sabit Fiyat Avantajını Yakala", aylık ₺949,90 yerine ₺749,90'den, ₺2.400 tasarruf, "Vade Farksız 3 Taksit İmkanı", "Ayrılırsan Kalan Aylar İade" etiketleri. Diğer slaytlar yeni özellikleri tanıtsın (aşağıda).
- Hero altında yarı saydam pill: sol "Hesabım İstanbul/Ümraniye", sağ "İnternet Durumu: Çevrimiçi •".
- Turuncu kampanya kartı "12 Aylık Peşin Ödemede İndirimli Fiyat Fırsatı".
- Pembe "Arkadaşını Getir" kartı (içinde "Sayenizde Turknet'li Olanlar" pill'i, sayaç 1, "+600.000 kullanıcı Arkadaşını Getirdi").
- "Abonelik İşlemlerim" yatay kaydırmalı kartlar: Hız Yükseltme, 12 Ay Fiyat Sabitle, Hizmeti Dondur, İnternetini Taşı, Aboneliğini İptal Et.
- "İnternet İşlemlerim": Hız Testi, Kullanımını Gör, Ping Testi.

2) İŞLEMLER: turuncu kampanya kartı, 2 kolonlu işlem grid'i (yukarıdaki işlemler), altında liste kartı: Yardım & Destek, Modem Şifre Bilgisi, Statik IP, Teknik Bilgiler, Paket ve Ürün Bilgileri, Güvenli İnternet; en altta "Yeni Abonelik" kartı.

3) FATURALARIM ("Fatura ve Ödeme"): boş durum "Faturanız Bulunmamaktadır / Ödenmemiş faturanız bulunmamaktadır. Teşekkürler!" illüstrasyonlu kart + bilgi notu; altında satırlar: Geçmiş Faturalarımı Görüntüle, Otomatik Ödeme Talimatı Ver, Fatura Tercihlerimi Düzenle, Fatura Gönderim Adresini Düzenle.

4) HESABIM: profil kartı (avatar "ÇK", ÇAĞRI KOYUNCU, abone no 4896005), Arkadaşını Getir kartı, liste: Tercihlerim, Şifre Değiştir, Belgelerim, İşlem Geçmişi, Deneyim Programı, Bizi Değerlendirin, Çıkış Yap.
   → YENİ satır ekle: "Aile Yetkilendirme" (özellik 1'in parçası).

5) YARDIM (İşlemler > Yardım & Destek): "İnternet Sağlığınızı Kontrol Edin" kartı + koyu mor "Dijital Onarımı Çalıştır" butonu; "Size nasıl yardımcı olabiliriz?" kategori listesi: İnternet Bağlantı Sorunları, Fatura ve Ödeme İşlemleri, Hizmet & Ürünler, İptal İşlemleri, Bilgi.
   → YENİ kategori kartları ekle: "Görüntülü Destek", "QR ile Destek Talebi".

6) YARDIM MERKEZİ (yüzen "?" butonu, tam ekran alt sheet): "Merhaba, Çağrı", İnternet Durumu rozeti, "Dijital Onarım" kartı, "Sana Özel Öneriler" (1.000 Mbps Hız Fiber İle Seninle!, 12 Ay Peşin Ödemede Ayda ₺749,90 Fırsatı!), "Popüler Sorular" (yatay chip'ler), alt mesaj girişi "Size nasıl yardımcı olabiliriz?". "?" ikonu konu seçme sheet'i açar: İNTERNET SORUNLARI, FATURA İŞLEMLERİ, ABONELİK İŞLEMLERİ başlıkları altında soru chip'leri. Chat çalışır (scripted yanıtlar), ve yanıtlarda yeni özelliklere yönlendiren aksiyon butonları olsun ("Görüntülü destek başlat", "QR ile talep aç").

7) ARAMA: "Popüler Aramalar" chip'leri (İnternet Bağlantı Sorunları, Faturalarım, Tüm Destek Kayıtları, Hizmet İptal, Hizmet Dondurma, Statik IP, Peşin Ödeme Kampanyası, Arkadaşını Getir Birlikte Kazanın, İnternetini Yeni Adresine Taşı, Yardım & Destek). Yazdıkça mock sonuç filtrelensin; yeni özellikler de aranabilir olsun.

# YENİ ÖZELLİK 1: GÖRÜNTÜLÜ DESTEK + AİLE YETKİLENDİRME
Amaç: yaşlı/teknolojiye uzak ebeveyn gibi kullanıcılar adına çocukları süreci yönetsin; saha ekibi gönderilmeden uzaktan çözüm.

A) Aile Yetkilendirme (Hesabım > Aile Yetkilendirme)
- Ekran: "Yetkili Kişiler" listesi + "Yeni Kişi Yetkilendir" butonu.
- Akış: isim, telefon, ilişki (Anne/Baba/Eş/Çocuk/Diğer), yetki kapsamı toggle'ları (Destek talebi oluştur, Görüntülü destek başlat, Fatura görüntüle, Hız/paket değişikliği; fatura ödeme ve iptal varsayılan KAPALI). Süre seçimi (Süresiz / 30 gün / 7 gün). SMS/OTP doğrulama simülasyonu (6 haneli kod ekranı, demoda herhangi bir kod kabul edilsin) ve "KVKK aydınlatma ve açık rıza" onay checkbox'ı zorunlu.
- Asıl abone sonradan yetkiyi tek dokunuşla iptal edebilsin; "Yetki Geçmişi" logu tutulsun.
- Hesap anahtarı: üstte profil değiştirici ("Çağrı (Ben)" / "Ayşe Hanım adına işlem yapıyorsun" banner'ı) — yetkili kişi, yetkilendirilen abonenin hesabına girmiş gibi çalışsın, ekranın üstünde sürekli görünen turuncu bir "Ayşe K. adına işlem yapıyorsun" şeridi olsun.

B) Görüntülü Destek (Yardım > Görüntülü Destek, ayrıca Ana Sayfa'da hızlı erişim kartı)
- Ön ekran: kısa bilgi, tahmini bekleme süresi ("Ortalama bekleme: 2 dk"), "Neden görüntülü destek?" mini açıklama, konu seçimi (Modem ışıkları / Kablo-bağlantı / Wi-Fi sinyali / Kurulum / Diğer), kamera-mikrofon izin ekranı. Kamera önizlemesi için getUserMedia dene, başarısız olursa şık bir placeholder göster.
- Katılımcı ekleme: "Sorunun sahibini davet et" → yetkili aile üyeleri listesinden seç veya link/SMS ile davet (simüle). Davetli katıldığında görüşmede 3 kişi görünür: Turknet uzmanı, ben (çocuk), annem.
- Görüşme ekranı (tam ekran, koyu): büyük uzman video alanı (avatar/illüstrasyon + canlı his veren animasyon), küçük yüzen kendi kamera önizlemesi, katılımcı küçük kutucukları, alt kontrol çubuğu: mikrofon, kamera, kamera çevir, el feneri, ekran paylaşımı/fotoğraf çek, katılımcı ekle, kapat.
- Kablo/modem rehberliği: uzman "İşaretle" aracı ile kullanıcının kamera görüntüsü üzerinde pembe halka/ok çizebilsin (canvas overlay; demoda uzman aksiyonları otomatik oynayan bir senaryo). Yanında "Modem Işık Rehberi" paneli: Power, DSL/Fiber, Internet, Wi-Fi LED durumları ve anlamları.
- Görüşme içi adım adım kontrol listesi (uzmanın tikleyeceği): 1) Fiber kablo takılı mı? 2) Adaptör prizde mi? 3) Modemi yeniden başlat 4) Kablo uçlarını kontrol et. Her adımda modem canlı sağlık verisi (sinyal seviyesi, hat durumu) ekranın üstünde canlı güncellenen mini rozet olarak görünsün; kablo takılınca "Hat Bağlandı ✔" animasyonu.
- Görüşme sonu: "Sorun çözüldü mü?" (Evet/Hayır). Hayır ise "Teknik ekip randevusu oluştur" akışı (tarih/saat seçici, Saha ekibi gerekliliği kaydı). Evet ise 1-5 yıldız memnuniyet + serbest yorum + "Saha ekibi gönderilmeden çözüldü" başarı kartı ve "tasarruf edilen saha ziyareti" sayacı.
- Görüşme özeti otomatik oluşsun ve "İşlem Geçmişi"ne ve "Tüm Destek Kayıtları"na düşsün (görüşme süresi, katılımcılar, yapılan adımlar, sonuç).

# YENİ ÖZELLİK 2: QR İLE TEMASSIZ DESTEK TALEBİ
- Her müşteriye özel, modem üzerine yapıştırılacak bir QR etiketi. Uygulamada "İşlemler > QR ile Destek" ve Yardım kategorisi altında yer alsın.
- Ekran 1 "QR Etiketim": müşteriye özel QR kodu (qrcode kütüphanesiyle üret; içerik: turknet://support?sub=4896005&dev=MOD-XXXX), modem seri no, "Modeminin üstüne yapıştır" talimatı, "Etiketi indir/yazdır" ve "Kargoyla etiket iste" butonları. Küçük bir modem üzerinde QR etiketinin nerede duracağını gösteren illüstrasyon.
- Ekran 2 "QR Tara": uygulama içi tarayıcı arayüzü (kamera placeholder + tarama çerçevesi animasyonu). Demo için "Demo QR'ı Tara" butonu ve ayrıca kodu manuel girme seçeneği. (Gerçekte uygulama dışı kamera ile okutulursa da uygulamayı açan deep link çalışır; bunu bilgi notu olarak yaz.)
- Tarama sonrası "Modemin analiz ediliyor…" animasyonlu adım adım ilerleme: Hat durumu → Sinyal gücü → Optik güç seviyesi → DNS/ağ geçidi → Wi-Fi kanal yoğunluğu → Son 24 saat kopma geçmişi. Her adım yeşil tik veya kırmızı uyarı ile tamamlansın.
- Sonuç ekranı: "Sağlık Skoru" (0-100 halka grafik), bulunan sorunların listesi (örn. "Optik sinyal seviyesi düşük", "Wi-Fi kanal 6 aşırı yoğun") ve sorunlu kısım otomatik olarak vurgulansın.
- Tek dokunuşla "Destek Talebini Oluştur": sorun kategorisi, ilgili teknik veriler, saat, cihaz bilgisi OTOMATİK doldurulur; kullanıcı hiçbir form doldurmaz. Talep numarası (ör. TKT-2026-104552), tahmini çözüm süresi ve durum zaman çizelgesi (Alındı → İnceleniyor → Çözüm Aşamasında → Tamamlandı) gösterilsin. Çözülebilen sorunlarda önce "Otomatik Onarım Dene" önerilsin (Dijital Onarım'a bağlan).
- "Temassız" vurgusu: kullanıcı ses duymadan, kimseyle konuşmadan, canlı chat'e düşmeden sonuca ulaşır. Talepte "Gerekirse bana ulaşın" tercihi olsun.

# YENİ ÖZELLİK 3: KESİNTİ TELAFİSİ – "HER HATTA HEDİYE İNTERNET"
- Tetikleyici: sistem hattı kesintiye girmiş tespit ettiğinde (örn. 10 saat+ kesinti; eşikler: 6 saat → 5 GB, 24 saat → 10 GB, 72 saat+ → 20 GB) kullanıcıya push bildirimi + uygulama içi tam ekran ama sakin bir kart: "Sakin ol, farkındayız. Sorunu çözmek için çalışıyoruz. Bu sürede sana ... GB hediye ettik."
- Kullanıcı hangi GSM operatörünü kullanırsa kullansın (Turkcell/Vodafone/Türk Telekom/Diğer seçimi) hediye hatta tanımlanır: telefon numarası doğrulama (OTP simülasyonu), operatör seçimi/otomatik tespit, "Hediyeyi Aktifleştir" butonu.
- "Hediye İnternet Cüzdanım" ekranı: toplam, kullanılan, kalan GB halka grafiği; geçerlilik süresi; "Sosyal medya ve mesajlaşma uygulamaları (WhatsApp, Instagram vb.) ücretsiz" rozeti ve bu uygulamaların kullanımının kotadan düşmediğini gösteren ayrı sayaç ("Bu uygulamalarda kullandığın: 3,2 GB – kotadan düşülmedi").
- Aile ile paylaşım: "GB'ni ailenle paylaş" → yetkili aile üyelerinin hatlarına GB aktarma kaydırıcısı (örn. 10 GB'nin 3'ünü anneye ver). Paylaşım geçmişi.
- Uzaktan çalışanlar için "Remote Çalışma Modu" önerisi: hediye GB'yi iş uygulamalarına (Zoom, Teams, Meet) öncelik verecek şekilde "Kota Önceliği" toggle'ı.
- Kesinti süresince canlı "Arıza Durumu" kartı: nedeni (örn. bölgesel fiber kesintisi), tahmini düzelme saati, ilerleme çubuğu ve son güncelleme zamanı. Kesinti bitince "Hizmet geri geldi" kutlama ekranı + özür notu.
- Demo kontrol panelinde "Kesinti süresi" slider'ı ile bu eşikler canlı tetiklenebilsin.

# YENİ ÖZELLİK 4: UYGULAMA İÇİ AI AJANLAR (PROAKTİF, OTONOM)
Uygulamada "AI Ajanlar" / "Turknet Asistan Ajanlarım" bölümü ve Ana Sayfa'da canlı bir "Ajan Etkinlik" kartı olsun. Ajanlar sen istemeden çalışır, her aksiyon şeffaf biçimde bildirilir ve kullanıcı "Geri al / Bunu bir daha yapma" diyebilir.

A) Hız Koruyucu Ajan
- Senaryo: Paket 100 Mbps, ölçülen hız 20 Mbps'e düştü. Ajan fark eder, kök neden analizi yapar (Wi-Fi kanal yoğunluğu, hat sinyali, bölgesel yoğunluk), hızı otomatik düzeltir (kanal değiştirme, profil yenileme, uzaktan modem yeniden başlatma).
- UI: önce/sonra hız grafiği (20 → 98 Mbps), tek satır özet "Hızını 20 Mbps'ten 98 Mbps'e yükselttim", yapılan işlem adımları timeline'ı, bildirim ve "Hız Testi ile doğrula" butonu.

B) Kesinti Yedekleme (Akıllı Yönlendirme / Yedek Altyapı) Ajanı
- Senaryo: bölgede teknik arıza var ve kesinti sürecek; ajan kullanıcıyı geçici olarak en yakın sağlıklı altyapıdan bağlar (örn. İstanbul'daki kullanıcı Tekirdağ altyapısından).
- UI: harita tabanlı görsel (basit Türkiye/Marmara SVG haritası, kullanıcı konumu ile yedek altyapı noktası arasında animasyonlu çizgi), "Geçici Bağlantı Aktif" durumu, bağlanılan altyapı bölgesi, tahmini gecikme/hız farkı (örn. ping +12 ms), süre sayacı ve "Ana hat düzelince otomatik geri döneceğim" bilgisi. Kullanıcı onayı: ilk kullanımda "Yedek altyapıdan bağlanmama izin veriyorum" izni (Tercihlerim'den kapatılabilir).
- Ana hat düzeldiğinde otomatik geri dönüş animasyonu ve bilgilendirme.

C) Ajan Merkezi ekranı
- Aktif ajanlar listesi (Hız Koruyucu, Kesinti Yedekleme, Modem Sağlık İzleyici, Fatura Asistanı), her biri için aç/kapa toggle, son aksiyonlar akışı (zaman damgalı), "Bu ay senin için X işlem yaptım" özet kartı (çözülen sorun sayısı, kazandırılan süre, önlenen destek çağrısı).
- Ajanlar Yardım Merkezi chat'iyle de entegre: chat'te "Hızım düşük" yazılırsa ajan devreye girer ve adımları canlı yazar.

# EKRANLAR ARASI ENTEGRASYON
- Ana Sayfa hero carousel'e 4 yeni slayt: Görüntülü Destek, QR ile Destek, Kesinti Hediyen, AI Ajanlar. "İnternet Durumu" pill'i duruma göre değişsin (Çevrimiçi / Kesinti / Yedek Altyapıda).
- Ana Sayfa'da yeni "Destek İşlemlerim" satırı (yatay kartlar): Görüntülü Destek, QR ile Destek, Hediye GB, AI Ajanlar.
- Bildirim zili (12) tıklanınca bildirim merkezi: ajan aksiyonları, kesinti hediyesi, destek talebi durumları, aile yetki istekleri.
- İşlemler grid'ine ve Arama'ya yeni özellikleri ekle.
- Tüm destek kayıtları ekranı: görüntülü görüşmeler, QR talepleri, ajan aksiyonları tek zaman çizelgesinde, kanal etiketiyle (Görüntülü / QR / Ajan / Chat).

# DEMO KONTROL PANELİ (sunum için kritik)
Sağ üstte veya "Hesabım > Geliştirici/Demo Modu"nda gizlenebilir bir panel:
- Senaryo butonları: "Hız düşüşü simüle et", "Kesinti başlat (saat slider'ı)", "Hat düzeldi", "Yedek altyapıya geç", "Yaşlı yakın görüntülü destek senaryosu", "QR ile arıza senaryosu".
- "Sıfırla" butonu.
- Bu panel prototipin kendisi değil, sunumda akışı hızlı göstermek içindir.

# SUNUM İÇİN YÖNETİCİ ÖZET EKRANI ("Etki Panosu")
Ayrı bir /dashboard rotası (uygulama içinde "Hesabım > Etki Panosu"): case'in ölçüm tarafını göstersin, mock veriyle:
- KPI kartları: Mobil uygulama MAU (hedef artış), self-servis çözüm oranı, canlı chat'e düşen oran (baz: 55.750 / 102.364 → hedef düşüş), saha ekibi gönderilmeden çözülen vaka sayısı, ortalama çözüm süresi, NPS/CSAT.
- Özellik bazlı kullanım hunisi (bilgilendirme → başlatma → tamamlama) ve kullanıcı yolculuğu terk noktaları görseli.
- A/B test kartları: her özellik için kontrol vs. varyant, birincil metrik, süre, örneklem, tahmini etki (örn. "QR ile destek: kayıt açma süresi -%60", "Görüntülü destek: saha ziyareti -%25").
- Recharts ile bar/line/funnel grafikleri; Ağustos–Eylül gerçek verileri baz çizgisi olarak göster.

# ANALİTİK VE GERİ BİLDİRİM
- Her akışın sonunda tek dokunuşluk CSAT (emoji) + opsiyonel yorum; "Bu özelliği önerir misin?" NPS sorusu.
- Uygulama içi geri bildirim butonu ("Bu işlemi uygulamadan yapamadın mı? Bize söyle") – case'teki müşteri geri bildirimine doğrudan cevap; seçilen eksik işlem bir "Talep Kutusu"na yazılır.
- Mock analytics event'leri konsola ve /dashboard'a yazılsın (feature_opened, flow_completed, flow_abandoned).

# ERİŞİLEBİLİRLİK VE GÜVEN
- Yaşlı kullanıcılar için "Büyük Yazı / Basit Mod" toggle'ı (Tercihlerim içinde); görüntülü destek ve QR akışlarında büyük butonlar ve sade metinler.
- Tüm kritik aksiyonlarda (aile yetkilendirme, yedek altyapı izni, GB paylaşımı) açık onay ve geri alma.
- KVKK ve kamera/mikrofon izinleri için kısa, anlaşılır metinler.
- Kontrast, dokunma hedefi min 44px, ekran okuyucu etiketleri.

# KABUL KRİTERLERİ
1) Mevcut Turknet ekranları görsel olarak ekran görüntülerine çok yakın görünüyor ve tüm tab'ler çalışıyor.
2) 4 yeni özellik de uçtan uca tıklanabilir; ana sayfa, işlemler, yardım ve arama içinden erişilebilir.
3) Demo panelinden senaryolar tetiklenince UI durumları (internet durumu pill'i, bildirimler, kartlar) tutarlı şekilde güncelleniyor.
4) Boş, yükleniyor ve hata durumları tasarlanmış.
5) Etki Panosu case'teki verileri baz alan KPI'ları ve A/B test planını gösteriyor.
6) Kod bileşen bazlı, temiz klasör yapısında (components/, pages/, features/{videoSupport, qrSupport, giftData, aiAgents}, data/mock.ts) ve her feature kendi state yönetimiyle (zustand veya context) ayrılmış.

Önce iskeleti ve mevcut ekranları kur, sonra özellikleri sırayla (1→4) ekle, en son demo paneli ve Etki Panosu'nu tamamla. Belirsiz bir noktada makul varsayım yap ve devam et, soru sorma.turknetın kurumsal ui ve renk ktini takip et

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0d69dec4-edf8-416a-b9f6-9b96cacb4944).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
