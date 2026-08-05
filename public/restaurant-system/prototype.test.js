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
