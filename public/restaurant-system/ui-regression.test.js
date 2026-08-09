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
assert(app.includes('./assets/restaurant-system-logo.png?v=attendance-early-late-choice-46') && app.includes('alt="لوگوی سامانه رستوران"'), 'لوگوی هدر باید از عکس ارسالی کاربر به عنوان لوگوی سامانه استفاده کند');
assert(!app.includes('restaurant-logo-svg') && !app.includes('restaurant-logo-cloche'), 'لوگوی SVG قدیمی نباید در هدر سامانه باقی بماند');
assert(styles.includes('.app-logo.restaurant-graphic-logo img') && styles.includes('object-fit:contain!important'), 'لوگوی تصویری باید با CSS مناسب داخل هدر نمایش داده شود');
assert(styles.includes('border-radius:0!important') && styles.includes('box-shadow:none!important') && styles.includes('transform:none!important'), 'لوگوی PNG باید بدون کادر/قاب و بدون برش یا زوم مخرب نمایش داده شود');

// Personnel correction: add staff/list are popup buttons, personnel code is automatic, schedule/list are printable.
assert(app.includes('data-open-staff-modal') && app.includes('renderStaffCreateModal(staffUsers)') && app.includes('id="staffForm" role="dialog"'), 'افزودن پرسنل باید دکمه باشد و فرم فعلی را به صورت پاپ‌آپ باز کند');
assert(app.includes('function nextPersonnelCode') && app.includes('state.staffUsers || [])') && app.includes('let code = 1001') && app.includes('data-auto-personnel-code') && app.includes('readonly'), 'کد پرسنلی باید خودکار و از ۱۰۰۱ به بعد ساخته شود');
assert(app.includes('data-open-staff-list-modal') && app.includes('renderStaffListModal(staffUsers)') && app.includes('data-print-staff-list') && app.includes('staff-user-edit-form'), 'زیر افزودن پرسنل باید دکمه لیست پرسنل با پرینت و ادیت باز شود');
assert(app.includes('data-print-weekly-schedule') && styles.includes('.weekly-schedule-print-decal'), 'برنامه کاری باید قابلیت پرینت داشته باشد');
assert(app.includes('document.body.dataset.personnelPrintTarget') && app.includes("printRoot.id = 'personnelPrintRoot'") && app.includes('function prepareWeeklySchedulePrintClone') && app.includes("clone.querySelector(':scope > p')?.remove()") && app.includes("clone.querySelector('.weekly-schedule-note')?.remove()") && app.includes(".schedule-clear-decal,.weekly-schedule-toolbar button") && app.includes("if (!note) { label.remove(); return; }") && app.includes("target.classList.contains('staff-list-modal') ? 'staff-list' : 'weekly-schedule'"), 'پرینت پرسنلی باید قبل از window.print هدف لیست یا برنامه کاری را روی body بگذارد تا CSS چاپ صفحه را خالی نکند');
assert(styles.includes(':not(#personnelPrintRoot){display:none!important}') && styles.includes('#personnelPrintRoot{display:block!important') && styles.includes('@page weeklyScheduleLandscape{size:A4 landscape;margin:7mm}') && styles.includes('#personnelPrintRoot[data-personnel-print-target=\"weekly-schedule\"]{page:weeklyScheduleLandscape}') && styles.includes('grid-template-areas:\"start end\" \"note note\"') && styles.includes('staff-schedule-weekly-panel>p') && styles.includes('.weekly-schedule-note') && styles.includes('.schedule-clear-decal{display:none!important}') && styles.includes('body.personnel-printing #app{display:none!important}') && styles.includes('body[data-personnel-print-target=\"staff-list\"] .staff-list-modal') && styles.includes('body[data-personnel-print-target=\"weekly-schedule\"] .personnel-workspace>.staff-schedule-weekly-panel'), 'CSS چاپ پرسنلی باید ریشه اختصاصی پرسنل را از قانون عمومی چاپ مستثنا کند و خود #app را چاپ نکند');
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
mustContain(html, 'styles.css?v=restaurant-switcher-inline-75');
mustContain(html, 'core.js?v=restaurant-switcher-inline-75');
mustContain(html, 'app.js?v=restaurant-switcher-inline-75');
mustContain(html, 'core.js?v=restaurant-switcher-inline-75');
mustContain(app, 'if (!customer.businessName) customer.businessName = portalIdentity.businessName;', 'Portal identity must seed a new account only; it must not overwrite saved owner profile edits on every sync pull.');
mustContain(app, 'if (!customer.ownerName) customer.ownerName = portalIdentity.ownerName;', 'Portal identity must not revert edited owner name after remote sync refresh.');
assert(!app.includes('customer.businessName = portalIdentity.businessName || customer.businessName'), 'Owner profile edits must not be overwritten by stale tenant identity.');
assert(!app.includes('customer.ownerName = portalIdentity.ownerName || customer.ownerName'), 'Owner name edits must not be overwritten by stale auth metadata.');
mustContain(app, 'const portalStaffLoginMode = portalMode && portalParams.get(\'staffLogin\') === \'1\';', 'Online restaurant iframe must support a dedicated staff-login mode.');
mustContain(app, 'ورود کارکنان آنلاین', 'Online staff-login mode must render a visible staff login screen.');
mustContain(app, '/api/staff-invite-email', 'Online staff invitations must call the real email API.');
mustContain(app, 'sendStaffInvitationEmail', 'Online staff invitations must trigger a real Supabase email send.');
mustContain(app, '/api/staff-invitation?token=', 'Portal invite links must validate through a public token API instead of private owner state.');
mustContain(app, "fetch('/api/staff-invitation'", 'Portal invite acceptance must write staff accounts through the public token API.');
mustContain(app, 'حساب کارکنان فعال شد', 'Accepted invite should show a clear staff-account activation success screen.');
mustContain(app, 'تنظیم سرور دعوت کارکنان ناقص است', 'If Vercel lacks the server Supabase key, staff invite links must show a precise setup error instead of a fake invalid-link message.');
mustContain(app, 'نه anon/publishable key', 'If Vercel has an anon or low-permission Supabase key, staff invite links must say to use the service_role key.');
const staffInviteEmailRoute = fs.readFileSync(path.join(root, '..', '..', 'app', 'api', 'staff-invite-email', 'route.ts'), 'utf8');
mustContain(staffInviteEmailRoute, "new URL('/auth/callback'", 'Supabase invite emails must authenticate through the hosted callback, not redirect to localhost or a raw static page.');
mustContain(staffInviteEmailRoute, "callback.searchParams.set('next', inviteLink)", 'Staff invite auth callback must preserve the portal invite token destination.');
mustContain(staffInviteEmailRoute, 'staff-invite-email-69', 'Staff invite email API version must reflect staff row invite details fix.');
mustContain(staffInviteEmailRoute, 'const existingAuthUser = Boolean', 'Inviting an existing manager email into another restaurant must detect the already-registered auth user.');
mustContain(staffInviteEmailRoute, 'shouldCreateUser: !existingAuthUser', 'Existing manager emails must receive a magic-link invite without trying to create a duplicate Supabase Auth user.');
mustContain(coreSource, "const email = normalizeEmailForAuth(input.email || '')", 'Staff invitations must normalize email per restaurant before duplicate checks.');
mustContain(coreSource, "existingStaff && existingStaff.role === 'manager'", 'The same manager email may exist in another restaurant but should only be blocked if already active in this restaurant.');
assert(!coreSource.includes('u.customerId === customerId && u.email === input.email'), 'Staff invitation duplicate checks must not use raw same-email comparison that breaks existing cross-restaurant manager emails.');
mustContain(app, 'data-send-staff-invitation', 'Staff invite action must live inside the selected staff detail form, not in a separate invite box.');
mustContain(app, 'data-staff-list-search', 'Staff list must have an internal search field.');
mustContain(app, 'sortStaffUsersByName', 'Staff list must sort employees alphabetically before rendering.');
mustContain(app, 'data-select-staff-user', 'Staff list must first show clickable employee name/code rows.');
mustContain(app, 'staff-detail-panel', 'Staff detail form must open separately after selecting an employee.');
mustContain(app, "querySelectorAll('.staff-list-option[data-staff-search]')", 'Staff search must filter the name/code list, not full edit forms.');
mustContain(styles, 'Staff list master/detail', 'Staff list must use a master/detail layout.');
mustContain(styles, '.staff-list-option{display:grid;grid-template-columns:1fr auto', 'Staff list rows must show name and personnel code compactly.');
mustContain(styles, '.staff-list-master-detail{display:grid;grid-template-columns', 'Staff modal must separate alphabetical list from detail form.');
mustContain(styles, '.staff-user-list{max-height:62vh!important;overflow-y:auto!important', 'Staff list modal must have internal up/down scrolling.');
mustContain(styles, 'Mobile staff list modal fix', 'Staff list modal must have a dedicated mobile responsive fix.');
mustContain(styles, 'Mobile staff list modal hard override', 'Staff list modal must force mobile tools/search inside the card, not clipped outside it.');
mustContain(styles, 'grid-template-rows:56px auto auto minmax(0,1fr) auto', 'Mobile staff list grid must reserve separate rows for tools, title, search, and scroll list.');
mustContain(styles, '.personnel-modal-overlay:has(.staff-list-modal) .staff-list-modal .modal-close-icon', 'Mobile close/print buttons must override old absolute positioning.');
mustContain(styles, 'height:calc(100dvh - max(96px,calc(env(safe-area-inset-bottom) + 96px)))', 'Mobile staff list must fit inside the visible phone viewport and above browser bars.');
mustContain(styles, '.staff-user-edit-grid{display:grid!important;grid-template-columns:1fr!important', 'Mobile staff rows must collapse to one column so fields/search/buttons are not clipped.');
mustContain(styles, '.staff-user-actions{display:grid!important;grid-template-columns:1fr!important', 'Mobile staff row action buttons must stack full-width and remain reachable.');
mustContain(app, 'personnelCode: invitation.personnelCode', 'Staff invite emails must receive personnel code metadata.');
mustContain(app, 'jobTitle: invitation.jobTitle', 'Staff invite emails must receive job title metadata.');
mustContain(staffInviteEmailRoute, 'staff_invite_personnel_code', 'Staff invite email metadata must include personnel code.');
mustContain(staffInviteEmailRoute, 'staff_invite_job_title', 'Staff invite email metadata must include job title.');
assert(!app.includes('id="invitationForm"'), 'Standalone invite-link creation box must be removed from personnel page.');
mustContain(app, "RestaurantCore.loginWithStaffCode(state, toEnglishDigits(f.get('personnelCode')), toEnglishDigits(f.get('pin')), scopedCustomerId)", 'Online staff PIN login must be scoped to the current portal restaurant.');
mustContain(app, 'if (portalStaffLoginMode)', 'Portal auto-owner session must not hide the staff login screen in staff-login mode.');
const dashboardSource = fs.readFileSync(path.join(root, '..', '..', 'app', 'app', 'dashboard', 'page.tsx'), 'utf8');
const loginPageSource = fs.readFileSync(path.join(root, '..', '..', 'app', 'login', 'page.tsx'), 'utf8');
const authActionsSource = fs.readFileSync(path.join(root, '..', '..', 'app', 'auth', 'actions.ts'), 'utf8');
const managerSessionSource = fs.readFileSync(path.join(root, '..', '..', 'lib', 'restaurant', 'manager-session.ts'), 'utf8');
const restaurantStateApiSource = fs.readFileSync(path.join(root, '..', '..', 'app', 'api', 'restaurant-state', 'route.ts'), 'utf8');
mustContain(dashboardSource, "staffLogin ? '&staffLogin=1' : ''", 'Online dashboard must pass staffLogin=1 into the embedded restaurant iframe.');
mustContain(dashboardSource, 'restaurant-switcher-inline-75', 'Dashboard iframe cache-bust token must match the online multi-restaurant manager invite fix.');
mustContain(loginPageSource, 'href="/app/dashboard?staffLogin=1"', 'Online login page must expose a visible ورود کارکنان link.');
mustContain(loginPageSource, 'رمز عبور مالک / پین مدیر', 'Owner login page must also accept manager email + PIN from the same form.');
mustContain(loginPageSource, 'انتخاب رستوران', 'If an owner/manager belongs to multiple restaurants, login must show a restaurant chooser.');
mustContain(loginPageSource, 'isRestaurantChoiceStep ? (', 'When restaurant choices are shown, the login page must switch to a chooser-only step.');
mustContain(loginPageSource, ') : (', 'Restaurant chooser step must be separate from the email/password login form.');
assert(!loginPageSource.includes('{choice.restaurantName} — {choice.managerName}'), 'Manager restaurant chooser options must show only restaurant name, not manager name.');
mustContain(authActionsSource, 'findManagerRestaurantChoices(email, password)', 'Failed owner-password login must fall back to manager email+PIN lookup.');
mustContain(authActionsSource, 'setPendingManagerChoices(choices)', 'Multiple manager-restaurant matches must be stored temporarily for explicit choice.');
mustContain(managerSessionSource, "user?.role === 'manager'", 'Remote email+PIN login must be allowed only for staff users with manager role.');
mustContain(managerSessionSource, "normalizeEmail(staff.email) !== normalizedEmail", 'Manager remote login must use the invited manager email, not personnel code.');
assert(restaurantStateApiSource.indexOf('const manager = await getManagerSession();') < restaurantStateApiSource.indexOf('const { data, error } = await supabase.auth.getUser();'), 'Restaurant state API must prioritize signed manager sessions over stale owner Supabase auth.');
assert(authActionsSource.includes('await supabase.auth.signOut();') && authActionsSource.includes('await clearOwnerTenantSelection();') && authActionsSource.includes('await setManagerSession(choices[0], choices);'), 'Manager login must clear stale owner Supabase auth/cookie before setting manager session.');
mustContain(managerSessionSource, 'const authenticatedChoices = await collectManagerRestaurantChoices(email, pin)', 'Manager PIN should authenticate the email once before listing all active manager restaurants.');
mustContain(managerSessionSource, 'return collectManagerRestaurantChoices(email);', 'After manager authentication, all active manager restaurants across owners must be shown.');

