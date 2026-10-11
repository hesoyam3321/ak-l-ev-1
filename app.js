/**
 * Remote PC Wake-on-LAN Controller - Frontend Logic (GitHub Pages & Local Server Uyumlu)
 */

let authToken = sessionStorage.getItem('wol_token') || null;
let statusInterval = null;
let isWaking = false;

// GitHub Pages veya Harici Tünel URL desteği
let backendUrl = localStorage.getItem('backend_url') || '';

function apiUrl(endpoint) {
  if (backendUrl && backendUrl.trim().length > 0) {
    return backendUrl.trim().replace(/\/+$/, '') + endpoint;
  }
  return endpoint;
}

// Varsayılan Ayarlar (Eren PC)
const DEFAULT_CONFIG = {
  target_mac: '2C:F0:5D:A7:F0:EC',
  target_ip: '192.168.1.114',
  broadcast_ip: '192.168.1.255',
  wol_port: 9,
  pc_name: 'Eren PC'
};

function getLocalConfig() {
  try {
    const saved = localStorage.getItem('wol_custom_config');
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch (_) {}
  return { ...DEFAULT_CONFIG };
}

function saveLocalConfig(cfg) {
  localStorage.setItem('wol_custom_config', JSON.stringify(cfg));
}

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
const cfgServerUrl = document.getElementById('cfg-server-url');

const modalGuide = document.getElementById('modal-guide');
const btnGuide = document.getElementById('btn-guide');
const btnCloseGuide = document.getElementById('btn-close-guide');
const btnUnderstoodGuide = document.getElementById('btn-understood-guide');
const guidePhoneUrl = document.getElementById('guide-phone-url');

// ================= BAŞLANGIÇ =================
window.addEventListener('DOMContentLoaded', () => {
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

  btnLogin.querySelector('.btn-text').classList.add('hidden');
  btnLogin.querySelector('.spinner').classList.remove('hidden');

  let loginSuccess = false;
  let responseData = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(apiUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      responseData = await res.json();
      if (responseData.success) {
        loginSuccess = true;
        authToken = responseData.token;
      }
    } else if (res.status === 404) {
      // GitHub Pages statik mod
      if (username === 'admin' && password === '3321') {
        loginSuccess = true;
        authToken = 'gh_static_token_' + Date.now();
      }
    }
  } catch (err) {
    // Sunucuya ulaşılamadı (GitHub Pages veya çevrimdışı)
    if (username === 'admin' && password === '3321') {
      loginSuccess = true;
      authToken = 'gh_static_token_' + Date.now();
    }
  } finally {
    btnLogin.querySelector('.btn-text').classList.remove('hidden');
    btnLogin.querySelector('.spinner').classList.add('hidden');
  }

  if (loginSuccess) {
    sessionStorage.setItem('wol_token', authToken);
    appendLog('Giriş başarılı (admin). Oturum açıldı.', 'success');
    showDashboard();
  } else {
    showLoginError('Hatalı şifre veya kullanıcı adı!');
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
  const localCfg = getLocalConfig();
  displayPcName.textContent = localCfg.pc_name || 'Eren PC';
  displayMac.textContent = localCfg.target_mac || '2C:F0:5D:A7:F0:EC';
  displayIp.textContent = `${localCfg.target_ip} : ${localCfg.wol_port || 9}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(apiUrl('/api/status'), { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (data.success) {
      if (data.online) {
        pcStatusPill.className = 'status-pill online';
        pcStatusLabel.textContent = 'Çevrimiçi (Açık)';
      } else {
        pcStatusPill.className = 'status-pill offline';
        pcStatusLabel.textContent = 'Çevrimdışı (Kapalı)';
      }
      return;
    }
  } catch (err) {
    if (backendUrl) {
      pcStatusPill.className = 'status-pill offline';
      pcStatusLabel.textContent = 'Tünel Bekleniyor';
    } else if (window.location.hostname.includes('github.io')) {
      pcStatusPill.className = 'status-pill offline';
      pcStatusLabel.textContent = 'GitHub Pages Modu';
    } else {
      pcStatusPill.className = 'status-pill offline';
      pcStatusLabel.textContent = 'Çevrimdışı (Kapalı)';
    }
  }
}

// ================= BİLGİSAYARI AÇ (WAKE-ON-LAN) =================
btnWake.addEventListener('click', async () => {
  if (isWaking) return;
  isWaking = true;
  btnWake.classList.add('waking');
  wakeFeedback.classList.remove('hidden');
  wakeFeedbackMsg.textContent = 'Sihirli Paket (Wake-on-LAN) hazırlanıyor...';

  const cfg = getLocalConfig();
  appendLog(`🚀 Wake-on-LAN paketi hedefe yayınlanıyor: ${cfg.target_mac}`, 'info');

  try {
    const res = await fetch(apiUrl('/api/wake'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        mac: cfg.target_mac,
        broadcast: cfg.broadcast_ip,
        port: cfg.wol_port
      })
    });

    if (res.ok) {
      const data = await res.json();
      appendLog(`✅ ${data.message || 'Sinyal başarıyla gönderildi!'}`, 'success');
      wakeFeedbackMsg.textContent = 'Sinyal yollandı! Bilgisayarın açılması bekleniyor...';

      let attempts = 0;
      const pingCheckTimer = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(apiUrl('/api/status'));
          const statusData = await statusRes.json();
          if (statusData.online) {
            clearInterval(pingCheckTimer);
            btnWake.classList.remove('waking');
            isWaking = false;
            wakeFeedbackMsg.textContent = '🎉 BİLGİSAYAR AÇILDI VE ÇEVRİMİÇİ!';
            appendLog('🎉 Bilgisayar başarıyla açıldı ve ağa bağlandı!', 'success');
            checkPcStatus();
            setTimeout(() => wakeFeedback.classList.add('hidden'), 5000);
            return;
          }
        } catch (_) {}

        if (attempts >= 18) {
          clearInterval(pingCheckTimer);
          btnWake.classList.remove('waking');
          isWaking = false;
          wakeFeedbackMsg.textContent = 'Sinyal iletildi. Windows açılıyor olabilir.';
          appendLog('⚠️ Paket gönderildi. BIOS ve Aygıt Yöneticisi WoL ayarlarını kontrol edin.', 'warn');
          setTimeout(() => wakeFeedback.classList.add('hidden'), 5000);
        }
      }, 2000);

    } else {
      throw new Error(`Sunucu Hatası (${res.status})`);
    }
  } catch (err) {
    if (window.location.hostname.includes('github.io') && !backendUrl) {
      appendLog('⚠️ GitHub Pages statik modda çalışıyor. İnternetten evdeki bilgisayarı açmak için Ayarlar > Sunucu URL kısmına tünel adresinizi ekleyin.', 'warn');
      wakeFeedbackMsg.textContent = 'GitHub Pages: Lütfen Ayarlar\'dan tünel linkini bağlayın.';
    } else {
      appendLog(`❌ İstek hatası: ${err.message}`, 'error');
      wakeFeedbackMsg.textContent = 'Bağlantı kurulamadı!';
    }
    btnWake.classList.remove('waking');
    isWaking = false;
    setTimeout(() => wakeFeedback.classList.add('hidden'), 5000);
  }
});

// ================= EK GÜÇ YÖNETİMİ =================
async function sendPowerAction(action, confirmText) {
  if (!confirm(confirmText)) return;
  appendLog(`Güç komutu gönderiliyor: ${action}...`, 'warn');
  try {
    const res = await fetch(apiUrl('/api/power'), {
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
  const localCfg = getLocalConfig();
  cfgMac.value = localCfg.target_mac;
  cfgIp.value = localCfg.target_ip;
  cfgBroadcast.value = localCfg.broadcast_ip;
  cfgPort.value = localCfg.wol_port;
  if (cfgServerUrl) cfgServerUrl.value = backendUrl;

  try {
    const res = await fetch(apiUrl('/api/config'), {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success && data.config) {
      const c = data.config;
      saveLocalConfig(c);
      cfgMac.value = c.target_mac;
      cfgIp.value = c.target_ip;
      cfgBroadcast.value = c.broadcast_ip;
      cfgPort.value = c.wol_port;
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
    wol_port: parseInt(cfgPort.value) || 9,
    pc_name: 'Eren PC'
  };

  saveLocalConfig(updated);

  if (cfgServerUrl) {
    backendUrl = cfgServerUrl.value.trim();
    localStorage.setItem('backend_url', backendUrl);
  }

  try {
    await fetch(apiUrl('/api/config'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(updated)
    });
  } catch (_) {}

  appendLog('Ağ ve MAC ayarları güncellendi.', 'success');
  modalSettings.classList.add('hidden');
  checkPcStatus();
});

// ================= REHBER MODALI =================
btnGuide.addEventListener('click', () => modalGuide.classList.remove('hidden'));
btnCloseGuide.addEventListener('click', () => modalGuide.classList.add('hidden'));
btnUnderstoodGuide.addEventListener('click', () => modalGuide.classList.add('hidden'));
