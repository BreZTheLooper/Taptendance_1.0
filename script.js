console.log('Taptendance script loaded');

/* =========================================================
   CONFIG
   - ACCESS_CODE gates signup instead of a hardcoded personal
     email allowlist (that leaked real people's addresses into
     a public repo). Change this before you deploy, and share
     it only with people who should be able to create accounts.
   - Demo credentials are intentionally public — they exist so
     anyone can try the app without an access code.
========================================================= */
const ACCESS_CODE = 'ASTECH2026';
const DEMO_EMAIL = 'demo@taptendance.app';
const DEMO_PASSWORD = 'demo1234';

const STORAGE = {
  users: 'taptendance_users',
  currentUser: 'taptendance_current_user',
  records: 'taptendance_records',
  demoSeeded: 'taptendance_demo_seeded'
};

/* =========================================================
   AUTH — client-side only (no backend on GitHub Pages).
   Accounts live in this browser's localStorage, so a signup
   on one device won't be visible on another. That's a real
   limitation of a fully static, no-backend deployment — the
   demo account exists specifically so testers don't need an
   account of their own on every device.
========================================================= */
async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE.users) || '{}'); } catch (e) { return {}; }
}

function saveUserToStore(email, passHash) {
  const users = getStoredUsers();
  users[email.toLowerCase()] = { hash: passHash, created: new Date().toISOString() };
  localStorage.setItem(STORAGE.users, JSON.stringify(users));
}

function getUserFromStore(email) {
  return getStoredUsers()[email.toLowerCase()] || null;
}

function setCurrentUser(email) {
  localStorage.setItem(STORAGE.currentUser, email.toLowerCase());
  updateHeaderForUser(email);
}

function getCurrentUser() {
  return localStorage.getItem(STORAGE.currentUser) || null;
}

function clearCurrentUser() {
  localStorage.removeItem(STORAGE.currentUser);
  updateHeaderForUser(null);
}

function updateHeaderForUser(email) {
  const title = document.querySelector('.header-title');
  const badge = document.getElementById('demo-badge');
  if (!email) {
    if (title) title.textContent = 'Taptendance';
    if (badge) badge.style.display = 'none';
    return;
  }
  if (title) title.textContent = `Taptendance — ${email.split('@')[0]}`;
  if (badge) badge.style.display = email.toLowerCase() === DEMO_EMAIL ? 'inline-flex' : 'none';
}

async function ensureDemoAccountExists() {
  const existing = getUserFromStore(DEMO_EMAIL);
  if (existing) return;
  const hash = await hashPassword(DEMO_PASSWORD);
  saveUserToStore(DEMO_EMAIL, hash);
}

function openAuthModal(showSignup = true) {
  if (window.location.hash && window.location.hash.startsWith('#session=')) {
    console.warn('Auth modal suppressed: running in student session mode');
    return;
  }
  document.getElementById('auth-modal').style.display = 'flex';
  document.getElementById('auth-signup-form').style.display = showSignup ? 'block' : 'none';
  document.getElementById('auth-login-form').style.display = showSignup ? 'none' : 'block';
  document.getElementById('auth-tab-signup')?.classList.toggle('active-tab', showSignup);
  document.getElementById('auth-tab-login')?.classList.toggle('active-tab', !showSignup);
}
function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }

async function logInAs(email) {
  setCurrentUser(email);
  closeAuthModal();
  showTeacherRecordsTabs();
}

