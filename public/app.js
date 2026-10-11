/**
 * Remote PC Wake-on-LAN Controller - Frontend Logic
 */

let authToken = sessionStorage.getItem('wol_token') || null;
let statusInterval = null;
let isWaking = false;

// DOM Elemanları
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const loginError = document.getElementById('login-error');
const loginErrorText = document.getElementById('login-error-text');
const btnLogin = document.getElementById('btn-login');

// Dashboard DOM
const pcStatusPill = document.getElementById('pc-status-pill');
const pcStatusLabel = document.getElementById('pc-status-label');
const displayPcName = document.getElementById('display-pc-name');
const displayMac = document.getElementById('display-mac');
const displayIp = document.getElementById('display-ip');
const btnWake = document.getElementById('btn-wake');
const wakeFeedback = document.getElementById('wake-feedback');
const wakeFeedbackMsg = document.getElementById('wake-feedback-msg');
const terminalBody = document.getElementById('terminal-body');
const btnClearLog = document.getElementById('btn-clear-log');

// Güç Butonları
const btnSleep = document.getElementById('btn-sleep');
const btnRestart = document.getElementById('btn-restart');
const btnShutdown = document.getElementById('btn-shutdown');
const btnLogout = document.getElementById('btn-logout');

// Modallar
const modalSettings = document.getElementById('modal-settings');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnCancelSettings = document.getElementById('btn-cancel-settings');
const settingsForm = document.getElementById('settings-form');
const cfgMac = document.getElementById('cfg-mac');
const cfgIp = document.getElementById('cfg-ip');
const cfgBroadcast = document.getElementById('cfg-broadcast');
const cfgPort = document.getElementById('cfg-port');

const modalGuide = document.getElementById('modal-guide');
const btnGuide = document.getElementById('btn-guide');
const btnCloseGuide = document.getElementById('btn-close-guide');
const btnUnderstoodGuide = document.getElementById('btn-understood-guide');
const guidePhoneUrl = document.getElementById('guide-phone-url');

// ================= BAŞLANGIÇ =================
window.addEventListener('DOMContentLoaded', () => {
  // Rehberdeki adresi tarayıcının o anki IP'sine göre ayarla
  const currentHost = window.location.host || '192.168.1.114:5000';
  if (guidePhoneUrl) {
    guidePhoneUrl.textContent = `http://${currentHost}`;
  }

  // Kullanıcı adını otomatik 'admin' yap
  usernameInput.value = 'admin';

  // Önceden giriş yapılmışsa doğrudan panele geç
  if (authToken) {
    showDashboard();
  } else {
    showLogin();
  }
});

// ================= GİRİŞ İŞLEMLERİ =================
togglePasswordBtn.addEventListener('click', () => {
  const isPassword = passwordInput.getAttribute('type') === 'password';
  passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
  eyeIcon.style.opacity = isPassword ? '1' : '0.6';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Yükleniyor durumu
  btnLogin.querySelector('.btn-text').classList.add('hidden');
  btnLogin.querySelector('.spinner').classList.remove('hidden');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      authToken = data.token;
      sessionStorage.setItem('wol_token', authToken);
      appendLog('Giriş başarılı (admin). Oturum başlatıldı.', 'success');
      showDashboard();
    } else {
      showLoginError(data.message || 'Hatalı şifre! (Varsayılan: 3321)');
    }
  } catch (err) {
    showLoginError('Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.');
  } finally {
    btnLogin.querySelector('.btn-text').classList.remove('hidden');
    btnLogin.querySelector('.spinner').classList.add('hidden');
  }
});

function showLoginError(msg) {
  loginErrorText.textContent = msg;
  loginError.classList.remove('hidden');
  passwordInput.classList.add('shake');
  setTimeout(() => passwordInput.classList.remove('shake'), 500);
}

function showLogin() {
  loginView.classList.add('active');
  dashboardView.classList.remove('active');
  if (statusInterval) clearInterval(statusInterval);
}

function showDashboard() {
  loginView.classList.remove('active');
  dashboardView.classList.add('active');
  loadConfig();
  checkPcStatus();
  if (statusInterval) clearInterval(statusInterval);
  statusInterval = setInterval(checkPcStatus, 5000);
}

// Çıkış
btnLogout.addEventListener('click', () => {
  authToken = null;
  sessionStorage.removeItem('wol_token');
  appendLog('Kullanıcı çıkış yaptı.', 'info');
  showLogin();
});

// ================= GÜNLÜK (TERMINAL) =================
function appendLog(message, type = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  const time = new Date().toLocaleTimeString('tr-TR');
  line.textContent = `[${time}] ${message}`;
  terminalBody.appendChild(line);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

btnClearLog.addEventListener('click', () => {
  terminalBody.innerHTML = '';
  appendLog('Günlük temizlendi.', 'info');
});

// ================= BİLGİSAYAR DURUMU PİNG =================
async function checkPcStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.success) {
      if (data.online) {
        pcStatusPill.className = 'status-pill online';
        pcStatusLabel.textContent = 'Çevrimiçi (Açık)';
      } else {
        pcStatusPill.className = 'status-pill offline';
        pcStatusLabel.textContent = 'Çevrimdışı (Kapalı)';
      }
      displayPcName.textContent = data.pc_name || 'Eren PC';
      displayMac.textContent = data.target_mac || '2C:F0:5D:A7:F0:EC';
      displayIp.textContent = `${data.target_ip} : 9`;
    }
  } catch (err) {
    pcStatusPill.className = 'status-pill offline';
    pcStatusLabel.textContent = 'Ağ Hatası';
  }
}

