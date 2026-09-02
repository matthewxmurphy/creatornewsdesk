#!/usr/bin/env node

import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { removeArtificialRecycleLabel } from './facebook-runway-lib.mjs';

const apply = process.argv.includes('--apply');
const includePublished = process.argv.includes('--include-published');
const pageId = String(process.env.CPH_FACEBOOK_PAGE_ID || process.env.FACEBOOK_PAGE_ID || '').trim();
const pageToken = String(process.env.CPH_FACEBOOK_PAGE_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || '').trim();
const profile = String(process.env.CPH_RUNWAY_PROFILE || process.env.CPH_PROFILE || 'facebook-page').trim();
const graphVersion = /^v\d+\.\d+$/i.test(String(process.env.CPH_GRAPH_VERSION || 'v24.0'))
  ? String(process.env.CPH_GRAPH_VERSION || 'v24.0')
  : 'v24.0';
const artifactRoot = path.resolve(process.env.CPH_FACEBOOK_RUNWAY_ARTIFACTS || 'artifacts/facebook-runway');

if (!pageId || !pageToken) throw new Error('Facebook Page ID and token are required.');

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(String(payload?.error?.message || `HTTP ${response.status}`));
  }
  return payload;
}

async function graphPosts(edge, since = null) {
  const items = [];
  let url = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/${edge}`);
  url.searchParams.set('fields', 'id,message,scheduled_publish_time,created_time');
  url.searchParams.set('limit', '100');
  url.searchParams.set('access_token', pageToken);
  if (since) url.searchParams.set('since', String(since));
  for (let page = 0; url && page < 10; page += 1) {
    const payload = await fetchJson(url);
    items.push(...(Array.isArray(payload.data) ? payload.data : []));
    url = payload?.paging?.next ? new URL(payload.paging.next) : null;
  }
  return items;
}

async function updateMessage(postId, message) {
  const body = new URLSearchParams({ message, access_token: pageToken });
  return fetchJson(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(postId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

const edges = [{ name: 'scheduled_posts', since: null }];
if (includePublished) {
  edges.push({ name: 'published_posts', since: Math.floor(Date.now() / 1000) - 86_400 });
}

const matches = [];
for (const edge of edges) {
  const posts = await graphPosts(edge.name, edge.since);
  for (const post of posts) {
    const oldMessage = String(post?.message || '');
    const newMessage = removeArtificialRecycleLabel(oldMessage);
    if (!oldMessage || newMessage === oldMessage) continue;
    matches.push({
      edge: edge.name,
      facebook_post_id: String(post.id || ''),
      scheduled_publish_time: Number(post.scheduled_publish_time || 0) || null,
      created_time: post.created_time || null,
      old_message: oldMessage,
      new_message: newMessage,
    });
  }
}

await mkdir(artifactRoot, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(artifactRoot, `${profile}-recycle-label-cleanup-${stamp}.json`);
await writeFile(backupPath, `${JSON.stringify({ profile, apply, checked_at: new Date().toISOString(), matches }, null, 2)}\n`, { mode: 0o600 });

const updated = [];
const errors = [];
if (apply) {
  for (const match of matches) {
    try {
      await updateMessage(match.facebook_post_id, match.new_message);
      updated.push(match.facebook_post_id);
    } catch (error) {
      errors.push({ facebook_post_id: match.facebook_post_id, error: String(error.message || error) });
      break;
    }
  }
}

const result = { profile, mode: apply ? 'apply' : 'dry_run', backup_path: backupPath, matched: matches.length, updated, errors };
await appendFile(path.join(artifactRoot, `${profile}-recycle-label-cleanup.jsonl`), `${JSON.stringify(result)}\n`, { mode: 0o600 });
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
