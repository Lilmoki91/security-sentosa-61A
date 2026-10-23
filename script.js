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

// ============ GLOBAL STATE ============
const MONTHS = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let residentsData = { '61A': [], '61B': [], '61C': [], '61D': [], '61E': [], 'OTHER': [] };
let currentSection = 'all';
let currentStatus = 'all';
let editingResident = null;
let isAdmin = false;
let currentSettings = { month: 7, year: 2026, format: 1 };

// ============ DOM ELEMENTS ============
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const adminBadge = document.getElementById('adminBadge');
const logoutBtn = document.getElementById('logoutBtn');
const guestBackBtn = document.getElementById('guestBackBtn');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const toggleIcon = document.getElementById('toggleIcon');
const guestBtn = document.getElementById('guestBtn');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
const searchToggleBtn = document.getElementById('searchToggleBtn');
const summaryBtn = document.getElementById('summaryBtn');
const editModal = document.getElementById('editModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const summaryModal = document.getElementById('summaryModal');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const btnPaid = document.getElementById('btnPaid');
const btnUnpaid = document.getElementById('btnUnpaid');
const inputAmount = document.getElementById('inputAmount');
const inputMemo = document.getElementById('inputMemo');
const inputWhatsApp = document.getElementById('inputWhatsApp');
const inputDate = document.getElementById('inputDate');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportWaBtn = document.getElementById('exportWaBtn');
const headerPeriod = document.getElementById('headerPeriod');
const residentList = document.getElementById('residentList');
const statTotal = document.getElementById('statTotal');
const statPaid = document.getElementById('statPaid');
const statUnpaid = document.getElementById('statUnpaid');
const statAmount = document.getElementById('statAmount');
const modalResidentInfo = document.getElementById('modalResidentInfo');
const summaryContent = document.getElementById('summaryContent');
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastText = document.getElementById('toastText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const monthGrid = document.getElementById('monthGrid');
const yearGrid = document.getElementById('yearGrid');
const customYear = document.getElementById('customYear');
const addYearBtn = document.getElementById('addYearBtn');
const formatSelect = document.getElementById('formatSelect');
const previewPeriod = document.getElementById('previewPeriod');

// ============ TOAST ============
function showToast(message, type = 'success') {
    toastText.textContent = message;
    toastIcon.className = type === 'success' ? 'fas fa-check-circle text-green-400' : 'fas fa-exclamation-circle text-yellow-400';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ============ AUTH ============
togglePasswordBtn.addEventListener('click', () => {
    loginPassword.type = loginPassword.type === 'password' ? 'text' : 'password';
    toggleIcon.classList.toggle('fa-eye');
    toggleIcon.classList.toggle('fa-eye-slash');
});

loginBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
        loginError.innerHTML = '❌ Sila isi email dan password!';
        loginError.classList.remove('hidden');
        return;
    }
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Log Masuk...';
    loginBtn.disabled = true;
    loginError.classList.add('hidden');
    auth.signInWithEmailAndPassword(email, password)
        .then(() => showToast('Log masuk berjaya! ✅'))
        .catch(() => {
            loginError.innerHTML = '❌ Email atau password salah!';
            loginError.classList.remove('hidden');
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Log Masuk (Admin)';
            loginBtn.disabled = false;
        });
});

logoutBtn.addEventListener('click', () => {
    if (confirm('Logout?')) {
        auth.signOut().then(() => {
            loginEmail.value = '';
            loginPassword.value = '';
            showToast('Logout berjaya! 👋');
        });
    }
});

// Guest back button - return to login screen
guestBackBtn.addEventListener('click', () => {
    mainApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    isAdmin = false;
    showToast('Kembali ke laman login 👋');
});

guestBtn.addEventListener('click', () => {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    adminBadge.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    guestBackBtn.classList.remove('hidden');
    isAdmin = false;
    initApp();
    showToast('Mode lihat sahaja 👁️');
});

