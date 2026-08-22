const STORAGE_KEY = 'restaurant_os_real_نمونه اولیه_v1';
const SESSION_KEY = 'restaurant_os_active_session_v1';
const THEME_KEY = 'restaurant_os_visual_theme_v1';
const KITCHEN_FILTER_KEY = 'restaurant_os_kitchen_filter_v1';
const KITCHEN_SNOOZE_KEY = 'restaurant_os_kitchen_snooze_v1';
const SHARED_SYNC_INTERVAL_MS = 2500;
let sharedSyncEnabled = false;
let sharedSyncStarted = false;
let sharedApplyingRemote = false;
let sharedStateRevision = 0;
let sharedSaveTimer = null;
let sharedSaveInFlight = null;
let sharedPendingSerialized = '';
let sharedPendingSince = 0;
let sharedLastSerialized = '';
const app = document.querySelector('#app');
const portalParams = new URLSearchParams(window.location.search);
const portalMode = portalParams.get('portal') === '1';
const portalStaffLoginMode = portalMode && portalParams.get('staffLogin') === '1';
const publicTenantId = portalParams.get('publicTenant') || '';
const publicQrMode = Boolean(publicTenantId);
const SHARED_STATE_API = `${window.location.origin}${portalMode ? '/api/restaurant-state' : (publicQrMode ? `/api/public-restaurant-state?tenantId=${encodeURIComponent(publicTenantId)}` : '/api/state')}`;
const PORTAL_SESSION_PASSWORD = 'flowkave-portal-session-only';
let portalIdentity = null;
let state = loadState();
let session = loadLocalSession(state);
let currentTab = portalParams.get('tab') || 'dashboard';
let backupMessage = '';
let accountingFilter = { type: '', range: 'all' };
let accountingSubTab = 'accounts';
let securityEventFilter = { type: '', range: 'all' };
const kitchenSavedFilterState = loadKitchenFilterState();
let kitchenQueueFilter = kitchenSavedFilterState.filter;
let kitchenStationFilter = kitchenSavedFilterState.station;
let currentTheme = localStorage.getItem(THEME_KEY) || 'emerald';
let currentRecipeCategoryTab = '';
let currentMenuPreviewCategoryTab = '';
let currentMenuEditCategoryTab = '';
let pendingInventoryScrollFocus = null;
let editingMenuItemId = '';
let pendingMenuEditScrollFocus = null;
let editingFinancialAccountId = '';
let editingSaleOrderId = '';
let editingPurchaseInvoiceId = '';
let posSalesChannel = 'hall';
let selectedHallTableId = '';
let hallTablePickerOpen = false;
let hallTableConfigOpen = false;
let selectedHallCategory = '';
let hallOrderDrafts = {};
let calculatorValue = '';
let pendingAccountScrollFocus = null;
let scheduleWeekOffset = 0;
let staffFormModalOpen = false;
let staffListModalOpen = false;
let staffListSearchQuery = '';
let selectedStaffListUserId = '';
let attendanceModalOpen = false;
let weeklyScheduleSaveTimers = new Map();
let customerBankQuery = '';
let customerBankSegment = '';
if (window.pdfjsLib?.GlobalWorkerOptions) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.js?v=inventory-import-pdfjs-1';
}
const themeChoices = [
  { id: 'emerald', label: 'زمردی', hint: 'تم روشن و شاد' },
  { id: 'berry', label: 'اناری', hint: 'پر انرژی و رنگی' },
  { id: 'midnight', label: 'شب', hint: 'دارک مدرن' },
  { id: 'sunrise', label: 'آفتابی', hint: 'گرم و دوستانه' },
];
const menuCategoryItems = {
  'نوشیدنی گرم': ['اسپرسو','آمریکانو','لاته','کاپوچینو','موکا','هات چاکلت'],
  'نوشیدنی سرد': ['آیس لاته','آیس آمریکانو','لیموناد','موهیتو','اسموتی'],
  'صبحانه': ['املت ویژه','پنکیک','تست آووکادو','صبحانه ایرانی'],
  'غذای اصلی': ['چیزبرگر','پاستا آلفردو','سالاد سزار','استیک مرغ'],
  'دسر': ['چیزکیک','تیرامیسو','کوکی','براونی'],
};
const menuItemDetails = {
  'موکا': 'قهوه، شیر، کوکی، سس شکلات',
  'لاته': 'اسپرسو، شیر بخار داده‌شده، فوم شیر',
  'کاپوچینو': 'اسپرسو، شیر، فوم شیر',
  'چیزبرگر': 'نان برگر، گوشت، پنیر، خیارشور، سس مخصوص',
  'پاستا آلفردو': 'پاستا، خامه، مرغ، قارچ، پنیر پارمزان',
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { const parsed = JSON.parse(raw); migrateDisplayState(parsed); saveState(parsed); return parsed; }
  const fresh = (portalMode || publicQrMode) ? RestaurantCore.createInitialState() : (RestaurantCore.createDemoSampleState ? RestaurantCore.createDemoSampleState() : RestaurantCore.createInitialState());
  saveState(fresh);
  return fresh;
}
function loadLocalSession(sourceState = state) {
  const localSessionId = localStorage.getItem(SESSION_KEY) || '';
  if (!localSessionId) return null;
  const valid = RestaurantCore.validateSession ? RestaurantCore.validateSession(sourceState, localSessionId) : (sourceState.sessions || []).find(s => s.id === localSessionId) || null;
  if (!valid) localStorage.removeItem(SESSION_KEY);
  return valid;
}
function setActiveSession(nextSession) {
  session = nextSession || null;
  if (session?.id) localStorage.setItem(SESSION_KEY, session.id);
  else localStorage.removeItem(SESSION_KEY);
  return session;
}
function normalizePortalIdentity(input = {}) {
  const meta = input || {};
  const tenant = meta.tenant || {};
  return {
    tenantId: String(meta.tenantId || tenant.id || ''),
    businessName: String(meta.businessName || tenant.name || 'رستوران جدید'),
    ownerName: String(meta.ownerName || 'مالک پکیج'),
    email: String(meta.ownerEmail || meta.email || `owner-${tenant.id || Date.now()}@flowkave.local`),
    phone: String(meta.phone || ''),
    tenantChoices: Array.isArray(meta.tenantChoices) ? meta.tenantChoices.map(choice => ({
      tenantId: String(choice.tenantId || choice.id || ''),
      restaurantName: String(choice.restaurantName || choice.name || 'رستوران'),
      managerName: String(choice.managerName || ''),
      role: String(choice.role || ''),
    })).filter(choice => choice.tenantId) : [],
  };
}
function ensurePortalCustomer(identityInput = portalIdentity) {
  if (!portalMode) return null;
  portalIdentity = normalizePortalIdentity(identityInput || portalIdentity || {});
  if (!Array.isArray(state.customers)) state.customers = [];
  let customer = state.customers.find(c => c.portalTenantId && c.portalTenantId === portalIdentity.tenantId);
  if (!customer && !portalIdentity.tenantId) customer = state.customers.find(c => String(c.email || '').toLowerCase() === portalIdentity.email.toLowerCase());
  if (!customer) {
    customer = RestaurantCore.createCustomer(state, {
      businessName: portalIdentity.businessName,
      ownerName: portalIdentity.ownerName,
      phone: portalIdentity.phone,
      email: portalIdentity.email,
      password: PORTAL_SESSION_PASSWORD,
      packageName: 'Full OS',
    });
  }
  customer.portalTenantId = portalIdentity.tenantId;
  const serverBusinessName = String(portalIdentity.businessName || '').trim();
  if (serverBusinessName && serverBusinessName !== 'رستوران جدید') customer.businessName = serverBusinessName;
  else if (!customer.businessName) customer.businessName = portalIdentity.businessName;
  if (!customer.ownerName) customer.ownerName = portalIdentity.ownerName;
  return customer;
}
function ensurePortalCustomerSession(identityInput = portalIdentity) {
  const customer = ensurePortalCustomer(identityInput);
  if (!customer) return null;
  if (portalStaffLoginMode) {
    if (!session || session.customerId !== customer.id || !session.staffUserId || !RestaurantCore.validateSession(state, session.id)) setActiveSession(null);
    return customer;
  }
  if (!session || session.customerId !== customer.id || !RestaurantCore.validateSession(state, session.id)) {
    setActiveSession(RestaurantCore.login(state, customer.email, PORTAL_SESSION_PASSWORD));
  }
  return customer;
}
function migrateDisplayState(next) {
  if (RestaurantCore.migrateAuthState) RestaurantCore.migrateAuthState(next);
  next.inventory?.forEach(x => {
    const oldUnit = x.unit === 'ml' ? 'میلی‌لیتر' : x.unit === 'g' ? 'گرم' : x.unit;
    if (oldUnit === 'میلی‌لیتر' || oldUnit === 'گرم') {
      next.recipes?.forEach(recipe => recipe.ingredients?.forEach(ing => { if (ing.inventoryItemId === x.id && !ing.unit) ing.unit = oldUnit; }));
      const factor = oldUnit === 'میلی‌لیتر' ? 0.001 : 0.001;
      x.stock = Number(((Number(x.stock || 0)) * factor).toFixed(6));
      x.minStock = Number(((Number(x.minStock || 0)) * factor).toFixed(6));
      x.unitCost = Number(((Number(x.unitCost || 0)) / factor).toFixed(6));
      x.unit = oldUnit === 'میلی‌لیتر' ? 'لیتر' : 'کیلوگرم';
      x.recipeUnit = oldUnit;
    } else if (!x.recipeUnit) x.recipeUnit = x.unit || 'عدد';
  });
  if (!Array.isArray(next.purchases)) next.purchases = [];
  if (!Array.isArray(next.customerProfiles)) next.customerProfiles = [];
  if (!Array.isArray(next.purchaseInvoices)) next.purchaseInvoices = [];
  if (!Array.isArray(next.financialAccounts)) next.financialAccounts = [];
  if (!Array.isArray(next.cheques)) next.cheques = [];
  if (!Array.isArray(next.shifts)) next.shifts = [];
  if (!Array.isArray(next.staffUsers)) next.staffUsers = [];
  if (!Array.isArray(next.staffInvitations)) next.staffInvitations = [];
  if (!Array.isArray(next.passwordResetTokens)) next.passwordResetTokens = [];
  if (!Array.isArray(next.securityEvents)) next.securityEvents = [];
  if (!Array.isArray(next.backupExports)) next.backupExports = [];
  next.customers?.forEach(c => { if (c.businessName === 'کافه تست واقعی') c.businessName = 'رستوران نمونه'; });
  next.purchases.forEach(p => { if (!p.paymentStatus) p.paymentStatus = 'unpaid'; });
  next.orders?.forEach((order, index) => {
    if (!order.status) order.status = 'completed';
    if (!order.trackingNumber) order.trackingNumber = index + 1;
    if (!order.statusUpdatedAt) order.statusUpdatedAt = order.createdAt || new Date().toISOString();
  });
  if (RestaurantCore.normalizeDailyReceiptNumbers) RestaurantCore.normalizeDailyReceiptNumbers(next);
  next.staffUsers?.forEach((u, index) => {
    if (!u.personnelCode) u.personnelCode = String(u.staffCode || u.code || '').replace(/[\s\-]/g, '').trim();
    const ownerCustomer = next.customers?.find(c => c.id === u.customerId && String(c.email || '').trim() === String(u.email || '').trim());
    if (!u.personnelCode && !ownerCustomer) u.personnelCode = String(1000 + index);
    delete u.pin;
  });
}
function saveState(next = state) {
  const serialized = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, serialized);
  sharedLastSerialized = serialized;
  if (sharedSyncEnabled && !sharedApplyingRemote) {
    sharedPendingSerialized = serialized;
    sharedPendingSince = Date.now();
    scheduleSharedStateSave(serialized);
  }
}
function sharedStatePayload(nextState) {
  const payload = JSON.parse(JSON.stringify(nextState || {}));
  delete payload.sessions;
  return payload;
}
function scheduleSharedStateSave(serialized = localStorage.getItem(STORAGE_KEY) || '') {
  if (!serialized) return;
  sharedPendingSerialized = serialized;
  sharedPendingSince = Date.now();
  clearTimeout(sharedSaveTimer);
  sharedSaveTimer = setTimeout(() => pushSharedState(serialized), 180);
}
async function flushSharedStateSave(serialized = localStorage.getItem(STORAGE_KEY) || '') {
  if (!serialized) return true;
  sharedPendingSerialized = serialized;
  sharedPendingSince = Date.now();
  clearTimeout(sharedSaveTimer);
  sharedSaveTimer = null;
  return pushSharedState(serialized, { throwOnError: true });
}
async function pushSharedState(serialized = localStorage.getItem(STORAGE_KEY) || '', options = {}) {
  if (!sharedSyncEnabled || !serialized) return true;
  if (serialized !== (localStorage.getItem(STORAGE_KEY) || '')) {
    if (sharedPendingSerialized === serialized) { sharedPendingSerialized = ''; sharedPendingSince = 0; }
    return true;
  }
  const savePromise = (async () => {
    try {
      if (serialized !== (localStorage.getItem(STORAGE_KEY) || '')) {
        if (sharedPendingSerialized === serialized) { sharedPendingSerialized = ''; sharedPendingSince = 0; }
        return true;
      }
      const updatedAt = Date.now() / 1000;
      const response = await fetch(SHARED_STATE_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedAt, data: sharedStatePayload(JSON.parse(serialized)) }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('SYNC_SAVE_FAILED');
      const result = await response.json();
      sharedStateRevision = Number(result.updatedAt || updatedAt);
      if (sharedPendingSerialized === serialized) { sharedPendingSerialized = ''; sharedPendingSince = 0; }
      return true;
    } catch (error) {
      console.warn('shared state save failed', error);
      if (sharedPendingSerialized === serialized) { sharedPendingSerialized = ''; sharedPendingSince = 0; }
      if (options.throwOnError) throw error;
      return false;
    } finally {
      if (sharedSaveInFlight === savePromise) sharedSaveInFlight = null;
    }
  })();
  sharedSaveInFlight = savePromise;
  return savePromise;
}
function shouldDelayRemoteApply() {
  if (currentTab === 'sales' || publicQrMode) return false;
  const active = document.activeElement;
  return !!active && active.matches?.('input, textarea, select');
}
function preserveLocalBrowserSessions(remoteState) {
  if (!remoteState || !Array.isArray(remoteState.sessions)) remoteState.sessions = [];
  const localSessionId = localStorage.getItem(SESSION_KEY) || '';
  const localSessions = Array.isArray(state?.sessions) ? state.sessions : [];
  const keep = localSessions.filter(local => local?.id && (local.id === localSessionId || session?.id === local.id));
  keep.forEach(local => {
    if (!remoteState.sessions.some(remote => remote?.id === local.id)) remoteState.sessions.push({ ...local });
  });
}
function applyRemoteState(remoteState, updatedAt = 0, identity = null) {
  if (!remoteState || !Array.isArray(remoteState.customers)) return;
  const serialized = JSON.stringify(remoteState);
  if (serialized === sharedLastSerialized) {
    sharedStateRevision = Number(updatedAt || sharedStateRevision);
    return;
  }
  sharedApplyingRemote = true;
  preserveLocalBrowserSessions(remoteState);
  migrateDisplayState(remoteState);
  state = remoteState;
  if (portalMode) ensurePortalCustomerSession(identity || portalIdentity);
  sharedLastSerialized = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, sharedLastSerialized);
  session = loadLocalSession(state);
  sharedStateRevision = Number(updatedAt || sharedStateRevision);
  sharedApplyingRemote = false;
  render();
}
function shouldSeedSharedStateFromLocal() {
  return Array.isArray(state.customers) && state.customers.some(c => c.email && c.email !== 'demo@restaurant.test');
}
async function pullSharedState({ initial = false } = {}) {
  if (!sharedSyncEnabled && !initial) return;
  const localSaveBusy = Boolean(sharedPendingSerialized || sharedSaveTimer || sharedSaveInFlight);
  const localSaveStale = sharedPendingSince && Date.now() - sharedPendingSince > 5000;
  if (!initial && localSaveBusy && currentTab !== 'sales' && !publicQrMode && !localSaveStale) return;
  try {
    const syncUrl = `${SHARED_STATE_API}${SHARED_STATE_API.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const response = await fetch(syncUrl, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('SYNC_LOAD_FAILED');
    const result = await response.json();
    if (portalMode) portalIdentity = normalizePortalIdentity(result);
    if (!result.exists) {
      if (portalMode && initial) {
        state = RestaurantCore.createInitialState();
        ensurePortalCustomerSession(portalIdentity);
        saveState(state);
        await pushSharedState(localStorage.getItem(STORAGE_KEY) || JSON.stringify(state));
        render();
      } else if (initial && shouldSeedSharedStateFromLocal()) await pushSharedState(localStorage.getItem(STORAGE_KEY) || JSON.stringify(state));
      return;
    }
    const updatedAt = Number(result.updatedAt || 0);
    if (updatedAt && updatedAt <= sharedStateRevision) return;
    if (!initial && shouldDelayRemoteApply()) return;
    applyRemoteState(result.data, updatedAt, portalIdentity);
    if (initial) render();
  } catch (error) {
    if (portalMode && initial) { ensurePortalCustomerSession(portalIdentity); saveState(state); render(); }
    if (initial) console.warn('shared state unavailable; using browser-local data', error);
  }
}
async function initSharedStateSync() {
  if (sharedSyncStarted) return;
  sharedSyncStarted = true;
  sharedSyncEnabled = true;
  sharedLastSerialized = localStorage.getItem(STORAGE_KEY) || JSON.stringify(state);
  await pullSharedState({ initial: true });
  setInterval(() => pullSharedState(), SHARED_SYNC_INTERVAL_MS);
}
function normalizeKitchenFilterValue(value) { return ['all', 'delayed', 'ready'].includes(value) ? value : 'all'; }
function normalizeKitchenStationValue(value) { return ['all', 'prep', 'grill', 'drinks', 'dessert'].includes(value) ? value : 'all'; }
function loadKitchenFilterState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KITCHEN_FILTER_KEY) || '{}');
    const station = normalizeKitchenStationValue(parsed.station);
    const byStation = parsed.byStation && typeof parsed.byStation === 'object' ? parsed.byStation : {};
    return { station, filter: normalizeKitchenFilterValue(byStation[station] || parsed.filter), byStation };
  } catch {
    return { station: 'all', filter: 'all', byStation: {} };
  }
}
function saveKitchenFilterState(station = kitchenStationFilter, filter = kitchenQueueFilter) {
  const nextStation = normalizeKitchenStationValue(station);
  const nextFilter = normalizeKitchenFilterValue(filter);
  const current = loadKitchenFilterState();
  const byStation = { ...current.byStation, [nextStation]: nextFilter };
  localStorage.setItem(KITCHEN_FILTER_KEY, JSON.stringify({ station: nextStation, filter: nextFilter, byStation }));
}
function rememberedKitchenFilterForStation(station) {
  const current = loadKitchenFilterState();
  return normalizeKitchenFilterValue(current.byStation?.[normalizeKitchenStationValue(station)] || current.filter);
}
function loadKitchenSnoozes() {
  try { return JSON.parse(localStorage.getItem(KITCHEN_SNOOZE_KEY) || '{}') || {}; }
  catch { return {}; }
}
function saveKitchenSnoozes(next) { localStorage.setItem(KITCHEN_SNOOZE_KEY, JSON.stringify(next)); }
function kitchenSnoozeUntil(orderId) { return loadKitchenSnoozes()[orderId] || ''; }
function isKitchenSnoozed(orderId, now = new Date()) {
  const until = kitchenSnoozeUntil(orderId);
  return until && new Date(until).getTime() > new Date(now).getTime();
}
function snoozeKitchenOrder(orderId, minutes = 10) {
  const snoozes = loadKitchenSnoozes();
  snoozes[orderId] = new Date(Date.now() + (minutes * 60000)).toISOString();
  saveKitchenSnoozes(snoozes);
}
function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sectionBackupLabel(section) { return section === 'inventory' ? 'انبار' : 'رسپی'; }
function sectionBackupFilePrefix(section) { return section === 'inventory' ? 'backup-inventory' : 'backup-recipes'; }
function sectionBackupIcon(type) {
  const icons = {
    export: '<svg class="section-backup-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v10"/><path d="M8 7l4-4 4 4"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
    import: '<svg class="section-backup-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21V11"/><path d="M8 17l4 4 4-4"/><path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/></svg>',
  };
  return icons[type] || '';
}
function sectionBackupControls(section) {
  const label = sectionBackupLabel(section);
  return `<div class="section-backup-actions" data-section-backup-actions="${section}"><button type="button" class="section-backup-decal section-backup-export-decal" data-export-section-backup="${section}" data-tooltip="دریافت فایل پشتیبان" aria-label="دریافت فایل پشتیبان ${label}">${sectionBackupIcon('export')}</button><input type="file" accept="application/json,.json" hidden data-import-section-backup-input="${section}"><button type="button" class="section-backup-decal section-backup-import-decal" data-import-section-backup="${section}" data-tooltip="ایمپورت فایل پشتیبان" aria-label="ایمپورت فایل پشتیبان ${label}">${sectionBackupIcon('import')}</button></div>`;
}
function bindSectionBackupControls(customer) {
  document.querySelectorAll('[data-export-section-backup]').forEach(btn => btn.addEventListener('click', () => {
    const section = btn.dataset.exportSectionBackup;
    const backup = RestaurantCore.createSectionBackup(state, customer.id, section);
    downloadTextFile(`${sectionBackupFilePrefix(section)}-${Date.now()}.json`, JSON.stringify(backup, null, 2));
    backupMessage = `بک‌آپ کامل ${sectionBackupLabel(section)} آماده دریافت شد.`;
    render();
  }));
  document.querySelectorAll('[data-import-section-backup]').forEach(btn => btn.addEventListener('click', () => {
    const input = document.querySelector(`[data-import-section-backup-input="${btn.dataset.importSectionBackup}"]`);
    if (input) input.click();
  }));
  document.querySelectorAll('[data-import-section-backup-input]').forEach(input => input.addEventListener('change', () => {
    const file = input.files?.[0];
    const section = input.dataset.importSectionBackupInput;
    if (!file || !section) return;
    const label = sectionBackupLabel(section);
    if (!confirm(`کل بخش ${label} این اکانت با محتوای فایل جایگزین شود؟ سایر بخش‌ها تغییر نمی‌کنند.`)) { input.value = ''; return; }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const result = RestaurantCore.restoreSectionBackup(state, customer.id, JSON.parse(reader.result), section);
        backupMessage = `ایمپورت بک‌آپ کامل ${label} انجام شد؛ ${numberText(result.replacedCount, 0)} ردیف جایگزین شد.`;
        input.value = '';
        saveState();
        render();
      } catch {
        input.value = '';
        alert(`فایل بک‌آپ کامل ${label} معتبر نیست`);
      }
    });
    reader.readAsText(file);
  }));
}
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const EN_DIGITS = '0123456789';
function faNum(value) { return String(value ?? '').replace(/[0-9]/g, d => FA_DIGITS[Number(d)]).replace(/[٠-٩]/g, d => FA_DIGITS['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]); }
function toEnglishDigits(value) { return String(value ?? '').replace(/[۰-۹]/g, d => EN_DIGITS[FA_DIGITS.indexOf(d)]).replace(/[٠-٩]/g, d => EN_DIGITS['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]); }
function formatNationalIdInput(value) {
  const digits = toEnglishDigits(value).replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';
  if (digits.length <= 3) return faNum(digits);
  if (digits.length <= 9) return `${faNum(digits.slice(0, 3))}-${faNum(digits.slice(3))}`;
  return `${faNum(digits.slice(0, 3))}-${faNum(digits.slice(3, 9))}-${faNum(digits.slice(9, 10))}`;
}
function normalizeNationalIdForSave(value) { return formatNationalIdInput(value); }
function formatMobileInput(value) {
  const digits = toEnglishDigits(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 4) return faNum(digits);
  if (digits.length <= 7) return `${faNum(digits.slice(0, 4))}-${faNum(digits.slice(4))}`;
  if (digits.length <= 9) return `${faNum(digits.slice(0, 4))}-${faNum(digits.slice(4, 7))} ${faNum(digits.slice(7))}`;
  return `${faNum(digits.slice(0, 4))}-${faNum(digits.slice(4, 7))} ${faNum(digits.slice(7, 9))} ${faNum(digits.slice(9, 11))}`;
}
function normalizeMobileForSave(value) { return formatMobileInput(value); }
function parseFaNumber(value) { return Number(toEnglishDigits(value).replace(/[က,٬\s]/g, '')) || 0; }
function numberText(n, maxFraction = 2) { return faNum(Number(n || 0).toLocaleString('fa-IR', { maximumFractionDigits: maxFraction })); }
function receiptNumberText(n) { return faNum(String(Math.round(Number(n || 0)))); }
function money(n) { return `${numberText(Math.round(n || 0), 0)} تومان`; }
function orderFinalTotal(order) { return Number(order?.grandTotal ?? Math.max(0, Math.round(Number(order?.subtotal ?? order?.total ?? 0) - Number(order?.discountTotal || 0) + Number(order?.taxTotal || 0) + Number(order?.serviceChargeTotal || 0)))); }
function unitLabel(unit) { return ({ ml: 'میلی‌لیتر', g: 'گرم', kg: 'کیلوگرم', l: 'لیتر', pcs: 'عدد', piece: 'عدد' }[unit] || unit || 'عدد'); }
function packageLabel(name) { return ({ 'Menu Starter': 'منوی پایه', 'Menu Pro': 'منوی پیشرفته', 'POS Lite': 'صندوق پایه', 'Full OS': 'سامانه کامل' }[name] || name); }
function moduleLabel(name) { return ({ 'digital-menu': 'منوی دیجیتال', orders: 'سفارش‌گیری', pos: 'صندوق', reports: 'گزارش‌ها', inventory: 'انبار', accounting: 'حسابداری', crm: 'باشگاه مشتریان' }[name] || name); }
function ledgerTypeLabel(type) { return ({ revenue: 'درآمد', cost: 'قیمت تمام‌شده', expense: 'هزینه', 'supplier-payment': 'پرداخت به تأمین‌کننده' }[type] || type); }
function accountTypeLabel(type) { return ({ bank: 'حساب بانکی', cash: 'صندوق نقدی', pos: 'کارت‌خوان', online: 'آنلاین', cheque: 'چک', petty: 'آنلاین' }[type] || type || 'حساب مالی'); }
function accountTypeOptions(current = 'bank') { return [['bank','حساب بانکی'],['cash','صندوق نقدی'],['pos','کارت‌خوان'],['online','آنلاین'],['cheque','چک']].map(([value,label]) => `<option value="${value}" ${(current === value || (current === 'petty' && value === 'online'))?'selected':''}>${label}</option>`).join(''); }
function paymentMethodOptions(current = 'بانکی') { return ['بانکی','نقدی','چکی'].map(x => `<option value="${x}" ${x===current?'selected':''}>${x}</option>`).join(''); }
function expenseCategoryOptions(current = 'تعمیرات و نگهداری') { return ['اجاره ملک','حقوق و دستمزد','تعمیرات و نگهداری','قبوض','تجهیزات و ابزار','خدمات','سایر هزینه‌ها'].map(x => `<option value="${x}" ${x===current?'selected':''}>${x}</option>`).join(''); }
function financialAccountOptions(customerId, current = '') { const accounts = RestaurantCore.getFinancialAccounts ? RestaurantCore.getFinancialAccounts(state, customerId) : []; return `<option value="">بدون انتخاب</option>${accounts.map(a => `<option value="${esc(a.id)}" ${a.id===current?'selected':''}>${esc(a.name)} — ${esc(accountTypeLabel(a.type))}</option>`).join('')}`; }
function securityEventTypeLabel(type) { return ({ 'staff-invitation-created': 'دعوت کارکنان ساخته شد', 'staff-invitation-cancelled': 'دعوت کارکنان لغو شد', 'staff-invitation-accepted': 'دعوت کارکنان پذیرفته شد', 'password-reset-requested': 'درخواست بازیابی رمز ساخته شد', 'password-reset-used': 'رمز عبور تغییر کرد', 'staff-activated': 'کاربر کارکنان فعال شد', 'staff-deactivated': 'کاربر کارکنان غیرفعال شد', 'staff-deleted': 'کاربر کارکنان حذف شد' }[type] || type); }
function migrationCollectionLabel(name) { return ({ customers: 'مشتریان', staffUsers: 'کاربران کارکنان', staffInvitations: 'دعوت‌های کارکنان', passwordResetTokens: 'درخواست‌های بازیابی رمز', securityEvents: 'رویدادهای امنیتی', backupExports: 'فایل‌های پشتیبان', sessions: 'نشست‌های ورود', menus: 'منوها', menuItems: 'آیتم‌های منو', inventory: 'مواد اولیه', recipes: 'رسپی‌ها', purchases: 'خریدهای انبار', orders: 'فروش‌ها و سفارش‌ها', ledger: 'دفتر مالی', expenses: 'هزینه‌ها' }[name] || name); }
function purchasePaymentStatusLabel(status) { return status === 'paid' ? 'تسویه‌شده' : 'پرداخت‌نشده'; }
function invitationStatusLabel(status) { return ({ pending: 'در انتظار پذیرش', accepted: 'پذیرفته‌شده', expired: 'منقضی‌شده', cancelled: 'لغوشده' }[status] || status); }
function resetStatusLabel(status) { return ({ pending: 'در انتظار تغییر رمز', used: 'استفاده‌شده', expired: 'منقضی‌شده' }[status] || status); }
function orderStatusLabel(status) { return ({ received: 'دریافت‌شده', accepted: 'پذیرفته‌شده', preparing: 'در حال آماده‌سازی', ready: 'آماده تحویل', completed: 'تکمیل‌شده' }[status] || 'تکمیل‌شده'); }
function orderStatusOptions(selected) { return ['received','accepted','preparing','ready','completed'].map(status => `<option value="${status}" ${status === selected ? 'selected' : ''}>${orderStatusLabel(status)}</option>`).join(''); }
function kitchenStationLabel(station) { return RestaurantCore.getKitchenStationLabel ? RestaurantCore.getKitchenStationLabel(station) : ({ prep: 'آماده‌سازی', grill: 'گریل', drinks: 'نوشیدنی', dessert: 'دسر' }[station] || 'آماده‌سازی'); }
function kitchenStationOptions(selected = 'prep') { return ['prep','grill','drinks','dessert'].map(station => `<option value="${station}" ${station === selected ? 'selected' : ''}>${kitchenStationLabel(station)}</option>`).join(''); }
function nextOrderStatusLabel(status) {
  const statuses = ['received','accepted','preparing','ready','completed'];
  const normalized = statuses.includes(status) ? status : 'completed';
  const next = statuses[Math.min(statuses.indexOf(normalized) + 1, statuses.length - 1)];
  return orderStatusLabel(next);
}
function orderCompletionSummaryText(summary) {
  if (!summary?.completedTodayCount) return 'هنوز سفارشی امروز تحویل و تکمیل نشده است.';
  const last = summary.lastCompletedAt ? `؛ آخرین تحویل: شماره پیگیری ${numberText(summary.lastTrackingNumber || 0, 0)} در ${formatDate(summary.lastCompletedAt)}` : '';
  return `${numberText(summary.completedTodayCount, 0)} سفارش امروز تحویل و تکمیل شده است${last}`;
}
function playKitchenAlertSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return alert('مرورگر این دستگاه پخش زنگ هشدار را پشتیبانی نمی‌کند.');
  const ctx = new AudioContextClass();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
  master.connect(ctx.destination);
  [0, 0.16, 0.32].forEach((offset, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(index === 1 ? 988 : 784, ctx.currentTime + offset);
    osc.connect(master);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.12);
  });
  setTimeout(() => ctx.close?.(), 800);
}
function kitchenFilterLabel(filter) { return ({ all: 'همه سفارش‌های فعال', delayed: 'فقط دیرکردها', ready: 'آماده تحویل' }[filter] || 'همه سفارش‌های فعال'); }
function kitchenStationFilterLabel(station) { return station === 'all' ? 'همه ایستگاه‌ها' : kitchenStationLabel(station); }
function formatDate(value) { return faNum(new Date(value).toLocaleString('fa-IR')); }
function accountingRangeDates(range) {
  if (range === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { fromDate: start.toISOString(), toDate: end.toISOString() };
  }
  const days = range === 'seven' ? 7 : range === 'thirty' ? 30 : 0;
  if (!days) return {};
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { fromDate: from.toISOString(), toDate: new Date().toISOString() };
}
function accountingFilterPayload() { return { type: accountingFilter.type, ...accountingRangeDates(accountingFilter.range) }; }
function securityEventFilterPayload() { return { type: securityEventFilter.type, ...accountingRangeDates(securityEventFilter.range) }; }
function isMoneyFieldName(name = '') { return /amount|price|cost|balance|unitCost|openingBalance|wage|salary/i.test(String(name)); }
function formatGroupedNumberInput(value) {
  const raw = toEnglishDigits(value).replace(/[٬,\s]/g, '').replace(/[^0-9.٫]/g, '').replace('٫', '.');
  if (!raw) return '';
  const hasTrailingDecimal = raw.endsWith('.');
  const [integerPart, ...fractionParts] = raw.split('.');
  const grouped = integerPart ? Number(integerPart).toLocaleString('fa-IR', { maximumFractionDigits: 0 }) : '۰';
  const fraction = fractionParts.join('').replace(/[^0-9]/g, '');
  return grouped + (hasTrailingDecimal ? '٫' : fraction ? `٫${faNum(fraction)}` : '');
}
function numInput(name, value, attrs = '') { const numericValue = typeof value === 'number' ? value : parseFaNumber(value || 0); const display = value === '' || value == null || numericValue === 0 ? '' : numberText(value); const moneyAttr = isMoneyFieldName(name) ? ' data-money' : ''; return `<input name="${name}" inputmode="decimal" data-number${moneyAttr} value="${display}" ${attrs}>`; }
function unitSelect(name, selected, units = ['کیلوگرم', 'لیتر', 'عدد']) { const placeholder = selected === '' ? '<option value="" selected disabled>انتخاب واحد</option>' : ''; return `<select name="${name}">${placeholder}${units.map(unit => `<option value="${unit}" ${unit === selected ? 'selected' : ''}>${unit}</option>`).join('')}</select>`; }
const IRAN_TIME_ZONE = 'Asia/Tehran';
function iranGregorianDateText(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: IRAN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const val = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${val('year')}-${val('month')}-${val('day')}`;
}
function iranClockTimeText(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: IRAN_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const val = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${val('hour')}:${val('minute')}`;
}
function iranDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: IRAN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const val = (type) => parts.find((part) => part.type === type)?.value || '';
  return { weekday: val('weekday'), year: val('year'), month: val('month'), day: val('day'), hour: val('hour'), minute: val('minute') };
}
function gregorianToJalaliParts(date = new Date()) {
  const p = iranDateTimeParts(date);
  return { year: p.year, month: p.month, day: p.day };
}
function jalaliDateText(date = new Date()) { const p = gregorianToJalaliParts(date); return `${p.year}/${p.month}/${p.day}`; }
function iranTimeText(date = new Date()) { const p = iranDateTimeParts(date); return `${p.hour}:${p.minute}`; }
function persianWeekdayName(date = new Date()) {
  return iranDateTimeParts(date).weekday.replace(/^./, first => first.toLocaleUpperCase('fa-IR'));
}
function businessDateLine(date = new Date()) { return `${persianWeekdayName(date)} | ${jalaliDateText(date)} | ساعت ${iranTimeText(date)}`; }

function appLogoMarkup() {
  return `<div class="app-logo restaurant-graphic-logo" aria-label="لوگوی سامانه رستوران" role="img"><img src="./assets/restaurant-system-logo.png?v=attendance-early-late-choice-46" alt="لوگوی سامانه رستوران" loading="eager" decoding="async"></div>`;
}
function updateBusinessDateLineDom(date = new Date()) {
  const line = document.querySelector('[data-business-date-line]');
  if (line) line.textContent = businessDateLine(date);
}
function jalaliDateInput(name, label, value = jalaliDateText()) { return `<label>${label}<div class="jalali-date-field"><input name="${name}" value="${esc(value || jalaliDateText())}" placeholder="۱۴۰۳/۰۱/۰۱" data-jalali-date data-jalali-calendar><button type="button" class="secondary jalali-calendar-button" data-open-jalali-calendar aria-label="انتخاب تاریخ">📅</button></div></label>`; }
function parseJalaliDateParts(value) {
  const parts = toEnglishDigits(value || jalaliDateText()).split(/[\/\-.]/).map(part => Number(part));
  const today = gregorianToJalaliParts();
  return { year: parts[0] || Number(toEnglishDigits(today.year)), month: parts[1] || Number(toEnglishDigits(today.month)), day: parts[2] || Number(toEnglishDigits(today.day)) };
}
function renderJalaliCalendarBox(value = jalaliDateText()) {
  const current = parseJalaliDateParts(value);
  const years = Array.from({ length: 11 }, (_, index) => current.year - 5 + index);
  const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const weekDays = ['شنبه','یک','دو','سه','چهار','پنج','جمعه'];
  const daysInMonth = current.month <= 6 ? 31 : current.month <= 11 ? 30 : 29;
  const options = (items, selected) => items.map(item => `<option value="${item.value ?? item}" ${(item.value ?? item) === selected ? 'selected' : ''}>${esc(item.label ?? faNum(String(item)))}</option>`).join('');
  const weekHeaders = weekDays.map(day => `<span class="jalali-weekday">${esc(day)}</span>`).join('');
  const dayButtons = Array.from({ length: daysInMonth }, (_, index) => index + 1).map(day => `<button type="button" class="jalali-day-button ${day === current.day ? 'active' : ''}" data-jalali-day="${day}">${faNum(String(day))}</button>`).join('');
  return `<div class="jalali-calendar-controls"><label>سال<select data-jalali-year>${options(years, current.year)}</select></label><label>ماه<select data-jalali-month>${options(months.map((label, idx) => ({ value: idx + 1, label })), current.month)}</select></label></div><div class="jalali-calendar-weekdays">${weekHeaders}</div><div class="jalali-calendar-days">${dayButtons}</div>`;
}
function closeJalaliCalendars(exceptHolder = null) {
  const holderId = exceptHolder?.dataset?.jalaliHolderId || '';
  document.querySelectorAll('.jalali-calendar-popover').forEach(pop => {
    if (!holderId || pop.dataset.jalaliHolderId !== holderId) pop.remove();
  });
}
function positionFloatingJalaliCalendar(pop, holder) {
  const rect = holder.getBoundingClientRect();
  const gap = 6;
  const width = Math.min(280, window.innerWidth - 16);
  pop.style.width = `${width}px`;
  const naturalHeight = pop.offsetHeight || 244;
  const below = rect.bottom + gap;
  const above = rect.top - naturalHeight - gap;
  const preferredTop = below + naturalHeight <= window.innerHeight - 8 ? below : above;
  const top = Math.max(8, Math.min(preferredTop, window.innerHeight - naturalHeight - 8));
  const right = Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - width - 8));
  pop.style.top = `${top}px`;
  pop.style.right = `${right}px`;
}
function openFloatingJalaliCalendar(input, holder, event = null) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (!input || !holder) return;
  if (!holder.dataset.jalaliHolderId) holder.dataset.jalaliHolderId = `jalali-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  closeJalaliCalendars();
  const pop = document.createElement('div');
  pop.className = 'jalali-calendar-popover';
  pop.dataset.jalaliHolderId = holder.dataset.jalaliHolderId;
  const writeValue = (year, month, day) => {
    input.value = `${faNum(String(year))}/${faNum(String(month).padStart(2,'0'))}/${faNum(String(day).padStart(2,'0'))}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const renderIntoPopover = (value = input.value) => {
    pop.innerHTML = renderJalaliCalendarBox(value);
    positionFloatingJalaliCalendar(pop, holder);
  };
  renderIntoPopover(input.value);
  document.body.appendChild(pop);
  positionFloatingJalaliCalendar(pop, holder);
  pop.addEventListener('pointerdown', event => event.stopPropagation());
  pop.addEventListener('click', event => {
    event.stopPropagation();
    const dayButton = event.target.closest?.('[data-jalali-day]');
    if (!dayButton) return;
    event.preventDefault();
    const year = pop.querySelector('[data-jalali-year]')?.value;
    const month = pop.querySelector('[data-jalali-month]')?.value;
    writeValue(year, month, dayButton.dataset.jalaliDay);
    closeJalaliCalendars();
  });
  pop.addEventListener('change', event => {
    event.stopPropagation();
    if (!event.target.closest?.('[data-jalali-year],[data-jalali-month]')) return;
    const year = pop.querySelector('[data-jalali-year]')?.value;
    const month = pop.querySelector('[data-jalali-month]')?.value;
    const current = parseJalaliDateParts(input.value);
    const daysInMonth = Number(month) <= 6 ? 31 : Number(month) <= 11 ? 30 : 29;
    const day = Math.min(current.day || 1, daysInMonth);
    writeValue(year, month, day);
    renderIntoPopover(input.value);
  });
}
function cleanPersianText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[‌‍‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[ـ]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}
function normalizeImportText(value) { return cleanPersianText(value).replace(/قيمت/g, 'قیمت'); }
function structuredRowFromCells(cells) {
  const clean = cells.map(c => normalizeImportText(c).replace(/[က]/g, '').trim()).filter(Boolean);
  if (!clean.length) return {};
  if (clean.length >= 5) return { name: clean[0], qty: clean[1], unit: clean[2], unitCost: clean.slice(3, -1).join(''), minStock: clean[clean.length - 1] };
  return { name: clean[0], qty: clean[1] || '', unit: clean[2] || '', unitCost: clean[3] || '', minStock: clean[4] || '' };
}
function parseStructuredRows(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const lines = raw.split(/\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => normalizeImportText(h.trim()));
  const hasHeader = headers.some(h => ['نام','name','واحد','unit','موجودی','stock','قیمت واحد','unitCost','مقدار','qty'].includes(h));
  const body = hasHeader ? lines.slice(1) : lines;
  return body.map(line => {
    const cells = line.split(delimiter).map(c => c.trim()).filter(Boolean);
    if (hasHeader && cells.length <= headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = toEnglishDigits(normalizeImportText(cells[idx] || '')); });
      return row;
    }
    return structuredRowFromCells(cells);
  });
}
function looksLikeRawPdfDump(text) {
  const raw = String(text || '');
  return /%PDF-\d|\b\d+\s+\d+\s+obj\b|xref\s*\n|endobj|stream\s*\n/i.test(raw);
}
function normalizeInventoryImportUnit(value) {
  return normalizeInvoiceUnit(value);
}
function parseInventoryPdfTextRows(text) {
  if (looksLikeRawPdfDump(text)) return [];
  return String(text || '').replace(new RegExp(String.fromCharCode(13), 'g'), String.fromCharCode(10)).split(String.fromCharCode(10))
    .map(line => line.replace(/[،؛;|\t]+/g, ',').trim())
    .filter(line => line && !/^(نام|شرح|ردیف|فاکتور|جمع|مبلغ|واحد|موجودی)/.test(line))
    .map(line => {
      const cells = line.split(',').map(x => x.trim()).filter(Boolean);
      if (cells.length >= 4) {
        const [name, stock, unit, unitCost, minStock = 0] = cells;
        return { name, stock: parseFaNumber(stock), unit: normalizeInventoryImportUnit(unit), unitCost: parseFaNumber(unitCost), minStock: parseFaNumber(minStock) };
      }
      const match = line.match(/^(.+?)\s+([\d۰-۹٠-٩.,٫]+)\s*(کیلوگرم|کیلو|لیتر|میلی‌لیتر|میلی لیتر|گرم|عدد|دانه)\s+([\d۰-۹٠-٩.,٫]+)(?:\s+([\d۰-۹٠-٩.,٫]+))?\s*$/);
      if (!match) return null;
      return { name: match[1].trim(), stock: parseFaNumber(match[2]), unit: normalizeInventoryImportUnit(match[3]), unitCost: parseFaNumber(match[4]), minStock: parseFaNumber(match[5] || 0) };
    })
    .filter(row => row && row.name && row.unit && Number.isFinite(row.stock) && Number.isFinite(row.unitCost));
}
function inventoryRowsToCsvText(rows) {
  return rows.map(row => [row.name, row.stock, row.unit, row.unitCost, row.minStock || 0].join(',')).join('\n');
}
function parseInventoryImportRows(text) {
  if (looksLikeRawPdfDump(text)) return [];
  const structured = parseStructuredRows(text).map(row => ({
    name: row.name || row['نام'],
    unit: row.unit || row['واحد'],
    stock: parseFaNumber(row.stock ?? row['موجودی'] ?? row.qty ?? row['مقدار'] ?? 0),
    unitCost: parseFaNumber(row.unitCost ?? row['قیمت واحد'] ?? row.price ?? row['قیمت'] ?? 0),
    minStock: parseFaNumber(row.minStock ?? row['حداقل موجودی'] ?? 0),
  })).filter(row => row.name);
  return structured.length ? structured : parseInventoryPdfTextRows(text);
}
function fillInventoryImportRowsFromText(form, text) {
  const textarea = form?.querySelector('[name="rows"]');
  if (!textarea) return 0;
  const rows = parseInventoryImportRows(text);
  if (!rows.length) return 0;
  textarea.value = inventoryRowsToCsvText(rows);
  return rows.length;
}
function parsePurchaseInvoiceRows(text) {
  return parseStructuredRows(text).map(row => ({
    name: row.name || row['نام'],
    qty: parseFaNumber(row.qty ?? row['مقدار'] ?? row.stock ?? row['موجودی'] ?? 0),
    unit: row.unit || row['واحد'],
    unitCost: parseFaNumber(row.unitCost ?? row['قیمت واحد'] ?? row.price ?? row['قیمت'] ?? 0),
  })).filter(row => row.name && row.qty > 0);
}
function normalizeNumberFields(form) { form.querySelectorAll('[data-number]').forEach(input => { input.value = String(parseFaNumber(input.value)); }); }
function bindPersianNumberInputs(scope = document) {
  scope.querySelectorAll('[data-number]').forEach(input => {
    if (input.dataset.numberBound === '1') return;
    input.dataset.numberBound = '1';
    input.addEventListener('input', () => { input.value = input.hasAttribute('data-money') ? formatGroupedNumberInput(input.value) : faNum(toEnglishDigits(input.value).replace(/[^0-9.٬,٫]/g, '')); });
  });
  scope.querySelectorAll('[data-national-id]').forEach(input => {
    if (input.dataset.nationalIdBound === '1') return;
    input.dataset.nationalIdBound = '1';
    input.addEventListener('input', () => { input.value = formatNationalIdInput(input.value); });
  });
  scope.querySelectorAll('[data-mobile]').forEach(input => {
    if (input.dataset.mobileBound === '1') return;
    input.dataset.mobileBound = '1';
    input.value = formatMobileInput(input.value);
    input.addEventListener('input', () => { input.value = formatMobileInput(input.value); });
  });
}
function currentCustomer() {
  if (session?.id && RestaurantCore.validateSession) session = RestaurantCore.validateSession(state, session.id);
  return session ? state.customers.find((c) => c.id === session.customerId) : null;
}
function currentRole() { return session?.role || 'manager'; }
function roleLabel(role) { return RestaurantCore.roleLabel ? RestaurantCore.roleLabel(role) : (role === 'cashier' ? 'صندوق‌دار' : 'مدیر'); }
function canAccessTab(tab) { return RestaurantCore.canAccess ? RestaurantCore.canAccess(currentRole(), tab) : true; }
function defaultTabForRole(role = currentRole()) {
  return role === 'cashier' ? 'sales' : 'dashboard';
}
function renderThemePicker() {
  return `<div class="theme-picker"><span>انتخاب حال‌وهوای محیط کار</span><div>${themeChoices.map(theme => `<button type="button" class="theme-chip ${currentTheme === theme.id ? 'active' : ''}" data-theme-choice="${theme.id}"><b>${theme.label}</b><small>${theme.hint}</small></button>`).join('')}</div></div>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function byCustomer(list) { const c = currentCustomer(); return c ? list.filter((x) => x.customerId === c.id) : []; }
function isUserMenuItem(item) { return item?.userAdded === true; }
function customerMenuItems() { return byCustomer(state.menuItems).filter(isUserMenuItem); }
function customerSaleItems() { return byCustomer(state.menuItems).filter(item => item.available !== false); }
function expenseHint(customerId) { const items = state.expenses.filter(x => x.customerId === customerId).map(x => x.title); return items.length ? `از هزینه‌های ثبت‌شده: ${items.slice(0,2).join('، ')}` : 'هنوز هزینه‌ای ثبت نشده'; }
function lowStockText(warnings) {
  return warnings.map(x => `${x.name}: ${numberText(x.afterStock ?? x.stock)} ${esc(unitLabel(x.unit))} (حداقل ${numberText(x.minStock)})`).join('، ');
}
function notifyLowStock(order) {
  if (order?.lowStockWarnings?.length) alert(`هشدار کمبود موجودی: ${lowStockText(order.lowStockWarnings)}`);
}
function recipeCostDetails(recipe, customerId) {
  return RestaurantCore.calculateRecipeCost(state, customerId, recipe.ingredients).lines.map(line => `${esc(line.name)}: ${numberText(line.qty)} ${esc(unitLabel(line.unit))} = ${money(line.lineCost)}`).join('، ');
}
function printRecipeReport(recipeId) {
  showRecipePrintPreview(recipeId);
}

function showRecipePrintPreview(recipeId) {
  const customer = currentCustomer();
  if (!customer) return;
  const recipe = state.recipes.find(r => r.id === recipeId && r.customerId === customer.id);
  if (!recipe) return alert('رسپی پیدا نشد');
  const item = state.menuItems.find(i => i.id === recipe.itemId && i.customerId === customer.id && isUserMenuItem(i));
  const cost = RestaurantCore.calculateRecipeCost(state, customer.id, recipe.ingredients);
  const ingredientLines = cost.lines.map((line, index) => `<div class="recipe-print-ingredient-line"><span class="recipe-print-number">${numberText(index + 1, 0)}</span><span>${esc(line.name)}: ${numberText(line.qty)} ${esc(unitLabel(line.unit))} = ${money(line.lineCost)}</span></div>`).join('');
  document.querySelector('#printModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'printModalRoot';
  modal.className = 'print-modal-overlay';
  modal.innerHTML = `<section class="print-modal" role="dialog" aria-modal="true">
    <div class="print-actions"><button type="button" class="modal-close-icon" data-close-print aria-label="بستن">×</button>${actionDecalButton('print', 'data-do-print', 'modal-print-decal')}</div>
    <div class="recipe-print-sheet">
      <header class="recipe-print-header"><h1>نام آیتم: ${esc(item?.name || recipe.itemName || 'آیتم')}</h1><strong>قیمت تمام‌شده هر پرس: ${money(cost.totalCost)}</strong></header>
      <section class="recipe-print-box"><h2>مواد اولیه</h2><div class="recipe-print-ingredients">${ingredientLines || '<div>مواد اولیه ثبت نشده است.</div>'}</div></section>
      <section class="recipe-print-box recipe-print-steps"><h2>مراحل آماده‌سازی</h2><p>${esc(recipe.cookingSteps || 'مراحل آماده‌سازی ثبت نشده است.')}</p></section>
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-print]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('[data-do-print]').addEventListener('click', () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 300);
  });
}

function dailyClosingCategoryRows(report) {
  return (report.categorySales || []).map(row => `<tr><td>${esc(row.category)}</td><td>${numberText(row.quantity, 2)}</td><td>${money(row.subtotal)}</td></tr>`).join('') || '<tr><td colspan="3">فروشی در این بازه ثبت نشده است.</td></tr>';
}

function showDailyClosingPrintPreview(options = {}) {
  const customer = currentCustomer();
  if (!customer) return;
  const currentShift = RestaurantCore.getCurrentCashierShift(state, customer.id);
  const shiftId = options.shiftId || currentShift?.id || '';
  const report = RestaurantCore.getDailyClosingReport(state, customer.id, new Date(), shiftId ? { shiftId } : {});
  document.querySelector('#dailyClosingModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'dailyClosingModalRoot';
  modal.className = 'print-modal-overlay';
  const lowStock = report.lowStockWarnings.length ? lowStockText(report.lowStockWarnings) : 'موجودی بحرانی ندارید.';
  const rangeText = `از ${formatDate(report.fromDate)} تا ${formatDate(report.toDate)}`;
  modal.innerHTML = `<section class="print-modal" role="dialog" aria-modal="true">
    <div class="print-actions"><button type="button" class="modal-close-icon" data-close-daily-closing aria-label="بستن">×</button>${actionDecalButton('print', 'data-do-daily-closing-print', 'modal-print-decal')}</div>
    <div class="recipe-print-sheet daily-closing-sheet">
      <header class="daily-closing-header"><h1>بستن حساب روز کاری</h1><strong>${report.shift ? `${esc(report.shift.name)} — ${esc(report.shift.operatorName)}` : 'بدون شیفت باز'} — ${esc(rangeText)}</strong></header>
      <section class="daily-closing-grid">
        <div><span>جمع فروش آیتم‌ها</span><b>${money(report.subtotal)}</b></div>
        <div><span>مالیات</span><b>${money(report.taxTotal)}</b></div>
        <div><span>حق سرویس</span><b>${money(report.serviceChargeTotal)}</b></div>
        <div><span>تخفیف</span><b>${money(report.discountTotal)}</b></div>
        <div class="total"><span>جمع کل فروش</span><b>${money(report.grandTotal)}</b></div>
        <div><span>تعداد فاکتور</span><b>${numberText(report.orderCount, 0)}</b></div>
      </section>
      <section class="recipe-print-box"><h2>فروش به تفکیک دسته‌بندی منو</h2><table class="purchase-invoice-print-table daily-closing-category-table"><thead><tr><th>دسته‌بندی</th><th>تعداد</th><th>مبلغ فروش</th></tr></thead><tbody>${dailyClosingCategoryRows(report)}</tbody></table></section>
      <section class="recipe-print-box"><h2>هشدار کمبود موجودی</h2><p>${esc(lowStock)}</p></section>
      <section class="recipe-print-box"><h2>رویدادهای مالی این بازه</h2>${report.entries.map(entry => `<div class="daily-closing-entry"><span>${esc(ledgerTypeLabel(entry.type))}</span><b>${money(entry.amount)}</b><small>${formatDate(entry.createdAt)}</small></div>`).join('') || '<p>رویداد مالی در این بازه ثبت نشده است.</p>'}</section>
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-daily-closing]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('[data-do-daily-closing-print]').addEventListener('click', () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 300);
  });
}


function hideFloatingTooltip() {
  document.querySelector('#floatingActionTooltip')?.remove();
}

function showFloatingTooltip(target) {
  const text = target?.dataset?.tooltip || target?.getAttribute('aria-label') || '';
  if (!text) return;
  hideFloatingTooltip();
  const tip = document.createElement('div');
  tip.id = 'floatingActionTooltip';
  tip.className = 'floating-action-tooltip';
  tip.textContent = text;
  document.body.appendChild(tip);
  const rect = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const gap = 8;
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  let top = rect.bottom + gap;
  if (top + tipRect.height > window.innerHeight - 8) top = Math.max(8, rect.top - tipRect.height - gap);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}


function showChequeListPreview(kind = 'pending') {
  const customer = currentCustomer();
  if (!customer) return;
  const { accountName, pending, passed, warnings } = chequeCollections(customer);
  const map = {
    warnings: ['هشدار چک‌های نزدیک', warnings],
    pending: ['چک‌های پاس‌نشده', pending],
    passed: ['چک‌های پاس‌شده', passed],
  };
  const [title, list] = map[kind] || map.pending;
  document.querySelector('#chequeListModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'chequeListModalRoot';
  modal.className = 'print-modal-overlay cheque-list-modal-overlay';
  const rows = list.map((ch, idx) => `<tr><td>${numberText(idx + 1, 0)}</td><td>چک ${esc(ch.chequeNumber)}</td><td>${money(ch.amount || 0)}</td><td>${esc(ch.dueDate || 'ثبت نشده')}</td><td>${esc(accountName(ch.accountId))}</td><td>${esc(ch.title || 'پرداخت چکی')}</td></tr>`).join('') || `<tr><td colspan="6">موردی ثبت نشده است.</td></tr>`;
  modal.innerHTML = `<section class="print-modal cheque-list-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="print-actions"><button type="button" class="modal-close-icon" data-close-cheque-list aria-label="بستن">×</button>${actionDecalButton('print', 'data-print-cheque-list', 'modal-print-decal', `پرینت ${title}`)}</div>
    <div class="recipe-print-sheet cheque-list-print-sheet">
      <header class="recipe-print-header cheque-list-print-header"><h1>${esc(title)}</h1><strong>${numberText(list.length, 0)} مورد</strong></header>
      <table class="purchase-invoice-print-table cheque-list-print-table"><thead><tr><th>ردیف</th><th>شماره چک</th><th>مبلغ</th><th>سررسید</th><th>بانک/حساب</th><th>شرح</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-cheque-list]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('[data-print-cheque-list]').addEventListener('click', () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 300);
  });
}

function showPurchaseInvoiceDetailsPreview(invoiceId) {
  const customer = currentCustomer();
  const inv = (RestaurantCore.getPurchaseInvoices ? RestaurantCore.getPurchaseInvoices(state, customer.id) : byCustomer(state.purchaseInvoices || [])).find(item => item.id === invoiceId);
  if (!inv) return alert('فاکتور خرید پیدا نشد');
  document.querySelector('#purchaseInvoiceDetailsModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'purchaseInvoiceDetailsModalRoot';
  modal.className = 'print-modal-overlay purchase-invoice-details-modal-overlay';
  const lineRows = (inv.lines || []).length
    ? inv.lines.map((line, idx) => `<tr><td>${numberText(idx + 1, 0)}</td><td>${esc(line.name || 'بدون نام')}</td><td>${numberText(line.qty || 0)}</td><td>${esc(unitLabel(line.unit))}</td><td>${money(line.unitCost || 0)}</td><td>${money(line.totalCost || 0)}</td></tr>`).join('')
    : `<tr><td colspan="6">این فاکتور آیتم انبار ندارد.</td></tr>`;
  modal.innerHTML = `<section class="print-modal purchase-invoice-details-modal" role="dialog" aria-modal="true" aria-label="جزئیات سند فاکتور خرید">
    <div class="print-actions"><button type="button" class="modal-close-icon" data-close-purchase-invoice-details aria-label="بستن">×</button>${actionDecalButton('print', 'data-print-purchase-invoice-details', 'modal-print-decal', 'پرینت جزئیات سند')}</div>
    <div class="recipe-print-sheet purchase-invoice-print-sheet">
      <h2>جزئیات سند فاکتور خرید</h2>
      <div class="purchase-invoice-print-summary">
        <p><b>تاریخ سند</b><span>${esc(inv.documentDate || inv.invoiceDate || 'ثبت نشده')}</span></p>
        <p><b>شماره سند</b><span>${esc(faNum(inv.documentNumber || 'بدون شماره'))}</span></p>
        <p><b>مبلغ</b><span>${money(inv.totalCost || 0)}</span></p>
        <p><b>عنوان فاکتور</b><span>${esc(inv.title || 'فاکتور خرید')}</span></p>
        <p><b>تأمین‌کننده</b><span>${esc(inv.supplier || 'ثبت نشده')}</span></p>
        <p><b>وضعیت پرداخت</b><span>${inv.paymentStatus === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده'}</span></p>
      </div>
      <h3>آیتم‌های سند</h3>
      <table class="purchase-invoice-print-table"><thead><tr><th>ردیف</th><th>نام آیتم</th><th>مقدار</th><th>واحد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>${lineRows}</tbody></table>
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-purchase-invoice-details]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('[data-print-purchase-invoice-details]').addEventListener('click', () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 300);
  });
}

function showInventoryPrintPreview() {
  const customer = currentCustomer();
  if (!customer) return;
  const rows = byCustomer(state.inventory).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fa'));
  document.querySelector('#inventoryPrintModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'inventoryPrintModalRoot';
  modal.className = 'print-modal-overlay';
  const body = rows.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(unitLabel(item.unit))}</td><td>${numberText(item.stock)}</td><td>${money(item.unitCost || 0)}</td><td>${numberText(item.minStock || 0)}</td></tr>`).join('');
  modal.innerHTML = `<section class="print-modal inventory-print-modal" role="dialog" aria-modal="true">
    <div class="print-actions inventory-print-actions"><button type="button" class="primary inventory-a4-print-button" data-do-inventory-print>چاپ روی A4</button></div>
    <div class="recipe-print-sheet inventory-print-sheet">
      <header class="recipe-print-header"><h1>موجودی انبار</h1><strong>${numberText(rows.length, 0)} قلم</strong></header>
      <table class="inventory-print-table"><thead><tr><th>نام</th><th>واحد</th><th>موجودی</th><th>قیمت</th><th>حداقل</th></tr></thead><tbody>${body || '<tr><td colspan="5">موجودی ثبت نشده است.</td></tr>'}</tbody></table>
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelectorAll('[data-do-inventory-print]').forEach(btn => btn.addEventListener('click', () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 300);
  }));
}

function showHallOrderReceiptPrintPreview(order, options = {}) {
  if (!order) return;
  document.querySelector('#hallReceiptModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'hallReceiptModalRoot';
  modal.className = 'print-modal-overlay hall-receipt-modal-overlay';
  const lineRows = (order.lines || []).map((line, index) => `<tr><td>${numberText(index + 1,0)}</td><td>${esc(line.name)}</td><td>${numberText(line.qty,0)}</td><td>${money(line.unitPrice || line.price || 0)}</td><td>${money(line.lineTotal || ((line.unitPrice || line.price || 0) * (line.qty || 0)))}</td></tr>`).join('');
  modal.innerHTML = `<section class="print-modal hall-receipt-modal" role="dialog" aria-modal="true" aria-label="فیش سفارش سالن">
    <div class="print-actions"><button type="button" class="modal-close-icon" data-close-hall-receipt aria-label="بستن">×</button>${actionDecalButton('print', 'data-print-hall-receipt', 'modal-print-decal', 'پرینت فیش سفارش')}</div>
    <div class="recipe-print-sheet hall-receipt-sheet">
      <header class="recipe-print-header"><h1>فیش سفارش ${esc(order.tableName || '')}</h1><strong>شماره پیگیری ${receiptNumberText(order.trackingNumber || 0)}</strong></header>
      <section class="recipe-print-box"><h2>اقلام سفارش</h2><table class="purchase-invoice-print-table hall-receipt-table"><thead><tr><th>ردیف</th><th>آیتم</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>${lineRows || '<tr><td colspan="5">آیتمی ثبت نشده است.</td></tr>'}</tbody></table></section>
      ${order.orderNote ? `<section class="recipe-print-box"><h2>یادداشت سفارش</h2><p>${esc(order.orderNote)}</p></section>` : ''}
      <section class="recipe-print-box hall-receipt-total"><h2>جمع کل</h2><div class="hall-receipt-charge-lines"><small>جمع آیتم‌ها: ${money(order.subtotal || order.total || 0)}</small>${Number(order.taxTotal || 0) ? `<small>مالیات بر ارزش افزوده ${numberText(order.taxPercent || 0,2)}٪: ${money(order.taxTotal)}</small>` : ''}${Number(order.serviceChargeTotal || 0) ? `<small>حق سرویس ${numberText(order.serviceChargePercent || 0,2)}٪: ${money(order.serviceChargeTotal)}</small>` : ''}</div><strong>${money(order.grandTotal || order.total || 0)}</strong><small>${formatDate(order.createdAt)}</small></section>
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-hall-receipt]').addEventListener('click', () => modal.remove());
  const doPrint = () => { const previousTitle = document.title; document.title = ''; window.print(); setTimeout(() => { document.title = previousTitle; }, 300); };
  modal.querySelector('[data-print-hall-receipt]').addEventListener('click', doPrint);
  if (options.autoPrint) setTimeout(() => { doPrint(); setTimeout(() => modal.remove(), 500); }, 60);
}

function showKitchenTicketPrintPreview(orderId) {
  const customer = currentCustomer();
  if (!customer) return;
  const order = (RestaurantCore.getCustomerOrders ? RestaurantCore.getCustomerOrders(state, customer.id) : byCustomer(state.orders)).find(o => o.id === orderId);
  if (!order) return alert('سفارش پیدا نشد');
  document.querySelector('#kitchenTicketModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'kitchenTicketModalRoot';
  modal.className = 'print-modal-overlay';
  const stationTickets = RestaurantCore.getKitchenStationTickets ? RestaurantCore.getKitchenStationTickets(state, customer.id, order.id) : [{ label: 'آماده‌سازی', lines: order.lines || [] }];
  const stationSections = stationTickets.map(ticket => `<section class="recipe-print-box station-ticket-station"><h2>ایستگاه ${esc(ticket.label)}</h2><div class="station-ticket-lines">${ticket.lines.map((line, index) => `<div class="station-ticket-line"><span class="recipe-print-number">${numberText(index + 1,0)}</span><b>${esc(line.name)}</b><strong>${numberText(line.qty,0)}</strong>${line.note || line.modifiers?.length ? `<small>${esc([line.note, ...(line.modifiers || [])].filter(Boolean).join('، '))}</small>` : ''}</div>`).join('')}</div></section>`).join('');
  modal.innerHTML = `<section class="print-modal" role="dialog" aria-modal="true">
    <div class="print-actions"><button type="button" class="modal-close-icon" data-close-kitchen-ticket aria-label="بستن">×</button>${actionDecalButton('print', 'data-do-kitchen-ticket-print', 'modal-print-decal')}</div>
    <div class="recipe-print-sheet station-ticket-sheet">
      <header class="recipe-print-header"><h1>شماره پیگیری ${receiptNumberText(order.trackingNumber || 0)}</h1><strong>${esc(orderStatusLabel(order.status))}</strong></header>
      ${stationSections || '<section class="recipe-print-box"><p>آیتمی ثبت نشده است.</p></section>'}
      <section class="recipe-print-box"><h2>جزئیات تحویل</h2><p>${orderGuestLine(order) ? esc(orderGuestLine(order)) : 'مهمان ثبت نشده است.'}</p>${order.orderNote ? `<p>یادداشت سفارش: ${esc(order.orderNote)}</p>` : ''}<p>زمان دریافت: ${formatDate(order.createdAt)}</p></section>
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-kitchen-ticket]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('[data-do-kitchen-ticket-print]').addEventListener('click', () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 300);
  });
}

function showKitchenStationQueuePrintPreview(station, filter = kitchenQueueFilter) {
  const customer = currentCustomer();
  if (!customer) return;
  const stationId = station === 'all' ? 'prep' : station;
  const tickets = RestaurantCore.getKitchenStationQueueTickets ? RestaurantCore.getKitchenStationQueueTickets(state, customer.id, stationId, filter) : [];
  document.querySelector('#kitchenStationQueueModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'kitchenStationQueueModalRoot';
  modal.className = 'print-modal-overlay';
  const stationTitle = kitchenStationLabel(stationId);
  const ticketSections = tickets.map(ticket => `<section class="recipe-print-box station-queue-ticket ${ticket.delayed ? 'station-queue-ticket-delayed' : ''}"><h2>شماره پیگیری ${receiptNumberText(ticket.trackingNumber || 0)} — ${esc(orderStatusLabel(ticket.status))}</h2>${orderGuestLine(ticket) ? `<p>${orderGuestLine(ticket)}</p>` : ''}${ticket.orderNote ? `<p>یادداشت سفارش: ${esc(ticket.orderNote)}</p>` : ''}<div class="station-ticket-lines">${ticket.lines.map((line, index) => `<div class="station-ticket-line"><span class="recipe-print-number">${numberText(index + 1,0)}</span><b>${esc(line.name)}</b><strong>${numberText(line.qty,0)}</strong>${line.note || line.modifiers?.length ? `<small>${esc([line.note, ...(line.modifiers || [])].filter(Boolean).join('، '))}</small>` : ''}</div>`).join('')}</div><small>زمان دریافت: ${formatDate(ticket.createdAt)}</small></section>`).join('');
  modal.innerHTML = `<section class="print-modal" role="dialog" aria-modal="true">
    <div class="print-actions"><button type="button" class="modal-close-icon" data-close-station-queue aria-label="بستن">×</button>${actionDecalButton('print', 'data-do-station-queue-print', 'modal-print-decal')}</div>
    <div class="recipe-print-sheet station-queue-sheet">
      <header class="recipe-print-header"><h1>صف ایستگاه ${esc(stationTitle)}</h1><strong>${esc(kitchenFilterLabel(filter))} — ${numberText(tickets.length,0)} سفارش</strong></header>
      ${ticketSections || '<section class="recipe-print-box"><p>سفارشی برای این ایستگاه پیدا نشد.</p></section>'}
    </div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-station-queue]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('[data-do-station-queue-print]').addEventListener('click', () => {
    const previousTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 300);
  });
}


function publicCustomerId() {
  const match = location.hash.match(/^#menu\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
function publicReceiptCustomerId() {
  const match = location.hash.match(/^#receipt\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
function resolvePublicReceiptCustomerId() {
  if (!location.hash.startsWith('#receipt/')) return null;
  const hashCustomerId = publicReceiptCustomerId();
  if (hashCustomerId && state.customers?.some(customer => customer.id === hashCustomerId)) return hashCustomerId;
  if (hashCustomerId && publicTenantId) {
    const customer = state.customers?.find(customer => customer.portalTenantId === publicTenantId);
    if (customer) return customer.id;
  }
  return hashCustomerId;
}
function publicReceiptOrderId() {
  const query = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
  return new URLSearchParams(query).get('order') || '';
}
function publicReceiptLink(customerId, orderId, tableId = '') {
  const url = new URL(`${location.origin}${location.pathname}`);
  url.searchParams.set('v', 'pos-workday-scope-sync-119');
  if (publicTenantId) url.searchParams.set('publicTenant', publicTenantId);
  const query = new URLSearchParams({ order: orderId });
  if (tableId) query.set('table', tableId);
  url.hash = `receipt/${encodeURIComponent(customerId)}?${query.toString()}`;
  return url.toString();
}
function resolvePublicCustomerId() {
  const hashCustomerId = publicCustomerId();
  if (hashCustomerId && (state.customers || []).some((customer) => customer.id === hashCustomerId)) return hashCustomerId;
  if (publicTenantId) {
    const tenantCustomer = (state.customers || []).find((customer) => customer.portalTenantId === publicTenantId);
    if (tenantCustomer) return tenantCustomer.id;
    if (publicQrMode && (state.customers || []).length === 1) return state.customers[0].id;
  }
  return hashCustomerId;
}
function publicMenuHashParams() {
  const query = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
  return new URLSearchParams(query);
}
function publicTableId() {
  return publicMenuHashParams().get('table') || '';
}
function publicMenuTable(customerId) {
  const tableId = publicTableId();
  if (!tableId) return null;
  return RestaurantCore.getHallTables(state, customerId).find((table) => table.id === tableId && table.active !== false) || null;
}
function publicQrOrderKey(customerId, tableId) {
  return `restaurant_qr_order_once_${publicTenantId || customerId}_${tableId || 'general'}`;
}
function publicQrAlreadyOrdered(customerId, tableId) {
  if (!tableId) return false;
  return localStorage.getItem(publicQrOrderKey(customerId, tableId)) === '1';
}
function markPublicQrOrdered(customerId, tableId) {
  if (tableId) localStorage.setItem(publicQrOrderKey(customerId, tableId), '1');
}
function publicQrTableBlocked(table) {
  return Boolean(table && table.activeOrderId);
}
function tablePublicMenuLink(customer, table) {
  const url = new URL(`${location.origin}${location.pathname}`);
  url.searchParams.set('v', 'pos-workday-scope-sync-119');
  const tenantId = customer.portalTenantId || portalIdentity?.tenantId || '';
  if (tenantId) url.searchParams.set('publicTenant', tenantId);
  url.hash = `menu/${encodeURIComponent(customer.id)}?table=${encodeURIComponent(table.id)}`;
  return url.toString();
}
function qrImageUrl(link) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(link)}`;
}


function rememberInventoryScrollFocus(form) {
  const scroller = form?.closest('.inventory-edit-scroll');
  pendingInventoryScrollFocus = form ? {
    id: form.dataset.inventoryId,
    previousScrollTop: scroller ? scroller.scrollTop : 0,
  } : null;
}

function restoreInventoryScrollFocus() {
  if (!pendingInventoryScrollFocus || currentTab !== 'inventory') return;
  const focus = pendingInventoryScrollFocus;
  pendingInventoryScrollFocus = null;
  requestAnimationFrame(() => {
    const scroller = document.querySelector('.inventory-edit-scroll');
    const row = focus.id ? document.querySelector(`[data-inventory-id="${CSS.escape(focus.id)}"]`) : null;
    if (!scroller || !row) return;
    const rowTop = row.offsetTop;
    const centeredTop = Math.max(0, rowTop - Math.round(scroller.clientHeight * 0.42));
    scroller.scrollTop = centeredTop;
    row.classList.add('inventory-row-restored');
    setTimeout(() => row.classList.remove('inventory-row-restored'), 1800);
  });
}

function rememberMenuEditScrollFocus(formOrId) {
  const form = typeof formOrId === 'string' ? document.querySelector(`[data-item-id="${CSS.escape(formOrId)}"]`) : formOrId;
  const scroller = document.querySelector('.menu-edit-panel>.menu-panel-scroll');
  pendingMenuEditScrollFocus = {
    id: form?.dataset?.itemId || (typeof formOrId === 'string' ? formOrId : ''),
    previousScrollTop: scroller ? scroller.scrollTop : 0,
  };
}

function restoreMenuEditScrollFocus() {
  if (!pendingMenuEditScrollFocus || currentTab !== 'menu') return;
  const focus = pendingMenuEditScrollFocus;
  pendingMenuEditScrollFocus = null;
  requestAnimationFrame(() => {
    const scroller = document.querySelector('.menu-edit-panel>.menu-panel-scroll');
    const row = focus.id ? document.querySelector(`[data-item-id="${CSS.escape(focus.id)}"]`) : null;
    if (!scroller) return;
    scroller.scrollTop = focus.previousScrollTop || 0;
    if (row) {
      const rowTop = row.offsetTop;
      if (rowTop < scroller.scrollTop || rowTop > scroller.scrollTop + scroller.clientHeight - row.clientHeight) {
        scroller.scrollTop = Math.max(0, rowTop - Math.round(scroller.clientHeight * 0.42));
      }
      row.classList.add('menu-row-restored');
      setTimeout(() => row.classList.remove('menu-row-restored'), 1800);
    }
  });
}

function rememberAccountScrollFocus(formOrId) {
  const form = typeof formOrId === 'string' ? document.querySelector(`[data-financial-account-id="${CSS.escape(formOrId)}"]`) : formOrId;
  const scroller = document.querySelector('.financial-account-scroll');
  pendingAccountScrollFocus = { id: form?.dataset?.financialAccountId || (typeof formOrId === 'string' ? formOrId : ''), previousScrollTop: scroller ? scroller.scrollTop : 0 };
}

function restoreAccountScrollFocus() {
  if (!pendingAccountScrollFocus || currentTab !== 'accounting' || accountingSubTab !== 'accounts') return;
  const focus = pendingAccountScrollFocus;
  pendingAccountScrollFocus = null;
  requestAnimationFrame(() => {
    const scroller = document.querySelector('.financial-account-scroll');
    const row = focus.id ? document.querySelector(`[data-financial-account-id="${CSS.escape(focus.id)}"]`) : null;
    if (!scroller) return;
    scroller.scrollTop = focus.previousScrollTop || 0;
    if (row) {
      const rowTop = row.offsetTop;
      if (rowTop < scroller.scrollTop || rowTop > scroller.scrollTop + scroller.clientHeight - row.clientHeight) scroller.scrollTop = Math.max(0, rowTop - Math.round(scroller.clientHeight * 0.42));
      row.classList.add('account-row-restored');
      setTimeout(() => row.classList.remove('account-row-restored'), 1800);
    }
  });
}

function calculatorDisplayText() {
  return calculatorValue ? faNum(String(calculatorValue).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/\./g, '٫')) : '۰';
}

function calculatorExpressionPreview() {
  if (!calculatorValue || calculatorValue === 'خطا') return '';
  return calculatorDisplayText();
}

function calculatorSafeResult(expr) {
  const normalized = toEnglishDigits(String(expr || '')).replace(/×/g, '*').replace(/÷/g, '/').replace(/٪/g, '%');
  if (!normalized.trim()) return '';
  if (!/^[0-9+\-*/.()%\s]+$/.test(normalized)) throw new Error('CALC_INVALID');
  const result = Function(`"use strict"; return (${normalized})`)();
  if (!Number.isFinite(Number(result))) throw new Error('CALC_INVALID');
  return String(Number(result.toFixed ? result.toFixed(8) : result)).replace(/\.0+$|(?<=\.\d*?)0+$/g, '');
}

function renderCalculatorModal() {
  const root = document.querySelector('#calculatorModalRoot');
  if (!root) return;
  const keys = [
    { label: 'CE', value: 'clear', action: 'clear', cls: 'calculator-key-accent calculator-key-clear' },
    { label: '⌫', value: 'backspace', action: 'backspace', cls: 'calculator-key-accent calculator-key-backspace' },
    { label: '٪', value: '%', cls: 'calculator-key-percent' },
    { label: '÷', value: '/', cls: 'calculator-key-operator' },
    { label: '۷', value: '7' },
    { label: '۸', value: '8' },
    { label: '۹', value: '9' },
    { label: '×', value: '*', cls: 'calculator-key-operator' },
    { label: '۴', value: '4' },
    { label: '۵', value: '5' },
    { label: '۶', value: '6' },
    { label: '−', value: '-', cls: 'calculator-key-operator' },
    { label: '۱', value: '1' },
    { label: '۲', value: '2' },
    { label: '۳', value: '3' },
    { label: '+', value: '+', cls: 'calculator-key-operator' },
    { label: '۰۰۰', value: '000' },
    { label: '۰', value: '0' },
    { label: '٫', value: '.' },
    { label: '=', value: 'equals', action: 'equals', cls: 'calculator-key-operator calculator-equals' },
  ];
  const keyMarkup = keys.map(key => {
    const attr = key.action === 'clear' ? 'data-calculator-clear' : key.action === 'backspace' ? 'data-calculator-backspace' : key.action === 'equals' ? 'data-calculator-equals' : `data-calculator-key="${esc(key.value)}"`;
    return `<button type="button" class="${esc(key.cls || 'calculator-key-number')}" ${attr}>${esc(key.label)}</button>`;
  }).join('');
  root.innerHTML = `<div class="calculator-overlay" role="dialog" aria-modal="true" aria-label="ماشین حساب"><div class="calculator-popup calculator-reference-layout"><button type="button" class="calculator-close" data-close-calculator aria-label="بستن ماشین حساب">×</button><div class="calculator-screen"><small data-calculator-expression>${calculatorExpressionPreview()}</small><output class="calculator-display" data-calculator-display>${calculatorDisplayText()}</output></div><div class="calculator-grid" aria-label="کلیدهای ماشین حساب">${keyMarkup}</div></div></div>`;
}

function closeCalculatorModal() {
  const root = document.querySelector('#calculatorModalRoot');
  if (root) root.innerHTML = '';
}

function updateCalculatorDisplay() {
  const display = document.querySelector('[data-calculator-display]');
  if (display) display.textContent = calculatorDisplayText();
  const expression = document.querySelector('[data-calculator-expression]');
  if (expression) expression.textContent = calculatorExpressionPreview();
}

function bindCalculator() {
  document.querySelectorAll('[data-open-calculator]').forEach(btn => btn.addEventListener('click', () => { renderCalculatorModal(); }));
  document.querySelector('#calculatorModalRoot')?.addEventListener('click', (event) => {
    if (event.target.classList?.contains('calculator-overlay') || event.target.closest?.('[data-close-calculator]')) return closeCalculatorModal();
    const key = event.target.closest?.('[data-calculator-key]');
    if (key) {
      const value = key.dataset.calculatorKey === '−' ? '-' : key.dataset.calculatorKey === '×' ? '*' : key.dataset.calculatorKey === '÷' ? '/' : key.dataset.calculatorKey;
      calculatorValue += value;
      return updateCalculatorDisplay();
    }
    if (event.target.closest?.('[data-calculator-clear]')) { calculatorValue = ''; return updateCalculatorDisplay(); }
    if (event.target.closest?.('[data-calculator-backspace]')) { calculatorValue = calculatorValue.slice(0, -1); return updateCalculatorDisplay(); }
    if (event.target.closest?.('[data-calculator-equals]')) {
      try { calculatorValue = calculatorSafeResult(calculatorValue); }
      catch { calculatorValue = 'خطا'; }
      return updateCalculatorDisplay();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!document.querySelector('.calculator-overlay')) return;
    if (event.key === 'Escape') return closeCalculatorModal();
    if (/^[0-9+\-*/.%]$/.test(event.key)) { calculatorValue = calculatorValue === 'خطا' ? event.key : calculatorValue + event.key; updateCalculatorDisplay(); }
    if (event.key === 'Backspace') { calculatorValue = calculatorValue.slice(0, -1); updateCalculatorDisplay(); }
    if (event.key === 'Enter' || event.key === '=') { try { calculatorValue = calculatorSafeResult(calculatorValue); } catch { calculatorValue = 'خطا'; } updateCalculatorDisplay(); }
  });
}


function staffInvitationTokenFromUrl() {
  const queryToken = portalParams.get('inviteToken') || '';
  if (queryToken) return queryToken;
  const match = (location.hash || '').match(/^#staff-invitation\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function staffInvitationLink(invitation) {
  const token = encodeURIComponent(invitation.token || '');
  if (portalMode) return `${location.origin}${location.pathname}?portal=1&inviteToken=${token}`;
  const base = `${location.origin}${location.pathname}`;
  return `${base}#staff-invitation/${token}`;
}

async function sendStaffInvitationEmail(invitation) {
  if (!portalMode) return { skipped: true };
  const response = await fetch('/api/staff-invite-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      personnelCode: invitation.personnelCode,
      jobTitle: invitation.jobTitle,
      inviteToken: invitation.token,
      inviteLink: staffInvitationLink(invitation),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.emailSent) throw new Error(payload.error || 'STAFF_INVITE_EMAIL_FAILED');
  return payload;
}

function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  return Promise.resolve();
}

function renderInvalidStaffInvitation(message = 'این لینک پیدا نشد، منقضی شده یا قبلاً استفاده شده است.') {
  app.innerHTML = `<main class="auth-page"><section class="auth-card"><div class="panel"><h1>دعوت کارکنان معتبر نیست</h1><p>${esc(message)}</p><a class="public-link" href="/login">بازگشت به ورود</a></div></section></main>`;
}

async function renderPortalStaffInvitationAccept(token) {
  app.innerHTML = `<main class="auth-page"><section class="auth-card"><div class="panel"><h1>در حال بررسی دعوت کارکنان</h1><p>لطفاً چند لحظه صبر کنید...</p></div></section></main>`;
  try {
    const response = await fetch(`/api/staff-invitation?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.invitation?.status !== 'pending') {
      const message = payload.error === 'SERVICE_ROLE_NOT_CONFIGURED'
        ? 'تنظیم سرور دعوت کارکنان ناقص است: کلید SUPABASE_SERVICE_ROLE_KEY یا SUPABASE_SECRET_KEY روی Vercel تنظیم نشده است.'
        : payload.error === 'SUPABASE_SERVICE_ROLE_KEY_INVALID_OR_NO_PERMISSION'
          ? 'کلید SUPABASE_SERVICE_ROLE_KEY اشتباه است یا دسترسی service_role ندارد. باید مقدار secret service_role از Supabase Project Settings > API وارد شود، نه anon/publishable key.'
          : 'این لینک پیدا نشد، منقضی شده یا قبلاً استفاده شده است.';
      return renderInvalidStaffInvitation(message);
    }
    const invitation = payload.invitation;
    app.innerHTML = `<main class="auth-page"><section class="auth-card"><div><h1>پذیرش دعوت کارکنان</h1><p>دعوت برای ${esc(invitation.name)} با نقش ${esc(invitation.roleLabel || roleLabel(invitation.role))} ثبت شده است. کد پرسنلی: <b dir="ltr">${esc(faNum(invitation.personnelCode || ''))}</b> — سمت شغلی: <b>${esc(invitation.jobTitle || invitation.roleLabel || roleLabel(invitation.role))}</b>. پین ورود خودت را بساز تا حساب فعال شود.</p></div><form id="staffInvitationAcceptForm" class="panel"><label>ایمیل<input value="${esc(invitation.email)}" type="email" dir="ltr" readonly></label><label>پین ورود<input name="pin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="مثلا ۱۲۳۴" required></label><button class="primary">فعال‌سازی حساب کارکنان</button></form></section></main>`;
    document.querySelector('#staffInvitationAcceptForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const pin = toEnglishDigits(form.get('pin'));
      try {
        const acceptResponse = await fetch('/api/staff-invitation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, pin }) });
        const acceptPayload = await acceptResponse.json().catch(() => ({}));
        if (!acceptResponse.ok || !acceptPayload.ok) throw new Error(acceptPayload.error || 'INVITATION_ACCEPT_FAILED');
        app.innerHTML = `<main class="auth-page"><section class="auth-card"><div class="panel"><h1>حساب کارکنان فعال شد</h1><p>کد پرسنلی شما: <b dir="ltr">${esc(faNum(acceptPayload.staff?.personnelCode || ''))}</b></p><p>از صفحه ورود کارکنان با همین کد پرسنلی و پینی که ساختی وارد شو.</p><a class="public-link" href="/login">رفتن به ورود</a></div></section></main>`;
      } catch (err) {
        alert(err.message === 'STAFF_LOGIN_REQUIRED' ? 'پین ورود لازم است' : 'دعوت قابل پذیرش نیست');
      }
    });
  } catch {
    renderInvalidStaffInvitation();
  }
}

function renderStaffInvitationAccept(token) {
  if (portalMode) return renderPortalStaffInvitationAccept(token);
  const invitation = (state.staffInvitations || []).find(item => item.token === token);
  const status = invitation ? RestaurantCore.getStaffInvitations(state, invitation.customerId).find(item => item.id === invitation.id)?.status : '';
  if (!invitation || status !== 'pending') {
    renderInvalidStaffInvitation();
    return;
  }
  app.innerHTML = `<main class="auth-page"><section class="auth-card"><div><h1>پذیرش دعوت کارکنان</h1><p>دعوت برای ${esc(invitation.name)} با نقش ${esc(roleLabel(invitation.role))} ثبت شده است. پین ورود خودت را بساز تا حساب فعال شود.</p></div><form id="staffInvitationAcceptForm" class="panel"><label>ایمیل<input value="${esc(invitation.email)}" type="email" dir="ltr" readonly></label><label>پین ورود<input name="pin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="مثلا ۱۲۳۴"></label><button class="primary">فعال‌سازی حساب کارکنان</button></form></section></main>`;
  document.querySelector('#staffInvitationAcceptForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const staffUser = RestaurantCore.acceptStaffInvitation(state, token, toEnglishDigits(form.get('pin')));
      const loginSession = RestaurantCore.loginWithStaffCode(state, staffUser.personnelCode, toEnglishDigits(form.get('pin')), staffUser.customerId);
      setActiveSession(loginSession);
      currentTab = defaultTabForRole();
      location.hash = '';
      saveState();
      render();
    } catch (err) {
      alert(err.message === 'STAFF_LOGIN_REQUIRED' ? 'پین ورود لازم است' : 'دعوت قابل پذیرش نیست');
    }
  });
}

function render() {
  const inviteToken = staffInvitationTokenFromUrl();
  if (inviteToken) return renderStaffInvitationAccept(inviteToken);
  const publicReceiptId = resolvePublicReceiptCustomerId();
  if (publicReceiptId) return renderPublicReceipt(publicReceiptId);
  const publicId = resolvePublicCustomerId();
  if (publicId) return renderPublicMenu(publicId);
  const customer = currentCustomer();
  if (!customer) return renderAuth();
  if (!canAccessTab(currentTab)) currentTab = defaultTabForRole();
  const summary = RestaurantCore.getAccountingSummary(state, customer.id);
  const modules = RestaurantCore.getEnabledModules(state, customer.id);
  const isCashier = currentRole() === 'cashier';
  const navItems = [
    ['dashboard','داشبورد'],['personnel','پرسنلی'],['customerBank','باشگاه مشتریان'],['aiAssistant','هوش مصنوعی'],['menu','منو'],['sales','صندوق'],['recipes','رسپی'],['inventory','انبار'],['accounting','حسابداری'],['account','تنظیمات']
  ].filter(([id]) => canAccessTab(id));
  const statsMarkup = isCashier ? '' : `<section class="grid stats">
          <article><span>درآمد</span><strong>${money(summary.revenue)}</strong><em>از فروش‌های ثبت‌شده</em></article>
          <article><span>قیمت تمام‌شده</span><strong>${money(summary.cost)}</strong><em>بر اساس رسپی</em></article>
          <article><span>هزینه‌ها</span><strong>${money(summary.expenses)}</strong><em>${esc(expenseHint(customer.id))}</em></article>
          <article><span>سود تقریبی</span><strong>${money(summary.profit)}</strong><em>${summary.profit >= 0 ? 'مثبت' : 'منفی'}</em></article>
        </section>`;
  app.innerHTML = `
    <div class="app-shell theme-${currentTheme}">
      <header class="app-header" data-app-header>
        <div class="header-actions"><button class="ghost header-logout" id="logout">خروج</button>${renderRestaurantSwitcher(customer)}<button type="button" class="header-attendance-button" data-open-attendance-modal aria-label="ورود و خروج پرسنل" title="ورود و خروج پرسنل"><img src="./assets/staff-attendance-icon.png?v=attendance-early-late-choice-46" alt="ورود و خروج پرسنل"></button></div>
        <div class="header-center-group"><div class="business-date-line" data-business-date-line aria-label="روز، تاریخ و ساعت ایران">${esc(businessDateLine())}</div></div>
        ${appLogoMarkup()}
      </header>
      <aside class="sidebar">
        ${renderThemePicker()}
        <nav>${navItems.map(([id,label]) => `<button class="nav ${currentTab===id?'active':''}" data-tab="${id}">${label}</button>`).join('')}</nav>
        <button type="button" class="calculator-launch-button" data-open-calculator>ماشین حساب</button>
      </aside>
      <main class="content" data-current-tab="${esc(currentTab)}">
        ${statsMarkup}
        ${renderTab(customer)}
      </main>
    </div>
    <div id="calculatorModalRoot"></div>${renderAttendanceModal()}`;
  bindCommon();
  bindPersianNumberInputs();
  restoreInventoryScrollFocus();
  restoreMenuEditScrollFocus();
  restoreAccountScrollFocus();
  updateBusinessDateLineDom();
}

function titleFor(tab){return {dashboard:'داشبورد عملیاتی',customerBank:'باشگاه مشتریان و بازگشت مشتری',aiAssistant:'هوش مصنوعی عملیاتی',menu:'ساخت و مدیریت منوی دیجیتال',sales:'صندوق و ثبت سفارش',recipes:'رسپی و قیمت تمام‌شده',inventory:'انبارگردانی',accounting:'حسابداری پایه',personnel:'پرسنلی',account:'تنظیمات رستوران'}[tab] || 'داشبورد'}

function activeRestaurantHeaderName(customer) {
  return String((portalMode && portalIdentity?.businessName) || customer?.businessName || 'رستوران').trim() || 'رستوران';
}
function renderRestaurantSwitcher(customer) {
  const activeName = activeRestaurantHeaderName(customer);
  if (!portalMode) return `<strong class="header-restaurant-name">${esc(activeName)}</strong>`;
  const choices = Array.isArray(portalIdentity?.tenantChoices) ? portalIdentity.tenantChoices : [];
  const normalizedChoices = choices.map(choice => ({
    ...choice,
    restaurantName: String(choice.restaurantName || '').trim() || (choice.tenantId === portalIdentity?.tenantId ? activeName : 'رستوران')
  }));
  const visibleChoices = normalizedChoices.length ? normalizedChoices : [{ tenantId: portalIdentity?.tenantId || '', restaurantName: activeName }];
  if (visibleChoices.length < 2) return `<strong class="header-restaurant-name">${esc(visibleChoices[0]?.restaurantName || activeName)}</strong>`;
  return `<label class="header-tenant-switcher header-restaurant-select" title="انتخاب رستوران فعال بدون خروج"><select data-tenant-switcher aria-label="تغییر رستوران">${visibleChoices.map(choice => `<option value="${esc(choice.tenantId)}" ${choice.tenantId === portalIdentity?.tenantId ? 'selected' : ''}>${esc(choice.restaurantName || activeName)}</option>`).join('')}</select></label>`;
}
async function switchPortalTenant(tenantId) {
  if (!portalMode || !tenantId || tenantId === portalIdentity?.tenantId) return;
  try {
    await flushSharedStateSave(localStorage.getItem(STORAGE_KEY) || JSON.stringify(state));
  } catch {
    alert('ذخیره تغییرات کامل نشد؛ لطفاً چند لحظه دیگر دوباره تغییر رستوران را بزنید.');
    render();
    return;
  }
  const response = await fetch('/api/tenant-switch', { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify({ tenantId }) });
  if (!response.ok) { alert('امکان تغییر رستوران وجود ندارد'); return; }
  window.location.reload();
}

function renderAuth() {
  const suffix = Date.now().toString().slice(-4);
  const portalCustomer = portalMode && !portalStaffLoginMode ? ensurePortalCustomer(portalIdentity) : null;
  const portalBusinessName = portalCustomer?.businessName || portalIdentity?.businessName || 'همین رستوران';
  if (portalStaffLoginMode) {
    app.innerHTML = `<main class="auth-page"><section class="auth-card auth-card-staff-online"><div><h1>ورود کارکنان آنلاین</h1><p>کد پرسنلی و پین در رستوران‌های ثبت‌شده جستجو می‌شود و پرسنل بعد از ورود به همان رستورانی می‌رود که مالک برایش تعریف کرده است.</p></div><div class="auth-grid auth-grid-staff-online"><form id="staffLoginForm" class="panel"><h2>ورود کارکنان</h2><label>کد پرسنلی<input name="personnelCode" value="" inputmode="numeric" dir="ltr" autocomplete="off" placeholder="مثلا ۱۰۰۱"></label><label>پین کد<input name="pin" value="" type="password" inputmode="numeric" autocomplete="off" placeholder="پین تعریف‌شده توسط مالک"></label><button class="primary">ورود کارکنان</button><small>بعد از ورود، رستوران واقعی پرسنل به‌صورت خودکار باز می‌شود.</small></form></div></section></main>`;
    document.querySelector('#staffLoginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const response = await fetch('/api/staff-login', { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify({ personnelCode: toEnglishDigits(f.get('personnelCode')), pin: toEnglishDigits(f.get('pin')) }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok || !result.data) throw new Error(result.error || 'STAFF_LOGIN_FAILED');
        portalIdentity = normalizePortalIdentity(result);
        state = result.data;
        migrateDisplayState(state);
        sharedStateRevision = Number(result.updatedAt || Date.now() / 1000);
        sharedLastSerialized = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, sharedLastSerialized);
        setActiveSession(RestaurantCore.loginWithStaffCode(state, toEnglishDigits(f.get('personnelCode')), toEnglishDigits(f.get('pin')), result.staff?.customerId || ''));
        currentTab = defaultTabForRole();
        saveState();
        render();
      } catch { alert('کد پرسنلی یا پین در هیچ رستورانی معتبر نیست'); }
    });
    return;
  }
  app.innerHTML = `<main class="auth-page"><section class="auth-card"><div><h1>ورود مالک و کارکنان رستوران</h1><p>مالک پکیج با ایمیل، شماره تماس و مشخصات رستوران ثبت می‌شود؛ مالک در لیست کارکنان نمی‌آید و فقط کارکنانی که خودش تعریف کند با کد پرسنلی و پین وارد می‌شوند.</p></div><div class="auth-grid auth-grid-three"><form id="loginForm" class="panel"><h2>ورود مالک پکیج</h2><label>ایمیل مالک<input name="email" value="demo@restaurant.test" type="email" dir="ltr" autocomplete="email"></label><label>رمز عبور مالک<input name="password" value="۱۲۳۴۵۶" type="password"></label><button class="primary">ورود مالک</button><small>حساب آماده: demo@restaurant.test / ۱۲۳۴۵۶</small></form><form id="staffLoginForm" class="panel"><h2>ورود کارکنان</h2><label>کد پرسنلی<input name="personnelCode" value="" inputmode="numeric" dir="ltr" autocomplete="off" placeholder="مثلا ۱۰۰۱"></label><label>پین کد<input name="pin" value="" type="password" inputmode="numeric" autocomplete="off" placeholder="پین تعریف‌شده توسط مالک"></label><button class="primary">ورود کارکنان</button><small>کد پرسنلی از بخش پرسنلی توسط مالک ساخته می‌شود.</small></form><form id="registerForm" class="panel"><h2>تعریف مالک پکیج</h2><label>نام رستوران<input name="businessName" value="رستوران مشتری تست"></label><label>نام مالک<input name="ownerName" value="مشتری تست"></label><label>شماره تلفن مالک<input name="phone" value="۰۹۱۲۱۱۱۲۲۳۳" inputmode="tel"></label><label>ایمیل مالک<input name="email" value="customer${suffix}@restaurant.test" type="email" dir="ltr" autocomplete="email"></label><label>رمز عبور مالک<input name="password" value="۱۲۳۴۵۶" type="password"></label><button class="primary">ساخت حساب مالک و ورود</button></form></div></section></main>`;

  document.querySelector('#loginForm').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); try { setActiveSession(RestaurantCore.login(state, f.get('email'), toEnglishDigits(f.get('password')))); saveState(); render(); } catch { alert('ورود مالک ناموفق است'); }});
  document.querySelector('#staffLoginForm').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); try { setActiveSession(RestaurantCore.loginWithStaffCode(state, toEnglishDigits(f.get('personnelCode')), toEnglishDigits(f.get('pin')))); currentTab = defaultTabForRole(); saveState(); render(); } catch { alert('کد پرسنلی یا پین نامعتبر است'); }});
  document.querySelector('#registerForm').addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); try { const input = Object.fromEntries(f); input.password = toEnglishDigits(input.password); input.phone = toEnglishDigits(input.phone); const loginPassword = input.password; const c = RestaurantCore.createCustomer(state, input); setActiveSession(RestaurantCore.login(state, c.email, loginPassword)); saveState(); render(); } catch (err) { alert(err.message); }});
}

function renderTab(customer) {
  if (currentTab === 'customerBank') return renderCustomerBank(customer);
  if (currentTab === 'aiAssistant') return renderAiAssistant(customer);
  if (currentTab === 'menu') return renderMenu(customer);
  if (currentTab === 'sales') return renderSales(customer);
  if (currentTab === 'recipes') return renderRecipes(customer);
  if (currentTab === 'inventory') return renderInventory(customer);
  if (currentTab === 'accounting') return renderAccounting(customer);
  if (currentTab === 'personnel') return renderPersonnel(customer);
  if (currentTab === 'account') return renderAccount(customer);
  return renderDashboard(customer);
}

function customerSegmentLabel(key) { return ({ new: 'مشتریان جدید', loyal: 'مشتریان وفادار', inactive: 'غیرفعال ۳۰ روزه', highValue: 'مشتریان پرخرج', unhappy: 'ناراضی/نیازمند دلجویی' })[key] || 'همه مشتریان'; }
function sourceLabel(value) { return ({ manual: 'دستی', 'public-order': 'سفارش عمومی/QR', sale: 'فروش حضوری', import: 'ایمپورت' })[value] || value || 'نامشخص'; }
function renderCustomerBank(customer) {
  const filters = { query: customerBankQuery, segment: customerBankSegment };
  const profiles = RestaurantCore.getCustomerProfiles ? RestaurantCore.getCustomerProfiles(state, customer.id, filters) : [];
  const allProfiles = RestaurantCore.getCustomerProfiles ? RestaurantCore.getCustomerProfiles(state, customer.id) : [];
  const segments = RestaurantCore.getCustomerProfileSegments ? RestaurantCore.getCustomerProfileSegments(state, customer.id) : { new: [], loyal: [], inactive: [], highValue: [], unhappy: [] };
  const suggestions = RestaurantCore.getCustomerCampaignSuggestions ? RestaurantCore.getCustomerCampaignSuggestions(state, customer.id) : [];
  const segmentCards = [['', 'همه مشتریان', allProfiles.length], ['new', 'مشتریان جدید', segments.new.length], ['loyal', 'وفادار', segments.loyal.length], ['inactive', 'غیرفعال', segments.inactive.length], ['highValue', 'پرخرج', segments.highValue.length], ['unhappy', 'ناراضی', segments.unhappy.length]]
    .map(([key, label, count]) => `<button type="button" class="customer-segment-card ${customerBankSegment === key ? 'active' : ''}" data-customer-segment="${esc(key)}"><b>${numberText(count,0)}</b><span>${esc(label)}</span></button>`).join('');
  const rows = profiles.map(profile => `<article class="customer-bank-row"><div><b>${esc(profile.name || 'مشتری بدون نام')}</b><small>${profile.phone ? faNum(profile.phone) : 'بدون شماره'} — ${esc(sourceLabel(profile.source))}</small>${profile.notes ? `<small>یادداشت: ${esc(profile.notes)}</small>` : ''}</div><div><strong>${money(profile.totalSpend || 0)}</strong><small>${numberText(profile.visitCount || 0,0)} مراجعه — میانگین ${money(profile.averageSpend || 0)}</small></div><div><span class="badge">${esc(customerSegmentLabel(Object.keys(segments).find(key => segments[key].some(item => item.id === profile.id)) || ''))}</span><small>آخرین مراجعه: ${profile.lastSeenAt ? formatDate(profile.lastSeenAt) : 'هنوز سفارش ندارد'}</small></div></article>`).join('');
  const campaignCards = suggestions.map(item => `<article class="customer-campaign-card"><div class="section-title"><h3>${esc(item.title)}</h3><span class="badge">${numberText(item.audience,0)} نفر</span></div><p>${esc(item.message)}</p><button type="button" class="secondary" data-copy-campaign-message="${esc(item.message)}">کپی متن کمپین</button></article>`).join('');
  return `<section class="workspace customer-bank-workspace"><div class="panel wide customer-bank-hero"><div class="section-title"><h2>باشگاه مشتریان و بازگشت مشتری</h2><span class="badge">هسته رشد FlowKave</span></div><p>هر شماره موبایل یا مهمانی که از فروش، منوی عمومی یا فرم دستی وارد شود اینجا تبدیل به دارایی قابل پیگیری می‌شود؛ هدف بعدی کمپین بازگشت مشتری است.</p><div class="customer-segment-grid">${segmentCards}</div></div><form id="customerBankSearchForm" class="panel wide customer-bank-search"><label>جستجوی نام، موبایل یا برچسب<input name="query" value="${esc(customerBankQuery)}" placeholder="مثلا ۰۹۱۲ یا VIP"></label><button class="secondary">جستجو</button><button type="button" class="ghost" data-reset-customer-bank>نمایش همه</button></form><form id="customerProfileForm" class="panel"><h2>ثبت مشتری دستی</h2><label>نام مشتری<input name="name" placeholder="مثلا علی رضایی"></label><label>موبایل<input name="phone" inputmode="tel" dir="ltr" data-number placeholder="0912..."></label><label>برچسب‌ها<input name="tags" placeholder="VIP، تولد، تخفیف‌پسند"></label><label>یادداشت<textarea name="notes" rows="3" placeholder="نکته مهم برای پیگیری بعدی"></textarea></label><button class="primary">افزودن به باشگاه مشتریان</button></form><div class="panel customer-campaign-panel"><h2>پیشنهاد کمپین امروز</h2>${campaignCards}</div><div class="panel wide customer-bank-list"><div class="section-title"><h2>لیست مشتریان</h2><span>${numberText(profiles.length,0)} از ${numberText(allProfiles.length,0)}</span></div>${rows || '<p>هنوز مشتری در باشگاه ثبت نشده؛ از سفارش عمومی، فروش یا فرم دستی اولین مشتری را اضافه کن.</p>'}</div></section>`;
}


function renderAiAssistant(customer) {
  const summary = RestaurantCore.getAccountingSummary(state, customer.id);
  const inventory = byCustomer(state.inventory);
  const orders = byCustomer(state.orders);
  const profiles = RestaurantCore.getCustomerProfiles ? RestaurantCore.getCustomerProfiles(state, customer.id) : [];
  const lowStock = RestaurantCore.getLowStockItems(state, customer.id);
  const suggestions = RestaurantCore.getCustomerCampaignSuggestions ? RestaurantCore.getCustomerCampaignSuggestions(state, customer.id) : [];
  const prompt = `گزارش سریع ${customer.businessName}: درآمد ${money(summary.revenue)}، هزینه ${money(summary.expenses)}، سود ${money(summary.profit)}، فروش‌ها ${numberText(orders.length,0)}، مواد اولیه ${numberText(inventory.length,0)}، اعضای باشگاه مشتریان ${numberText(profiles.length,0)}.`;
  const aiCards = [
    ['تحلیل امروز', summary.profit >= 0 ? 'سود فعلی مثبت است؛ فروش‌های پرتکرار و مواد کم‌موجودی را کنار هم بررسی کن.' : 'سود فعلی منفی است؛ هزینه‌های عملیاتی و قیمت تمام‌شده رسپی‌ها را بازبینی کن.'],
    ['هشدار انبار', lowStock.length ? `این اقلام نیاز به پیگیری دارند: ${lowStockText(lowStock)}` : 'فعلاً هشدار کمبود موجودی ثبت نشده است.'],
    ['پیشنهاد باشگاه مشتریان', suggestions[0]?.message || 'بعد از ثبت مشتری/فروش، پیشنهاد کمپین بازگشت مشتری اینجا آماده می‌شود.'],
  ];
  return `<section class="workspace ai-assistant-workspace"><div class="panel wide ai-assistant-hero"><div class="section-title"><h2>هوش مصنوعی عملیاتی</h2><span class="badge">دستیار مدیریت</span></div><p>این بخش فعلاً بر اساس داده‌های واقعی همین رستوران پیشنهاد عملیاتی می‌دهد؛ بعداً به مدل هوش مصنوعی متصل می‌شود اما داده‌اش از همین دیتابیس و سامانه می‌آید.</p><button type="button" class="secondary" data-copy-ai-brief="${esc(prompt)}">کپی خلاصه برای مشاور/هوش مصنوعی</button></div>${aiCards.map(([title, body]) => `<article class="panel ai-assistant-card"><h2>${esc(title)}</h2><p>${esc(body)}</p></article>`).join('')}<div class="panel wide"><h2>کارهای پیشنهادی بعدی</h2><div class="dashboard-shortcuts"><button type="button" class="secondary" data-onboarding-tab="customerBank">رفتن به باشگاه مشتریان</button><button type="button" class="secondary" data-onboarding-tab="inventory">کنترل انبار</button><button type="button" class="secondary" data-onboarding-tab="accounting">بررسی حسابداری</button></div></div></section>`;
}

function renderDashboard(customer) {
  const items = customerMenuItems(); const orders = byCustomer(state.orders); const inv = byCustomer(state.inventory);
  const lowStock = RestaurantCore.getLowStockItems(state, customer.id);
  const publicLink = `${location.pathname}#menu/${encodeURIComponent(customer.id)}`;
  return `<section class="workspace dashboard-customer-layout"><div class="dashboard-left-stack"><div class="dashboard-top-cards"><div class="panel dashboard-low-stock-panel ${lowStock.length ? 'danger' : ''}"><h2>هشدار کمبود موجودی</h2>${lowStock.length ? `<p>${esc(lowStockText(lowStock))}</p>` : '<p>موجودی بحرانی ندارید.</p>'}</div><div class="panel dashboard-status-panel"><h2>وضعیت</h2><p>آیتم منو: <b>${numberText(items.length,0)}</b></p><p>فروش ثبت‌شده: <b>${numberText(orders.length,0)}</b></p><p>مواد اولیه: <b>${numberText(inv.length,0)}</b></p></div></div><div class="panel dashboard-public-link-panel"><h2>لینک منوی عمومی / کد پاسخ سریع</h2><p>این لینک صفحه مشتری را باز می‌کند؛ سفارش ثبت‌شده از همین مسیر وارد فروش و انبار می‌شود.</p><a class="public-link" href="#menu/${encodeURIComponent(customer.id)}">باز کردن منوی عمومی</a><code>${esc(publicLink)}</code></div></div></section>`;
}

function renderDashboardReadinessShortcuts(customer) {
  const checklist = RestaurantCore.getOnboardingChecklist(state, customer.id);
  const missing = checklist.items.filter(item => !item.done);
  if (!missing.length) {
    return `<div class="panel wide dashboard-readiness-panel"><div class="section-title"><h2>میانبرهای آمادگی راه‌اندازی</h2><span class="badge">کامل</span></div><p>همه گام‌های ضروری راه‌اندازی اولیه تکمیل شده‌اند؛ حالا از صندوق تستی و بستن حساب روز کاری برای کنترل عملیات استفاده کنید.</p><button type="button" class="secondary" data-onboarding-tab="sales">رفتن به صندوق</button></div>`;
  }
  return `<div class="panel wide dashboard-readiness-panel"><div class="section-title"><h2>میانبرهای آمادگی راه‌اندازی</h2><span class="badge">${numberText(missing.length, 0)} کار باقی‌مانده</span></div><p>برای رسیدن سریع‌تر به نسخه قابل بهره‌برداری، از همین داشبورد مستقیم به کارهای ناقص بروید.</p><div class="dashboard-shortcuts">${missing.map(item => `<div class="dashboard-shortcut"><div><b>${esc(item.title)}</b><span>${esc(faNum(item.detail))}</span></div>${item.key === 'backup-export' ? `<button type="button" class="secondary" data-onboarding-backup>${esc(item.action)}</button>` : `<button type="button" class="secondary" data-onboarding-tab="${esc(item.tab)}">${esc(item.action)}</button>`}</div>`).join('')}</div></div>`;
}

function renderPublicMenu(customerId) {
  let publicMenu;
  try { publicMenu = RestaurantCore.getPublicMenu(state, customerId); }
  catch {
    if (publicQrMode) { app.innerHTML = `<main class="public-page"><section class="public-panel"><h1>در حال بارگذاری منوی میز</h1><p>اطلاعات رستوران از سرور خوانده می‌شود؛ چند لحظه صبر کنید.</p><small>اگر بعد از چند ثانیه منو باز نشد، QR جدید را از پنل آنلاین همان رستوران بگیر.</small></section></main>`; return; }
    app.innerHTML = `<main class="public-page"><section class="public-panel"><h1>منو پیدا نشد</h1><p>این لینک منوی عمومی معتبر نیست یا QR بدون شناسه آنلاین رستوران ساخته شده است.</p><a class="public-link" href="#">بازگشت</a></section></main>`; return;
  }
  const categories = [...new Set(publicMenu.items.map(i => i.category))];
  const table = publicMenuTable(customerId);
  const tableIsBlocked = publicQrTableBlocked(table);
  const tableAlreadyOrdered = table ? publicQrAlreadyOrdered(customerId, table.id) : false;
  const qrOrderingLocked = Boolean(table && (tableIsBlocked || tableAlreadyOrdered));
  const tableBadge = table ? `<span class="badge public-table-badge">سفارش میز ${esc(table.name)}</span>` : '<span class="badge">منوی آنلاین با کد پاسخ سریع</span>';
  const tableNotice = table ? (tableIsBlocked
    ? `<div class="public-table-notice blocked"><b>این میز الان در صندوق سفارش باز دارد.</b><span>برای جلوگیری از مخلوط شدن سفارش‌ها، ثبت سفارش QR برای این میز فعلاً غیرفعال است. لطفاً با صندوق‌دار هماهنگ کنید یا QR میز آزاد را اسکن کنید.</span></div>`
    : tableAlreadyOrdered
      ? `<div class="public-table-notice blocked"><b>سفارش این میز از همین موبایل قبلاً ثبت شده است.</b><span>برای جلوگیری از ثبت تکراری، سفارش دوم از همین QR بسته شده است. اگر سفارش جدید دارید با صندوق‌دار هماهنگ کنید.</span></div>`
      : `<div class="public-table-notice"><b>این سفارش برای میز ${esc(table.name)} ثبت می‌شود.</b><span>اگر میز در صندوق سفارش باز داشته باشد یا از همین موبایل قبلاً سفارش داده باشید، ثبت سفارش بسته می‌شود.</span></div>`) : '';
  app.innerHTML = `<main class="public-page"><section class="public-hero">${tableBadge}<h1>${esc(publicMenu.customer.businessName)}</h1><p>غذاها را انتخاب کنید و سفارش تستی ثبت کنید. این سفارش در پنل رستوران ذخیره می‌شود و وضعیت آن همین‌جا قابل پیگیری است.</p>${publicMenu.customer.phone ? `<small>تماس: ${esc(publicMenu.customer.phone)}</small>` : ''}${tableNotice}</section><form id="publicTrackingForm" class="public-panel public-tracking-lookup"><div class="section-title"><h2>پیگیری سفارش</h2><span>بازبینی سریع</span></div><p>اگر شماره پیگیری دارید، همین‌جا وضعیت آخرین سفارش را ببینید.</p><label>شماره پیگیری${numInput('trackingNumber', '', 'placeholder="۱۲"')}</label><button class="secondary">نمایش وضعیت سفارش</button><div id="publicTrackingResult" class="order-tracking-card" hidden></div></form><form id="publicOrderForm" class="public-panel"><div class="section-title"><h2>انتخاب سفارش</h2><span>${numberText(publicMenu.items.length,0)} آیتم فعال</span></div>${categories.map(cat => `<div class="public-category"><h3>${esc(cat)}</h3>${publicMenu.items.filter(i => i.category === cat).map(i => `<label class="public-food"><span><b>${esc(i.name)}</b><small>${esc(i.description || 'بدون توضیح')}</small></span><strong>${money(i.price)}</strong>${numInput(`qty:${i.id}`, 0, `aria-label="تعداد ${esc(i.name)}"`)}</label>`).join('')}</div>`).join('') || '<p>فعلاً آیتم فعالی برای این منو منتشر نشده است.</p>'}<div class="public-guest-fields"><label>نام مهمان<input name="guestName" placeholder="اختیاری"></label><label>شماره تماس اختیاری<input name="guestContact" inputmode="tel" dir="ltr" autocomplete="tel" placeholder="۰۹۱۲۱۲۳۴۵۶۷" data-number></label></div><label>توضیح آماده‌سازی<textarea name="orderNote" rows="۳" placeholder="مثلا بدون پیاز یا بسته‌بندی جدا"></textarea></label><label>روش پرداخت<select name="payment"><option value="online">آنلاین</option><option value="card">کارتخوان در محل</option><option value="cash">نقدی</option></select></label><button class="primary" ${publicMenu.items.length && !qrOrderingLocked ? '' : 'disabled'}>ثبت سفارش</button>${qrOrderingLocked ? `<div class="order-tracking-card public-qr-lock"><b>${tableIsBlocked ? 'ثبت سفارش برای این میز بسته است' : 'سفارش قبلاً ثبت شده است'}</b><span>${tableIsBlocked ? 'این میز در صندوق فیش باز دارد و برای جلوگیری از مخلوط شدن سفارش‌ها نمی‌توان از QR سفارش جدید ثبت کرد.' : 'از همین موبایل برای این میز یک سفارش ثبت شده و سفارش دوم مجاز نیست.'}</span></div>` : ''}<div id="publicOrderMessage" class="success-message order-tracking-card" hidden></div><a class="public-link" href="#">بازگشت به پنل</a></form></main>`;
  bindPublicMenu(customerId, publicMenu.items);
  bindPersianNumberInputs();
  restoreInventoryScrollFocus();
  restoreMenuEditScrollFocus();
  restoreAccountScrollFocus();
  updateBusinessDateLineDom();
}

function renderPublicReceipt(customerId) {
  const orderId = publicReceiptOrderId();
  const order = (state.orders || []).find(item => item.id === orderId && item.customerId === customerId);
  if (!order) {
    if (publicQrMode) { app.innerHTML = `<main class="public-page"><section class="public-panel"><h1>در حال بارگذاری رسید</h1><p>اطلاعات سفارش از سرور خوانده می‌شود؛ چند لحظه صبر کنید.</p></section></main>`; return; }
    app.innerHTML = `<main class="public-page"><section class="public-panel"><h1>رسید پیدا نشد</h1><p>این لینک رسید معتبر نیست یا سفارش هنوز روی این دستگاه بارگذاری نشده است.</p></section></main>`;
    return;
  }
  const table = order.tableId ? (RestaurantCore.getHallTables(state, customerId).find(item => item.id === order.tableId) || { id: order.tableId, name: order.tableName || '' }) : null;
  app.innerHTML = `<main class="public-page"><section class="public-hero"><span class="badge public-table-badge">رسید سفارش</span><h1>رسید سفارش شما</h1><p>این صفحه مستقل است و با refresh هم از بین نمی‌رود.</p></section><section class="public-panel">${renderPublicQrReceipt(order, table)}</section></main>`;
}

function bindPublicMenu(customerId, items) {
  const form = document.querySelector('#publicOrderForm');
  const trackingForm = document.querySelector('#publicTrackingForm');
  if (trackingForm) {
    trackingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      normalizeNumberFields(trackingForm);
      const result = document.querySelector('#publicTrackingResult');
      const trackingNumber = parseFaNumber(new FormData(trackingForm).get('trackingNumber') || 0);
      result.hidden = false;
      try {
        const order = RestaurantCore.getPublicOrderByTrackingNumber(state, customerId, trackingNumber);
        result.innerHTML = renderPublicTrackingResult(order);
      } catch {
        result.innerHTML = '<b>سفارشی با این شماره پیدا نشد.</b><span>شماره پیگیری روی پیام ثبت سفارش نمایش داده می‌شود.</span>';
      }
    });
  }
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    normalizeNumberFields(form);
    const data = new FormData(form);
    const table = publicMenuTable(customerId);
    if (publicQrTableBlocked(table)) return alert('این میز الان در صندوق سفارش باز دارد و ثبت سفارش QR برای جلوگیری از مخلوط شدن سفارش‌ها بسته است.');
    if (table && publicQrAlreadyOrdered(customerId, table.id)) return alert('از همین موبایل برای این میز قبلاً سفارش ثبت شده است. سفارش دوم از QR مجاز نیست.');
    const lines = items.map(i => ({ itemId: i.id, qty: parseFaNumber(data.get(`qty:${i.id}`) || 0) })).filter(l => l.qty > 0);
    if (!lines.length) return alert('حداقل یک آیتم را انتخاب کنید');
    const order = table
      ? RestaurantCore.createHallOrder(state, customerId, table.id, lines, { paymentMethod: 'در انتظار', orderNote: data.get('orderNote') || '', chargeSettings: { ...(RestaurantCore.getPosChargeSettings ? RestaurantCore.getPosChargeSettings(state, customerId) : {}), serviceMode: '', servicePercent: 0, serviceAmount: 0 } })
      : RestaurantCore.createSale(state, customerId, lines, data.get('payment'), { status: 'received', guestName: data.get('guestName') || '', guestContact: toEnglishDigits(data.get('guestContact') || ''), orderNote: data.get('orderNote') || '' });
    if (table) { order.source = 'table_qr'; order.guestName = data.get('guestName') || ''; order.guestContact = toEnglishDigits(data.get('guestContact') || ''); markPublicQrOrdered(customerId, table.id); }
    saveState();
    const message = document.querySelector('#publicOrderMessage');
    message.hidden = false;
    const receiptLink = table ? publicReceiptLink(customerId, order.id, table.id) : '';
    message.innerHTML = table ? `${renderPublicQrReceipt(order, table)}<a class="public-link" href="${esc(receiptLink)}" target="_blank" rel="noopener">باز کردن رسید در صفحه جدا</a>` : `<b>سفارش شما با شماره پیگیری ${receiptNumberText(order.trackingNumber)} ثبت شد.</b><span>مبلغ: ${money(orderFinalTotal(order))} — وضعیت: ${orderStatusLabel(order.status)}</span>${order.lowStockWarnings.length ? '<small>هشدار کمبود برای اپراتور ثبت شد.</small>' : ''}`;
    if (receiptLink) window.open(receiptLink, '_blank', 'noopener');
    form.querySelectorAll('[data-number]').forEach(input => { input.value = ''; });
  });
}

function renderPublicTrackingResult(order) {
  const guest = order.guestName || order.guestContact ? `<small>مهمان: ${esc(order.guestName || 'بدون نام')}${order.guestContact ? ` — تماس: ${esc(faNum(order.guestContact))}` : ''}</small>` : '';
  return `<b>شماره پیگیری ${receiptNumberText(order.trackingNumber)}</b><span>وضعیت: ${orderStatusLabel(order.status)}</span><span>مبلغ: ${money(orderFinalTotal(order))}</span>${guest}<small>آیتم‌ها: ${order.lines.map(line => `${esc(line.name)} × ${numberText(line.qty, 0)}`).join('، ')}</small>${renderOrderPrepNotes(order)}`;
}
function renderPublicQrReceipt(order, table) {
  const lines = (order.lines || []).map((line) => {
    const qty = Number(line.qty ?? line.quantity ?? 0);
    const unitPrice = Number(line.price || line.unitPriceSnapshot || 0);
    const lineTotal = Number(line.lineTotal || qty * unitPrice || 0);
    return `<div class="public-receipt-line"><span>${esc(line.name || 'آیتم')}</span><small>${numberText(qty, 0)} × ${money(unitPrice)}</small><b>${money(lineTotal)}</b></div>`;
  }).join('');
  const tableText = table ? `<span>میز: <b>${esc(table.name)}</b></span>` : '';
  const subtotal = Number(order.subtotal || order.total || 0);
  const tax = Number(order.taxTotal || 0);
  const service = Number(order.serviceChargeTotal || 0);
  const grand = orderFinalTotal(order);
  return `<article class="public-qr-receipt"><div class="public-receipt-head"><b>رسید سفارش</b><span>شماره فیش: <b>${receiptNumberText(order.trackingNumber)}</b></span>${tableText}</div><div class="public-receipt-lines">${lines}</div><div class="public-receipt-totals"><span>جمع آیتم‌ها <b>${money(subtotal)}</b></span>${tax ? `<span>مالیات <b>${money(tax)}</b></span>` : ''}${service ? `<span>حق سرویس <b>${money(service)}</b></span>` : ''}<strong>مبلغ قابل پرداخت <b>${money(grand)}</b></strong></div><small>این رسید را نگه دارید؛ پرداخت نهایی در صندوق انجام می‌شود.</small></article>`;
}


function registeredRecipeMenuItemOptions(category) {
  const recipeItems = byCustomer(state.recipes)
    .filter(recipe => cleanPersianText(recipe.category || 'بدون دسته‌بندی') === category)
    .map(recipe => cleanPersianText(recipe.itemName || ''))
    .filter(Boolean);
  return recipeItems;
}
function menuCategoryOptions(current = '') {
  const recipeCategories = byCustomer(state.recipes).map(recipe => cleanPersianText(recipe.category || '')).filter(Boolean);
  const categories = [...new Set(recipeCategories)];
  return `<option value="">انتخاب دسته‌بندی</option>${categories.map(cat => `<option value="${esc(cat)}" ${cat === current ? 'selected' : ''}>${esc(cat)}</option>`).join('')}`;
}
function menuItemOptions(category, current = '') {
  const items = [...new Set(registeredRecipeMenuItemOptions(category))];
  return `<option value="">انتخاب آیتم</option>${items.map(item => `<option value="${esc(item)}" ${item === current ? 'selected' : ''}>${esc(item)}</option>`).join('')}`;
}
function printableMenuItemDescription(item) {
  return String(item?.description || '').trim();
}
function showPrintableMenuPreview() {
  const customer = currentCustomer();
  if (!customer) return;
  const items = customerMenuItems().filter(item => item.available !== false);
  const categories = [...new Set(items.map(item => item.category || 'عمومی'))];
  document.querySelector('#printableMenuModalRoot')?.remove();
  const modal = document.createElement('div');
  modal.id = 'printableMenuModalRoot';
  modal.className = 'print-modal-overlay';
  modal.innerHTML = `<section class="print-modal printable-menu-modal" role="dialog" aria-modal="true"><div class="print-actions"><button type="button" class="modal-close-icon" data-close-printable-menu aria-label="بستن">×</button><button type="button" class="primary" data-do-printable-menu-print>پرینت منو</button></div><div class="recipe-print-sheet printable-menu-sheet"><header class="recipe-print-header"><h1>${esc(customer.businessName || 'منو')}</h1><strong>منوی قابل چاپ</strong></header>${categories.map(cat => `<section class="printable-menu-category"><h2>${esc(cat)}</h2>${items.filter(item => item.category === cat).map(item => `<div class="printable-menu-item"><div><b>${esc(item.name)}</b>${printableMenuItemDescription(item) ? `<small>${esc(printableMenuItemDescription(item))}</small>` : ''}</div><strong>${money(item.price)}</strong></div>`).join('')}</section>`).join('') || '<p>آیتم فعالی برای چاپ وجود ندارد.</p>'}</div></section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close-printable-menu]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('[data-do-printable-menu-print]').addEventListener('click', () => { const previousTitle = document.title; document.title = ''; window.print(); setTimeout(() => { document.title = previousTitle; }, 300); });
}

function renderMenu(customer) {
  const menus = byCustomer(state.menus); const items = customerMenuItems();
  const menuOptions = `<option value="">انتخاب منو</option>${menus.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}`;
  const publishRows = menus.map(m=>`<div class="menu-publish-row"><div><b>${esc(m.name)}</b><span>${esc(m.branchName || 'بدون شعبه')} — وضعیت: ${m.isPublished === false ? 'پیش‌نویس' : 'منتشرشده'}</span></div><div class="row-action-buttons menu-row-actions"><button type="button" class="secondary" data-toggle-menu-publish="${m.id}">${m.isPublished === false ? 'انتشار منو' : 'برگرداندن به پیش‌نویس'}</button>${actionDecalButton('delete', `data-delete-menu="${m.id}"`, 'menu-row-decal', 'حذف منو')}</div></div>`).join('') || '<p>هنوز منویی ندارید.</p>';
  const menuItemCategories = [...new Set(items.map(i => cleanPersianText(i.category || 'بدون دسته‌بندی') || 'بدون دسته‌بندی'))];
  const activePreviewCategory = menuItemCategories.includes(currentMenuPreviewCategoryTab) ? currentMenuPreviewCategoryTab : (menuItemCategories[0] || '');
  const activeEditCategory = menuItemCategories.includes(currentMenuEditCategoryTab) ? currentMenuEditCategoryTab : (menuItemCategories[0] || '');
  currentMenuPreviewCategoryTab = activePreviewCategory;
  currentMenuEditCategoryTab = activeEditCategory;
  const menuCategoryTabButtons = (active, attr) => menuItemCategories.length ? `<div class="recipe-category-tabs menu-category-tabs" role="tablist">${menuItemCategories.map(cat => `<button type="button" class="recipe-category-tab menu-category-tab ${cat === active ? 'active' : ''}" ${attr}="${esc(cat)}" role="tab" aria-selected="${cat === active ? 'true' : 'false'}">${esc(cat)}</button>`).join('')}</div>` : '';
  const editRow = (i) => { const isEditing = editingMenuItemId === i.id; const lockAttr = isEditing ? '' : 'readonly aria-readonly="true"'; return `<form class="edit-row menu-edit-form ${isEditing ? 'is-editing' : 'is-locked'}" data-item-id="${i.id}"><label>نام<input name="name" value="${esc(i.name)}" ${lockAttr}></label><label>دسته<input name="category" value="${esc(i.category)}" ${lockAttr}></label><label>جزئیات<input name="description" value="${esc(i.description || '')}" ${lockAttr}></label><label>قیمت${numInput('price', i.price, lockAttr)}</label><div class="row-action-buttons menu-row-actions">${actionDecalButton(isEditing ? 'save' : 'edit', 'data-save-menu-item', 'menu-row-decal', isEditing ? 'ذخیره آیتم' : 'ویرایش آیتم')}${actionDecalButton('delete', `data-delete-item="${i.id}"`, 'menu-row-decal')}</div></form>`; };
  const visibleEditItems = activeEditCategory ? items.filter(i => (cleanPersianText(i.category || 'بدون دسته‌بندی') || 'بدون دسته‌بندی') === activeEditCategory) : items;
  const visiblePreviewItems = activePreviewCategory ? items.filter(i => (cleanPersianText(i.category || 'بدون دسته‌بندی') || 'بدون دسته‌بندی') === activePreviewCategory) : items;
  const editRows = `${menuCategoryTabButtons(activeEditCategory, 'data-menu-edit-category-tab')}<div class="menu-category-content menu-edit-category-content">${visibleEditItems.map(editRow).join('') || '<p>برای این دسته هنوز آیتمی ندارید.</p>'}</div>`;
  const previewCards = `${menuCategoryTabButtons(activePreviewCategory, 'data-menu-preview-category-tab')}<div class="menu-category-content menu-preview-category-content">${visiblePreviewItems.map(i=>`<div class="food-card"><span><b>${esc(i.name)}</b>${printableMenuItemDescription(i) ? `<small class="menu-item-details">${esc(printableMenuItemDescription(i))}</small>` : ''}</span><strong>${money(i.price)}</strong></div>`).join('') || '<p>برای این دسته هنوز آیتمی برای پیش‌نمایش اضافه نشده.</p>'}</div>`;
  return `<section class="workspace menu-workspace"><div class="menu-layout-grid"><form class="panel menu-create-panel menu-fixed-panel" id="menuForm"><h2>منوی جدید</h2><label>نام منو<input name="name" value="" placeholder="مثلا منوی نوشیدنی"></label><label>نام شعبه<input name="branchName" value="" placeholder="اختیاری"></label><button class="primary">ساخت منو</button></form><form class="panel item-create-panel menu-fixed-panel" id="itemForm"><h2>آیتم جدید</h2><div class="menu-panel-scroll"><label>نام منو<select name="menuId">${menuOptions}</select></label><label>دسته‌بندی<select name="category" data-menu-category-select>${menuCategoryOptions('')}</select></label><label>نام آیتم<select name="name" data-menu-item-select>${menuItemOptions('', '')}</select></label><label class="item-description-field">جزئیات آیتم<textarea name="description" rows="۳" data-menu-item-description placeholder="مثلا قهوه، شیر، کوکی، سس شکلات"></textarea></label><label>قیمت تومان${numInput('price', '', 'placeholder="۰"')}</label></div><button class="primary">افزودن آیتم</button></form><div class="panel menu-publish-panel menu-fixed-panel"><div class="menu-panel-scroll menu-publish-scroll"><h2>انتشار منو</h2><p>منوهای ساخته‌شده را منتشر، پیش‌نویس یا حذف کن.</p>${publishRows}</div></div><div class="panel wide menu-preview-panel menu-fixed-panel"><div class="section-title"><h2>پیش‌نمایش منوی دیجیتال</h2><button type="button" class="secondary" data-printable-menu>نسخه قابل چاپ منو</button></div><div class="public-menu menu-panel-scroll menu-preview-categories">${previewCards}</div></div></div><div class="panel wide menu-edit-panel menu-fixed-panel"><h2>ویرایش آیتم‌های منو</h2><div class="menu-panel-scroll menu-edit-categories">${editRows}</div></div></section>`;
}


function orderGuestLine(order) {
  if (!order?.guestName && !order?.guestContact) return '';
  return `مهمان: ${esc(order.guestName || 'بدون نام')}${order.guestContact ? ` — تماس: ${esc(faNum(order.guestContact))}` : ''}`;
}
function orderPrepNotes(order) {
  const lineNotes = (order?.lines || []).flatMap(line => [line.note ? `${line.name}: ${line.note}` : '', ...(line.modifiers || []).map(item => `${line.name}: ${item}`)]).filter(Boolean);
  return [order?.orderNote ? `یادداشت سفارش: ${order.orderNote}` : '', ...lineNotes].filter(Boolean);
}
function renderOrderPrepNotes(order) {
  const notes = orderPrepNotes(order);
  return notes.length ? `<div class="order-prep-notes"><b>جزئیات آماده‌سازی</b>${notes.map(note => `<small>${esc(note)}</small>`).join('')}</div>` : '';
}


function collectHallSaleLines(form) {
  syncHallOrderDraftFromForm(form);
  if (selectedHallTableId && hallOrderDrafts[selectedHallTableId]) {
    return Object.entries(hallOrderDrafts[selectedHallTableId].items || {})
      .map(([itemId, draft]) => ({ itemId, qty: Number(draft.qty || 0), note: draft.note || '', modifiers: draft.modifiers || '' }))
      .filter(x => x.itemId && x.qty > 0);
  }
  const menuCards = [...form.querySelectorAll('[data-hall-menu-item]')];
  if (menuCards.length) {
    return menuCards.map(card => ({
      itemId: card.dataset.hallMenuItem,
      qty: parseFaNumber(card.querySelector('input[name^="qty:"]')?.value || 0),
      note: card.querySelector('textarea[name^="note:"]')?.value || '',
      modifiers: card.querySelector('input[name^="modifiers:"]')?.value || '',
    })).filter(x => x.itemId && x.qty > 0);
  }
  return [...form.querySelectorAll('[data-hall-sale-row]')]
    .map(row => ({ itemId: row.querySelector('select[name="itemId"]').value, qty: parseFaNumber(row.querySelector('input[name="qty"]').value || 0), note: row.querySelector('input[name="note"]')?.value || '', modifiers: row.querySelector('input[name="modifiers"]')?.value || '' }))
    .filter(x => x.itemId && x.qty > 0);
}

function hallDraftForSelectedTable() {
  if (!selectedHallTableId) return { items: {}, orderNote: '' };
  if (!hallOrderDrafts[selectedHallTableId]) hallOrderDrafts[selectedHallTableId] = { items: {}, orderNote: '' };
  return hallOrderDrafts[selectedHallTableId];
}

function syncHallOrderDraftFromForm(form = document.querySelector('#hallSaleForm')) {
  if (!form || !selectedHallTableId) return;
  const draft = hallDraftForSelectedTable();
  [...form.querySelectorAll('[data-hall-ticket-item]')].forEach(row => {
    const itemId = row.dataset.hallTicketItem;
    const qty = Math.max(0, Math.min(50, parseFaNumber(row.querySelector('input[name^="qty:"]')?.value || 0)));
    const note = row.querySelector('textarea[name^="note:"]')?.value || draft.items[itemId]?.note || '';
    const modifiers = row.querySelector('input[name^="modifiers:"]')?.value || draft.items[itemId]?.modifiers || '';
    if (qty > 0 || note || modifiers) draft.items[itemId] = { qty, note, modifiers };
    else delete draft.items[itemId];
  });
  [...form.querySelectorAll('[data-hall-menu-item]')].forEach(card => {
    const itemId = card.dataset.hallMenuItem;
    if (!itemId || draft.items[itemId]) return;
    const qty = Math.max(0, Math.min(50, parseFaNumber(card.querySelector('input[name^="qty:"]')?.value || 0)));
    const note = card.querySelector('textarea[name^="note:"]')?.value || '';
    const modifiers = card.querySelector('input[name^="modifiers:"]')?.value || '';
    if (qty > 0 || note || modifiers) draft.items[itemId] = { qty, note, modifiers };
  });
  draft.orderNote = form.querySelector('[name="orderNote"]')?.value || draft.orderNote || '';
}

function posChannelTabs() {
  return `<div class="pos-channel-tabs"><button type="button" class="${posSalesChannel==='hall'?'active':''}" data-pos-channel="hall">فروش سالن</button><button type="button" class="${posSalesChannel==='delivery'?'active':''}" data-pos-channel="delivery">دلیوری</button><button type="button" class="${posSalesChannel==='snapfood'?'active':''}" data-pos-channel="snapfood">اسنپ‌فود</button></div>`;
}

function renderHallSaleLineRow(items, index, line = {}) {
  const selectedId = line.itemId || items[0]?.id || '';
  const opts = items.map(i=>`<option value="${i.id}" ${i.id === selectedId ? 'selected' : ''}>${esc(i.name)} — ${money(i.price)}</option>`).join('');
  return `<div class="hall-sale-line" data-hall-sale-row><strong>${numberText(index,0)}</strong><label>محصول<select name="itemId">${opts}</select></label><label>تعداد${numInput('qty', line.qty ?? 1)}</label><label>تغییرات داخلی<input name="modifiers" value="${esc(line.modifiers || '')}" placeholder="بدون شکر، سس جدا"></label><label>یادداشت آیتم<input name="note" value="${esc(line.note || '')}" placeholder="یادداشت آشپزخانه یا بار"></label>${actionDecalButton('delete', 'data-remove-hall-sale-line', 'sale-line-remove-button', 'حذف ردیف سفارش')}</div>`;
}

function renderHallQtyControl(itemId, value = 0) {
  const name = `qty:${itemId}`;
  return `<div class="hall-qty-stepper" data-hall-qty-stepper><button type="button" data-hall-qty-delta="-1" aria-label="کم کردن تعداد">−</button><input name="${esc(name)}" data-number inputmode="numeric" min="0" max="50" value="${numberText(value,0)}" aria-label="تعداد"><button type="button" data-hall-qty-delta="1" aria-label="زیاد کردن تعداد">+</button></div>`;
}

function renderHallProductCard(item) {
  return `<button type="button" class="hall-menu-item-card hall-menu-add-button" data-hall-add-item="${esc(item.id)}" ${selectedHallTableId ? '' : 'disabled'}><span class="hall-item-name"><h3>${esc(item.name)}</h3></span><b class="hall-item-price">${money(item.price)}</b></button>`;
}

function renderHallTicketItemRow(item, draft = {}) {
  return `<article class="hall-ticket-item-row" data-hall-ticket-item="${esc(item.id)}"><div class="hall-ticket-item-info"><h3>${esc(item.name)}</h3></div><label class="hall-ticket-item-qty">${renderHallQtyControl(item.id, draft.qty || 0)}</label>${actionDecalButton('delete', `data-delete-hall-ticket-item="${esc(item.id)}"`, 'hall-ticket-delete-button', 'حذف آیتم از فیش')}</article>`;
}

function hallTicketDraftTotal(draftItems, allItems) {
  return Object.entries(draftItems || {}).reduce((sum, [itemId, draft]) => {
    const item = allItems.find(candidate => candidate.id === itemId);
    return sum + (Number(draft.qty || 0) * Number(item?.price || 0));
  }, 0);
}

function renderHallTicketDraftTotal(total) {
  return `<div class="hall-ticket-draft-total" data-hall-ticket-total><span>جمع مبلغ کل آیتم‌ها</span><b>${money(total)}</b></div>`;
}

function updateHallTicketDraftTotal(form = document.querySelector('#hallSaleForm')) {
  const totalBox = form?.querySelector('[data-hall-ticket-total]');
  if (!totalBox || !selectedHallTableId) return;
  const total = hallTicketDraftTotal(hallOrderDrafts[selectedHallTableId]?.items || {}, customerSaleItems());
  const value = totalBox.querySelector('b');
  if (value) value.textContent = money(total);
}

function renderHallOrderPicker(visibleItems, allItems, selectedTable) {
  const draftItems = selectedHallTableId ? hallOrderDrafts[selectedHallTableId]?.items || {} : {};
  const selectedRows = Object.entries(draftItems)
    .filter(([, draft]) => Number(draft.qty || 0) > 0)
    .map(([itemId, draft]) => {
      const item = allItems.find(candidate => candidate.id === itemId);
      return item ? renderHallTicketItemRow(item, draft) : '';
    }).filter(Boolean).join('');
  const selectedTotal = hallTicketDraftTotal(draftItems, allItems);
  const rightItems = visibleItems.map(renderHallProductCard).join('') || '<p>در این دسته آیتم فعالی نیست.</p>';
  const leftContent = selectedTable
    ? (selectedRows ? `${selectedRows}${renderHallTicketDraftTotal(selectedTotal)}` : '<p class="hall-ticket-empty">با کلیک روی آیتم‌های سمت راست، فیش اینجا ساخته می‌شود.</p>')
    : '<p class="hall-ticket-empty">اول میز را انتخاب کنید.</p>';
  return `<div class="hall-menu-scroll hall-two-pane-picker"><section class="hall-clickable-items-pane" aria-label="آیتم‌های قابل انتخاب">${rightItems}</section><section class="hall-ticket-draft-pane" aria-label="فیش در حال ثبت">${leftContent}</section></div>`;
}

function renderHallTablePicker(tables, selectedTable) {
  if (!hallTablePickerOpen) return '';
  const openTables = tables.filter(table => table.active !== false && table.status === 'free' && table.id !== selectedTable?.id);
  const tableButtons = openTables.map(table => `<button type="button" class="hall-table-card ${table.status}" data-hall-table="${table.id}"><b>${esc(table.name)}</b>${table.remainingTotal ? `<small>باقی‌مانده: ${money(table.remainingTotal)}</small>` : ''}</button>`).join('') || '<p class="hall-table-picker-empty">همه میزها درگیر سفارش یا پرداخت هستند.</p>';
  return `<div class="modal-backdrop hall-table-picker-backdrop" data-close-hall-table-picker><div class="panel hall-table-picker-popup" role="dialog" aria-modal="true" aria-label="انتخاب میز"><div class="hall-table-picker-grid">${tableButtons}</div></div></div>`;
}

function renderOccupiedHallTablesBox(tables, selectedTable) {
  const occupiedTables = tables.filter(table => table.active !== false && (table.status !== 'free' || table.id === selectedTable?.id));
  const rows = occupiedTables.map(table => `<button type="button" class="hall-occupied-table-chip ${table.id === selectedTable?.id ? 'active' : ''} ${table.status}" data-hall-occupied-table="${esc(table.id)}"><b>${esc(table.name)}</b></button>`).join('');
  return `<div class="hall-occupied-tables-box" aria-label="میزهای انتخاب‌شده"><div class="hall-occupied-tables-scroll">${rows}</div></div>`;
}

function renderHallTableConfigForm(customer) {
  const tables = RestaurantCore.getHallTables(state, customer.id);
  const settings = customer.hallTableSettings || { count: tables.length || 8, startNumber: 1, customNames: [] };
  const hasOnlineTenant = Boolean(customer.portalTenantId || portalIdentity?.tenantId);
  const qrCards = tables.map((table) => { const link = tablePublicMenuLink(customer, table); return `<article class="hall-table-qr-card ${hasOnlineTenant ? '' : 'missing-tenant'}"><img src="${esc(qrImageUrl(link))}" alt="QR میز ${esc(table.name)}"><div><b>میز ${esc(table.name)}</b><input readonly dir="ltr" value="${esc(link)}"><div class="hall-table-qr-actions"><a class="secondary" href="${esc(link)}" target="_blank" rel="noopener">تست لینک</a><button type="button" class="secondary" data-copy-table-qr="${esc(link)}">کپی لینک</button></div>${hasOnlineTenant ? '' : '<small class="hall-table-qr-warning">برای موبایل اول از پنل آنلاین رستوران وارد شو تا QR شناسه آنلاین داشته باشد.</small>'}</div></article>`; }).join('');
  return `<form class="panel hall-table-config-form" id="hallTableConfigForm"><div class="section-title"><h2>چیدمان میزهای سالن</h2><span class="badge">صندوق</span></div><p>تعداد میزهای شماره‌ای را تعیین کن؛ نام‌های دستی اگر وارد شوند به تعداد میزها اضافه می‌شوند و اول لیست نمایش داده می‌شوند.</p><div class="hall-table-config-grid"><label>تعداد میز${numInput('count', settings.count || 8)}</label><label>شروع شماره${numInput('startNumber', settings.startNumber || 1)}</label></div><label>نام‌گذاری دستی اختیاری<textarea name="customNames" rows="۲" placeholder="مثلاً VIP، رضا، آزاد">${esc((settings.customNames || []).join('، '))}</textarea></label><button class="secondary">ذخیره چیدمان میزها</button><section class="hall-table-qr-section"><div class="section-title"><h3>QR تست منوی میزها</h3><span>برای چاپ یا تست با موبایل</span></div><p>هر QR منوی همین رستوران را برای همان میز باز می‌کند و سفارش ثبت‌شده به فیش باز همان میز اضافه می‌شود.</p><div class="hall-table-qr-grid">${qrCards || '<p>هنوز میزی تعریف نشده است.</p>'}</div></section></form>`;
}

function canManageHallTableLayout() {
  return currentRole() === 'manager';
}

function canManagePosChargeSettings() {
  return currentRole() === 'manager';
}
function posChargeSettings(customer) {
  return RestaurantCore.getPosChargeSettings ? RestaurantCore.getPosChargeSettings(state, customer.id) : { vatEnabled:false, vatPercent:0, serviceEnabled:false, servicePercent:0 };
}
function renderPosChargeSettings(customer) {
  if (!canManagePosChargeSettings()) return '';
  const settings = posChargeSettings(customer);
  return `<form class="pos-charge-settings" id="posChargeSettingsForm" aria-label="تنظیمات مالیات"><label class="pos-charge-toggle"><input type="checkbox" name="vatEnabled" ${settings.vatEnabled ? 'checked' : ''}><span>مالیات بر ارزش افزوده</span></label><label class="pos-charge-percent"><input name="vatPercent" data-number inputmode="decimal" value="${Number(settings.vatPercent || 0) ? numberText(settings.vatPercent, 2) : ''}" aria-label="درصد مالیات"><b>٪</b></label></form>`;
}
function renderPosChannelPanel(customer) {
  return `<div class="pos-channel-settings-row">${posChannelTabs()}${renderPosChargeSettings(customer)}</div>`;
}

function renderHallTableConfigPopup(customer) {
  if (!hallTableConfigOpen || !canManageHallTableLayout()) return '';
  return `<div class="modal-backdrop hall-table-config-backdrop" data-close-hall-table-config><div class="hall-table-config-popup" role="dialog" aria-modal="true" aria-label="چیدمان میزهای سالن"><button type="button" class="modal-close-icon hall-table-config-close" data-close-hall-table-config aria-label="بستن">×</button>${renderHallTableConfigForm(customer)}</div></div>`;
}

function renderHallSales(customer) {
  const items = customerSaleItems();
  const tables = RestaurantCore.getHallTables(state, customer.id);
  if (selectedHallTableId && !tables.some(table => table.id === selectedHallTableId)) selectedHallTableId = '';
  const selectedTable = selectedHallTableId ? tables.find(table => table.id === selectedHallTableId) : null;
  const activeOrder = selectedTable ? RestaurantCore.getActiveHallOrder(state, customer.id, selectedTable.id) : null;
  const categories = [...new Set(items.map(item => item.category || 'بدون دسته‌بندی'))];
  if (!selectedHallCategory || !categories.includes(selectedHallCategory)) selectedHallCategory = categories[0] || '';
  const visibleItems = selectedHallCategory ? items.filter(item => (item.category || 'بدون دسته‌بندی') === selectedHallCategory) : items;
  const tableIconMarkup = `<span class="hall-table-3d-icon" aria-hidden="true"><svg viewBox="0 0 96 72" focusable="false"><defs><linearGradient id="hallTableTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fed7aa"/><stop offset="0.52" stop-color="#fb923c"/><stop offset="1" stop-color="#c2410c"/></linearGradient><linearGradient id="hallTableLeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a3412"/><stop offset="1" stop-color="#431407"/></linearGradient><filter id="hallTableShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#7c2d12" flood-opacity=".32"/></filter></defs><ellipse cx="48" cy="62" rx="34" ry="7" fill="#7c2d12" opacity=".16"/><g filter="url(#hallTableShadow)"><path d="M18 22 48 8l30 14-30 15z" fill="url(#hallTableTop)"/><path d="M18 22v13l30 16V37z" fill="#ea580c"/><path d="M78 22v13L48 51V37z" fill="#9a3412"/><path d="M48 8 78 22 48 37 18 22z" fill="none" stroke="#fff7ed" stroke-width="3" opacity=".55"/><path d="M29 38v22M67 38v22" stroke="url(#hallTableLeg)" stroke-width="8" stroke-linecap="round"/><path d="M39 45v19M57 45v19" stroke="#7c2d12" stroke-width="6" stroke-linecap="round"/></g></svg></span>`;
  const tableLayoutButton = canManageHallTableLayout() ? `<button type="button" class="hall-table-trigger hall-table-layout-trigger" data-open-hall-table-config>${tableIconMarkup}<b>چیدمان میزهای سالن</b></button>` : '';
  const picker = `<div class="hall-corner-picker hall-table-toolbar"><button type="button" class="hall-table-trigger" data-open-hall-table-picker>${tableIconMarkup}<b>انتخاب میز</b></button>${renderOccupiedHallTablesBox(tables, selectedTable)}${tableLayoutButton}</div>`;
  const tableOverlays = `${renderHallTablePicker(tables, selectedTable)}${renderHallTableConfigPopup(customer)}`;
  const categoryTabs = `<div class="hall-category-tabs" role="tablist">${categories.map(cat => `<button type="button" class="${selectedHallCategory===cat?'active':''}" data-hall-category="${esc(cat)}">${esc(cat)}</button>`).join('') || '<span>بدون دسته‌بندی</span>'}</div>`;
  const itemList = renderHallOrderPicker(visibleItems, items, selectedTable);
  const hallOrderTitle = selectedTable ? `<div class="hall-sale-table-title">ثبت سفارش ${esc(selectedTable.name)}</div>` : '';
  const orderForm = `<form class="panel hall-order-panel hall-order-category-panel" id="hallSaleForm">${picker}${items.length ? `<div class="hall-order-builder"><div class="hall-category-side">${categoryTabs}</div><section class="hall-food-list">${hallOrderTitle}${itemList}</section></div>` : '<div class="hall-empty-products">برای ثبت فروش، اول حداقل یک آیتم فعال در منو لازم است.</div>'}<label>یادداشت سفارش<textarea name="orderNote" rows="۳" placeholder="مثلاً عجله‌ای، بدون کارد و چنگال">${esc(selectedHallTableId ? hallOrderDrafts[selectedHallTableId]?.orderNote || '' : '')}</textarea></label><button class="primary" ${selectedTable && items.length ? '' : 'disabled'}>${selectedTable ? (activeOrder ? 'افزودن آیتم به فیش همین میز' : 'ثبت سفارش و صدور فیش') : 'اول میز را انتخاب کنید'}</button>${activeOrder ? '<small>این میز فیش باز دارد؛ آیتم‌های جدید به همان فیش اضافه می‌شوند و در پرداخت نهایی یک‌جا دیده می‌شوند.</small>' : ''}</form>`;
  const payment = activeOrder ? renderHallPaymentPanel(activeOrder) : `<div class="panel hall-payment-panel"><h2>تقسیم فیش و پرداخت</h2><p>بعد از ثبت سفارش، اقلام پرداخت‌نشده همین‌جا برای تسویه کامل یا جزئی نمایش داده می‌شوند.</p></div>`;
  return `<div class="pos-hall-workspace">${orderForm}${payment}</div>${tableOverlays}`;
}

function renderHallServiceChargeControls(order) {
  const mode = order.serviceChargeMode || '';
  const percentValue = mode === 'percent' ? Number(order.serviceChargePercent || 0) : 0;
  const amountValue = mode === 'amount' ? Number(order.serviceChargeAmount || order.serviceChargeTotal || 0) : 0;
  return `<div class="hall-service-charge-box" data-hall-service-charge-box><h3>حق سرویس</h3><div class="hall-service-charge-controls"><label><span>محاسبه درصدی</span><input type="radio" name="serviceMode" value="percent" ${mode === 'percent' ? 'checked' : ''}><input name="servicePercent" data-number inputmode="decimal" value="${percentValue ? numberText(percentValue,2) : ''}" aria-label="درصد حق سرویس"><b>٪</b></label><label><span>مبلغ دستی</span><input type="radio" name="serviceMode" value="amount" ${mode === 'amount' ? 'checked' : ''}><input name="serviceAmount" data-number data-money inputmode="decimal" value="${amountValue ? numberText(amountValue,0) : ''}" aria-label="مبلغ حق سرویس"><b>تومان</b></label><button type="button" class="secondary" data-clear-service-charge>حذف حق سرویس</button></div><small>این قسمت داخل پرداخت میز است و صندوق‌دار هم می‌تواند درصد یا مبلغ حق سرویس را وارد کند.</small></div>`;
}

function renderHallPaymentPanel(order) {
  const remaining = RestaurantCore.getRemainingPaymentItems(order);
  const paid = order.payments || [];
  const methods = RestaurantCore.hallPaymentMethods ? RestaurantCore.hallPaymentMethods() : ['نقدی','کارت‌خوان','پرداخت آنلاین','کیف پول'];
  return `<form class="panel hall-payment-panel" id="hallPaymentForm" data-order-id="${esc(order.id)}"><div class="section-title"><h2>تقسیم فیش و پرداخت ${esc(order.tableName || '')}</h2><span class="badge">${esc(order.posStatus === 'partially-paid' ? 'پرداخت جزئی' : 'سفارش باز')}</span></div><div class="hall-payment-summary"><div><span>شماره سفارش</span><b>${receiptNumberText(order.trackingNumber || 0)}</b></div><div><span>جمع آیتم‌ها</span><b>${money(order.subtotal || order.total)}</b></div><div><span>مالیات</span><b>${money(order.taxTotal || 0)}</b></div><div><span>حق سرویس</span><b data-hall-summary-service>${money(order.serviceChargeTotal || 0)}</b></div><div><span>مبلغ کل</span><b data-hall-summary-grand>${money(orderFinalTotal(order))}</b></div><div><span>پرداخت‌شده</span><b>${money(order.paidTotal || 0)}</b></div><div><span>باقی‌مانده</span><b data-hall-summary-remaining>${money(order.remainingTotal ?? order.total)}</b></div></div>${renderHallServiceChargeControls(order)}<div class="hall-remaining-list"><h3>اقلام باقیمانده برای پرداخت</h3><label class="hall-select-all"><input type="checkbox" data-hall-pay-all checked><span>انتخاب همه اقلام باقیمانده برای تسویه کامل</span><i aria-hidden="true"></i></label>${remaining.map(line => `<label class="hall-pay-item"><input type="checkbox" name="lineId" value="${esc(line.lineId)}" data-hall-pay-line checked><span class="hall-pay-item-copy"><b class="hall-pay-item-title">${esc(line.name)}</b><small class="hall-pay-item-remaining">باقی‌مانده: ${numberText(line.remainingQty,0)} از ${numberText(line.qty,0)} — قیمت واحد: ${money(line.unitPrice)}</small></span><input name="qty:${esc(line.lineId)}" data-number value="${numberText(line.remainingQty,0)}" aria-label="تعداد پرداخت ${esc(line.name)}"></label>`).join('') || '<p>همه اقلام این سفارش تسویه شده‌اند.</p>'}</div><div class="hall-payment-preview" data-hall-payment-preview>مبلغ انتخاب‌شده: ${money(0)} — سهم تخفیف/مالیات/حق سرویس: ${money(0)}</div><label>روش پرداخت<select name="paymentMethod">${methods.map(method => `<option value="${esc(method)}">${esc(method)}</option>`).join('')}</select></label><button class="primary" ${remaining.length ? '' : 'disabled'}>ثبت پرداخت</button><div class="hall-payment-history"><h3>پرداخت‌های انجام‌شده</h3>${paid.map(payment => `<div class="hall-payment-row"><b>${money(payment.amount)}</b><span>${esc(payment.transactionReference)} — ${esc(payment.paymentMethod)} — ${esc(payment.cashierName || 'صندوق‌دار')} — ${formatDate(payment.createdAt)}</span><small>${(payment.allocations || []).map(a => `${esc(a.name)} × ${numberText(a.qty,0)}`).join('، ') || 'تراکنش ناموفق/بدون تخصیص'}</small></div>`).join('') || '<p>هنوز پرداختی ثبت نشده است.</p>'}</div></form>`;
}


function collectSaleLines(form) {
  return [...form.querySelectorAll('[data-sale-row]')]
    .map(row => ({ itemId: row.querySelector('select[name="itemId"]').value, qty: parseFaNumber(row.querySelector('input[name="qty"]').value || 0), note: row.querySelector('input[name="note"]')?.value || '', modifiers: row.querySelector('input[name="modifiers"]')?.value || '' }))
    .filter(x => x.itemId && x.qty > 0);
}


function renderPosWorkdayClosingPanel(customer) {
  const currentShift = RestaurantCore.getCurrentCashierShift(state, customer.id);
  const dailyReport = RestaurantCore.getDailyClosingReport(state, customer.id, new Date(), currentShift ? { shiftId: currentShift.id } : {});
  if (!currentShift) {
    return `<details class="panel wide pos-workday-closing-panel compact-pos-workday-closing"><summary><b>بستن حساب روز کاری</b><span>شروع روز کاری صندوق</span></summary><form id="posShiftForm" class="pos-workday-start-form"><label>نام روز کاری<input name="name" value="روز کاری صندوق"></label><label>نام صندوق‌دار<input name="operatorName" value="صندوق‌دار اصلی"></label><button class="primary">شروع روز کاری</button></form></details>`;
  }
  return `<details class="panel wide pos-workday-closing-panel compact-pos-workday-closing"><summary><b>بستن حساب روز کاری</b><span>باز از ${formatDate(currentShift.openedAt)} — جمع کل ${money(dailyReport.grandTotal)}</span></summary><p>این بخش پایین صندوق است و مزاحم سفارش‌گیری نیست. صندوق‌دار می‌تواند بعد از پایان کار، حتی بعد از نیمه‌شب، حساب همین روز کاری را ببندد و گزارش را پرینت بگیرد.</p><div class="ledger compact-workday-ledger"><div><span>جمع فروش آیتم‌ها</span><b>${money(dailyReport.subtotal)}</b></div><div><span>مالیات</span><b>${money(dailyReport.taxTotal)}</b></div><div><span>حق سرویس</span><b>${money(dailyReport.serviceChargeTotal)}</b></div><div class="total"><span>جمع کل فروش</span><b>${money(dailyReport.grandTotal)}</b></div></div><div class="button-row"><button type="button" class="secondary" data-print-pos-workday-closing="${esc(currentShift.id)}">پیش‌نمایش/پرینت گزارش</button><button type="button" class="danger-button" data-close-pos-workday="${esc(currentShift.id)}">بستن حساب روز و پرینت</button></div></details>`;
}

function currentWorkdayRange(customer) {
  const currentShift = RestaurantCore.getCurrentCashierShift(state, customer.id);
  const from = currentShift?.openedAt ? new Date(currentShift.openedAt).getTime() : 0;
  return { shift: currentShift, from };
}
function isInCurrentWorkday(order, range) {
  if (!range?.from) return true;
  return new Date(order.createdAt || 0).getTime() >= range.from;
}

function renderSales(customer) {
  if (posSalesChannel !== 'hall') return `<section class="workspace pos-workspace"><div class="panel wide">${renderPosChannelPanel(customer)}<h2>${posSalesChannel === 'delivery' ? 'دلیوری' : 'اسنپ‌فود'}</h2><p>در این مرحله فقط ورودی مستقل این بخش آماده شده و منطق آن در فاز بعد پیاده‌سازی می‌شود.</p></div></section>`;
  const hall = renderHallSales(customer);
  const items = customerSaleItems();
  const orders = RestaurantCore.getCustomerOrders ? RestaurantCore.getCustomerOrders(state, customer.id) : byCustomer(state.orders).slice().reverse();
  const workdayRange = currentWorkdayRange(customer);
  const visibleWorkdayOrders = orders.filter(o => isInCurrentWorkday(o, workdayRange));
  const openUnpaidOrders = visibleWorkdayOrders.filter(o => o.posStatus !== 'paid' && Number(o.remainingTotal ?? orderFinalTotal(o) ?? 0) > 0);
  const paidOrders = visibleWorkdayOrders.filter(o => o.posStatus === 'paid');
  const orderRow = (o, paid = false) => `<div class="order-row order-status-row ${o.lowStockWarnings?.length ? 'danger' : ''}"><b>${money(paid ? orderFinalTotal(o) : (o.remainingTotal ?? orderFinalTotal(o)))}</b><span><strong>شماره فیش ${receiptNumberText(o.trackingNumber || 0)}${o.tableName ? ` — میز ${esc(o.tableName)}` : ''}</strong>${o.lowStockWarnings?.length && !paid ? `<br><small>هشدار کمبود: ${esc(lowStockText(o.lowStockWarnings))}</small>` : ''}</span><em>${formatDate(paid ? (o.paidAt || o.completedAt || o.statusUpdatedAt || o.createdAt) : o.createdAt)}</em><div class="row-action-buttons">${!paid ? actionDecalButton('edit', `data-edit-sale="${o.id}"`, 'sale-row-decal', 'ویرایش فروش') : ''}${actionDecalButton('delete', `data-delete-sale="${o.id}"`, 'sale-row-decal', paid ? 'حذف سفارش پرداخت‌شده' : 'حذف فروش')}</div></div>`;
  const completionSummary = RestaurantCore.getOrderCompletionSummary ? RestaurantCore.getOrderCompletionSummary(state, customer.id) : { completedTodayCount: orders.filter(o => o.status === 'completed').length };
  const statusPanel = `<div class="panel wide order-status-panel"><h2>وضعیت سفارشات</h2><div class="order-panel-scroll">${openUnpaidOrders.map(o=>orderRow(o, false)).join('') || '<p>سفارش باز پرداخت‌نشده‌ای وجود ندارد.</p>'}</div></div>`;
  const paidPanel = `<div class="panel wide order-completion-summary paid-orders-panel"><h2>پرداخت شده</h2><p>${esc(orderCompletionSummaryText(completionSummary))}</p><div class="order-panel-scroll">${paidOrders.map(o=>orderRow(o, true)).join('') || '<p>سفارش پرداخت‌شده‌ای وجود ندارد.</p>'}</div></div>`;
  if (posSalesChannel === 'hall') return `<section class="workspace pos-workspace"><div class="panel wide">${renderPosChannelPanel(customer)}</div><div class="panel wide pos-hall-shell">${hall}</div>${statusPanel}${paidPanel}${renderPosWorkdayClosingPanel(customer)}</section>`;
  const editingOrder = orders.find(o => o.id === editingSaleOrderId);
  const starterRows = editingOrder ? editingOrder.lines.map((line, idx) => renderSaleLineRow(items, idx + 1, line)).join('') : [1, 2].map(i => renderSaleLineRow(items, i)).join('');
  const paymentSelected = value => (editingOrder?.paymentMethod || 'card') === value ? 'selected' : '';
  return `<section class="workspace pos-workspace"><div class="panel wide">${renderPosChannelPanel(customer)}</div><div class="panel wide pos-hall-shell">${hall}</div><form class="panel" id="saleForm"><h2>${editingOrder ? 'ویرایش فروش' : 'ثبت فروش سبدی'}</h2><p>برای یک فاکتور چند آیتم انتخاب کن؛ ردیف‌های با تعداد صفر نادیده گرفته می‌شوند.</p><input type="hidden" name="editingOrderId" value="${esc(editingOrder?.id || '')}"><div id="saleRows">${starterRows}</div><button type="button" class="secondary" id="addSaleLine">+ افزودن آیتم به فاکتور</button><label>یادداشت سفارش برای آشپزخانه<textarea name="orderNote" rows="۳" placeholder="مثلا عجله‌ای، بسته‌بندی جدا، بدون کارد و چنگال">${esc(editingOrder?.orderNote || '')}</textarea></label><label>روش پرداخت<select name="payment"><option value="card" ${paymentSelected('card')}>کارتخوان</option><option value="cash" ${paymentSelected('cash')}>نقدی</option><option value="online" ${paymentSelected('online')}>آنلاین</option></select></label><button class="primary">${editingOrder ? 'ذخیره ویرایش فروش' : 'ثبت فاکتور و کاهش انبار'}</button>${editingOrder ? '<button type="button" class="secondary" data-cancel-sale-edit>انصراف از ویرایش</button>' : ''}</form><div class="panel wide order-completion-summary"><h2>خلاصه تحویل سفارش</h2><p>${esc(orderCompletionSummaryText(completionSummary))}</p></div><div class="panel wide order-status-panel"><h2>فروش‌ها و وضعیت سفارش</h2><p>فروش‌های ثبت‌شده را می‌توان ویرایش یا حذف کرد؛ حذف فروش اثر موجودی و دفتر مالی همان فاکتور را برمی‌گرداند.</p>${orders.map(o=>`<div class="order-row order-status-row ${o.lowStockWarnings?.length ? 'danger' : ''}"><b>${money(o.total)}</b><span><strong>شماره پیگیری ${numberText(o.trackingNumber || 0,0)} — ${esc(orderStatusLabel(o.status))}</strong>${orderGuestLine(o) ? `<br><small>${orderGuestLine(o)}</small>` : ''}<br>${o.lines.map(l=>`${esc(l.name)} × ${numberText(l.qty,0)}`).join('، ')}${renderOrderPrepNotes(o)}${o.completedAt ? `<br><small>زمان تحویل: ${formatDate(o.completedAt)}</small>` : ''}${o.lowStockWarnings?.length ? `<br><small>هشدار کمبود: ${esc(lowStockText(o.lowStockWarnings))}</small>` : ''}</span><em>${formatDate(o.createdAt)}</em><label>وضعیت<select data-order-status="${o.id}">${orderStatusOptions(o.status || 'completed')}</select></label><div class="row-action-buttons">${actionDecalButton('edit', `data-edit-sale="${o.id}"`, 'sale-row-decal', 'ویرایش فروش')}${actionDecalButton('delete', `data-delete-sale="${o.id}"`, 'sale-row-decal', 'حذف فروش')}</div></div>`).join('') || '<p>هنوز فروشی ثبت نشده.</p>'}</div></section>`;
}
function renderKitchenTicket(order) {
  const snoozed = isKitchenSnoozed(order.id);
  const snoozeText = snoozed ? `<small class="kitchen-snooze-note">هشدار این سفارش تا ${formatDate(kitchenSnoozeUntil(order.id))} آرام شده است.</small>` : '';
  const critical = order.delayLevel === 'critical';
  const delayBadge = order.delayed ? `<strong class="delay-badge ${critical ? 'critical-delay-badge' : ''}">${critical ? 'دیرکرد بحرانی' : 'دیرکرد آماده‌سازی'}</strong><small class="delay-over-note">${numberText(order.delayOverMinutes || 0,0)} دقیقه بیشتر از هدف</small>${snoozeText}<button type="button" class="secondary kitchen-snooze-button" data-snooze-kitchen-order="${order.id}">آرام کردن هشدار</button>` : '';
  return `<article class="kitchen-ticket ${order.delayed ? 'kitchen-ticket-delayed' : ''} ${critical ? 'kitchen-ticket-critical' : ''} ${snoozed ? 'kitchen-ticket-snoozed' : ''}"><b>شماره پیگیری ${receiptNumberText(order.trackingNumber || 0)}</b><span>${order.lines.map(line => `${esc(line.name)}: ${numberText(line.qty, 0)}`).join('، ')}</span><small>ایستگاه‌ها: ${[...new Set(order.lines.map(line => kitchenStationLabel(line.kitchenStation || 'prep')))].map(esc).join('، ')}</small>${orderGuestLine(order) ? `<small>${orderGuestLine(order)}</small>` : ''}${renderOrderPrepNotes(order)}<small>هدف آماده‌سازی: ${numberText(order.serviceTargetMinutes || 15,0)} دقیقه — زمان سپری‌شده: ${numberText(order.elapsedMinutes || 0,0)} دقیقه</small>${delayBadge}<small>${formatDate(order.createdAt)}</small>${actionDecalButton('print', `data-print-kitchen-ticket="${order.id}"`, 'station-ticket-button', 'پرینت تیکت ایستگاه')}${order.status === 'ready' ? `<button type="button" class="primary kitchen-complete-button" data-complete-order="${order.id}">تحویل و تکمیل</button>` : `<button type="button" class="primary kitchen-advance-button" data-advance-order-status="${order.id}">بردن به ${esc(nextOrderStatusLabel(order.status))}</button>`}<select data-order-status="${order.id}" aria-label="تغییر وضعیت سفارش ${numberText(order.trackingNumber || 0, 0)}">${orderStatusOptions(order.status)}</select></article>`;
}

function renderKitchenOrderQueue(customer) {
  const queue = RestaurantCore.getKitchenOrderQueue ? RestaurantCore.getKitchenOrderQueue(state, customer.id) : [];
  const filteredOrders = RestaurantCore.getKitchenOrdersByStationFilter ? RestaurantCore.getKitchenOrdersByStationFilter(state, customer.id, kitchenStationFilter, kitchenQueueFilter) : (RestaurantCore.getKitchenOrdersByFilter ? RestaurantCore.getKitchenOrdersByFilter(state, customer.id, kitchenQueueFilter) : queue.flatMap(group => group.orders)).filter(order => kitchenStationFilter === 'all' || (order.lines || []).some(line => (line.kitchenStation || 'prep') === kitchenStationFilter));
  const total = queue.reduce((sum, group) => sum + group.orders.length, 0);
  const delayedCount = filteredOrders.filter(order => order.delayed).length;
  const criticalDelayedCount = filteredOrders.filter(order => order.delayLevel === 'critical' && !isKitchenSnoozed(order.id)).length;
  const activeReceivedCount = filteredOrders.filter(order => order.status === 'received').length;
  const activeDelayedCount = filteredOrders.filter(order => order.delayed && !isKitchenSnoozed(order.id)).length;
  const alertPanel = (activeReceivedCount || activeDelayedCount) ? `<div class="kitchen-alert-panel ${criticalDelayedCount ? 'kitchen-alert-critical' : ''}" role="status"><div><b>هشدار فعال آشپزخانه</b><span>${activeReceivedCount ? `${numberText(activeReceivedCount,0)} سفارش تازه دریافت‌شده` : ''}${activeReceivedCount && activeDelayedCount ? '، ' : ''}${activeDelayedCount ? `${numberText(activeDelayedCount,0)} سفارش دارای دیرکرد` : ''}${criticalDelayedCount ? `، ${numberText(criticalDelayedCount,0)} دیرکرد بحرانی` : ''}</span></div><button type="button" class="primary kitchen-alert-button" data-play-kitchen-alert>پخش زنگ هشدار</button></div>` : '';
  const selected = value => value === kitchenQueueFilter ? 'selected' : '';
  const stationSelected = value => value === kitchenStationFilter ? 'selected' : '';
  const stationOptions = ['all','prep','grill','drinks','dessert'].map(station => `<option value="${station}" ${stationSelected(station)}>${esc(kitchenStationFilterLabel(station))}</option>`).join('');
  const filters = `<form id="kitchenFilterForm" class="kitchen-filter-form"><label>تمرکز صف<select name="filter" data-kitchen-filter-select><option value="all" ${selected('all')}>همه سفارش‌های فعال</option><option value="delayed" ${selected('delayed')}>فقط دیرکردها</option><option value="ready" ${selected('ready')}>آماده تحویل</option></select></label><label>ایستگاه<select name="station" data-kitchen-station-select>${stationOptions}</select></label><button class="secondary">اعمال تمرکز</button><button type="button" class="secondary" data-reset-kitchen-filter>نمایش همه</button>${actionDecalButton('print', 'data-print-station-queue', 'station-queue-print-button', 'پرینت صف ایستگاه')}<span>${esc(kitchenFilterLabel(kitchenQueueFilter))} — ${esc(kitchenStationFilterLabel(kitchenStationFilter))}: ${numberText(filteredOrders.length,0)} سفارش</span><small class="kitchen-filter-memory">تمرکز هر ایستگاه در همین مرورگر ذخیره می‌شود.</small></form>`;

  if (kitchenQueueFilter !== 'all' || kitchenStationFilter !== 'all') {
    return `<div class="panel wide kitchen-queue-panel"><div class="section-title"><h2>صف سفارش آشپزخانه</h2><span class="badge">${numberText(total, 0)} سفارش فعال</span></div><p>سفارش‌های باز بر اساس مرحله آماده‌سازی و ایستگاه آشپزخانه فیلتر می‌شوند تا هر بخش فقط تیکت خودش را ببیند و پرینت کند.</p>${alertPanel}${delayedCount ? `<div class="kitchen-delay-summary">${numberText(delayedCount,0)} سفارش از هدف زمان آماده‌سازی گذشته است؛ ${numberText(activeDelayedCount,0)} هشدار نیاز به پیگیری دارد.</div>` : ''}${filters}<div class="kitchen-filter-results">${filteredOrders.map(renderKitchenTicket).join('') || '<p>سفارشی با این تمرکز پیدا نشد.</p>'}</div></div>`;
  }
  return `<div class="panel wide kitchen-queue-panel"><div class="section-title"><h2>صف سفارش آشپزخانه</h2><span class="badge">${numberText(total, 0)} سفارش فعال</span></div><p>سفارش‌های باز بر اساس مرحله آماده‌سازی گروه‌بندی شده‌اند تا آشپزخانه سریع‌تر از دریافت تا آماده تحویل حرکت کند.</p>${alertPanel}${delayedCount ? `<div class="kitchen-delay-summary">${numberText(delayedCount,0)} سفارش از هدف زمان آماده‌سازی گذشته است؛ ${numberText(activeDelayedCount,0)} هشدار نیاز به پیگیری دارد.</div>` : ''}${filters}<div class="kitchen-queue-grid">${queue.map(group => `<section class="kitchen-queue-column" data-kitchen-status="${group.status}"><h3>${esc(orderStatusLabel(group.status))}</h3>${group.orders.map(renderKitchenTicket).join('') || '<p>سفارشی در این مرحله نیست.</p>'}</section>`).join('')}</div></div>`;
}

function renderSaleLineRow(items, index, line = {}) {
  const selectedId = line.itemId || items[0]?.id || '';
  const opts = items.map(i=>`<option value="${i.id}" ${i.id === selectedId ? 'selected' : ''}>${esc(i.name)} — ${money(i.price)}</option>`).join('');
  const modifiersValue = Array.isArray(line.modifiers) ? line.modifiers.join('، ') : (line.modifiers || '');
  return `<div class="ingredient-row" data-sale-row>
    <label>آیتم ${numberText(index,0)}<select name="itemId">${opts}</select></label>
    <label>تعداد${numInput('qty', line.qty ?? (index === 1 ? 1 : 0))}</label>
    <label>تغییرات داخلی<input name="modifiers" value="${esc(modifiersValue)}" placeholder="مثلا بدون پیاز، تند"></label>
    <label>یادداشت ردیف<input name="note" value="${esc(line.note || '')}" placeholder="توضیح کوتاه برای آشپزخانه"></label>
    ${actionDecalButton('delete', 'data-remove-sale-line', 'sale-line-remove-button')}
  </div>`;
}
function sortedInventoryForIngredientSelect(inv) {
  return [...inv].sort((a, b) => cleanPersianText(a.name).localeCompare(cleanPersianText(b.name), 'fa-IR'));
}

function ingredientOptions(inv) {
  return sortedInventoryForIngredientSelect(inv).map(x => `<option value="${x.id}">${esc(cleanPersianText(x.name))} (${esc(unitLabel(x.unit))})</option>`).join('');
}

function inventoryMatchesByText(customerId, value) {
  const query = cleanPersianText(value || '');
  if (!query) return [];
  return sortedInventoryForIngredientSelect(byCustomer(state.inventory))
    .filter(item => cleanPersianText(item.name).includes(query))
    .slice(0, 8);
}

function inventoryItemByNameOrId(customerId, value) {
  const query = cleanPersianText(value || '');
  if (!query) return null;
  const inv = byCustomer(state.inventory);
  return inv.find(item => item.id === value) || inv.find(item => cleanPersianText(item.name) === query) || inv.find(item => cleanPersianText(item.name).includes(query)) || null;
}

function renderIngredientRow(inv, number, ingredient = {}) {
  const selected = inv.find(x => x.id === ingredient.inventoryItemId);
  const materialName = selected ? cleanPersianText(selected.name) : cleanPersianText(ingredient.inventoryItemName || ingredient.materialName || '');
  const qty = ingredient.qty ?? 0;
  const unit = ingredient.unit || 'گرم';
  return `<div class="ingredient-row" data-ingredient-row>
    <div class="ingredient-number">${numberText(number,0)}</div>
    <label class="ingredient-material-field">ماده<input name="ingredientName" value="${esc(materialName)}" data-ingredient-material-name autocomplete="off" placeholder="شروع به نوشتن نام ماده"><input type="hidden" name="inventoryItemId" value="${esc(selected?.id || '')}" data-ingredient-inventory-id><div class="ingredient-autocomplete" data-ingredient-autocomplete hidden></div></label>
    <label class="ingredient-qty-field">مقدار مصرف${numInput('qty', qty)}</label>
    <label class="ingredient-unit-field">واحد مصرف${unitSelect('unit', unit, ['گرم','میلی‌لیتر','عدد','کیلوگرم','لیتر'])}</label>
    ${actionDecalButton('delete', 'data-remove-ingredient', 'ingredient-remove-button')}
  </div>`;
}

function collectRecipeIngredients(form) {
  return [...form.querySelectorAll('[data-ingredient-row]')]
    .map(row => {
      const hiddenId = row.querySelector('[data-ingredient-inventory-id]')?.value || '';
      const typedName = row.querySelector('[data-ingredient-material-name]')?.value || '';
      const matched = hiddenId ? { id: hiddenId } : inventoryItemByNameOrId(currentCustomer()?.id, typedName);
      return { inventoryItemId: matched?.id || '', qty: parseFaNumber(row.querySelector('input[name="qty"]').value), unit: row.querySelector('select[name="unit"]').value };
    })
    .filter(x => x.inventoryItemId && x.qty > 0);
}

function renderIngredientAutocomplete(row, customerId) {
  const input = row.querySelector('[data-ingredient-material-name]');
  const box = row.querySelector('[data-ingredient-autocomplete]');
  if (!input || !box) return;
  const matches = inventoryMatchesByText(customerId, input.value);
  box.innerHTML = matches.map(item => `<button type="button" data-ingredient-suggestion="${esc(item.id)}"><span>${esc(cleanPersianText(item.name))}</span><small>${esc(unitLabel(item.unit))} — موجودی ${numberText(item.stock || 0)}</small></button>`).join('');
  box.hidden = !matches.length;
  box.querySelectorAll('[data-ingredient-suggestion]').forEach(btn => btn.addEventListener('click', () => {
    const item = byCustomer(state.inventory).find(inv => inv.id === btn.dataset.ingredientSuggestion);
    if (!item) return;
    input.value = cleanPersianText(item.name);
    row.querySelector('[data-ingredient-inventory-id]').value = item.id;
    box.hidden = true;
    updateRecipeCostPreview(row.closest('form'), customerId);
  }));
}

function bindIngredientAutocomplete(form, customerId) {
  form.querySelectorAll('[data-ingredient-row]').forEach(row => {
    const input = row.querySelector('[data-ingredient-material-name]');
    const hidden = row.querySelector('[data-ingredient-inventory-id]');
    if (input && !input.dataset.ingredientBound) {
      input.dataset.ingredientBound = '1';
      input.addEventListener('input', () => {
        if (hidden) hidden.value = '';
        const exact = inventoryItemByNameOrId(customerId, input.value);
        if (exact && cleanPersianText(exact.name) === cleanPersianText(input.value) && hidden) hidden.value = exact.id;
        renderIngredientAutocomplete(row, customerId);
        updateRecipeCostPreview(form, customerId);
      });
      input.addEventListener('focus', () => renderIngredientAutocomplete(row, customerId));
      input.addEventListener('change', () => {
        const match = inventoryItemByNameOrId(customerId, input.value);
        if (match && hidden) { hidden.value = match.id; input.value = cleanPersianText(match.name); }
        renderIngredientAutocomplete(row, customerId);
        updateRecipeCostPreview(form, customerId);
      });
    }
  });
}

function bindRecipeRowButtons(form, customerId) {
  form.querySelectorAll('[data-remove-ingredient]').forEach(btn => {
    btn.onclick = () => {
      const rows = document.querySelectorAll('[data-ingredient-row]');
      if (rows.length <= 1) return alert('حداقل یک ماده اولیه باید بماند');
      btn.closest('[data-ingredient-row]').remove();
      updateRecipeCostPreview(form, customerId);
    };
  });
}
function loadRecipeRowsForSelected(form, customerId, blank = false) {
  const inv = byCustomer(state.inventory);
  const itemId = form.querySelector('[name="itemId"]')?.value;
  const recipe = blank ? null : byCustomer(state.recipes).find(r => r.itemId === itemId);
  const ingredients = recipe?.ingredients?.length ? recipe.ingredients : [{ inventoryItemId: inv[0]?.id, qty: 0 }];
  const rows = form.querySelector('#ingredientRows');
  rows.innerHTML = ingredients.map((ing, idx) => renderIngredientRow(inv, idx + 1, ing)).join('');
  bindPersianNumberInputs(rows);
  bindRecipeRowButtons(form, customerId);
  bindIngredientAutocomplete(form, customerId);
  const steps = form.querySelector('[name="cookingSteps"]');
  if (steps) steps.value = recipe?.cookingSteps || '';
  updateRecipeCostPreview(form, customerId);
}

function updateRecipeCostPreview(form, customerId) {
  const preview = document.querySelector('#recipeCostPreview');
  if (!form || !preview) return;
  const ingredients = collectRecipeIngredients(form);
  if (!ingredients.length) {
    preview.innerHTML = '<b>قیمت تمام‌شده:</b><span>برای محاسبه، یک ماده اولیه اضافه کنید.</span>';
    return;
  }
  try {
    const cost = RestaurantCore.calculateRecipeCost(state, customerId, ingredients);
    preview.innerHTML = `<b>قیمت تمام‌شده هر پرس: ${money(cost.totalCost)}</b><span>جزئیات محاسبه: ${cost.lines.map(line => `${esc(line.name)}: ${numberText(line.qty)} ${esc(unitLabel(line.unit))} = ${money(line.lineCost)}`).join('، ')}</span>`;
  } catch (err) {
    preview.innerHTML = `<b>قیمت تمام‌شده:</b><span>${esc(err.message)}</span>`;
  }
}

function actionLabel(type) {
  return ({ delete: 'حذف', edit: 'ویرایش', print: 'پرینت', save: 'ذخیره', details: 'نمایش جزئیات سند' })[type] || '';
}

function actionIcon(type) {
  const icons = {
    delete: '<svg class="recipe-decal-icon action-decal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 8h8"/><path d="M10 8V6h4v2"/><path d="M7 8l1 11h8l1-11"/><path d="M10.5 11v5"/><path d="M13.5 11v5"/></svg>',
    edit: '<svg class="recipe-decal-icon action-decal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 17.5V20h2.5L18.8 8.7l-2.5-2.5L5 17.5z"/><path d="M15.5 7l2.5 2.5"/></svg>',
    print: '<svg class="recipe-decal-icon action-decal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 8V4h10v4"/><path d="M7 17H5a2 2 0 0 1-2-2v-3.5A2.5 2.5 0 0 1 5.5 9h13A2.5 2.5 0 0 1 21 11.5V15a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v6H7z"/><path d="M17.5 12h.01"/></svg>',
    save: '<svg class="recipe-decal-icon action-decal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 13l4 4L19 7"/></svg>',
    details: '<svg class="recipe-decal-icon action-decal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  return icons[type] || '';
}

function recipeActionIcon(type) { return actionIcon(type); }

function actionDecalButton(type, attrs = '', extraClass = '', labelOverride = '') {
  const label = labelOverride || actionLabel(type);
  const dangerClass = type === 'delete' ? 'recipe-decal-danger action-decal-danger' : '';
  const printClass = type === 'print' ? 'action-decal-print' : '';
  const saveClass = type === 'save' ? 'action-decal-save' : '';
  const className = ['recipe-decal-button', 'action-decal-button', dangerClass, printClass, saveClass, extraClass].filter(Boolean).join(' ');
  return `<button type="button" class="${className}" data-tooltip="${esc(label)}" aria-label="${esc(label)}" ${attrs}>${actionIcon(type)}</button>`;
}

function setActionDecalButton(button, type, labelOverride = '') {
  const label = labelOverride || actionLabel(type);
  button.innerHTML = actionIcon(type);
  button.dataset.tooltip = label;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.classList.toggle('action-decal-save', type === 'save');
  button.classList.toggle('recipe-decal-danger', type === 'delete');
  button.classList.toggle('action-decal-danger', type === 'delete');
}

function renderRecipes(customer) {
  const inv = byCustomer(state.inventory);
  const items = customerMenuItems();
  const recipes = byCustomer(state.recipes);
  const itemById = new Map(items.map(item => [item.id, item]));
  const recipeDisplayName = (recipe) => cleanPersianText(itemById.get(recipe.itemId)?.name || recipe.itemName || 'آیتم');
  const categoryOf = (recipe) => cleanPersianText(itemById.get(recipe.itemId)?.category || recipe.category || 'بدون دسته‌بندی') || 'بدون دسته‌بندی';
  const categories = [...new Set(recipes.map(categoryOf))].sort((a, b) => a.localeCompare(b, 'fa-IR'));
  const activeCategory = categories.includes(currentRecipeCategoryTab) ? currentRecipeCategoryTab : (categories[0] || '');
  currentRecipeCategoryTab = activeCategory;
  const visibleRecipes = activeCategory ? recipes.filter(recipe => categoryOf(recipe) === activeCategory) : recipes;
  const starterRows = '';
  const categoryTabs = categories.length ? `<div class="recipe-category-tabs" role="tablist">${categories.map(category => `<button type="button" class="recipe-category-tab ${category === activeCategory ? 'active' : ''}" data-recipe-category-tab="${esc(category)}" role="tab" aria-selected="${category === activeCategory ? 'true' : 'false'}">${esc(category)}</button>`).join('')}</div>` : '';
  const recipeRows = visibleRecipes.map(r=>{
    const item = itemById.get(r.itemId);
    let cost = 0;
    let costLabel = '';
    try { cost = RestaurantCore.calculateRecipeCost(state, customer.id, r.ingredients).totalCost; costLabel = money(cost); }
    catch { costLabel = 'نیازمند اتصال مواد به انبار'; }
    const recipeName = recipeDisplayName(r);
    return `<div class="recipe-row"><b>${esc(recipeName)}</b><strong>قیمت تمام‌شده هر پرس: ${costLabel}</strong><div class="recipe-row-actions">${actionDecalButton('delete', `data-delete-recipe="${r.id}"`, 'recipe-row-decal')}${actionDecalButton('edit', `data-edit-recipe="${r.id}"`, 'recipe-row-decal')}${actionDecalButton('print', `data-print-recipe="${r.id}"`, 'recipe-row-decal')}</div></div>`;
  }).join('') || '<p>برای این دسته هنوز رسپی ثبت نشده.</p>';
  return `<section class="workspace recipe-workspace"><form class="panel recipe-form-panel" id="recipeForm"><div class="recipe-new-action"><button type="button" class="primary" data-new-recipe>ایجاد رسپی جدید</button></div><p>برای هر غذا مواد اولیه را اضافه کن؛ مراحل آماده‌سازی را بنویس و قبل از ذخیره قیمت تمام‌شده هر پرس را زنده ببین.</p><input type="hidden" name="editingItemId" value=""><input type="hidden" name="editingRecipeId" value=""><label>نام آیتم<input name="itemName" value=""></label><label>دسته‌بندی<input name="category" value=""></label><div id="ingredientRows">${starterRows}</div><button type="button" class="secondary" id="addIngredient">+ افزودن مواد اولیه</button><label>مراحل آماده‌سازی<textarea name="cookingSteps" rows="۵" placeholder="مثلا: مواد را آماده کن، حرارت بده، ترکیب کن و سرو کن."></textarea></label><div class="cost-preview" id="recipeCostPreview" aria-live="polite"><b>قیمت تمام‌شده:</b><span>برای محاسبه، یک ماده اولیه اضافه کنید.</span></div><button class="primary">ذخیره رسپی</button></form><div class="panel wide recipe-list-panel"><div class="section-title recipe-list-title"><h2>رسپی‌های ثبت‌شده</h2>${sectionBackupControls('recipes')}</div><div class="recipe-list-scroll">${categoryTabs}<div class="recipe-category-content">${recipeRows}</div></div></div></section>`;
}



function readonlyInventoryText(value, extraClass = '') {
  const isNumber = String(extraClass || '').includes('inventory-number-readonly');
  const displayValue = isNumber ? faNum(value) : cleanPersianText(value);
  const textDir = isNumber ? 'ltr' : 'rtl';
  return `<span class="inventory-readonly-value ${extraClass}" data-inventory-readonly><bdi class="inventory-readonly-text" dir="${textDir}">${esc(displayValue)}</bdi></span>`;
}

function renderInventoryEditRow(x) {
  const cleanName = cleanPersianText(x.name);
  return `<form class="edit-row inventory-edit-form ${x.stock <= x.minStock ? 'danger' : ''}" data-inventory-id="${x.id}" data-inventory-search-row data-inventory-search-name="${esc(cleanName)}">
    <label class="inventory-name-field">نام${readonlyInventoryText(x.name, 'inventory-name-readonly')}<input name="name" value="${esc(cleanName)}" disabled hidden data-inventory-edit-field></label>
    <label class="inventory-unit-field">واحد${readonlyInventoryText(unitLabel(x.unit), 'inventory-unit-readonly')}${unitSelect('unit', x.unit).replace('<select ', '<select disabled hidden data-inventory-edit-field ')}</label>
    <label class="inventory-stock-field">موجودی${readonlyInventoryText(numberText(x.stock), 'inventory-number-readonly')}${numInput('stock', x.stock, 'disabled hidden data-inventory-edit-field')}</label>
    <label class="inventory-price-field">قیمت${readonlyInventoryText(numberText(x.unitCost), 'inventory-number-readonly')}${numInput('unitCost', x.unitCost, 'disabled hidden data-inventory-edit-field')}</label>
    <label class="inventory-min-field">حداقل${readonlyInventoryText(numberText(x.minStock), 'inventory-number-readonly')}${numInput('minStock', x.minStock, 'disabled hidden data-inventory-edit-field')}</label>
    <div class="row-action-buttons inventory-row-actions">${actionDecalButton('edit', 'data-edit-inventory-row', 'inventory-row-decal')}${actionDecalButton('delete', `data-delete-inventory="${x.id}"`, 'inventory-row-decal')}</div>
  </form>`;
}

function renderInventory(customer) {
  const inv = byCustomer(state.inventory);
  const sortedInv = inv.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fa'));
  return `<section class="workspace inventory-workspace">
    <form class="panel inventory-create-panel" id="inventoryForm"><h2>ماده اولیه جدید</h2><label>نام<input name="name" value=""></label><label>واحد پایه انبار${unitSelect('unit', '')}</label><label>موجودی${numInput('stock', '')}</label><label>قیمت${numInput('unitCost', '')}</label><label>حداقل موجودی${numInput('minStock', '')}</label><button class="primary">افزودن به انبار</button><small>واحدهای انبار و حسابداری: کیلوگرم، لیتر و عدد. مصرف رسپی می‌تواند گرم یا میلی‌لیتر باشد و خودکار تبدیل می‌شود.</small></form>
    <div class="panel wide inventory-edit-panel"><div class="section-title inventory-stock-title"><h2>موجودی انبار</h2><div class="inventory-title-actions">${sectionBackupControls('inventory')}${actionDecalButton('print', 'data-print-inventory onclick="showInventoryPrintPreview()"', 'inventory-print-decal', 'پرینت A4 موجودی')}</div></div><div class="inventory-search-field"><label>جستجوی اقلام<input name="inventorySearch" value="" autocomplete="off" data-inventory-search placeholder="شروع به نوشتن نام قلم کن"></label><div class="inventory-search-menu" data-inventory-search-menu hidden></div></div><div class="inventory-edit-scroll">${sortedInv.map(renderInventoryEditRow).join('') || '<p>هنوز ماده اولیه‌ای ثبت نشده.</p>'}</div></div>
  </section>`;
}


function bindInventorySearch(customer) {
  const input = document.querySelector('[data-inventory-search]');
  const menu = document.querySelector('[data-inventory-search-menu]');
  const rows = [...document.querySelectorAll('[data-inventory-search-row]')];
  if (!input || !menu || !rows.length) return;
  const items = byCustomer(state.inventory).map(item => ({ id: item.id, name: cleanPersianText(item.name), unit: unitLabel(item.unit), stock: item.stock })).sort((a,b) => a.name.localeCompare(b.name, 'fa-IR'));
  const applyFilter = (value) => {
    const query = cleanPersianText(value || '');
    let visible = 0;
    rows.forEach(row => {
      const match = !query || cleanPersianText(row.dataset.inventorySearchName || '').includes(query);
      row.hidden = !match;
      if (match) visible += 1;
    });
    return visible;
  };
  const renderMenu = () => {
    const query = cleanPersianText(input.value || '');
    const matches = query ? items.filter(item => item.name.includes(query)).slice(0, 8) : [];
    menu.innerHTML = matches.map(item => `<button type="button" data-inventory-search-pick="${esc(item.name)}"><b>${esc(item.name)}</b><small>${esc(item.unit)} — موجودی ${numberText(item.stock)}</small></button>`).join('');
    menu.hidden = !matches.length;
  };
  input.addEventListener('input', () => { applyFilter(input.value); renderMenu(); });
  input.addEventListener('focus', renderMenu);
  menu.addEventListener('click', (event) => {
    const pick = event.target.closest('[data-inventory-search-pick]');
    if (!pick) return;
    input.value = pick.dataset.inventorySearchPick;
    applyFilter(input.value);
    menu.hidden = true;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('.inventory-search-field')) menu.hidden = true;
  });
}


function renderFinancialAccountCreatePanel() {
  return `<form class="panel financial-account-create-panel" id="financialAccountForm"><h2>افزودن حساب</h2><label>نام حساب<input name="name" value="" placeholder="مثلاً بانک ملت یا صندوق اصلی"></label><label>نوع حساب<select name="type">${accountTypeOptions('bank')}</select></label><label>مانده اول دوره${numInput('openingBalance', '')}</label><button class="primary">افزودن حساب</button></form>`;
}

function renderFinancialAccountPanel(customer) {
  const balances = RestaurantCore.getAccountBalances ? RestaurantCore.getAccountBalances(state, customer.id) : [];
  const rows = balances.map(a => { const isEditing = editingFinancialAccountId === a.id; const lockAttr = isEditing ? '' : 'disabled aria-disabled="true"'; return `<form class="account-edit-form ${isEditing ? 'is-editing' : 'is-locked'}" data-financial-account-id="${esc(a.id)}"><label>نام حساب<input name="name" value="${esc(a.name)}" ${lockAttr}></label><label>نوع حساب<select name="type" ${lockAttr}>${accountTypeOptions(a.type)}</select></label><label>مانده اول دوره${numInput('openingBalance', a.openingBalance, lockAttr)}</label><div class="account-current-balance"><span>ورودی</span><b>${money(a.incoming)}</b></div><div class="account-current-balance"><span>خروجی</span><b>${money(a.outgoing)}</b></div><div class="account-current-balance total"><span>مانده فعلی</span><b>${money(a.balance)}</b></div><div class="row-action-buttons account-row-actions">${actionDecalButton(isEditing ? 'save' : 'edit', 'data-save-financial-account', 'account-row-decal', isEditing ? 'ذخیره حساب' : 'ویرایش حساب')}${actionDecalButton('delete', `data-delete-financial-account="${esc(a.id)}"`, 'account-row-decal')}</div></form>`; }).join('');
  return `<div class="panel wide financial-account-panel" id="financialAccountsPanel"><div class="section-title"><h2>حساب‌های ثبت‌شده</h2></div><p>مانده فعلی از مانده اول دوره و رویدادهای مالی محاسبه می‌شود.</p><div class="account-list-table"><div class="financial-account-scroll">${rows || '<small>هنوز حسابی تعریف نشده؛ برای گزارش‌گیری پرداخت‌ها اول حساب بساز.</small>'}</div></div></div>`;
}

function renderAccountingSubNav() {
  const tabs = [['accounts','حساب‌ها'], ['expenses','هزینه‌ها'], ['cheques','چک‌ها'], ['ledger','دفتر مالی'], ['reports','گزارش‌ها']];
  return `<div class="panel wide accounting-subnav" role="tablist">${tabs.map(([id,label]) => `<button type="button" class="secondary ${accountingSubTab === id ? 'active' : ''}" data-accounting-subtab="${id}">${label}</button>`).join('')}</div>`;
}

function chequeCollections(customer) {
  const accounts = RestaurantCore.getFinancialAccounts ? RestaurantCore.getFinancialAccounts(state, customer.id) : [];
  const accountName = id => accounts.find(account => account.id === id)?.name || 'حساب ثبت‌نشده';
  const cheques = byCustomer(state.cheques || []).slice().sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || ''), 'fa-IR'));
  const pending = cheques.filter(ch => ch.status !== 'پاس‌شده' && ch.status !== 'پاس شده' && ch.status !== 'paid');
  const passed = cheques.filter(ch => !pending.includes(ch));
  const warnings = RestaurantCore.getChequeWarnings ? RestaurantCore.getChequeWarnings(state, customer.id, new Date(), 4) : [];
  return { accountName, cheques, pending, passed, warnings };
}

function renderChequeWarningsPanel(customer) {
  const { accountName, pending, passed, warnings } = chequeCollections(customer);
  const warningIds = new Set(warnings.map(ch => ch.id));
  const chequeRow = (ch, mode = 'plain') => {
    const actions = mode === 'pending'
      ? `<div class="cheque-row-actions"><button type="button" class="secondary cheque-pass-button" data-pass-cheque="${esc(ch.id)}">پاس شد</button>${actionDecalButton('delete', `data-delete-cheque="${esc(ch.id)}"`, 'cheque-delete-decal', 'حذف چک پاس‌نشده')}</div>`
      : mode === 'passed'
        ? '<div class="cheque-row-actions cheque-row-actions-placeholder" aria-hidden="true"></div>'
        : '';
    return `<div class="cheque-list-row cheque-row-${mode} ${warningIds.has(ch.id) ? 'cheque-near-warning' : ''}"><div class="cheque-row-main"><b>چک ${esc(ch.chequeNumber)}</b><span>${esc(ch.title || 'پرداخت چکی')} — بانک/حساب: ${esc(accountName(ch.accountId))} — سررسید: ${esc(ch.dueDate)}</span></div><em>${money(ch.amount)}</em>${actions}</div>`;
  };
  const viewDecal = (kind, label) => actionDecalButton('details', `data-view-cheque-list="${kind}"`, 'cheque-view-decal', label);
  const chequeColumn = (title, kind, list, empty) => `<div class="cheque-status-box"><div class="section-title"><h2>${title}</h2>${viewDecal(kind, `نمایش ${title}`)}</div><div class="cheque-status-list">${list.map(ch => chequeRow(ch, kind)).join('') || `<p>${empty}</p>`}</div></div>`;
  return `<div class="panel wide cheque-board-panel"><div class="cheque-warning-summary ${warnings.length ? 'danger' : ''}"><div class="section-title cheque-warning-title"><h2>هشدار چک‌های نزدیک</h2><span class="badge">هشدار تا ۴ روز قبل</span>${viewDecal('warnings', 'نمایش هشدار چک‌ها')}</div><div class="cheque-warning-list">${warnings.map(ch => chequeRow(ch, 'plain')).join('') || '<p>چک نزدیک سررسید ندارید.</p>'}</div></div><div class="cheque-status-grid">${chequeColumn('چک‌های پاس‌نشده', 'pending', pending, 'چک پاس‌نشده‌ای ثبت نشده است.')}${chequeColumn('چک‌های پاس‌شده', 'passed', passed, 'چک پاس‌شده‌ای ثبت نشده است.')}</div></div>`;
}

function renderPaymentMetaFields(customer, defaults = {}) {
  return `<div class="payment-meta-grid"><label>روش پرداخت<select name="paymentMethod" data-payment-method>${paymentMethodOptions(defaults.paymentMethod || 'بانکی')}</select></label><label>حساب پرداخت‌کننده<select name="accountId">${financialAccountOptions(customer.id, defaults.accountId || '')}</select></label><label>شماره چک<input name="chequeNumber" value="" placeholder="فقط برای پرداخت چکی"></label>${jalaliDateInput('chequeDueDate', 'تاریخ سررسید چک', defaults.chequeDueDate || jalaliDateText())}</div>`;
}


function renderOperationalExpenseList(customer) {
  const expenses = byCustomer(state.expenses || []).slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const accounts = RestaurantCore.getFinancialAccounts ? RestaurantCore.getFinancialAccounts(state, customer.id) : [];
  const accountName = id => accounts.find(account => account.id === id)?.name || '';
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const rows = expenses.map(expense => {
    const account = accountName(expense.accountId);
    const meta = [
      expense.category ? `دسته: ${esc(expense.category)}` : '',
      expense.paymentMethod ? `روش: ${esc(expense.paymentMethod)}` : '',
      account ? `حساب: ${esc(account)}` : '',
      expense.chequeNumber ? `چک ${esc(expense.chequeNumber)}${expense.chequeDueDate ? ` — سررسید ${esc(expense.chequeDueDate)}` : ''}` : ''
    ].filter(Boolean).join(' — ');
    return `<div class="operational-expense-row"><div class="operational-expense-doc"><span><b>تاریخ سند</b>${esc(expense.documentDate || formatDate(expense.createdAt))}</span><span><b>شماره سند</b>${esc(faNum(expense.documentNumber || 'بدون شماره'))}</span><span><b>مبلغ</b>${money(expense.amount || 0)}</span></div><div class="operational-expense-info"><strong>${esc(expense.title || 'هزینه عملیاتی')}</strong>${meta ? `<small>${meta}</small>` : ''}${expense.description ? `<p>${esc(expense.description)}</p>` : ''}</div></div>`;
  }).join('');
  return `<div class="panel wide operational-expense-list"><div class="section-title operational-expense-list-title"><h2>هزینه‌های عملیاتی ثبت‌شده</h2><span class="badge">جمع: ${money(total)}</span></div><div class="operational-expense-list-body">${rows || '<p>هنوز هزینه عملیاتی ثبت نشده است.</p>'}</div></div>`;
}

function renderAccounting(customer) {
  const summary = RestaurantCore.getAccountingSummary(state, customer.id);
  const ledger = RestaurantCore.getAccountingLedger(state, customer.id, accountingFilterPayload());
  const currentShift = RestaurantCore.getCurrentCashierShift(state, customer.id);
  const dailyReport = RestaurantCore.getDailyClosingReport(state, customer.id, new Date(), currentShift ? { shiftId: currentShift.id } : {});
  const selected = (value, current) => value === current ? 'selected' : '';
  const shiftCaption = currentShift ? `گزارش از شروع روز کاری ${esc(currentShift.name)} با اپراتور ${esc(currentShift.operatorName)} از ${formatDate(currentShift.openedAt)} تا همین لحظه محاسبه می‌شود؛ حتی اگر بعد از نیمه‌شب باشد.` : 'روز کاری بازی ثبت نشده؛ گزارش بر اساس امروز تقویمی نمایش داده می‌شود.';
  const accountsContent = renderFinancialAccountPanel(customer);
  const accountCreateContent = renderFinancialAccountCreatePanel();
  const expensesContent = `<div class="expense-entry-grid"><form class="panel expense-panel expense-fixed-panel" id="expenseForm"><h2>ثبت هزینه عملیاتی</h2><div class="expense-document-row">${jalaliDateInput('documentDate', 'تاریخ سند')}<label>شماره سند<input name="documentNumber" value="" placeholder="مثلاً ۱۲۳"></label></div><label>عنوان هزینه<input name="title" value="تعمیر دستگاه اسپرسو"></label><label>دسته هزینه<select name="category">${expenseCategoryOptions('تعمیرات و نگهداری')}</select></label><label>توضیحات<textarea name="description" rows="2" class="expense-description" placeholder="توضیحات سند هزینه"></textarea></label><label>مبلغ${numInput('amount', 500000)}</label>${renderPaymentMetaFields(customer, { paymentMethod: 'نقدی' })}<button class="primary">ثبت هزینه</button></form>${renderPurchaseInvoicePanel(customer)}${renderOperationalExpenseList(customer)}</div>`;
  const chequesContent = renderChequeWarningsPanel(customer);
  const ledgerContent = `<div class="panel wide"><h2>دفتر مالی</h2><form id="accountingFilterForm" class="filter-form"><strong>فیلتر دفتر رویداد مالی</strong><label>نوع رویداد<select name="type"><option value="" ${selected('', accountingFilter.type)}>همه رویدادها</option><option value="revenue" ${selected('revenue', accountingFilter.type)}>درآمد</option><option value="cost" ${selected('cost', accountingFilter.type)}>قیمت تمام‌شده</option><option value="expense" ${selected('expense', accountingFilter.type)}>هزینه</option><option value="supplier-payment" ${selected('supplier-payment', accountingFilter.type)}>پرداخت تأمین‌کننده</option></select></label><label>بازه زمانی<select name="range"><option value="all" ${selected('all', accountingFilter.range)}>همه زمان‌ها</option><option value="today" ${selected('today', accountingFilter.range)}>امروز</option><option value="seven" ${selected('seven', accountingFilter.range)}>هفت روز اخیر</option><option value="thirty" ${selected('thirty', accountingFilter.range)}>سی روز اخیر</option></select></label><button class="secondary">اعمال فیلتر</button><button type="button" class="secondary" data-export-accounting-ledger>دریافت فایل دفتر مالی</button></form>${ledger.map(l=>`<div class="order-row"><b>${esc(ledgerTypeLabel(l.type))}</b><span>${money(l.amount)}${l.accountName ? ` — حساب: ${esc(l.accountName)}` : ''}${l.paymentMethod ? ` — روش: ${esc(l.paymentMethod)}` : ''}${l.chequeNumber ? ` — چک ${esc(l.chequeNumber)} سررسید ${esc(l.chequeDueDate)}` : ''}</span><em>${formatDate(l.createdAt)}</em></div>`).join('') || '<p>رویدادی با این فیلتر پیدا نشد.</p>'}</div>`;
  const reportsContent = `<form class="panel shift-panel" id="shiftForm"><h2>روز کاری صندوق</h2>${currentShift ? `<p><b>${esc(currentShift.name)}</b></p><p>اپراتور: ${esc(currentShift.operatorName)}</p><p>شروع: ${formatDate(currentShift.openedAt)}</p><button type="button" class="danger-button" data-close-shift="${currentShift.id}">بستن حساب روز</button>` : `<label>نام شیفت<input name="name" value="شیفت صبح"></label><label>نام اپراتور<input name="operatorName" value="صندوق‌دار اصلی"></label><button class="primary">شروع روز کاری</button>`}</form><div class="panel wide daily-closing-panel"><h2>بستن حساب روز کاری</h2><p>${shiftCaption}</p><p>خلاصه آماده پرینت برای پایان روز کاری؛ فروش از شروع روز کاری تا لحظه بستن حساب جمع می‌شود، حتی اگر بستن بعد از نیمه‌شب انجام شود.</p><div class="ledger"><div><span>جمع فروش آیتم‌ها</span><b>${money(dailyReport.subtotal)}</b></div><div><span>مالیات</span><b>${money(dailyReport.taxTotal)}</b></div><div><span>حق سرویس</span><b>${money(dailyReport.serviceChargeTotal)}</b></div><div class="total"><span>جمع کل فروش</span><b>${money(dailyReport.grandTotal)}</b></div></div><div class="daily-closing-category-preview"><h3>تفکیک دسته‌بندی منو</h3><table class="purchase-invoice-print-table daily-closing-category-table"><thead><tr><th>دسته‌بندی</th><th>تعداد</th><th>مبلغ فروش</th></tr></thead><tbody>${dailyClosingCategoryRows(dailyReport)}</tbody></table></div><div class="button-row">${actionDecalButton('print', 'data-print-daily-closing', 'daily-closing-print-decal', 'پرینت بستن حساب روز کاری')}<button type="button" class="secondary" data-export-daily-closing>دریافت فایل بستن حساب روز کاری</button></div></div>`;
  const tabContent = { accounts: accountsContent, expenses: expensesContent, cheques: chequesContent, ledger: ledgerContent, reports: reportsContent }[accountingSubTab] || accountsContent;
  const topPanels = accountingSubTab === 'accounts' ? `<div class="accounting-top-grid"><div class="panel accounting-summary-panel"><h2>خلاصه حسابداری</h2><div class="ledger"><div><span>درآمد</span><b>${money(summary.revenue)}</b></div><div><span>قیمت تمام‌شده</span><b>${money(summary.cost)}</b></div><div><span>هزینه‌ها</span><b>${money(summary.expenses)}</b></div><div><span>چک‌های هشدار</span><b>${money(summary.chequeWarningsAmount || 0)}</b></div><div class="total"><span>سود</span><b>${money(summary.profit)}</b></div></div></div>${accountCreateContent}</div>` : '';
  return `<section class="workspace accounting-workspace">${renderAccountingSubNav()}${topPanels}${tabContent}</section>`;
}

function renderOnboardingChecklist(customer) {
  const checklist = RestaurantCore.getOnboardingChecklist(state, customer.id);
  const statusText = checklist.ready ? 'آماده بهره‌برداری اولیه' : `${numberText(checklist.remainingCount, 0)} گام تا آمادگی اولیه`;
  return `<div class="panel wide onboarding-panel"><div class="section-title"><h2>چک‌لیست آمادگی راه‌اندازی</h2><span class="badge">${statusText}</span></div><p>این چک‌لیست نشان می‌دهد برای رسیدن رستوران به نمونه قابل بهره‌برداری، کدام بخش‌های کلیدی هنوز ناقص هستند.</p><div class="onboarding-progress"><span style="width:${(checklist.doneCount / checklist.total) * 100}%"></span></div><div class="onboarding-list">${checklist.items.map(item => `<div class="onboarding-item ${item.done ? 'done' : 'missing'}"><div><b>${item.done ? 'تکمیل‌شده' : 'نیازمند اقدام'}: ${esc(item.title)}</b><span>${esc(faNum(item.detail))}</span></div>${item.key === 'backup-export' ? `<button type="button" class="secondary" data-onboarding-backup>${esc(item.action)}</button>` : `<button type="button" class="secondary" data-onboarding-tab="${esc(item.tab)}">${esc(item.action)}</button>`}</div>`).join('')}</div></div>`;
}

function staffDisplayName(user) {
  return cleanPersianText(user.name || `${user.firstName || ''} ${user.lastName || ''}`) || 'بدون نام';
}
function staffUserSearchText(user) {
  return [user.personnelCode, user.firstName, user.lastName, user.name, user.jobTitle, user.email, roleLabel(user.role)].map(x => cleanPersianText(faNum(x || '')).toLowerCase()).join(' ');
}
function sortStaffUsersByName(staffUsers = []) {
  return [...staffUsers].sort((a, b) => {
    const nameCompare = staffDisplayName(a).localeCompare(staffDisplayName(b), 'fa', { sensitivity: 'base' });
    if (nameCompare) return nameCompare;
    return String(a.personnelCode || '').localeCompare(String(b.personnelCode || ''), 'fa', { numeric: true });
  });
}
function renderStaffListOption(user) {
  const selected = selectedStaffListUserId === user.id;
  return `<button type="button" class="staff-list-option ${selected ? 'active' : ''}" data-select-staff-user="${esc(user.id)}" data-staff-search="${esc(staffUserSearchText(user))}" data-staff-print-name="${esc(staffDisplayName(user))}" data-staff-print-code="${esc(user.personnelCode || '')}" data-staff-print-role="${esc(roleLabel(user.role))}" data-staff-print-job="${esc(user.jobTitle || '')}" data-staff-print-email="${esc(user.email || '')}"><span><b>${esc(staffDisplayName(user))}</b><small>${esc(user.jobTitle || roleLabel(user.role))}</small></span><em dir="ltr">${esc(faNum(user.personnelCode || '—'))}</em></button>`;
}
function renderStaffUserManagementRow(user) {
  if (!user) return '';
  const isInactive = user.active === false;
  const fullName = staffDisplayName(user);
  const inviteDisabled = user.email ? '' : 'disabled title="برای ارسال دعوت، اول ایمیل را در پرونده ذخیره کنید"';
  return `<div class="personnel-modal-overlay staff-edit-modal-overlay" data-staff-edit-overlay><form class="panel personnel-modal-card staff-user-edit-modal staff-user-edit-form order-row" data-staff-user-id="${esc(user.id)}" role="dialog" aria-modal="true" aria-label="ویرایش پرسنل"><button type="button" class="modal-close-icon" data-close-staff-edit-modal aria-label="بستن">×</button><h2>ویرایش پرونده پرسنل</h2><p>تمام فیلدهای پرونده، دقیقاً مثل فرم افزودن پرسنل، از همین پاپ‌آپ قابل تغییر است.</p><div class="staff-user-edit-grid staff-profile-grid"><label>کد پرسنلی<input name="personnelCode" value="${esc(faNum(user.personnelCode || ''))}" inputmode="numeric" dir="ltr" autocomplete="off"></label><label>نام<input name="firstName" value="${esc(user.firstName || '')}"></label><label>نام خانوادگی<input name="lastName" value="${esc(user.lastName || '')}"></label><label>نام پدر<input name="fatherName" value="${esc(user.fatherName || '')}"></label><label>کد ملی<input name="nationalId" value="${esc(faNum(user.nationalId || ''))}" inputmode="numeric" dir="ltr" data-national-id placeholder="۰۰۹-۶۵۷۸۴۳-۵"></label><label>شماره همراه<input name="mobile" value="${esc(formatMobileInput(user.mobile || ''))}" inputmode="tel" dir="ltr" data-mobile autocomplete="tel" placeholder="۰۹۱۲-۳۳۳ ۱۲ ۱۲"></label><label><span class="field-label-inline">ایمیل <small class="field-optional">(اختیاری)</small></span><input name="email" value="${esc(user.email || '')}" type="email" dir="ltr" autocomplete="email" placeholder="staff@example.com"></label><label>سمت شغلی<input name="jobTitle" value="${esc(user.jobTitle || '')}"></label><label>حقوق هر ساعت${numInput('hourlyWage', user.hourlyWage || '')}</label><label>نقش دسترسی<select name="role"><option value="cashier" ${user.role === 'cashier' ? 'selected' : ''}>صندوق‌دار</option><option value="manager" ${user.role === 'manager' ? 'selected' : ''}>مدیر</option><option value="kitchen" ${user.role === 'kitchen' ? 'selected' : ''}>آشپزخانه</option><option value="inventory" ${user.role === 'inventory' ? 'selected' : ''}>انباردار</option><option value="accountant" ${user.role === 'accountant' ? 'selected' : ''}>حسابدار</option></select></label><label class="wide-field">آدرس محل سکونت<textarea name="address" rows="2">${esc(user.address || '')}</textarea></label></div><span class="staff-user-status">وضعیت پرونده: ${isInactive ? 'غیرفعال' : 'فعال'} — دسترسی سامانه: ${user.accessActive === false ? 'بدون پین فعال' : 'فعال'}</span><div class="row-action-buttons staff-user-actions"><button type="submit" class="primary">ذخیره پرونده</button><button type="button" class="secondary" data-toggle-staff="${esc(user.id)}">${isInactive ? 'فعال‌سازی' : 'غیرفعال‌سازی'}</button><button type="button" class="secondary" data-send-staff-invitation="${esc(user.id)}" ${inviteDisabled}>ارسال لینک دعوت</button>${actionDecalButton('delete', `data-delete-staff="${esc(user.id)}"`, 'staff-user-decal', 'حذف پرسنل')}</div><small>دعوت برای ${esc(fullName)} با کد ${esc(faNum(user.personnelCode || ''))} و سمت ${esc(user.jobTitle || roleLabel(user.role))} ارسال می‌شود.</small></form></div>`;
}

function nextPersonnelCode(staffUsers = state.staffUsers || []) {
  const usedCodes = new Set((staffUsers || state.staffUsers || []).map(user => Number(toEnglishDigits(user.personnelCode || '').replace(/\D/g, '')) || 0));
  let code = 1001;
  while (usedCodes.has(code)) code += 1;
  return String(code);
}
function renderStaffCreateModal(staffUsers) {
  if (!staffFormModalOpen) return '';
  const code = nextPersonnelCode(state.staffUsers || staffUsers);
  return `<div class="personnel-modal-overlay" data-personnel-modal-overlay><form class="panel personnel-modal-card staff-create-modal" id="staffForm" role="dialog" aria-modal="true" aria-label="افزودن پرسنل"><button type="button" class="modal-close-icon" data-close-staff-modal aria-label="بستن">×</button><h2>افزودن پرسنل</h2><p>این فرم پرونده پرسنلی و نقش دسترسی اولیه را می‌سازد؛ پین ورود را می‌توان جداگانه فعال کرد.</p><div class="staff-profile-grid"><label>کد پرسنلی خودکار<input name="personnelCode" value="${esc(faNum(code))}" inputmode="numeric" dir="ltr" autocomplete="off" readonly data-auto-personnel-code></label><label>نام<input name="firstName" value=""></label><label>نام خانوادگی<input name="lastName" value=""></label><label>نام پدر<input name="fatherName" value=""></label><label>کد ملی<input name="nationalId" value="" inputmode="numeric" dir="ltr" data-national-id placeholder="۰۰۹-۶۵۷۸۴۳-۵"></label><label>شماره همراه<input name="mobile" value="" inputmode="tel" dir="ltr" data-mobile autocomplete="tel" placeholder="۰۹۱۲-۳۳۳ ۱۲ ۱۲"></label><label><span class="field-label-inline">ایمیل <small class="field-optional">(اختیاری)</small></span><input name="email" value="" type="email" dir="ltr" autocomplete="email"></label><label>سمت شغلی<input name="jobTitle" value=""></label><label>حقوق هر ساعت${numInput('hourlyWage', '')}</label><label>نقش دسترسی<select name="role"><option value="cashier" selected>صندوق‌دار</option><option value="manager">مدیر</option><option value="kitchen">آشپزخانه</option><option value="inventory">انباردار</option><option value="accountant">حسابدار</option></select></label><label class="wide-field">آدرس محل سکونت<textarea name="address" rows="2"></textarea></label></div><button class="primary">ثبت پرونده پرسنلی</button></form></div>`;
}
function renderStaffListModal(staffUsers) {
  if (!staffListModalOpen) return '';
  const sortedStaff = sortStaffUsersByName(staffUsers);
  const selectedUser = sortedStaff.find(user => user.id === selectedStaffListUserId) || null;
  return `<div class="personnel-modal-overlay" data-personnel-modal-overlay><section class="panel personnel-modal-card staff-list-modal" role="dialog" aria-modal="true" aria-label="لیست پرسنل"><div class="print-actions"><button type="button" class="modal-close-icon" data-close-staff-list-modal aria-label="بستن">×</button>${actionDecalButton('print', 'data-print-staff-list', 'modal-print-decal', 'پرینت لیست پرسنل')}</div><h2>لیست پرسنل</h2><label class="staff-list-search">جستجوی پرسنل<input data-staff-list-search value="${esc(staffListSearchQuery)}" placeholder="با نام یا نام خانوادگی جستجو کنید"></label><div class="staff-user-list printable-staff-list" data-staff-user-list>${sortedStaff.map(renderStaffListOption).join('') || '<p>هنوز پرسنلی تعریف نشده است.</p>'}</div><p class="staff-list-empty" data-staff-list-empty hidden>پرسنلی با این جستجو پیدا نشد.</p></section>${renderStaffUserManagementRow(selectedUser)}</div>`;
}

function renderAttendanceModal() {
  if (!attendanceModalOpen) return '';
  return `<div class="personnel-modal-overlay attendance-modal-overlay" data-attendance-modal-overlay><section class="panel personnel-modal-card staff-attendance-modal" role="dialog" aria-modal="true" aria-label="ورود و خروج پرسنل"><button type="button" class="modal-close-icon" data-close-attendance-modal aria-label="بستن">×</button><h2>ورود و خروج پرسنل</h2><form id="staffAttendanceModalForm" class="staff-attendance-modal-form"><label>کد پرسنلی<input name="personnelCode" inputmode="numeric" dir="ltr" autocomplete="off" placeholder="مثلاً ۱۰۰۱" data-attendance-personnel-code></label><div class="attendance-schedule-preview" data-attendance-schedule-preview><span>کد پرسنلی را وارد کنید تا ساعت برنامه کاری امروز نمایش داده شود.</span></div><input type="hidden" name="attendancePendingAction" data-attendance-pending-action><div class="attendance-exception-choice" data-attendance-exception-choice hidden><b data-attendance-exception-title>ثبت خارج از برنامه</b><p data-attendance-exception-help></p><div class="attendance-exception-buttons"><button type="submit" class="secondary" name="attendanceExceptionMode" value="schedule" data-attendance-use-schedule>ثبت طبق برنامه</button><label>توضیح دلیل<textarea name="attendanceReason" rows="2" placeholder="دلیل را بنویسید"></textarea></label><button type="submit" class="primary" name="attendanceExceptionMode" value="reason" data-attendance-use-reason>ثبت با توضیح</button></div></div><div class="attendance-modal-actions" data-attendance-actions><button type="submit" class="primary" name="attendanceAction" value="in" data-attendance-clock-in hidden>ورود</button><button type="submit" class="secondary" name="attendanceAction" value="out" data-attendance-clock-out hidden>خروج</button></div></form></section></div>`;
}

function attendanceStaffByCode(customerId, code) {
  const normalized = toEnglishDigits(code || '').trim();
  if (!normalized) return null;
  return RestaurantCore.getStaffUsers(state, customerId).find(u => String(u.personnelCode || '') === normalized) || null;
}
function todayDateText() { return iranGregorianDateText(); }
function nowTimeText() { return iranClockTimeText(); }
function attendanceScheduleForStaff(customerId, staffUserId, dateText = todayDateText()) {
  const weekday = new Date(`${dateText}T12:00:00`).getDay();
  const schedules = RestaurantCore.getStaffSchedules ? RestaurantCore.getStaffSchedules(state, customerId, staffUserId) : [];
  return staffScheduleForCell(schedules, staffUserId, dateText, weekday);
}
function openAttendanceForStaff(customerId, staffUserId, dateText = todayDateText()) {
  const rows = RestaurantCore.getStaffAttendance ? RestaurantCore.getStaffAttendance(state, customerId) : [];
  return rows.find(r => r.staffUserId === staffUserId && r.date === dateText && !r.clockOutAt) || null;
}
function attendanceDisplayTime(row, field = 'clockInAt') {
  const fallback = (row?.[field] || '').slice(11, 16);
  // `createdAt` is the moment the clock-in record was first created. Never use it
  // for clock-out display, otherwise after خروج both ورود and خروج show the same time.
  if (field === 'clockInAt' && row?.source === 'personnel-code-popup' && row?.createdAt) return iranClockTimeText(new Date(row.createdAt));
  return fallback;
}
function setAttendanceModalActionState(openRecord, hasStaff = false) {
  const inButton = document.querySelector('[data-attendance-clock-in]');
  const outButton = document.querySelector('[data-attendance-clock-out]');
  if (!inButton || !outButton) return;
  inButton.hidden = !hasStaff || Boolean(openRecord);
  outButton.hidden = !hasStaff || !openRecord;
}
function visibleAttendanceAction() {
  return document.querySelector('[data-attendance-clock-out]:not([hidden])') ? 'out' : 'in';
}
function shiftMinutesText(timeText) {
  const [h, m] = String(toEnglishDigits(timeText || '')).split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}
function attendanceTimingException(action, schedule, timeText) {
  if (!schedule) return null;
  const now = shiftMinutesText(timeText);
  const start = shiftMinutesText(schedule.startTime);
  const end = shiftMinutesText(schedule.endTime);
  if (action === 'in' && now !== null && start !== null && now < start) return { type: 'early-in', scheduleTime: schedule.startTime, title: 'ورود زودتر از برنامه', help: `ساعت برنامه امروز ${faNum(schedule.startTime)} است. می‌توانید ورود را طبق برنامه ثبت کنید یا دلیل ورود زودتر را بنویسید.` };
  if (action === 'out' && now !== null && end !== null && now > end) return { type: 'late-out', scheduleTime: schedule.endTime, title: 'خروج دیرتر از برنامه', help: `ساعت پایان برنامه امروز ${faNum(schedule.endTime)} است. می‌توانید خروج را طبق برنامه ثبت کنید یا دلیل خروج دیرتر را بنویسید.` };
  return null;
}
function showAttendanceExceptionChoice(form, action, exception) {
  const panel = form.querySelector('[data-attendance-exception-choice]');
  if (!panel) return false;
  form.querySelector('[data-attendance-pending-action]').value = action;
  form.querySelector('[data-attendance-exception-title]').textContent = exception.title;
  form.querySelector('[data-attendance-exception-help]').textContent = exception.help;
  form.querySelector('[data-attendance-use-schedule]').textContent = action === 'in' ? 'ورود طبق برنامه' : 'خروج طبق برنامه';
  form.querySelector('[data-attendance-use-reason]').textContent = action === 'in' ? 'ثبت ورود با توضیح' : 'ثبت خروج با توضیح';
  panel.hidden = false;
  form.querySelector('[data-attendance-actions]').hidden = true;
  form.querySelector('[name="attendanceReason"]')?.focus();
  return false;
}
function updateAttendanceSchedulePreview(customerId) {
  const input = document.querySelector('[data-attendance-personnel-code]');
  const box = document.querySelector('[data-attendance-schedule-preview]');
  if (!input || !box) return;
  const staff = attendanceStaffByCode(customerId, input.value);
  if (!staff) { setAttendanceModalActionState(null, false); box.innerHTML = '<span>کد پرسنلی را وارد کنید تا ساعت برنامه کاری امروز نمایش داده شود.</span>'; return; }
  const dateText = todayDateText();
  const schedule = attendanceScheduleForStaff(customerId, staff.id, dateText);
  const open = openAttendanceForStaff(customerId, staff.id, dateText);
  setAttendanceModalActionState(open, true);
  box.innerHTML = `<b>${esc(staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`)}</b><span>برنامه امروز: ${schedule ? `${esc(faNum(schedule.startTime))} تا ${esc(faNum(schedule.endTime))}` : 'برای امروز برنامه‌ای ثبت نشده'}</span><small>${open ? `وضعیت: از ساعت ${esc(faNum(attendanceDisplayTime(open, 'clockInAt')))} وارد شده و هنوز خروج نزده است.` : 'وضعیت: آماده ثبت ورود است.'}</small>`;
}
function attendanceModalErrorMessage(err) {
  const msg = err?.message || '';
  if (msg === 'ATTENDANCE_ALREADY_OPEN') return 'برای این پرسنل امروز ورود باز ثبت شده است؛ برای پایان کار روی خروج بزنید.';
  if (msg === 'ATTENDANCE_NOT_FOUND') return 'برای این پرسنل ورود باز امروز پیدا نشد.';
  if (msg === 'ATTENDANCE_REASON_REQUIRED') return 'این ورود/خروج خارج از برنامه است و به عنوان مورد نیازمند تایید مدیر ثبت می‌شود.';
  if (msg === 'STAFF_NOT_FOUND') return 'کد پرسنلی پیدا نشد.';
  return msg || 'ثبت ورود/خروج انجام نشد.';
}
function handleAttendanceModalSubmit(form, customerId, action) {
  const f = new FormData(form);
  const submittedAction = action;
  action = f.get('attendancePendingAction') || action;
  const staff = attendanceStaffByCode(customerId, f.get('personnelCode'));
  if (!staff) throw new Error('STAFF_NOT_FOUND');
  const date = todayDateText();
  const actualTime = nowTimeText();
  const schedule = attendanceScheduleForStaff(customerId, staff.id, date);
  const exception = attendanceTimingException(action, schedule, actualTime);
  const exceptionMode = f.get('attendanceExceptionMode') || (submittedAction === 'schedule' || submittedAction === 'reason' ? submittedAction : '');
  if (exception && !exceptionMode) return showAttendanceExceptionChoice(form, action, exception);
  const time = exception && exceptionMode === 'schedule' ? exception.scheduleTime : actualTime;
  const reason = exception && exceptionMode === 'reason' ? cleanPersianText(f.get('attendanceReason') || '') : '';
  if (exception && exceptionMode === 'reason' && !reason) throw new Error('ATTENDANCE_REASON_REQUIRED');
  if (action === 'out') {
    const open = openAttendanceForStaff(customerId, staff.id, date);
    if (!open) throw new Error('ATTENDANCE_NOT_FOUND');
    return RestaurantCore.clockOutStaff(state, customerId, open.id, { time, reason, source: 'personnel-code-popup' });
  }
  return RestaurantCore.clockInStaff(state, customerId, { staffUserId: staff.id, date, time, reason, source: 'personnel-code-popup' });
}
function prepareStaffListPrintClone(clone) {
  clone.querySelector(':scope > p')?.remove();
  const list = clone.querySelector('.printable-staff-list');
  if (!list) return;
  const headers = ['کد پرسنلی','نام','نام خانوادگی','سمت شغلی','حقوق هر ساعت','نقش دسترسی','وضعیت پرونده','دسترسی سامانه'];
  const rows = [...list.querySelectorAll('.staff-list-option')].map(btn => [
    faNum(btn.dataset.staffPrintCode || ''),
    btn.dataset.staffPrintName || '',
    '',
    btn.dataset.staffPrintJob || '',
    '',
    btn.dataset.staffPrintRole || '',
    '',
    btn.dataset.staffPrintEmail || '',
  ]);
  list.innerHTML = rows.length ? `<table class="staff-list-print-table"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(faNum(cell || '—'))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>هنوز پرسنلی تعریف نشده است.</p>';
}
function prepareWeeklySchedulePrintClone(clone) {
  clone.querySelector(':scope > p')?.remove();
  clone.querySelector('.weekly-schedule-note')?.remove();
  clone.querySelectorAll('.schedule-clear-decal,.weekly-schedule-toolbar button').forEach(el => el.remove());
  clone.querySelectorAll('.shift-note-field').forEach(label => {
    const input = label.querySelector('[name="note"]');
    const note = cleanPersianText(input?.value || '');
    if (!note) { label.remove(); return; }
    label.innerHTML = '';
    const noteText = document.createElement('span');
    noteText.className = 'weekly-print-note';
    noteText.textContent = note;
    label.appendChild(noteText);
  });
}
function printPersonnelModal(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  const previousTitle = document.title;
  const previousPrintTarget = document.body.dataset.personnelPrintTarget || '';
  const printTarget = target.classList.contains('staff-list-modal') ? 'staff-list' : 'weekly-schedule';
  document.getElementById('personnelPrintRoot')?.remove();
  const printRoot = document.createElement('div');
  printRoot.id = 'personnelPrintRoot';
  printRoot.className = 'personnel-print-root';
  printRoot.dataset.personnelPrintTarget = printTarget;
  const clone = target.cloneNode(true);
  if (printTarget === 'weekly-schedule') prepareWeeklySchedulePrintClone(clone);
  if (printTarget === 'staff-list') prepareStaffListPrintClone(clone);
  printRoot.appendChild(clone);
  document.body.appendChild(printRoot);
  document.body.dataset.personnelPrintTarget = printTarget;
  document.body.classList.add('personnel-printing');
  document.title = '';
  window.print();
  setTimeout(() => {
    document.title = previousTitle;
    if (previousPrintTarget) document.body.dataset.personnelPrintTarget = previousPrintTarget;
    else delete document.body.dataset.personnelPrintTarget;
    document.body.classList.remove('personnel-printing');
    printRoot.remove();
  }, 300);
}

function weekdayLabel(day) { return ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'][Number(day || 0)] || 'روز'; }
function staffOptions(staffUsers, selected = '') { return staffUsers.map(u => `<option value="${esc(u.id)}" ${u.id === selected ? 'selected' : ''}>${esc(faNum(u.personnelCode || ''))} — ${esc(u.name || `${u.firstName || ''} ${u.lastName || ''}`)}</option>`).join(''); }
function attendanceStatusLabel(row) { return row.managerApproval === 'pending' ? 'در انتظار تایید مدیر' : row.managerApproval === 'rejected' ? 'رد شده' : 'تایید شده'; }
function attendanceStatusIcon(row) { return row.managerApproval === 'pending' ? '✕' : row.managerApproval === 'rejected' ? '✕' : '✓'; }
function attendanceExceptionParts(row) {
  return String(row?.exceptionType || '').split(/\s*\+\s*/).map(part => part.trim()).filter(Boolean);
}
function attendanceReasonParts(row) {
  return String(row?.reason || '').split(/\s*\/\s*/).map(part => part.trim()).filter(Boolean);
}
function attendanceManagementNoteLabel(type) {
  const text = String(type || '');
  if (text.includes('ورود زودتر')) return 'ورود زودتر';
  if (text.includes('خروج دیرتر')) return 'خروج دیرتر';
  return text;
}
function attendanceManagementNotes(row) {
  const exceptions = attendanceExceptionParts(row);
  if (!exceptions.length) return '';
  const reasons = attendanceReasonParts(row);
  return exceptions.map((type, index) => {
    const reason = reasons[index] || reasons[0] || '';
    const safeType = esc(attendanceManagementNoteLabel(type));
    const safeReason = reason ? esc(reason) : '';
    return `${safeType}${safeReason ? ` — توضیح: ${safeReason}` : ''}`;
  }).join('<br>');
}
function shiftMinutesValueFromRow(row, field) {
  return shiftMinutesText(attendanceDisplayTime(row, field));
}
function attendanceManagementRowClass(row, schedule) {
  if (row.managerApproval === 'pending') return 'pending-approval';
  const start = shiftMinutesText(schedule?.startTime || row.scheduledStart);
  const end = shiftMinutesText(schedule?.endTime || row.scheduledEnd);
  const clockIn = shiftMinutesValueFromRow(row, 'clockInAt');
  const clockOut = row.clockOutAt ? shiftMinutesValueFromRow(row, 'clockOutAt') : null;
  const noApprovalDeviation = (clockIn !== null && start !== null && clockIn > start) || (clockOut !== null && end !== null && clockOut < end);
  if (noApprovalDeviation && !attendanceExceptionParts(row).length) return 'schedule-deviation-no-approval';
  return row.managerApproval === 'rejected' ? 'rejected-approval' : 'approved-approval';
}
function dateTextToJalaliDate(dateText = todayDateText()) {
  const safe = String(dateText || todayDateText()).slice(0, 10);
  return fullJalaliDate(new Date(`${safe}T12:00:00`));
}
function scheduleForAttendanceRow(row, schedules = []) {
  const dateText = row?.date || todayDateText();
  const weekday = new Date(`${dateText}T12:00:00`).getDay();
  return staffScheduleForCell(schedules, row?.staffUserId || '', dateText, weekday) || { startTime: row?.scheduledStart || '', endTime: row?.scheduledEnd || '', note: '' };
}
function attendanceClockValue(row, field) {
  return field === 'clockOutAt' && !row?.clockOutAt ? '' : attendanceDisplayTime(row, field);
}
function renderAttendanceManagementRow(row, staffUsers = [], schedules = []) {
  const staffName = row.staffName || staffUsers.find(u => u.id === row.staffUserId)?.name || 'پرسنل';
  const schedule = scheduleForAttendanceRow(row, schedules);
  const note = attendanceManagementNotes(row);
  const rowClass = attendanceManagementRowClass(row, schedule);
  return `<tr class="attendance-row ${rowClass}" data-attendance-row="${esc(row.id)}"><td><b>${esc(staffName)}</b><small>${esc(faNum(staffUsers.find(u=>u.id===row.staffUserId)?.personnelCode || ''))}</small></td><td>${esc(faNum(dateTextToJalaliDate(row.date)))}</td><td>${esc(faNum(schedule?.startTime || row.scheduledStart || '--:--'))}</td><td>${esc(faNum(schedule?.endTime || row.scheduledEnd || '--:--'))}</td><td><input name="clockInTime" inputmode="numeric" data-shift-time value="${esc(faNum(attendanceClockValue(row, 'clockInAt')))}" placeholder="--:--"></td><td><input name="clockOutTime" inputmode="numeric" data-shift-time value="${esc(faNum(attendanceClockValue(row, 'clockOutAt')))}" placeholder="--:--"></td><td><div class="attendance-note-lines">${note || ''}</div></td><td><span class="badge attendance-status-icon" title="${esc(attendanceStatusLabel(row))}" aria-label="${esc(attendanceStatusLabel(row))}">${attendanceStatusIcon(row)}</span></td><td><div class="staff-attendance-row-actions">${row.managerApproval === 'pending' ? `<button class="primary" type="button" data-save-attendance-row="${esc(row.id)}">تایید</button>` : ''}<button class="danger-button" type="button" data-delete-attendance="${esc(row.id)}">حذف</button></div></td></tr>`;
}
function renderAttendanceManagementTable(attendanceRows) {
  return attendanceRows ? `<div class="attendance-management-scroll"><table class="attendance-management-table"><thead><tr><th>نام پرسنل</th><th>تاریخ</th><th>شروع طبق برنامه</th><th>پایان طبق برنامه</th><th>ساعت ورود</th><th>ساعت خروج</th><th>توضیحات</th><th>وضعیت</th><th>تایید</th></tr></thead><tbody>${attendanceRows}</tbody></table></div>` : '<p>هنوز ورود/خروجی ثبت نشده است.</p>';
}
function updateAttendanceRowFromManager(customerId, attendanceId, rowEl) {
  const row = (state.staffAttendance || []).find(r => r.id === attendanceId && r.customerId === customerId);
  if (!row) throw new Error('ATTENDANCE_NOT_FOUND');
  const clockIn = normalizeShiftTimeInput(rowEl.querySelector('[name="clockInTime"]')?.value || '');
  const clockOut = normalizeShiftTimeInput(rowEl.querySelector('[name="clockOutTime"]')?.value || '');
  if (clockIn) row.clockInAt = `${row.date}T${clockIn}:00`;
  row.clockOutAt = clockOut ? `${row.date}T${clockOut}:00` : '';
  RestaurantCore.approveStaffAttendance(state, customerId, attendanceId, true);
  row.reviewedAt = new Date().toISOString();
  row.reviewSource = 'manager-attendance-table';
  return row;
}


const PERSIAN_WEEK_DAYS = [
  { weekday: 6, label: 'شنبه' },
  { weekday: 0, label: 'یکشنبه' },
  { weekday: 1, label: 'دوشنبه' },
  { weekday: 2, label: 'سه‌شنبه' },
  { weekday: 3, label: 'چهارشنبه' },
  { weekday: 4, label: 'پنجشنبه' },
  { weekday: 5, label: 'جمعه' },
];
function isoDateOnly(date) { return date.toISOString().slice(0, 10); }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function persianWeekStart(offset = 0) {
  const today = new Date();
  const distanceFromSaturday = (today.getDay() + 1) % 7;
  const start = addDays(today, -distanceFromSaturday + (Number(offset || 0) * 7));
  start.setHours(12, 0, 0, 0);
  return start;
}
function compactJalaliDate(date) {
  const p = gregorianToJalaliParts(date);
  return `${p.month}/${p.day}`;
}
function fullJalaliDate(date) {
  const p = gregorianToJalaliParts(date);
  return `${p.year}/${p.month}/${p.day}`;
}
function staffScheduleForCell(schedules, staffUserId, dateText, weekday) {
  return schedules.find(s => s.staffUserId === staffUserId && s.date === dateText) || schedules.find(s => s.staffUserId === staffUserId && !s.date && Number(s.weekday) === Number(weekday)) || null;
}

function normalizeShiftTimeInput(value) {
  const raw = toEnglishDigits(value).trim();
  const colon = raw.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  let hh = 0, mm = 0;
  if (colon) { hh = Number(colon[1]); mm = Number(colon[2]); }
  else {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (!digits) return '';
    if (digits.length <= 2) { hh = Number(digits); mm = 0; }
    else if (digits.length === 3) { hh = Number(digits.slice(0, 1)); mm = Number(digits.slice(1)); }
    else { hh = Number(digits.slice(0, 2)); mm = Number(digits.slice(2)); }
  }
  hh = Math.min(23, Math.max(0, hh || 0));
  mm = Math.min(59, Math.max(0, mm || 0));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function weeklyScheduleDurationHours(startTime, endTime) {
  const start = normalizeShiftTimeInput(startTime || '');
  const end = normalizeShiftTimeInput(endTime || '');
  if (!start || !end) return 0;
  return Math.max(0, minutesFromTimeText(end) - minutesFromTimeText(start)) / 60;
}
function updateWeeklyScheduleRowTotalFromInputs(row) {
  if (!row) return;
  const totalEl = row.querySelector('[data-weekly-schedule-total]');
  if (!totalEl) return;
  const total = [...row.querySelectorAll('[data-weekly-schedule-form]')].reduce((sum, form) => {
    const start = form.querySelector('[name="startTime"]')?.value || '';
    const end = form.querySelector('[name="endTime"]')?.value || '';
    return sum + weeklyScheduleDurationHours(start, end);
  }, 0);
  totalEl.textContent = `${numberText(total,1)} ساعت`;
}
function saveWeeklyScheduleCell(form, customerId, { clear = false } = {}) {
  const f = new FormData(form);
  if (clear) {
    RestaurantCore.deleteStaffSchedule(state, customerId, { staffUserId: f.get('staffUserId'), date: f.get('date') });
    form.querySelector('[name="startTime"]').value = '';
    form.querySelector('[name="endTime"]').value = '';
    form.querySelector('[name="note"]').value = '';
    updateWeeklyScheduleRowTotalFromInputs(form.closest('tr'));
    saveState();
    form.classList.add('schedule-cell-saved'); setTimeout(() => form.classList.remove('schedule-cell-saved'), 700);
    return;
  }
  const start = normalizeShiftTimeInput(form.querySelector('[name="startTime"]')?.value || '');
  const end = normalizeShiftTimeInput(form.querySelector('[name="endTime"]')?.value || '');
  if (start) form.querySelector('[name="startTime"]').value = faNum(start);
  if (end) form.querySelector('[name="endTime"]').value = faNum(end);
  const note = cleanPersianText(f.get('note'));
  updateWeeklyScheduleRowTotalFromInputs(form.closest('tr'));
  if (!start || !end) return;
  RestaurantCore.createStaffSchedule(state, customerId, { staffUserId: f.get('staffUserId'), weekday: f.get('weekday'), date: f.get('date'), jalaliDate: f.get('jalaliDate'), startTime: start, endTime: end, note });
  saveState();
  form.classList.add('schedule-cell-saved'); setTimeout(() => form.classList.remove('schedule-cell-saved'), 700);
}
function renderWeeklyScheduleGrid(staffUsers, schedules) {
  const weekStart = persianWeekStart(scheduleWeekOffset);
  const days = PERSIAN_WEEK_DAYS.map((day, index) => ({ ...day, date: addDays(weekStart, index) }));
  const weekEnd = addDays(weekStart, 6);
  if (!staffUsers.length) return `<div class="weekly-schedule-empty">اول حداقل یک پرونده پرسنلی بسازید تا جدول برنامه کاری هفتگی نمایش داده شود.</div>`;
  const headerCells = days.map(day => `<th class="${day.weekday === 5 ? 'weekend-day' : ''}"><b>${day.label}</b><span>${faNum(compactJalaliDate(day.date))}</span></th>`).join('');
  const rows = staffUsers.map(staff => {
    const cells = days.map(day => {
      const dateText = isoDateOnly(day.date);
      const schedule = staffScheduleForCell(schedules, staff.id, dateText, day.weekday);
      return `<td><form class="weekly-schedule-cell-form" data-weekly-schedule-form><input type="hidden" name="staffUserId" value="${esc(staff.id)}"><input type="hidden" name="weekday" value="${day.weekday}"><input type="hidden" name="date" value="${dateText}"><input type="hidden" name="jalaliDate" value="${esc(fullJalaliDate(day.date))}"><label class="shift-start-field">شروع<input name="startTime" type="text" inputmode="numeric" autocomplete="off" data-shift-time placeholder="--:--" value="${esc(faNum(schedule?.startTime || ''))}"></label><label class="shift-end-field">پایان<input name="endTime" type="text" inputmode="numeric" autocomplete="off" data-shift-time placeholder="--:--" value="${esc(faNum(schedule?.endTime || ''))}"></label><button type="button" class="schedule-clear-decal" data-clear-weekly-schedule aria-label="پاک کردن شیفت" title="پاک کردن شیفت">×</button><label class="shift-note-field" aria-label="توضیح شیفت"><input name="note" value="${esc(schedule?.note || '')}" placeholder="توضیح شیفت"></label></form></td>`;
    }).join('');
    const total = schedules.filter(s => s.staffUserId === staff.id && s.active !== false && days.some(day => (s.date && s.date === isoDateOnly(day.date)) || (!s.date && Number(s.weekday) === Number(day.weekday)))).reduce((sum, s) => sum + Math.max(0, minutesFromTimeText(s.endTime) - minutesFromTimeText(s.startTime)) / 60, 0);
    return `<tr><th class="staff-schedule-name"><b>${esc(staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`)}</b><span>${esc(faNum(staff.personnelCode || ''))}</span><em data-weekly-schedule-total>${numberText(total,1)} ساعت</em></th>${cells}</tr>`;
  }).join('');
  return `<div class="weekly-schedule-board" data-weekly-schedule-board><div class="weekly-schedule-toolbar"><button type="button" class="secondary" data-schedule-week="prev">‹ هفته قبل</button><strong>برنامه کاری هفتگی — ${faNum(fullJalaliDate(weekStart))} تا ${faNum(fullJalaliDate(weekEnd))}</strong><div class="weekly-schedule-actions"><button type="button" class="secondary" data-schedule-week="next">هفته بعد ›</button>${actionDecalButton('print', 'data-print-weekly-schedule', 'weekly-schedule-print-decal', 'پرینت برنامه کاری')}</div></div><div class="weekly-schedule-scroll"><table class="weekly-schedule-table"><thead><tr><th class="staff-schedule-name">نام پرسنل</th>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div><small class="weekly-schedule-note">روزها از راست با شنبه شروع می‌شود و تاریخ‌ها شمسی هستند. پرسنل همین جدول هفتگی را در اپ پرسنلی خود می‌بیند.</small></div>`;
}
function minutesFromTimeText(timeText) { const [h,m] = String(timeText || '00:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); }

function renderPersonnel(customer) {
  const staffUsers = RestaurantCore.getStaffUsers(state, customer.id);
  const staffInvitations = RestaurantCore.getStaffInvitations ? RestaurantCore.getStaffInvitations(state, customer.id) : [];
  const passwordResets = RestaurantCore.getPasswordResetRequests ? RestaurantCore.getPasswordResetRequests(state, customer.id) : [];
  const schedules = RestaurantCore.getStaffSchedules ? RestaurantCore.getStaffSchedules(state, customer.id) : [];
  const attendance = RestaurantCore.getStaffAttendance ? RestaurantCore.getStaffAttendance(state, customer.id) : [];
  const payroll = RestaurantCore.calculateStaffPayroll ? RestaurantCore.calculateStaffPayroll(state, customer.id) : [];
  const fp = RestaurantCore.getFingerprintDeviceContract ? RestaurantCore.getFingerprintDeviceContract() : null;
  const openAttendance = attendance.filter(r => !r.clockOutAt);
  const attendanceRows = attendance.map(r => renderAttendanceManagementRow(r, staffUsers, schedules)).join('');
  const payrollRows = payroll.map(p => `<div class="order-row"><b>${esc(p.staffName)}</b><span>${numberText(p.hours,2)} ساعت × ${money(p.hourlyWage)} = ${money(p.wage)}</span></div>`).join('');
  return `<section class="workspace personnel-workspace"><div class="panel wide personnel-hero"><div class="section-title"><h2>پرسنلی</h2><span class="badge">پرونده پرسنلی، دسترسی، حضور و غیاب، حقوق</span></div><p>هر نیرو اول یک پرونده پرسنلی دارد؛ دسترسی ورود، پین، برنامه کاری، ثبت ورود/خروج و محاسبه حقوق روی همان پرونده انجام می‌شود.</p><div class="cards personnel-model-cards"><div><b>پرونده پرسنلی</b><span>کد پرسنلی، مشخصات هویتی، سمت و حقوق ساعتی</span></div><div><b>دسترسی سامانه</b><span>پرسنل را انتخاب کنید و جداگانه پین/نقش ورود بدهید</span></div><div><b>حضور و حقوق</b><span>ورود/خروج طبق برنامه؛ موارد خارج از برنامه قبل از محاسبه باید تایید مدیر شوند</span></div></div></div>
    <div class="panel personnel-actions-panel"><h2>مدیریت پرسنل</h2><p>افزودن و لیست پرسنل از اینجا به صورت پاپ‌آپ باز می‌شود؛ ورود و خروج پرسنل از دکمه تصویری کنار نام رستوران در بالای صفحه انجام می‌شود.</p><div class="personnel-action-buttons"><button type="button" class="primary" data-open-staff-modal>افزودن پرسنل</button><button type="button" class="secondary" data-open-staff-list-modal>لیست پرسنل</button></div></div>${renderStaffCreateModal(staffUsers)}${renderStaffListModal(staffUsers)}
    <form class="panel" id="staffAccessForm"><h2>ایجاد پین و دسترسی ورود</h2><p>برای ورود به سامانه، اول پرسنل را انتخاب کنید؛ سپس نقش و پین را جداگانه فعال کنید.</p><label>انتخاب پرسنل<select name="staffUserId">${staffOptions(staffUsers)}</select></label><label>پین ورود سریع<input name="pin" value="۱۲۳۴" type="password" inputmode="numeric"></label><label>نقش دسترسی<select name="role"><option value="cashier">صندوق‌دار</option><option value="manager">مدیر</option><option value="kitchen">آشپزخانه</option><option value="inventory">انباردار</option><option value="accountant">حسابدار</option></select></label><button class="primary">فعال‌سازی دسترسی</button></form>
    <div class="panel wide staff-schedule-weekly-panel"><h2>برنامه کاری هفتگی</h2><p>این بخش باید مثل تقویم واقعی رستوران کار کند: لیست پرسنل در ردیف‌ها، روزهای هفته شمسی در ستون‌ها، و امکان جابه‌جایی بین هفته‌ها. هر سلول ساعت شروع و پایان شیفت همان روز را ذخیره می‌کند.</p>${renderWeeklyScheduleGrid(staffUsers, schedules)}</div>
    <div class="panel staff-attendance-kiosk-panel"><h2>ثبت ورود/خروج</h2><p>برای ثبت ورود یا پایان کار، دکمه «ورود/خروج پرسنل» را بزنید؛ پاپ‌آپ کد پرسنلی را می‌گیرد، ساعت برنامه کاری همان پرسنل را نشان می‌دهد و سپس دکمه ورود یا خروج ثبت می‌کند.</p><button type="button" class="primary" data-open-attendance-modal>باز کردن پاپ‌آپ ورود/خروج</button></div>
    <div class="panel"><h2>اثر انگشت و اسکنر اکسترنال</h2><p>ثبت ورود/خروج باید بتواند از اسکنر کوچک اکسترنال انجام شود. در نسخه واقعی، Bridge دستگاه فقط نتیجه تایید و شناسه template را می‌فرستد؛ اثر خام ذخیره نمی‌شود.</p><div class="cards"><div><b>نوع اتصال</b><span>${esc(fp?.mode || 'external-usb-scanner')}</span></div><div><b>رویدادها</b><span>ثبت اثر، ورود، خروج</span></div><div><b>نیاز فنی</b><span>deviceId + staffUserId + verification result</span></div></div></div>
    <div class="panel wide attendance-management-panel"><h2>ورود و خروج پرسنل</h2><p>مدیر می‌تواند ساعت ورود/خروج را با ساعت برنامه یکی کند و بعد تایید بزند.</p>${renderAttendanceManagementTable(attendanceRows)}</div>
    <div class="panel wide"><h2>محاسبه حقوق و دستمزد</h2><p>فقط رکوردهای کامل و تاییدشده در حقوق محاسبه می‌شوند؛ رکوردهای خارج از برنامه تا تایید مدیر وارد محاسبه نمی‌شوند.</p>${payrollRows || '<p>هنوز ساعت تاییدشده‌ای برای محاسبه وجود ندارد.</p>'}</div>
    <form class="panel" id="passwordResetForm"><h2>بازیابی رمز عبور</h2><p>برای حساب‌های ایمیلی، کد زمان‌دار ساخته می‌شود و پس از تغییر رمز، نشست‌های قبلی همان کاربر پاک می‌شود.</p><label>ایمیل حساب<input name="email" value="${esc(customer.email)}" type="email" dir="ltr" autocomplete="email"></label><button class="primary">ساخت کد بازیابی</button></form>
    <div class="panel wide"><h2>وضعیت بازیابی رمز</h2>${passwordResets.map(reset=>`<div class="order-row password-reset-row"><b>${esc(reset.email)}</b><span>وضعیت: ${esc(resetStatusLabel(reset.status))} — پایان اعتبار: ${formatDate(reset.expiresAt)}${reset.status === 'pending' ? ' — کد فعال است' : ''}${reset.invalidatedSessions ? ` — نشست‌های پاک‌شده: ${numberText(reset.invalidatedSessions,0)}` : ''}</span></div>`).join('') || '<p>درخواستی ثبت نشده است.</p>'}</div>
    <div class="panel wide staff-invitations-panel"><h2>دعوت‌های کارکنان</h2>${staffInvitations.map(inv=>`<div class="order-row invitation-row"><div class="invitation-person"><b>${esc(inv.name)}</b><span>نقش: ${esc(roleLabel(inv.role))} — ایمیل: ${esc(inv.email)} — وضعیت: ${esc(invitationStatusLabel(inv.status))} — پایان اعتبار: ${formatDate(inv.expiresAt)}</span></div>${inv.status === 'pending' ? `<div class="invitation-controls"><code dir="ltr" class="invitation-link">${esc(staffInvitationLink(inv))}</code><div class="invitation-buttons"><button type="button" class="secondary" data-copy-invitation-link="${esc(staffInvitationLink(inv))}">کپی لینک دعوت</button><button type="button" class="danger-button" data-cancel-invitation="${inv.id}">لغو دعوت</button></div></div>` : ''}</div>`).join('') || '<p>دعوتی ثبت نشده است.</p>'}</div>
  </section>`;
}

function renderAccount(customer) {
  const modules = RestaurantCore.getEnabledModules(state, customer.id).map(m=>`<div><b>${esc(moduleLabel(m))}</b><span>فعال</span></div>`).join('');
  return `<section class="workspace settings-workspace">
    <form class="panel wide owner-profile-panel" id="ownerProfileForm"><h2>مشخصات رستوران/کافه و مالک</h2><p>مالک می‌تواند اطلاعات اصلی حساب و نامی که در هدر سامانه و منوی عمومی نمایش داده می‌شود را تغییر دهد.</p><div class="owner-profile-grid"><label>نام رستوران/کافه<input name="businessName" value="${esc(customer.businessName || '')}"></label><label>نام مالک<input name="ownerName" value="${esc(customer.ownerName || '')}"></label><label>شماره تلفن مالک<input name="phone" value="${esc(faNum(customer.phone || ''))}" inputmode="tel" dir="ltr"></label><label>ایمیل مالک<input name="email" value="${esc(customer.email || '')}" type="email" dir="ltr" autocomplete="email"></label><label>نام پکیج/اشتراک<input value="${esc(customer.packageName || 'Full OS')}" readonly></label><label>تاریخ ساخت حساب<input value="${esc(formatDate(customer.createdAt || ''))}" readonly></label></div><button class="primary">ذخیره تغییرات</button></form>
    <form class="panel owner-password-panel" id="ownerPasswordForm"><h2>تغییر رمز عبور مالک</h2><p>برای امنیت، رمز فعلی لازم است و بعد از تغییر رمز نشست‌های قبلی مالک پاک می‌شود.</p><label>رمز فعلی<input name="currentPassword" type="password" autocomplete="current-password"></label><label>رمز جدید<input name="newPassword" type="password" autocomplete="new-password"></label><label>تکرار رمز جدید<input name="confirmPassword" type="password" autocomplete="new-password"></label><button class="primary">تغییر رمز عبور</button></form>
    <div class="panel"><h2>پشتیبان‌گیری و بازیابی</h2><p>از داده‌های همین رستوران فایل پشتیبان بگیرید یا در صورت نیاز فایل پشتیبان را بازیابی کنید.</p><div class="button-row"><button type="button" class="secondary" id="backupExport">دریافت فایل پشتیبان</button><input id="backupImportInput" type="file" accept="application/json" hidden><button type="button" class="secondary" id="backupImport">بازیابی از فایل پشتیبان</button><button type="button" class="secondary" id="sampleDataExport">دریافت فایل داده نمونه</button><button type="button" class="danger-button" id="sampleDataReset">بازنشانی به داده نمونه پاک</button></div><small>بازنشانی، داده‌های فعلی همین مرورگر را با داده نمونه پاک جایگزین می‌کند؛ قبل از آن فایل پشتیبان بگیرید.</small>${backupMessage ? `<p class="success-message">${esc(backupMessage)}</p>` : ''}</div>
    <div class="panel wide"><h2>ماژول‌های فعال</h2><div class="cards">${modules}</div></div>
  </section>`;
}


function renderPurchaseInvoiceLineRow(inv, number, line = {}) {
  const name = cleanPersianText(line.name || '');
  const qty = line.qty ?? '';
  const unit = line.unit || 'عدد';
  const unitCost = line.unitCost ?? '';
  return `<div class="purchase-invoice-row" data-purchase-invoice-row>
    <div class="ingredient-number">${numberText(number,0)}</div>
    <label class="invoice-name-field">نام آیتم<input name="invoiceName" value="${esc(name)}" data-invoice-item-name autocomplete="off"><div class="invoice-autocomplete" data-invoice-autocomplete hidden></div></label>
    <label class="invoice-qty-field">مقدار${numInput('invoiceQty', qty)}</label>
    <label class="invoice-unit-field">واحد${unitSelect('invoiceUnit', unit, ['کیلوگرم','گرم','لیتر','میلی‌لیتر','عدد'])}</label>
    <label class="invoice-price-field">قیمت${numInput('invoiceUnitCost', unitCost)}</label>
    ${actionDecalButton('delete', 'data-remove-invoice-line', 'invoice-line-remove-button')}
  </div>`;
}

function renderPurchaseInvoicePanel(customer) {
  const invoices = RestaurantCore.getPurchaseInvoices ? RestaurantCore.getPurchaseInvoices(state, customer.id) : byCustomer(state.purchaseInvoices || []).slice().reverse();
  const editingInvoice = invoices.find(invoice => invoice.id === editingPurchaseInvoiceId);
  const rows = editingInvoice ? editingInvoice.lines.map((line, idx) => renderPurchaseInvoiceLineRow([], idx + 1, line)).join('') : '';
  const paymentStatusSelected = value => (editingInvoice?.paymentStatus || 'unpaid') === value ? 'selected' : '';
  const renderInvoiceRow = inv => `<div class="purchase-invoice-registered-row purchase-invoice-compact-row ${inv.paymentStatus === 'paid' ? 'purchase-invoice-paid-row' : 'purchase-invoice-unpaid-row'}"><div class="purchase-invoice-compact-meta"><span><b>تاریخ سند</b>${esc(inv.documentDate || inv.invoiceDate || 'ثبت نشده')}</span><span><b>شماره سند</b>${esc(faNum(inv.documentNumber || 'بدون شماره'))}</span><span><b>مبلغ</b>${money(inv.totalCost || 0)}</span></div><div class="purchase-invoice-compact-actions">${inv.paymentStatus !== 'paid' ? `<button type="button" class="secondary purchase-invoice-pay-button" data-pay-purchase-invoice="${inv.id}">ثبت پرداخت</button>` : ''}${actionDecalButton('edit', `data-edit-purchase-invoice="${inv.id}"`, 'purchase-invoice-row-decal', 'ویرایش فاکتور خرید')}${actionDecalButton('delete', `data-delete-purchase-invoice="${inv.id}"`, 'purchase-invoice-row-decal', 'حذف فاکتور خرید')}<button type="button" class="recipe-decal-button action-decal-button purchase-invoice-row-decal" data-view-purchase-invoice="${inv.id}" data-tooltip="نمایش جزئیات سند" aria-label="نمایش جزئیات سند" title="نمایش جزئیات سند">${actionIcon('details')}</button></div></div>`;
  const unpaidInvoices = invoices.filter(inv => inv.paymentStatus !== 'paid');
  const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'paid');
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.totalCost || 0), 0);
  const paidTotal = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalCost || 0), 0);
  const invoiceList = `<div class="panel wide purchase-invoice-list"><h2>فاکتورهای خرید ثبت‌شده</h2><div class="purchase-invoice-split"><section class="purchase-invoice-status-column purchase-invoice-unpaid-column"><div class="section-title purchase-invoice-status-title"><h3>پرداخت‌نشده</h3><span class="badge">جمع: ${money(unpaidTotal)}</span></div><div class="purchase-invoice-column-body">${unpaidInvoices.map(renderInvoiceRow).join('') || '<p>فاکتور خرید پرداخت‌نشده‌ای ثبت نشده است.</p>'}</div></section><section class="purchase-invoice-status-column purchase-invoice-paid-column"><div class="section-title purchase-invoice-status-title"><h3>پرداخت‌شده</h3><span class="badge">جمع: ${money(paidTotal)}</span></div><div class="purchase-invoice-column-body">${paidInvoices.map(renderInvoiceRow).join('') || '<p>فاکتور خرید پرداخت‌شده‌ای ثبت نشده است.</p>'}</div></section></div></div>`;
  return `<form class="panel wide purchase-invoice-panel" id="purchaseInvoiceForm"><h2>${editingInvoice ? 'ویرایش فاکتور خرید' : 'ثبت فاکتور خرید'}</h2><p>آیتم‌های فاکتور خرید را چندردیفی ثبت کن؛ اگر ماده‌ای در انبار نباشد ساخته می‌شود و قیمت پایه فقط اگر بالاتر باشد افزایش می‌یابد.</p><input type="hidden" name="editingInvoiceId" value="${esc(editingInvoice?.id || '')}"><div class="purchase-invoice-field-grid"><div class="invoice-field-date">${jalaliDateInput('documentDate', 'تاریخ سند', editingInvoice?.documentDate || editingInvoice?.invoiceDate || '')}</div><label class="invoice-field-document-number">شماره سند<input name="documentNumber" value="${esc(editingInvoice?.documentNumber || '')}" placeholder="مثلاً ۱۲۳"></label><label class="invoice-field-title">عنوان فاکتور<input name="title" value="${esc(editingInvoice?.title || 'فاکتور خرید مواد اولیه')}"></label><label class="invoice-field-supplier">تأمین‌کننده<input name="supplier" value="${esc(editingInvoice?.supplier || '')}"></label><label class="invoice-field-amount">مبلغ فاکتور${numInput('amount', editingInvoice?.totalCost || '', 'data-auto-invoice-amount')}</label><label class="invoice-field-status">وضعیت پرداخت<select name="paymentStatus"><option value="unpaid" ${paymentStatusSelected('unpaid')}>پرداخت‌نشده</option><option value="paid" ${paymentStatusSelected('paid')}>تسویه‌شده</option></select></label><label class="invoice-field-payment-method">روش پرداخت<select name="paymentMethod" data-payment-method>${paymentMethodOptions(editingInvoice?.paymentMethod || 'بانکی')}</select></label><label class="invoice-field-account">حساب پرداخت‌کننده<select name="accountId">${financialAccountOptions(customer.id, editingInvoice?.accountId || '')}</select></label><label class="invoice-field-cheque-number">شماره چک<input name="chequeNumber" value="${esc(editingInvoice?.chequeNumber || '')}" placeholder="فقط برای پرداخت چکی"></label><div class="invoice-field-cheque-date">${jalaliDateInput('chequeDueDate', 'تاریخ سررسید چک', editingInvoice?.chequeDueDate || jalaliDateText())}</div></div><div id="purchaseInvoiceRows" class="${rows ? '' : 'purchase-invoice-empty'}">${rows || '<small>هنوز آیتمی اضافه نشده؛ ثبت فاکتور بدون آیتم مجاز است و با «افزودن آیتم» ردیف انبار بساز.</small>'}</div><button type="button" class="secondary" data-add-invoice-line>+ افزودن آیتم</button><button class="primary">${editingInvoice ? 'ذخیره ویرایش فاکتور خرید' : 'ثبت فاکتور خرید'}</button>${editingInvoice ? '<button type="button" class="secondary" data-cancel-purchase-invoice-edit>انصراف از ویرایش</button>' : ''}<small>اثر حسابداری: خرید مستقیم به سود و زیان نمی‌رود؛ فقط وقتی تسویه شد به عنوان پرداخت تأمین‌کننده ثبت می‌شود. نام آیتم را شروع به تایپ کن تا آیتم‌های موجود انبار پیشنهاد شوند و واحد/قیمت خودکار پر شود.</small></form>${invoiceList}`;
}
function findInventoryByInvoiceName(customerId, name) {
  const query = cleanPersianText(name || '');
  if (!query) return null;
  const inv = byCustomer(state.inventory);
  return inv.find(item => cleanPersianText(item.name) === query) || inv.find(item => cleanPersianText(item.name).includes(query)) || null;
}

function invoiceInventoryMatches(customerId, value) {
  const query = cleanPersianText(value || '');
  if (!query) return [];
  return byCustomer(state.inventory)
    .filter(item => cleanPersianText(item.name).includes(query))
    .sort((a,b) => cleanPersianText(a.name).localeCompare(cleanPersianText(b.name), 'fa-IR'))
    .slice(0, 8);
}

function fillInvoiceRowFromInventory(row, customerId) {
  const nameInput = row.querySelector('[data-invoice-item-name]');
  const item = findInventoryByInvoiceName(customerId, nameInput?.value);
  if (!item) return null;
  const unitSelectEl = row.querySelector('select[name="invoiceUnit"]');
  const unitCostInput = row.querySelector('input[name="invoiceUnitCost"]');
  if (unitSelectEl) unitSelectEl.value = item.unit;
  if (unitCostInput) unitCostInput.value = faNum(item.unitCost || 0);
  updatePurchaseInvoiceAmountFromRows(row.closest('#purchaseInvoiceForm'));
  return item;
}

function renderInvoiceAutocomplete(row, customerId) {
  const nameInput = row.querySelector('[data-invoice-item-name]');
  const box = row.querySelector('[data-invoice-autocomplete]');
  if (!nameInput || !box) return;
  const matches = invoiceInventoryMatches(customerId, nameInput.value);
  box.innerHTML = matches.map(item => `<button type="button" data-invoice-suggestion="${esc(cleanPersianText(item.name))}">${esc(cleanPersianText(item.name))}<small>${esc(unitLabel(item.unit))} — ${money(item.unitCost || 0)}</small></button>`).join('');
  box.hidden = !matches.length;
  box.querySelectorAll('[data-invoice-suggestion]').forEach(btn => btn.addEventListener('click', () => {
    nameInput.value = btn.dataset.invoiceSuggestion || '';
    fillInvoiceRowFromInventory(row, customerId);
    updatePurchaseInvoiceAmountFromRows(row.closest('#purchaseInvoiceForm'));
    box.hidden = true;
  }));
}

function updatePurchaseInvoiceAmountFromRows(form) {
  if (!form) return;
  const amountInput = form.querySelector('[data-auto-invoice-amount]');
  if (!amountInput) return;
  const lines = collectPurchaseInvoiceLines(form);
  const hasRows = lines.length > 0;
  amountInput.readOnly = hasRows;
  amountInput.setAttribute('aria-readonly', hasRows ? 'true' : 'false');
  amountInput.classList.toggle('invoice-auto-amount', hasRows);
  if (!hasRows) return;
  const total = lines.reduce((sum, line) => sum + (Number(line.qty || 0) * Number(line.unitCost || 0)), 0);
  amountInput.value = numberText(Math.round(total), 0);
}

function refreshPurchaseInvoiceEmptyState(form) {
  const rows = form.querySelector('#purchaseInvoiceRows');
  if (!rows) return;
  const invoiceRows = [...rows.querySelectorAll('[data-purchase-invoice-row]')];
  invoiceRows.forEach((row, index) => { const num = row.querySelector('.ingredient-number'); if (num) num.textContent = numberText(index + 1, 0); });
  if (!invoiceRows.length) {
    rows.classList.add('purchase-invoice-empty');
    rows.innerHTML = '<small>ثبت فاکتور بدون آیتم هم مجاز است؛ برای ثبت مواد انبار «افزودن آیتم» را بزن.</small>';
  }
  updatePurchaseInvoiceAmountFromRows(form);
}

function bindPurchaseInvoiceRows(form, customerId) {
  if (!form.dataset.invoiceAutoTotalBound) {
    form.dataset.invoiceAutoTotalBound = '1';
    const refreshInvoiceTotalSoon = (event) => {
      if (!event.target.closest?.('[data-purchase-invoice-row]')) return;
      setTimeout(() => updatePurchaseInvoiceAmountFromRows(form), 0);
    };
    form.addEventListener('input', refreshInvoiceTotalSoon);
    form.addEventListener('change', refreshInvoiceTotalSoon);
  }
  form.querySelectorAll('[data-purchase-invoice-row]').forEach(row => {
    const nameInput = row.querySelector('[data-invoice-item-name]');
    if (nameInput && !nameInput.dataset.invoiceBound) {
      nameInput.dataset.invoiceBound = '1';
      nameInput.addEventListener('input', () => { renderInvoiceAutocomplete(row, customerId); fillInvoiceRowFromInventory(row, customerId); updatePurchaseInvoiceAmountFromRows(form); });
      nameInput.addEventListener('focus', () => { renderInvoiceAutocomplete(row, customerId); updatePurchaseInvoiceAmountFromRows(form); });
      nameInput.addEventListener('change', () => { fillInvoiceRowFromInventory(row, customerId); renderInvoiceAutocomplete(row, customerId); updatePurchaseInvoiceAmountFromRows(form); });
    }
    row.querySelectorAll('input[name="invoiceQty"], input[name="invoiceUnitCost"], select[name="invoiceUnit"]').forEach(field => {
      if (field.dataset.invoiceAmountBound) return;
      field.dataset.invoiceAmountBound = '1';
      field.addEventListener('input', () => updatePurchaseInvoiceAmountFromRows(form));
      field.addEventListener('change', () => updatePurchaseInvoiceAmountFromRows(form));
    });
    const remove = row.querySelector('[data-remove-invoice-line]');
    if (remove && !remove.dataset.invoiceRemoveBound) {
      remove.dataset.invoiceRemoveBound = '1';
      remove.addEventListener('click', () => {
        row.remove();
        refreshPurchaseInvoiceEmptyState(form);
      });
    }
  });
}

function collectPurchaseInvoiceLines(form) {
  return [...form.querySelectorAll('[data-purchase-invoice-row]')]
    .map(row => ({
      name: row.querySelector('[data-invoice-item-name]')?.value || '',
      qty: parseFaNumber(row.querySelector('input[name="invoiceQty"]')?.value || 0),
      unit: row.querySelector('select[name="invoiceUnit"]')?.value || 'عدد',
      unitCost: parseFaNumber(row.querySelector('input[name="invoiceUnitCost"]')?.value || 0),
    }))
    .filter(line => String(line.name || '').trim() && line.qty > 0);
}

function collectPurchaseInvoiceDraftRows(form) {
  return [...form.querySelectorAll('[data-purchase-invoice-row]')]
    .map(row => ({
      name: cleanPersianText(row.querySelector('[data-invoice-item-name]')?.value || ''),
      qty: parseFaNumber(row.querySelector('input[name="invoiceQty"]')?.value || 0),
      unitCost: parseFaNumber(row.querySelector('input[name="invoiceUnitCost"]')?.value || 0),
    }))
    .filter(line => line.name || line.qty > 0 || line.unitCost > 0);
}

function decodePdfLiteralString(value) {
  const unescapePdf = (ch) => {
    if (ch === 'n') return '\n';
    if (ch === 'r') return '\r';
    if (ch === 't') return '\t';
    if (ch === 'b') return '\b';
    if (ch === 'f') return '\f';
    return ch;
  };
  return String(value || '')
    .replace(new RegExp('\\\\([nrtbf()\\\\])', 'g'), (_, ch) => unescapePdf(ch))
    .replace(new RegExp('\\\\([0-7]{1,3})', 'g'), (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodePdfHexString(hex) {
  const clean = String(hex || '').replace(/[^0-9A-Fa-f]/g, '');
  if (!clean) return '';
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2).padEnd(2, '0'), 16));
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    let out = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) + bytes[i + 1]);
    return out;
  }
  return bytes.map(b => String.fromCharCode(b)).join('');
}

function extractTextFromPdfBytes(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer || []);
  let raw = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) raw += String.fromCharCode(...bytes.slice(i, i + chunk));
  const parts = [];
  raw.replace(/\((?:\\.|[^\\)]){2,}\)\s*Tj/g, (match) => { parts.push(decodePdfLiteralString(match.slice(1, match.lastIndexOf(')')))); return match; });
  raw.replace(/<([0-9A-Fa-f\s]{4,})>\s*Tj/g, (_, hex) => { parts.push(decodePdfHexString(hex)); return _; });
  raw.replace(/\[(.*?)\]\s*TJ/gs, (_, body) => {
    body.replace(/\((?:\\.|[^\\)]){1,}\)|<([0-9A-Fa-f\s]{4,})>/g, (token, hex) => {
      parts.push(hex ? decodePdfHexString(hex) : decodePdfLiteralString(token.slice(1, -1)));
      return token;
    });
    return _;
  });
  return parts.join('\n').replace(/[\u0000-\u001F]+/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}

async function extractTextFromPdfBytesAsync(arrayBuffer) {
  if (window.pdfjsLib?.getDocument) {
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const lines = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const byLine = new Map();
      content.items.forEach(item => {
        const text = String(item.str || '').trim();
        if (!text) return;
        const y = Math.round(item.transform?.[5] || 0);
        const x = item.transform?.[4] || 0;
        if (!byLine.has(y)) byLine.set(y, []);
        byLine.get(y).push({ x, text });
      });
      [...byLine.entries()].sort((a, b) => b[0] - a[0]).forEach(([, cells]) => {
        const row = cells.sort((a, b) => a.x - b.x).map(cell => cell.text).join(',');
        if (row.trim()) lines.push(row);
      });
    }
    const extracted = lines.join('\n').trim();
    if (extracted) return extracted;
  }
  return extractTextFromPdfBytes(arrayBuffer);
}

function normalizeInvoiceUnit(value) {
  const text = String(value || '').trim();
  if (/میلی|ml/i.test(text)) return 'میلی‌لیتر';
  if (/گرم|gr|g/i.test(text) && !/کیلو/.test(text)) return 'گرم';
  if (/لیتر|l/i.test(text)) return 'لیتر';
  if (/کیلو|kg/i.test(text)) return 'کیلوگرم';
  if (/عدد|دانه|pcs?/i.test(text)) return 'عدد';
  return text || 'عدد';
}

function parsePurchaseInvoiceTextRows(text) {
  return String(text || '').split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !/^(نام|شرح|ردیف|فاکتور|جمع|مبلغ)/.test(line))
    .map(line => {
      const cells = line.split(/[,	؛;|،]+/).map(x => x.trim()).filter(Boolean);
      if (cells.length >= 4) return { name: cells[0], qty: parseFaNumber(cells[1]), unit: normalizeInvoiceUnit(cells[2]), unitCost: parseFaNumber(cells[3]) };
      const match = line.match(/^(.+?)\s+([\d۰-۹٠-٩.,٫]+)\s*(کیلوگرم|کیلو|لیتر|میلی‌لیتر|میلی لیتر|گرم|عدد|دانه)\s+([\d۰-۹٠-٩.,٫]+)/);
      if (!match) return null;
      return { name: match[1].trim(), qty: parseFaNumber(match[2]), unit: normalizeInvoiceUnit(match[3]), unitCost: parseFaNumber(match[4]) };
    })
    .filter(line => line && line.name && line.qty > 0 && line.unitCost > 0);
}

function fillPurchaseInvoiceRowsFromText(form, customerId, text) {
  const lines = parsePurchaseInvoiceTextRows(text);
  if (!lines.length) return 0;
  const rows = form.querySelector('#purchaseInvoiceRows');
  const inv = byCustomer(state.inventory);
  rows.innerHTML = lines.map((line, index) => renderPurchaseInvoiceLineRow(inv, index + 1, line)).join('');
  bindPersianNumberInputs(rows);
  bindPurchaseInvoiceRows(form, customerId);
  updatePurchaseInvoiceAmountFromRows(form);
  form.querySelector('[name="title"]').value = 'فاکتور خرید از PDF';
  return lines.length;
}

function bindCommon() {
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => { currentTab = btn.dataset.tab; render(); }));
  document.querySelectorAll('[data-theme-choice]').forEach(btn => btn.addEventListener('click', () => { currentTheme = btn.dataset.themeChoice; localStorage.setItem(THEME_KEY, currentTheme); render(); }));
  document.querySelectorAll('[data-customer-segment]').forEach(btn => btn.addEventListener('click', () => { customerBankSegment = btn.dataset.customerSegment || ''; render(); }));
  document.querySelector('[data-reset-customer-bank]')?.addEventListener('click', () => { customerBankQuery = ''; customerBankSegment = ''; render(); });
  document.querySelector('#customerBankSearchForm')?.addEventListener('submit', (e) => { e.preventDefault(); customerBankQuery = new FormData(e.target).get('query') || ''; render(); });
  document.querySelector('#customerProfileForm')?.addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); normalizeNumberFields(e.target); RestaurantCore.upsertCustomerProfile(state, currentCustomer().id, { name: f.get('name'), phone: toEnglishDigits(f.get('phone') || ''), notes: f.get('notes'), tags: String(f.get('tags') || '').split(/[،,]/), source: 'manual' }); saveState(); render(); });
  document.querySelectorAll('[data-copy-campaign-message]').forEach(btn => btn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(btn.dataset.copyCampaignMessage || ''); alert('متن کمپین کپی شد'); } catch { alert(btn.dataset.copyCampaignMessage || ''); } }));
  document.querySelectorAll('[data-copy-ai-brief]').forEach(btn => btn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(btn.dataset.copyAiBrief || ''); alert('خلاصه هوش مصنوعی کپی شد'); } catch { alert(btn.dataset.copyAiBrief || ''); } }));
  bindCalculator();
  document.querySelectorAll('[data-accounting-subtab]').forEach(btn => btn.addEventListener('click', () => { accountingSubTab = btn.dataset.accountingSubtab; render(); }));
  document.querySelectorAll('[data-recipe-category-tab]').forEach(btn => btn.addEventListener('click', () => { currentRecipeCategoryTab = btn.dataset.recipeCategoryTab; render(); }));
  document.querySelectorAll('[data-menu-preview-category-tab]').forEach(btn => btn.addEventListener('click', () => { currentMenuPreviewCategoryTab = btn.dataset.menuPreviewCategoryTab; render(); }));
  document.querySelectorAll('[data-menu-edit-category-tab]').forEach(btn => btn.addEventListener('click', () => { currentMenuEditCategoryTab = btn.dataset.menuEditCategoryTab; render(); }));
  document.querySelector('[data-tenant-switcher]')?.addEventListener('change', (e) => switchPortalTenant(e.target.value));
  document.querySelector('#logout').addEventListener('click', async () => {
    if (session?.id && RestaurantCore.logout) RestaurantCore.logout(state, session.id);
    setActiveSession(null);
    saveState();
    if (portalMode && window.location.hostname === 'app.flowkave.tech') {
      try { await fetch('/api/logout', { method:'POST', credentials:'same-origin' }); } catch {}
      window.location.href = '/login';
      return;
    }
    render();
  });
  const seedSale = document.querySelector('#seedSale');
  if (seedSale) seedSale.addEventListener('click', () => { const items = customerMenuItems(); if (!items[0]) return alert('اول آیتم منو بساز'); const order = RestaurantCore.createSale(state, currentCustomer().id, [{ itemId: items[0].id, qty: 1 }], 'card'); saveState(); render(); notifyLowStock(order); });
  const customer = currentCustomer();
  bindInventorySearch(customer);
  bindSectionBackupControls(customer);
  document.querySelectorAll('[data-close-shift]').forEach(btn => btn.addEventListener('click', () => {
    try { RestaurantCore.closeCashierShift(state, customer.id, btn.dataset.closeShift); saveState(); render(); }
    catch (err) { alert(err.message === 'SHIFT_NOT_FOUND' ? 'شیفت پیدا نشد' : err.message); }
  }));
  const accountingFilterForm = document.querySelector('#accountingFilterForm');
  if (accountingFilterForm) accountingFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(accountingFilterForm);
    accountingFilter = { type: f.get('type') || '', range: f.get('range') || 'all' };
    render();
  });
  const securityEventFilterForm = document.querySelector('#securityEventFilterForm');
  if (securityEventFilterForm) securityEventFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(securityEventFilterForm);
    securityEventFilter = { type: f.get('type') || '', range: f.get('range') || 'all' };
    render();
  });
  const securityEventsExport = document.querySelector('[data-export-security-events]');
  if (securityEventsExport) securityEventsExport.addEventListener('click', () => {
    const exportData = RestaurantCore.createSecurityEventsExport(state, customer.id, securityEventFilterPayload());
    downloadTextFile(`رویدادهای-امنیتی-${Date.now()}.json`, JSON.stringify(exportData, null, 2));
  });
  const dailyClosingButton = document.querySelector('[data-print-daily-closing]');
  if (dailyClosingButton) dailyClosingButton.addEventListener('click', () => showDailyClosingPrintPreview());
  document.querySelectorAll('[data-print-pos-workday-closing]').forEach(btn => btn.addEventListener('click', () => showDailyClosingPrintPreview({ shiftId: btn.dataset.printPosWorkdayClosing })));
  document.querySelectorAll('[data-close-pos-workday]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('حساب این روز کاری بسته شود و گزارش پرینت باز شود؟')) return;
    try { const shiftId = btn.dataset.closePosWorkday; RestaurantCore.closeCashierShift(state, customer.id, shiftId); saveState(); render(); showDailyClosingPrintPreview({ shiftId }); }
    catch (err) { alert(err.message === 'SHIFT_NOT_FOUND' ? 'روز کاری پیدا نشد' : err.message); }
  }));
  const inventoryPrintButton = document.querySelector('[data-print-inventory]');
  if (inventoryPrintButton) inventoryPrintButton.addEventListener('click', showInventoryPrintPreview);
  const printableMenuButton = document.querySelector('[data-printable-menu]');
  if (printableMenuButton) printableMenuButton.addEventListener('click', showPrintableMenuPreview);
  const menuCategorySelect = document.querySelector('[data-menu-category-select]');
  if (menuCategorySelect) menuCategorySelect.addEventListener('change', () => {
    const itemSelect = document.querySelector('[data-menu-item-select]');
    const description = document.querySelector('[data-menu-item-description]');
    if (!itemSelect) return;
    itemSelect.innerHTML = menuItemOptions(menuCategorySelect.value);
    itemSelect.value = '';
    if (description) description.value = '';
  });
  const menuItemSelect = document.querySelector('[data-menu-item-select]');
  if (menuItemSelect) menuItemSelect.addEventListener('change', () => { const description = document.querySelector('[data-menu-item-description]'); if (description) description.value = menuItemDetails[menuItemSelect.value] || ''; });
  document.querySelectorAll('[data-onboarding-tab]').forEach(btn => btn.addEventListener('click', () => { currentTab = btn.dataset.onboardingTab; render(); }));
  document.querySelectorAll('[data-onboarding-backup]').forEach(btn => btn.addEventListener('click', () => document.querySelector('#backupExport')?.click()));
  const accountingLedgerExport = document.querySelector('[data-export-accounting-ledger]');
  if (accountingLedgerExport) accountingLedgerExport.addEventListener('click', () => {
    const exportData = RestaurantCore.createAccountingLedgerExport(state, customer.id, accountingFilterPayload());
    downloadTextFile(`دفتر-مالی-${Date.now()}.json`, JSON.stringify(exportData, null, 2));
  });
  const dailyClosingExport = document.querySelector('[data-export-daily-closing]');
  if (dailyClosingExport) dailyClosingExport.addEventListener('click', () => {
    const currentShift = RestaurantCore.getCurrentCashierShift(state, customer.id);
    const exportData = currentShift ? RestaurantCore.createDailyClosingReportExport(state, customer.id, new Date(), { shiftId: currentShift.id }) : RestaurantCore.createDailyClosingReportExport(state, customer.id, new Date());
    downloadTextFile(`گزارش-بستن-روز-${Date.now()}.json`, JSON.stringify(exportData, null, 2));
  });
  const backupExport = document.querySelector('#backupExport');
  if (backupExport) backupExport.addEventListener('click', () => {
    if (RestaurantCore.recordPrototypeBackupExport) RestaurantCore.recordPrototypeBackupExport(state, customer.id);
    const backup = RestaurantCore.createPrototypeBackup(state);
    downloadTextFile(`restaurant-backup-${Date.now()}.json`, JSON.stringify(backup, null, 2));
    backupMessage = 'فایل پشتیبان آماده دریافت شد.';
    saveState();
    render();
  });
  const sampleDataExport = document.querySelector('#sampleDataExport');
  if (sampleDataExport) sampleDataExport.addEventListener('click', () => {
    const sampleState = RestaurantCore.createDemoSampleState();
    const backup = RestaurantCore.createPrototypeBackup(sampleState);
    downloadTextFile(`داده-نمونه-${Date.now()}.json`, JSON.stringify(backup, null, 2));
    backupMessage = 'فایل داده نمونه پاک آماده دریافت شد.';
    render();
  });
  const sampleDataReset = document.querySelector('#sampleDataReset');
  if (sampleDataReset) sampleDataReset.addEventListener('click', () => {
    if (!confirm('همه داده‌های فعلی همین مرورگر با داده نمونه پاک جایگزین شود؟')) return;
    state = RestaurantCore.createDemoSampleState();
    setActiveSession(RestaurantCore.login(state, 'demo@restaurant.test', '123456'));
    currentTab = 'dashboard';
    backupMessage = 'داده‌ها به حساب نمونه پاک بازنشانی شد.';
    saveState();
    render();
  });
  const backupImport = document.querySelector('#backupImport');
  const backupImportInput = document.querySelector('#backupImportInput');
  if (backupImport && backupImportInput) {
    backupImport.addEventListener('click', () => backupImportInput.click());
    backupImportInput.addEventListener('change', () => {
      const file = backupImportInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        try {
          state = RestaurantCore.restorePrototypeBackup(JSON.parse(reader.result));
          setActiveSession(loadLocalSession(state));
          backupMessage = 'داده‌ها از فایل پشتیبان بازیابی شد.';
          saveState();
          render();
        } catch {
          alert('فایل پشتیبان معتبر نیست');
        }
      });
      reader.readAsText(file);
    });
  }
  const inventoryImportInput = document.querySelector('#inventoryImportInput');
  if (inventoryImportInput) inventoryImportInput.addEventListener('change', () => {
    const file = inventoryImportInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', async () => {
      const form = document.querySelector('#inventoryImportForm');
      if (!form) return;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const text = await extractTextFromPdfBytesAsync(reader.result);
        const count = fillInventoryImportRowsFromText(form, text);
        if (!count) alert('از PDF ایمپورت انبار ردیف قابل‌خواندن پیدا نشد. اگر فایل اسکن تصویری است، به OCR نیاز دارد.');
        return;
      }
      form.querySelector('[name="rows"]').value = String(reader.result || '');
    });
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
  document.querySelectorAll('[data-jalali-calendar]').forEach(input => { if (!input.value) input.value = jalaliDateText(); });
  if (!document.documentElement.dataset.jalaliCalendarBound) {
    document.documentElement.dataset.jalaliCalendarBound = '1';
    const openCalendarForTarget = (event) => {
      if (event.target.closest?.('.jalali-calendar-popover')) return;
      const trigger = event.target.closest?.('[data-open-jalali-calendar],[data-jalali-calendar]');
      if (!trigger) return;
      const holder = trigger.closest('.jalali-date-field');
      const input = holder?.querySelector('[data-jalali-calendar]');
      openFloatingJalaliCalendar(input, holder, event);
    };
    const closeCalendarForTarget = (event) => {
      if (event.target.closest?.('.jalali-calendar-popover')) return;
      if (event.target.closest?.('.jalali-date-field')) return;
      closeJalaliCalendars();
    };
    document.addEventListener('click', openCalendarForTarget, true);
    document.addEventListener('focusin', openCalendarForTarget, true);
    document.addEventListener('pointerdown', closeCalendarForTarget);
    document.addEventListener('focusin', closeCalendarForTarget);
  }
  const purchaseInvoiceForm = document.querySelector('#purchaseInvoiceForm');
  if (purchaseInvoiceForm) {
    bindPurchaseInvoiceRows(purchaseInvoiceForm, customer.id);
    const addInvoiceLine = purchaseInvoiceForm.querySelector('[data-add-invoice-line]');
    if (addInvoiceLine) addInvoiceLine.addEventListener('click', () => {
      const rows = purchaseInvoiceForm.querySelector('#purchaseInvoiceRows');
      const inv = byCustomer(state.inventory);
      if (rows.classList.contains('purchase-invoice-empty')) { rows.classList.remove('purchase-invoice-empty'); rows.innerHTML = ''; }
      rows.insertAdjacentHTML('beforeend', renderPurchaseInvoiceLineRow(inv, rows.querySelectorAll('[data-purchase-invoice-row]').length + 1, {}));
      bindPersianNumberInputs(rows.lastElementChild);
      bindPurchaseInvoiceRows(purchaseInvoiceForm, customer.id);
      updatePurchaseInvoiceAmountFromRows(purchaseInvoiceForm);
    });
    updatePurchaseInvoiceAmountFromRows(purchaseInvoiceForm);
  }

  const addIngredient = document.querySelector('#addIngredient');
  if (addIngredient) addIngredient.addEventListener('click', () => {
    const rows = document.querySelector('#ingredientRows');
    const inv = byCustomer(state.inventory);
    rows.insertAdjacentHTML('beforeend', renderIngredientRow(inv, rows.querySelectorAll('[data-ingredient-row]').length + 1, { inventoryItemId: '', qty: 0 }));
    bindPersianNumberInputs(rows.lastElementChild);
    bindIngredientAutocomplete(document.querySelector('#recipeForm'), customer.id);
    const newButton = rows.lastElementChild.querySelector('[data-remove-ingredient]');
    newButton.addEventListener('click', () => {
      if (document.querySelectorAll('[data-ingredient-row]').length <= 1) return alert('حداقل یک ماده اولیه باید بماند');
      newButton.closest('[data-ingredient-row]').remove();
      updateRecipeCostPreview(document.querySelector('#recipeForm'), customer.id);
    });
    updateRecipeCostPreview(document.querySelector('#recipeForm'), customer.id);
  });
  document.querySelectorAll('[data-pos-channel]').forEach(btn => btn.addEventListener('click', () => { posSalesChannel = btn.dataset.posChannel; render(); }));
  const posChargeSettingsForm = document.querySelector('#posChargeSettingsForm');
  if (posChargeSettingsForm) {
    const savePosChargeSettings = () => {
      if (!canManagePosChargeSettings()) return;
      const f = new FormData(posChargeSettingsForm);
      const currentSettings = posChargeSettings(customer);
      const settings = { ...currentSettings, vatEnabled: f.get('vatEnabled') === 'on', vatPercent: parseFaNumber(f.get('vatPercent') || 0) };
      if (RestaurantCore.setPosChargeSettings) RestaurantCore.setPosChargeSettings(state, customer.id, settings);
      else customer.posChargeSettings = settings;
      if (RestaurantCore.reapplyPosChargeSettingsToOpenOrders) RestaurantCore.reapplyPosChargeSettingsToOpenOrders(state, customer.id);
      saveState();
    };
    posChargeSettingsForm.addEventListener('change', () => { savePosChargeSettings(); render(); });
    posChargeSettingsForm.addEventListener('input', savePosChargeSettings);
  }
  document.querySelectorAll('[data-open-hall-table-picker]').forEach(btn => btn.addEventListener('click', () => { hallTablePickerOpen = true; hallTableConfigOpen = false; render(); }));
  document.querySelectorAll('[data-open-hall-table-config]').forEach(btn => btn.addEventListener('click', () => { if (!canManageHallTableLayout()) return; hallTableConfigOpen = true; hallTablePickerOpen = false; render(); }));
  document.querySelectorAll('[data-close-hall-table-picker]').forEach(btn => btn.addEventListener('click', (event) => { if (event.target !== btn && event.target.closest('.hall-table-picker-popup')) return; hallTablePickerOpen = false; render(); }));
  document.querySelectorAll('[data-close-hall-table-config]').forEach(btn => btn.addEventListener('click', (event) => { if (event.target !== btn && event.target.closest('.hall-table-config-popup')) return; hallTableConfigOpen = false; render(); }));
  document.querySelectorAll('[data-hall-table]').forEach(btn => btn.addEventListener('click', () => { selectedHallTableId = btn.dataset.hallTable; hallTablePickerOpen = false; render(); }));
  document.querySelectorAll('[data-hall-occupied-table]').forEach(btn => btn.addEventListener('click', () => { selectedHallTableId = btn.dataset.hallOccupiedTable; hallTablePickerOpen = false; render(); }));
  document.querySelectorAll('[data-copy-table-qr]').forEach(btn => btn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(btn.dataset.copyTableQr || ''); btn.textContent = 'کپی شد'; setTimeout(() => { btn.textContent = 'کپی لینک'; }, 1200); } catch { alert('کپی خودکار نشد؛ لینک را دستی انتخاب کن.'); } }));
  document.querySelectorAll('[data-hall-category]').forEach(btn => btn.addEventListener('click', () => { syncHallOrderDraftFromForm(); selectedHallCategory = btn.dataset.hallCategory; render(); }));
  document.querySelectorAll('[data-hall-add-item]').forEach(btn => btn.addEventListener('click', () => {
    if (!selectedHallTableId) return;
    const draft = hallDraftForSelectedTable();
    const itemId = btn.dataset.hallAddItem;
    const current = Number(draft.items[itemId]?.qty || 0);
    draft.items[itemId] = { ...(draft.items[itemId] || {}), qty: Math.max(0, Math.min(50, current + 1)) };
    draft.orderNote = btn.closest('#hallSaleForm')?.querySelector('[name="orderNote"]')?.value || draft.orderNote || '';
    render();
  }));
  document.querySelectorAll('[data-delete-hall-ticket-item]').forEach(btn => btn.addEventListener('click', () => {
    if (!selectedHallTableId) return;
    const draft = hallDraftForSelectedTable();
    delete draft.items[btn.dataset.deleteHallTicketItem];
    draft.orderNote = btn.closest('#hallSaleForm')?.querySelector('[name="orderNote"]')?.value || draft.orderNote || '';
    render();
  }));
  document.querySelectorAll('[data-hall-qty-delta]').forEach(btn => btn.addEventListener('click', () => {
    const box = btn.closest('[data-hall-qty-stepper]');
    const input = box?.querySelector('input[name^="qty:"]');
    if (!input) return;
    const delta = Number(btn.dataset.hallQtyDelta || 0);
    const next = Math.max(0, Math.min(50, parseFaNumber(input.value || 0) + delta));
    input.value = numberText(next, 0);
    syncHallOrderDraftFromForm(input.closest('#hallSaleForm'));
    updateHallTicketDraftTotal(input.closest('#hallSaleForm'));
  }));
  document.querySelectorAll('.hall-qty-stepper input[name^="qty:"]').forEach(input => input.addEventListener('input', () => {
    const value = Math.max(0, Math.min(50, parseFaNumber(input.value || 0)));
    input.value = input.value ? numberText(value, 0) : '';
    syncHallOrderDraftFromForm(input.closest('#hallSaleForm'));
    updateHallTicketDraftTotal(input.closest('#hallSaleForm'));
  }));
  document.querySelectorAll('#hallSaleForm textarea[name^="note:"], #hallSaleForm textarea[name="orderNote"]').forEach(input => input.addEventListener('input', () => syncHallOrderDraftFromForm(input.closest('#hallSaleForm'))));
  const addHallSaleLine = document.querySelector('#addHallSaleLine');
  if (addHallSaleLine) addHallSaleLine.addEventListener('click', () => {
    const rows = document.querySelector('#hallSaleRows');
    const items = customerSaleItems();
    rows.insertAdjacentHTML('beforeend', renderHallSaleLineRow(items, rows.querySelectorAll('[data-hall-sale-row]').length + 1));
    bindPersianNumberInputs(rows.lastElementChild);
  });
  document.querySelectorAll('[data-remove-hall-sale-line]').forEach(btn => btn.addEventListener('click', () => {
    const rows = document.querySelectorAll('[data-hall-sale-row]');
    if (rows.length <= 1) return alert('حداقل یک ردیف سفارش باید بماند');
    btn.closest('[data-hall-sale-row]').remove();
  }));
  const hallPaymentFormLive = document.querySelector('#hallPaymentForm');
  const updateHallPaymentSelectAllState = () => {
    if (!hallPaymentFormLive) return;
    const selectAll = hallPaymentFormLive.querySelector('[data-hall-pay-all]');
    const lineChecks = [...hallPaymentFormLive.querySelectorAll('[data-hall-pay-line]')];
    if (!selectAll) return;
    selectAll.checked = lineChecks.length > 0 && lineChecks.every(ch => ch.checked);
    selectAll.indeterminate = lineChecks.some(ch => ch.checked) && !selectAll.checked;
  };
  const applyHallServiceChargeFromForm = () => {
    if (!hallPaymentFormLive || !RestaurantCore.setOrderServiceCharge) return null;
    const f = new FormData(hallPaymentFormLive);
    return RestaurantCore.setOrderServiceCharge(state, customer.id, hallPaymentFormLive.dataset.orderId, {
      serviceMode: f.get('serviceMode') || '',
      servicePercent: parseFaNumber(f.get('servicePercent') || 0),
      serviceAmount: parseFaNumber(f.get('serviceAmount') || 0),
    });
  };
  const refreshHallPaymentPreview = () => {

    const orderId = hallPaymentFormLive.dataset.orderId;
    const selected = [...hallPaymentFormLive.querySelectorAll('[data-hall-pay-line]:checked')].map(ch => ({ lineId: ch.value, qty: parseFaNumber(hallPaymentFormLive.querySelector(`[name="qty:${CSS.escape(ch.value)}"]`)?.value || 0) }));
    try { const updatedOrder = applyHallServiceChargeFromForm(); if (updatedOrder) { const serviceEl = hallPaymentFormLive.querySelector('[data-hall-summary-service]'); const grandEl = hallPaymentFormLive.querySelector('[data-hall-summary-grand]'); const remainingEl = hallPaymentFormLive.querySelector('[data-hall-summary-remaining]'); if (serviceEl) serviceEl.textContent = money(updatedOrder.serviceChargeTotal || 0); if (grandEl) grandEl.textContent = money(updatedOrder.grandTotal || updatedOrder.total || 0); if (remainingEl) remainingEl.textContent = money(updatedOrder.remainingTotal ?? updatedOrder.total ?? 0); } const preview = RestaurantCore.previewOrderPayment(state, customer.id, orderId, selected); hallPaymentFormLive.querySelector('[data-hall-payment-preview]').textContent = `مبلغ انتخاب‌شده: ${money(preview.finalAmount)} — جمع اقلام: ${money(preview.itemSubtotal)} — سهم تخفیف: ${money(preview.discountShare)} — سهم مالیات: ${money(preview.taxShare)} — سهم حق سرویس: ${money(preview.serviceChargeShare)}`; saveState(); } catch { hallPaymentFormLive.querySelector('[data-hall-payment-preview]').textContent = 'برای محاسبه، یک یا چند قلم با تعداد معتبر انتخاب کنید.'; }
  };
  if (hallPaymentFormLive) {
    hallPaymentFormLive.addEventListener('input', refreshHallPaymentPreview);
    hallPaymentFormLive.addEventListener('change', (event) => {
      if (event.target.matches('[data-clear-service-charge]')) {
        hallPaymentFormLive.querySelectorAll('[name="serviceMode"]').forEach(input => { input.checked = false; });
        const percent = hallPaymentFormLive.querySelector('[name="servicePercent"]');
        const amount = hallPaymentFormLive.querySelector('[name="serviceAmount"]');
        if (percent) percent.value = '';
        if (amount) amount.value = '';
      }
      if (event.target.matches('[data-hall-pay-all]')) hallPaymentFormLive.querySelectorAll('[data-hall-pay-line]').forEach(ch => { ch.checked = event.target.checked; });
      updateHallPaymentSelectAllState();
      refreshHallPaymentPreview();
    });
    hallPaymentFormLive.querySelector('[data-clear-service-charge]')?.addEventListener('click', () => {
      hallPaymentFormLive.querySelectorAll('[name="serviceMode"]').forEach(input => { input.checked = false; });
      const percent = hallPaymentFormLive.querySelector('[name="servicePercent"]');
      const amount = hallPaymentFormLive.querySelector('[name="serviceAmount"]');
      if (percent) percent.value = numberText(0, 2);
      if (amount) amount.value = numberText(0, 0);
      refreshHallPaymentPreview();
      render();
    });
    updateHallPaymentSelectAllState();
    refreshHallPaymentPreview();
  }
  const addSaleLine = document.querySelector('#addSaleLine');
  if (addSaleLine) addSaleLine.addEventListener('click', () => {
    const rows = document.querySelector('#saleRows');
    const items = customerMenuItems();
    rows.insertAdjacentHTML('beforeend', renderSaleLineRow(items, rows.querySelectorAll('[data-sale-row]').length + 1));
    const newButton = rows.lastElementChild.querySelector('[data-remove-sale-line]');
    newButton.addEventListener('click', () => {
      if (document.querySelectorAll('[data-sale-row]').length <= 1) return alert('حداقل یک ردیف فروش باید بماند');
      newButton.closest('[data-sale-row]').remove();
    });
  });
  document.querySelectorAll('[data-remove-sale-line]').forEach(btn => btn.addEventListener('click', () => {
    const rows = document.querySelectorAll('[data-sale-row]');
    if (rows.length <= 1) return alert('حداقل یک ردیف فروش باید بماند');
    btn.closest('[data-sale-row]').remove();
  }));
  const recipeFormPreview = document.querySelector('#recipeForm');
  if (recipeFormPreview) {
    bindRecipeRowButtons(recipeFormPreview, customer.id);
    const refreshRecipeCost = () => updateRecipeCostPreview(recipeFormPreview, customer.id);
    recipeFormPreview.addEventListener('input', refreshRecipeCost);
    recipeFormPreview.addEventListener('change', refreshRecipeCost);
    const newRecipeButton = recipeFormPreview.querySelector('[data-new-recipe]');
    if (newRecipeButton) newRecipeButton.addEventListener('click', () => {
      recipeFormPreview.querySelector('[name="itemName"]').value = '';
      recipeFormPreview.querySelector('[name="category"]').value = '';
      recipeFormPreview.querySelector('[name="cookingSteps"]').value = '';
      recipeFormPreview.querySelector('[name="editingItemId"]').value = '';
      recipeFormPreview.querySelector('[name="editingRecipeId"]').value = '';
      recipeFormPreview.querySelector('#ingredientRows').innerHTML = '';
      updateRecipeCostPreview(recipeFormPreview, customer.id);
    });
    refreshRecipeCost();
  }
  document.querySelectorAll('.menu-edit-form').forEach(form => form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const f = new FormData(form);
      RestaurantCore.updateMenuItem(state, customer.id, form.dataset.itemId, {
        name: cleanPersianText(f.get('name')),
        category: f.get('category'),
        price: parseFaNumber(f.get('price')),
        description: cleanPersianText(f.get('description') || ''),
      });
      editingMenuItemId = '';
      rememberMenuEditScrollFocus(form);
      saveState(); render();
    } catch (err) { alert(err.message); }
  }));
  document.querySelectorAll('[data-save-menu-item]').forEach(btn => btn.addEventListener('click', () => {
    const form = btn.closest('.menu-edit-form');
    if (!form) return;
    if (editingMenuItemId !== form.dataset.itemId) {
      editingMenuItemId = form.dataset.itemId;
      rememberMenuEditScrollFocus(form);
      return render();
    }
    form.requestSubmit();
  }));
  document.querySelectorAll('[data-delete-item]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این آیتم منو و رسپی وابسته حذف شود؟')) return;
    try { RestaurantCore.deleteMenuItem(state, customer.id, btn.dataset.deleteItem); saveState(); render(); }
    catch (err) { alert(err.message); }
  }));
  document.querySelectorAll('[data-delete-menu]').forEach(btn => btn.addEventListener('click', () => {
    try { RestaurantCore.deleteMenu(state, customer.id, btn.dataset.deleteMenu); saveState(); render(); }
    catch (err) { alert(err.message); }
  }));
  document.querySelectorAll('[data-toggle-menu-publish]').forEach(btn => btn.addEventListener('click', () => {
    const menu = byCustomer(state.menus).find(m => m.id === btn.dataset.toggleMenuPublish);
    if (!menu) return alert('منو پیدا نشد');
    try { RestaurantCore.updateMenu(state, customer.id, menu.id, { isPublished: menu.isPublished === false }); saveState(); render(); }
    catch (err) { alert(err.message === 'MENU_NOT_FOUND' ? 'منو پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('.account-edit-form').forEach(form => form.addEventListener('submit', (e) => {
    e.preventDefault();
    normalizeNumberFields(form);
    try {
      const f = new FormData(form);
      RestaurantCore.updateFinancialAccount(state, customer.id, form.dataset.financialAccountId, { name: cleanPersianText(f.get('name')), type: f.get('type'), openingBalance: parseFaNumber(f.get('openingBalance')) });
      editingFinancialAccountId = '';
      rememberAccountScrollFocus(form);
      saveState(); render();
    } catch (err) { alert(err.message === 'FINANCIAL_ACCOUNT_NOT_FOUND' ? 'حساب پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-save-financial-account]').forEach(btn => btn.addEventListener('click', () => {
    const form = btn.closest('.account-edit-form');
    if (!form) return;
    if (editingFinancialAccountId !== form.dataset.financialAccountId) {
      editingFinancialAccountId = form.dataset.financialAccountId;
      rememberAccountScrollFocus(form);
      return render();
    }
    form.requestSubmit();
  }));
  document.querySelectorAll('[data-delete-financial-account]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این حساب حذف شود؟ رویدادهای مالی قبلی باقی می‌مانند.')) return;
    try { RestaurantCore.deleteFinancialAccount(state, customer.id, btn.dataset.deleteFinancialAccount); saveState(); render(); }
    catch (err) { alert(err.message === 'FINANCIAL_ACCOUNT_NOT_FOUND' ? 'حساب پیدا نشد' : 'حذف حساب ناموفق بود.'); }
  }));
  document.querySelectorAll('[data-edit-inventory-row]').forEach(btn => btn.addEventListener('click', () => {
    const form = btn.closest('.inventory-edit-form');
    const fields = form.querySelectorAll('[data-inventory-edit-field]');
    if (form.dataset.editing === 'true') {
      fields.forEach(field => { field.disabled = false; });
      normalizeNumberFields(form);
      try {
        const f = new FormData(form);
        rememberInventoryScrollFocus(form);
        RestaurantCore.updateInventoryItem(state, customer.id, form.dataset.inventoryId, Object.fromEntries(f));
        saveState(); render();
      } catch (err) { alert(err.message); }
      return;
    }
    form.dataset.editing = 'true';
    form.querySelectorAll('[data-inventory-readonly]').forEach(field => { field.hidden = true; });
    fields.forEach(field => { field.hidden = false; field.disabled = false; });
    setActionDecalButton(btn, 'save');
    btn.classList.add('primary');
    btn.classList.remove('secondary');
    form.querySelector('input[name="name"]')?.focus();
  }));
  document.querySelectorAll('.inventory-edit-form').forEach(form => form.addEventListener('submit', (e) => e.preventDefault()));
  document.querySelectorAll('[data-delete-inventory]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این ماده اولیه حذف شود؟ اگر در رسپی استفاده شده باشد حذف نمی‌شود.')) return;
    try { RestaurantCore.deleteInventoryItem(state, customer.id, btn.dataset.deleteInventory); saveState(); render(); }
    catch (err) { alert(err.message === 'INVENTORY_USED_IN_RECIPE' ? 'این ماده در رسپی استفاده شده؛ اول رسپی را تغییر بده.' : err.message); }
  }));
  document.querySelectorAll('[data-view-cheque-list]').forEach(btn => btn.addEventListener('click', () => showChequeListPreview(btn.dataset.viewChequeList)));
  document.querySelectorAll('[data-pass-cheque]').forEach(btn => btn.addEventListener('click', () => {
    const cheque = (state.cheques || []).find(item => item.id === btn.dataset.passCheque);
    if (!cheque) return alert('چک پیدا نشد');
    cheque.status = 'پاس‌شده';
    cheque.passedAt = new Date().toISOString();
    saveState(); render();
  }));
  document.querySelectorAll('[data-delete-cheque]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این چک پاس‌نشده حذف شود؟')) return;
    try { RestaurantCore.deleteCheque(state, customer.id, btn.dataset.deleteCheque); saveState(); render(); }
    catch (err) { alert(err.message === 'CHEQUE_NOT_FOUND' ? 'چک پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-view-purchase-invoice]').forEach(btn => btn.addEventListener('click', () => showPurchaseInvoiceDetailsPreview(btn.dataset.viewPurchaseInvoice)));
  document.querySelectorAll('.purchase-invoice-split .purchase-invoice-row-decal[data-tooltip]').forEach(btn => {
    btn.addEventListener('mouseenter', () => showFloatingTooltip(btn));
    btn.addEventListener('focus', () => showFloatingTooltip(btn));
    btn.addEventListener('mouseleave', hideFloatingTooltip);
    btn.addEventListener('blur', hideFloatingTooltip);
  });
  document.querySelectorAll('[data-edit-purchase-invoice]').forEach(btn => btn.addEventListener('click', () => { editingPurchaseInvoiceId = btn.dataset.editPurchaseInvoice; render(); }));
  document.querySelectorAll('[data-cancel-purchase-invoice-edit]').forEach(btn => btn.addEventListener('click', () => { editingPurchaseInvoiceId = ''; render(); }));
  document.querySelectorAll('[data-delete-purchase-invoice]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این فاکتور خرید حذف شود؟ اثر موجودی و دفتر مالی همین فاکتور برگردانده می‌شود.')) return;
    try { RestaurantCore.deletePurchaseInvoice(state, customer.id, btn.dataset.deletePurchaseInvoice); saveState(); render(); }
    catch (err) { alert(err.message === 'PURCHASE_INVOICE_NOT_FOUND' ? 'فاکتور خرید پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-pay-purchase-invoice]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این فاکتور خرید پرداخت‌شده ثبت شود؟')) return;
    try { RestaurantCore.updatePurchaseInvoicePaymentStatus(state, customer.id, btn.dataset.payPurchaseInvoice, 'paid'); saveState(); render(); }
    catch (err) { alert(err.message === 'PURCHASE_INVOICE_NOT_FOUND' ? 'فاکتور خرید پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-unpay-purchase-invoice]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('وضعیت این فاکتور به پرداخت‌نشده برگردد؟')) return;
    try { RestaurantCore.updatePurchaseInvoicePaymentStatus(state, customer.id, btn.dataset.unpayPurchaseInvoice, 'unpaid'); saveState(); render(); }
    catch (err) { alert(err.message === 'PURCHASE_INVOICE_NOT_FOUND' ? 'فاکتور خرید پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-toggle-purchase-payment]').forEach(btn => btn.addEventListener('click', () => {
    const purchase = byCustomer(state.purchases || []).find(p => p.id === btn.dataset.togglePurchasePayment);
    if (!purchase) return alert('خرید پیدا نشد');
    const nextStatus = purchase.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    try { RestaurantCore.updateInventoryPurchasePaymentStatus(state, customer.id, purchase.id, nextStatus); saveState(); render(); }
    catch (err) { alert(err.message === 'PURCHASE_NOT_FOUND' ? 'خرید پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-edit-sale]').forEach(btn => btn.addEventListener('click', () => { const order = (state.orders || []).find(item => item.id === btn.dataset.editSale && item.customerId === customer.id); if (posSalesChannel === 'hall' && order?.tableId) { selectedHallTableId = order.tableId; hallTablePickerOpen = false; hallTableConfigOpen = false; render(); requestAnimationFrame(() => document.querySelector('#hallSaleForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); return; } editingSaleOrderId = btn.dataset.editSale; render(); }));
  document.querySelectorAll('[data-cancel-sale-edit]').forEach(btn => btn.addEventListener('click', () => { editingSaleOrderId = ''; render(); }));
  document.querySelectorAll('[data-delete-sale]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این فروش حذف شود؟ اثر موجودی و دفتر مالی همین فاکتور برگردانده می‌شود.')) return;
    try { RestaurantCore.deleteSale(state, customer.id, btn.dataset.deleteSale); saveState(); render(); }
    catch (err) { alert(err.message === 'ORDER_NOT_FOUND' ? 'فروش پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-order-status]').forEach(select => select.addEventListener('change', () => {
    try { RestaurantCore.updateOrderStatus(state, customer.id, select.dataset.orderStatus, select.value); saveState(); render(); }
    catch (err) { alert(err.message === 'ORDER_NOT_FOUND' ? 'سفارش پیدا نشد' : 'وضعیت سفارش معتبر نیست'); }
  }));
  document.querySelectorAll('[data-advance-order-status]').forEach(btn => btn.addEventListener('click', () => {
    try { RestaurantCore.advanceOrderStatus(state, customer.id, btn.dataset.advanceOrderStatus); saveState(); render(); }
    catch (err) { alert(err.message === 'ORDER_NOT_FOUND' ? 'سفارش پیدا نشد' : 'وضعیت سفارش معتبر نیست'); }
  }));
  const kitchenFilterForm = document.querySelector('#kitchenFilterForm');
  if (kitchenFilterForm) kitchenFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(kitchenFilterForm);
    kitchenQueueFilter = normalizeKitchenFilterValue(f.get('filter'));
    kitchenStationFilter = normalizeKitchenStationValue(f.get('station'));
    saveKitchenFilterState(kitchenStationFilter, kitchenQueueFilter);
    render();
  });
  const kitchenStationSelect = document.querySelector('[data-kitchen-station-select]');
  const kitchenFilterSelect = document.querySelector('[data-kitchen-filter-select]');
  if (kitchenStationSelect && kitchenFilterSelect) kitchenStationSelect.addEventListener('change', () => {
    kitchenFilterSelect.value = rememberedKitchenFilterForStation(kitchenStationSelect.value);
  });
  document.querySelectorAll('[data-reset-kitchen-filter]').forEach(btn => btn.addEventListener('click', () => {
    kitchenQueueFilter = 'all';
    kitchenStationFilter = 'all';
    localStorage.removeItem(KITCHEN_FILTER_KEY);
    render();
  }));
  document.querySelectorAll('[data-play-kitchen-alert]').forEach(btn => btn.addEventListener('click', playKitchenAlertSound));
  document.querySelectorAll('[data-snooze-kitchen-order]').forEach(btn => btn.addEventListener('click', () => {
    snoozeKitchenOrder(btn.dataset.snoozeKitchenOrder, 10);
    render();
  }));
  document.querySelectorAll('[data-print-kitchen-ticket]').forEach(btn => btn.addEventListener('click', () => showKitchenTicketPrintPreview(btn.dataset.printKitchenTicket)));
  document.querySelectorAll('[data-print-station-queue]').forEach(btn => btn.addEventListener('click', () => showKitchenStationQueuePrintPreview(kitchenStationFilter === 'all' ? 'prep' : kitchenStationFilter, kitchenQueueFilter)));
  document.querySelectorAll('[data-complete-order]').forEach(btn => btn.addEventListener('click', () => {
    try { RestaurantCore.updateOrderStatus(state, customer.id, btn.dataset.completeOrder, 'completed'); saveState(); render(); }
    catch (err) { alert(err.message === 'ORDER_NOT_FOUND' ? 'سفارش پیدا نشد' : 'وضعیت سفارش معتبر نیست'); }
  }));
  document.querySelector('[data-open-staff-modal]')?.addEventListener('click', () => { staffFormModalOpen = true; render(); });
  document.querySelector('[data-open-staff-list-modal]')?.addEventListener('click', () => { staffListModalOpen = true; staffListSearchQuery = ''; selectedStaffListUserId = ''; render(); });
  document.querySelectorAll('[data-open-attendance-modal]').forEach(btn => btn.addEventListener('click', () => { attendanceModalOpen = true; render(); }));
  document.querySelector('[data-close-attendance-modal]')?.addEventListener('click', () => { attendanceModalOpen = false; render(); });
  document.querySelector('[data-attendance-personnel-code]')?.addEventListener('input', () => updateAttendanceSchedulePreview(customer.id));
  document.querySelector('#staffAttendanceModalForm')?.addEventListener('submit', (e) => { e.preventDefault(); try { normalizeNumberFields(e.target); const submitter = e.submitter; const result = handleAttendanceModalSubmit(e.target, customer.id, submitter?.value || visibleAttendanceAction()); if (result === false) return; attendanceModalOpen = false; saveState(); render(); } catch (err) { alert(attendanceModalErrorMessage(err)); updateAttendanceSchedulePreview(customer.id); } });
  document.querySelectorAll('[data-close-staff-modal]').forEach(btn => btn.addEventListener('click', () => { staffFormModalOpen = false; render(); }));
  document.querySelectorAll('[data-close-staff-list-modal]').forEach(btn => btn.addEventListener('click', () => { staffListModalOpen = false; selectedStaffListUserId = ''; render(); }));
  document.querySelectorAll('[data-close-staff-edit-modal]').forEach(btn => btn.addEventListener('click', () => { selectedStaffListUserId = ''; render(); }));
  document.querySelectorAll('[data-personnel-modal-overlay]').forEach(overlay => overlay.addEventListener('click', (e) => { if (e.target !== overlay) return; staffFormModalOpen = false; staffListModalOpen = false; selectedStaffListUserId = ''; attendanceModalOpen = false; render(); }));
  document.querySelectorAll('[data-staff-edit-overlay]').forEach(overlay => overlay.addEventListener('click', (e) => { if (e.target !== overlay) return; selectedStaffListUserId = ''; render(); }));
  document.querySelector('[data-print-staff-list]')?.addEventListener('click', () => printPersonnelModal('.staff-list-modal'));
  document.querySelector('[data-print-weekly-schedule]')?.addEventListener('click', () => printPersonnelModal('.staff-schedule-weekly-panel'));
  document.querySelectorAll('.staff-user-edit-form').forEach(form => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    try {
      RestaurantCore.updateStaffUser(state, customer.id, form.dataset.staffUserId, {
        firstName: cleanPersianText(f.get('firstName')),
        lastName: cleanPersianText(f.get('lastName')),
        fatherName: cleanPersianText(f.get('fatherName')),
        nationalId: normalizeNationalIdForSave(f.get('nationalId')),
        mobile: normalizeMobileForSave(f.get('mobile')),
        personnelCode: toEnglishDigits(f.get('personnelCode')),
        email: f.get('email'),
        address: cleanPersianText(f.get('address')),
        jobTitle: cleanPersianText(f.get('jobTitle')),
        hourlyWage: parseFaNumber(f.get('hourlyWage')),
        role: f.get('role'),
      });
      saveState();
      render();
    } catch (err) {
      alert(err.message === 'STAFF_CODE_ALREADY_EXISTS' ? 'این کد پرسنلی برای کارمند دیگری ثبت شده است' : err.message === 'STAFF_NOT_FOUND' ? 'کارمند پیدا نشد' : 'اطلاعات کارمند کامل نیست');
    }
  }));
  document.querySelector('[data-staff-list-search]')?.addEventListener('input', (event) => {
    const query = cleanPersianText(faNum(event.target.value || '')).toLowerCase();
    staffListSearchQuery = event.target.value || '';
    let visible = 0;
    document.querySelectorAll('.staff-list-option[data-staff-search]').forEach(row => {
      const match = !query || (row.dataset.staffSearch || '').includes(query);
      row.hidden = !match;
      if (match) visible += 1;
    });
    const empty = document.querySelector('[data-staff-list-empty]');
    if (empty) empty.hidden = visible !== 0;
  });
  document.querySelectorAll('[data-select-staff-user]').forEach(btn => btn.addEventListener('click', () => { selectedStaffListUserId = btn.dataset.selectStaffUser || ''; render(); }));
  document.querySelectorAll('[data-send-staff-invitation]').forEach(btn => btn.addEventListener('click', async () => {
    const staffUser = RestaurantCore.getStaffUsers(state, customer.id).find(u => u.id === btn.dataset.sendStaffInvitation);
    if (!staffUser) return alert('کارمند پیدا نشد');
    if (!staffUser.email) return alert('برای ارسال لینک دعوت، اول ایمیل را در پرونده پرسنل ذخیره کنید.');
    try {
      const invitation = RestaurantCore.createStaffInvitation(state, customer.id, { staffUserId: staffUser.id, name: staffUser.name || `${staffUser.firstName || ''} ${staffUser.lastName || ''}`, email: staffUser.email, role: staffUser.role, personnelCode: staffUser.personnelCode, jobTitle: staffUser.jobTitle });
      saveState();
      if (portalMode) await sendStaffInvitationEmail(invitation);
      alert('لینک دعوت برای این پرسنل ساخته و ارسال شد. کد پرسنلی و سمت شغلی هم داخل اطلاعات دعوت ایمیل قرار گرفت.');
      render();
    } catch (err) {
      const message = err.message === 'INVITATION_ALREADY_PENDING' ? 'برای این پرسنل یک دعوت فعال وجود دارد؛ از بخش دعوت‌های کارکنان لینک را کپی کنید یا دعوت قبلی را لغو کنید.' : err.message === 'INVITATION_EMAIL_REQUIRED' ? 'ایمیل پرسنل در پرونده ثبت نشده است.' : err.message === 'MANAGER_EMAIL_ALREADY_ACTIVE_IN_RESTAURANT' ? 'این مدیر همین حالا در این رستوران فعال است.' : err.message === 'STAFF_EMAIL_ALREADY_EXISTS' ? 'این ایمیل برای یک پرسنل فعال همین رستوران ثبت شده است.' : err.message;
      alert(message || 'ارسال دعوت انجام نشد');
    }
  }));
  document.querySelectorAll('[data-toggle-staff]').forEach(btn => btn.addEventListener('click', () => {
    const staffUser = RestaurantCore.getStaffUsers(state, customer.id).find(u => u.id === btn.dataset.toggleStaff);
    if (!staffUser) return alert('کاربر پیدا نشد');
    try { RestaurantCore.updateStaffUser(state, customer.id, staffUser.id, { active: staffUser.active === false }); saveState(); render(); }
    catch (err) { alert(err.message === 'STAFF_NOT_FOUND' ? 'کاربر پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-delete-staff]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این کاربر کارکنان حذف شود؟')) return;
    try { RestaurantCore.deleteStaffUser(state, customer.id, btn.dataset.deleteStaff); if (selectedStaffListUserId === btn.dataset.deleteStaff) selectedStaffListUserId = ''; saveState(); render(); }
    catch (err) { alert(err.message === 'STAFF_NOT_FOUND' ? 'کاربر پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-save-attendance-row]').forEach(btn => btn.addEventListener('click', () => {
    const rowEl = btn.closest('[data-attendance-row]');
    try { updateAttendanceRowFromManager(customer.id, btn.dataset.saveAttendanceRow, rowEl); saveState(); render(); }
    catch (err) { alert('رکورد حضور و غیاب پیدا نشد'); }
  }));
  document.querySelectorAll('[data-approve-attendance]').forEach(btn => btn.addEventListener('click', () => {
    try { RestaurantCore.approveStaffAttendance(state, customer.id, btn.dataset.approveAttendance, true); saveState(); render(); }
    catch (err) { alert('رکورد حضور و غیاب پیدا نشد'); }
  }));
  document.querySelectorAll('[data-delete-attendance]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این رکورد حضور و غیاب حذف شود؟')) return;
    try { RestaurantCore.deleteStaffAttendance(state, customer.id, btn.dataset.deleteAttendance); saveState(); render(); }
    catch (err) { alert('رکورد حضور و غیاب پیدا نشد'); }
  }));
  document.querySelectorAll('[data-cancel-invitation]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این دعوت کارکنان لغو شود؟')) return;
    try { RestaurantCore.cancelStaffInvitation(state, customer.id, btn.dataset.cancelInvitation); saveState(); render(); }
    catch (err) { alert(err.message === 'INVITATION_NOT_FOUND' ? 'دعوت پیدا نشد' : 'این دعوت دیگر در انتظار پذیرش نیست'); }
  }));
  document.querySelectorAll('[data-copy-invitation-link]').forEach(btn => btn.addEventListener('click', () => {
    copyTextToClipboard(btn.dataset.copyInvitationLink || '').then(() => alert('لینک دعوت کپی شد؛ آن را در پیام‌رسان یا ایمیل دستی بفرستید.')).catch(() => alert('کپی نشد؛ لینک را دستی انتخاب کنید.'));
  }));
  document.querySelectorAll('[data-edit-recipe]').forEach(btn => btn.addEventListener('click', () => {
    const recipe = byCustomer(state.recipes).find(r => r.id === btn.dataset.editRecipe);
    if (!recipe) return;
    const item = customerMenuItems().find(i => i.id === recipe.itemId);
    const form = document.querySelector('#recipeForm');
    form.querySelector('[name="itemName"]').value = item?.name || recipe.itemName || '';
    form.querySelector('[name="category"]').value = item?.category || recipe.category || '';
    form.querySelector('[name="editingItemId"]').value = recipe.itemId;
    form.querySelector('[name="editingRecipeId"]').value = recipe.id;
    form.querySelector('[name="cookingSteps"]').value = recipe.cookingSteps || '';
    const inv = byCustomer(state.inventory);
    const rows = form.querySelector('#ingredientRows');
    rows.innerHTML = recipe.ingredients.map((ing, idx) => renderIngredientRow(inv, idx + 1, ing)).join('');
    bindPersianNumberInputs(rows);
    bindRecipeRowButtons(form, customer.id);
    updateRecipeCostPreview(form, customer.id);
  }));
  document.querySelectorAll('[data-delete-recipe]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این رسپی حذف شود؟')) return;
    try { RestaurantCore.deleteRecipe(state, customer.id, btn.dataset.deleteRecipe); saveState(); render(); }
    catch (err) { alert(err.message === 'RECIPE_NOT_FOUND' ? 'رسپی پیدا نشد' : err.message); }
  }));
  document.querySelectorAll('[data-print-recipe]').forEach(btn => btn.addEventListener('click', () => printRecipeReport(btn.dataset.printRecipe)));
  const handlers = {
    menuForm: (f) => RestaurantCore.createMenu(state, customer.id, Object.fromEntries(f)),
    itemForm: (f) => {
      const item = RestaurantCore.createMenuItem(state, customer.id, f.get('menuId'), { name:f.get('name'), category:f.get('category'), description:f.get('description'), price:parseFaNumber(f.get('price')), available:true });
      const recipe = byCustomer(state.recipes).find(r => !r.itemId && (r.itemName || '').trim() === item.name && (r.category || '').trim() === item.category);
      if (recipe) recipe.itemId = item.id;
      return item;
    },
    hallTableConfigForm: (f) => {
      const tables = RestaurantCore.configureHallTables(state, customer.id, { count: parseFaNumber(f.get('count')), startNumber: parseFaNumber(f.get('startNumber')) || 1, customNames: String(f.get('customNames') || '').split(/[،,\n]/).map(x => cleanPersianText(x)).filter(Boolean) });
      selectedHallTableId = '';
      hallTablePickerOpen = false;
      hallTableConfigOpen = false;
      return tables;
    },
    hallSaleForm: (f, form) => {
      const tableId = selectedHallTableId;
      if (!tableId) throw new Error('اول میز را انتخاب کنید');
      const lines = collectHallSaleLines(form);
      if (!lines.length) throw new Error('حداقل یک آیتم با تعداد مثبت لازم است');
      const order = RestaurantCore.createHallOrder(state, customer.id, tableId, lines, { orderNote: f.get('orderNote') || '', chargeSettings: { ...(customer.posChargeSettings || {}), serviceMode: '', servicePercent: 0, serviceAmount: 0 } });
      delete hallOrderDrafts[tableId];
      notifyLowStock(order);
      return order;
    },
    hallPaymentForm: (f, form) => {
      const selected = [...form.querySelectorAll('[data-hall-pay-line]:checked')].map(ch => ({ lineId: ch.value, qty: parseFaNumber(form.querySelector(`[name=\"qty:${CSS.escape(ch.value)}\"]`)?.value || 0) }));
      if (!selected.length) throw new Error('حداقل یک قلم برای پرداخت انتخاب کنید');
      return RestaurantCore.recordOrderPayment(state, customer.id, form.dataset.orderId, selected, { paymentMethod: f.get('paymentMethod'), idempotencyKey: `ui-${Date.now()}` });
    },
    saleForm: (f, form) => {
      const lines = collectSaleLines(form);
      if (!lines.length) throw new Error('حداقل یک آیتم با تعداد مثبت لازم است');
      const editingId = f.get('editingOrderId');
      const order = editingId ? RestaurantCore.updateSale(state, customer.id, editingId, lines, f.get('payment'), { orderNote: f.get('orderNote') || '' }) : RestaurantCore.createSale(state, customer.id, lines, f.get('payment'), { orderNote: f.get('orderNote') || '' });
      editingSaleOrderId = '';
      notifyLowStock(order);
      return order;
    },
    inventoryForm: (f) => RestaurantCore.createInventoryItem(state, customer.id, { name: cleanPersianText(f.get('name')), unit: f.get('unit'), stock: parseFaNumber(f.get('stock')), unitCost: parseFaNumber(f.get('unitCost')), minStock: parseFaNumber(f.get('minStock')) }),
    inventoryImportForm: (f) => { const rows = parseInventoryImportRows(f.get('rows')); if (!rows.length) throw new Error('حداقل یک ردیف معتبر لازم است'); return RestaurantCore.importInventoryItems(state, customer.id, rows); },
    purchaseInvoiceForm: (f, form) => { updatePurchaseInvoiceAmountFromRows(form); const lines = collectPurchaseInvoiceLines(form); const draftRows = collectPurchaseInvoiceDraftRows(form); if (draftRows.length && !lines.length) throw new Error('برای ثبت آیتم فاکتور، نام آیتم و مقدار مثبت لازم است.'); const input = { title: f.get('title'), supplier: f.get('supplier'), invoiceDate: f.get('documentDate'), documentDate: f.get('documentDate'), documentNumber: f.get('documentNumber'), paymentStatus: f.get('paymentStatus'), paymentMethod: f.get('paymentMethod'), accountId: f.get('accountId'), chequeNumber: f.get('chequeNumber'), chequeDueDate: f.get('chequeDueDate'), amount: parseFaNumber(form.querySelector('[name="amount"]')?.value || f.get('amount')), lines }; const editingId = f.get('editingInvoiceId'); const invoice = editingId ? RestaurantCore.updatePurchaseInvoice(state, customer.id, editingId, input) : RestaurantCore.recordPurchaseInvoice(state, customer.id, input); editingPurchaseInvoiceId = ''; return invoice; },
    staffForm: (f) => { const staff = RestaurantCore.createStaffUser(state, customer.id, { personnelCode: toEnglishDigits(f.get('personnelCode') || nextPersonnelCode(state.staffUsers)), firstName: cleanPersianText(f.get('firstName')), lastName: cleanPersianText(f.get('lastName')), fatherName: cleanPersianText(f.get('fatherName')), nationalId: normalizeNationalIdForSave(f.get('nationalId')), mobile: normalizeMobileForSave(f.get('mobile')), email: f.get('email'), address: cleanPersianText(f.get('address')), jobTitle: cleanPersianText(f.get('jobTitle')), hourlyWage: parseFaNumber(f.get('hourlyWage')), role: f.get('role') || 'cashier' }); staffFormModalOpen = false; return staff; },
    staffAccessForm: (f) => RestaurantCore.updateStaffUser(state, customer.id, f.get('staffUserId'), { pin: toEnglishDigits(f.get('pin')), role: f.get('role'), accessActive: true }),
    staffClockInForm: (f) => RestaurantCore.clockInStaff(state, customer.id, { staffUserId: f.get('staffUserId'), date: f.get('date'), time: f.get('time'), reason: cleanPersianText(f.get('reason')), source: 'manual' }),
    staffClockOutForm: (f) => RestaurantCore.clockOutStaff(state, customer.id, f.get('attendanceId'), { time: f.get('time'), reason: cleanPersianText(f.get('reason')), source: 'manual' }),
    passwordResetForm: (f) => RestaurantCore.requestPasswordReset(state, f.get('email')),
    ownerProfileForm: (f) => RestaurantCore.updateCustomerProfile(state, customer.id, { businessName: cleanPersianText(f.get('businessName')), ownerName: cleanPersianText(f.get('ownerName')), phone: toEnglishDigits(f.get('phone') || ''), email: f.get('email') }),
    ownerPasswordForm: (f) => { const next = toEnglishDigits(f.get('newPassword') || ''); const confirm = toEnglishDigits(f.get('confirmPassword') || ''); if (next !== confirm) throw new Error('تکرار رمز جدید با رمز جدید یکی نیست'); const result = RestaurantCore.changeCustomerPassword(state, customer.id, toEnglishDigits(f.get('currentPassword') || ''), next); alert('رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید.'); activeSessionId = ''; return result; },
    recipeForm: (f, form) => {
      const ingredients = collectRecipeIngredients(form);
      if (!ingredients.length) throw new Error('حداقل یک ماده اولیه لازم است');
      const itemName = String(f.get('itemName') || '').trim();
      if (!itemName) throw new Error('نام آیتم لازم است');
      const editingItemId = f.get('editingItemId');
      const category = f.get('category') || 'بدون دسته‌بندی';
      let itemId = '';
      if (editingItemId) {
        const item = RestaurantCore.updateMenuItem(state, customer.id, editingItemId, { name: itemName, category });
        itemId = item.id;
      }
      return RestaurantCore.setRecipe(state, customer.id, itemId, ingredients, { itemName, category, cookingSteps: f.get('cookingSteps') });
    },
    financialAccountForm: (f) => RestaurantCore.createFinancialAccount(state, customer.id, { name: cleanPersianText(f.get('name')), type: f.get('type'), openingBalance: parseFaNumber(f.get('openingBalance')) }),
    expenseForm: (f) => RestaurantCore.addExpense(state, customer.id, f.get('title'), parseFaNumber(f.get('amount')), { documentDate: f.get('documentDate'), documentNumber: f.get('documentNumber'), description: f.get('description'), category: f.get('category'), paymentMethod: f.get('paymentMethod'), accountId: f.get('accountId'), chequeNumber: f.get('chequeNumber'), chequeDueDate: f.get('chequeDueDate') }),
    shiftForm: (f) => RestaurantCore.openCashierShift(state, customer.id, { name: cleanPersianText(f.get('name')), operatorName: f.get('operatorName') }),
    posShiftForm: (f) => RestaurantCore.openCashierShift(state, customer.id, { name: cleanPersianText(f.get('name')), operatorName: f.get('operatorName') }),
    packageForm: (f) => RestaurantCore.setPackage(state, customer.id, f.get('packageName')),
  };
  for (const [id, fn] of Object.entries(handlers)) {
    const form = document.querySelector('#' + id);
    if (form) form.addEventListener('submit', async (e) => { e.preventDefault(); try { normalizeNumberFields(form); const result = await fn(new FormData(form), form); if (id === 'hallSaleForm') { selectedHallTableId = ''; hallTablePickerOpen = false; hallTableConfigOpen = false; saveState(); render(); showHallOrderReceiptPrintPreview(result, { autoPrint: true }); } else { saveState(); render(); } } catch (err) { alert(err.message === 'STAFF_INVITE_EMAIL_FAILED' ? 'دعوت ساخته شد اما ارسال ایمیل انجام نشد؛ لینک دعوت را از لیست کپی کنید و دستی بفرستید.' : err.message); } });
  }
  document.querySelectorAll('[data-schedule-week]').forEach(btn => btn.addEventListener('click', () => { scheduleWeekOffset += btn.dataset.scheduleWeek === 'next' ? 1 : -1; render(); }));
  document.querySelectorAll('[data-weekly-schedule-form]').forEach(form => {
    form.addEventListener('submit', (e) => e.preventDefault());
    form.querySelectorAll('[data-shift-time]').forEach(input => {
      input.addEventListener('input', () => updateWeeklyScheduleRowTotalFromInputs(form.closest('tr')));
      input.addEventListener('blur', () => { const normalized = normalizeShiftTimeInput(input.value); input.value = normalized ? faNum(normalized) : ''; updateWeeklyScheduleRowTotalFromInputs(form.closest('tr')); saveWeeklyScheduleCell(form, customer.id); });
      input.addEventListener('change', () => { const normalized = normalizeShiftTimeInput(input.value); input.value = normalized ? faNum(normalized) : ''; updateWeeklyScheduleRowTotalFromInputs(form.closest('tr')); saveWeeklyScheduleCell(form, customer.id); });
    });
    const note = form.querySelector('[name="note"]');
    if (note) note.addEventListener('input', () => { const key = `${form.querySelector('[name="staffUserId"]').value}:${form.querySelector('[name="date"]').value}`; clearTimeout(weeklyScheduleSaveTimers.get(key)); weeklyScheduleSaveTimers.set(key, setTimeout(() => saveWeeklyScheduleCell(form, customer.id), 450)); });
    form.querySelector('[data-clear-weekly-schedule]')?.addEventListener('click', () => { try { saveWeeklyScheduleCell(form, customer.id, { clear: true }); } catch (err) { alert(err.message); } });
  });
}

window.addEventListener('hashchange', render);
if (portalMode) {
  ensurePortalCustomerSession(portalIdentity);
  saveState(state);
}
render();
setInterval(updateBusinessDateLineDom, 15000);
initSharedStateSync();
