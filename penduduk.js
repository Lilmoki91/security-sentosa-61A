// ============ FIREBASE INIT ============
const firebaseConfig = {
    apiKey: "AIzaSyDJxq5GPklWfKjuBmOCvJ-zaHrVArmb2pU",
    authDomain: "security-61a-sentosa.firebaseapp.com",
    projectId: "security-61a-sentosa",
    storageBucket: "security-61a-sentosa.appspot.com",
    messagingSenderId: "658849841533",
    appId: "1:658849841533:web:6414cfeaa716a205124c14"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============ CONFIG ============
const DEFAULT_FEE = 50; // Yuran bulanan lalai (ubah mengikut yuran sebenar)
const MONTHS = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
const STATUS = {
    approved: { label: 'Disahkan', chip: 'chip-paid', icon: 'fa-check' },
    pending:  { label: 'Menunggu Semakan', chip: 'chip-wa !bg-amber-100 !text-amber-700', icon: 'fa-hourglass-half' },
    rejected: { label: 'Ditolak', chip: 'chip-unpaid', icon: 'fa-xmark' }
};

// ============ STATE ============
let user = null, profile = null, payments = [], unsubPayments = null;
let period = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
let regType = 'Pemilik', editingProfile = false, currentReceipt = null, heroAction = () => {};

// ============ HELPERS ============
const $ = (id) => document.getElementById(id);
const escapeHtml = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toDate = (ts) => (ts && ts.toDate) ? ts.toDate() : (ts instanceof Date ? ts : new Date());
const money = (n) => 'RM' + (parseFloat(n) || 0).toFixed(2);
const fmtDateTime = (d) => d.toLocaleString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const periodLabel = (m, y) => `${MONTHS[m - 1]} ${y}`;

function showToast(message, type = 'success') {
    $('toastText').textContent = message;
    $('toastIcon').className = type === 'success' ? 'fas fa-check-circle text-green-400' : 'fas fa-exclamation-circle text-yellow-400';
    $('toast').classList.remove('hidden');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => $('toast').classList.add('hidden'), 2800);
}

function setView(name) {
    ['bootView', 'loginView', 'regView', 'appView'].forEach(id => $(id).classList.toggle('hidden', id !== name));
    window.scrollTo(0, 0);
}

function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('hidden', p.id !== 'page-' + name));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === name));
    window.scrollTo({ top: 0 });
}

function normalizePhone(v) {
    let d = String(v).replace(/\D/g, '');
    if (d.startsWith('60')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    return d;
}

// ============ LOGIN (GOOGLE) ============
function showLoginError(msg) {
    $('loginError').textContent = msg;
    $('loginError').classList.remove('hidden');
}

$('googleBtn').addEventListener('click', async () => {
    $('loginError').classList.add('hidden');
    $('googleBtn').disabled = true;
    $('googleBtnText').textContent = 'Sila tunggu...';
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
        await auth.signInWithPopup(provider);
    } catch (e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
            auth.signInWithRedirect(provider);
            return;
        }
        const msg = {
            'auth/popup-closed-by-user': 'Log masuk dibatalkan.',
            'auth/cancelled-popup-request': 'Log masuk dibatalkan.',
            'auth/unauthorized-domain': 'Domain ini belum dibenarkan di Firebase (Authentication > Settings > Authorized domains).',
            'auth/operation-not-allowed': 'Google Sign-In belum diaktifkan di Firebase Authentication.',
            'auth/network-request-failed': 'Tiada sambungan internet.'
        }[e.code] || ('Log masuk gagal: ' + e.message);
        showLoginError(msg);
    } finally {
        $('googleBtn').disabled = false;
        $('googleBtnText').textContent = 'Log Masuk dengan Google';
    }
});

$('logoutBtn').addEventListener('click', () => { if (confirm('Log keluar?')) auth.signOut(); });
$('regLogout').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(async (u) => {
    user = u;
    if (!u) {
        if (unsubPayments) { unsubPayments(); unsubPayments = null; }
        profile = null; payments = [];
        setView('loginView');
        return;
    }
    try {
        const doc = await db.collection('tbb3_users').doc(u.uid).get();
        if (doc.exists) {
            profile = doc.data();
            enterApp();
        } else {
            showRegistration(false);
        }
    } catch (e) {
        console.log(e);
        setView('loginView');
        showLoginError('Gagal memuatkan profil: ' + e.message);
    }
});

// ============ REGISTRATION ============
document.querySelectorAll('.type-btn').forEach(b => b.addEventListener('click', () => setRegType(b.dataset.type)));
function setRegType(t) {
    regType = t;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === t));
}