const tenantSource = fs.readFileSync(path.join(root, '..', '..', 'lib', 'restaurant', 'tenant.ts'), 'utf8');
const tenantSwitchRouteSource = fs.readFileSync(path.join(root, '..', '..', 'app', 'api', 'tenant-switch', 'route.ts'), 'utf8');
assert(tenantSwitchRouteSource.indexOf('const managerSwitched = await switchManagerRestaurant(tenantId);') < tenantSwitchRouteSource.indexOf('const supabase = await createClient();'), 'Tenant switch API must try manager memberships before owner tenants so stale owner auth cannot leak owner restaurants into a manager session.');
mustContain(loginPageSource, 'ownerChoices', 'Owner login must show a restaurant chooser when one owner account owns multiple restaurants.');
mustContain(authActionsSource, 'getOwnerTenantChoices(supabase, data.user)', 'Owner password login must inspect all owned restaurants before entering the dashboard.');
mustContain(authActionsSource, 'chooseOwnerRestaurantAction', 'Owner restaurant chooser must set the selected tenant explicitly.');
mustContain(tenantSource, 'OWNER_TENANT_COOKIE', 'Selected owner restaurant must be stored server-side so dashboard/API use the chosen tenant.');
mustContain(tenantSource, 'getOwnerTenantChoices', 'Owner tenant lookup must return every restaurant owned by the same auth identity.');
mustContain(restaurantStateApiSource, 'ownerTenantChoicesFor(ownerTenants)', 'Restaurant state API must expose tenant choices to the embedded app for in-panel switching.');
mustContain(managerSessionSource, 'tenantChoices: publicManagerChoices(availableChoices)', 'Manager session must keep all allowed restaurants so managers can switch without logout.');
mustContain(managerSessionSource, "admin.from('restaurants').select('tenant_id,name').in('tenant_id', tenantIds)", 'Manager multi-restaurant choices must prefer the real restaurant table name over a stale customer/owner name.');
mustContain(managerSessionSource, 'restaurantNames.get(row.tenant_id) || tenantNames.get(row.tenant_id)', 'Manager header/dropdown must use server restaurant/tenant names before falling back to mutable customer businessName.');
mustContain(managerSessionSource, 'async function collectManagerRestaurantChoices', 'Manager restaurant lookup must be reusable for login and existing signed-session refresh.');
mustContain(managerSessionSource, 'export async function refreshManagerRestaurantChoices', 'Existing manager cookies must refresh all allowed restaurants from server state.');
mustContain(managerSessionSource, 'const refreshedChoices = await refreshManagerRestaurantChoices(session)', 'getManagerSession must not trust stale one-restaurant cookie choices.');
mustContain(managerSessionSource, 'setManagerSession(activeChoice, refreshedChoices)', 'Refreshed manager choices must be written back into the signed session cookie.');
const authActionsSourceForSignup = authActionsSource;
mustContain(authActionsSourceForSignup, 'signInWithPassword({ email, password })', 'Signup with an existing owner email must first verify the old password instead of pretending a new auth user was created.');
mustContain(authActionsSourceForSignup, 'createTenantForOwner(supabase, existingLogin.data.user, businessName)', 'Existing owner signup path must create a second restaurant/tenant under the same owner account.');
mustContain(authActionsSourceForSignup, 'signUpData.user.identities.length === 0', 'Supabase existing-email concealed signup response must not show a fake success message.');
mustContain(authActionsSourceForSignup, 'این ایمیل قبلاً حساب مالک دارد', 'Existing owner email must get a clear Persian message, not a misleading email-confirmation success.');
mustContain(tenantSwitchRouteSource, 'chooseOwnerTenantForUser', 'Tenant switch API must allow owners to switch only to restaurants they own.');
mustContain(tenantSwitchRouteSource, 'switchManagerRestaurant', 'Tenant switch API must allow managers to switch among their signed restaurant choices.');
mustContain(app, 'data-tenant-switcher', 'Authenticated restaurant header must render an in-app restaurant switcher when portal identity has multiple tenant choices.');
assert(!app.includes('فقط همین رستوران'), 'Single-restaurant header must not show فقط همین رستوران.');
mustContain(app, "fetch('/api/tenant-switch'", 'In-app restaurant switcher must change restaurant without logout/login.');
mustContain(styles, '.header-tenant-switcher', 'Restaurant switcher must have dedicated header styling.');
mustContain(app, 'function activeRestaurantHeaderName(customer)', 'Authenticated header must compute restaurant context separately from owner/manager identity.');
mustContain(app, '${renderRestaurantSwitcher(customer)}', 'Authenticated header must render the restaurant switcher where the restaurant name used to be.');
mustContain(app, 'header-restaurant-select', 'Restaurant dropdown must sit inline beside the logout button as the restaurant context.');
mustContain(app, 'if (!customer && !portalIdentity.tenantId)', 'Portal tenant lookup must not match an old customer only by manager/owner email when a tenant id exists.');
assert(!app.includes('<strong class="header-restaurant-name">${esc(customer.businessName)}</strong>${renderRestaurantSwitcher'), 'Header must not show a separate stale customer/owner name before the restaurant dropdown.');