auth.onAuthStateChanged((user) => {
    if (user) {
        isAdmin = true;
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        adminBadge.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        guestBackBtn.classList.add('hidden');
        initApp();
        showToast(`Admin: ${user.email} ✅`);
    } else {
        isAdmin = false;
        mainApp.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        adminBadge.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        guestBackBtn.classList.add('hidden');
        loginError.classList.add('hidden');
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Log Masuk (Admin)';
        loginBtn.disabled = false;
    }
});

// ============ INIT APP ============
async function initApp() {
    const residentsRef = db.collection('tbb3').doc('residents').collection('all');
    residentsRef.onSnapshot((snapshot) => {
        residentsData = { '61A': [], '61B': [], '61C': [], '61D': [], '61E': [], 'OTHER': [] };
        snapshot.forEach((doc) => {
            const data = doc.data();
            const section = data.section || 'OTHER';
            if (residentsData[section]) residentsData[section].push({ id: doc.id, ...data });
        });
        if (Object.values(residentsData).every(arr => arr.length === 0)) createDefaultResidents();
        Object.keys(residentsData).forEach(s => {
            residentsData[s].sort((a, b) => (parseInt(a.houseNo) || 0) - (parseInt(b.houseNo) || 0));
        });
        renderResidents();
    });
    
    try {
        const settingsDoc = await db.collection('tbb3').doc('settings').get();
        if (settingsDoc.exists) {
            currentSettings = settingsDoc.data();
            console.log('Settings loaded:', currentSettings);
        } else {
            console.log('No settings found, using defaults');
        }
        updateHeaderDisplay();
    } catch (error) {
        console.log('Error loading settings:', error);
        updateHeaderDisplay();
    }
}

