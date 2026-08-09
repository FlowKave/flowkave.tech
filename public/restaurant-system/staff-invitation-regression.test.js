const assert = require('assert');
const core = require('./core.js');

const state = core.createInitialState();
const restaurantA = core.createCustomer(state, { businessName: 'خان بابا', ownerName: 'مالک مشترک', phone: '1', email: 'owner-a@test.local', password: '123456' });
const restaurantB = core.createCustomer(state, { businessName: 'شاندیز', ownerName: 'مالک مشترک', phone: '2', email: 'owner-b@test.local', password: '123456' });
const email = 'same-manager@test.local';

core.createStaffUser(state, restaurantA.id, { firstName: 'حسین', lastName: 'عبدی', personnelCode: '1001', email, role: 'manager', pin: '5555' });
const staffInNewRestaurant = core.createStaffUser(state, restaurantB.id, { firstName: 'حسین', lastName: 'عبدی', personnelCode: '1001', email, role: 'manager' });

const invitation = core.createStaffInvitation(state, restaurantB.id, {
  staffUserId: staffInNewRestaurant.id,
  name: 'حسین عبدی',
  email,
  role: 'manager',
  personnelCode: '1001',
});

assert.equal(invitation.customerId, restaurantB.id);
assert.equal(invitation.email, email);
assert.equal(invitation.role, 'manager');
assert.equal(core.getStaffInvitations(state, restaurantB.id).length, 1);

core.createStaffUser(state, restaurantB.id, { firstName: 'کپی', lastName: 'ایمیل', personnelCode: '1002', email: 'copy@test.local', role: 'cashier' });
assert.throws(
  () => core.createStaffInvitation(state, restaurantB.id, { staffUserId: staffInNewRestaurant.id, email: 'copy@test.local', role: 'cashier' }),
  /STAFF_EMAIL_ALREADY_EXISTS/,
);

console.log('staff-invitation-regression.test.js: ok');