mustContain(app, "field === 'clockInAt'", 'Attendance display must only use createdAt for clock-in display.');
assert(!app.includes("row?.sourceOut === 'personnel-code-popup') && row?.createdAt) return iranClockTimeText"), 'Clock-out display must not reuse the clock-in createdAt time.');
mustContain(app, 'placeholder="--:--"', 'Start/end shift time boxes must show manager-fillable --:-- placeholders.');
assert(!app.includes('class="shift-note-field">توضیحات'), 'Weekly schedule note field must not show the extra توضیحات label because the placeholder already says توضیح شیفت.');
mustContain(styles, 'grid-template-areas:"start end clear" "note note note"', 'Weekly schedule start and end fields must sit on one physical row.');
mustContain(app, 'function updateWeeklyScheduleRowTotalFromInputs', 'Weekly schedule row total must be recalculated from visible inputs without waiting for a page refresh.');
mustContain(app, 'data-weekly-schedule-total', 'Weekly schedule total badge must have a stable selector for live updates.');
mustContain(app, "input.addEventListener('input', () => updateWeeklyScheduleRowTotalFromInputs(form.closest('tr')))", 'Typing start/end times must update weekly total immediately.');

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
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(styles.includes('POS table picker fixed status colors') && styles.includes('html body .app-shell.theme-midnight .hall-table-picker-grid button.hall-table-card.free') && styles.includes('html body .app-shell.theme-emerald .hall-table-picker-grid button.hall-table-card.open-order'), 'میز آزاد باید نارنجی ثابتِ دسته‌بندی غیرفعال و میز با سفارش باز قرمز ثابتِ دسته‌بندی فعال باشد و با تم عوض نشود');
  assert(styles.includes('Theme harmony high-specificity overrides') && styles.includes('.app-shell .hall-order-category-panel .hall-category-tabs button.active') && styles.includes('.app-shell .hall-order-category-panel .hall-table-trigger'), 'قوانین هماهنگی تم باید با specificity بالاتر روی تب‌ها و دکمه میز اثر کند');
  assert(styles.includes('POS lower category bar final fit') && styles.includes('flex:0 0 clamp(150px,18vw,190px)!important') && styles.includes('height:54px!important') && styles.includes('overflow-y:visible!important'), 'دسته‌بندی‌های پایین صندوق در نسخه آنلاین باید پهن، وسط‌چین و بدون کلیپ عمودی باشند');
  assert(styles.includes('POS category/channel glossy red-orange parity') && styles.includes('.app-shell .pos-channel-tabs button,') && styles.includes('background:linear-gradient(180deg,#fff3eb 0%,#fb8a42 42%,#c94812 100%)!important') && styles.includes('background:linear-gradient(180deg,#fff0ef 0%,#f04438 38%,#c5122f 100%)!important') && styles.includes('POS inactive channel/category final override') && styles.includes('.app-shell .hall-order-category-panel .hall-category-tabs button:not(.active)'), 'نسخه آنلاین باید لاین دسته‌بندی پایین را از نظر فرم و رنگ مثل لاین فروش سالن/دلیوری/اسنپ‌فود کند');
  assert(styles.includes('POS category line theme-aware final override') && styles.includes('.app-shell.theme-sunrise .hall-order-category-panel .hall-category-side{background:linear-gradient(135deg,#fff3ed,#ffe7dd)!important') && styles.includes('.app-shell.theme-midnight .hall-order-category-panel .hall-category-side{background:linear-gradient(135deg,rgba(30,41,59,.96),rgba(17,24,39,.98))!important') && styles.includes('background:linear-gradient(135deg,color-mix(in srgb,var(--surface-strong,#fff) 78%,var(--primary) 18%)'), 'لاین دسته‌بندی پایین صندوق در نسخه آنلاین باید در تم‌های غیرآفتابی از پالت همان تم باشد و کرم ثابت نماند');
  assert(styles.includes('POS fixed dual-line online scoped override') && styles.includes('html body .app-shell.theme-midnight .content[data-current-tab="sales"] .pos-channel-tabs button') && styles.includes('html body .app-shell.theme-emerald .content[data-current-tab="sales"] #hallSaleForm .hall-category-tabs button') && styles.includes('POS fixed dual-line style') && styles.includes('html body .app-shell.theme-midnight .pos-channel-tabs button') && styles.includes('html body .app-shell.theme-emerald #hallSaleForm .hall-category-tabs button') && styles.includes('html body .app-shell.theme-sunrise #hallSaleForm .hall-category-tabs') && styles.includes('background:linear-gradient(180deg,#fff0ef 0%,#f04438 38%,#c5122f 100%)!important') && styles.includes('background:linear-gradient(180deg,#fff3eb 0%,#fb8a42 42%,#c94812 100%)!important') && styles.includes('background:linear-gradient(135deg,#fff3ed,#ffe7dd)!important'), 'لاین فروش سالن/دلیوری/اسنپ‌فود و لاین دسته‌بندی صندوق باید یک استایل ثابت مستقل از تم داشته باشند: فعال قرمز، غیرفعال نارنجی، متن سفید و نوار دسته‌بندی ثابت');
  assert(styles.includes('POS channel/category active pill final restore') && styles.includes('html body .app-shell.theme-midnight .pos-channel-tabs button.active') && styles.includes('background:linear-gradient(180deg,#fff0ef 0%,#f04438 38%,#c5122f 100%)!important') && styles.includes('html body .app-shell #hallSaleForm .hall-category-tabs button:not(.active)') && styles.includes('POS category strip real-local fallback') && styles.includes('html body .app-shell.theme-midnight #hallSaleForm .hall-category-side') && styles.includes('POS category strip absolute final: Kaveh screenshot fix') && styles.includes('POS category strip absolute final: Kaveh screenshot fix') && styles.includes('html body .app-shell.theme-midnight .content[data-current-tab="sales"] #hallSaleForm .hall-category-side') && styles.includes('background:linear-gradient(135deg,#111827 0%,#172033 52%,#0f172a 100%)!important'), 'نوار پشت دسته‌بندی در تم شب باید با override نهایی تیره شود و کرم آفتابی نماند');
  assert(index.includes('styles.css?v=restaurant-switcher-inline-75') && index.includes('core.js?v=restaurant-switcher-inline-75') && index.includes('app.js?v=restaurant-switcher-inline-75'), 'cache-bust هماهنگی تم و ورود آنلاین کارکنان باید روی نسخه آنلاین هم اعمال شود');
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
assert(!accountSource.includes('staffForm') && personnelSource.includes('افزودن پرسنل') && app.includes('data-send-staff-invitation') && accountSource.includes('پشتیبان‌گیری و بازیابی') && accountSource.includes('مشخصات رستوران'), 'Personnel must be a standalone module and staff invites must live on personnel rows.');

