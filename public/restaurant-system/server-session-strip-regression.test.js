const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..', '..');
const restaurantStateRoute = fs.readFileSync(path.join(repo, 'app/api/restaurant-state/route.ts'), 'utf8');
const staffInvitationRoute = fs.readFileSync(path.join(repo, 'app/api/staff-invitation/route.ts'), 'utf8');

assert(restaurantStateRoute.includes('delete (sharedState as any).sessions'), 'Restaurant state API must strip browser sessions before saving shared restaurant state.');
assert(restaurantStateRoute.includes('state: sharedState'), 'Restaurant state API must persist sanitized shared state, not raw browser state.');
assert(staffInvitationRoute.includes('delete state.sessions'), 'Staff invitation accept API must not overwrite other browsers sessions when saving shared state.');

console.log('server-session-strip-regression.test.js: ok');
