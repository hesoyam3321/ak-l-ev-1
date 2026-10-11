# Telefondan Bilgisayarı Açma Yöntemleri

### Temel Mantık:
Bilgisayar **tamamen kapalıyken** kendi içinde web sunucusu çalıştıramaz. Ancak Ethernet kartı standby elektriğiyle bekler. Bilgisayarı telefondan açmak için 2 harika yönteminiz var:

---

### Yöntem 1: Bu Web Sitesini Doğrudan Telefonda Çalıştırmak (En İyisi!)
Telefonunuz bir Android cihazsa, bu Python sunucusunu doğrudan telefonda çalıştırıp kendi telefonunuzdan siteye girebilirsiniz!

1. Google Play'den ücretsiz **Pydroid 3** veya **Termux** uygulamasını indirin.
2. Bu klasördeki `server.py`, `config.json` ve `public` klasörünü telefonunuza atın (veya tek bir klasörde toplayın).
3. Telefonda çalıştırın: `python server.py`
4. Telefonunuzun Chrome tarayıcısını açıp `http://localhost:5000` yazın.
5. Kullanıcı adı `admin` hazır gelecek, şifreye `3321` yazıp girin ve devasa **"BİLGİSAYARI AÇ"** butonuna basın!
6. Telefonunuz evdeki Wi-Fi üzerinden bilgisayarınızın Ethernet kartına sihirli paketi fırlatır ve bilgisayarınız anında açılır!

---

### Yöntem 2: Evdeki Başka Bir Cihazda / Raspberry Pi'de Çalıştırmak
Eğer evde sürekli açık duran eski bir laptop, mini PC veya Raspberry Pi varsa:
1. `baslat.bat` veya `python server.py` dosyasını o cihazda çalıştırın.
2. Telefonunuzdan o cihazın IP adresini yazarak (örn: `http://192.168.1.50:5000`) siteye girin.
3. Giriş yapıp bilgisayarı tek tıkla açın!

---

### Yöntem 3: Bilgisayar Açıkken veya Uyku Modundayken
* Bilgisayarınızda `baslat.bat` dosyasını çalıştırın.
* Telefonunuz aynı Wi-Fi ağına bağlıyken tarayıcıdan **`http://192.168.1.114:5000`** adresine girin.
* Bilgisayarınızı uzaktan uyku moduna alabilir, yeniden başlatabilir veya kapatabilirsiniz.
