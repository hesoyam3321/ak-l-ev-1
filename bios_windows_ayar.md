# Wake-on-LAN (Bilgisayarı Uzaktan Açma) Ayar Rehberi

Bilgisayarınız kapalıyken ağ üzerinden gelen "Sihirli Paket" (Magic Packet) ile açılabilmesi için aşağıdaki **2 basit ayarın** yapılması gerekir:

---

### 1. Windows Ağ Kartı Ayarı (Realtek PCIe GbE)
Bilgisayarınızdaki Ethernet kartı Realtek modelidir. Şu adımları uygulayın:

1. Başlat menüsü butonuna sağ tıklayın ve **Aygıt Yöneticisi**'ni açın.
2. **Ağ Bağdaştırıcıları** (Network Adapters) kategorisini genişletin.
3. **Realtek PCIe GbE Family Controller** seçeneğine sağ tıklayıp **Özellikler** deyin.
4. **Güç Yönetimi (Power Management)** sekmesine gelin:
   - [x] *"Bu aygıtın bilgisayarı başlatmasına izin ver"* kutusunu işaretleyin.
   - [x] *"Yalnızca sihirli bir paketin bilgisayarı uyandırmasına izin ver"* kutusunu işaretleyin.
5. **Gelişmiş (Advanced)** sekmesine gelin:
   - Listeden **"Sihirli Paket ile Uyandırma" (Wake on Magic Packet)** ayarını bulun ve **Etkin (Enabled)** yapın.
   - Listeden **"Kapatma Wake-On-Lan" (Shutdown Wake-On-Lan)** varsa onu da **Etkin (Enabled)** yapın.
6. **Tamam**'a basıp kaydedin.

> **Önemli İpucu (Hızlı Başlatmayı Kapatma):**
> Windows 10/11'de "Hızlı Başlatma" açıkken bilgisayar kapandığında ağ kartının elektriği tamamen kesilebilir.
> *Denetim Masası > Donanım ve Ses > Güç Seçenekleri > Güç düğmelerinin yapacaklarını seçin > "Şu anda kullanılmayan ayarları değiştir" > "Hızlı başlatmayı aç"* seçeneğindeki tik işaretini kaldırıp kaydedin.

---

### 2. Anakart BIOS / UEFI Ayarı
Bilgisayar kapalıyken anakartın Ethernet girişine düşük voltaj vermesi gerekir:

1. Bilgisayarı yeniden başlatın ve açılırken **DEL** veya **F2** tuşuna basarak BIOS ekranına girin.
2. Anakart markanıza göre şu menülerden birini bulun:
   - **ASUS:** *Advanced > APM Configuration > Power On By PCI-E* -> **Enabled**
   - **MSI:** *Settings > Advanced > Wake Up Event Setup > Resume By PCI-E Device* -> **Enabled**
   - **Gigabyte:** *Settings > Platform Power > Wake on LAN* -> **Enabled**
3. **ErP Ready (veya Deep Sleep)** ayarını bulun ve **Disabled (Kapalı)** yapın. *(ErP açık olursa anakart kapalıyken elektrik tasarrufu için Ethernet portunun gücünü keser).*
4. **F10** tuşuna basarak kaydedip çıkın.

---

### 3. Bilgisayarınızın Bilgileri (Önceden Yapılandırıldı)
* **MAC Adresi:** `2C:F0:5D:A7:F0:EC`
* **Yerel IP:** `192.168.1.114`
* **Yayın (Broadcast) IP:** `192.168.1.255`
* **Port:** `9`