function wireAuth() {
  document.getElementById('auth-tab-signup')?.addEventListener('click', () => openAuthModal(true));
  document.getElementById('auth-tab-login')?.addEventListener('click', () => openAuthModal(false));

  document.getElementById('auth-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('auth-email-signup').value || '').toLowerCase().trim();
    const pass = document.getElementById('auth-pass-signup').value;
    const passConfirm = document.getElementById('auth-pass-confirm').value;
    const code = (document.getElementById('auth-access-code').value || '').trim();

    if (!email || !pass) { showToast('Invalid', 'Email and password are required', 'error'); return; }
    if (pass.length < 6) { showToast('Weak Password', 'Password must be at least 6 characters', 'error'); return; }
    if (pass !== passConfirm) { showToast('Mismatch', 'Passwords do not match', 'error'); return; }
    if (code !== ACCESS_CODE) { showToast('Invalid Access Code', 'Ask your admin for the current access code', 'error'); return; }
    if (getUserFromStore(email)) { showToast('Account Exists', 'Try logging in instead', 'error'); return; }

    try {
      const hash = await hashPassword(pass);
      saveUserToStore(email, hash);
      await logInAs(email);
      showToast('Account Created', 'You are now signed in', 'success');
    } catch (err) {
      console.error('Signup error', err);
      showToast('Error', 'Failed to create account', 'error');
    }
  });

  document.getElementById('auth-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('auth-email-login').value || '').toLowerCase().trim();
    const pass = document.getElementById('auth-pass-login').value;
    if (!email || !pass) { showToast('Invalid', 'Email and password are required', 'error'); return; }

    const user = getUserFromStore(email);
    if (!user) { showToast('Not Found', 'No account found for this email', 'error'); return; }
    try {
      const hash = await hashPassword(pass);
      if (hash !== user.hash) { showToast('Invalid', 'Incorrect password', 'error'); return; }
      await logInAs(email);
      showToast('Signed In', 'Welcome back', 'success');
    } catch (err) {
      console.error('Login error', err);
      showToast('Error', 'Login failed', 'error');
    }
  });

  // One-click demo login (works from either tab)
  document.querySelectorAll('.demo-login-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await ensureDemoAccountExists();
      await logInAs(DEMO_EMAIL);
      showToast('Demo Mode', 'Signed in as the demo teacher account', 'success');
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (!confirm('Sign out now?')) return;
    clearCurrentUser();
    showToast('Signed out', 'You have been signed out', 'success');
    setTimeout(() => openAuthModal(false), 200);
  });
}

function initAuthState() {
  const existing = getCurrentUser();
  const inStudentSession = window.location.hash && window.location.hash.startsWith('#session=');
  if (!existing && !inStudentSession) {
    setTimeout(() => openAuthModal(false), 300);
  } else if (existing) {
    updateHeaderForUser(existing);
  }
}

/* =========================================================
   ATTENDANCE RECORDS — persisted to localStorage so a page
   refresh no longer wipes the session's attendance data.
========================================================= */
let attendanceRecords = [];
let currentFilter = 'all';

function loadRecords() {
  try {
    attendanceRecords = JSON.parse(localStorage.getItem(STORAGE.records) || '[]');
  } catch (e) {
    attendanceRecords = [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE.records, JSON.stringify(attendanceRecords));
  } catch (e) {
    console.warn('Failed to save records to localStorage', e);
  }
}

function seedDemoRecords() {
  const now = Date.now();
  const sample = [
    { id: '21-0001', name: 'Ava Santos', course: 'BSCPE', year: '2', section: 'A', minsAgo: 95, out: 10 },
    { id: '21-0002', name: 'Liam Cruz', course: 'BSCPE', year: '2', section: 'A', minsAgo: 90, out: 5 },
    { id: '21-0003', name: 'Mia Reyes', course: 'BSIT', year: '3', section: 'B', minsAgo: 80, out: null },
    { id: '21-0004', name: 'Noah Bautista', course: 'BSCPE', year: '2', section: 'A', minsAgo: 75, out: null },
    { id: '21-0005', name: 'Zoe Fernandez', course: 'BSIT', year: '3', section: 'B', minsAgo: 60, out: 3 },
    { id: '21-0006', name: 'Ethan Garcia', course: 'BSCPE', year: '2', section: 'A', minsAgo: 40, out: null }
  ];
  const seeded = sample.map(s => {
    const timeIn = new Date(now - s.minsAgo * 60000).toISOString();
    const timeOut = s.out !== null ? new Date(now - s.out * 60000).toISOString() : null;
    return {
      id: s.id, name: s.name, course: s.course, year: s.year, section: s.section,
      timestamp: timeIn, timeIn, timeOut
    };
  });
  attendanceRecords = seeded.concat(attendanceRecords);
  saveRecords();
  updateRecordsTable();
}

/* =========================================================
   INIT
========================================================= */
async function initializeApp() {
  await ensureDemoAccountExists();
  loadRecords();
  updateRecordsTable();
  await loadCameras();

  document.getElementById('camera-select')?.addEventListener('change', (e) => {
    selectedCameraId = e.target.value;
  });

  showTeacherRecordsTabs();
  checkSessionURL();
  wireAuth();
  initAuthState();
}

