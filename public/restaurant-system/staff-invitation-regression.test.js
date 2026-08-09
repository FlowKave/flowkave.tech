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
const staffCountBeforeAccept = state.staffUsers.filter((user) => user.customerId === restaurantB.id).length;
const acceptedStaff = core.acceptStaffInvitation(state, invitation.token, '7788');
assert.equal(acceptedStaff.id, staffInNewRestaurant.id);
assert.equal(acceptedStaff.accessActive, true);
assert.equal(acceptedStaff.active, true);
assert.equal(core.loginWithStaffCode(state, acceptedStaff.personnelCode, '7788', restaurantB.id).staffUserId, acceptedStaff.id);
assert.equal(state.staffUsers.filter((user) => user.customerId === restaurantB.id).length, staffCountBeforeAccept);
assert.throws(() => core.acceptStaffInvitation(state, invitation.token, '9999'), /INVITATION_NOT_PENDING/);

core.createStaffUser(state, restaurantB.id, { firstName: 'کپی', lastName: 'ایمیل', personnelCode: '1002', email: 'copy@test.local', role: 'cashier' });
assert.throws(
  () => core.createStaffInvitation(state, restaurantB.id, { staffUserId: staffInNewRestaurant.id, email: 'copy@test.local', role: 'cashier' }),
  /STAFF_EMAIL_ALREADY_EXISTS/,
);

console.log('staff-invitation-regression.test.js: ok');
