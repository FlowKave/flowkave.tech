const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function mustContain(source, needle, message) {
  assert(source.includes(needle), message || `Expected source to contain: ${needle}`);
}

// Cashier role must not see or open the hall table-layout/settings action.
mustContain(app, "function canManageHallTableLayout() {", 'Hall table layout permission helper must exist.');
mustContain(app, "return currentRole() === 'manager';", 'Hall table layout must be manager-only.');
mustContain(app, "const tableLayoutButton = canManageHallTableLayout() ?", 'Layout button must be conditionally rendered.');
mustContain(app, "${tableLayoutButton}", 'Hall toolbar must use the conditional table-layout button.');
mustContain(app, "if (!hallTableConfigOpen || !canManageHallTableLayout()) return '';", 'Layout popup must not render for cashier sessions.');
mustContain(app, "if (!canManageHallTableLayout()) return; hallTableConfigOpen = true", 'Layout open handler must guard direct/legacy clicks.');
assert(!app.includes("<button type=\"button\" class=\"hall-table-trigger hall-table-layout-trigger\" data-open-hall-table-config>${tableIconMarkup}<b>چیدمان میزهای سالن</b></button></div>"), 'Unconditional table-layout button must not come back.');

// Cache bust should change with this UI behavior so browser smoke checks are not stale.
mustContain(html, 'styles.css?v=cashier-hide-table-layout-1');
mustContain(html, 'core.js?v=cashier-hide-table-layout-1');
mustContain(html, 'app.js?v=cashier-hide-table-layout-1');

console.log('ui-regression.test.js: ok');
