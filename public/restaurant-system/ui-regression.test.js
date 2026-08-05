const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'core.js'), 'utf8');

function mustContain(source, needle, message) {
  assert(source.includes(needle), message || `Expected source to contain: ${needle}`);
}





// Header logo must use the user-provided restaurant-system image asset, not the old inline SVG or a temporary mark.
assert(app.includes('./assets/restaurant-system-logo.png?v=system-logo-cropped-noframe-35') && app.includes('alt="لوگوی سامانه رستوران"'), 'لوگوی هدر باید از عکس ارسالی کاربر به عنوان لوگوی سامانه استفاده کند');
assert(!app.includes('restaurant-logo-svg') && !app.includes('restaurant-logo-cloche'), 'لوگوی SVG قدیمی نباید در هدر سامانه باقی بماند');
assert(styles.includes('.app-logo.restaurant-graphic-logo img') && styles.includes('object-fit:contain!important'), 'لوگوی تصویری باید با CSS مناسب داخل هدر نمایش داده شود');
assert(styles.includes('border-radius:0!important') && styles.includes('box-shadow:none!important') && styles.includes('transform:none!important'), 'لوگوی PNG باید بدون کادر/قاب و بدون برش یا زوم مخرب نمایش داده شود');

// Personnel correction: add staff/list are popup buttons, personnel code is automatic, schedule/list are printable.
assert(app.includes('data-open-staff-modal') && app.includes('renderStaffCreateModal(staffUsers)') && app.includes('id="staffForm" role="dialog"'), 'افزودن پرسنل باید دکمه باشد و فرم فعلی را به صورت پاپ‌آپ باز کند');
assert(app.includes('function nextPersonnelCode') && app.includes('state.staffUsers || [])') && app.includes('let code = 1001') && app.includes('data-auto-personnel-code') && app.includes('readonly'), 'کد پرسنلی باید خودکار و از ۱۰۰۱ به بعد ساخته شود');
assert(app.includes('data-open-staff-list-modal') && app.includes('renderStaffListModal(staffUsers)') && app.includes('data-print-staff-list') && app.includes('staff-user-edit-form'), 'زیر افزودن پرسنل باید دکمه لیست پرسنل با پرینت و ادیت باز شود');
assert(app.includes('data-print-weekly-schedule') && styles.includes('.weekly-schedule-print-decal'), 'برنامه کاری باید قابلیت پرینت داشته باشد');
assert(styles.includes('Personnel modal workflow: add/list buttons open printable/editable popups.') && styles.includes('.personnel-modal-overlay') && styles.includes('@media print'), 'پاپ‌آپ‌های پرسنلی و پرینت باید CSS اختصاصی داشته باشند');

// Cashier role must not see or open the hall table-layout/settings action.
mustContain(app, "function canManageHallTableLayout() {", 'Hall table layout permission helper must exist.');
mustContain(app, "return currentRole() === 'manager';", 'Hall table layout must be manager-only.');
mustContain(app, "const tableLayoutButton = canManageHallTableLayout() ?", 'Layout button must be conditionally rendered.');
mustContain(app, "${tableLayoutButton}", 'Hall toolbar must use the conditional table-layout button.');
mustContain(app, "if (!hallTableConfigOpen || !canManageHallTableLayout()) return '';", 'Layout popup must not render for cashier sessions.');
mustContain(app, 'ensurePortalCustomerSession(portalIdentity);', 'Portal dashboard iframe must pre-authenticate the restaurant shell before first render.');
assert(app.lastIndexOf('ensurePortalCustomerSession(portalIdentity);') < app.lastIndexOf('render();'), 'Portal pre-auth must happen before first render so internal login is never shown in dashboard iframe.');
assert(!app.includes('مسیر تست واقعی') && !app.includes('قابل کلیک</span></div><div class="flow"'), 'Dashboard must not render the old مسیر تست واقعی panel.');
assert(app.includes('dashboard-customer-layout') && app.includes('dashboard-left-stack') && app.includes('dashboard-top-cards') && app.includes('dashboard-public-link-panel') && !app.slice(app.indexOf('function renderDashboard'), app.indexOf('function renderDashboardReadinessShortcuts')).includes('renderDashboardReadinessShortcuts(customer)') && styles.includes('Customer-facing dashboard: no internal launch checklist'), 'Customer dashboard must not render internal readiness/checklist panels.');
mustContain(app, "if (!canManageHallTableLayout()) return; hallTableConfigOpen = true", 'Layout open handler must guard direct/legacy clicks.');
assert(!app.includes("<button type=\"button\" class=\"hall-table-trigger hall-table-layout-trigger\" data-open-hall-table-config>${tableIconMarkup}<b>چیدمان میزهای سالن</b></button></div>"), 'Unconditional table-layout button must not come back.');

