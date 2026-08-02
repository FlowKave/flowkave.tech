const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

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
mustContain(html, 'styles.css?v=sales-glossy-pill-buttons-1');
mustContain(html, 'core.js?v=sales-glossy-pill-buttons-1');
mustContain(html, 'app.js?v=sales-glossy-pill-buttons-1');

// Sales/Cashier page buttons should use the glossy pill shape from the user's reference image without changing sizes.
mustContain(app, 'data-current-tab="${esc(currentTab)}"', 'Content root must expose current tab for scoped cashier styling.');
mustContain(styles, '.content[data-current-tab="sales"] button:not(.modal-close-icon):not(.calculator-close)', 'Glossy pill styling must be scoped to the Sales/Cashier page.');
mustContain(styles, 'border-radius:999px!important;', 'Sales buttons must use a rounded capsule/pill form.');
mustContain(styles, 'linear-gradient(180deg,rgba(255,255,255,.82)', 'Sales buttons must include a glossy top highlight band.');
mustContain(styles, 'inset 0 -7px 10px rgba(15,23,42,.24)', 'Sales buttons must include a darker lower bevel.');
mustContain(styles, '.content[data-current-tab="sales"] button:not(.modal-close-icon):not(.calculator-close):active:not(:disabled)', 'Sales buttons need pressed state feedback.');
mustContain(styles, '.app-shell.theme-midnight .content[data-current-tab="sales"] button:not(.modal-close-icon):not(.calculator-close)', 'Glossy cashier buttons must stay theme-aware in night mode.');
assert(!styles.includes('border-width:1.5px!important;'), 'Glossy form must not change button size through forced thicker borders.');

console.log('ui-regression.test.js: ok');
