const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

assert(app.includes('function preserveLocalBrowserSessions(remoteState)'), 'Remote sync must preserve this browser session before replacing state.');
assert(app.includes('const localSessionId = localStorage.getItem(SESSION_KEY)'), 'Session preservation must read the current browser session id.');
assert(app.includes('remoteState.sessions.push({ ...local })'), 'Remote sync must merge the current local session into incoming state.');
assert(/preserveLocalBrowserSessions\(remoteState\);\s*migrateDisplayState\(remoteState\);/.test(app), 'Remote state must preserve sessions before migration/session validation.');

console.log('remote-session-preservation-regression.test.js: ok');