// Cache bust should change with this UI behavior so browser smoke checks are not stale.
mustContain(html, 'styles.css?v=system-logo-cropped-noframe-35');
mustContain(html, 'core.js?v=system-logo-cropped-noframe-35');
mustContain(html, 'app.js?v=system-logo-cropped-noframe-35');
mustContain(app, 'placeholder="--:--"', 'Start/end shift time boxes must show manager-fillable --:-- placeholders.');
assert(!app.includes('class="shift-note-field">توضیحات'), 'Weekly schedule note field must not show the extra توضیحات label because the placeholder already says توضیح شیفت.');
mustContain(styles, 'grid-template-areas:"start end clear" "note note note"', 'Weekly schedule start and end fields must sit on one physical row.');

// Sales/Cashier page buttons should use the glossy pill shape from the user's reference image without changing sizes.
mustContain(app, 'data-current-tab="${esc(currentTab)}"', 'Content root must expose current tab for scoped cashier styling.');
mustContain(styles, '.content[data-current-tab="sales"] button:not(.modal-close-icon):not(.calculator-close)', 'Glossy pill styling must be scoped to the Sales/Cashier page.');
mustContain(styles, 'border-radius:999px!important;', 'Sales buttons must use a rounded capsule/pill form.');
mustContain(styles, 'linear-gradient(180deg,rgba(255,255,255,.82)', 'Sales buttons must include a glossy top highlight band.');
mustContain(styles, 'inset 0 -7px 10px rgba(15,23,42,.24)', 'Sales buttons must include a darker lower bevel.');
mustContain(styles, 'color:#fff!important;', 'Sales button text must be forced to a readable high-contrast color.');
mustContain(styles, '-webkit-text-fill-color:#fff!important;', 'Sales button text fill must override inherited theme colors.');
mustContain(styles, '.content[data-current-tab="sales"] button:not(.modal-close-icon):not(.calculator-close) *', 'Nested button labels/icons must inherit readable contrast, not old text colors.');
mustContain(styles, 'rgba(255,255,255,.92)', 'Menu chip price text must remain readable on glossy buttons.');
mustContain(styles, '.content[data-current-tab="sales"] .pos-channel-tabs button.active', 'Active sales channel must remain visually distinct.');
mustContain(styles, '.content[data-current-tab="sales"] .hall-category-tabs button.active', 'Active cashier category must remain visually distinct.');
mustContain(styles, '.content[data-current-tab="sales"] .hall-table-card.active', 'Selected table must remain visually distinct.');
mustContain(styles, '.content[data-current-tab="sales"] button.hall-table-card.open-order', 'Tables with open orders must have a distinct warning state.');
mustContain(styles, '.content[data-current-tab="sales"] button.hall-table-card.waiting-payment', 'Tables waiting for payment must have a distinct payment state.');
mustContain(styles, 'outline:3px solid color-mix(in srgb,var(--accent) 34%,transparent)!important;', 'Active buttons need a visible outline/ring cue after glossy styling.');
mustContain(styles, 'POS table picker fixed status colors', 'Table status colors must be locked after theme-independent POS category colors.');
mustContain(styles, 'html body .app-shell.theme-midnight .hall-table-picker-grid button.hall-table-card.free', 'Free table cards must stay orange in night theme.');
mustContain(styles, 'html body .app-shell.theme-emerald .hall-table-picker-grid button.hall-table-card.open-order', 'Open-order table cards must stay active red in emerald theme.');
mustContain(styles, '.content[data-current-tab="sales"] button:not(.modal-close-icon):not(.calculator-close):active:not(:disabled)', 'Sales buttons need pressed state feedback.');
mustContain(styles, '.app-shell.theme-midnight .content[data-current-tab="sales"] button:not(.modal-close-icon):not(.calculator-close)', 'Glossy cashier buttons must stay theme-aware in night mode.');
assert(!styles.includes('border-width:1.5px!important;'), 'Glossy form must not change button size through forced thicker borders.');

