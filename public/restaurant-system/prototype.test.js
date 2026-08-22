const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const core = fs.readFileSync(path.join(root, 'core.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const RestaurantCore = require('./core.js');

assert(core.includes("cashier: ['sales']"), 'Cashier role must remain scoped to sales only.');
assert(core.includes("manager: ['dashboard', 'personnel', 'customerBank', 'aiAssistant', 'menu', 'sales', 'recipes', 'inventory', 'accounting', 'account', 'staff:manage']"), 'Manager role must retain full operational permissions.');
assert(core.includes("function canAccess(role, permission)") && core.includes('return getRolePermissions(role).includes(permission);'), 'Role access must be permission-list based.');
assert(app.includes("function defaultTabForRole(role = currentRole())") && app.includes("role === 'cashier' ? 'sales' : 'dashboard'"), 'Cashier default tab must remain sales.');

assert(core.includes("function loginWithStaffCode(state, personnelCode, pin, customerId = '')") && core.includes('if (scopedCustomerId && u.customerId !== scopedCustomerId) return false;'), 'Staff PIN login must be scoped to the current restaurant/tenant when a customerId is provided.');
assert(core.includes("u.customerId === customerId && normalizePersonnelCode(u.personnelCode) === personnelCode"), 'Personnel code uniqueness must be per restaurant, not global across tenants.');
assert(core.includes('function nextDailyReceiptNumber') && core.includes('receiptStartNumber: 1001'), 'Receipt numbers must be daily cashier numbers starting at 1001.');

function testDailyReceiptNumbersStartAt1001AndStayUnique() {
  const state = RestaurantCore.createInitialState();
  const customer = RestaurantCore.createCustomer(state, { businessName:'خان بابا', ownerName:'مالک', phone:'09120000000', email:'daily-receipt@test.local', password:'123456' });
  const menu = RestaurantCore.createMenu(state, customer.id, { name:'منو' });
  const item = RestaurantCore.createMenuItem(state, customer.id, menu.id, { name:'چای', price:10000 });
  const tables = RestaurantCore.configureHallTables(state, customer.id, { count:2, startNumber:1, customNames:[] });
  RestaurantCore.openCashierShift(state, customer.id, { openedAt:'2026-08-22T07:00:00.000Z' });
  const first = RestaurantCore.createHallOrder(state, customer.id, tables[0].id, [{ itemId:item.id, qty:1 }]);
  const second = RestaurantCore.createHallOrder(state, customer.id, tables[1].id, [{ itemId:item.id, qty:1 }]);
  assert.equal(first.trackingNumber, 1001);
  assert.equal(second.trackingNumber, 1002);
  state.orders[0].trackingNumber = 1;
  state.orders[1].trackingNumber = 1;
  RestaurantCore.normalizeDailyReceiptNumbers(state);
  assert.deepEqual(state.orders.map(order => order.trackingNumber), [1001, 1002]);
}

testDailyReceiptNumbersStartAt1001AndStayUnique();

console.log('prototype.test.js: ok');
function testOwnerCanUpdateProfileAndPassword() {
  const state = RestaurantCore.createInitialState();
  const customer = RestaurantCore.createCustomer(state, { businessName:'کافه قدیم', ownerName:'مالک قدیم', phone:'09120000000', email:'owner-change@test.local', password:'123456' });
  const session = RestaurantCore.login(state, 'owner-change@test.local', '123456');
  assert.equal(session.customerId, customer.id);
  const updated = RestaurantCore.updateCustomerProfile(state, customer.id, { businessName:'کافه جدید', ownerName:'مالک جدید', phone:'09123334444', email:'owner-new@test.local' });
  assert.equal(updated.businessName, 'کافه جدید');
  assert.equal(RestaurantCore.getPublicMenu(state, customer.id).customer.businessName, 'کافه جدید');
  assert.throws(() => RestaurantCore.login(state, 'owner-change@test.local', '123456'), /INVALID_LOGIN/);
  assert.equal(RestaurantCore.login(state, 'owner-new@test.local', '123456').customerId, customer.id);
  assert.throws(() => RestaurantCore.changeCustomerPassword(state, customer.id, 'wrong', '654321'), /CURRENT_PASSWORD_INVALID/);
  const beforeSessions = state.sessions.length;
  const changed = RestaurantCore.changeCustomerPassword(state, customer.id, '123456', '654321');
  assert(changed.invalidatedSessions >= beforeSessions);
  assert.throws(() => RestaurantCore.login(state, 'owner-new@test.local', '123456'), /INVALID_LOGIN/);
  assert.equal(RestaurantCore.login(state, 'owner-new@test.local', '654321').customerId, customer.id);
  assert(RestaurantCore.getSecurityEvents(state, customer.id).some(event => event.type === 'customer-profile-updated'));
}