async function createDefaultResidents() {
    const batch = db.batch();
    const residentsRef = db.collection('tbb3').doc('residents').collection('all');
    const snapshot = await residentsRef.get();
    if (snapshot.empty) {
        const defaultResidents = {
            '61A': [
                { houseNo: '1', name: 'PUA SENG HENG' }, { houseNo: '2A', name: 'STEPHEN' }, { houseNo: '3', name: 'TEE TECK LEONG' },
                { houseNo: '6', name: 'LAI' }, { houseNo: '8', name: 'ONG CHIN KIAT' }, { houseNo: '10', name: 'SAM LEE BOON KHENG' },
                { houseNo: '12', name: 'JEOH SONG HOO' }, { houseNo: '14', name: 'SIVARAMAKRISMAN' }, { houseNo: '16', name: 'JEFF CHIEW KONG HOOI' },
                { houseNo: '18', name: 'CHEN JIT MENG' }, { houseNo: '20', name: 'FLORENCE' }, { houseNo: '22', name: 'JOSHUA TAN' },
                { houseNo: '24', name: 'CHIA THAI FOOK' }, { houseNo: '26', name: 'TEH GUAN KOK' }, { houseNo: '28', name: 'QUAH CHZE CHONG' },
                { houseNo: '30', name: 'LIM SIANG TENG' }, { houseNo: '32', name: 'KHOO CHONG FAN' }, { houseNo: '34', name: 'JEFF KHOO' },
                { houseNo: '40', name: 'VINCENT CHUA KENG HUA' }, { houseNo: '42', name: 'GAN HSIAO LING' }, { houseNo: '44', name: 'GAN CHEONG POON' },
                { houseNo: '46', name: 'TANG CHEE MENG' }, { houseNo: '48', name: 'NG SAY PENG' }, { houseNo: '50', name: 'AH JOE' },
                { houseNo: '52', name: 'CHER EE SENG' }, { houseNo: '54', name: 'TOH YONG KIAT' }, { houseNo: '56', name: 'TAN SWEE THIAM' }
            ],
            '61B': [
                { houseNo: '1', name: 'KONG LIENG TEE' }, { houseNo: '2', name: 'SOK TAT MING' }, { houseNo: '3', name: 'ZADIRON' },
                { houseNo: '4', name: 'ALEX WONG' }, { houseNo: '5', name: 'KONG TIONG KIAN' }, { houseNo: '6', name: 'KHOO LAI KEONG' },
                { houseNo: '7', name: 'TAN HOW THUAN' }, { houseNo: '8', name: 'CHAN KOK SENG' }, { houseNo: '9', name: 'TAN KUN SENG' }, { houseNo: '10', name: 'HABSAH' }
            ],
            '61C': [
                { houseNo: '1', name: 'BOK TEIK MING' }, { houseNo: '3', name: 'GAN CHIN HENG' }, { houseNo: '4', name: 'NG KANG VY' },
                { houseNo: '5', name: 'CHEW SEE ENG' }, { houseNo: '6', name: 'WONG BOON CHOY' }, { houseNo: '7', name: 'LAM CHE SHOME' },
                { houseNo: '8', name: 'KOH CHIN MIN' }, { houseNo: '9', name: 'NG HONG KEE' }, { houseNo: '10', name: 'THEW KEAN PENG' }
            ],
            '61D': [
                { houseNo: '1', name: 'TAN TIONG WANG' }, { houseNo: '3', name: 'LIM HOOT KONG' }, { houseNo: '5', name: 'TEE SOON YONG' },
                { houseNo: '7', name: 'WONG FUT CHUAN' }, { houseNo: '9', name: 'LIM SOON HUAT' }
            ],
            '61E': [
                { houseNo: '2', name: 'PAH THIAM MING' }, { houseNo: '2A', name: 'TAN TENG CHUAN' }, { houseNo: '6', name: 'VELOO' },
                { houseNo: '8', name: 'SOO YEE SAY' }, { houseNo: '12', name: 'MR MANJIT' }, { houseNo: '16', name: 'JEOY TAN' },
                { houseNo: '18', name: 'MR SIAH' }, { houseNo: '20', name: 'MS FOO' }, { houseNo: '22', name: 'SIAH HOOCK LAI' },
                { houseNo: '24', name: 'CHAI MING KOOI' }, { houseNo: '26', name: 'LOW CHEE WAN' }, { houseNo: '28', name: 'TAN LAI HUA' }
            ],
            'OTHER': [
                { houseNo: 'KUI-43', name: 'JASON NG' }, { houseNo: '18', name: 'PHUNH JIN CHONG' }
            ]
        };
        let count = 0;
        for (const [section, residents] of Object.entries(defaultResidents)) {
            for (const r of residents) {
                batch.set(residentsRef.doc(), {
                    ...r, section,
                    status: '', amount: '', memo: '', whatsapp: '', date: '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
            }
        }
        await batch.commit();
        console.log(`✅ ${count} default residents created`);
    }
}

// ============ HEADER DISPLAY ============
function updateHeaderDisplay() {
    const mMs = MONTHS[currentSettings.month - 1] || 'Julai';
    const mEn = MONTHS_EN[currentSettings.month - 1] || 'July';
    const mNum = String(currentSettings.month || 7).padStart(2, '0');
    const y = currentSettings.year || 2026;
    let text;
    switch(parseInt(currentSettings.format)) {
        case 1: text = `${mMs} ${y} - ${mNum}`; break;
        case 2: text = `${mMs} ${y}`; break;
        case 3: text = `${mNum}/${y}`; break;
        case 4: text = `${mEn} - ${y}`; break;
        default: text = `${mMs} ${y} - ${mNum}`;
    }
    headerPeriod.textContent = text;
    if (previewPeriod) previewPeriod.textContent = text;
}

// ============ SETTINGS MODAL ============
function renderMonthGrid() {
    if (!monthGrid) return;
    monthGrid.innerHTML = '';
    MONTHS.forEach((m, i) => {
        const n = i + 1;
        const btn = document.createElement('button');
        btn.className = `month-btn py-2.5 rounded-xl text-xs font-semibold border-2 ${currentSettings.month === n ? 'active' : 'border-gray-200 bg-gray-50 text-gray-700'}`;
        btn.textContent = m;
        btn.onclick = () => { 
            currentSettings.month = n; 
            renderMonthGrid(); 
            updateHeaderDisplay(); 
        };
        monthGrid.appendChild(btn);
    });
}

function renderYearGrid() {
    if (!yearGrid) return;
    yearGrid.innerHTML = '';
    const cy = new Date().getFullYear();
    const years = [...new Set([cy-2, cy-1, cy, cy+1, cy+2, 2026, 2027, 2028])].sort((a, b) => a - b);
    years.forEach(y => {
        const btn = document.createElement('button');
        btn.className = `year-btn py-2.5 rounded-xl text-sm font-semibold border-2 ${currentSettings.year === y ? 'active' : 'border-gray-200 bg-gray-50 text-gray-700'}`;
        btn.textContent = y;
        btn.onclick = () => { 
            currentSettings.year = y; 
            renderYearGrid(); 
            updateHeaderDisplay(); 
        };
        yearGrid.appendChild(btn);
    });
}

settingsBtn.addEventListener('click', async () => {
    if (!isAdmin) { 
        showToast('Admin sahaja!', 'warning'); 
        return; 
    }
    
    try {
        const doc = await db.collection('tbb3').doc('settings').get();
        if (doc.exists) {
            currentSettings = doc.data();
            formatSelect.value = currentSettings.format || 1;
        } else {
            currentSettings = { month: 7, year: 2026, format: 1 };
            formatSelect.value = 1;
        }
    } catch (error) {
        console.log('Error loading settings:', error);
        currentSettings = { month: 7, year: 2026, format: 1 };
        formatSelect.value = 1;
    }
    
    renderMonthGrid();
    renderYearGrid();
    updateHeaderDisplay();
    settingsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    console.log('Settings modal opened with:', currentSettings);
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    document.body.style.overflow = '';
});

settingsModal.querySelector('.modal-overlay').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    document.body.style.overflow = '';
});