console.log('ui-regression.test.js: ok');


function testThemeHarmonyForCashierTablesAndPos() {
  const assert = require('assert');
  const fs = require('fs');
  const styles = fs.readFileSync('./styles.css', 'utf8');
  const index = fs.readFileSync('./index.html', 'utf8');
  assert(styles.includes('POS table picker fixed status colors') && styles.includes('html body .app-shell.theme-midnight .hall-table-picker-grid button.hall-table-card.free') && styles.includes('html body .app-shell.theme-emerald .hall-table-picker-grid button.hall-table-card.open-order'), 'میز آزاد باید نارنجی ثابتِ دسته‌بندی غیرفعال و میز با سفارش باز قرمز ثابتِ دسته‌بندی فعال باشد و با تم عوض نشود');
  assert(styles.includes('Theme harmony high-specificity overrides') && styles.includes('.app-shell .hall-order-category-panel .hall-category-tabs button.active') && styles.includes('.app-shell .hall-order-category-panel .hall-table-trigger'), 'قوانین هماهنگی تم باید با specificity بالاتر روی تب‌ها و دکمه میز اثر کند');
  assert(styles.includes('POS lower category bar final fit') && styles.includes('flex:0 0 clamp(150px,18vw,190px)!important') && styles.includes('height:54px!important') && styles.includes('overflow-y:visible!important'), 'دسته‌بندی‌های پایین صندوق در نسخه آنلاین باید پهن، وسط‌چین و بدون کلیپ عمودی باشند');
  assert(styles.includes('POS category/channel glossy red-orange parity') && styles.includes('.app-shell .pos-channel-tabs button,') && styles.includes('background:linear-gradient(180deg,#fff3eb 0%,#fb8a42 42%,#c94812 100%)!important') && styles.includes('background:linear-gradient(180deg,#fff0ef 0%,#f04438 38%,#c5122f 100%)!important') && styles.includes('POS inactive channel/category final override') && styles.includes('.app-shell .hall-order-category-panel .hall-category-tabs button:not(.active)'), 'نسخه آنلاین باید لاین دسته‌بندی پایین را از نظر فرم و رنگ مثل لاین فروش سالن/دلیوری/اسنپ‌فود کند');
  assert(styles.includes('POS category line theme-aware final override') && styles.includes('.app-shell.theme-sunrise .hall-order-category-panel .hall-category-side{background:linear-gradient(135deg,#fff3ed,#ffe7dd)!important') && styles.includes('.app-shell.theme-midnight .hall-order-category-panel .hall-category-side{background:linear-gradient(135deg,rgba(30,41,59,.96),rgba(17,24,39,.98))!important') && styles.includes('background:linear-gradient(135deg,color-mix(in srgb,var(--surface-strong,#fff) 78%,var(--primary) 18%)'), 'لاین دسته‌بندی پایین صندوق در نسخه آنلاین باید در تم‌های غیرآفتابی از پالت همان تم باشد و کرم ثابت نماند');
  assert(styles.includes('POS fixed dual-line online scoped override') && styles.includes('html body .app-shell.theme-midnight .content[data-current-tab="sales"] .pos-channel-tabs button') && styles.includes('html body .app-shell.theme-emerald .content[data-current-tab="sales"] #hallSaleForm .hall-category-tabs button') && styles.includes('POS fixed dual-line style') && styles.includes('html body .app-shell.theme-midnight .pos-channel-tabs button') && styles.includes('html body .app-shell.theme-emerald #hallSaleForm .hall-category-tabs button') && styles.includes('html body .app-shell.theme-sunrise #hallSaleForm .hall-category-tabs') && styles.includes('background:linear-gradient(180deg,#fff0ef 0%,#f04438 38%,#c5122f 100%)!important') && styles.includes('background:linear-gradient(180deg,#fff3eb 0%,#fb8a42 42%,#c94812 100%)!important') && styles.includes('background:linear-gradient(135deg,#fff3ed,#ffe7dd)!important'), 'لاین فروش سالن/دلیوری/اسنپ‌فود و لاین دسته‌بندی صندوق باید یک استایل ثابت مستقل از تم داشته باشند: فعال قرمز، غیرفعال نارنجی، متن سفید و نوار دسته‌بندی ثابت');
  assert(styles.includes('POS channel/category active pill final restore') && styles.includes('html body .app-shell.theme-midnight .pos-channel-tabs button.active') && styles.includes('background:linear-gradient(180deg,#fff0ef 0%,#f04438 38%,#c5122f 100%)!important') && styles.includes('html body .app-shell #hallSaleForm .hall-category-tabs button:not(.active)') && styles.includes('POS category strip real-local fallback') && styles.includes('html body .app-shell.theme-midnight #hallSaleForm .hall-category-side') && styles.includes('POS category strip absolute final: Kaveh screenshot fix') && styles.includes('POS category strip absolute final: Kaveh screenshot fix') && styles.includes('html body .app-shell.theme-midnight .content[data-current-tab="sales"] #hallSaleForm .hall-category-side') && styles.includes('background:linear-gradient(135deg,#111827 0%,#172033 52%,#0f172a 100%)!important'), 'نوار پشت دسته‌بندی در تم شب باید با override نهایی تیره شود و کرم آفتابی نماند');
  assert(index.includes('styles.css?v=system-logo-cropped-noframe-35') && index.includes('core.js?v=system-logo-cropped-noframe-35') && index.includes('app.js?v=system-logo-cropped-noframe-35'), 'cache-bust هماهنگی تم باید روی نسخه آنلاین هم اعمال شود');
}

