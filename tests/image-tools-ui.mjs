// Copyright 2026 Matthew X Murphy. https://MatthewxMurphy.com
// Product attribution: https://builtnotbegged.com. SPDX-License-Identifier: MIT.
// Exact selected UI functions, fake DOM/fetch only; no page/bootstrap/provider.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const names = ['selectProvider', 'generateImage', 'generateSingleImage', 'generateImages'];
const functions = names.map(name => {
    const matches = [...source.matchAll(new RegExp(`^        (?:async )?function ${name}\\([^\\n]*\\) \\{\\n[\\s\\S]*?^        \\}`, 'gm'))];
    assert.equal(matches.length, 1, name);
    return matches[0][0];
}).join('\n');
const results = [];
function subject(method = '') {
    const effects = [];
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {value: id === 'imgMethod' ? method : id === 'genPrompt' ? 'Invented prompt' : '1024', style: {}, innerHTML: ''});
            return elements.get(id);
        },
        querySelectorAll() { return []; }
    };
    const scope = vm.createContext({document, config: {sites: [{id: 'fixture', wp: {api_base: 'https://fixture.invalid'}}]}, currentSiteId: 'fixture',
        addLog() {}, alert() {}, loadPostsNeedImages() {}, loadPostsNeedOg() {}, loadImageStats() {},
        fetch: async (...args) => { effects.push(args); return {json: async () => ({success: true})}; }});
    vm.runInContext('let selectedProvider = null;\n' + functions, scope, {timeout: 1000});
    return {scope, effects, elements};
}
for (const value of ['', 'openclaw', 'unknown']) {
    for (const entry of ['generateSingleImage(101)', "generateImages('featured')"]) {
        const {scope, effects} = subject(value);
        await vm.runInContext(entry, scope, {timeout: 1000});
        assert.equal(effects.length, 0);
        results.push({id: entry + '-reject-' + value, passed: true});
    }
}
for (const value of [null, 'openclaw', 'unknown']) {
    const {scope, effects} = subject();
    vm.runInContext('selectedProvider = ' + JSON.stringify(value), scope);
    await vm.runInContext('generateImage()', scope, {timeout: 1000});
    assert.equal(effects.length, 0);
    results.push({id: 'prompt-reject-' + value, passed: true});
}
for (const value of ['xai', 'comfyui', 'a1111']) {
    const {scope, effects} = subject(value);
    await vm.runInContext('generateSingleImage(101)', scope, {timeout: 1000});
    assert.equal(effects.length, 1);
    assert.equal(effects[0][0], 'https://fixture.invalid/cnd/v1/generate/101?method=' + value);
    results.push({id: 'single-explicit-' + value, passed: true});
}
for (const [value, id] of [['comfyui', 'provComfyUI'], ['a1111', 'provA1111']]) {
    const {scope, effects, elements} = subject();
    vm.runInContext(`selectProvider('${value}')`, scope, {timeout: 1000});
    assert.equal(elements.get(id).style.borderColor, '#00d4ff');
    await vm.runInContext('generateImage()', scope, {timeout: 1000});
    assert.equal(effects.length, 1);
    results.push({id: 'prompt-explicit-' + value, passed: true});
}
console.log(JSON.stringify({total: results.length, real_dom_or_provider_executed: false, results}));