function showRegistration(isEdit) {
    editingProfile = isEdit;
    $('regStep').textContent = isEdit ? 'Kemaskini Profil' : 'Pendaftaran Penduduk';
    $('regEmail').textContent = user.email;
    $('regName').value = (profile && profile.name) || user.displayName || '';
    $('regSection').value = (profile && profile.section) || '';
    $('regHouse').value = (profile && profile.houseNo) || '';
    $('regPhone').value = (profile && profile.phone) || '';
    $('regConsent').checked = isEdit;
    setRegType((profile && profile.type) || 'Pemilik');
    $('regCancel').classList.toggle('hidden', !isEdit);
    $('regError').classList.add('hidden');
    setView('regView');
}

$('regCancel').addEventListener('click', () => setView('appView'));

$('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('regName').value.trim();
    const section = $('regSection').value;
    const houseNo = $('regHouse').value.trim().toUpperCase();
    const phone = normalizePhone($('regPhone').value);
    const err = (m) => { $('regError').textContent = m; $('regError').classList.remove('hidden'); };

    if (name.length < 3) return err('Sila isi nama penuh.');
    if (!section) return err('Sila pilih seksyen.');
    if (!houseNo) return err('Sila isi nombor rumah.');
    if (phone.length < 9 || phone.length > 11) return err('Nombor WhatsApp tidak sah.');
    if (!$('regConsent').checked) return err('Sila tandakan persetujuan.');

    $('regError').classList.add('hidden');
    $('regSubmit').disabled = true;
    $('regSubmit').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
    try {
        const data = { uid: user.uid, email: user.email, photoURL: user.photoURL || '', name, section, houseNo, phone, type: regType, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (!editingProfile) {
            data.status = 'pending';
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        await db.collection('tbb3_users').doc(user.uid).set(data, { merge: true });
        profile = { ...(profile || {}), ...data, status: (profile && profile.status) || 'pending' };
        showToast('Butiran disimpan! ✅');
        enterApp();
    } catch (ex) {
        err('Gagal simpan: ' + ex.message);
    } finally {
        $('regSubmit').disabled = false;
        $('regSubmit').innerHTML = '<i class="fas fa-check mr-2"></i>Simpan & Teruskan';
    }
});

// ============ APP ============
async function enterApp() {
    setView('appView');
    showPage('home');
    renderHeader();
    renderProfile();
    initPayForm();
    renderAll();

    try {
        const s = await db.collection('tbb3').doc('settings').get();
        if (s.exists && s.data().month && s.data().year) {
            period = { month: parseInt(s.data().month), year: parseInt(s.data().year) };
        }
    } catch (e) { console.log('Settings:', e.message); }
    initPayForm();
    renderAll();

    if (unsubPayments) unsubPayments();
    unsubPayments = db.collection('tbb3_payments').where('uid', '==', user.uid).onSnapshot((snap) => {
        payments = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
        renderAll();
    }, (err) => showToast('Gagal memuatkan bayaran: ' + err.message, 'warning'));
}

function renderHeader() {
    $('hdrName').textContent = profile.name;
    $('hdrHouse').textContent = `Seksyen ${profile.section} • No. ${profile.houseNo}`;
    const av = $('avatar');
    av.innerHTML = '';
    if (profile.photoURL || (user && user.photoURL)) {
        const img = document.createElement('img');
        img.src = profile.photoURL || user.photoURL;
        img.className = 'w-full h-full object-cover';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => { av.textContent = profile.name.charAt(0).toUpperCase(); };
        av.appendChild(img);
    } else {
        av.textContent = profile.name.charAt(0).toUpperCase();
    }
}

function renderProfile() {
    const rows = [
        ['Nama', profile.name], ['Emel', profile.email || user.email],
        ['Seksyen', profile.section], ['No. Rumah', profile.houseNo],
        ['WhatsApp', '+60' + profile.phone], ['Status', profile.type]
    ];
    $('profileRows').innerHTML = rows.map(r => `<div class="receipt-row"><span>${r[0]}</span><span>${escapeHtml(r[1])}</span></div>`).join('');
    const approved = profile.status === 'approved';
    $('profStatus').className = 'chip ' + (approved ? 'chip-paid' : 'chip-wa !bg-amber-100 !text-amber-700');
    $('profStatus').innerHTML = approved ? '<i class="fas fa-check"></i>AKAUN DISAHKAN' : '<i class="fas fa-hourglass-half"></i>MENUNGGU PENGESAHAN';
    $('pendingBanner').classList.toggle('hidden', approved);
}

function paymentFor(m, y) {
    const list = payments.filter(p => p.month === m && p.year === y);
    return list.find(p => p.status === 'approved') || list.find(p => p.status === 'pending') || null;
}

function paymentItem(p) {
    const st = STATUS[p.status] || STATUS.pending;
    return `<button class="resident-card w-full text-left" data-receipt="${p.id}">
        <div class="flex items-center gap-3">
            <div class="house-badge ${p.status === 'approved' ? 'paid' : p.status === 'rejected' ? 'unpaid' : ''}"><i class="fas fa-receipt"></i></div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="font-semibold text-sm text-gray-800 truncate">${periodLabel(p.month, p.year)}</h3>
                    <span class="text-green-600 font-extrabold text-sm">${money(p.amount)}</span>
                </div>
                <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span class="chip ${st.chip}"><i class="fas ${st.icon}"></i>${st.label.toUpperCase()}</span>
                    <span class="text-[10px] text-gray-400">${escapeHtml(p.receiptNo)}</span>
                </div>
            </div>
            <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </div></button>`;
}

function bindReceiptClicks(container) {
    container.querySelectorAll('[data-receipt]').forEach(el => {
        el.addEventListener('click', () => {
            const p = payments.find(x => x.id === el.dataset.receipt);
            if (p) openReceipt(p);
        });
    });
}

function renderAll() {
    if (!profile) return;
    // Hero card
    const cur = paymentFor(period.month, period.year);
    $('heroPeriod').textContent = periodLabel(period.month, period.year);
    $('heroAmount').textContent = money(cur ? cur.amount : DEFAULT_FEE);
    if (cur && cur.status === 'approved') {
        $('heroChip').className = 'chip chip-paid';
        $('heroChip').innerHTML = '<i class="fas fa-check"></i>LUNAS';
        $('heroNote').textContent = 'Terima kasih! Bayaran anda telah disahkan.';
        $('heroBtn').innerHTML = '<i class="fas fa-receipt mr-2"></i>Lihat Resit';
        heroAction = () => openReceipt(cur);
    } else if (cur) {
        $('heroChip').className = 'chip ' + STATUS.pending.chip;
        $('heroChip').innerHTML = '<i class="fas fa-hourglass-half"></i>MENUNGGU SEMAKAN';
        $('heroNote').textContent = 'Bayaran diterima. AJK akan menyemak transaksi anda.';
        $('heroBtn').innerHTML = '<i class="fas fa-receipt mr-2"></i>Lihat Resit';
        heroAction = () => openReceipt(cur);
    } else {
        $('heroChip').className = 'chip chip-unpaid';
        $('heroChip').innerHTML = '<i class="fas fa-xmark"></i>BELUM BAYAR';
        $('heroNote').textContent = 'Bayar melalui QR Touch \'n Go eWallet.';
        $('heroBtn').innerHTML = '<i class="fas fa-qrcode mr-2"></i>Bayar Sekarang';
        heroAction = () => showPage('pay');
    }

    // Summary
    const yearPays = payments.filter(p => p.year === period.year && p.status !== 'rejected');
    $('sumYear').textContent = period.year;
    $('sumPaid').textContent = 'RM' + yearPays.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0).toFixed(0);
    $('sumReceipts').textContent = payments.filter(p => p.status !== 'rejected').length;

    // Lists
    const empty = '<div class="text-center py-8 text-gray-400 text-sm"><i class="fas fa-inbox text-3xl mb-2 text-gray-300"></i><p>Belum ada bayaran</p></div>';
    $('recentList').innerHTML = payments.length ? payments.slice(0, 3).map(paymentItem).join('') : empty;
    $('receiptList').innerHTML = payments.length ? payments.map(paymentItem).join('') : empty;
    bindReceiptClicks($('recentList'));
    bindReceiptClicks($('receiptList'));
}