let videoElement = null;
let canvasElement = null;
let canvasContext = null;
let isScannerRunning = false;
let scanInterval = null;
let selectedCameraId = null;
let lastScanTime = 0;
let scanAttempts = 0;
const SCAN_COOLDOWN = 7000; // 7 seconds

async function loadCameras() {
  try {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      console.log('Camera permission not granted yet');
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');

    const cameraSelect = document.getElementById('camera-select');
    if (!cameraSelect) return;
    cameraSelect.innerHTML = '';

    if (videoDevices.length > 0) {
      videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
      });

      selectedCameraId = videoDevices[0].deviceId;
      const backCameraIndex = videoDevices.findIndex(device =>
        (device.label || '').toLowerCase().includes('back') ||
        (device.label || '').toLowerCase().includes('rear') ||
        (device.label || '').toLowerCase().includes('environment')
      );
      if (backCameraIndex >= 0) {
        cameraSelect.selectedIndex = backCameraIndex;
        selectedCameraId = videoDevices[backCameraIndex].deviceId;
      }
    } else {
      cameraSelect.innerHTML = '<option value="">No cameras found - Click Refresh</option>';
    }
  } catch (err) {
    console.error('Failed to get cameras:', err);
    const sel = document.getElementById('camera-select');
    if (sel) sel.innerHTML = '<option value="">Error - Click Refresh</option>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refresh-cameras')?.addEventListener('click', async () => {
    showToast('Refreshing', 'Scanning for cameras...', 'success');
    await loadCameras();
  });
});

initializeApp();

let currentSessionData = null;