mustContain(app, 'function attendanceManagementNoteLabel', 'Attendance notes must shorten labels to ورود زودتر / خروج دیرتر.');
mustContain(app, "return 'ورود زودتر'", 'Early entry note must read ورود زودتر — توضیح, not the long برنامه کاری text.');
mustContain(app, "return 'خروج دیرتر'", 'Late exit note must read خروج دیرتر — توضیح, not the long برنامه کاری text.');
mustContain(app, 'function attendanceManagementNotes', 'Attendance table must build multiline exception notes without an editable white textarea.');
mustContain(app, "join('<br>')", 'Attendance entry and exit exception notes must render on separate lines.');
assert(!app.includes('خارج از برنامه: '), 'Attendance notes must not show the old خارج از برنامه prefix.');
mustContain(app, 'function attendanceManagementRowClass', 'Attendance table must classify approved, pending, and no-approval schedule deviations.');
mustContain(app, "return 'schedule-deviation-no-approval'", 'Late entry / early exit should be a no-approval orange row.');
mustContain(app, '<div class="attendance-note-lines">${note || \'\'}</div>', 'Attendance notes cell must be plain text lines, not a white explanation box.');
const attendanceRowSource = app.slice(app.indexOf('function renderAttendanceManagementRow'), app.indexOf('function renderAttendanceManagementTable'));
assert(!attendanceRowSource.includes('<textarea name="reason"'), 'Attendance management row must not show the white توضیحات textarea box.');
mustContain(styles, '.attendance-row.pending-approval>td{background:#f4ff00!important', 'Unapproved attendance rows must be phosphor yellow in every theme.');
mustContain(styles, '.attendance-row.approved-approval>td{background:#39ff14!important', 'Approved attendance rows must be phosphor green in every theme.');
mustContain(styles, '.attendance-row.schedule-deviation-no-approval>td{background:#ff8c00!important', 'Late entry / early exit rows must be orange without approval.');