testThemeHarmonyForCashierTablesAndPos();
console.log('PASS testThemeHarmonyForCashierTablesAndPos');

// Customer/settings tab must hide internal/developer panels.
const accountSource = app.slice(app.indexOf('function renderAccount(customer)'), app.indexOf('function renderPurchaseInvoiceLineRow'));
assert(app.includes("['dashboard','داشبورد'],['personnel','پرسنلی']") && !app.includes("['account','مشتری/پکیج']"), 'Customer/package nav label must become settings.');
for (const banned of ['پکیج مشتری','چک‌لیست آمادگی راه‌اندازی','خط زمانی رویدادهای امنیتی','نقشه مهاجرت به نسخه واقعی','طرح ورود امن نسخه واقعی']) {
  assert(!accountSource.includes(banned), `${banned} must not be visible in customer settings UI.`);
}
const personnelSource = app.slice(app.indexOf('function renderPersonnel(customer)'), app.indexOf('function renderAccount(customer)'));
assert(!accountSource.includes('staffForm') && personnelSource.includes('افزودن پرسنل') && personnelSource.includes('دعوت ایمیلی نقش‌های حساس') && personnelSource.includes('بازیابی رمز عبور') && accountSource.includes('پشتیبان‌گیری و بازیابی') && accountSource.includes('مشخصات رستوران'), 'Personnel must be a standalone module and settings must keep backup/profile only.');

assert(app.includes("['dashboard','داشبورد'],['personnel','پرسنلی']") && app.includes('ایجاد پین و دسترسی ورود') && app.includes('برنامه کاری') && app.includes('محاسبه حقوق و دستمزد') && app.includes('اثر انگشت و اسکنر اکسترنال'), 'Personnel HR/attendance/fingerprint UI contract must exist.');
assert(coreSource.includes('function clockInStaff') && coreSource.includes('function calculateStaffPayroll') && coreSource.includes('getFingerprintDeviceContract'), 'Personnel HR core contract must exist.');
assert(styles.includes('HR/personnel module: real personnel file'), 'Personnel HR CSS contract must exist.');

assert(app.includes('function formatNationalIdInput') && app.includes('data-national-id') && app.includes('placeholder="۰۰۹-۶۵۷۸۴۳-۵"'), 'National ID input must format Persian visual example.');
assert(coreSource.includes('function normalizeNationalId') && coreSource.includes('digits.slice(0, 3)'), 'Core must normalize national ID as Persian 3-6-1 visual format.');

assert(app.includes('field-label-inline') && app.includes('field-optional') && styles.includes('.field-label-inline') && styles.includes('.field-optional{display:inline!important'), 'ایمیل و (اختیاری) باید در یک خط کنار هم باشند و فاصله اضافه نسازند');
