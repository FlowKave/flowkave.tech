(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RestaurantCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  const packages = {
    'Menu Starter': ['digital-menu'],
    'Menu Pro': ['digital-menu', 'orders'],
    'POS Lite': ['digital-menu', 'orders', 'pos', 'reports'],
    'Full OS': ['digital-menu', 'orders', 'pos', 'inventory', 'accounting', 'crm', 'reports'],
  };

  const unitAliases = {
    'kg': 'کیلوگرم',
    'کیلو': 'کیلوگرم',
    'کیلوگرم': 'کیلوگرم',
    'g': 'گرم',
    'گرم': 'گرم',
    'l': 'لیتر',
    'liter': 'لیتر',
    'لیتر': 'لیتر',
    'ml': 'میلی‌لیتر',
    'میلی لیتر': 'میلی‌لیتر',
    'میلی‌لیتر': 'میلی‌لیتر',
    'عدد': 'عدد',
    'دانه': 'عدد',
    'pcs': 'عدد',
    'piece': 'عدد',
  };

  function normalizeUnit(unit) {
    const text = String(unit || 'عدد').trim();
    return unitAliases[text] || text;
  }

  function storageUnitFor(unit) {
    const normalized = normalizeUnit(unit);
    if (normalized === 'گرم') return 'کیلوگرم';
    if (normalized === 'میلی‌لیتر') return 'لیتر';
    if (normalized === 'کیلوگرم' || normalized === 'لیتر' || normalized === 'عدد') return normalized;
    return normalized || 'عدد';
  }

  function conversionFactor(fromUnit, toUnit) {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (from === to) return 1;
    if (from === 'گرم' && to === 'کیلوگرم') return 0.001;
    if (from === 'کیلوگرم' && to === 'گرم') return 1000;
    if (from === 'میلی‌لیتر' && to === 'لیتر') return 0.001;
    if (from === 'لیتر' && to === 'میلی‌لیتر') return 1000;
    throw new Error('UNIT_CONVERSION_NOT_SUPPORTED');
  }

  function convertQty(qty, fromUnit, toUnit) {
    return Number((Number(qty || 0) * conversionFactor(fromUnit, toUnit)).toFixed(6));
  }

  function convertUnitCost(unitCost, fromUnit, toUnit) {
    const factor = conversionFactor(fromUnit, toUnit);
    if (!factor) throw new Error('UNIT_CONVERSION_NOT_SUPPORTED');
    return Number((Number(unitCost || 0) / factor).toFixed(6));
  }

  function normalizeInventoryInput(input = {}) {
    const inputUnit = normalizeUnit(input.unit || 'عدد');
    const storageUnit = storageUnitFor(inputUnit);
    return {
      unit: storageUnit,
      inputUnit,
      stock: convertQty(input.stock || 0, inputUnit, storageUnit),
      unitCost: convertUnitCost(input.unitCost || 0, inputUnit, storageUnit),
      minStock: convertQty(input.minStock || 0, inputUnit, storageUnit),
    };
  }

  function cleanPersianText(value) {
    return String(value || '')
      .normalize('NFC')
      .replace(/[‌‍‎‏‪-‮⁦-⁩]/g, '')
      .replace(/[ـ]/g, '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeInventoryName(name) {
    return cleanPersianText(name).toLocaleLowerCase('fa-IR');
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  }

  function persianDigits(value) {
    return String(value ?? '').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  }

  const orderStatuses = ['received', 'accepted', 'preparing', 'ready', 'completed'];
  const kitchenStationLabels = {
    prep: 'آماده‌سازی',
    grill: 'گریل',
    drinks: 'نوشیدنی',
    dessert: 'دسر',
  };

  function normalizeKitchenStation(station) {
    const text = String(station || 'prep').trim();
    return kitchenStationLabels[text] ? text : 'prep';
  }

  function normalizeOrderStatus(status) {
    return orderStatuses.includes(status) ? status : 'completed';
  }

  function createInitialState() {
    return {
      customers: [],
      customerProfiles: [],
      menus: [],
      menuItems: [],
      inventory: [],
      recipes: [],
      purchases: [],
      purchaseInvoices: [],
      shifts: [],
      staffUsers: [],
      staffSchedules: [],
      staffAttendance: [],
      staffInvitations: [],
      passwordResetTokens: [],
      securityEvents: [],
      backupExports: [],
      orders: [],
      restaurantTables: [],
      ledger: [],
      expenses: [],
      financialAccounts: [],
      cheques: [],
      sessions: [],
    };
  }

  function createDemoSampleState() {
    const state = createInitialState();
    const customer = createDemoCustomer(state);
    const menu = createMenu(state, customer.id, { name: 'منوی اصلی کافه تست', branchName: 'شعبه مرکزی' });
    const cappuccino = createMenuItem(state, customer.id, menu.id, { name: 'کاپوچینو', category: 'نوشیدنی گرم', price: 95000, available: true, description: 'اسپرسو و شیر فوم‌دار', userAdded: false });
    const omelette = createMenuItem(state, customer.id, menu.id, { name: 'املت ویژه', category: 'صبحانه', price: 145000, available: true, description: 'گوجه، تخم‌مرغ، ادویه مخصوص', userAdded: false });
    const milk = createInventoryItem(state, customer.id, { name: 'شیر', unit: 'لیتر', stock: 5, unitCost: 120, minStock: 1 });
    const coffee = createInventoryItem(state, customer.id, { name: 'قهوه', unit: 'کیلوگرم', stock: 1, unitCost: 1800, minStock: 0.25 });
    const egg = createInventoryItem(state, customer.id, { name: 'تخم‌مرغ', unit: 'عدد', stock: 60, unitCost: 7500, minStock: 12 });
    const tomato = createInventoryItem(state, customer.id, { name: 'گوجه', unit: 'کیلوگرم', stock: 8, unitCost: 350, minStock: 2 });
    setRecipe(state, customer.id, cappuccino.id, [
      { inventoryItemId: milk.id, qty: 180, unit: 'میلی‌لیتر' },
      { inventoryItemId: coffee.id, qty: 18, unit: 'گرم' },
    ], { itemName: cappuccino.name, category: cappuccino.category, cookingSteps: 'شیر را بخار بده، قهوه را عصاره گیری کن و شیر را آرام اضافه کن.' });
    setRecipe(state, customer.id, omelette.id, [
      { inventoryItemId: egg.id, qty: 2 },
      { inventoryItemId: tomato.id, qty: 120, unit: 'گرم' },
    ], { itemName: omelette.name, category: omelette.category, cookingSteps: 'گوجه را تفت بده، تخم مرغ را اضافه کن و تا بسته شدن کامل حرارت بده.' });
    const cash = createFinancialAccount(state, customer.id, { name: 'صندوق اصلی', type: 'cash', openingBalance: 2000000 });
    const bank = createFinancialAccount(state, customer.id, { name: 'بانک ملت', type: 'bank', openingBalance: 12000000 });
    addExpense(state, customer.id, 'اجاره روزانه تخمینی', 850000, { category: 'اجاره ملک', paymentMethod: 'بانکی', accountId: bank.id });
    addExpense(state, customer.id, 'تعمیر دستگاه اسپرسو', 450000, { category: 'تعمیرات و نگهداری', paymentMethod: 'نقدی', accountId: cash.id });
    return state;
  }

  const stateCollections = ['customers', 'customerProfiles', 'menus', 'menuItems', 'inventory', 'recipes', 'purchases', 'purchaseInvoices', 'restaurantTables', 'shifts', 'staffUsers', 'staffSchedules', 'staffAttendance', 'staffInvitations', 'passwordResetTokens', 'securityEvents', 'backupExports', 'orders', 'ledger', 'expenses', 'financialAccounts', 'cheques', 'sessions'];
  const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

  const mvpMigrationPlan = {
    targetStack: {
      app: 'Next.js',
      database: 'PostgreSQL',
      auth: 'session-cookie',
    },
    tables: [
      { name: 'customers', prototypeCollection: 'customers', tenantScoped: false, purpose: 'حساب رستوران و مالک' },
      { name: 'users', prototypeCollection: 'staffUsers', tenantScoped: true, purpose: 'کاربران و نقش‌های دسترسی هر رستوران' },
      { name: 'sessions', prototypeCollection: 'sessions', tenantScoped: true, purpose: 'نشست‌های ورود کاربران هر رستوران' },
      { name: 'staff_invitations', prototypeCollection: 'staffInvitations', tenantScoped: true, purpose: 'دعوت‌های زمان‌دار کارکنان قبل از فعال شدن کاربر' },
      { name: 'password_reset_tokens', prototypeCollection: 'passwordResetTokens', tenantScoped: true, purpose: 'درخواست‌های زمان‌دار و یک‌بارمصرف بازیابی رمز' },
      { name: 'security_events', prototypeCollection: 'securityEvents', tenantScoped: true, purpose: 'خط زمانی رویدادهای حساس ورود، دعوت، بازیابی رمز و تغییر وضعیت کارکنان' },
      { name: 'menus', prototypeCollection: 'menus', tenantScoped: true, purpose: 'منو و شعبه منتشرشده' },
      { name: 'menu_items', prototypeCollection: 'menuItems', tenantScoped: true, purpose: 'آیتم‌های قابل فروش' },
      { name: 'inventory_items', prototypeCollection: 'inventory', tenantScoped: true, purpose: 'مواد اولیه، موجودی و حداقل هشدار' },
      { name: 'recipes', prototypeCollection: 'recipes', tenantScoped: true, purpose: 'اتصال غذا به مواد اولیه' },
      { name: 'inventory_purchases', prototypeCollection: 'purchases', tenantScoped: true, purpose: 'خرید مواد اولیه و افزایش موجودی' },
      { name: 'purchase_invoices', prototypeCollection: 'purchaseInvoices', tenantScoped: true, purpose: 'فاکتورهای خرید ثبت‌شده با مبلغ، ویرایش و حذف' },
      { name: 'cashier_shifts', prototypeCollection: 'shifts', tenantScoped: true, purpose: 'شیفت‌های صندوق و اپراتور گزارش روز' },
      { name: 'backup_exports', prototypeCollection: 'backupExports', tenantScoped: true, purpose: 'ثبت زمان دریافت فایل پشتیبان برای آمادگی راه‌اندازی' },
      { name: 'restaurant_tables', prototypeCollection: 'restaurantTables', tenantScoped: true, purpose: 'نقشه میزهای سالن و وضعیت آزاد/سفارش باز/در انتظار پرداخت' },
      { name: 'orders', prototypeCollection: 'orders', tenantScoped: true, purpose: 'فاکتور فروش و سفارش عمومی با تقسیم فیش' },
      { name: 'payments', prototypeCollection: 'orders.payments', tenantScoped: true, purpose: 'پرداخت‌های صندوق و رسیدهای جزئی' },
      { name: 'payment_allocations', prototypeCollection: 'orders.paymentAllocations', tenantScoped: true, purpose: 'تخصیص هر پرداخت به آیتم و تعداد پرداخت‌شده' },
      { name: 'ledger_entries', prototypeCollection: 'ledger', tenantScoped: true, purpose: 'دفتر مالی درآمد، هزینه و قیمت تمام‌شده' },
      { name: 'expenses', prototypeCollection: 'expenses', tenantScoped: true, purpose: 'هزینه‌های عملیاتی مثل اجاره، حقوق، تعمیرات و قبوض' },
      { name: 'financial_accounts', prototypeCollection: 'financialAccounts', tenantScoped: true, purpose: 'حساب‌های بانکی، صندوق نقدی، کارت‌خوان و حساب آنلاین' },
      { name: 'cheques', prototypeCollection: 'cheques', tenantScoped: true, purpose: 'چک‌های پرداختنی و دریافتنی با شماره و تاریخ سررسید' },
    ],
    phases: [
      { order: 1, title: 'ساخت مدل داده و قفل مالکیت مشتری', exitCriteria: 'همه جدول‌های دارای داده عملیاتی با customer_id و آزمون جداسازی مشتری ساخته شوند.' },
      { order: 2, title: 'انتقال صفحه‌ها به مسیرهای سروری', exitCriteria: 'داشبورد، منو، فروش، رسپی، انبار و حسابداری از داده پایگاه داده بخوانند.' },
      { order: 3, title: 'ورود امن و نقش‌های کارکنان', exitCriteria: 'رمزها هش شوند، نشست امن ذخیره شود، نقش مدیر و صندوق‌دار اعمال شود و مسیر عمومی منو بدون ورود بماند.' },
      { order: 4, title: 'ورود داده نمونه و پشتیبان', exitCriteria: 'پشتیبان نمونه اولیه به ساختار پایگاه داده تبدیل و قابل بازیابی شود.' },
    ],
    authMigration: {
      sessionTableFields: [
        { name: 'شناسه نشست', purpose: 'کلید یکتا برای هر ورود و قابل ابطال در خروج' },
        { name: 'شناسه مشتری', purpose: 'اتصال نشست به رستوران و جلوگیری از دسترسی بین مشتری‌ها' },
        { name: 'شناسه کاربر', purpose: 'اتصال نشست به کاربر کارکنان و نقش دسترسی او' },
        { name: 'اثر مرورگر', purpose: 'ذخیره اثر هش‌شده دستگاه برای کاهش سوءاستفاده از نشست دزدیده‌شده' },
        { name: 'زمان ساخت', purpose: 'ثبت زمان ورود برای حسابرسی' },
        { name: 'زمان پایان', purpose: 'انقضای خودکار نشست و پاکسازی نشست‌های قدیمی' },
        { name: 'زمان ابطال', purpose: 'بستن فوری نشست هنگام خروج یا غیرفعال شدن کاربر' },
      ],
      requestProtection: [
        'کوکی نشست باید فقط از سمت سرور خوانده شود، در مسیر امن فرستاده شود و برای درخواست‌های بیرونی محدود باشد.',
        'فرم‌های تغییر داده باید توکن ضد جعل درخواست داشته باشند و توکن در هر نشست اعتبارسنجی شود.',
        'خروج باید شناسه نشست را در جدول نشست‌ها باطل کند، کوکی مرورگر را پاک کند و همه صفحه‌های خصوصی را دوباره به ورود بفرستد.',
      ],
      routeGuards: [
        { area: 'پنل مدیریتی', rule: 'بدون نشست معتبر باز نشود و همیشه شناسه مشتری از نشست خوانده شود، نه از ورودی کاربر.' },
        { area: 'صفحه فروش', rule: 'نقش مدیر و صندوق‌دار اجازه ورود داشته باشند.' },
        { area: 'منو، رسپی، انبار، حسابداری و حساب مشتری', rule: 'فقط نقش مدیر اجازه ورود داشته باشد.' },
        { area: 'منوی عمومی مشتری', rule: 'بدون ورود باز بماند، اما فقط آیتم‌های منتشرشده همان مشتری را نمایش دهد.' },
      ],
      passwordRecovery: [
        'درخواست بازیابی رمز فقط با ایمیل ثبت‌شده پذیرفته شود و همیشه پیام یکسان نمایش دهد تا وجود حساب لو نرود.',
        'توکن بازیابی باید یک‌بارمصرف، زمان‌دار و به شناسه مشتری و کاربر کارکنان همان رستوران وصل باشد.',
        'بعد از تغییر رمز، همه نشست‌های قبلی همان کاربر باطل شود و مدیر رستوران رویداد امنیتی را در گزارش حساب ببیند.',
      ],
      staffInvitation: [
        'مدیر بتواند دعوت کارکنان را با نام، ایمیل و نقش بسازد؛ دعوت تا پذیرش کاربر فعال عملیاتی نسازد.',
        'لینک دعوت باید زمان‌دار و یک‌بارمصرف باشد و هنگام پذیرش، رمز جدید همان کاربر ساخته و هش شود.',
        'دعوت‌های منقضی یا لغوشده باید در پنل حساب قابل مشاهده باشند تا مدیر وضعیت ورود کارکنان را پیگیری کند.',
      ],
    },
  };

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createPasswordSalt() {
    return uid('salt');
  }

  function prototypePasswordDigest(password, salt) {
    const text = `${salt}:${password}`;
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  function createPasswordRecord(password, salt = createPasswordSalt()) {
    return { passwordSalt: salt, passwordHash: `نمونه:${salt}:${prototypePasswordDigest(password, salt)}` };
  }

  function verifyPasswordRecord(account, password) {
    if (!account) return false;
    if (account.passwordHash && account.passwordSalt) return account.passwordHash === createPasswordRecord(password, account.passwordSalt).passwordHash;
    return account.password === password;
  }

  const LEGACY_DEMO_EMAIL = 'نمونه@رستوران.ایران';
  const DEMO_EMAIL = 'demo@restaurant.test';

  function normalizeEmailForAuth(email) {
    const text = String(email || '').trim();
    if (text === LEGACY_DEMO_EMAIL) return DEMO_EMAIL;
    return text;
  }

  function normalizePersonnelCode(value = '') {
    return String(value || '').replace(/[\s\-]/g, '').trim();
  }

  function migrateAuthState(state) {
    if (!state) return state;
    if (!Array.isArray(state.customers)) state.customers = [];
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    for (const customer of state.customers) {
      if (customer.email === LEGACY_DEMO_EMAIL) customer.email = DEMO_EMAIL;
      if (!customer.passwordHash && customer.password) Object.assign(customer, createPasswordRecord(customer.password));
      delete customer.password;
    }
    for (const [index, user] of state.staffUsers.entries()) {
      if (user.email === LEGACY_DEMO_EMAIL) user.email = DEMO_EMAIL;
      if (!user.personnelCode) user.personnelCode = normalizePersonnelCode(user.staffCode || user.code || '');
      const ownerCustomer = state.customers.find((c) => c.id === user.customerId && normalizeEmailForAuth(c.email) === normalizeEmailForAuth(user.email));
      if (!user.personnelCode && !ownerCustomer) user.personnelCode = String(1000 + index);
      if (!user.passwordHash && user.password) Object.assign(user, createPasswordRecord(user.password));
      if (!user.passwordHash && user.pin) Object.assign(user, createPasswordRecord(user.pin));
      delete user.password;
      delete user.pin;
    }
    return state;
  }

  function sessionExpiryFrom(createdAt) {
    const createdTime = new Date(createdAt || new Date()).getTime();
    return new Date(createdTime + SESSION_TTL_MS).toISOString();
  }

  function isSessionExpired(session, now = new Date()) {
    const expiry = session?.expiresAt || sessionExpiryFrom(session?.createdAt);
    return new Date(expiry).getTime() <= new Date(now).getTime();
  }

  function cleanupExpiredSessions(state, now = new Date()) {
    if (!Array.isArray(state.sessions)) state.sessions = [];
    const before = state.sessions.length;
    state.sessions = state.sessions.filter((session) => !isSessionExpired(session, now));
    return before - state.sessions.length;
  }

  function validateSession(state, sessionId, now = new Date()) {
    if (!Array.isArray(state.sessions)) state.sessions = [];
    cleanupExpiredSessions(state, now);
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    const customer = state.customers.find((c) => c.id === session.customerId);
    if (!customer) {
      state.sessions = state.sessions.filter((s) => s.id !== sessionId);
      return null;
    }
    if (session.staffUserId) {
      const staffUser = (state.staffUsers || []).find((u) => u.id === session.staffUserId && u.customerId === session.customerId && u.active !== false);
      if (!staffUser) {
        state.sessions = state.sessions.filter((s) => s.id !== sessionId);
        return null;
      }
      session.role = staffUser.role || session.role || 'manager';
      session.staffName = staffUser.name || session.staffName || customer.ownerName || 'مدیر';
    }
    if (!session.expiresAt) session.expiresAt = sessionExpiryFrom(session.createdAt);
    return session;
  }

  function logout(state, sessionId) {
    if (!Array.isArray(state.sessions)) state.sessions = [];
    const before = state.sessions.length;
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);
    return before !== state.sessions.length;
  }

  function createPrototypeBackup(state) {
    migrateAuthState(state);
    const data = createInitialState();
    for (const key of stateCollections) data[key] = cloneJson(state[key] || []);
    return { schemaVersion: 1, exportedAt: new Date().toISOString(), data };
  }

  function createSectionBackup(state, customerId, section) {
    requireCustomer(state, customerId);
    if (!['inventory', 'recipes'].includes(section)) throw new Error('INVALID_SECTION_BACKUP');
    const inventoryById = new Map((state.inventory || []).filter((item) => item.customerId === customerId).map((item) => [item.id, item]));
    const rows = section === 'inventory'
      ? (state.inventory || []).filter((item) => item.customerId === customerId).map((item) => cloneJson(item))
      : (state.recipes || []).filter((recipe) => recipe.customerId === customerId).map((recipe) => ({
        ...cloneJson(recipe),
        ingredients: (recipe.ingredients || []).map((ingredient) => {
          const inv = inventoryById.get(ingredient.inventoryItemId);
          return { ...cloneJson(ingredient), inventoryItemName: inv?.name || ingredient.inventoryItemName || ingredient.materialName || '' };
        }),
      }));
    return {
      schemaVersion: 1,
      type: section === 'inventory' ? 'restaurant_inventory_section_backup' : 'restaurant_recipes_section_backup',
      section,
      exportedAt: new Date().toISOString(),
      itemCount: rows.length,
      data: { [section]: rows },
    };
  }

  function restoreSectionBackup(state, customerId, backup, expectedSection = '') {
    requireCustomer(state, customerId);
    if (!backup || typeof backup !== 'object') throw new Error('INVALID_SECTION_BACKUP');
    const section = backup.section || (backup.type === 'restaurant_inventory_section_backup' ? 'inventory' : (backup.type === 'restaurant_recipes_section_backup' ? 'recipes' : expectedSection));
    if (!['inventory', 'recipes'].includes(section) || (expectedSection && section !== expectedSection)) throw new Error('INVALID_SECTION_BACKUP');
    const rows = backup.data?.[section] || backup[section];
    if (!Array.isArray(rows)) throw new Error('INVALID_SECTION_BACKUP');
    if (section === 'inventory') {
      state.inventory = (state.inventory || []).filter((item) => item.customerId !== customerId);
      const imported = rows.map((item) => ({
        ...cloneJson(item),
        id: item.id || uid('inv'),
        customerId,
        name: cleanPersianText(item.name),
        unit: normalizeUnit(item.unit || 'عدد'),
        recipeUnit: normalizeUnit(item.recipeUnit || item.inputUnit || item.unit || 'عدد'),
        stock: Number(item.stock || 0),
        unitCost: Number(item.unitCost || 0),
        minStock: Number(item.minStock ?? item.minimumStock ?? 0),
      }));
      state.inventory.push(...imported);
      return { section, replacedCount: imported.length };
    }
    const inventoryById = new Map((state.inventory || []).filter((item) => item.customerId === customerId).map((item) => [item.id, item]));
    const inventoryByName = new Map((state.inventory || []).filter((item) => item.customerId === customerId).map((item) => [cleanPersianText(item.name), item]));
    const menuItemIds = new Set((state.menuItems || []).filter((item) => item.customerId === customerId).map((item) => item.id));
    state.recipes = (state.recipes || []).filter((recipe) => recipe.customerId !== customerId);
    const imported = rows.map((recipe) => ({
      ...cloneJson(recipe),
      id: recipe.id || uid('rec'),
      customerId,
      itemId: recipe.itemId && menuItemIds.has(recipe.itemId) ? recipe.itemId : '',
      itemName: cleanPersianText(recipe.itemName || recipe.name || ''),
      category: cleanPersianText(recipe.category || ''),
      ingredients: (recipe.ingredients || []).map((ingredient) => {
        const name = cleanPersianText(ingredient.inventoryItemName || ingredient.materialName || ingredient.name || '');
        const matched = inventoryById.get(ingredient.inventoryItemId) || inventoryByName.get(name);
        return {
          inventoryItemId: matched?.id || ingredient.inventoryItemId || '',
          inventoryItemName: matched?.name || name,
          qty: Number(ingredient.qty ?? ingredient.amount ?? 0),
          unit: normalizeUnit(ingredient.unit || 'عدد'),
        };
      }),
      cookingSteps: recipe.cookingSteps || recipe.preparationSteps || '',
    }));
    state.recipes.push(...imported);
    return { section, replacedCount: imported.length };
  }

  function restorePrototypeBackup(backup) {
    if (!backup || typeof backup !== 'object') throw new Error('INVALID_BACKUP');
    const source = (backup.schemaVersion === 1 && backup.data && typeof backup.data === 'object')
      ? backup.data
      : (Array.isArray(backup.customers) ? backup : null);
    if (!source) throw new Error('INVALID_BACKUP');
    const next = createInitialState();
    for (const key of stateCollections) {
      const value = source[key];
      if (value === undefined) {
        next[key] = [];
        continue;
      }
      if (!Array.isArray(value)) throw new Error('INVALID_BACKUP');
      next[key] = cloneJson(value);
    }
    return migrateAuthState(next);
  }

  function recordPrototypeBackupExport(state, customerId, createdAt = new Date().toISOString()) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.backupExports)) state.backupExports = [];
    const record = { id: uid('bak'), customerId, createdAt };
    state.backupExports.push(record);
    return record;
  }

  function getOnboardingChecklist(state, customerId) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.backupExports)) state.backupExports = [];
    const menus = state.menus.filter((menu) => menu.customerId === customerId);
    const menuIds = new Set(menus.filter((menu) => menu.isPublished !== false).map((menu) => menu.id));
    const publishedItems = state.menuItems.filter((item) => item.customerId === customerId && item.userAdded === true && menuIds.has(item.menuId) && item.available !== false);
    const inventory = state.inventory.filter((item) => item.customerId === customerId);
    const recipes = state.recipes.filter((recipe) => recipe.customerId === customerId);
    const activeStaff = (state.staffUsers || []).filter((user) => user.customerId === customerId && user.active !== false);
    const pendingInvitations = (state.staffInvitations || []).filter((invitation) => invitation.customerId === customerId && invitationStatus(invitation) === 'pending');
    const backupExports = state.backupExports.filter((record) => record.customerId === customerId);
    const items = [
      {
        key: 'published-menu',
        title: 'منوی منتشرشده',
        done: publishedItems.length > 0,
        detail: publishedItems.length > 0 ? `${publishedItems.length} آیتم فعال در منوی عمومی آماده است.` : 'حداقل یک منوی منتشرشده و یک آیتم فعال بسازید.',
        action: 'رفتن به منو',
        tab: 'menu',
      },
      {
        key: 'inventory',
        title: 'مواد اولیه انبار',
        done: inventory.length > 0,
        detail: inventory.length > 0 ? `${inventory.length} ماده اولیه در انبار ثبت شده است.` : 'مواد اولیه، موجودی و قیمت واحد را ثبت کنید.',
        action: 'رفتن به انبار',
        tab: 'inventory',
      },
      {
        key: 'recipes',
        title: 'رسپی قیمت‌گذاری‌شده',
        done: recipes.length > 0,
        detail: recipes.length > 0 ? `${recipes.length} رسپی برای محاسبه قیمت تمام‌شده آماده است.` : 'برای آیتم‌های فروش رسپی و مقدار مصرف بسازید.',
        action: 'رفتن به رسپی',
        tab: 'recipes',
      },
      {
        key: 'staff-access',
        title: 'دسترسی کارکنان',
        done: activeStaff.length > 1 || pendingInvitations.length > 0,
        detail: activeStaff.length > 1 ? `${activeStaff.length} کاربر فعال کارکنان دارید.` : pendingInvitations.length > 0 ? `${pendingInvitations.length} دعوت کارکنان در انتظار پذیرش است.` : 'برای صندوق‌دار یا مدیر دیگر کاربر یا دعوت بسازید.',
        action: 'رفتن به حساب',
        tab: 'account',
      },
      {
        key: 'backup-export',
        title: 'فایل پشتیبان',
        done: backupExports.length > 0,
        detail: backupExports.length > 0 ? 'فایل پشتیبان برای این حساب دریافت شده است.' : 'قبل از بهره‌برداری، یک فایل پشتیبان دریافت کنید.',
        action: 'دریافت فایل پشتیبان',
        tab: 'account',
      },
    ];
    const doneCount = items.filter((item) => item.done).length;
    return { total: items.length, doneCount, remainingCount: items.length - doneCount, ready: doneCount === items.length, items: items.map((item) => cloneJson(item)) };
  }

  function getMvpMigrationPlan() {
    return cloneJson(mvpMigrationPlan);
  }

  function requireCustomer(state, customerId) {
    const customer = state.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');
    return customer;
  }

  function securityEventTitle(type) {
    return ({
      'staff-invitation-created': 'دعوت کارکنان ساخته شد',
      'staff-invitation-cancelled': 'دعوت کارکنان لغو شد',
      'staff-invitation-accepted': 'دعوت کارکنان پذیرفته شد',
      'password-reset-requested': 'درخواست بازیابی رمز ساخته شد',
      'password-reset-used': 'رمز عبور با کد بازیابی تغییر کرد',
      'staff-activated': 'کاربر کارکنان فعال شد',
      'staff-deactivated': 'کاربر کارکنان غیرفعال شد',
      'staff-deleted': 'کاربر کارکنان حذف شد',
    }[type] || 'رویداد امنیتی');
  }

  function recordSecurityEvent(state, customerId, type, input = {}) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.securityEvents)) state.securityEvents = [];
    const event = {
      id: uid('sec'),
      customerId,
      type,
      title: input.title || securityEventTitle(type),
      targetName: input.targetName || '',
      targetEmail: input.targetEmail || '',
      detail: input.detail || '',
      sourceId: input.sourceId || '',
      createdAt: input.createdAt || new Date().toISOString(),
    };
    state.securityEvents.push(event);
    return event;
  }

  function getSecurityEvents(state, customerId, filters = {}) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.securityEvents)) state.securityEvents = [];
    const fromTime = filters.fromDate ? new Date(filters.fromDate).getTime() : null;
    const toTime = filters.toDate ? new Date(filters.toDate).getTime() : null;
    return state.securityEvents
      .filter((event) => event.customerId === customerId)
      .filter((event) => !filters.type || event.type === filters.type)
      .filter((event) => {
        const eventTime = new Date(event.createdAt).getTime();
        if (fromTime && eventTime < fromTime) return false;
        if (toTime && eventTime > toTime) return false;
        return true;
      })
      .map((event) => cloneJson(event))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function createCustomer(state, input) {
    const email = normalizeEmailForAuth(input.email);
    if (!email || !input.password) throw new Error('EMAIL_AND_PASSWORD_REQUIRED');
    if (state.customers.some((c) => normalizeEmailForAuth(c.email) === email)) throw new Error('EMAIL_ALREADY_EXISTS');
    const passwordRecord = createPasswordRecord(input.password);
    const customer = {
      id: uid('cus'),
      businessName: input.businessName || 'رستوران جدید',
      ownerName: input.ownerName || 'مدیر',
      phone: input.phone || '',
      email,
      passwordHash: passwordRecord.passwordHash,
      passwordSalt: passwordRecord.passwordSalt,
      packageName: input.packageName || 'Full OS',
      createdAt: new Date().toISOString(),
    };
    state.customers.push(customer);
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    return customer;
  }

  function createDemoCustomer(state) {
    return createCustomer(state, {
      businessName: 'رستوران نمونه',
      ownerName: 'کاوه رضایی',
      phone: '09120000000',
      email: DEMO_EMAIL,
      password: '123456',
      packageName: 'Full OS',
    });
  }


  function updateCustomerProfile(state, customerId, input = {}) {
    const customer = requireCustomer(state, customerId);
    const nextEmail = input.email !== undefined ? normalizeEmailForAuth(input.email) : customer.email;
    if (!nextEmail) throw new Error('EMAIL_REQUIRED');
    if (state.customers.some((c) => c.id !== customerId && normalizeEmailForAuth(c.email) === nextEmail)) throw new Error('EMAIL_ALREADY_EXISTS');
    if (input.businessName !== undefined) customer.businessName = cleanPersianText(input.businessName) || customer.businessName || 'رستوران جدید';
    if (input.ownerName !== undefined) customer.ownerName = cleanPersianText(input.ownerName) || customer.ownerName || 'مدیر';
    if (input.phone !== undefined) customer.phone = String(input.phone || '').trim();
    if (input.email !== undefined) customer.email = nextEmail;
    customer.updatedAt = new Date().toISOString();
    recordSecurityEvent(state, customerId, 'customer-profile-updated', { targetName: customer.ownerName, targetEmail: customer.email, detail: 'ویرایش مشخصات مالک و رستوران', sourceId: customer.id });
    return cloneJson(customer);
  }

  function changeCustomerPassword(state, customerId, currentPassword, newPassword) {
    const customer = requireCustomer(state, customerId);
    if (!currentPassword || !newPassword) throw new Error('PASSWORD_REQUIRED');
    if (!verifyPasswordRecord(customer, currentPassword)) throw new Error('CURRENT_PASSWORD_INVALID');
    const passwordRecord = createPasswordRecord(newPassword);
    Object.assign(customer, passwordRecord);
    delete customer.password;
    const ownerStaff = (state.staffUsers || []).find((user) => user.customerId === customerId && user.email === customer.email && user.role === 'manager');
    if (ownerStaff) { Object.assign(ownerStaff, passwordRecord); delete ownerStaff.password; }
    const invalidatedSessions = invalidateUserSessions(state, customerId, '');
    recordSecurityEvent(state, customerId, 'password-reset-used', { targetName: customer.ownerName, targetEmail: customer.email, detail: `تغییر رمز مالک؛ نشست‌های پاک‌شده: ${invalidatedSessions}`, sourceId: customer.id });
    return { customerId, invalidatedSessions };
  }

  function createLoginSession(state, customer, user = null) {
    cleanupExpiredSessions(state);
    const createdAt = new Date().toISOString();
    const session = { id: uid('ses'), customerId: customer.id, staffUserId: user?.id || '', staffName: user?.name || customer.ownerName || 'مالک پکیج', role: user?.role || 'manager', createdAt, expiresAt: sessionExpiryFrom(createdAt) };
    state.sessions.push(session);
    return session;
  }

  function login(state, email, password) {
    migrateAuthState(state);
    const normalizedEmail = normalizeEmailForAuth(email);
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    const customer = state.customers.find((c) => normalizeEmailForAuth(c.email) === normalizedEmail && verifyPasswordRecord(c, password));
    if (customer) return createLoginSession(state, customer, null);
    const legacyStaff = state.staffUsers.find((u) => normalizeEmailForAuth(u.email) === normalizedEmail && verifyPasswordRecord(u, password) && u.active !== false);
    const legacyCustomer = legacyStaff ? state.customers.find((c) => c.id === legacyStaff.customerId) : null;
    if (!legacyCustomer) throw new Error('INVALID_LOGIN');
    return createLoginSession(state, legacyCustomer, legacyStaff);
  }

  function loginWithStaffCode(state, personnelCode, pin, customerId = '') {
    migrateAuthState(state);
    const code = normalizePersonnelCode(personnelCode);
    const scopedCustomerId = String(customerId || '').trim();
    const user = (state.staffUsers || []).find((u) => {
      if (scopedCustomerId && u.customerId !== scopedCustomerId) return false;
      return normalizePersonnelCode(u.personnelCode) === code && u.accessActive !== false && verifyPasswordRecord(u, pin) && u.active !== false;
    });
    const customer = user ? state.customers.find((c) => c.id === user.customerId) : null;
    if (!customer) throw new Error('INVALID_STAFF_LOGIN');
    return createLoginSession(state, customer, user);
  }

  const rolePermissions = {
    manager: ['dashboard', 'personnel', 'customerBank', 'aiAssistant', 'menu', 'sales', 'recipes', 'inventory', 'accounting', 'account', 'staff:manage'],
    cashier: ['sales'],
  };

  function roleLabel(role) {
    return ({ cashier: 'صندوق‌دار', manager: 'مدیر', kitchen: 'آشپزخانه', inventory: 'انباردار', accountant: 'حسابدار' })[role] || 'پرسنل';
  }

  function getRolePermissions(role) {
    return (rolePermissions[role] || rolePermissions.cashier).slice();
  }

  function canAccess(role, permission) {
    return getRolePermissions(role).includes(permission);
  }

  function getStaffUsers(state, customerId) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    migrateAuthState(state);
    const customer = requireCustomer(state, customerId);
    return state.staffUsers.filter((u) => u.customerId === customerId && u.isOwner !== true && normalizeEmailForAuth(u.email) !== normalizeEmailForAuth(customer.email)).map((u) => {
      const copy = cloneJson(u);
      delete copy.passwordHash;
      delete copy.passwordSalt;
      delete copy.password;
      delete copy.pin;
      return copy;
    });
  }

  function invitationStatus(invitation, now = new Date()) {
    if (invitation.cancelledAt) return 'cancelled';
    if (invitation.acceptedAt) return 'accepted';
    if (new Date(invitation.expiresAt).getTime() <= new Date(now).getTime()) return 'expired';
    return 'pending';
  }

  function getStaffInvitations(state, customerId, now = new Date()) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.staffInvitations)) state.staffInvitations = [];
    return state.staffInvitations
      .filter((invitation) => invitation.customerId === customerId)
      .map((invitation) => ({ ...cloneJson(invitation), status: invitationStatus(invitation, now) }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function createStaffInvitation(state, customerId, input) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.staffInvitations)) state.staffInvitations = [];
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    const email = normalizeEmailForAuth(input.email || '');
    if (!email) throw new Error('INVITATION_EMAIL_REQUIRED');
    const existingStaff = state.staffUsers.find((u) => u.customerId === customerId && normalizeEmailForAuth(u.email) === email);
    if (existingStaff && existingStaff.role !== 'manager') throw new Error('STAFF_EMAIL_ALREADY_EXISTS');
    if (existingStaff && existingStaff.role === 'manager') throw new Error('MANAGER_EMAIL_ALREADY_ACTIVE_IN_RESTAURANT');
    const activePending = state.staffInvitations.some((invitation) => invitation.customerId === customerId && normalizeEmailForAuth(invitation.email) === email && invitationStatus(invitation) === 'pending');
    if (activePending) throw new Error('INVITATION_ALREADY_PENDING');
    const createdAt = new Date().toISOString();
    const expiresAt = input.expiresAt || new Date(new Date(createdAt).getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString();
    const invitation = {
      id: uid('invitation'),
      customerId,
      name: input.name || roleLabel(input.role),
      email,
      personnelCode: normalizePersonnelCode(input.personnelCode || ''),
      role: input.role === 'manager' ? 'manager' : 'cashier',
      token: uid('token'),
      status: 'pending',
      createdAt,
      expiresAt,
      acceptedAt: '',
      cancelledAt: '',
    };
    state.staffInvitations.push(invitation);
    recordSecurityEvent(state, customerId, 'staff-invitation-created', { targetName: invitation.name, targetEmail: invitation.email, sourceId: invitation.id, createdAt });
    return invitation;
  }

  function cancelStaffInvitation(state, customerId, invitationId, now = new Date()) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.staffInvitations)) state.staffInvitations = [];
    const invitation = state.staffInvitations.find((x) => x.id === invitationId && x.customerId === customerId);
    if (!invitation) throw new Error('INVITATION_NOT_FOUND');
    if (invitationStatus(invitation, now) !== 'pending') throw new Error('INVITATION_NOT_PENDING');
    invitation.cancelledAt = new Date(now).toISOString();
    invitation.status = 'cancelled';
    recordSecurityEvent(state, customerId, 'staff-invitation-cancelled', { targetName: invitation.name, targetEmail: invitation.email, sourceId: invitation.id, createdAt: invitation.cancelledAt });
    return invitation;
  }

  function acceptStaffInvitation(state, token, password, now = new Date()) {
    if (!Array.isArray(state.staffInvitations)) state.staffInvitations = [];
    const invitation = state.staffInvitations.find((x) => x.token === token);
    if (!invitation) throw new Error('INVITATION_NOT_FOUND');
    if (invitationStatus(invitation, now) !== 'pending') throw new Error('INVITATION_NOT_PENDING');
    if (!password) throw new Error('STAFF_LOGIN_REQUIRED');
    const staffUser = createStaffUser(state, invitation.customerId, { name: invitation.name, email: invitation.email, personnelCode: invitation.personnelCode || String(Date.now()).slice(-6), pin: password, role: invitation.role });
    invitation.acceptedAt = new Date(now).toISOString();
    invitation.status = 'accepted';
    invitation.staffUserId = staffUser.id;
    recordSecurityEvent(state, invitation.customerId, 'staff-invitation-accepted', { targetName: invitation.name, targetEmail: invitation.email, sourceId: invitation.id, createdAt: invitation.acceptedAt });
    return staffUser;
  }

  function passwordResetStatus(request, now = new Date()) {
    if (request.usedAt) return 'used';
    if (new Date(request.expiresAt).getTime() <= new Date(now).getTime()) return 'expired';
    return 'pending';
  }

  function invalidateUserSessions(state, customerId, staffUserId = '') {
    if (!Array.isArray(state.sessions)) state.sessions = [];
    const before = state.sessions.length;
    state.sessions = state.sessions.filter((session) => {
      if (session.customerId !== customerId) return true;
      if (staffUserId) return session.staffUserId !== staffUserId;
      return false;
    });
    return before - state.sessions.length;
  }

  function requestPasswordReset(state, email, now = new Date()) {
    if (!Array.isArray(state.passwordResetTokens)) state.passwordResetTokens = [];
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    const safeMessage = 'اگر این ایمیل در سامانه ثبت شده باشد، کد بازیابی نمونه ساخته شد.';
    const staffUser = state.staffUsers.find((user) => user.email === email && user.active !== false);
    const customer = staffUser ? state.customers.find((c) => c.id === staffUser.customerId) : state.customers.find((c) => c.email === email);
    if (!customer) return { message: safeMessage, created: false };
    const createdAt = new Date(now).toISOString();
    const request = {
      id: uid('reset'),
      customerId: customer.id,
      staffUserId: staffUser?.id || '',
      email,
      token: uid('reset_token'),
      createdAt,
      expiresAt: new Date(new Date(createdAt).getTime() + (30 * 60 * 1000)).toISOString(),
      usedAt: '',
      status: 'pending',
    };
    state.passwordResetTokens.push(request);
    recordSecurityEvent(state, customer.id, 'password-reset-requested', { targetEmail: email, sourceId: request.id, createdAt });
    return { message: safeMessage, created: true, request: cloneJson(request) };
  }

  function getPasswordResetRequests(state, customerId, now = new Date()) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.passwordResetTokens)) state.passwordResetTokens = [];
    return state.passwordResetTokens
      .filter((request) => request.customerId === customerId)
      .map((request) => ({ ...cloneJson(request), status: passwordResetStatus(request, now) }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function resetPasswordWithToken(state, token, newPassword, now = new Date()) {
    if (!Array.isArray(state.passwordResetTokens)) state.passwordResetTokens = [];
    if (!newPassword) throw new Error('PASSWORD_REQUIRED');
    const request = state.passwordResetTokens.find((x) => x.token === token);
    if (!request) throw new Error('RESET_TOKEN_NOT_FOUND');
    if (passwordResetStatus(request, now) !== 'pending') throw new Error('RESET_TOKEN_NOT_PENDING');
    const customer = requireCustomer(state, request.customerId);
    const passwordRecord = createPasswordRecord(newPassword);
    let staffUser = null;
    if (request.staffUserId) {
      staffUser = (state.staffUsers || []).find((user) => user.id === request.staffUserId && user.customerId === request.customerId);
      if (!staffUser) throw new Error('STAFF_NOT_FOUND');
      Object.assign(staffUser, passwordRecord);
      delete staffUser.password;
      if (customer.email === staffUser.email) Object.assign(customer, passwordRecord);
    } else {
      Object.assign(customer, passwordRecord);
      delete customer.password;
      staffUser = (state.staffUsers || []).find((user) => user.customerId === customer.id && user.email === customer.email && user.role === 'manager');
      if (staffUser) {
        Object.assign(staffUser, passwordRecord);
        delete staffUser.password;
      }
    }
    request.usedAt = new Date(now).toISOString();
    request.status = 'used';
    request.invalidatedSessions = invalidateUserSessions(state, request.customerId, staffUser?.id || request.staffUserId || '');
    recordSecurityEvent(state, request.customerId, 'password-reset-used', { targetEmail: request.email, detail: `نشست‌های پاک‌شده: ${request.invalidatedSessions}`, sourceId: request.id, createdAt: request.usedAt });
    return { customerId: request.customerId, staffUserId: staffUser?.id || request.staffUserId || '', invalidatedSessions: request.invalidatedSessions };
  }

  function normalizeNationalId(value) {
    const digits = String(value || '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, 10);
    const fa = (v) => persianDigits(v);
    if (!digits) return '';
    if (digits.length <= 3) return fa(digits);
    if (digits.length <= 9) return `${fa(digits.slice(0, 3))}-${fa(digits.slice(3))}`;
    return `${fa(digits.slice(0, 3))}-${fa(digits.slice(3, 9))}-${fa(digits.slice(9, 10))}`;
  }

  function normalizeStaffRole(role) {
    return ['manager', 'cashier', 'kitchen', 'inventory', 'accountant'].includes(role) ? role : 'cashier';
  }

  function normalizeStaffFields(input = {}) {
    const firstName = cleanPersianText(input.firstName || '');
    const lastName = cleanPersianText(input.lastName || '');
    const fullName = cleanPersianText(input.name || `${firstName} ${lastName}`);
    return {
      name: fullName || roleLabel(input.role),
      firstName,
      lastName,
      fatherName: cleanPersianText(input.fatherName || ''),
      nationalId: normalizeNationalId(input.nationalId),
      mobile: String(input.mobile || input.phone || '').trim(),
      email: normalizeEmailForAuth(input.email || ''),
      address: cleanPersianText(input.address || ''),
      jobTitle: cleanPersianText(input.jobTitle || roleLabel(input.role)),
      hourlyWage: Number(input.hourlyWage || 0),
    };
  }

  function createStaffUser(state, customerId, input) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    const personnelCode = normalizePersonnelCode(input.personnelCode || input.staffCode || input.code);
    if (!personnelCode) throw new Error('STAFF_PERSONNEL_CODE_REQUIRED');
    if (state.staffUsers.some((u) => u.customerId === customerId && normalizePersonnelCode(u.personnelCode) === personnelCode)) throw new Error('STAFF_CODE_ALREADY_EXISTS');
    const pin = input.pin || input.password;
    const fields = normalizeStaffFields(input);
    const staffUser = {
      id: uid('usr'),
      customerId,
      ...fields,
      personnelCode,
      role: normalizeStaffRole(input.role),
      active: input.active !== false,
      accessActive: Boolean(pin),
      createdAt: new Date().toISOString(),
    };
    if (pin) Object.assign(staffUser, createPasswordRecord(pin));
    state.staffUsers.push(staffUser);
    return staffUser;
  }

  function updateStaffUser(state, customerId, staffUserId, input = {}) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    const staffUser = state.staffUsers.find((u) => u.id === staffUserId && u.customerId === customerId);
    if (!staffUser) throw new Error('STAFF_NOT_FOUND');
    if (input.name !== undefined || input.firstName !== undefined || input.lastName !== undefined) Object.assign(staffUser, normalizeStaffFields({ ...staffUser, ...input }));
    if (input.personnelCode !== undefined) {
      const personnelCode = normalizePersonnelCode(input.personnelCode);
      if (!personnelCode) throw new Error('STAFF_LOGIN_REQUIRED');
      if (state.staffUsers.some((u) => u.id !== staffUserId && normalizePersonnelCode(u.personnelCode) === personnelCode)) throw new Error('STAFF_CODE_ALREADY_EXISTS');
      staffUser.personnelCode = personnelCode;
    }
    if (input.email !== undefined) staffUser.email = normalizeEmailForAuth(input.email || '');
    for (const key of ['fatherName','mobile','address','jobTitle','hourlyWage']) if (input[key] !== undefined) staffUser[key] = key === 'hourlyWage' ? Number(input[key] || 0) : cleanPersianText(input[key] || '');
    if (input.nationalId !== undefined) staffUser.nationalId = normalizeNationalId(input.nationalId);
    const nextPin = input.pin || input.password;
    if (nextPin !== undefined && nextPin) {
      staffUser.accessActive = true;
      Object.assign(staffUser, createPasswordRecord(nextPin));
      delete staffUser.password;
      invalidateUserSessions(state, customerId, staffUser.id);
      const customer = state.customers.find((c) => c.id === customerId);
      if (customer && normalizeEmailForAuth(customer.email) === normalizeEmailForAuth(staffUser.email) && staffUser.role === 'manager') {
        Object.assign(customer, { passwordHash: staffUser.passwordHash, passwordSalt: staffUser.passwordSalt });
        delete customer.password;
      }
      recordSecurityEvent(state, customerId, 'password-reset-used', { targetName: staffUser.name, targetEmail: staffUser.email, detail: 'تغییر رمز توسط مدیر پکیج', sourceId: staffUser.id });
    }
    if (input.role !== undefined) staffUser.role = normalizeStaffRole(input.role);
    if (input.accessActive !== undefined) staffUser.accessActive = Boolean(input.accessActive);
    if (input.active !== undefined) {
      const nextActive = Boolean(input.active);
      if (staffUser.active !== nextActive) {
        staffUser.active = nextActive;
        recordSecurityEvent(state, customerId, nextActive ? 'staff-activated' : 'staff-deactivated', { targetName: staffUser.name, targetEmail: staffUser.email, sourceId: staffUser.id });
      } else {
        staffUser.active = nextActive;
      }
    }
    return staffUser;
  }

  function deleteStaffUser(state, customerId, staffUserId) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
    const index = state.staffUsers.findIndex((u) => u.id === staffUserId && u.customerId === customerId);
    if (index === -1) throw new Error('STAFF_NOT_FOUND');
    const [removed] = state.staffUsers.splice(index, 1);
    invalidateUserSessions(state, customerId, removed.id);
    recordSecurityEvent(state, customerId, 'staff-deleted', { targetName: removed.name, targetEmail: removed.email, sourceId: removed.id });
    return removed;
  }

  function openCashierShift(state, customerId, input = {}) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.shifts)) state.shifts = [];
    const active = state.shifts.find((shift) => shift.customerId === customerId && !shift.closedAt);
    if (active) throw new Error('SHIFT_ALREADY_OPEN');
    const shift = {
      id: uid('shi'),
      customerId,
      name: input.name || 'شیفت صندوق',
      operatorName: input.operatorName || 'اپراتور',
      openedAt: input.openedAt || new Date().toISOString(),
      closedAt: '',
    };
    state.shifts.push(shift);
    return shift;
  }

  function closeCashierShift(state, customerId, shiftId, closedAt = new Date().toISOString()) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.shifts)) state.shifts = [];
    const shift = state.shifts.find((s) => s.id === shiftId && s.customerId === customerId);
    if (!shift) throw new Error('SHIFT_NOT_FOUND');
    if (shift.closedAt) throw new Error('SHIFT_ALREADY_CLOSED');
    shift.closedAt = closedAt;
    return shift;
  }

  function getCurrentCashierShift(state, customerId) {
    requireCustomer(state, customerId);
    return (state.shifts || []).find((shift) => shift.customerId === customerId && !shift.closedAt) || null;
  }


  function ensureStaffHrCollections(state) {
    if (!Array.isArray(state.staffSchedules)) state.staffSchedules = [];
    if (!Array.isArray(state.staffAttendance)) state.staffAttendance = [];
    if (!Array.isArray(state.staffUsers)) state.staffUsers = [];
  }

  function getStaffById(state, customerId, staffId) {
    ensureStaffHrCollections(state);
    const staff = state.staffUsers.find((u) => u.id === staffId && u.customerId === customerId && u.active !== false);
    if (!staff) throw new Error('STAFF_NOT_FOUND');
    return staff;
  }

  function weekdayOf(dateText) {
    return new Date(`${dateText}T12:00:00`).getDay();
  }

  function minutesOf(timeText) {
    const [h, m] = String(timeText || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function createStaffSchedule(state, customerId, input = {}) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    getStaffById(state, customerId, input.staffUserId);
    const date = String(input.date || '').slice(0, 10);
    const existing = state.staffSchedules.find((s) => s.customerId === customerId && s.staffUserId === input.staffUserId && ((date && s.date === date) || (!date && !s.date && Number(s.weekday) === Number(input.weekday || 0))));
    const patch = { weekday: Number(input.weekday || 0), date, jalaliDate: cleanPersianText(input.jalaliDate || ''), startTime: input.startTime || '09:00', endTime: input.endTime || '17:00', note: cleanPersianText(input.note || ''), active: input.active !== false, updatedAt: new Date().toISOString() };
    if (existing) { Object.assign(existing, patch); return cloneJson(existing); }
    const schedule = { id: uid('schedule'), customerId, staffUserId: input.staffUserId, ...patch, createdAt: new Date().toISOString() };
    state.staffSchedules.push(schedule); return cloneJson(schedule);
  }


  function deleteStaffSchedule(state, customerId, input = {}) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    const staffUserId = input.staffUserId || '';
    const date = String(input.date || '').slice(0, 10);
    const before = state.staffSchedules.length;
    state.staffSchedules = state.staffSchedules.filter((s) => !(s.customerId === customerId && (!staffUserId || s.staffUserId === staffUserId) && (!date || s.date === date)));
    return { deletedCount: before - state.staffSchedules.length };
  }

  function getStaffSchedules(state, customerId, staffUserId = '') {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    return state.staffSchedules.filter((s) => s.customerId === customerId && (!staffUserId || s.staffUserId === staffUserId) && s.active !== false).map(cloneJson).sort((a,b)=>String(a.date || '').localeCompare(String(b.date || '')) || Number(a.weekday)-Number(b.weekday));
  }

  function scheduleFor(state, customerId, staffUserId, dateText) {
    const day = weekdayOf(dateText);
    return getStaffSchedules(state, customerId, staffUserId).find((s) => s.date === dateText) || getStaffSchedules(state, customerId, staffUserId).find((s) => !s.date && Number(s.weekday) === day) || null;
  }

  function attendanceNeedsApproval(schedule, type, timeText) {
    if (!schedule) return type === 'in' ? 'ورود خارج از برنامه کاری' : '';
    if (type === 'in' && minutesOf(timeText) < minutesOf(schedule.startTime)) return 'ورود زودتر از برنامه کاری';
    if (type === 'out' && minutesOf(timeText) > minutesOf(schedule.endTime)) return 'خروج دیرتر از برنامه کاری';
    return '';
  }

  function clockInStaff(state, customerId, input = {}) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    const staff = getStaffById(state, customerId, input.staffUserId);
    const date = input.date || iranGregorianDateText();
    const time = input.time || iranClockTimeText();
    if (state.staffAttendance.some((r) => r.customerId === customerId && r.staffUserId === staff.id && r.date === date && !r.clockOutAt)) throw new Error('ATTENDANCE_ALREADY_OPEN');
    const schedule = scheduleFor(state, customerId, staff.id, date);
    const exceptionType = attendanceNeedsApproval(schedule, 'in', time);
    if (exceptionType && !cleanPersianText(input.reason || '')) throw new Error('ATTENDANCE_REASON_REQUIRED');
    const record = { id: uid('att'), customerId, staffUserId: staff.id, staffName: staff.name, date, clockInAt: `${date}T${time}:00`, clockOutAt: '', scheduleId: schedule?.id || '', scheduledStart: schedule?.startTime || '', scheduledEnd: schedule?.endTime || '', exceptionType, reason: cleanPersianText(input.reason || ''), managerApproval: exceptionType ? 'pending' : 'approved', source: input.source || 'manual', fingerprintDeviceId: input.fingerprintDeviceId || '', createdAt: new Date().toISOString() };
    state.staffAttendance.push(record); return record;
  }

  function clockOutStaff(state, customerId, attendanceId, input = {}) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    const rec = state.staffAttendance.find((r) => r.id === attendanceId && r.customerId === customerId);
    if (!rec) throw new Error('ATTENDANCE_NOT_FOUND');
    if (rec.clockOutAt) throw new Error('ATTENDANCE_ALREADY_CLOSED');
    const date = rec.date;
    const time = input.time || iranClockTimeText();
    const schedule = scheduleFor(state, customerId, rec.staffUserId, date);
    const exceptionType = attendanceNeedsApproval(schedule, 'out', time);
    if (exceptionType && !cleanPersianText(input.reason || '')) throw new Error('ATTENDANCE_REASON_REQUIRED');
    rec.clockOutAt = `${date}T${time}:00`;
    if (exceptionType) rec.exceptionType = rec.exceptionType ? `${rec.exceptionType} + ${exceptionType}` : exceptionType;
    if (input.reason) rec.reason = rec.reason ? `${rec.reason} / ${cleanPersianText(input.reason)}` : cleanPersianText(input.reason);
    if (exceptionType) rec.managerApproval = 'pending';
    rec.sourceOut = input.source || 'manual';
    rec.fingerprintDeviceId = input.fingerprintDeviceId || rec.fingerprintDeviceId || '';
    return rec;
  }

  function approveStaffAttendance(state, customerId, attendanceId, approved = true) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    const rec = state.staffAttendance.find((r) => r.id === attendanceId && r.customerId === customerId);
    if (!rec) throw new Error('ATTENDANCE_NOT_FOUND');
    rec.managerApproval = approved ? 'approved' : 'rejected';
    rec.reviewedAt = new Date().toISOString(); return rec;
  }

  function deleteStaffAttendance(state, customerId, attendanceId) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    const index = state.staffAttendance.findIndex((r) => r.id === attendanceId && r.customerId === customerId);
    if (index === -1) throw new Error('ATTENDANCE_NOT_FOUND');
    const [deleted] = state.staffAttendance.splice(index, 1);
    return deleted;
  }

  function getStaffAttendance(state, customerId) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    return state.staffAttendance.filter((r) => r.customerId === customerId).map(cloneJson).sort((a,b)=>String(b.clockInAt).localeCompare(String(a.clockInAt)));
  }

  function calculateStaffPayroll(state, customerId, filters = {}) {
    requireCustomer(state, customerId); ensureStaffHrCollections(state);
    const staff = getStaffUsers(state, customerId);
    const byId = Object.fromEntries(staff.map((s)=>[s.id,s]));
    const rows = getStaffAttendance(state, customerId).filter((r)=>r.clockInAt && r.clockOutAt && r.managerApproval !== 'pending' && r.managerApproval !== 'rejected')
      .filter((r)=>!filters.staffUserId || r.staffUserId === filters.staffUserId);
    const totals = {};
    for (const r of rows) {
      const hours = Math.max(0, (new Date(r.clockOutAt).getTime() - new Date(r.clockInAt).getTime()) / 3600000);
      const wage = Number(byId[r.staffUserId]?.hourlyWage || 0);
      if (!totals[r.staffUserId]) totals[r.staffUserId] = { staffUserId: r.staffUserId, staffName: byId[r.staffUserId]?.name || r.staffName, hours: 0, hourlyWage: wage, wage: 0 };
      totals[r.staffUserId].hours += hours; totals[r.staffUserId].wage += hours * wage;
    }
    return Object.values(totals).map((x)=>({ ...x, hours: Number(x.hours.toFixed(2)), wage: Math.round(x.wage) }));
  }

  function getFingerprintDeviceContract() {
    return { mode: 'external-usb-scanner', events: ['fingerprint.enrolled','fingerprint.clockIn','fingerprint.clockOut'], requiredPayload: ['customerId','staffUserId','fingerprintTemplateId','deviceId','capturedAt'], note: 'اسکنر کوچک اکسترنال باید از طریق درایور/Bridge امن اثر انگشت را به staffUserId وصل کند؛ اثر خام ذخیره نمی‌شود و فقط templateId/verification result ثبت می‌شود.' };
  }

  function setPackage(state, customerId, packageName) {
    requireCustomer(state, customerId).packageName = packageName;
  }

  function getEnabledModules(state, customerId) {
    const customer = requireCustomer(state, customerId);
    return packages[customer.packageName] || [];
  }

  function createMenu(state, customerId, input) {
    requireCustomer(state, customerId);
    const menu = {
      id: uid('menu'),
      customerId,
      name: input.name || 'منوی اصلی',
      branchName: input.branchName || 'شعبه مرکزی',
      isPublished: input.isPublished ?? false,
      createdAt: new Date().toISOString(),
    };
    state.menus.push(menu);
    return menu;
  }

  function updateMenu(state, customerId, menuId, input = {}) {
    requireCustomer(state, customerId);
    const menu = state.menus.find((m) => m.id === menuId && m.customerId === customerId);
    if (!menu) throw new Error('MENU_NOT_FOUND');
    if (input.name !== undefined) menu.name = input.name || 'منوی اصلی';
    if (input.branchName !== undefined) menu.branchName = input.branchName || 'شعبه مرکزی';
    if (input.isPublished !== undefined) menu.isPublished = Boolean(input.isPublished);
    return menu;
  }

  function detachRecipesFromRemovedItems(state, customerId, removedItems) {
    const removedById = new Map(removedItems.map((item) => [item.id, item]));
    for (const recipe of state.recipes) {
      if (recipe.customerId !== customerId || !removedById.has(recipe.itemId)) continue;
      const item = removedById.get(recipe.itemId);
      recipe.itemName = recipe.itemName || item.name || '';
      recipe.category = recipe.category || item.category || '';
      recipe.itemId = '';
    }
  }

  function deleteMenu(state, customerId, menuId) {
    requireCustomer(state, customerId);
    const index = state.menus.findIndex((m) => m.id === menuId && m.customerId === customerId);
    if (index === -1) throw new Error('MENU_NOT_FOUND');
    const [removed] = state.menus.splice(index, 1);
    const removedItems = state.menuItems.filter((i) => i.customerId === customerId && i.menuId === menuId);
    detachRecipesFromRemovedItems(state, customerId, removedItems);
    state.menuItems = state.menuItems.filter((i) => !(i.customerId === customerId && i.menuId === menuId));
    return removed;
  }

  function createMenuItem(state, customerId, menuId, input) {
    requireCustomer(state, customerId);
    if (!state.menus.some((m) => m.id === menuId && m.customerId === customerId)) throw new Error('MENU_NOT_FOUND');
    const item = {
      id: uid('item'),
      customerId,
      menuId,
      name: cleanPersianText(input.name),
      category: input.category || 'عمومی',
      price: Number(input.price || 0),
      prepTimeMinutes: Number(input.prepTimeMinutes || 15),
      kitchenStation: normalizeKitchenStation(input.kitchenStation),
      available: input.available ?? true,
      description: input.description || '',
      userAdded: input.userAdded !== false,
    };
    state.menuItems.push(item);
    return item;
  }

  function updateMenuItem(state, customerId, itemId, input) {
    requireCustomer(state, customerId);
    const item = state.menuItems.find((i) => i.id === itemId && i.customerId === customerId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    if (input.menuId !== undefined) {
      if (!state.menus.some((m) => m.id === input.menuId && m.customerId === customerId)) throw new Error('MENU_NOT_FOUND');
      item.menuId = input.menuId;
    }
    if (input.name !== undefined) item.name = input.name;
    if (input.category !== undefined) item.category = input.category || 'عمومی';
    if (input.price !== undefined) item.price = Number(input.price || 0);
    if (input.prepTimeMinutes !== undefined) item.prepTimeMinutes = Number(input.prepTimeMinutes || 0);
    if (input.kitchenStation !== undefined) item.kitchenStation = normalizeKitchenStation(input.kitchenStation);
    if (input.available !== undefined) item.available = Boolean(input.available);
    if (input.description !== undefined) item.description = input.description || '';
    return item;
  }

  function deleteMenuItem(state, customerId, itemId) {
    requireCustomer(state, customerId);
    const index = state.menuItems.findIndex((i) => i.id === itemId && i.customerId === customerId);
    if (index === -1) throw new Error('ITEM_NOT_FOUND');
    const [removed] = state.menuItems.splice(index, 1);
    detachRecipesFromRemovedItems(state, customerId, [removed]);
    return removed;
  }

  function getCustomerMenus(state, customerId) {
    return state.menus.filter((m) => m.customerId === customerId);
  }

  function getPublicMenu(state, customerId) {
    const customer = requireCustomer(state, customerId);
    const menus = state.menus.filter((m) => m.customerId === customerId && m.isPublished);
    const menuIds = new Set(menus.map((m) => m.id));
    const items = state.menuItems.filter((i) => i.customerId === customerId && i.userAdded === true && menuIds.has(i.menuId) && i.available);
    return {
      customer: {
        id: customer.id,
        businessName: customer.businessName,
        phone: customer.phone,
      },
      menus,
      items,
    };
  }

  function createInventoryItem(state, customerId, input) {
    requireCustomer(state, customerId);
    const normalized = normalizeInventoryInput(input);
    const inv = {
      id: uid('inv'),
      customerId,
      name: cleanPersianText(input.name),
      unit: normalized.unit,
      recipeUnit: normalized.inputUnit !== normalized.unit ? normalized.inputUnit : normalized.unit,
      stock: normalized.stock,
      unitCost: normalized.unitCost,
      minStock: normalized.minStock,
    };
    state.inventory.push(inv);
    return inv;
  }

  function updateInventoryItem(state, customerId, inventoryItemId, input) {
    requireCustomer(state, customerId);
    const inv = state.inventory.find((i) => i.id === inventoryItemId && i.customerId === customerId);
    if (!inv) throw new Error('INVENTORY_NOT_FOUND');
    if (input.name !== undefined) inv.name = cleanPersianText(input.name);
    if (input.unit !== undefined || input.stock !== undefined || input.unitCost !== undefined || input.minStock !== undefined) {
      const normalized = normalizeInventoryInput({
        unit: input.unit || inv.unit,
        stock: input.stock !== undefined ? input.stock : inv.stock,
        unitCost: input.unitCost !== undefined ? input.unitCost : inv.unitCost,
        minStock: input.minStock !== undefined ? input.minStock : inv.minStock,
      });
      inv.unit = normalized.unit;
      inv.recipeUnit = normalized.inputUnit !== normalized.unit ? normalized.inputUnit : normalized.unit;
      inv.stock = normalized.stock;
      inv.unitCost = normalized.unitCost;
      inv.minStock = normalized.minStock;
    }
    return inv;
  }

  function deleteInventoryItem(state, customerId, inventoryItemId) {
    requireCustomer(state, customerId);
    const index = state.inventory.findIndex((i) => i.id === inventoryItemId && i.customerId === customerId);
    if (index === -1) throw new Error('INVENTORY_NOT_FOUND');
    const usedInRecipe = state.recipes.some((r) => r.customerId === customerId && r.ingredients.some((ing) => ing.inventoryItemId === inventoryItemId));
    if (usedInRecipe) throw new Error('INVENTORY_USED_IN_RECIPE');
    const [removed] = state.inventory.splice(index, 1);
    return removed;
  }

  function recordInventoryPurchase(state, customerId, inventoryItemId, input) {
    requireCustomer(state, customerId);
    const inv = state.inventory.find((i) => i.id === inventoryItemId && i.customerId === customerId);
    if (!inv) throw new Error('INVENTORY_NOT_FOUND');
    const purchaseUnit = normalizeUnit(input.unit || inv.unit);
    const qty = Number(input.qty || 0);
    const unitCost = Number(input.unitCost || 0);
    if (qty <= 0) throw new Error('PURCHASE_QTY_REQUIRED');
    if (unitCost < 0) throw new Error('PURCHASE_UNIT_COST_INVALID');
    const beforeStock = Number(inv.stock || 0);
    const beforeUnitCost = Number(inv.unitCost || 0);
    const storageQty = convertQty(qty, purchaseUnit, inv.unit);
    const storageUnitCost = unitCost;
    const totalPurchaseCost = storageQty * storageUnitCost;
    const afterStock = Number((beforeStock + storageQty).toFixed(6));
    inv.stock = afterStock;
    if (storageUnitCost > beforeUnitCost) inv.unitCost = storageUnitCost;
    const purchase = {
      id: uid('pur'),
      customerId,
      invoiceId: input.invoiceId || '',
      inventoryItemId: inv.id,
      inventoryName: inv.name,
      title: input.title || `خرید ${inv.name}`,
      supplier: input.supplier || '',
      qty,
      unit: purchaseUnit,
      storageQty,
      storageUnit: inv.unit,
      unitCost,
      storageUnitCost,
      totalCost: totalPurchaseCost,
      beforeStock,
      afterStock,
      beforeUnitCost,
      afterUnitCost: inv.unitCost,
      priceUpdated: inv.unitCost !== beforeUnitCost,
      paymentStatus: input.paymentStatus === 'paid' ? 'paid' : 'unpaid',
      accountingNote: 'افزایش موجودی انبار؛ قیمت واحد فقط وقتی قیمت خرید جدید بیشتر باشد بروزرسانی می‌شود، قیمت تمام‌شده از همین نرخ مصرف می‌خواند و قیمت فروش دستی می‌ماند.',
      createdAt: input.createdAt || new Date().toISOString(),
    };
    state.purchases.push(purchase);
    if (!input.invoiceId) syncInventoryPurchaseLedger(state, purchase);
    return purchase;
  }

  function syncInventoryPurchaseLedger(state, purchase) {
    state.ledger = state.ledger.filter((l) => !(l.type === 'supplier-payment' && l.sourceId === purchase.id));
    if (purchase.paymentStatus === 'paid') {
      state.ledger.push({
        id: uid('led'),
        customerId: purchase.customerId,
        type: 'supplier-payment',
        amount: purchase.totalCost,
        sourceId: purchase.id,
        title: purchase.title,
        counterparty: purchase.supplier || '',
        createdAt: purchase.paymentStatusUpdatedAt || purchase.createdAt,
      });
    }
  }

  function updateInventoryPurchasePaymentStatus(state, customerId, purchaseId, paymentStatus) {
    requireCustomer(state, customerId);
    const purchase = state.purchases.find((p) => p.id === purchaseId && p.customerId === customerId);
    if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
    if (!['paid', 'unpaid'].includes(paymentStatus)) throw new Error('PURCHASE_PAYMENT_STATUS_INVALID');
    purchase.paymentStatus = paymentStatus;
    purchase.paymentStatusUpdatedAt = new Date().toISOString();
    syncInventoryPurchaseLedger(state, purchase);
    return purchase;
  }


  const financialAccountTypes = {
    bank: 'حساب بانکی',
    cash: 'صندوق نقدی',
    pos: 'کارت‌خوان',
    online: 'آنلاین',
    cheque: 'چک',
    petty: 'آنلاین',
  };
  const paymentMethods = ['بانکی', 'نقدی', 'چکی'];

  function normalizeDateDigits(value) {
    return String(value || '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  }

  function toGregorianFromJalali(jy, jm, jd) {
    jy = Number(jy) - 979; jm = Number(jm) - 1; jd = Number(jd) - 1;
    const jMonthDays = [31,31,31,31,31,31,30,30,30,30,30,29];
    let jDayNo = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
    for (let i = 0; i < jm; ++i) jDayNo += jMonthDays[i];
    jDayNo += jd;
    let gDayNo = jDayNo + 79;
    let gy = 1600 + 400 * Math.floor(gDayNo / 146097); gDayNo %= 146097;
    let leap = true;
    if (gDayNo >= 36525) { gDayNo--; gy += 100 * Math.floor(gDayNo / 36524); gDayNo %= 36524; if (gDayNo >= 365) gDayNo++; else leap = false; }
    gy += 4 * Math.floor(gDayNo / 1461); gDayNo %= 1461;
    if (gDayNo >= 366) { leap = false; gDayNo--; gy += Math.floor(gDayNo / 365); gDayNo %= 365; }
    const gMonthDays = [31, leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
    let gm = 0;
    while (gm < 12 && gDayNo >= gMonthDays[gm]) { gDayNo -= gMonthDays[gm]; gm++; }
    return { gy, gm: gm + 1, gd: gDayNo + 1 };
  }

  function isoFromPersianDate(value) {
    const raw = normalizeDateDigits(value).trim();
    if (!raw) return new Date().toISOString();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00.000Z`).toISOString();
    const match = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (!match) return new Date().toISOString();
    const jy = Number(match[1]);
    if (jy > 1500) return new Date(`${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}T00:00:00.000Z`).toISOString();
    const g = toGregorianFromJalali(jy, match[2], match[3]);
    return new Date(`${g.gy}-${String(g.gm).padStart(2,'0')}-${String(g.gd).padStart(2,'0')}T00:00:00.000Z`).toISOString();
  }
  const expenseCategories = ['خرید مواد اولیه', 'اجاره ملک', 'حقوق و دستمزد', 'تعمیرات و نگهداری', 'قبوض', 'تجهیزات و ابزار', 'خدمات', 'سایر هزینه‌ها'];

  function normalizePaymentMethod(value) {
    const text = String(value || 'نقدی').trim();
    return paymentMethods.includes(text) ? text : 'نقدی';
  }

  function normalizeFinancialAccountType(type) {
    const text = String(type || 'bank').trim();
    return text === 'petty' ? 'online' : (financialAccountTypes[text] ? text : 'bank');
  }

  function createFinancialAccount(state, customerId, input = {}) {
    requireCustomer(state, customerId);
    const name = cleanPersianText(input.name || 'حساب مالی');
    if (!name) throw new Error('FINANCIAL_ACCOUNT_NAME_REQUIRED');
    const account = {
      id: uid('acct'),
      customerId,
      name,
      type: normalizeFinancialAccountType(input.type),
      openingBalance: Number(input.openingBalance || 0),
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    state.financialAccounts = state.financialAccounts || [];
    state.financialAccounts.push(account);
    return account;
  }

  function updateFinancialAccount(state, customerId, accountId, input = {}) {
    requireCustomer(state, customerId);
    const account = (state.financialAccounts || []).find((item) => item.id === accountId && item.customerId === customerId);
    if (!account) throw new Error('FINANCIAL_ACCOUNT_NOT_FOUND');
    if (input.name !== undefined) {
      const name = cleanPersianText(input.name);
      if (!name) throw new Error('FINANCIAL_ACCOUNT_NAME_REQUIRED');
      account.name = name;
    }
    if (input.type !== undefined) account.type = normalizeFinancialAccountType(input.type);
    if (input.openingBalance !== undefined) account.openingBalance = Number(input.openingBalance || 0);
    account.updatedAt = new Date().toISOString();
    return account;
  }

  function getFinancialAccounts(state, customerId) {
    requireCustomer(state, customerId);
    return (state.financialAccounts || [])
      .filter((account) => account.customerId === customerId)
      .map((account) => cloneJson(account));
  }

  function deleteFinancialAccount(state, customerId, accountId) {
    requireCustomer(state, customerId);
    const index = (state.financialAccounts || []).findIndex((account) => account.id === accountId && account.customerId === customerId);
    if (index === -1) throw new Error('FINANCIAL_ACCOUNT_NOT_FOUND');
    const [removed] = state.financialAccounts.splice(index, 1);
    (state.ledger || []).forEach((entry) => { if (entry.customerId === customerId && entry.accountId === accountId) entry.accountId = ''; });
    (state.expenses || []).forEach((expense) => { if (expense.customerId === customerId && expense.accountId === accountId) expense.accountId = ''; });
    (state.purchases || []).forEach((purchase) => { if (purchase.customerId === customerId && purchase.accountId === accountId) purchase.accountId = ''; });
    return removed;
  }

  function requireFinancialAccountForPayment(state, customerId, accountId, paymentMethod) {
    const method = normalizePaymentMethod(paymentMethod);
    if (!accountId && method !== 'چکی') return null;
    const account = (state.financialAccounts || []).find((item) => item.id === accountId && item.customerId === customerId);
    if (!account) throw new Error('FINANCIAL_ACCOUNT_NOT_FOUND');
    return account;
  }

  function createChequeForPayment(state, customerId, input = {}) {
    const chequeNumber = String(input.chequeNumber || '').trim();
    const dueDate = String(input.chequeDueDate || input.dueDate || '').trim();
    if (!chequeNumber) throw new Error('CHEQUE_NUMBER_REQUIRED');
    if (!dueDate) throw new Error('CHEQUE_DUE_DATE_REQUIRED');
    const cheque = {
      id: uid('chk'),
      customerId,
      direction: input.direction || 'payable',
      chequeNumber,
      dueDate,
      amount: Number(input.amount || 0),
      accountId: input.accountId || '',
      sourceId: input.sourceId || '',
      title: input.title || '',
      status: 'در انتظار',
      createdAt: new Date().toISOString(),
    };
    state.cheques = state.cheques || [];
    state.cheques.push(cheque);
    return cheque;
  }

  function paymentDetailsFromInput(state, customerId, input = {}, amount = 0, sourceId = '', title = '') {
    const paymentMethod = normalizePaymentMethod(input.paymentMethod || input.payment || 'نقدی');
    const account = requireFinancialAccountForPayment(state, customerId, input.accountId || '', paymentMethod);
    const details = { paymentMethod, accountId: account?.id || '', accountName: account?.name || '' };
    if (paymentMethod === 'چکی') {
      const cheque = createChequeForPayment(state, customerId, { ...input, amount, accountId: details.accountId, sourceId, title });
      details.chequeId = cheque.id;
      details.chequeNumber = cheque.chequeNumber;
      details.chequeDueDate = cheque.dueDate;
    }
    return details;
  }

  function chequeDueTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return Number.NaN;
    try { return new Date(isoFromPersianDate(raw)).getTime(); }
    catch { return Number.NaN; }
  }

  function getChequeWarnings(state, customerId, now = new Date(), daysAhead = 4) {
    requireCustomer(state, customerId);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + Number(daysAhead || 4)); end.setHours(23, 59, 59, 999);
    return (state.cheques || [])
      .filter((cheque) => cheque.customerId === customerId && cheque.status === 'در انتظار')
      .map((cheque) => ({ ...cloneJson(cheque), dueTime: chequeDueTime(cheque.dueDate) }))
      .filter((cheque) => Number.isFinite(cheque.dueTime) && cheque.dueTime >= start.getTime() && cheque.dueTime <= end.getTime())
      .sort((a, b) => a.dueTime - b.dueTime)
      .map(({ dueTime, ...cheque }) => cheque);
  }

  function deleteCheque(state, customerId, chequeId) {
    requireCustomer(state, customerId);
    const index = (state.cheques || []).findIndex((cheque) => cheque.id === chequeId && cheque.customerId === customerId && cheque.status === 'در انتظار');
    if (index === -1) throw new Error('CHEQUE_NOT_FOUND');
    const [removed] = state.cheques.splice(index, 1);
    state.ledger = (state.ledger || []).map((entry) => entry.customerId === customerId && entry.chequeId === chequeId ? { ...entry, chequeId: '', chequeNumber: '', chequeDueDate: '' } : entry);
    (state.purchaseInvoices || []).forEach((invoice) => {
      if (invoice.customerId === customerId && invoice.chequeId === chequeId) invoice.chequeId = '';
    });
    return cloneJson(removed);
  }

  function getAccountBalances(state, customerId) {
    requireCustomer(state, customerId);
    return getFinancialAccounts(state, customerId).map((account) => {
      const entries = (state.ledger || []).filter((entry) => entry.customerId === customerId && entry.accountId === account.id);
      const incoming = entries.filter((entry) => entry.direction === 'in').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const outgoing = entries.filter((entry) => entry.direction === 'out').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      return { ...account, incoming, outgoing, balance: Number(account.openingBalance || 0) + incoming - outgoing };
    });
  }

  function importInventoryItems(state, customerId, rows) {
    requireCustomer(state, customerId);
    let createdCount = 0;
    let updatedCount = 0;
    const items = [];
    for (const row of rows || []) {
      const name = cleanPersianText(row.name || row['نام'] || '');
      if (!name) continue;
      const normalized = normalizeInventoryInput({
        unit: row.unit || row['واحد'] || 'عدد',
        stock: row.stock ?? row['موجودی'] ?? 0,
        unitCost: row.unitCost ?? row['قیمت واحد'] ?? row.price ?? 0,
        minStock: row.minStock ?? row['حداقل موجودی'] ?? 0,
      });
      let item = state.inventory.find((inv) => inv.customerId === customerId && normalizeInventoryName(inv.name) === normalizeInventoryName(name));
      if (item) {
        item.unit = normalized.unit;
        item.recipeUnit = normalized.inputUnit !== normalized.unit ? normalized.inputUnit : normalized.unit;
        item.stock = normalized.stock;
        if (normalized.unitCost > Number(item.unitCost || 0)) item.unitCost = normalized.unitCost;
        if (normalized.minStock >= 0) item.minStock = normalized.minStock;
        updatedCount += 1;
      } else {
        item = createInventoryItem(state, customerId, { name, unit: normalized.unit, stock: normalized.stock, unitCost: normalized.unitCost, minStock: normalized.minStock });
        createdCount += 1;
      }
      items.push(item);
    }
    return { createdCount, updatedCount, items: items.map((item) => cloneJson(item)) };
  }

  function recordPurchaseInvoice(state, customerId, input) {
    requireCustomer(state, customerId);
    const invoiceLines = Array.isArray(input.lines) ? input.lines : [];
    const invoiceDate = String(input.invoiceDate || input.documentDate || '').trim();
    const documentDate = String(input.documentDate || invoiceDate || '').trim();
    const documentNumber = cleanPersianText(input.documentNumber || '');
    const createdAt = invoiceDate ? isoFromPersianDate(invoiceDate) : new Date().toISOString();
    const invoice = {
      id: uid('pinv'),
      customerId,
      title: input.title || 'فاکتور خرید مواد اولیه',
      supplier: input.supplier || '',
      invoiceDate,
      documentDate,
      documentNumber,
      paymentStatus: input.paymentStatus === 'paid' ? 'paid' : 'unpaid',
      paymentMethod: normalizePaymentMethod(input.paymentMethod || 'بانکی'),
      accountId: input.accountId || '',
      lines: [],
      manualAmount: Number(input.amount || input.totalCost || 0),
      totalCost: 0,
      createdAt,
    };
    for (const line of invoiceLines) {
      const name = cleanPersianText(line.name || '');
      if (!name) continue;
      const invoiceUnit = normalizeUnit(line.unit || 'عدد');
      const storageUnit = storageUnitFor(invoiceUnit);
      let inv = state.inventory.find((item) => item.customerId === customerId && normalizeInventoryName(item.name) === normalizeInventoryName(name));
      if (!inv) inv = createInventoryItem(state, customerId, { name, unit: storageUnit, stock: 0, unitCost: 0, minStock: 0 });
      const purchase = recordInventoryPurchase(state, customerId, inv.id, {
        title: `${invoice.title} — ${name}`,
        supplier: invoice.supplier,
        qty: Number(line.qty || 0),
        unit: invoiceUnit,
        unitCost: Number(line.unitCost || 0),
        paymentStatus: invoice.paymentStatus,
        invoiceId: invoice.id,
        createdAt: invoice.createdAt,
      });
      invoice.totalCost += purchase.totalCost;
      invoice.lines.push({
        purchaseId: purchase.id,
        inventoryItemId: inv.id,
        name: inv.name,
        qty: purchase.qty,
        unit: purchase.unit,
        storageQty: purchase.storageQty,
        storageUnit: purchase.storageUnit,
        unitCost: purchase.unitCost,
        totalCost: purchase.totalCost,
        priceUpdated: purchase.priceUpdated,
      });
    }
    invoice.totalCost = Number((invoice.lines.length ? invoice.totalCost : invoice.manualAmount).toFixed(6));
    if (!Array.isArray(state.purchaseInvoices)) state.purchaseInvoices = [];
    state.purchaseInvoices.push(invoice);
    if (invoice.paymentStatus === 'paid' && invoice.totalCost > 0) {
      const paymentDetails = paymentDetailsFromInput(state, customerId, input, invoice.totalCost, invoice.id, invoice.title);
      invoice.paymentMethod = paymentDetails.paymentMethod;
      invoice.accountId = paymentDetails.accountId;
      invoice.chequeId = paymentDetails.chequeId || '';
      state.ledger.push({ id: uid('led'), customerId, type: 'supplier-payment', direction: 'out', amount: invoice.totalCost, sourceId: invoice.id, title: invoice.title, counterparty: invoice.supplier, createdAt: invoice.createdAt, ...paymentDetails });
    }
    return invoice;
  }

  function reversePurchaseInvoiceEffects(state, customerId, invoiceId) {
    const purchases = state.purchases.filter((purchase) => purchase.customerId === customerId && purchase.invoiceId === invoiceId);
    purchases.forEach((purchase) => {
      const inv = state.inventory.find((item) => item.id === purchase.inventoryItemId && item.customerId === customerId);
      if (inv) {
        inv.stock = Number((Number(inv.stock || 0) - Number(purchase.storageQty || 0)).toFixed(6));
        if (purchase.priceUpdated) inv.unitCost = Number(purchase.beforeUnitCost || inv.unitCost || 0);
      }
    });
    state.purchases = state.purchases.filter((purchase) => !(purchase.customerId === customerId && purchase.invoiceId === invoiceId));
    state.ledger = state.ledger.filter((entry) => !(entry.customerId === customerId && entry.sourceId === invoiceId));
  }

  function getPurchaseInvoices(state, customerId) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.purchaseInvoices)) state.purchaseInvoices = [];
    return state.purchaseInvoices.filter((invoice) => invoice.customerId === customerId).map(cloneJson).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function deletePurchaseInvoice(state, customerId, invoiceId) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.purchaseInvoices)) state.purchaseInvoices = [];
    const index = state.purchaseInvoices.findIndex((invoice) => invoice.id === invoiceId && invoice.customerId === customerId);
    if (index === -1) throw new Error('PURCHASE_INVOICE_NOT_FOUND');
    const [removed] = state.purchaseInvoices.splice(index, 1);
    reversePurchaseInvoiceEffects(state, customerId, invoiceId);
    return removed;
  }

  function updatePurchaseInvoice(state, customerId, invoiceId, input) {
    requireCustomer(state, customerId);
    const existing = (state.purchaseInvoices || []).find((invoice) => invoice.id === invoiceId && invoice.customerId === customerId);
    if (!existing) throw new Error('PURCHASE_INVOICE_NOT_FOUND');
    deletePurchaseInvoice(state, customerId, invoiceId);
    const updated = recordPurchaseInvoice(state, customerId, input);
    const oldId = updated.id;
    updated.id = invoiceId;
    state.purchases.forEach((purchase) => { if (purchase.invoiceId === oldId && purchase.customerId === customerId) purchase.invoiceId = invoiceId; });
    state.ledger.forEach((entry) => { if (entry.sourceId === oldId && entry.customerId === customerId) entry.sourceId = invoiceId; });
    return updated;
  }


  function updatePurchaseInvoicePaymentStatus(state, customerId, invoiceId, paymentStatus, input = {}) {
    requireCustomer(state, customerId);
    const invoice = (state.purchaseInvoices || []).find((item) => item.id === invoiceId && item.customerId === customerId);
    if (!invoice) throw new Error('PURCHASE_INVOICE_NOT_FOUND');
    if (!['paid', 'unpaid'].includes(paymentStatus)) throw new Error('PURCHASE_INVOICE_PAYMENT_STATUS_INVALID');
    invoice.paymentStatus = paymentStatus;
    invoice.paymentStatusUpdatedAt = new Date().toISOString();
    if (input.paymentMethod !== undefined) invoice.paymentMethod = normalizePaymentMethod(input.paymentMethod);
    if (input.accountId !== undefined) invoice.accountId = input.accountId || '';
    state.purchases.forEach((purchase) => {
      if (purchase.customerId === customerId && purchase.invoiceId === invoiceId) {
        purchase.paymentStatus = paymentStatus;
        purchase.paymentStatusUpdatedAt = invoice.paymentStatusUpdatedAt;
      }
    });
    state.ledger = state.ledger.filter((entry) => !(entry.customerId === customerId && entry.sourceId === invoiceId && entry.type === 'supplier-payment'));
    if (paymentStatus === 'paid' && Number(invoice.totalCost || 0) > 0) {
      const paymentDetails = paymentDetailsFromInput(state, customerId, { ...invoice, ...input }, invoice.totalCost, invoice.id, invoice.title);
      invoice.paymentMethod = paymentDetails.paymentMethod;
      invoice.accountId = paymentDetails.accountId;
      invoice.chequeId = paymentDetails.chequeId || invoice.chequeId || '';
      invoice.chequeNumber = paymentDetails.chequeNumber || invoice.chequeNumber || '';
      invoice.chequeDueDate = paymentDetails.chequeDueDate || invoice.chequeDueDate || '';
      state.ledger.push({ id: uid('led'), customerId, type: 'supplier-payment', direction: 'out', amount: invoice.totalCost, sourceId: invoice.id, title: invoice.title, counterparty: invoice.supplier, createdAt: invoice.paymentStatusUpdatedAt, ...paymentDetails });
    }
    return cloneJson(invoice);
  }


  function findInventory(state, inventoryItemId) {
    const inv = state.inventory.find((i) => i.id === inventoryItemId);
    if (!inv) throw new Error('INVENTORY_NOT_FOUND');
    return inv;
  }

  function calculateRecipeCost(state, customerId, ingredients) {
    requireCustomer(state, customerId);
    let totalCost = 0;
    const lines = ingredients.map((x) => {
      const inv = state.inventory.find((i) => i.id === x.inventoryItemId && i.customerId === customerId);
      if (!inv) throw new Error('INVENTORY_NOT_FOUND');
      const qty = Number(x.qty || 0);
      const unit = normalizeUnit(x.unit || inv.recipeUnit || inv.unit);
      const storageQty = convertQty(qty, unit, inv.unit);
      const lineCost = Number((storageQty * inv.unitCost).toFixed(6));
      totalCost += lineCost;
      return {
        inventoryItemId: inv.id,
        name: inv.name,
        unit,
        storageUnit: inv.unit,
        qty,
        storageQty,
        unitCost: inv.unitCost,
        lineCost,
      };
    });
    return { lines, totalCost: Number(totalCost.toFixed(6)) };
  }

  function setRecipe(state, customerId, itemId, ingredients, options = {}) {
    requireCustomer(state, customerId);
    if (itemId && !state.menuItems.some((i) => i.id === itemId && i.customerId === customerId)) throw new Error('ITEM_NOT_FOUND');
    calculateRecipeCost(state, customerId, ingredients);
    state.recipes = state.recipes.filter((r) => !(r.customerId === customerId && r.itemId === itemId && itemId));
    const recipe = { id: uid('rec'), customerId, itemId: itemId || '', itemName: options.itemName || '', category: options.category || '', ingredients: ingredients.map((x) => {
      const inv = state.inventory.find((i) => i.id === x.inventoryItemId);
      return { inventoryItemId: x.inventoryItemId, qty: Number(x.qty || 0), unit: normalizeUnit(x.unit || inv?.recipeUnit || inv?.unit || 'عدد') };
    }), cookingSteps: options.cookingSteps || '' };
    state.recipes.push(recipe);
    return recipe;
  }

  function deleteRecipe(state, customerId, recipeId) {
    requireCustomer(state, customerId);
    const index = state.recipes.findIndex((r) => r.id === recipeId && r.customerId === customerId);
    if (index === -1) throw new Error('RECIPE_NOT_FOUND');
    const [removed] = state.recipes.splice(index, 1);
    return removed;
  }

  function normalizeCustomerPhone(value = '') {
    return String(value || '').replace(/[\s\-()+]/g, '').trim();
  }

  function ensureCustomerProfileCollection(state) {
    if (!Array.isArray(state.customerProfiles)) state.customerProfiles = [];
    return state.customerProfiles;
  }

  function upsertCustomerProfile(state, customerId, input = {}, activity = {}) {
    requireCustomer(state, customerId);
    const profiles = ensureCustomerProfileCollection(state);
    const phone = normalizeCustomerPhone(input.phone || input.guestContact || input.contact || '');
    const name = String(input.name || input.guestName || '').trim();
    const now = activity.at || new Date().toISOString();
    if (!phone && !name && !input.id) return null;
    let profile = input.id ? profiles.find((item) => item.id === input.id && item.customerId === customerId) : null;
    if (!profile && phone) profile = profiles.find((item) => item.customerId === customerId && normalizeCustomerPhone(item.phone) === phone);
    if (!profile && !phone && name) profile = profiles.find((item) => item.customerId === customerId && cleanPersianText(item.name) === cleanPersianText(name));
    if (!profile) {
      profile = { id: uid('cpr'), customerId, name: name || phone || 'مشتری بدون نام', phone, source: input.source || activity.source || 'manual', tags: [], notes: '', optIn: input.optIn !== false, visitCount: 0, totalSpend: 0, averageSpend: 0, lastSeenAt: '', firstSeenAt: now, lastOrderId: '', lastRating: null, complaintCount: 0, createdAt: now, updatedAt: now };
      profiles.push(profile);
    }
    if (name) profile.name = name;
    if (phone) profile.phone = phone;
    if (input.source || activity.source) profile.source = input.source || activity.source;
    if (input.notes != null) profile.notes = String(input.notes || '').trim();
    if (input.optIn != null) profile.optIn = Boolean(input.optIn);
    if (Array.isArray(input.tags)) profile.tags = [...new Set(input.tags.map((tag) => String(tag || '').trim()).filter(Boolean))];
    if (activity.orderId) {
      const amount = Number(activity.amount || 0);
      profile.visitCount = Number(profile.visitCount || 0) + 1;
      profile.totalSpend = Number(profile.totalSpend || 0) + amount;
      profile.averageSpend = profile.visitCount ? Math.round(profile.totalSpend / profile.visitCount) : 0;
      profile.lastSeenAt = now;
      profile.lastOrderId = activity.orderId;
    }
    if (activity.rating != null) {
      profile.lastRating = Number(activity.rating || 0);
      if (profile.lastRating > 0 && profile.lastRating <= 3) profile.complaintCount = Number(profile.complaintCount || 0) + 1;
    }
    profile.updatedAt = now;
    return profile;
  }

  function daysSinceIso(value, now = new Date()) {
    if (!value) return Infinity;
    const diff = new Date(now).getTime() - new Date(value).getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  }

  function profileSegmentFlags(profile, now = new Date()) {
    const days = daysSinceIso(profile.lastSeenAt || profile.firstSeenAt, now);
    const spend = Number(profile.totalSpend || 0);
    const visits = Number(profile.visitCount || 0);
    return {
      new: visits <= 1 && days <= 14,
      loyal: visits >= 3,
      inactive: visits > 0 && days >= 30,
      highValue: spend >= 1000000 || Number(profile.averageSpend || 0) >= 300000,
      unhappy: Number(profile.lastRating || 0) > 0 && Number(profile.lastRating || 0) <= 3 || Number(profile.complaintCount || 0) > 0,
    };
  }

  function getCustomerProfiles(state, customerId, filters = {}) {
    requireCustomer(state, customerId);
    const query = cleanPersianText(filters.query || '');
    const segment = filters.segment || '';
    return ensureCustomerProfileCollection(state)
      .filter((profile) => profile.customerId === customerId)
      .filter((profile) => !query || [profile.name, profile.phone, profile.source, ...(profile.tags || [])].some((value) => cleanPersianText(value || '').includes(query)))
      .filter((profile) => !segment || Boolean(profileSegmentFlags(profile)[segment]))
      .sort((a, b) => new Date(b.lastSeenAt || b.updatedAt || b.createdAt).getTime() - new Date(a.lastSeenAt || a.updatedAt || a.createdAt).getTime());
  }

  function getCustomerProfileSegments(state, customerId) {
    const profiles = getCustomerProfiles(state, customerId);
    const empty = { new: [], loyal: [], inactive: [], highValue: [], unhappy: [] };
    return profiles.reduce((acc, profile) => {
      const flags = profileSegmentFlags(profile);
      Object.keys(acc).forEach((key) => { if (flags[key]) acc[key].push(profile); });
      return acc;
    }, empty);
  }

  function getCustomerCampaignSuggestions(state, customerId) {
    const segments = getCustomerProfileSegments(state, customerId);
    return [
      { id: 'inactive', title: 'بازگرداندن مشتریان غیرفعال', audience: segments.inactive.length, message: 'سلام، دلمان برای شما تنگ شده! این هفته با این پیام یک پیشنهاد ویژه برای برگشت دارید.' },
      { id: 'highValue', title: 'پیشنهاد VIP برای مشتریان پرخرج', audience: segments.highValue.length, message: 'برای مشتریان ویژه، یک آیتم/خدمت اختصاصی یا امتیاز وفاداری پیشنهاد بده.' },
      { id: 'unhappy', title: 'دلجویی از مشتریان ناراضی', audience: segments.unhappy.length, message: 'اول خصوصی پیگیری کن، عذرخواهی کوتاه و پیشنهاد جبران بده؛ نگذار نظر منفی عمومی شود.' },
    ];
  }

  function createSale(state, customerId, lines, paymentMethod = 'cash', options = {}) {
    requireCustomer(state, customerId);
    let total = 0;
    let cost = 0;
    const consumedInventory = new Map();
    const orderLines = lines.map((line) => {
      const item = state.menuItems.find((i) => i.id === line.itemId && i.customerId === customerId);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      const qty = Number(line.qty || 1);
      total += item.price * qty;
      const recipe = state.recipes.find((r) => r.customerId === customerId && r.itemId === item.id);
      if (recipe) {
        for (const ing of recipe.ingredients) {
          const inv = findInventory(state, ing.inventoryItemId);
          if (inv.customerId !== customerId) throw new Error('INVENTORY_NOT_FOUND');
          const beforeStock = inv.stock;
          const consumed = convertQty(ing.qty, ing.unit || inv.unit, inv.unit) * qty;
          inv.stock = Number((inv.stock - consumed).toFixed(6));
          cost += consumed * inv.unitCost;
          const existing = consumedInventory.get(inv.id) || { inventoryItemId: inv.id, name: inv.name, unit: inv.unit, minStock: inv.minStock, beforeStock, afterStock: inv.stock, consumedQty: 0 };
          existing.afterStock = inv.stock;
          existing.consumedQty = Number((existing.consumedQty + consumed).toFixed(4));
          consumedInventory.set(inv.id, existing);
        }
      }
      const note = String(line.note || '').trim();
      const modifiers = Array.isArray(line.modifiers)
        ? line.modifiers.map((item) => String(item || '').trim()).filter(Boolean)
        : String(line.modifiers || '').split(/[،,\n]/).map((item) => item.trim()).filter(Boolean);
      return { id: line.id || uid('oli'), itemId: item.id, productId: item.id, name: item.name, productNameSnapshot: item.name, price: item.price, unitPriceSnapshot: item.price, qty, quantity: qty, paidQty: Number(line.paidQty || 0), paidQuantity: Number(line.paidQuantity || line.paidQty || 0), note, modifiers, prepTimeMinutes: Number(item.prepTimeMinutes || 15), kitchenStation: normalizeKitchenStation(item.kitchenStation), preparationStation: normalizeKitchenStation(item.kitchenStation), preparationStatus: 'pending', sentToPreparationAt: line.sentToPreparationAt || '', lineTotal: item.price * qty };
    });
    const lowStockWarnings = [...consumedInventory.values()]
      .filter((x) => Number(x.minStock || 0) > 0 && x.beforeStock > x.minStock && x.afterStock <= x.minStock);
    const trackingNumber = state.orders.filter((existing) => existing.customerId === customerId).length + 1;
    const createdAt = new Date().toISOString();
    const initialStatus = normalizeOrderStatus(options.status);
    const guestName = String(options.guestName || '').trim();
    const guestContact = String(options.guestContact || '').trim();
    const orderNote = String(options.orderNote || '').trim();
    const order = { id: uid('ord'), customerId, trackingNumber, guestName, guestContact, orderNote, lines: orderLines, total, cost, paymentMethod, status: initialStatus, statusUpdatedAt: createdAt, completedAt: initialStatus === 'completed' ? createdAt : null, lowStockWarnings, createdAt };
    state.orders.push(order);
    upsertCustomerProfile(state, customerId, { name: guestName || options.customerName || '', phone: guestContact || options.customerPhone || '', source: options.source || (guestContact || guestName ? 'public-order' : '') }, { orderId: order.id, amount: order.total, source: options.source || (guestContact || guestName ? 'public-order' : 'sale'), at: order.createdAt });
    state.ledger.push({ id: uid('led'), customerId, type: 'revenue', direction: 'in', amount: total, sourceId: order.id, createdAt: order.createdAt, paymentMethod });
    if (cost > 0) state.ledger.push({ id: uid('led'), customerId, type: 'cost', amount: cost, sourceId: order.id, createdAt: order.createdAt });
    return order;
  }


  function reverseOrderEffects(state, customerId, order) {
    (order.lines || []).forEach((line) => {
      const recipe = state.recipes.find((r) => r.customerId === customerId && r.itemId === line.itemId);
      if (!recipe) return;
      recipe.ingredients.forEach((ing) => {
        const inv = state.inventory.find((item) => item.id === ing.inventoryItemId && item.customerId === customerId);
        if (!inv) return;
        const restored = convertQty(ing.qty, ing.unit || inv.unit, inv.unit) * Number(line.qty || 0);
        inv.stock = Number((Number(inv.stock || 0) + restored).toFixed(6));
      });
    });
    state.ledger = state.ledger.filter((entry) => !(entry.customerId === customerId && entry.sourceId === order.id));
  }

  function deleteSale(state, customerId, orderId) {
    requireCustomer(state, customerId);
    const index = state.orders.findIndex((order) => order.id === orderId && order.customerId === customerId);
    if (index === -1) throw new Error('ORDER_NOT_FOUND');
    const [removed] = state.orders.splice(index, 1);
    reverseOrderEffects(state, customerId, removed);
    return removed;
  }

  function updateSale(state, customerId, orderId, lines, paymentMethod = 'cash', options = {}) {
    requireCustomer(state, customerId);
    const existing = state.orders.find((order) => order.id === orderId && order.customerId === customerId);
    if (!existing) throw new Error('ORDER_NOT_FOUND');
    const oldMeta = { id: existing.id, trackingNumber: existing.trackingNumber, createdAt: existing.createdAt, status: existing.status, statusUpdatedAt: existing.statusUpdatedAt, completedAt: existing.completedAt };
    reverseOrderEffects(state, customerId, existing);
    const temp = createSale(state, customerId, lines, paymentMethod, { ...options, status: oldMeta.status });
    state.orders = state.orders.filter((order) => order.id !== temp.id);
    Object.assign(existing, temp, oldMeta, { paymentMethod });
    state.ledger.forEach((entry) => { if (entry.sourceId === temp.id && entry.customerId === customerId) { entry.sourceId = oldMeta.id; entry.createdAt = oldMeta.createdAt; } });
    return existing;
  }

  function updateOrderStatus(state, customerId, orderId, status, now = new Date()) {
    requireCustomer(state, customerId);
    if (!orderStatuses.includes(status)) throw new Error('ORDER_STATUS_INVALID');
    const order = state.orders.find((item) => item.id === orderId && item.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    order.status = status;
    order.statusUpdatedAt = new Date(now).toISOString();
    order.completedAt = status === 'completed' ? order.statusUpdatedAt : null;
    return order;
  }

  function advanceOrderStatus(state, customerId, orderId, now = new Date()) {
    requireCustomer(state, customerId);
    const order = state.orders.find((item) => item.id === orderId && item.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    const current = normalizeOrderStatus(order.status);
    const next = orderStatuses[Math.min(orderStatuses.indexOf(current) + 1, orderStatuses.length - 1)];
    return updateOrderStatus(state, customerId, orderId, next, now);
  }



  function ensureHallTables(state, customerId) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.restaurantTables)) state.restaurantTables = [];
    const customer = state.customers.find((item) => item.id === customerId);
    const settings = customer?.hallTableSettings || { count: 8, prefix: 'میز', startNumber: 1, customNames: [] };
    const existing = state.restaurantTables.filter((table) => table.customerId === customerId);
    if (!existing.length) configureHallTables(state, customerId, settings);
    return state.restaurantTables.filter((table) => table.customerId === customerId);
  }

  function configureHallTables(state, customerId, input = {}) {
    requireCustomer(state, customerId);
    if (!Array.isArray(state.restaurantTables)) state.restaurantTables = [];
    const customer = state.customers.find((item) => item.id === customerId);
    const count = Math.max(1, Math.min(80, Math.floor(Number(input.count || 8))));
    const prefix = String(input.prefix || 'میز').trim() || 'میز';
    const startNumber = Math.max(1, Math.floor(Number(input.startNumber || 1)));
    const customNames = Array.isArray(input.customNames) ? input.customNames.map((item) => String(item || '').trim()).filter(Boolean) : [];
    const current = state.restaurantTables.filter((table) => table.customerId === customerId);
    const activeOrderTableIds = new Set((state.orders || []).filter((order) => order.customerId === customerId && order.hallSale === true && !['paid','cancelled'].includes(normalizePosStatus(order.posStatus))).map((order) => order.tableId));
    const nextTables = Array.from({ length: count }, (_, index) => {
      const existing = current[index];
      const number = startNumber + index;
      const manualName = customNames[index];
      return { id: existing?.id || uid('tbl'), customerId, name: manualName || `${prefix} ${persianDigits(number)}`, number, position: existing?.position || { x: (index % 4) + 1, y: Math.floor(index / 4) + 1 }, status: existing?.status || 'free', active: existing?.active !== false };
    });
    current.filter((table) => activeOrderTableIds.has(table.id) && !nextTables.some((next) => next.id === table.id)).forEach((table) => nextTables.push({ ...table, active: true }));
    state.restaurantTables = state.restaurantTables.filter((table) => table.customerId !== customerId).concat(nextTables);
    if (customer) customer.hallTableSettings = { count, prefix, startNumber, customNames };
    return nextTables.map((table) => cloneJson(table));
  }

  function normalizePosStatus(status) {
    return ['draft','submitted','partially-paid','paid','cancelled'].includes(status) ? status : 'submitted';
  }

  function getActiveHallOrder(state, customerId, tableId) {
    requireCustomer(state, customerId);
    return (state.orders || []).find((order) => order.customerId === customerId && order.hallSale === true && order.tableId === tableId && !['paid','cancelled'].includes(normalizePosStatus(order.posStatus))) || null;
  }

  function getHallTables(state, customerId) {
    return ensureHallTables(state, customerId).map((table) => {
      const activeOrder = getActiveHallOrder(state, customerId, table.id);
      const posStatus = activeOrder ? normalizePosStatus(activeOrder.posStatus) : 'free';
      const status = !table.active ? 'inactive' : (posStatus === 'partially-paid' ? 'waiting-payment' : activeOrder ? 'open-order' : 'free');
      const label = ({ free: 'آزاد', 'open-order': 'دارای سفارش باز', 'waiting-payment': 'در انتظار پرداخت', paid: 'تسویه‌شده', inactive: 'غیرفعال' })[status] || 'آزاد';
      return { ...cloneJson(table), status, statusLabel: label, activeOrderId: activeOrder?.id || '', remainingTotal: activeOrder?.remainingTotal || 0 };
    });
  }

  function hallPaymentMethods() {
    return ['نقدی', 'کارت‌خوان', 'پرداخت آنلاین', 'کیف پول'];
  }

  function createHallOrder(state, customerId, tableId, lines, options = {}) {
    const table = ensureHallTables(state, customerId).find((item) => item.id === tableId && item.customerId === customerId && item.active !== false);
    if (!table) throw new Error('TABLE_NOT_FOUND');
    const prepareHallLine = (line, sentAt) => {
      line.paidQty = Number(line.paidQty || 0);
      line.paidQuantity = Number(line.paidQuantity || line.paidQty || 0);
      line.sentToPreparationAt = line.sentToPreparationAt || sentAt;
      line.preparationStatus = 'sent';
      return line;
    };
    const existing = getActiveHallOrder(state, customerId, tableId);
    if (existing) {
      const addition = createSale(state, customerId, lines, existing.paymentMethod || options.paymentMethod || 'در انتظار', { status: 'received', orderNote: options.orderNote || existing.orderNote || '' });
      state.orders = state.orders.filter((order) => order.id !== addition.id);
      state.ledger = state.ledger.filter((entry) => !(entry.customerId === customerId && entry.sourceId === addition.id && entry.type === 'revenue'));
      state.ledger.forEach((entry) => { if (entry.customerId === customerId && entry.sourceId === addition.id && entry.type === 'cost') entry.sourceId = existing.id; });
      const sentAt = new Date().toISOString();
      addition.lines.map((line) => prepareHallLine(line, sentAt)).forEach((line) => {
        const currentLine = existing.lines.find((item) => item.itemId === line.itemId && Number(item.price || item.unitPriceSnapshot || 0) === Number(line.price || line.unitPriceSnapshot || 0));
        if (currentLine) {
          currentLine.qty = Number((Number(currentLine.qty || 0) + Number(line.qty || 0)).toFixed(6));
          currentLine.quantity = currentLine.qty;
          currentLine.lineTotal = Number((Number(currentLine.lineTotal || 0) + Number(line.lineTotal || 0)).toFixed(0));
          currentLine.note = [currentLine.note, line.note].filter(Boolean).join(' — ');
          currentLine.modifiers = [...(currentLine.modifiers || []), ...(line.modifiers || [])];
        } else {
          existing.lines.push(line);
        }
      });
      existing.total = Number(existing.total || 0) + Number(addition.total || 0);
      existing.cost = Number(existing.cost || 0) + Number(addition.cost || 0);
      existing.subtotal = Number(existing.subtotal || 0) + Number(addition.total || 0);
      existing.grandTotal = Number(existing.grandTotal || 0) + Number(addition.total || 0);
      existing.remainingTotal = Math.max(0, Math.round(Number(existing.grandTotal || existing.total || 0) - Number(existing.paidTotal || 0)));
      existing.posStatus = Number(existing.paidTotal || 0) > 0 ? 'partially-paid' : 'submitted';
      existing.status = ['accepted','preparing','ready'].includes(normalizeOrderStatus(existing.status)) ? existing.status : 'received';
      existing.statusUpdatedAt = sentAt;
      existing.orderNote = [existing.orderNote, String(options.orderNote || '').trim()].filter(Boolean).join(' — ');
      existing.lowStockWarnings = [...(existing.lowStockWarnings || []), ...(addition.lowStockWarnings || [])];
      return existing;
    }
    const order = createSale(state, customerId, lines, options.paymentMethod || 'در انتظار', { status: 'received', orderNote: options.orderNote || '' });
    state.ledger = state.ledger.filter((entry) => !(entry.customerId === customerId && entry.sourceId === order.id && entry.type === 'revenue'));
    order.hallSale = true;
    order.tableId = table.id;
    order.tableName = table.name;
    order.posStatus = 'submitted';
    order.paidTotal = 0;
    order.remainingTotal = order.total;
    order.subtotal = order.total;
    order.discountTotal = 0;
    order.taxTotal = 0;
    order.serviceChargeTotal = 0;
    order.grandTotal = order.total;
    order.payments = [];
    order.paymentAllocations = [];
    order.lines.forEach((line) => prepareHallLine(line, order.createdAt));
    return order;
  }

  function getRemainingPaymentItems(order) {
    return (order.lines || []).map((line) => {
      const paidQty = Number(line.paidQty ?? line.paidQuantity ?? 0);
      const qty = Number(line.qty ?? line.quantity ?? 0);
      const remainingQty = Number((qty - paidQty).toFixed(6));
      return { lineId: line.id, itemId: line.itemId, name: line.name, qty, paidQty, remainingQty, unitPrice: Number(line.price || line.unitPriceSnapshot || 0), remainingAmount: Number((remainingQty * Number(line.price || 0)).toFixed(0)) };
    }).filter((line) => line.remainingQty > 0);
  }

  function normalizePaymentSelections(order, selections = []) {
    const remainingById = new Map(getRemainingPaymentItems(order).map((line) => [line.lineId, line]));
    return selections.map((selection) => {
      const remaining = remainingById.get(selection.lineId || selection.orderItemId);
      if (!remaining) throw new Error('ORDER_ITEM_ALREADY_PAID');
      const qty = Number(selection.qty ?? selection.quantity ?? 0);
      if (qty <= 0) throw new Error('PAYMENT_QTY_REQUIRED');
      if (qty > remaining.remainingQty + 1e-9) throw new Error('PAYMENT_QTY_EXCEEDS_REMAINING');
      const itemAmount = Math.round(qty * remaining.unitPrice);
      return { orderItemId: remaining.lineId, lineId: remaining.lineId, name: remaining.name, quantity: qty, qty, itemAmount, discountShare: 0, taxShare: 0, serviceChargeShare: 0, allocatedTotal: itemAmount };
    });
  }

  function previewOrderPayment(state, customerId, orderId, selections = []) {
    requireCustomer(state, customerId);
    const order = state.orders.find((item) => item.id === orderId && item.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    const allocations = normalizePaymentSelections(order, selections);
    const itemSubtotal = allocations.reduce((sum, item) => sum + item.itemAmount, 0);
    const finalAmount = allocations.reduce((sum, item) => sum + item.allocatedTotal, 0);
    return { orderId, itemSubtotal, discountShare: 0, taxShare: 0, serviceChargeShare: 0, finalAmount, paidTotal: Number(order.paidTotal || 0), remainingBefore: Number(order.remainingTotal ?? order.total ?? 0), allocations };
  }

  function recordOrderPayment(state, customerId, orderId, selections = [], input = {}) {
    requireCustomer(state, customerId);
    const order = state.orders.find((item) => item.id === orderId && item.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (normalizePosStatus(order.posStatus) === 'paid') throw new Error('ORDER_ALREADY_PAID');
    if (input.idempotencyKey && (order.payments || []).some((payment) => payment.idempotencyKey === input.idempotencyKey)) throw new Error('PAYMENT_DUPLICATE');
    if (!Array.isArray(order.payments)) order.payments = [];
    if (!Array.isArray(order.paymentAllocations)) order.paymentAllocations = [];
    const method = hallPaymentMethods().includes(input.paymentMethod) ? input.paymentMethod : (input.paymentMethod || 'کارت‌خوان');
    const payment = { id: uid('pay'), customerId, orderId, paymentMethod: method, status: input.status === 'failed' ? 'failed' : 'success', transactionReference: input.transactionReference || uid('trx'), cashierUserId: input.cashierUserId || '', cashierName: input.cashierName || 'صندوق‌دار', idempotencyKey: input.idempotencyKey || uid('idem'), createdAt: input.createdAt || new Date().toISOString(), confirmedAt: '', amount: 0, allocations: [] };
    if (payment.status === 'failed') {
      payment.amount = Number(input.amount || 0);
      order.payments.push(payment);
      return { order: cloneJson(order), payment: cloneJson(payment), remainingItems: getRemainingPaymentItems(order) };
    }
    const preview = previewOrderPayment(state, customerId, orderId, selections);
    if (!preview.allocations.length) throw new Error('PAYMENT_SELECTION_REQUIRED');
    payment.amount = preview.finalAmount;
    payment.confirmedAt = payment.createdAt;
    payment.allocations = preview.allocations.map((allocation) => ({ id: uid('payalloc'), paymentId: payment.id, ...allocation }));
    for (const allocation of payment.allocations) {
      const line = order.lines.find((item) => item.id === allocation.lineId);
      line.paidQty = Number((Number(line.paidQty || 0) + allocation.qty).toFixed(6));
      line.paidQuantity = line.paidQty;
      order.paymentAllocations.push(cloneJson(allocation));
    }
    order.payments.push(payment);
    order.paidTotal = Math.round(Number(order.paidTotal || 0) + payment.amount);
    order.remainingTotal = Math.max(0, Math.round(Number(order.grandTotal ?? order.total ?? 0) - order.paidTotal));
    order.posStatus = order.remainingTotal === 0 ? 'paid' : 'partially-paid';
    if (order.posStatus === 'paid') {
      order.status = 'completed';
      order.completedAt = payment.confirmedAt;
    }
    state.ledger.push({ id: uid('led'), customerId, type: 'revenue', direction: 'in', amount: payment.amount, sourceId: order.id, paymentId: payment.id, createdAt: payment.confirmedAt, paymentMethod: method });
    return { order: cloneJson(order), payment: cloneJson(payment), remainingItems: getRemainingPaymentItems(order) };
  }

  function getOrderPayments(state, customerId, orderId) {
    requireCustomer(state, customerId);
    const order = state.orders.find((item) => item.id === orderId && item.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    return cloneJson(order.payments || []);
  }

  function getCustomerOrders(state, customerId) {
    requireCustomer(state, customerId);
    return state.orders
      .filter((order) => order.customerId === customerId)
      .map((order) => ({ ...cloneJson(order), status: normalizeOrderStatus(order.status) }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function getPublicOrderByTrackingNumber(state, customerId, trackingNumber) {
    requireCustomer(state, customerId);
    const numericTracking = Number(trackingNumber || 0);
    if (!numericTracking) throw new Error('ORDER_TRACKING_REQUIRED');
    const order = state.orders.find((item) => item.customerId === customerId && Number(item.trackingNumber) === numericTracking);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    return {
      id: order.id,
      trackingNumber: order.trackingNumber,
      guestName: order.guestName || '',
      guestContact: order.guestContact || '',
      orderNote: order.orderNote || '',
      lines: cloneJson(order.lines || []),
      total: order.total,
      status: normalizeOrderStatus(order.status),
      createdAt: order.createdAt,
      statusUpdatedAt: order.statusUpdatedAt || order.createdAt,
      completedAt: order.completedAt || null,
    };
  }

  function enrichOrderServiceTiming(order, now = new Date()) {
    const serviceTargetMinutes = Math.max(1, ...(order.lines || []).map((line) => Number(line.prepTimeMinutes || 15)));
    const elapsedMinutes = Math.max(0, Math.floor((new Date(now).getTime() - new Date(order.createdAt).getTime()) / 60000));
    const delayed = normalizeOrderStatus(order.status) !== 'completed' && elapsedMinutes > serviceTargetMinutes;
    const delayOverMinutes = delayed ? elapsedMinutes - serviceTargetMinutes : 0;
    const delayLevel = !delayed ? 'normal' : (elapsedMinutes >= serviceTargetMinutes * 2 ? 'critical' : 'delayed');
    return { ...cloneJson(order), serviceTargetMinutes, elapsedMinutes, delayed, delayOverMinutes, delayLevel };
  }

  function getKitchenOrderQueue(state, customerId, now = new Date()) {
    requireCustomer(state, customerId);
    const activeStatuses = ['received', 'accepted', 'preparing', 'ready'];
    const groups = Object.fromEntries(activeStatuses.map((status) => [status, []]));
    getCustomerOrders(state, customerId)
      .filter((order) => activeStatuses.includes(normalizeOrderStatus(order.status)))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((order) => groups[normalizeOrderStatus(order.status)].push(enrichOrderServiceTiming(order, now)));
    return activeStatuses.map((status) => ({ status, orders: groups[status].map((order) => cloneJson(order)) }));
  }

  function getDelayedKitchenOrders(state, customerId, now = new Date()) {
    requireCustomer(state, customerId);
    return getCustomerOrders(state, customerId)
      .filter((order) => ['received', 'accepted', 'preparing', 'ready'].includes(normalizeOrderStatus(order.status)))
      .map((order) => enrichOrderServiceTiming(order, now))
      .filter((order) => order.delayed)
      .sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);
  }

  function getKitchenOrdersByFilter(state, customerId, filter = 'all', now = new Date()) {
    requireCustomer(state, customerId);
    const normalized = ['all', 'delayed', 'ready'].includes(filter) ? filter : 'all';
    const activeOrders = getCustomerOrders(state, customerId)
      .filter((order) => ['received', 'accepted', 'preparing', 'ready'].includes(normalizeOrderStatus(order.status)))
      .map((order) => enrichOrderServiceTiming(order, now));
    if (normalized === 'delayed') return activeOrders.filter((order) => order.delayed).sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);
    if (normalized === 'ready') return activeOrders.filter((order) => normalizeOrderStatus(order.status) === 'ready').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return activeOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  function getKitchenOrdersByStationFilter(state, customerId, station = 'all', filter = 'all', now = new Date()) {
    requireCustomer(state, customerId);
    const normalizedStation = station === 'all' ? 'all' : normalizeKitchenStation(station);
    const activeOrders = getKitchenOrdersByFilter(state, customerId, filter, now);
    if (normalizedStation === 'all') return activeOrders.map((order) => cloneJson(order));
    return activeOrders
      .filter((order) => (order.lines || []).some((line) => normalizeKitchenStation(line.kitchenStation) === normalizedStation))
      .map((order) => cloneJson(order));
  }

  function getKitchenStationLabel(station) {
    return kitchenStationLabels[normalizeKitchenStation(station)] || kitchenStationLabels.prep;
  }

  function getKitchenStationTickets(state, customerId, orderId) {
    requireCustomer(state, customerId);
    const order = state.orders.find((item) => item.id === orderId && item.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    const stationMap = new Map();
    for (const line of order.lines || []) {
      const station = normalizeKitchenStation(line.kitchenStation);
      if (!stationMap.has(station)) stationMap.set(station, { station, label: getKitchenStationLabel(station), lines: [] });
      stationMap.get(station).lines.push(cloneJson({ ...line, kitchenStation: station }));
    }
    return [...stationMap.values()].map((ticket) => cloneJson(ticket));
  }

  function getKitchenStationQueueTickets(state, customerId, station, filter = 'all', now = new Date()) {
    requireCustomer(state, customerId);
    const normalizedStation = normalizeKitchenStation(station);
    return getKitchenOrdersByStationFilter(state, customerId, normalizedStation, filter, now)
      .map((order) => ({
        id: order.id,
        trackingNumber: order.trackingNumber,
        status: normalizeOrderStatus(order.status),
        guestName: order.guestName || '',
        guestContact: order.guestContact || '',
        orderNote: order.orderNote || '',
        createdAt: order.createdAt,
        elapsedMinutes: order.elapsedMinutes,
        delayed: order.delayed,
        station: normalizedStation,
        label: getKitchenStationLabel(normalizedStation),
        lines: (order.lines || [])
          .filter((line) => normalizeKitchenStation(line.kitchenStation) === normalizedStation)
          .map((line) => cloneJson({ ...line, kitchenStation: normalizedStation })),
      }))
      .filter((ticket) => ticket.lines.length);
  }

  function getOrderCompletionSummary(state, customerId, now = new Date()) {
    requireCustomer(state, customerId);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const completed = state.orders
      .filter((order) => order.customerId === customerId && normalizeOrderStatus(order.status) === 'completed' && order.completedAt)
      .map((order) => cloneJson(order))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const completedToday = completed.filter((order) => {
      const at = new Date(order.completedAt).getTime();
      return at >= start.getTime() && at <= end.getTime();
    });
    return { completedTodayCount: completedToday.length, lastCompletedAt: completed[0]?.completedAt || null, lastTrackingNumber: completed[0]?.trackingNumber || null };
  }

  function getLowStockItems(state, customerId) {
    requireCustomer(state, customerId);
    return state.inventory
      .filter((i) => i.customerId === customerId && Number(i.minStock || 0) > 0 && i.stock <= i.minStock)
      .map((i) => ({ inventoryItemId: i.id, name: i.name, unit: i.unit, stock: i.stock, minStock: i.minStock }));
  }

  function addExpense(state, customerId, title, amount, input = {}) {
    requireCustomer(state, customerId);
    const value = Number(amount || 0);
    const documentDate = cleanPersianText(input.documentDate || input.date || '');
    const documentNumber = cleanPersianText(input.documentNumber || '');
    const description = cleanPersianText(input.description || '');
    const createdAt = documentDate ? isoFromPersianDate(documentDate) : new Date().toISOString();
    const expense = { id: uid('exp'), customerId, title: cleanPersianText(title || 'هزینه'), category: input.category || 'سایر هزینه‌ها', amount: value, documentDate, documentNumber, description, createdAt };
    const paymentDetails = paymentDetailsFromInput(state, customerId, input, value, expense.id, expense.title);
    Object.assign(expense, paymentDetails);
    state.expenses.push(expense);
    state.ledger.push({ id: uid('led'), customerId, type: 'expense', direction: 'out', amount: expense.amount, sourceId: expense.id, title: expense.title, category: expense.category, documentDate, documentNumber, description, createdAt: expense.createdAt, ...paymentDetails });
    return expense;
  }

  function getAccountingSummary(state, customerId) {
    requireCustomer(state, customerId);
    const entries = state.ledger.filter((l) => l.customerId === customerId);
    const revenue = entries.filter((l) => l.type === 'revenue').reduce((s, l) => s + l.amount, 0);
    const cost = entries.filter((l) => l.type === 'cost').reduce((s, l) => s + l.amount, 0);
    const expenses = entries.filter((l) => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
    const supplierPayments = entries.filter((l) => l.type === 'supplier-payment').reduce((s, l) => s + l.amount, 0);
    const payablePurchases = getSupplierPayables(state, customerId).reduce((s, payable) => s + Number(payable.amount || 0), 0);
    const chequeWarnings = getChequeWarnings(state, customerId);
    return { revenue, cost, expenses, supplierPayments, payablePurchases, chequeWarningsCount: chequeWarnings.length, chequeWarningsAmount: chequeWarnings.reduce((sum, cheque) => sum + Number(cheque.amount || 0), 0), profit: revenue - cost - expenses };
  }

  function getSupplierPayables(state, customerId) {
    requireCustomer(state, customerId);
    const materialPurchases = (state.purchases || [])
      .filter((p) => p.customerId === customerId && p.paymentStatus !== 'paid')
      .map((p) => ({ id: p.id, sourceId: p.id, sourceType: 'inventory-purchase', title: p.title || 'خرید مواد اولیه', supplier: p.supplier || '', amount: Number(p.totalCost || 0), documentDate: p.documentDate || '', documentNumber: p.documentNumber || '', createdAt: p.createdAt, paymentStatus: p.paymentStatus || 'unpaid' }));
    const invoices = (state.purchaseInvoices || [])
      .filter((invoice) => invoice.customerId === customerId && invoice.paymentStatus !== 'paid')
      .map((invoice) => ({ id: invoice.id, sourceId: invoice.id, sourceType: 'purchase-invoice', title: invoice.title || 'فاکتور خرید', supplier: invoice.supplier || '', amount: Number(invoice.totalCost || 0), documentDate: invoice.documentDate || invoice.invoiceDate || '', documentNumber: invoice.documentNumber || '', createdAt: invoice.createdAt, paymentStatus: invoice.paymentStatus || 'unpaid' }));
    return [...invoices, ...materialPurchases].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  function getAccountingLedger(state, customerId, filters = {}) {
    requireCustomer(state, customerId);
    const fromTime = filters.fromDate ? new Date(filters.fromDate).getTime() : null;
    const toTime = filters.toDate ? new Date(filters.toDate).getTime() : null;
    return state.ledger
      .filter((entry) => entry.customerId === customerId)
      .filter((entry) => !filters.type || entry.type === filters.type)
      .filter((entry) => {
        const createdAt = new Date(entry.createdAt).getTime();
        if (fromTime !== null && createdAt < fromTime) return false;
        if (toTime !== null && createdAt > toTime) return false;
        return true;
      })
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function getDailyClosingReport(state, customerId, date = new Date(), options = {}) {
    requireCustomer(state, customerId);
    const day = new Date(date);
    if (Number.isNaN(day.getTime())) throw new Error('INVALID_REPORT_DATE');
    let shift = null;
    if (options.shiftId) {
      shift = (state.shifts || []).find((s) => s.id === options.shiftId && s.customerId === customerId);
      if (!shift) throw new Error('SHIFT_NOT_FOUND');
    }
    const from = shift ? new Date(shift.openedAt) : new Date(day);
    if (!shift) from.setHours(0, 0, 0, 0);
    const to = shift ? new Date(shift.closedAt || new Date()) : new Date(day);
    if (!shift) to.setHours(23, 59, 59, 999);
    const entries = getAccountingLedger(state, customerId, { fromDate: from.toISOString(), toDate: to.toISOString() });
    const totalByType = (type) => entries.filter((entry) => entry.type === type).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const revenue = totalByType('revenue');
    const cost = totalByType('cost');
    const expenses = totalByType('expense');
    const supplierPayments = totalByType('supplier-payment');
    const orders = state.orders.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime();
      return order.customerId === customerId && createdAt >= from.getTime() && createdAt <= to.getTime();
    });
    return {
      date: from.toISOString(),
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      revenue,
      cost,
      expenses,
      supplierPayments,
      profit: revenue - cost - expenses,
      orderCount: orders.length,
      lowStockWarnings: getLowStockItems(state, customerId),
      entries,
      shift: shift ? cloneJson(shift) : null,
    };
  }

  function createAccountingLedgerExport(state, customerId, filters = {}) {
    const entries = getAccountingLedger(state, customerId, filters);
    const totals = {
      revenue: entries.filter((entry) => entry.type === 'revenue').reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      cost: entries.filter((entry) => entry.type === 'cost').reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      expenses: entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      supplierPayments: entries.filter((entry) => entry.type === 'supplier-payment').reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    };
    totals.profit = totals.revenue - totals.cost - totals.expenses;
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      customerId,
      filters: cloneJson(filters || {}),
      totals,
      entries: entries.map((entry) => cloneJson(entry)),
    };
  }

  function createDailyClosingReportExport(state, customerId, date = new Date(), options = {}) {
    const report = getDailyClosingReport(state, customerId, date, options);
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      customerId,
      report: cloneJson(report),
    };
  }

  function createSecurityEventsExport(state, customerId, filters = {}) {
    const events = getSecurityEvents(state, customerId, filters);
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      customerId,
      filters: cloneJson(filters || {}),
      totals: { eventCount: events.length },
      events: events.map((event) => cloneJson(event)),
    };
  }

  return {
    packages,
    createInitialState,
    createDemoSampleState,
    createPrototypeBackup,
    createSectionBackup,
    restoreSectionBackup,
    restorePrototypeBackup,
    recordPrototypeBackupExport,
    getOnboardingChecklist,
    migrateAuthState,
    getMvpMigrationPlan,
    getSecurityEvents,
    createSecurityEventsExport,
    recordSecurityEvent,
    createCustomer,
    createDemoCustomer,
    updateCustomerProfile,
    changeCustomerPassword,
    login,
    loginWithStaffCode,
    validateSession,
    cleanupExpiredSessions,
    logout,
    openCashierShift,
    closeCashierShift,
    getCurrentCashierShift,
    roleLabel,
    getRolePermissions,
    canAccess,
    getStaffUsers,
    createStaffSchedule,
    deleteStaffSchedule,
    getStaffSchedules,
    clockInStaff,
    clockOutStaff,
    approveStaffAttendance,
    deleteStaffAttendance,
    getStaffAttendance,
    calculateStaffPayroll,
    getFingerprintDeviceContract,
    getStaffInvitations,
    createStaffInvitation,
    cancelStaffInvitation,
    acceptStaffInvitation,
    requestPasswordReset,
    getPasswordResetRequests,
    resetPasswordWithToken,
    createStaffUser,
    updateStaffUser,
    deleteStaffUser,
    setPackage,
    getEnabledModules,
    createMenu,
    updateMenu,
    deleteMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getCustomerMenus,
    getPublicMenu,
    createFinancialAccount,
    updateFinancialAccount,
    deleteFinancialAccount,
    getFinancialAccounts,
    getAccountBalances,
    getChequeWarnings,
    deleteCheque,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordInventoryPurchase,
    updateInventoryPurchasePaymentStatus,
    importInventoryItems,
    recordPurchaseInvoice,
    getPurchaseInvoices,
    updatePurchaseInvoice,
    updatePurchaseInvoicePaymentStatus,
    deletePurchaseInvoice,
    findInventory,
    calculateRecipeCost,
    setRecipe,
    deleteRecipe,
    upsertCustomerProfile,
    getCustomerProfiles,
    getCustomerProfileSegments,
    getCustomerCampaignSuggestions,
    getHallTables,
    configureHallTables,
    getActiveHallOrder,
    createHallOrder,
    getRemainingPaymentItems,
    previewOrderPayment,
    recordOrderPayment,
    getOrderPayments,
    hallPaymentMethods,
    createSale,
    updateSale,
    deleteSale,
    updateOrderStatus,
    advanceOrderStatus,
    getCustomerOrders,
    getPublicOrderByTrackingNumber,
    getKitchenOrderQueue,
    getDelayedKitchenOrders,
    getKitchenOrdersByFilter,
    getKitchenOrdersByStationFilter,
    getKitchenStationLabel,
    getKitchenStationTickets,
    getKitchenStationQueueTickets,
    getOrderCompletionSummary,
    getLowStockItems,
    addExpense,
    getAccountingSummary,
    getSupplierPayables,
    getAccountingLedger,
    getDailyClosingReport,
    createAccountingLedgerExport,
    createDailyClosingReportExport,
  };
});