assert(app.includes("['dashboard','داشبورد'],['personnel','پرسنلی']") && app.includes('ایجاد پین و دسترسی ورود') && app.includes('برنامه کاری') && app.includes('محاسبه حقوق و دستمزد') && app.includes('اثر انگشت و اسکنر اکسترنال'), 'Personnel HR/attendance/fingerprint UI contract must exist.');
assert(coreSource.includes('function clockInStaff') && coreSource.includes('function calculateStaffPayroll') && coreSource.includes('getFingerprintDeviceContract'), 'Personnel HR core contract must exist.');
assert(styles.includes('HR/personnel module: real personnel file'), 'Personnel HR CSS contract must exist.');

assert(app.includes('function formatNationalIdInput') && app.includes('data-national-id') && app.includes('placeholder="۰۰۹-۶۵۷۸۴۳-۵"'), 'National ID input must format Persian visual example.');
assert(coreSource.includes('function normalizeNationalId') && coreSource.includes('digits.slice(0, 3)'), 'Core must normalize national ID as Persian 3-6-1 visual format.');

assert(app.includes('field-label-inline') && app.includes('field-optional') && styles.includes('.field-label-inline') && styles.includes('.field-optional{display:inline!important'), 'ایمیل و (اختیاری) باید در یک خط کنار هم باشند و فاصله اضافه نسازند');