// ================= BİLGİSAYARI AÇ (WAKE-ON-LAN) =================
btnWake.addEventListener('click', async () => {
  if (isWaking) return;
  isWaking = true;
  btnWake.classList.add('waking');
  wakeFeedback.classList.remove('hidden');
  wakeFeedbackMsg.textContent = 'Sihirli Paket (Wake-on-LAN) gönderiliyor...';

  appendLog('🚀 Wake-on-LAN sihirli paketi hazırlanıyor...', 'info');

  try {
    const res = await fetch('/api/wake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({})
    });

    const data = await res.json();

    if (res.ok && data.success) {
      appendLog(`✅ ${data.message}`, 'success');
      wakeFeedbackMsg.textContent = 'Sinyal yollandı! Bilgisayarın yanıt vermesi bekleniyor...';

      // 40 saniye boyunca her 2 saniyede bir ping atıp açılıp açılmadığını kontrol et
      let attempts = 0;
      const pingCheckTimer = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch('/api/status');
          const statusData = await statusRes.json();
          if (statusData.online) {
            clearInterval(pingCheckTimer);
            btnWake.classList.remove('waking');
            isWaking = false;
            wakeFeedbackMsg.textContent = '🎉 BİLGİSAYAR AÇILDI VE AĞA BAĞLANDI!';
            appendLog('🎉 Bilgisayar başarıyla açıldı ve çevrimiçi oldu!', 'success');
            checkPcStatus();
            setTimeout(() => wakeFeedback.classList.add('hidden'), 5000);
            return;
          }
        } catch (_) {}

        if (attempts >= 18) {
          clearInterval(pingCheckTimer);
          btnWake.classList.remove('waking');
          isWaking = false;
          wakeFeedbackMsg.textContent = 'Sinyal gitti ancak henüz ping alınamadı (Windows açılıyor olabilir).';
          appendLog('⚠️ Paket gönderildi, BIOS/Windows WoL ayarlarının aktif olduğundan emin olun.', 'warn');
          setTimeout(() => wakeFeedback.classList.add('hidden'), 5000);
        }
      }, 2000);

    } else {
      appendLog(`❌ Hata: ${data.message}`, 'error');
      wakeFeedbackMsg.textContent = data.message;
      btnWake.classList.remove('waking');
      isWaking = false;
      setTimeout(() => wakeFeedback.classList.add('hidden'), 4000);
    }
  } catch (err) {
    appendLog(`❌ İstek başarısız: ${err.message}`, 'error');
    wakeFeedbackMsg.textContent = 'Bağlantı hatası!';
    btnWake.classList.remove('waking');
    isWaking = false;
    setTimeout(() => wakeFeedback.classList.add('hidden'), 4000);
  }
});

// ================= EK GÜÇ YÖNETİMİ =================
async function sendPowerAction(action, confirmText) {
  if (!confirm(confirmText)) return;
  appendLog(`Güç komutu gönderiliyor: ${action}...`, 'warn');
  try {
    const res = await fetch('/api/power', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      appendLog(`✅ ${data.message}`, 'success');
      setTimeout(checkPcStatus, 3000);
    } else {
      appendLog(`❌ ${data.message}`, 'error');
    }
  } catch (err) {
    appendLog(`❌ Bağlantı hatası: ${err.message}`, 'error');
  }
}

btnSleep.addEventListener('click', () => sendPowerAction('sleep', 'Bilgisayarı uyku moduna almak istediğinize emin misiniz?'));
btnRestart.addEventListener('click', () => sendPowerAction('restart', 'Bilgisayarı yeniden başlatmak istediğinize emin misiniz?'));
btnShutdown.addEventListener('click', () => sendPowerAction('shutdown', 'Bilgisayarı kapatmak istediğinize emin misiniz?'));

// ================= AYARLAR MODALI =================
async function loadConfig() {
  try {
    const res = await fetch('/api/config', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success && data.config) {
      const c = data.config;
      cfgMac.value = c.target_mac || '2C:F0:5D:A7:F0:EC';
      cfgIp.value = c.target_ip || '192.168.1.114';
      cfgBroadcast.value = c.broadcast_ip || '192.168.1.255';
      cfgPort.value = c.wol_port || 9;
      displayMac.textContent = c.target_mac;
      displayIp.textContent = `${c.target_ip} : ${c.wol_port}`;
    }
  } catch (_) {}
}

btnSettings.addEventListener('click', () => {
  loadConfig();
  modalSettings.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));
btnCancelSettings.addEventListener('click', () => modalSettings.classList.add('hidden'));

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const updated = {
    target_mac: cfgMac.value.trim(),
    target_ip: cfgIp.value.trim(),
    broadcast_ip: cfgBroadcast.value.trim(),
    wol_port: parseInt(cfgPort.value) || 9
  };

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(updated)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      appendLog('Ağ ve MAC ayarları güncellendi.', 'success');
      modalSettings.classList.add('hidden');
      loadConfig();
      checkPcStatus();
    } else {
      alert('Ayarlar kaydedilemedi: ' + data.message);
    }
  } catch (err) {
    alert('Sunucu hatası: ' + err.message);
  }
});

// ================= REHBER MODALI =================
btnGuide.addEventListener('click', () => modalGuide.classList.remove('hidden'));
btnCloseGuide.addEventListener('click', () => modalGuide.classList.add('hidden'));
btnUnderstoodGuide.addEventListener('click', () => modalGuide.classList.add('hidden'));