function checkSessionURL() {
  const hash = window.location.hash;
  if (!hash.startsWith('#session=')) return;
  try {
    const encodedData = hash.substring(9);
    const sessionData = JSON.parse(atob(encodedData));
    currentSessionData = sessionData;

    document.querySelector('.tab[data-screen="student"]')?.click();
    showStudentOnlyTab();
    closeAuthModal();

    const formElement = document.getElementById('student-form');
    const noSessionMessage = document.getElementById('no-session-message');
    if (formElement && noSessionMessage) {
      noSessionMessage.style.display = 'none';
      formElement.style.display = 'block';
      ['student-id', 'student-name', 'student-course', 'student-year', 'student-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }
    showSessionInfo();
  } catch (error) {
    console.error('Failed to parse session data:', error);
  }
}

function showSessionInfo() {
  const infoContainer = document.getElementById('param-note-list');
  if (!infoContainer) return;
  infoContainer.innerHTML = `<p style="color: var(--text-secondary); margin: 0;">Session active. Please fill in your information below.</p>`;
}

function tabClickHandler(evt) {
  const el = this && this.dataset ? this : (evt && evt.currentTarget) ? evt.currentTarget : null;
  if (!el) return;
  const target = el.dataset.screen;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(`${target}-screen`)?.classList.add('active');
}

function showStudentOnlyTab() {
  const tabs = document.querySelectorAll('.tab');
  if (!tabs || tabs.length === 0) return;
  tabs.forEach(tab => {
    if (tab.dataset && tab.dataset.screen === 'student') {
      tab.style.display = '';
      tab.classList.add('active');
      tab.removeEventListener('click', tabClickHandler);
      tab.addEventListener('click', tabClickHandler);
    } else {
      tab.style.display = 'none';
      tab.classList.remove('active');
    }
  });
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('student-screen')?.classList.add('active');
  const switcher = document.querySelector('.tab-switcher-content');
  if (switcher) switcher.style.justifyContent = 'center';
}

function showTeacherRecordsTabs() {
  const tabs = document.querySelectorAll('.tab');
  if (!tabs || tabs.length === 0) return;
  tabs.forEach(tab => {
    const screen = tab.dataset && tab.dataset.screen;
    tab.style.display = screen === 'student' ? 'none' : '';
    if (screen === 'student') tab.classList.remove('active');
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const teacherTab = document.querySelector('.tab[data-screen="teacher"]');
  if (teacherTab) {
    teacherTab.classList.add('active');
    document.getElementById('teacher-screen')?.classList.add('active');
  }
  const switcher = document.querySelector('.tab-switcher-content');
  if (switcher) switcher.style.justifyContent = 'center';
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.removeEventListener('click', tabClickHandler);
  tab.addEventListener('click', tabClickHandler);
});

const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle?.querySelector('.theme-icon');
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  if (themeIcon) themeIcon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
  localStorage.setItem('taptendance_theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
if (localStorage.getItem('taptendance_theme') === 'dark') {
  document.body.classList.add('dark-mode');
  if (themeIcon) themeIcon.textContent = '☀️';
}

function showToast(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  document.getElementById('toast-container')?.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showModal(modalId) { document.getElementById(modalId)?.style && (document.getElementById(modalId).style.display = 'flex'); }
function hideModal(modalId) { document.getElementById(modalId)?.style && (document.getElementById(modalId).style.display = 'none'); }

/* =========================================================
   SCANNER
========================================================= */
document.getElementById('start-scanner')?.addEventListener('click', async () => {
  if (isScannerRunning) {
    showToast('Scanner Active', 'Scanner is already running', 'warning');
    return;
  }
  if (typeof jsQR === 'undefined') {
    showToast('Library Error', 'QR scanner library not loaded. Please refresh the page.', 'error');
    return;
  }

  try {
    videoElement = document.getElementById('scanner-video') || document.createElement('video');
    canvasElement = document.getElementById('scanner-canvas') || document.createElement('canvas');
    canvasContext = canvasElement.getContext('2d');
    videoElement.setAttribute('playsinline', '');
    videoElement.style.objectFit = 'cover';

    const constraints = {
      video: {
        deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: selectedCameraId ? undefined : 'environment'
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;

    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => { videoElement.play(); resolve(); };
    });

    const vW = videoElement.videoWidth || videoElement.clientWidth || 640;
    const vH = videoElement.videoHeight || videoElement.clientHeight || 480;
    canvasElement.width = vW;
    canvasElement.height = vH;

    document.getElementById('scanner-idle')?.classList.add('hidden');
    document.getElementById('start-scanner') && (document.getElementById('start-scanner').style.display = 'none');
    document.getElementById('stop-scanner') && (document.getElementById('stop-scanner').style.display = 'block');

    lastScanTime = 0;
    scanAttempts = 0;
    isScannerRunning = true;

    scanInterval = setInterval(() => {
      try {
        if (!videoElement || videoElement.readyState < 2) return;
        scanAttempts++;
        if (!canvasElement) {
          canvasElement = document.createElement('canvas');
          canvasContext = canvasElement.getContext('2d');
        }
        const w = videoElement.videoWidth || videoElement.clientWidth || 640;
        const h = videoElement.videoHeight || videoElement.clientHeight || 480;
        if (w === 0 || h === 0) return;
        if (canvasElement.width !== w || canvasElement.height !== h) {
          canvasElement.width = w;
          canvasElement.height = h;
        }
        canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        let imageData;
        try {
          imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
        } catch (err) {
          return;
        }
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        if (!code) return;
        const now = Date.now();
        if (now - lastScanTime >= SCAN_COOLDOWN) {
          lastScanTime = now;
          handleScan(code.data);
        }
      } catch (err) {
        console.error('Scan loop error:', err);
      }
    }, 100);

    showToast('Scanner Started', 'Point camera at QR code', 'success');
  } catch (err) {
    console.error('Scanner start failed:', err);
    showToast('Scanner Error', err.message || 'Failed to start scanner', 'error');
    document.getElementById('scanner-idle')?.classList.remove('hidden');
    document.getElementById('start-scanner') && (document.getElementById('start-scanner').style.display = 'block');
    document.getElementById('stop-scanner') && (document.getElementById('stop-scanner').style.display = 'none');
    isScannerRunning = false;
  }
});

document.getElementById('stop-scanner')?.addEventListener('click', () => {
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
  }
  isScannerRunning = false;
  lastScanTime = 0;
  document.getElementById('scanner-idle')?.classList.remove('hidden');
  document.getElementById('start-scanner') && (document.getElementById('start-scanner').style.display = 'block');
  document.getElementById('stop-scanner') && (document.getElementById('stop-scanner').style.display = 'none');
  showToast('Scanner Stopped', 'Camera stopped', 'success');
});

document.getElementById('test-camera')?.addEventListener('click', async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    if (videoDevices.length === 0) {
      showToast('No Cameras', 'No camera devices found on this system', 'error');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    showToast('Camera Test Success', `Found ${videoDevices.length} camera(s) and successfully accessed them`, 'success');
    await loadCameras();
  } catch (err) {
    let msg = 'Camera test failed: ' + (err.message || err.name || '');
    if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access in browser settings.';
    else if (err.name === 'NotFoundError') msg = 'No camera found. Please connect a camera.';
    else if (err.name === 'NotReadableError') msg = 'Camera is in use by another application.';
    showToast('Camera Test Failed', msg, 'error');
  }
});

document.getElementById('scan-image-btn')?.addEventListener('click', () => {
  document.getElementById('qr-image-input')?.click();
});

document.getElementById('qr-image-input')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    showToast('Scanning', 'Analyzing image for QR code...', 'info');
    if (typeof jsQR === 'undefined') throw new Error('QR library not loaded');
    const img = new Image();
    const imageUrl = URL.createObjectURL(file);
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('Failed to load image')); img.src = imageUrl; });
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    URL.revokeObjectURL(imageUrl);
    if (code) {
      handleScan(code.data);
    } else {
      showToast('No QR Code', 'No QR code found in this image', 'error');
    }
  } catch (err) {
    showToast('Scan Failed', 'Error scanning image: ' + (err.message || err), 'error');
  } finally {
    e.target.value = '';
  }
});