mustContain(app, 'function setAttendanceModalActionState', 'Attendance popup must choose a single visible action.');
mustContain(app, 'inButton.hidden = !hasStaff || Boolean(openRecord)', 'Clock-in button must hide after staff already has open attendance.');
mustContain(app, 'outButton.hidden = !hasStaff || !openRecord', 'Clock-out button must show only for an already entered staff member.');
assert(!app.includes('فعلاً تا زمان اتصال اسکنر اثر انگشت') && !app.includes('مرحله بعدی: بعد از نصب اسکنر'), 'Extra explanatory text must be removed from attendance popup.');

assert(app.includes('data-delete-attendance=') && app.includes('>حذف</button>') && !app.includes('data-reject-attendance=') && !app.includes('>رد</button>'), 'در جدول ورود و خروج پرسنل دکمه رد باید با حذف جایگزین شود.');
  assert(app.includes("row.managerApproval === 'pending'") && styles.includes('Attendance approval visibility + black fixed identity/schedule fields') && styles.includes('.attendance-management-table .attendance-row:not(.pending-approval) [data-save-attendance-row]{display:none!important') && styles.includes('th:nth-child(-n+4)') && styles.includes('td:nth-child(-n+4)'), 'دکمه تایید فقط برای رکوردهای در انتظار تایید باید دیده شود و ستون‌های نام/تاریخ/شروع/پایان باید مشکی باشند.');
  assert(app.includes('function attendanceStatusIcon') && app.includes("? '✕'") && app.includes(": '✓'") && app.includes('attendance-status-icon') && styles.includes('Attendance status icon + night header readability') && styles.includes('.app-shell.theme-midnight .attendance-management-table thead th:nth-child(-n+4)'), 'ستون وضعیت باید به جای متن تایید/انتظار آیکن تیک/ضربدر نشان دهد و هدرهای اول جدول در تم شب سفید باشند.');