addYearBtn.addEventListener('click', () => {
    const y = parseInt(customYear.value);
    if (y && y >= 2020 && y <= 2099) {
        currentSettings.year = y;
        customYear.value = '';
        renderYearGrid();
        updateHeaderDisplay();
    } else {
        showToast('Sila masukkan tahun yang sah (2020-2099)', 'warning');
    }
});

formatSelect.addEventListener('change', () => {
    currentSettings.format = parseInt(formatSelect.value);
    updateHeaderDisplay();
});

saveSettingsBtn.addEventListener('click', async () => {
    currentSettings.format = parseInt(formatSelect.value);
    
    try {
        await db.collection('tbb3').doc('settings').set(currentSettings);
        updateHeaderDisplay();
        settingsModal.classList.add('hidden');
        document.body.style.overflow = '';
        showToast('Tetapan disimpan! ✅');
    } catch (error) {
        showToast('Gagal menyimpan tetapan!', 'warning');
        console.log('Error saving settings:', error);
    }
});

// ============ RENDER ============
function renderResidents() {
    residentList.innerHTML = '';
    const sections = currentSection === 'all' ? Object.keys(residentsData) : [currentSection];
    let totalItems = 0, paidCount = 0, unpaidCount = 0, totalAmount = 0;
    const searchTerm = searchInput.value.toLowerCase();
    
    sections.forEach(section => {
        const residents = residentsData[section] || [];
        const filtered = residents.filter(r => {
            const matchSearch = !searchTerm || r.name.toLowerCase().includes(searchTerm) || r.houseNo.toLowerCase().includes(searchTerm);
            const matchStatus = currentStatus === 'all' || (currentStatus === 'paid' && r.status === 'paid') || (currentStatus === 'unpaid' && (r.status === 'unpaid' || !r.status));
            return matchSearch && matchStatus;
        });
        if (filtered.length === 0) return;
        
        const header = document.createElement('div');
        header.className = 'section-title';
        const sectionPaid = filtered.filter(r => r.status === 'paid').length;
        const sectionTotal = filtered.filter(r => r.name).length;
        header.innerHTML = `<div class="flex items-center gap-2"><span class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm"><i class="fas fa-building"></i></span><h2 class="text-sm font-bold text-gray-800">Seksyen ${section}</h2></div><span class="bg-white text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-[11px] font-semibold"><span class="text-green-600">${sectionPaid}</span>/${sectionTotal} sudah bayar</span>`;
        residentList.appendChild(header);
        
        filtered.forEach(resident => {
            totalItems++;
            if (resident.status === 'paid') paidCount++; else unpaidCount++;
            if (resident.amount) totalAmount += parseFloat(resident.amount) || 0;
            
            const card = document.createElement('div');
            card.className = 'resident-card';
            card.addEventListener('click', () => openEditModal(resident));
            
            const statusBadge = resident.status === 'paid' ? '<span class="chip chip-paid"><i class="fas fa-check"></i>SUDAH BAYAR</span>' : resident.status === 'unpaid' ? '<span class="chip chip-unpaid"><i class="fas fa-xmark"></i>BELUM BAYAR</span>' : '<span class="chip chip-none"><i class="fas fa-minus"></i>TIADA STATUS</span>';
            const badgeClass = resident.status === 'paid' ? 'paid' : resident.status === 'unpaid' ? 'unpaid' : '';
            const amountDisplay = resident.amount ? `<span class="text-green-600 font-extrabold text-sm">RM${(parseFloat(resident.amount) || 0).toFixed(2)}</span>` : '';
            const memoDisplay = resident.memo ? `<p class="text-[11px] text-gray-500 mt-1.5 truncate"><i class="fas fa-note-sticky text-yellow-500 mr-1"></i>${escapeHtml(resident.memo)}</p>` : '';
            const waDisplay = resident.whatsapp ? `<span class="chip chip-wa"><i class="fab fa-whatsapp"></i>${escapeHtml(resident.whatsapp)}</span>` : '';
            
            card.innerHTML = `<div class="flex items-center gap-3"><div class="house-badge ${badgeClass}">${escapeHtml(resident.houseNo)}</div><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><h3 class="font-semibold text-sm truncate ${!resident.name ? 'text-gray-400 italic' : 'text-gray-800'}">${escapeHtml(resident.name) || 'Kosong'}</h3>${amountDisplay}</div><div class="flex items-center gap-1.5 mt-1.5 flex-wrap">${statusBadge}${waDisplay}</div>${memoDisplay}</div><i class="fas fa-chevron-right text-gray-300 text-xs"></i></div>`;
            residentList.appendChild(card);
        });
    });
    
    if (residentList.innerHTML === '') {
        residentList.innerHTML = `<div class="text-center py-16 text-gray-400"><i class="fas fa-search text-5xl mb-4 text-gray-200"></i><p class="font-medium">Tiada keputusan</p></div>`;
    }
    statTotal.textContent = totalItems;
    statPaid.textContent = paidCount;
    statUnpaid.textContent = unpaidCount;
    statAmount.textContent = 'RM' + totalAmount.toFixed(0);

    const percent = totalItems ? Math.round((paidCount / totalItems) * 100) : 0;
    document.getElementById('statPercent').textContent = percent + '%';
    document.getElementById('statProgressBar').style.width = percent + '%';
}

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============ FILTERS ============
document.querySelectorAll('.section-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        currentSection = tab.dataset.section;
        document.querySelectorAll('.section-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.section === currentSection);
        });
        renderResidents();
    });
});

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        currentStatus = tab.dataset.filter;
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.filter === currentStatus);
        });
        renderResidents();
    });
});

