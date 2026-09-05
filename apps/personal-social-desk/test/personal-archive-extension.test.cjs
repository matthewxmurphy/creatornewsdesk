const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('toolbar requests the personal plan without invoking Facebook posting and rejects web senders', async () => {
  let onMessage;
  const requests = [];
  const context = {
    chrome: {
      runtime: { id: 'test-extension', getURL: (suffix) => `chrome-extension://test-extension/${suffix}`,
        onMessage: { addListener: (listener) => { onMessage = listener; } },
        onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
      alarms: { get: async () => ({ periodInMinutes: 5 }), create: async () => {}, clear: async () => {}, onAlarm: { addListener() {} } },
      action: { onClicked: { addListener() {} } },
      storage: { local: { get: async () => ({ birthdayWishesEnabled: true, birthdayWishHistory: [] }), set: async () => {} } },
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ items: [{ id: 'existing-plan' }], created: 0 }) };
    },
    AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../chrome-engagement-watcher/background.js'), 'utf8'), context);
  assert.equal(onMessage({ type: 'cph-plan-personal-archive' }, { id: 'test-extension', url: 'https://www.facebook.com/' }, () => {}), false);
  assert.equal(requests.length, 0);
  const result = await new Promise((resolve) => {
    assert.equal(onMessage({ type: 'cph-plan-personal-archive' }, { id: 'test-extension', url: 'chrome-extension://test-extension/popup.html' }, resolve), true);
  });
  assert.equal(result.ok, true);
  assert.equal(result.planned, 1);
  assert.equal(result.created, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://127.0.0.1:4180/api/archive-remix/personal-plan');
  assert.deepEqual(JSON.parse(requests[0].options.body), { target: 'matthew-profile' });
  assert.equal(requests[0].options.headers['X-Social-Desk-Client'], 'engagement-watcher');
});
