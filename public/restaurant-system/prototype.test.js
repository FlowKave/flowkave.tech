const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const core = fs.readFileSync(path.join(root, 'core.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

assert(core.includes("cashier: ['sales']"), 'Cashier role must remain scoped to sales only.');
assert(core.includes("manager: ['dashboard', 'personnel', 'customerBank', 'aiAssistant', 'menu', 'sales', 'recipes', 'inventory', 'accounting', 'account', 'staff:manage']"), 'Manager role must retain full operational permissions.');
assert(core.includes("function canAccess(role, permission)") && core.includes('return getRolePermissions(role).includes(permission);'), 'Role access must be permission-list based.');
assert(app.includes("function defaultTabForRole(role = currentRole())") && app.includes("role === 'cashier' ? 'sales' : 'dashboard'"), 'Cashier default tab must remain sales.');

assert(core.includes("function loginWithStaffCode(state, personnelCode, pin, customerId = '')") && core.includes('if (scopedCustomerId && u.customerId !== scopedCustomerId) return false;'), 'Staff PIN login must be scoped to the current restaurant/tenant when a customerId is provided.');
assert(core.includes("u.customerId === customerId && normalizePersonnelCode(u.personnelCode) === personnelCode"), 'Personnel code uniqueness must be per restaurant, not global across tenants.');

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