/* =========================================================
   HANDLE SCAN — no more IP/LAN gating, just record attendance.
========================================================= */
function handleScan(data) {
  if (!data || data.length === 0) {
    showToast('Invalid QR', 'QR code contains no data', 'error');
    return;
  }

  try {
    const parsed = JSON.parse(data);

    if (parsed.type === 'attendance' && parsed.name && parsed.id) {
      const studentId = parsed.id || '';

      const existingOpenRecord = attendanceRecords.find(r => r.id === studentId && !r.timeOut);
      if (existingOpenRecord) {
        existingOpenRecord.timeOut = new Date().toISOString();
        saveRecords();
        updateRecordsTable();
        showToast('Time Out Recorded', `${existingOpenRecord.name} marked out`, 'success');
        return;
      }

      const anyRecord = attendanceRecords.find(r => r.id === studentId);
      if (anyRecord) {
        showToast('Already Recorded', `${anyRecord.name} already has an attendance entry`, 'warning');
        return;
      }

      const now = new Date();
      const record = {
        id: parsed.id || '',
        name: parsed.name,
        course: parsed.course || '',
        year: parsed.year || '',
        section: parsed.section || '',
        timestamp: now.toISOString(),
        timeIn: now.toISOString(),
        timeOut: null
      };

      attendanceRecords.push(record);
      saveRecords();
      updateRecordsTable();
      showToast('Time-in Recorded', `${parsed.name} added to records`, 'success');
      return;
    }

    if (parsed.name && parsed.id) {
      showToast('QR Scanned', 'Legacy format: ' + parsed.name, 'info');
    } else {
      showToast('QR Scanned', 'Data: ' + JSON.stringify(parsed).substring(0, 50), 'success');
    }
  } catch (e) {
    if (String(data).startsWith('http://') || String(data).startsWith('https://')) {
      showToast('URL Scanned', String(data).substring(0, 50) + '...', 'success');
    } else {
      showToast('QR Code Scanned', 'Content: ' + String(data).substring(0, 50), 'success');
    }
  }
}

document.getElementById('modal-close')?.addEventListener('click', () => hideModal('lan-modal'));

/* =========================================================
   SESSION QR — a lightweight join token, no IP matching.
========================================================= */
document.getElementById('generate-qr-btn')?.addEventListener('click', () => {
  const sessionData = { id: Math.random().toString(36).slice(2, 10), timestamp: new Date().toISOString() };
  const encodedData = btoa(JSON.stringify(sessionData));
  const baseUrl = window.location.href.split('#')[0];
  const sessionUrl = `${baseUrl}#session=${encodedData}`;

  const qrContainer = document.getElementById('qr-preview');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    const qr = new QRious({ element: document.createElement('canvas'), value: sessionUrl, size: 320, level: 'L' });
    qrContainer.appendChild(qr.canvas);
    document.getElementById('copy-url') && (document.getElementById('copy-url').disabled = false);
    document.getElementById('copy-url') && (document.getElementById('copy-url').dataset.url = sessionUrl);
    showToast('Session QR Created', 'Students can scan this to join', 'success');
  }
});