assert(coreSource.includes('function deleteStaffAttendance') && app.includes('RestaurantCore.deleteStaffAttendance'), 'دکمه حذف حضور و غیاب باید رکورد را حذف کند، نه اینکه فقط رد کند.');

  assert(app.includes('attendance-exception-choice') && app.includes('data-attendance-use-schedule') && app.includes('data-attendance-use-reason'), 'ورود زودتر/خروج دیرتر باید پنل دو گزینه‌ای داشته باشد.');
assert(styles.includes('Attendance exception submit button must be visible without hover/touch cursor') && styles.includes('.staff-attendance-modal .attendance-exception-buttons .primary') && styles.includes('opacity:1!important') && styles.includes('-webkit-text-fill-color:#ffffff!important'), 'دکمه ثبت ورود/خروج با توضیح باید بدون hover هم پررنگ و خوانا باشد.');
  assert(app.includes('ورود طبق برنامه') && app.includes('خروج طبق برنامه') && app.includes('ثبت ورود با توضیح') && app.includes('ثبت خروج با توضیح'), 'ورود زودتر از برنامه باید دو گزینه ورود طبق برنامه یا توضیح دلیل داشته باشد و خروج دیرتر هم خروج طبق برنامه یا توضیح دلیل.');
  assert(app.includes('function attendanceTimingException') && app.includes("type: 'early-in'") && app.includes("type: 'late-out'"), 'تشخیص ورود زودتر و خروج دیرتر باید قبل از ثبت انجام شود.');

assert(styles.includes('Weekly schedule print center alignment'), 'Weekly schedule print must center all fields.');

assert(app.includes('faNum(schedule?.startTime') && app.includes('faNum(staff.personnelCode') && styles.includes('Weekly schedule print table contract'), 'Weekly schedule print must be table style and Persian digits.');

assert(app.includes('function prepareStaffListPrintClone') && styles.includes('Staff list print table contract'), 'Staff list print must be landscape table.');

mustContain(app, "if (visibleChoices.length < 2) return `<strong class=\"header-restaurant-name\">", 'Single-restaurant accounts must show only the plain restaurant name without a disabled dropdown or frame.');
assert(!app.includes('tenant-switcher-caption') && !app.includes('فقط همین رستوران'), 'Header must not show extra رستوران/fallback captions around the restaurant name.');
