import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// بيانات مشروعك الجديد (الدقيقة 100%)
window.__firebaseCoreInitialized = true;

const firebaseConfig = {
    apiKey: "AIzaSyAR0VnWy0GFrlevLxybBilw8irzOySV_PY",
    authDomain: "azkar-app-2bd85.firebaseapp.com",
    projectId: "azkar-app-2bd85",
    storageBucket: "azkar-app-2bd85.firebasestorage.app",
    messagingSenderId: "877325786534",
    appId: "1:877325786534:web:2bc8871d6965d3b2d0c367",
    measurementId: "G-V5JYFGG1B1"
};

const DEFAULT_AVATAR_URL = './assets/images/avatar.png';

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const provider = new GoogleAuthProvider();

let hasFetchedInitialCloudState = false;
let autoSyncInFlight = false;

function notify(message, type = 'success') {
    if (window.app && typeof window.app.showToast === 'function') {
        window.app.showToast(message, type);
    }
}

function setElementDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = disabled;
    el.style.opacity = disabled ? '0.7' : '1';
    el.style.pointerEvents = disabled ? 'none' : 'auto';
}

function updateAuthUI(user) {
    const authArea = document.getElementById('authButtonArea');
    const userNameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('modalUserAvatar');

    if (!authArea) return;

    if (user) {
        if (userNameEl) userNameEl.textContent = user.displayName || 'حسابي';
        if (avatarEl) {
            avatarEl.src = user.photoURL || DEFAULT_AVATAR_URL;
            avatarEl.onerror = () => { avatarEl.src = DEFAULT_AVATAR_URL; };
        }

        authArea.innerHTML = `
            <div class="flex-gap">
                <button id="btnSync" class="btn btn--primary" style="padding: 8px 12px; font-size: 0.9rem;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> مزامنة
                </button>
                <button id="btnLogout" class="btn btn--ghost" style="padding: 8px 12px; font-size: 0.9rem; color: #ef4444;">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;

        const logoutBtn = document.getElementById('btnLogout');
        const syncBtn = document.getElementById('btnSync');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    notify('تم تسجيل الخروج');
                } catch (error) {
                    notify('تعذر تسجيل الخروج الآن', 'error');
                }
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', async () => {
                await syncDataToCloud(user.uid, { silent: false, source: 'manual' });
            });
        }
        return;
    }

    if (userNameEl) userNameEl.textContent = 'حسابي';
    if (avatarEl) {
        avatarEl.src = DEFAULT_AVATAR_URL;
        avatarEl.onerror = null;
    }

    authArea.innerHTML = `
        <button id="btnLogin" class="btn btn--primary" style="padding: 8px 12px; font-size: 0.9rem;">
            <i class="fa-brands fa-google"></i> تسجيل الدخول
        </button>
    `;

    const loginBtn = document.getElementById('btnLogin');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            notify('جاري فتح نافذة تسجيل الدخول... ⏳');
            try {
                // نظام النافذة المنبثقة الذي سيحل المشكلة
                const result = await signInWithPopup(auth, provider);
                notify('تم تسجيل الدخول بنجاح! ✅');

                if (!hasFetchedInitialCloudState) {
                    hasFetchedInitialCloudState = true;
                    await fetchDataFromCloud(result.user.uid, { silent: false });
                }
            } catch (error) {
                console.error('[Firebase] Login error:', error);
                notify('تعذر بدء تسجيل الدخول', 'error');
            }
        });
    }
}

async function syncDataToCloud(uid, options = {}) {
    const { silent = false, source = 'manual' } = options;
    if (!uid || !window.storage || !window.storage.state) return false;

    const isOnline = navigator.onLine;
    if (source === 'auto' && autoSyncInFlight) return false;

    if (source === 'auto') {
        autoSyncInFlight = true;
    } else {
        setElementDisabled('btnSync', true);
        if (!silent && isOnline) notify('جاري المزامنة مع السحابة... ⏳');
    }

    try {
        await setDoc(doc(db, "users", uid), {
            state: window.storage.state,
            lastSync: new Date().toISOString()
        });

        if (!silent) {
            if (isOnline) notify('تم حفظ بياناتك بنجاح! ☁️✅');
            else notify('تم الحفظ محلياً، وستتم المزامنة عند عودة الإنترنت 📱✅', 'info');
        }
        return true;
    } catch (error) {
        if (!silent) notify('حدث خطأ أثناء المزامنة', 'error');
        return false;
    } finally {
        if (source === 'auto') autoSyncInFlight = false;
        else setElementDisabled('btnSync', false);
    }
}

async function fetchDataFromCloud(uid, options = {}) {
    const { silent = false } = options;
    if (!uid || !window.storage) return false;

    const isOnline = navigator.onLine;
    if (!isOnline && !silent) notify('أنت غير متصل بالإنترنت، سيتم عرض آخر بيانات محفوظة محلياً 📱', 'info');

    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return false;

        const data = docSnap.data();
        if (!data || !data.state) return false;

        if (typeof window.storage.updateFromCloud === 'function') {
            window.storage.updateFromCloud(data.state);
        } else {
            window.storage.state = { ...window.storage.state, ...data.state };
            window.storage.save();

            if (window.tasks && typeof window.tasks.render === 'function') window.tasks.render();
            if (window.masbaha && typeof window.masbaha.updateUI === 'function') window.masbaha.updateUI();
            if (window.quran && typeof window.quran.checkBookmark === 'function') window.quran.checkBookmark();
        }

        if (!silent) notify('تم استرجاع بياناتك بنجاح! ☁️⬇️');
        return true;
    } catch (error) {
        if (!silent) notify('تعذر استرجاع البيانات من السحابة', 'error');
        return false;
    }
}

window.saveDataToCloud = async function saveDataToCloudFromStorage() {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    return syncDataToCloud(currentUser.uid, { silent: true, source: 'auto' });
};

window.fetchDataFromCloud = async function fetchDataToApp() {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    return fetchDataFromCloud(currentUser.uid, { silent: false });
};

onAuthStateChanged(auth, async user => {
    updateAuthUI(user);

    if (!user) {
        hasFetchedInitialCloudState = false;
        return;
    }

    if (!hasFetchedInitialCloudState) {
        hasFetchedInitialCloudState = true;
        await fetchDataFromCloud(user.uid, { silent: true });
    }
});