document.getElementById('copy-url')?.addEventListener('click', () => {
  const url = document.getElementById('copy-url')?.dataset.url || window.location.href;
  navigator.clipboard.writeText(url).then(() => showToast('Copied', 'Join URL copied to clipboard', 'success')).catch(() => showToast('Error', 'Failed to copy URL', 'error'));
});

document.getElementById('student-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentSessionData) { showToast('No Session', 'No active session detected', 'error'); return; }

  const studentId = document.getElementById('student-id')?.value.trim();
  const studentName = document.getElementById('student-name')?.value.trim();
  const studentCourse = document.getElementById('student-course')?.value.trim();
  const studentYear = document.getElementById('student-year')?.value.trim();
  const studentSection = document.getElementById('student-section')?.value.trim();

  if (!studentId || !studentName || !studentCourse || !studentYear || !studentSection) {
    showToast('Missing Information', 'Please fill in all fields', 'error');
    return;
  }

  const attendanceData = {
    type: 'attendance',
    id: studentId,
    name: studentName,
    course: studentCourse,
    year: studentYear,
    section: studentSection,
    timestamp: new Date().toISOString(),
    sessionId: currentSessionData ? currentSessionData.id : null
  };

  const qrData = JSON.stringify(attendanceData);
  const studentQRContainer = document.createElement('div');
  studentQRContainer.className = 'student-qr-overlay';
  const qrCard = document.createElement('div');
  qrCard.className = 'student-qr-card';
  qrCard.innerHTML = `<h3 style="margin:0 0 24px 0;">Your Attendance QR</h3><div id="student-qr-display" style="display:inline-block; padding:16px; background:white; border-radius:12px;"></div><p style="margin:24px 0 8px 0;">Show this to the admin scanner</p><div style="display:flex; gap:12px; justify-content:center;"><button id="download-qr-btn" class="btn-primary">Download QR</button><button id="close-student-qr" class="btn-secondary">Close</button></div>`;
  studentQRContainer.appendChild(qrCard);
  document.body.appendChild(studentQRContainer);
  const qr = new QRious({ element: document.createElement('canvas'), value: qrData, size: 500, level: 'L' });
  document.getElementById('student-qr-display')?.appendChild(qr.canvas);

  document.getElementById('download-qr-btn')?.addEventListener('click', () => {
    const canvas = document.querySelector('#student-qr-display canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `attendance-${studentId || Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      showToast('Downloaded', 'QR code saved successfully', 'success');
    }
  });

  document.getElementById('close-student-qr')?.addEventListener('click', () => studentQRContainer.remove());
  studentQRContainer.addEventListener('click', (ev) => { if (ev.target === studentQRContainer) studentQRContainer.remove(); });
  showToast('QR Generated', 'Show this QR to the admin scanner', 'success');
});

function generateInfoQRCodes() {
  if (typeof QRious === 'undefined') return;
  const howToUrl = 'mailto:https://drive.google.com/file/d/1KVUd74mg31V0T5XtKLWx9D78JQsrS06j/view?usp=drive_link?subject=Taptendance%20How to use';
  const suggestionsUrl = 'mailto:verdienentech@gmail.com?subject=Taptendance%20Suggestion';
  const contactUrl = 'mailto:keancurveyintoyuntiveros@gmail.com?subject=Contact%20Taptendance';

  const map = [
    { id: 'qr-howto', value: howToUrl, size: 140 },
    { id: 'qr-suggestions', value: suggestionsUrl, size: 140 },
    { id: 'qr-contact', value: contactUrl, size: 140 }
  ];

  map.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;
    el.innerHTML = '';
    try {
      const canvas = document.createElement('canvas');
      new QRious({ element: canvas, value: item.value, size: item.size, level: 'M' });
      el.appendChild(canvas);
    } catch (e) {
      const p = document.createElement('pre');
      p.textContent = item.value;
      p.style.fontSize = '12px';
      p.style.whiteSpace = 'pre-wrap';
      el.appendChild(p);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  generateInfoQRCodes();
  const testQrDiv = document.getElementById('simple-test-qr');
  if (testQrDiv && typeof QRious !== 'undefined') {
    testQrDiv.innerHTML = '';
    const qr = new QRious({ element: document.createElement('canvas'), value: 'HELLO', size: 120, level: 'L' });
    testQrDiv.appendChild(qr.canvas);
  }
});