$('heroBtn').addEventListener('click', () => heroAction());
document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => showPage(n.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.goto)));
$('editProfileBtn').addEventListener('click', () => showRegistration(true));

// ============ PAYMENT ============
function initPayForm() {
    $('payMonth').innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    const cy = new Date().getFullYear();
    const years = [...new Set([cy - 1, cy, cy + 1, period.year])].sort();
    $('payYear').innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    $('payMonth').value = period.month;
    $('payYear').value = period.year;
    if (!$('payAmount').value) $('payAmount').value = DEFAULT_FEE;
}

document.querySelectorAll('.pay-chip').forEach(b => b.addEventListener('click', () => { $('payAmount').value = b.dataset.amount; }));

$('qrImg').addEventListener('error', () => {
    $('qrImg').classList.add('hidden');
    $('qrFallback').classList.remove('hidden');
});

function genReceiptNo() {
    const d = new Date();
    const ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return `TBB3-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

$('paySubmit').addEventListener('click', async () => {
    const month = parseInt($('payMonth').value);
    const year = parseInt($('payYear').value);
    const amount = parseFloat($('payAmount').value);
    const ref = $('payRef').value.trim();
    const err = (m) => { $('payError').textContent = m; $('payError').classList.remove('hidden'); };

    if (!(amount > 0)) return err('Sila masukkan jumlah bayaran.');
    if (ref.length < 4) return err('Sila masukkan no. rujukan transaksi Touch \'n Go.');
    if (paymentFor(month, year) && !confirm(`Bayaran untuk ${periodLabel(month, year)} sudah direkodkan. Teruskan juga?`)) return;
    $('payError').classList.add('hidden');

    $('paySubmit').disabled = true;
    $('paySubmit').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menjana resit...';
    const payment = {
        uid: user.uid, name: profile.name, section: profile.section, houseNo: profile.houseNo,
        phone: profile.phone, type: profile.type, month, year, amount,
        method: "Touch 'n Go eWallet (QR)", ref, status: 'pending', receiptNo: genReceiptNo()
    };
    try {
        const docRef = await db.collection('tbb3_payments').add({ ...payment, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        $('payRef').value = '';
        showToast('Bayaran direkod! Resit dijana ✅');
        openReceipt({ id: docRef.id, ...payment, createdAt: new Date() });
    } catch (ex) {
        err('Gagal menyimpan: ' + ex.message);
    } finally {
        $('paySubmit').disabled = false;
        $('paySubmit').innerHTML = '<i class="fas fa-receipt mr-2"></i>Saya Sudah Bayar - Jana Resit';
    }
});

// ============ RECEIPT ============
function openReceipt(p) {
    currentReceipt = p;
    const st = STATUS[p.status] || STATUS.pending;
    const stColor = p.status === 'approved' ? '#15803d' : p.status === 'rejected' ? '#b91c1c' : '#b45309';
    $('receiptPaper').innerHTML = `
        <div class="text-center pb-3 border-b border-dashed border-gray-300">
            <div class="text-lg font-extrabold text-blue-700 tracking-wide">TAMAN BATU BELAH 3</div>
            <div class="text-[11px] text-gray-500">Resit Rasmi Bayaran Yuran</div>
            <div class="mt-2 inline-block px-3 py-1 rounded-full text-[11px] font-extrabold" style="border:2px solid ${stColor};color:${stColor}">${st.label.toUpperCase()}</div>
        </div>
        <div class="text-center py-3">
            <div class="text-[11px] text-gray-400 font-semibold tracking-widest">JUMLAH DIBAYAR</div>
            <div class="text-3xl font-extrabold text-gray-800">${money(p.amount)}</div>
        </div>
        <div class="receipt-row"><span>No. Resit</span><span>${escapeHtml(p.receiptNo)}</span></div>
        <div class="receipt-row"><span>Tarikh & Masa</span><span>${fmtDateTime(toDate(p.createdAt))}</span></div>
        <div class="receipt-row"><span>Nama</span><span>${escapeHtml(p.name)}</span></div>
        <div class="receipt-row"><span>Seksyen / No. Rumah</span><span>${escapeHtml(p.section)} / ${escapeHtml(p.houseNo)}</span></div>
        <div class="receipt-row"><span>Tempoh</span><span>${periodLabel(p.month, p.year)}</span></div>
        <div class="receipt-row"><span>Kaedah</span><span>${escapeHtml(p.method)}</span></div>
        <div class="receipt-row"><span>No. Rujukan TNG</span><span>${escapeHtml(p.ref)}</span></div>
        <p class="text-[10px] text-gray-400 text-center mt-4 leading-relaxed">Resit ini dijana secara automatik oleh sistem.<br>${p.status === 'approved' ? 'Bayaran telah disahkan oleh AJK.' : 'Status akan dikemas kini selepas AJK menyemak transaksi.'}</p>`;
    $('receiptModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeReceipt() {
    $('receiptModal').classList.add('hidden');
    document.body.style.overflow = '';
    if (!$('page-pay').classList.contains('hidden')) showPage('home');
}
$('closeReceiptBtn').addEventListener('click', closeReceipt);
$('receiptModal').querySelector('.modal-overlay').addEventListener('click', closeReceipt);
$('printBtn').addEventListener('click', () => window.print());

$('shareBtn').addEventListener('click', () => {
    const p = currentReceipt;
    if (!p) return;
    const msg = `🧾 RESIT BAYARAN\nTAMAN BATU BELAH 3\n━━━━━━━━━━━━━━━━━━\nNo. Resit: ${p.receiptNo}\nTarikh: ${fmtDateTime(toDate(p.createdAt))}\nNama: ${p.name}\nRumah: ${p.section} / ${p.houseNo}\nTempoh: ${periodLabel(p.month, p.year)}\nJumlah: ${money(p.amount)}\nKaedah: ${p.method}\nRujukan: ${p.ref}\nStatus: ${(STATUS[p.status] || STATUS.pending).label}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
});
