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

function testHallOrderTaxAndServiceCharges() {
  const state = RestaurantCore.createInitialState();
  const customer = RestaurantCore.createCustomer(state, { businessName:'خان بابا', ownerName:'مالک', phone:'09120000001', email:'tax-service@test.local', password:'123456' });
  RestaurantCore.setPosChargeSettings(state, customer.id, { vatEnabled:true, vatPercent:10, serviceEnabled:true, servicePercent:5 });
  const menu = RestaurantCore.createMenu(state, customer.id, { name:'منو' });
  const item = RestaurantCore.createMenuItem(state, customer.id, menu.id, { name:'کباب', price:100000 });
  const [table] = RestaurantCore.configureHallTables(state, customer.id, { count:1, startNumber:1, customNames:[] });
  const order = RestaurantCore.createHallOrder(state, customer.id, table.id, [{ itemId:item.id, qty:1 }], { chargeSettings: RestaurantCore.getPosChargeSettings(state, customer.id) });
  assert.equal(order.subtotal, 100000);
  assert.equal(order.taxTotal, 10000);
  assert.equal(order.serviceChargeTotal, 0);
  assert.equal(order.grandTotal, 110000);
  const withPercentService = RestaurantCore.setOrderServiceCharge(state, customer.id, order.id, { serviceMode:'percent', servicePercent:5 });
  assert.equal(withPercentService.serviceChargeTotal, 5000);
  assert.equal(withPercentService.grandTotal, 115000);
  const remaining = RestaurantCore.getRemainingPaymentItems(order);
  const preview = RestaurantCore.previewOrderPayment(state, customer.id, order.id, remaining.map(line => ({ lineId: line.lineId, qty: line.remainingQty })));
  assert.equal(preview.taxShare, 10000);
  assert.equal(preview.serviceChargeShare, 5000);
  assert.equal(preview.finalAmount, 115000);
  const withManualService = RestaurantCore.setOrderServiceCharge(state, customer.id, order.id, { serviceMode:'amount', serviceAmount:12000 });
  assert.equal(withManualService.serviceChargeTotal, 12000);
  assert.equal(withManualService.grandTotal, 122000);
}

testHallOrderTaxAndServiceCharges();

function testVatReappliesToExistingOpenHallOrder() {
  const state = RestaurantCore.createInitialState();
  const customer = RestaurantCore.createCustomer(state, { businessName:'خان بابا', ownerName:'مالک', phone:'09120000002', email:'vat-open@test.local', password:'123456' });
  const menu = RestaurantCore.createMenu(state, customer.id, { name:'منو' });
  const item = RestaurantCore.createMenuItem(state, customer.id, menu.id, { name:'لاته', price:2400000 });
  const [table] = RestaurantCore.configureHallTables(state, customer.id, { count:1, startNumber:11, customNames:[] });
  const order = RestaurantCore.createHallOrder(state, customer.id, table.id, [{ itemId:item.id, qty:1 }]);
  assert.equal(order.taxTotal, 0);
  assert.equal(order.grandTotal, 2400000);
  RestaurantCore.setPosChargeSettings(state, customer.id, { vatEnabled:true, vatPercent:10 });
  const recalculated = state.orders.find(item => item.id === order.id);
  assert.equal(recalculated.taxTotal, 240000);
  assert.equal(recalculated.serviceChargeTotal, 0);
  assert.equal(recalculated.grandTotal, 2640000);
  assert.equal(recalculated.remainingTotal, 2640000);
}

testVatReappliesToExistingOpenHallOrder();

function testClosingRegisterRequiresSettledTablesAndResetsWorkday() {
  const state = RestaurantCore.createInitialState();
  const customer = RestaurantCore.createCustomer(state, { businessName:'خان بابا', ownerName:'مالک', phone:'09120000003', email:'register-close@test.local', password:'123456' });
  const menu = RestaurantCore.createMenu(state, customer.id, { name:'منو' });
  const item = RestaurantCore.createMenuItem(state, customer.id, menu.id, { name:'چلو', price:100000 });
  const [table] = RestaurantCore.configureHallTables(state, customer.id, { count:1, startNumber:2, customNames:[] });
  const shift = RestaurantCore.openCashierShift(state, customer.id, { openedAt:'2026-08-24T08:00:00.000Z' });
  const order = RestaurantCore.createHallOrder(state, customer.id, table.id, [{ itemId:item.id, qty:1 }]);
  assert.equal(order.trackingNumber, 1001);
  assert.throws(() => RestaurantCore.closeCashierShiftAndResetWorkday(state, customer.id, shift.id, { closedAt:'2026-08-24T23:00:00.000Z' }), /OPEN_HALL_TABLES_EXIST/);
  const remaining = RestaurantCore.getRemainingPaymentItems(state.orders[0]);
  RestaurantCore.recordOrderPayment(state, customer.id, order.id, remaining.map(line => ({ lineId: line.lineId, qty: line.remainingQty })), { paymentMethod:'کارت‌خوان', freeTableAfterPayment:true, idempotencyKey:'close-test-payment' });
  const result = RestaurantCore.closeCashierShiftAndResetWorkday(state, customer.id, shift.id, { closedAt:'2026-08-24T23:30:00.000Z' });
  assert.equal(result.report.orderCount, 1);
  assert.equal(result.removedOrderCount, 1);
  assert.equal(state.orders.filter(o => o.customerId === customer.id).length, 0);
  assert.equal(state.ledger.filter(entry => entry.customerId === customer.id && entry.sourceId === order.id).length, 0);
  const nextShift = RestaurantCore.openCashierShift(state, customer.id, { openedAt:'2026-08-25T08:00:00.000Z' });
  const nextOrder = RestaurantCore.createHallOrder(state, customer.id, table.id, [{ itemId:item.id, qty:1 }]);
  assert.equal(nextShift.receiptStartNumber, 1001);
  assert.equal(nextOrder.trackingNumber, 1001);
}

testClosingRegisterRequiresSettledTablesAndResetsWorkday();

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