/* =========================================================
   RECORDS TABLE
========================================================= */
function parseToDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  const alt = new Date(String(value).replace(' ', 'T'));
  return isNaN(alt.getTime()) ? null : alt;
}

function formatTimeDecimal(date) {
  const d = parseToDate(date);
  if (!d) return '-';
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return (h + (m / 60) + (s / 3600)).toFixed(2);
}

function computeDurationDecimal(timeIn, timeOut) {
  const tIn = parseToDate(timeIn);
  const tOut = parseToDate(timeOut);
  if (!tIn || !tOut) return null;
  const diffMs = tOut.getTime() - tIn.getTime();
  if (diffMs <= 0) return 0;
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
}

function markTimeOut(index) {
  const filteredRecords = filterRecords();
  const record = filteredRecords[index];
  if (!record) return;
  const actualIndex = attendanceRecords.findIndex(r => r.id === record.id && r.timestamp === record.timestamp);
  if (actualIndex !== -1) {
    attendanceRecords[actualIndex].timeOut = new Date().toISOString();
    saveRecords();
    updateRecordsTable();
    showToast('Time Out Recorded', `${record.name} marked as timed out`, 'success');
  }
}

function markAllOut() {
  const nowIso = new Date().toISOString();
  let changed = 0;
  for (let i = 0; i < attendanceRecords.length; i++) {
    if (!attendanceRecords[i].timeOut) {
      attendanceRecords[i].timeOut = nowIso;
      changed++;
    }
  }
  if (changed === 0) {
    showToast('No Open Records', 'There are no open records to mark out', 'info');
    return;
  }
  saveRecords();
  updateRecordsTable();
  showToast('Time Out Recorded', `Marked ${changed} record${changed > 1 ? 's' : ''} as timed out`, 'success');
}

function clearAllRecords() {
  attendanceRecords = [];
  saveRecords();
  updateRecordsTable();
  showToast('Records Cleared', 'All attendance records have been removed', 'success');
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mark-all-out')?.addEventListener('click', () => {
    if (confirm('Mark all currently open records as timed out now?')) markAllOut();
  });
  document.getElementById('clear-all-records')?.addEventListener('click', () => {
    if (attendanceRecords.length === 0) { showToast('No Records', 'There are no records to clear', 'info'); return; }
    if (confirm('This will permanently delete all attendance records. Continue?')) clearAllRecords();
  });
  document.getElementById('seed-demo-records')?.addEventListener('click', () => {
    seedDemoRecords();
    showToast('Sample Data Added', 'A handful of demo attendance records were added', 'success');
  });
});

function filterRecords() {
  const search = (document.getElementById('search-records')?.value || '').toLowerCase().trim();
  const now = new Date();
  return attendanceRecords.filter(r => {
    if (!r) return false;
    if (currentFilter === 'today') {
      const d = parseToDate(r.timestamp || r.timeIn);
      if (!d || d.toDateString() !== now.toDateString()) return false;
    } else if (currentFilter === 'this-week' || currentFilter === 'week') {
      const d = parseToDate(r.timestamp || r.timeIn);
      if (!d) return false;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      if (d < startOfWeek) return false;
    }
    if (search) {
      const hay = `${r.id} ${r.name}`.toLowerCase();
      return hay.includes(search);
    }
    return true;
  });
}