searchToggleBtn.addEventListener('click', () => {
    searchBar.classList.toggle('hidden');
    searchToggleBtn.classList.toggle('active', !searchBar.classList.contains('hidden'));
    if (!searchBar.classList.contains('hidden')) searchInput.focus();
});

// Bottom nav: Utama (scroll to top)
document.getElementById('homeBtn').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
searchInput.addEventListener('input', renderResidents);

// ============ EDIT MODAL ============
function openEditModal(resident) {
    if (!isAdmin) { showToast('Hanya admin boleh edit! 🔒', 'warning'); return; }
    editingResident = resident;
    modalResidentInfo.innerHTML = `<div class="flex items-center space-x-3"><div class="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg">${resident.houseNo}</div><div><p class="text-xs text-blue-600 font-medium">Seksyen ${resident.section}</p><p class="font-bold text-gray-800">${resident.name || 'Kosong'}</p></div></div>`;
    inputAmount.value = resident.amount || '';
    inputMemo.value = resident.memo || '';
    inputWhatsApp.value = resident.whatsapp || '';
    inputDate.value = resident.date || '';
    setPaymentStatus(resident.status || '');
    editModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() { editModal.classList.add('hidden'); document.body.style.overflow = ''; editingResident = null; }
function setPaymentStatus(status) {
    btnPaid.className = 'py-3 rounded-xl font-semibold text-sm border-2 ' + (status === 'paid' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500');
    btnUnpaid.className = 'py-3 rounded-xl font-semibold text-sm border-2 ' + (status === 'unpaid' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-500');
}

closeEditModalBtn.addEventListener('click', closeModal);
editModal.querySelector('.modal-overlay').addEventListener('click', closeModal);
btnPaid.addEventListener('click', () => setPaymentStatus('paid'));
btnUnpaid.addEventListener('click', () => setPaymentStatus('unpaid'));
document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', () => { inputAmount.value = btn.dataset.amount; });
});

saveBtn.addEventListener('click', async () => {
    if (!editingResident || !isAdmin) return;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
    saveBtn.disabled = true;
    try {
        await db.collection('tbb3').doc('residents').collection('all').doc(editingResident.id).update({
            status: btnPaid.classList.contains('text-green-700') ? 'paid' : btnUnpaid.classList.contains('text-red-700') ? 'unpaid' : '',
            amount: inputAmount.value, memo: inputMemo.value, whatsapp: inputWhatsApp.value, date: inputDate.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Data berjaya disimpan! ✅');
        closeModal();
    } catch (error) {
        showToast('Gagal simpan! ' + error.message, 'warning');
    } finally {
        saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Simpan ke Cloud';
        saveBtn.disabled = false;
    }
});

deleteBtn.addEventListener('click', async () => {
    if (!editingResident || !isAdmin) return;
    if (!confirm('Padam data bayaran?')) return;
    try {
        await db.collection('tbb3').doc('residents').collection('all').doc(editingResident.id).update({
            status: '', amount: '', memo: '', whatsapp: '', date: '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Data berjaya dipadam! 🗑️');
        closeModal();
    } catch (error) { showToast('Gagal padam!', 'warning'); }
});

whatsappBtn.addEventListener('click', () => {
    if (!editingResident) return;
    const wa = inputWhatsApp.value;
    if (!wa) { showToast('Masukkan nombor WhatsApp!', 'warning'); return; }
    let msg = `Assalamualaikum,\n\nTAMAN BATU BELAH 3\n━━━━━━━━━━━━━━━━━━\n\nNo. Rumah: ${editingResident.houseNo}\nSeksyen: ${editingResident.section}\nNama: ${editingResident.name}\n\n`;
    if (inputAmount.value) msg += `Jumlah: RM${parseFloat(inputAmount.value).toFixed(2)}\n`;
    if (inputMemo.value) msg += `Catatan: ${inputMemo.value}\n`;
    msg += `\nTerima kasih. 🙏`;
    const clean = wa.replace(/\D/g, '');
    window.open(`https://wa.me/${clean.startsWith('60') ? clean : '6' + clean}?text=${encodeURIComponent(msg)}`, '_blank');
});

// ============ SUMMARY ============
summaryBtn.addEventListener('click', () => {
    let totalPaid = 0, totalUnpaid = 0, totalAmount = 0, sectionSummary = {};
    Object.entries(residentsData).forEach(([section, residents]) => {
        const paid = residents.filter(r => r.status === 'paid').length;
        const unpaid = residents.filter(r => !r.status || r.status === 'unpaid').length;
        const amount = residents.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        sectionSummary[section] = { paid, unpaid, amount };
        totalPaid += paid; totalUnpaid += unpaid; totalAmount += amount;
    });
    let html = `<div class="grid grid-cols-2 gap-3 mb-4"><div class="bg-green-50 rounded-xl p-4 text-center"><div class="text-3xl font-bold text-green-600">${totalPaid}</div><div class="text-xs text-gray-600 mt-1">Sudah Bayar</div></div><div class="bg-red-50 rounded-xl p-4 text-center"><div class="text-3xl font-bold text-red-600">${totalUnpaid}</div><div class="text-xs text-gray-600 mt-1">Belum Bayar</div></div></div><div class="bg-blue-50 rounded-xl p-4 text-center mb-4"><div class="text-3xl font-bold text-blue-600">RM${totalAmount.toFixed(2)}</div><div class="text-xs text-gray-600 mt-1">Jumlah Keseluruhan</div></div><div class="space-y-2"><h4 class="font-semibold text-gray-700 text-sm">Mengikut Seksyen:</h4>`;
    Object.entries(sectionSummary).forEach(([section, d]) => {
        html += `<div class="flex items-center justify-between bg-gray-50 rounded-lg p-3"><span class="font-medium text-sm text-gray-700">Seksyen ${section}</span><div class="flex items-center space-x-3 text-xs"><span class="text-green-600 font-medium">${d.paid} ✅</span><span class="text-red-600 font-medium">${d.unpaid} ❌</span><span class="text-blue-600 font-bold">RM${d.amount.toFixed(0)}</span></div></div>`;
    });
    html += '</div>';
    summaryContent.innerHTML = html;
    summaryModal.classList.remove('hidden');
});

closeSummaryBtn.addEventListener('click', () => summaryModal.classList.add('hidden'));
summaryModal.querySelector('.modal-overlay').addEventListener('click', () => summaryModal.classList.add('hidden'));

// ============ EXPORT ============
exportCsvBtn.addEventListener('click', () => {
    let csv = 'SEKSYEN,NO RUMAH,NAMA,STATUS,JUMLAH (RM),MEMO,WHATSAPP,TARIKH\n';
    Object.entries(residentsData).forEach(([section, residents]) => {
        residents.forEach(r => {
            if (r.name) csv += `${section},${r.houseNo},"${r.name}",${r.status === 'paid' ? 'Sudah Bayar' : r.status === 'unpaid' ? 'Belum Bayar' : 'Tiada'},${r.amount || 0},"${r.memo || ''}",${r.whatsapp || ''},${r.date || ''}\n`;
        });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'TBB3_Bayaran.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV berjaya dimuat turun! 📄');
});

exportWaBtn.addEventListener('click', () => {
    let totalPaid = 0, totalUnpaid = 0, totalAmount = 0;
    Object.values(residentsData).forEach(residents => {
        residents.forEach(r => {
            if (r.name) {
                if (r.status === 'paid') totalPaid++; else totalUnpaid++;
                totalAmount += parseFloat(r.amount) || 0;
            }
        });
    });
    let msg = `📊 LAPORAN BAYARAN\nTAMAN BATU BELAH 3\n━━━━━━━━━━━━━━━━━━\n\n✅ Sudah Bayar: ${totalPaid}\n❌ Belum Bayar: ${totalUnpaid}\n💰 Jumlah: RM${totalAmount.toFixed(2)}\n\nSENARAI SUDAH BAYAR:\n`;
    Object.entries(residentsData).forEach(([section, residents]) => {
        residents.forEach(r => { if (r.name && r.status === 'paid') msg += `• ${section}-${r.houseNo}: ${r.name} (RM${r.amount || 0})\n`; });
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
});

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !loginScreen.classList.contains('hidden')) loginBtn.click();
});
