/* ==========================================
   ملف pwa.js (إدارة التثبيت، التحديثات، والمشاركة) - النسخة النهائية المحسنة
   ========================================== */

let deferredPrompt;
let manifestBlobUrl = null;

// ==============================
// توحيد مصدر اللغة (Single Source of Truth)
// ==============================
function getLang() {
  return (window.currentLang === 'en' || window.currentLang === 'ar')
    ? window.currentLang
    : (localStorage.getItem('appLang') || 'ar');
}

function isArabic() {
  return getLang() === 'ar';
}

// ==============================
// دالة ذكية لتنظيف الرابط ومنع أخطاء الـ index.html/
// - تطبيع /index.html -> /
// - ضمان trailing slash للمسارات غير .html
// ==============================
function getCleanUrl() {
  const u = new URL(window.location.href);

  // normalize index.html -> /
  if (u.pathname.endsWith('/index.html')) {
    u.pathname = u.pathname.replace(/\/index\.html$/, '/');
  }

  // ensure trailing slash unless it is a .html (other than index.html)
  if (!u.pathname.endsWith('/')) {
    if (!u.pathname.endsWith('.html')) u.pathname += '/';
  }

  return `${u.origin}${u.pathname}`;
}

// ==============================
// تسجيل وتحديث الـ Service Worker
// ==============================
function initPWA() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/Saber/sw.js', { scope: '/Saber/' })
    .then((reg) => {
      if (reg.waiting) promptUpdate(reg);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            promptUpdate(reg);
          }
        });
      });
    })
    .catch(err => console.error('SW Registration failed:', err));

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function promptUpdate(reg) {
  const msg = isArabic()
    ? 'تحديث جديد متاح! هل تريد التحديث الآن لضمان عمل التطبيق بكفاءة؟'
    : 'New update available! Update now?';

  if (confirm(msg)) {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }
}

// ==============================
// إدارة زر التثبيت (Install Prompt)
// ==============================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

// Retry خفيف محدود لو header غير جاهز بعد
function showInstallButton(retryCount = 0) {
  const header = document.querySelector('header');

  // إن لم يكن DOM جاهزًا بعد، أعد المحاولة مرات قليلة فقط
  if (!header) {
    if (retryCount < 10) setTimeout(() => showInstallButton(retryCount + 1), 50);
    return;
  }

  if (document.getElementById('installAppBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'installAppBtn';
  btn.className = 'sadaqa-btn';
  btn.style.marginTop = '15px';
  btn.style.width = 'auto';
  btn.style.padding = '8px 20px';

  btn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();

    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') btn.style.display = 'none';
    } finally {
      deferredPrompt = null;
    }
  };

  header.appendChild(btn);
  updateInstallBtnLang();
}

function updateInstallBtnLang() {
  const btn = document.getElementById('installAppBtn');
  if (!btn) return;
  btn.textContent = isArabic() ? '📲 تثبيت التطبيق' : '📲 Install App';
}
window.updateInstallBtnLang = updateInstallBtnLang;

// ==============================
// النسخ الآمن (Clipboard + Fallback)
// ==============================
async function safeCopy(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error('Clipboard API not available');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      ta.remove();
      return false;
    }
  }
}
window.safeCopy = window.safeCopy || safeCopy;

// ==============================
// المانيفست الديناميكي (مع حماية الذاكرة + icons absolute)
// ==============================
window.updateDynamicManifest = function (deceasedName) {
  const baseIconPath = `${window.location.origin}/Saber/icons/`;

  const manifest = {
    name: `صدقة جارية | ${deceasedName}`,
    short_name: 'صدقة جارية',
    start_url: getCleanUrl() + window.location.search,
    display: 'standalone',
    background_color: '#1E6F5C',
    theme_color: '#1E6F5C',
    icons: [
      { src: `${baseIconPath}icon-192x192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${baseIconPath}icon-512x512.png`, sizes: '512x512', type: 'image/png' }
    ]
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });

  if (manifestBlobUrl) URL.revokeObjectURL(manifestBlobUrl);
  manifestBlobUrl = URL.createObjectURL(blob);

  let manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = manifestBlobUrl;
};

// ==============================
// المشاركة
// ==============================
window.shareCurrentPage = function () {
  const currentUrl = getCleanUrl() + window.location.search;
  const deceasedName = window.currentDeceasedName || 'من نحب';

  const title = isArabic() ? `صدقة جارية | ${deceasedName}` : `Sadaqa | ${deceasedName}`;
  const text = isArabic()
    ? `نسألكم الدعاء وقراءة الأذكار بنية الصدقة الجارية عن ${deceasedName}`
    : `Please pray and read Azkar for ${deceasedName}`;

  if (navigator.share) {
    navigator.share({ title, text, url: currentUrl }).catch(() => {});
  } else {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' \n ' + currentUrl)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
};

// ==============================
// توليد روابط الصدقة الجارية
// ==============================
window.generateSadaqaLink = function () {
  const nameInputEl = document.getElementById('deceasedNameInput');
  const nameInput = (nameInputEl?.value || '').trim();

  if (!nameInput) {
    alert(isArabic() ? 'يرجى إدخال الاسم أولاً' : 'Please enter a name');
    return;
  }

  const genderElement = document.querySelector('input[name="gender"]:checked');
  const gender = genderElement ? genderElement.value : 'm';

  const cleanBase = getCleanUrl();
  const generatedUrl = `${cleanBase}?name=${encodeURIComponent(nameInput)}&g=${gender}`;

  document.getElementById('generatedLinkUrl').value = generatedUrl;
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';

  if (typeof gtag === 'function') {
    gtag('event', 'generate_link', {
      event_category: 'Sadaqa',
      event_label: nameInput
    });
  }
};

// ==============================
// نسخ الرسالة مع الرابط لزيادة الانتشار
// ==============================
window.copyLinkAction = async function () {
  const link = document.getElementById('generatedLinkUrl').value;

  const rawName = (document.getElementById('deceasedNameInput')?.value || '').trim();
  const displayName = rawName || window.currentDeceasedName || (isArabic() ? 'من نحب' : 'a loved one');

  const viralMessage = isArabic()
    ? `صدقة جارية عن روح ${displayName} 🤲\nشاركونا الأجر واقرأوا الأذكار والقرآن من هنا:\n${link}`
    : `Sadaqa Jariyah for ${displayName} 🤲\nPlease read Azkar and Quran here:\n${link}`;

  const success = await safeCopy(viralMessage);
  if (success) {
    const btn = document.querySelector('.btn-outline');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = isArabic() ? '✅ تم النسخ!' : '✅ Copied!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    }
  }
};

// ==============================
// فتح الرابط في تبويب جديد لتحسين الـ UX
// ==============================
window.openLinkAction = function () {
  const link = document.getElementById('generatedLinkUrl').value;
  window.open(link, '_blank', 'noopener,noreferrer');
};

// تشغيل الـ PWA عند تحميل الصفحة
window.addEventListener('load', initPWA);