function updateRecordsTable() {
  const tbody = document.getElementById('records-tbody');
  if (!tbody) return;
  const filteredRecords = filterRecords();
  tbody.innerHTML = '';
  if (filteredRecords.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-state"><p>No records found</p></div></td></tr>`;
    return;
  }
  filteredRecords.forEach((record, index) => {
    const row = document.createElement('tr');
    const idCell = document.createElement('td'); idCell.textContent = record.id || '';
    const nameCell = document.createElement('td'); nameCell.textContent = record.name || '';
    const courseCell = document.createElement('td'); courseCell.textContent = record.course || '-';
    const yearCell = document.createElement('td'); yearCell.textContent = record.year || '-';
    const sectionCell = document.createElement('td'); sectionCell.textContent = record.section || '-';

    const dateCell = document.createElement('td');
    const dateObj = parseToDate(record.timestamp || record.timeIn || record.timeOut);
    dateCell.textContent = dateObj ? dateObj.toLocaleDateString() : '-';
    dateCell.style.fontSize = '14px';

    const timeInCell = document.createElement('td');
    timeInCell.textContent = formatTimeDecimal(record.timeIn || record.timestamp);
    timeInCell.style.fontSize = '14px';

    const timeOutCell = document.createElement('td');
    if (record.timeOut) {
      timeOutCell.textContent = formatTimeDecimal(record.timeOut);
      timeOutCell.style.fontSize = '14px';
    } else {
      const timeoutBtn = document.createElement('button');
      timeoutBtn.className = 'btn-timeout';
      timeoutBtn.textContent = 'Mark Out';
      timeoutBtn.onclick = () => markTimeOut(index);
      timeOutCell.appendChild(timeoutBtn);
    }

    const remarksCell = document.createElement('td');
    const duration = computeDurationDecimal(record.timeIn || record.timestamp, record.timeOut);
    remarksCell.textContent = duration === null ? (record.timeOut ? '0.00 hrs' : '-') : `${duration} hrs`;
    remarksCell.style.fontSize = '14px';

    row.appendChild(idCell);
    row.appendChild(nameCell);
    row.appendChild(courseCell);
    row.appendChild(yearCell);
    row.appendChild(sectionCell);
    row.appendChild(dateCell);
    row.appendChild(timeInCell);
    row.appendChild(timeOutCell);
    row.appendChild(remarksCell);
    tbody.appendChild(row);
  });
}

/* =========================================================
   EXPORT (XLSX)
========================================================= */
document.getElementById('export-records')?.addEventListener('click', () => {
  if (attendanceRecords.length === 0) {
    showToast('No Records', 'No attendance records to export', 'error');
    return;
  }

  const exportTitleInput = document.getElementById('export-title');
  const rawTitle = (exportTitleInput?.value || '').trim();
  const today = new Date().toISOString().split('T')[0];
  const exportTitle = rawTitle || `Attendance Records - ${today}`;
  const safeTitle = exportTitle.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '').slice(0, 80).trim().replace(/\s+/g, '_') || `attendance_${today}`;

  const exportData = attendanceRecords.map(record => {
    const duration = computeDurationDecimal(record.timeIn || record.timestamp, record.timeOut);
    const dateVal = parseToDate(record.timestamp || record.timeIn || record.timeOut);
    return {
      ID: record.id,
      Name: record.name,
      Course: record.course,
      Year: record.year,
      Section: record.section,
      Date: dateVal ? dateVal.toLocaleDateString() : '-',
      'Time In': formatTimeDecimal(record.timeIn || record.timestamp),
      'Time Out': record.timeOut ? formatTimeDecimal(record.timeOut) : 'Not marked',
      Remarks: duration !== null ? `${duration} hrs` : (record.timeOut ? '0.00 hrs' : '-')
    };
  });

  function computeColWidths(rows) {
    if (!rows || rows.length === 0) return [];
    const keys = Object.keys(rows[0]);
    return keys.map(key => {
      let maxLen = key.length;
      for (let i = 0; i < rows.length; i++) {
        const len = String(rows[i][key] ?? '').length;
        if (len > maxLen) maxLen = len;
      }
      const scaled = Math.ceil(maxLen * 1.15) + 2;
      return { wch: Math.min(Math.max(scaled, 10), 60) };
    });
  }

  const ws = XLSX.utils.json_to_sheet(exportData, { origin: 2 });
  XLSX.utils.sheet_add_aoa(ws, [[exportTitle]], { origin: 0 });
  XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 1 });

  const colCount = Object.keys(exportData[0] || {}).length;
  if (colCount > 1) {
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } });
  }
  ws['!cols'] = computeColWidths(exportData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const filename = `${safeTitle}_${today}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast('Records Exported', `Records exported to ${filename}`, 'success');
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter || 'all';
    updateRecordsTable();
  });
});

document.getElementById('search-records')?.addEventListener('input', () => updateRecordsTable());
