# ⚡ Remote PC Wake-on-LAN Controller

Uzaktan bilgisayarınızı açabileceğiniz, modern cam tasarımlı (Glassmorphism), mobil ve GitHub Pages uyumlu web kontrol paneli.

---

## 🚀 GitHub Pages ile Site Yapma (Canlıya Alma)

Bu projeyi GitHub'a yükleyip **ücretsiz bir web sitesi** haline getirmek için şu adımları izleyin:

### 1. Dosyaları GitHub'a Yükleyin
Eğer terminal kullanıyorsanız bu klasörde sırasıyla şu komutları çalıştırın:
```bash
git init
git add .
git commit -m "İlk kurulum - Remote PC Controller"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
git push -u origin main
```
*(Veya GitHub.com üzerinde yeni repo oluşturup dosyaları sürükleyip bırakabilirsiniz).*

### 2. GitHub Pages'i Aktifleştirin (2 Tıkla Canlıya Alma)
1. GitHub'daki deponuzun (repository) sayfasına gidin.
2. Üst menüden **Settings** (Ayarlar) sekmesine tıklayın.
3. Sol menüden **Pages** seçeneğine tıklayın.
4. **Build and deployment** başlığı altında:
   * **Source:** `Deploy from a branch` seçin.
   * **Branch:** `main` seçin ve klasör olarak `/(root)` seçin.
   * **Save** butonuna basın.
5. 1-2 dakika içinde siteniz yayına girer ve şu linki verir:
   `https://KULLANICI_ADINIZ.github.io/REPO_ADINIZ/`

---

## 🔑 Giriş Bilgileri
* **Kullanıcı Adı:** `admin` (Sitede otomatik yazılı gelir)
* **Şifre:** `3321`

---

## 📱 Telefondan Evdeki Bilgisayarı Açma (Wake-on-LAN)

GitHub Pages sitenizi telefonunuzdan açtığınızda evdeki kapalı bilgisayarınıza sinyal ulaştırabilmek için 2 yöntem vardır:

### A) Evdeyken Yerel Ağda Kullanım:
Bilgisayarınızda `baslat.bat` çalıştırın ve telefonunuzdan doğrudan `http://192.168.1.114:5000` adresine girin.

### B) Dışarıdan / Mobil Veriden Kullanım (Cloudflare Tunnel - Ücretsiz):
Bilgisayarınızda veya evdeki herhangi bir cihazda (Raspberry Pi vb.) Cloudflare Tunnel açarak dışarıya güvenli bir HTTPS kapısı açabilirsiniz:
```bash
cloudflared tunnel --url http://localhost:5000
```
Gelen `https://xxxx.trycloudflare.com` adresini GitHub Pages sitenizdeki **Ayarlar > Sunucu / Tünel URL** kutusuna yapıştırın. Artık dünyanın her yerinden bilgisayarınızı tek tıkla açabilirsiniz!

---

## ⚙️ Yapılandırma
* **Hedef MAC:** `2C:F0:5D:A7:F0:EC`
* **Hedef Yerel IP:** `192.168.1.114`
* **Broadcast IP:** `192.168.1.255`
* **WoL Portu:** `9`
