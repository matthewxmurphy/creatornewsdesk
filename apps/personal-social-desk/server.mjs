import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir, mkdtemp, rm, stat, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import {
  CREATOR_NEWSDESK_GROUP_CONFIG,
  creatorNewsdeskGroupSummary,
  mergeCreatorNewsSources,
  nextDueCreatorNewsdeskGroupPost,
  rebuildCreatorNewsdeskGroupQueue,
  updateCreatorNewsdeskGroupPost,
} from './lib/creator-newsdesk-group.mjs';
import {
  groupModerationConfig,
  groupModerationSummary,
  mergeGroupModerationCaptures,
  recordGroupMemberWelcome,
  recordGroupModerationDecision,
} from './lib/group-moderation.mjs';
import {
  CREATOR_TIP_GROUP_SHARE_CONFIG,
  creatorTipGroupShareSummary,
  recordCreatorTipGroupShare,
} from './lib/creator-tip-group-share.mjs';
import {
  DEFAULT_PAGE_GROUP,
  PAGE_GROUP_DISTRIBUTION_CONFIG,
  mergePageGroupRules,
  nextDuePageGroupDistribution,
  pageGroupDistributionSummary,
  queuePageGroupDistribution,
  recordPageGroupDistributionProof,
  reviewPageGroupDistribution,
} from './lib/page-group-distribution.mjs';
import {
  MATTHEW_CANONICAL_REFERENCE_ASSETS,
  MATTHEW_REFERENCE_PACK_DIR,
  matthewLikenessAnchor,
  matthewReferencePackInstruction,
} from './lib/matthew-likeness.mjs';
import {
  classifyCommunityReplyIntent,
  communityReplyPrompt,
  ensureCommunityReplyQuestion,
} from './lib/community-replies.mjs';
import {
  COMMENT_REPLY_CADENCE_MINUTES,
  COMMENT_REPLY_MAX_ATTEMPTS,
  COMMENT_REPLY_RETRY_AFTER_MS,
  nextCommentReplyAttempt,
  selectOwnedReplyDrafts,
} from './lib/comment-reply-delivery.mjs';
import {
  currentProfessionalTrends,
  mergeProfessionalTrendSignals,
  professionalTrendSummary,
} from './lib/professional-trends.mjs';
import {
  mergeProfessionalGoalsCapture,
  normalizeProfessionalAchievements,
  professionalGoalsSummary,
} from './lib/professional-goals.mjs';
import {
  FOLLOWER_GROWTH_CONFIG,
  followerGrowthSummary,
  mergeFollowerGrowthCapture,
} from './lib/follower-growth-goal.mjs';
import {
  emptyPageFollowerRoster,
  mergePageFollowerCapture,
  pageFollowerRosterSummary,
} from './lib/page-follower-roster.mjs';
import {
  buildThemedArchiveSchedule,
  normalizeArchivePosts,
  themeForDate,
  WEEKLY_THEME_PLAN,
} from './lib/archive-schedule.mjs';
import {
  currentCreatorGuidance,
  mergeCreatorGuidance,
} from './lib/creator-guidance.mjs';
import {
  creatorIntelligenceDiscussionKey,
  creatorIntelligenceEngagementOpportunities,
  creatorIntelligencePatternReport,
  creatorIntelligenceSourceHealth,
  filterCreatorIntelligencePosts,
  mergeCreatorIntelligenceCaptures,
} from './lib/creator-intelligence.mjs';
import {
  ensureWeeklySocialCurrencyDraft,
  removeManualSocialCurrencyPost,
  recordManualSocialCurrencyPost,
} from './lib/social-currency.mjs';
import {
  buildPublishingPipeline,
  buildEngagementAssistSuggestions,
} from './lib/publishing-pipeline.mjs';
import {
  buildHourlyPageStoryPlan,
} from './lib/hourly-page-stories.mjs';
import {
  ensureRecurringPageDailySeries,
} from './lib/recurring-page-daily-series.mjs';
import {
  summarizeFacebookPageHistory,
} from './lib/facebook-page-history.mjs';
import {
  wordpressMediaPrioritySummary,
} from './lib/wordpress-media-priority.mjs';
import {
  creatorTipLaunchSchedule,
  creatorTipNumberFromItem,
  creatorTipSequenceGate,
  hasVerifiedFacebookScheduleProof,
  isCreatorTipItem,
  normalizeCreatorTipScheduling,
} from './lib/creator-tip-schedule.mjs';
import {
  CREATOR_TIP_ART_FAMILIES,
  creatorTipArtFamilyFromDirection,
  creatorTipArtStyle,
} from './lib/creator-tip-art-style.mjs';
import {
  analyzeCreatorTipCsv,
  buildCreatorTipImportDrafts,
  creatorTipCategoryInventory,
  creatorTipDisplayIdentity,
} from './lib/creator-tip-csv.mjs';
import {
  buildCreatorTipCollectionPlans,
  CREATOR_TIP_COVER_COLLECTION_KIND,
  isCreatorTipCoverCollectionDraft,
} from './lib/creator-tip-collections.mjs';
import {
  buildCreatorTipReelRyzenJobPayload,
  buildDailyCreatorTipReelPlan,
  buildWeeklyCreatorTipReelPlan,
} from './lib/creator-tip-reels.mjs';
import {
  pruneExpiredCreatorGreetings,
} from './lib/creator-greetings.mjs';
import {
  affiliateProductMatch,
  affiliateProductSuggestions,
  appendAffiliateProducts,
  DEFAULT_DISCLOSURE,
  normalizeAffiliateProduct,
  normalizeAffiliateStore,
} from './lib/affiliate-products.mjs';
import {
  USER_CONTENT_BANK,
  userContentBankSummary,
} from './lib/user-content-bank.mjs';
import {
  assertAiFirstCommentPostingAllowed,
  assignAiNightlySlots,
  DEFAULT_AI_NIGHTLY_SLOTS,
  DEFAULT_AI_NIGHTLY_TIME_ZONE,
  normalizeAiNightlyLane,
} from './lib/ai-nightly-lane.mjs';
import {
  audienceRiskSignals,
  shouldKeepAudienceBlocked,
  summarizeAudienceRisk,
} from './public/audience-risk.mjs';
import {
  activityEvidenceTrusted,
  compareInactiveOldestFirst,
  inactiveForReview,
  minorBlockActive,
  removedFromRoster,
} from './public/audience-policy.mjs';
import birthdayFacts from './chrome-engagement-watcher/birthday-facts.js';

const { parseBirthdayFacts, sameBirthdayMonthDay } = birthdayFacts;

const root = new URL('.', import.meta.url).pathname;
const localHubEnvironmentFile = join(root, '..', '..', 'access', 'creator-publishing-hub.local.env');
try {
  process.loadEnvFile(localHubEnvironmentFile);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const publicDir = join(root, 'public');
const dataDir = join(root, 'data');
const queueFile = join(dataDir, 'queue.json');
const analyticsFile = join(dataDir, 'analytics.json');
const audienceFile = join(dataDir, 'audience.json');
const engagementLedgerFile = join(dataDir, 'engagement-ledger.json');
const engagementNotesFile = join(dataDir, 'engagement-notes.json');
const messageLedgerFile = join(dataDir, 'message-ledger.json');
const inviteLedgerFile = join(dataDir, 'invite-ledger.json');
const inviteCandidateLedgerFile = join(dataDir, 'invite-candidate-ledger.json');
const followLedgerFile = join(dataDir, 'follow-ledger.json');
const relationshipRostersFile = join(dataDir, 'relationship-rosters.json');
const birthdayLedgerFile = join(dataDir, 'birthday-ledger.json');
const birthdayWishLedgerFile = join(dataDir, 'birthday-wish-ledger.json');
const professionalTrendLedgerFile = join(dataDir, 'professional-trend-ledger.json');
const professionalGoalsLedgerFile = join(dataDir, 'professional-goals-ledger.json');
const followerGrowthGoalFile = join(dataDir, 'follower-growth-goal.json');
const pageFollowerRosterFile = join(dataDir, 'page-follower-roster.json');
const creatorGuidanceLedgerFile = join(dataDir, 'creator-guidance-ledger.json');
const creatorIntelligenceLedgerFile = join(dataDir, 'creator-intelligence-ledger.json');
const scheduledContentLedgerFile = join(dataDir, 'scheduled-content-ledger.json');
const commentLikeLedgerFile = join(dataDir, 'comment-like-ledger.json');
const commentReplyLedgerFile = join(dataDir, 'comment-reply-ledger.json');
const creatorNewsSourceLedgerFile = join(dataDir, 'creator-news-source-ledger.json');
const creatorNewsdeskGroupQueueFile = join(dataDir, 'creator-newsdesk-group-queue.json');
const groupModerationLedgerFile = join(dataDir, 'group-moderation-ledger.json');
const creatorTipGroupShareLedgerFile = join(dataDir, 'creator-tip-group-share-ledger.json');
const pageGroupDistributionFile = join(dataDir, 'page-group-distribution.json');
const followerRemovalJobsFile = join(dataDir, 'follower-removal-jobs.json');
const aiCommentSettingsFile = join(dataDir, 'ai-comment-settings.json');
const commentsFile = join(dataDir, 'comments.json');
const mediaIndexFile = join(dataDir, 'facebook-media-index.json');
const facebookRemixLibraryFile = join(dataDir, 'facebook-remix-library.json');
const creatorTipArticleDraftsFile = join(dataDir, 'creator-tip-article-drafts.json');
const performanceLogFile = join(dataDir, 'performance-log.json');
const publishingMetricsFile = join(dataDir, 'publishing-metrics.json');
const creatorTipReelJobsFile = join(dataDir, 'creator-tip-reel-jobs.json');
const creatorTipReelAudioFile = join(dataDir, 'creator-tip-reel-audio.json');
const affiliateProductsFile = join(dataDir, 'affiliate-products.json');
const aiNightlyLaneFile = join(dataDir, 'ai-nightly-lane.json');
const firstCommentLedgerFile = join(dataDir, 'first-comment-ledger.json');
const creatorTipArtStylesFile = join(dataDir, 'creator-tip-art-styles.json');
const mediaThumbsDir = join(dataDir, 'media-thumbs');
const localGeneratedMediaDir = normalize(join(root, 'generated'));
const pendingRyzenThumbs = new Map();
const weeklyGoalsFile = join(root, '..', '..', 'config', 'weekly-goals.json');
const TOP_ENGAGER_MIN_SCORE = 30;
const facebookImportsDir = join(dataDir, 'imports');
const audienceSnapshotsDir = join(dataDir, 'audience-snapshots');
const audienceAvatarCacheDir = join(dataDir, 'audience-avatar-cache');
const port = Number(process.env.PORT || 4178);
const ryzenLocal = String(process.env.CPH_RYZEN_LOCAL || '') === '1';
const desktopStoriesDir = normalize(join(homedir(), 'Desktop', 'stories'));
const desktopLandscapeDir = normalize(join(homedir(), 'Desktop', 'landscape'));
const ryzenHost = process.env.RYZEN_HOST || 'mmurphy@100.80.51.78';
const ryzenSpool = process.env.RYZEN_SOCIAL_SPOOL || '/home/mmurphy/homelab/projects/creator-publishing-hub/data/personal-social/spool';
const ryzenCreatorTipReelSpool = process.env.RYZEN_CREATOR_TIP_REEL_SPOOL || '/home/mmurphy/homelab/projects/creator-publishing-hub/data/personal-social/creator-tip-reels/ready';
const ryzenCreatorTipReelRoot = normalize(join(ryzenCreatorTipReelSpool, '..'));
const ryzenMedia = process.env.RYZEN_SOCIAL_MEDIA || '/home/mmurphy/homelab/projects/creator-publishing-hub/data/personal-social/media';
const ryzenCreatorTipReelAudio = process.env.RYZEN_CREATOR_TIP_REEL_AUDIO || `${ryzenMedia}/creator-tip-reel-audio`;
const ryzenAudiencePriorityRoot = process.env.RYZEN_AUDIENCE_PRIORITY_ROOT || `${ryzenMedia}/audience-priority`;
const ryzenAudienceReviews = String(process.env.RYZEN_AUDIENCE_REVIEWS || `${ryzenMedia}/audience-profile-review.json,${ryzenMedia}/audience-profile-review-m3.json,${ryzenMedia}/audience-profile-review-m1.json`).split(',').map((value) => value.trim()).filter(Boolean);
const ryzenCreatorIntelligenceLedger = process.env.RYZEN_CREATOR_INTELLIGENCE_LEDGER || '/home/mmurphy/.local/share/creator-intelligence-monitor/data/creator-intelligence-ledger.json';
const ryzenSshKey = process.env.RYZEN_SSH_KEY || '/Users/Shared/aiether/keys/m1_server_ed25519';
const ryzenSshConnectTimeout = process.env.RYZEN_SSH_CONNECT_TIMEOUT || '30';
const ollamaKeychainService = 'com.creatorpublishinghub.social-desk.ollama';
const ollamaKeychainAccount = 'ollama-cloud-api-key';
const openCodeKeychainService = 'com.creatorpublishinghub.social-desk.opencode';
const openCodeKeychainAccount = 'opencode-zen-api-key';
const opencodeBin = process.env.OPENCODE_BIN || '/opt/homebrew/bin/opencode';
const localOllamaBaseUrl = String(process.env.CPH_LOCAL_OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const localAiCommentModel = process.env.CPH_LOCAL_AI_COMMENT_MODEL || 'qwen3:8b';
const archiveRemixLocalModel = process.env.CPH_ARCHIVE_REMIX_MODEL || 'qwen3:4b';
const imageIdentifyBin = process.env.IMAGEMAGICK_IDENTIFY_BIN || (ryzenLocal ? '/usr/bin/identify' : '/opt/homebrew/bin/magick');
const imageConvertBin = process.env.IMAGEMAGICK_CONVERT_BIN || (ryzenLocal ? '/usr/bin/convert' : '/opt/homebrew/bin/magick');
const creatorTipReelWorker = {
  engine: 'fish-speech',
  configured: Boolean(String(process.env.FISH_SPEECH_URL || process.env.FISH_SPEECH_API_URL || '').trim()),
};
let creatorTipStyleConfig = { version: 1, updatedAt: null, customStyles: [], dateOverrides: {} };
creatorTipReelWorker.state = creatorTipReelWorker.configured ? 'ready' : 'fish-speech-config-required';
creatorTipReelWorker.reason = creatorTipReelWorker.configured
  ? 'Ryzen can render approval-gated reel previews.'
  : 'A working voice provider is required on Ryzen before queued reel jobs can render.';
const defaultAiCommentSettings = {
  model: 'gpt-oss:120b',
  fallbackEnabled: true,
  fallbackModel: 'opencode/big-pickle',
  autoSendOwnedReplies: true,
};
const PUBLISHING_TARGET_WINDOW_DAYS = 45;
const PUBLISHING_TARGET_SHARES_PER_DAY = 12;
let audienceReviewRefreshPromise = null;
let audienceReviewRefreshedAt = 0;
let personalPublishingReadinessPromise = null;
let personalPublishingReadinessCache = { checkedAt: 0, value: null };
let publishingInventoryCache = { checkedAt: 0, value: null };
const wordpressMediaStatusCache = new Map();
let birthdayCapturePromise = Promise.resolve();
let commentReplyLedgerMutationPromise = Promise.resolve();

function serializeCommentReplyLedgerMutation(work) {
  const run = commentReplyLedgerMutationPromise.then(work, work);
  commentReplyLedgerMutationPromise = run.catch(() => {});
  return run;
}

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
};
const SENTENCE_ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'vs', 'etc', 'jr', 'sr']);
const SENTENCE_TLDS = new Set(['com', 'net', 'org', 'co', 'io', 'ai', 'me', 'gd', 'us', 'edu', 'gov', 'biz', 'info', 'in', 'ph', 'ly', 'xyz', 'site', 'link', 'click', 'shop', 'online', 'live']);

function normalizeHumanPostText(value = '') {
  const source = String(value || '').replace(/\*\*/g, '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
  if (!source) return '';
  const shouldSkipPeriodSpace = (text, index) => {
    const before = text.slice(0, index);
    const after = text.slice(index + 1);
    const previousToken = (before.match(/([A-Za-z0-9_@:/-]+)$/) || [])[1] || '';
    const nextToken = (after.match(/^([A-Za-z0-9_-]+)/) || [])[1] || '';
    const previousLower = previousToken.toLocaleLowerCase();
    const nextLower = nextToken.toLocaleLowerCase();
    if (!nextToken) return true;
    if (/\d$/.test(previousToken) && /^\d/.test(nextToken)) return true;
    if (previousToken.includes('@') || previousToken.includes('://') || previousToken.endsWith('/')) return true;
    if (previousToken.length === 1 && /^[A-Za-z0-9]/.test(nextToken)) return true;
    if (SENTENCE_ABBREVIATIONS.has(previousLower)) return true;
    if (SENTENCE_TLDS.has(nextLower)) return true;
    return false;
  };
  let spaced = '';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    spaced += character;
    const next = source[index + 1] || '';
    if (!/[.!?]/.test(character)) continue;
    if (next === character) continue;
    if (!/[A-Za-z0-9"'“”‘’([{#@]/.test(next)) continue;
    if (character === '.' && shouldSkipPeriodSpace(source, index)) continue;
    spaced += ' ';
  }
  return spaced
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/([^\s#])(?=#[A-Za-z0-9_])/g, '$1 ')
    .replace(/[ \t]+([,;:!?])/g, '$1')
    .replace(/([.!?])(?=[A-Za-z0-9"'“”‘’([{#@])/g, '$1 ')
    .replace(/(Creator Tip #\d+\s*[—•-]\s*Matthew Murphy)\n+(?=#)/gi, '$1 ')
    .replace(/(Matthew Murphy)\n+(?=#)/gi, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function emptyRelationshipRosters() {
  return {
    updatedAt: null,
    rosters: {
      friend: { updatedAt: null, total: 0, complete: false, routes: {}, people: [] },
      following: { updatedAt: null, total: 0, complete: false, routes: {}, people: [] },
    },
  };
}

function emptyPublishingMetrics() {
  return {
    updatedAt: null,
    destinations: {},
    posts: [],
    facebookPageHistory: null,
    creatorTipPageProgress: null,
  };
}

async function ensureData() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(audienceSnapshotsDir, { recursive: true });
  await mkdir(mediaThumbsDir, { recursive: true });
  try { await stat(queueFile); } catch {
    await writeJson(queueFile, { items: seedItems() });
  }
  try { await stat(analyticsFile); } catch {
    await writeJson(analyticsFile, { importedAt: null, posts: 0, bestHours: [], formats: [] });
  }
  try { await stat(audienceFile); } catch {
    await writeJson(audienceFile, { importedAt: null, coverage: {}, summary: {}, people: [] });
  }
  try { await stat(engagementLedgerFile); } catch {
    await writeJson(engagementLedgerFile, { updatedAt: null, events: [] });
  }
  try { await stat(engagementNotesFile); } catch {
    await writeJson(engagementNotesFile, { updatedAt: null, notes: [] });
  }
  try { await stat(messageLedgerFile); } catch {
    await writeJson(messageLedgerFile, { updatedAt: null, threads: [] });
  }
  try { await stat(inviteLedgerFile); } catch {
    await writeJson(inviteLedgerFile, { updatedAt: null, invites: [] });
  }
  try { await stat(inviteCandidateLedgerFile); } catch {
    await writeJson(inviteCandidateLedgerFile, { updatedAt: null, candidates: [] });
  }
  try { await stat(followLedgerFile); } catch {
    await writeJson(followLedgerFile, { updatedAt: null, events: [] });
  }
  try { await stat(relationshipRostersFile); } catch {
    await writeJson(relationshipRostersFile, emptyRelationshipRosters());
  }
  try { await stat(pageFollowerRosterFile); } catch {
    await writeJson(pageFollowerRosterFile, emptyPageFollowerRoster());
  }
  try { await stat(birthdayLedgerFile); } catch {
    await writeJson(birthdayLedgerFile, { updatedAt: null, people: [] });
  }
  try { await stat(birthdayWishLedgerFile); } catch {
    await writeJson(birthdayWishLedgerFile, { updatedAt: null, wishes: [] });
  }
  try { await stat(professionalTrendLedgerFile); } catch {
    await writeJson(professionalTrendLedgerFile, { updatedAt: null, items: [] });
  }
  try { await stat(professionalGoalsLedgerFile); } catch {
    await writeJson(professionalGoalsLedgerFile, { updatedAt: null, tasks: [], achievements: [] });
  }
  try { await stat(followerGrowthGoalFile); } catch {
    await writeJson(followerGrowthGoalFile, { version: 1, ...FOLLOWER_GROWTH_CONFIG, updatedAt: null, history: [] });
  }
  try { await stat(creatorGuidanceLedgerFile); } catch {
    await writeJson(creatorGuidanceLedgerFile, { updatedAt: null, items: [] });
  }
  try { await stat(creatorIntelligenceLedgerFile); } catch {
    await writeJson(creatorIntelligenceLedgerFile, {
      updatedAt: null,
      policy: 'Research only. Detect topics and patterns; never copy or automatically republish source wording.',
      posts: [],
    });
  }
  try { await stat(scheduledContentLedgerFile); } catch {
    await writeJson(scheduledContentLedgerFile, { updatedAt: null, sourceUrl: null, emptyState: null, items: [] });
  }
  try { await stat(commentLikeLedgerFile); } catch {
    await writeJson(commentLikeLedgerFile, { updatedAt: null, likes: [] });
  }
  try { await stat(commentReplyLedgerFile); } catch {
    await writeJson(commentReplyLedgerFile, { updatedAt: null, drafts: [], replies: [] });
  }
  try { await stat(creatorNewsSourceLedgerFile); } catch {
    await writeJson(creatorNewsSourceLedgerFile, { updatedAt: null, sources: [] });
  }
  try { await stat(creatorNewsdeskGroupQueueFile); } catch {
    await writeJson(creatorNewsdeskGroupQueueFile, { updatedAt: null, config: CREATOR_NEWSDESK_GROUP_CONFIG, items: [] });
  }
  try { await stat(groupModerationLedgerFile); } catch {
    await writeJson(groupModerationLedgerFile, { version: 1, groupId: groupModerationConfig.groupId, updatedAt: null, pendingCount: null, spamCount: null, items: [], members: [], welcomes: [] });
  }
  try { await stat(creatorTipGroupShareLedgerFile); } catch {
    await writeJson(creatorTipGroupShareLedgerFile, { updatedAt: null, config: CREATOR_TIP_GROUP_SHARE_CONFIG, items: [] });
  }
  try { await stat(followerRemovalJobsFile); } catch {
    await writeJson(followerRemovalJobsFile, { updatedAt: null, jobs: [] });
  }
  try { await stat(aiCommentSettingsFile); } catch {
    await writeJson(aiCommentSettingsFile, defaultAiCommentSettings);
  }
  try { await stat(commentsFile); } catch {
    await writeJson(commentsFile, { mode: 'review', items: [] });
  }
  try { await stat(creatorTipArticleDraftsFile); } catch {
    await writeJson(creatorTipArticleDraftsFile, { updatedAt: null, items: [] });
  }
  try { await stat(publishingMetricsFile); } catch {
    await writeJson(publishingMetricsFile, emptyPublishingMetrics());
  }
  try { await stat(creatorTipReelJobsFile); } catch {
    await writeJson(creatorTipReelJobsFile, { updatedAt: null, jobs: [] });
  }
  try { await stat(creatorTipReelAudioFile); } catch {
    await writeJson(creatorTipReelAudioFile, { updatedAt: null, tracks: [] });
  }
  try { await stat(affiliateProductsFile); } catch {
    await writeJson(affiliateProductsFile, { updatedAt: null, disclosure: DEFAULT_DISCLOSURE, products: [] });
  }
  try { await stat(aiNightlyLaneFile); } catch {
    await writeJson(aiNightlyLaneFile, {
      updatedAt: null,
      enabled: true,
      timeZone: DEFAULT_AI_NIGHTLY_TIME_ZONE,
      slots: [...DEFAULT_AI_NIGHTLY_SLOTS],
      target: 'matthew-page',
      approvalRequired: true,
      requests: [],
    });
  }
  try { await stat(firstCommentLedgerFile); } catch {
    await writeJson(firstCommentLedgerFile, { updatedAt: null, comments: [] });
  }
  try { await stat(creatorTipArtStylesFile); } catch {
    await writeJson(creatorTipArtStylesFile, { version: 1, updatedAt: null, customStyles: [], dateOverrides: {} });
  }
  creatorTipStyleConfig = normalizeCreatorTipStyleConfig(await readJson(creatorTipArtStylesFile));
  const repairedBirthdays = await saveBirthdayPeople([]);
  const audience = await readJson(audienceFile);
  if (applyBirthdayFactsToAudience(audience, repairedBirthdays.ledger)) await writeJson(audienceFile, audience);
  await ensureBirthdayCreatorDraft(repairedBirthdays.ledger, audience);
  await ensureDailyDiscussions();
  await ensureDailyStories();
  await ensurePinnedPostCta();
  const [queue, creatorIntelligence] = await Promise.all([
    readJson(queueFile),
    readJson(creatorIntelligenceLedgerFile),
  ]);
  const schedulingChanged = normalizeCreatorTipScheduling(queue, new Date());
  const artworkSchedulingChanged = syncPendingCreatorTipArtworkDays(queue);
  const socialCurrency = ensureWeeklySocialCurrencyDraft(queue, new Date(), creatorIntelligence.posts || []);
  const expiredGreetings = pruneExpiredCreatorGreetings(queue, { now: new Date() });
  if (schedulingChanged || artworkSchedulingChanged || socialCurrency.created || socialCurrency.updated || expiredGreetings.length) {
    queue.updatedAt = new Date().toISOString();
    await writeJson(queueFile, queue);
  }
}

async function ensureWeeklySocialCurrencyQueue(now = new Date()) {
  const [queue, creatorIntelligence] = await Promise.all([
    readJson(queueFile),
    readJson(creatorIntelligenceLedgerFile),
  ]);
  const result = ensureWeeklySocialCurrencyDraft(queue, now, creatorIntelligence.posts || []);
  if (result.created || result.updated) await writeJson(queueFile, queue);
  return result;
}

function seedItems() {
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(18, 30, 0, 0);
  return [{
    id: randomUUID(),
    title: 'Daily discussion prompt',
    body: 'What is one money rule people repeat confidently that does not hold up in real life?',
    target: 'matthew-page',
    format: 'discussion',
    status: 'draft',
    scheduledFor: tomorrow.toISOString(),
    source: 'editorial',
    notes: 'Fact-check the premise and keep the question pointed without making a false claim.',
    createdAt: new Date().toISOString(),
  }];
}

function creatorTipCanonicalSeedItems(items = []) {
  const seeds = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.format !== 'feed') continue;
    const source = String(item?.source || '');
    if (!/^facebook-creator-tips:matthew-profile:cycle-1:tip-(\d+)$/i.test(source)) continue;
    const tipNumber = creatorTipNumberFromItem(item);
    if (!(tipNumber > 0) || seeds.has(tipNumber)) continue;
    seeds.set(tipNumber, item);
  }
  return [...seeds.entries()].sort((a, b) => a[0] - b[0]).map(([, item]) => item);
}

function nextSyntheticCreatorTipNumber(items = []) {
  let maxSynthetic = 1588;
  for (const item of Array.isArray(items) ? items : []) {
    const tipNumber = creatorTipNumberFromItem(item);
    if (tipNumber >= 1500) maxSynthetic = Math.max(maxSynthetic, tipNumber);
  }
  return maxSynthetic + 1;
}

function relabelCreatorTipIdentity(item, nextTipNumber, reason = '') {
  const tipNumber = Number(nextTipNumber || 0);
  if (!(tipNumber > 0)) return item;
  const source = String(item?.source || '');
  const title = String(item?.title || '');
  const body = String(item?.body || '');
  const previousTipNumber = creatorTipNumberFromItem(item);
  const sourceMatch = source.match(/^(facebook-creator-tips:[^:]+:cycle-\d+:)tip-(\d+)$/i);
  if (sourceMatch) item.source = `${sourceMatch[1]}tip-${tipNumber}`;
  if (/^tip\s+\d+\s+[—-]\s+/i.test(title)) item.title = title.replace(/^tip\s+\d+\s+([—-])\s+/i, `Tip ${tipNumber} $1 `);
  else if (/creator tip\s*#\d+/i.test(title)) item.title = title.replace(/creator tip\s*#\d+/i, `Creator Tip #${tipNumber}`);
  if (body) {
    item.body = body.replace(/Creator Tip #\d+/gi, `Creator Tip #${tipNumber}`);
  }
  item.campaign = { ...(item.campaign || {}), tipNumber: String(tipNumber), remappedFromTipNumber: previousTipNumber ? String(previousTipNumber) : '', remappedAt: new Date().toISOString() };
  item.notes = [String(item.notes || '').trim(), reason ? `Remapped to Creator Tip #${tipNumber}: ${reason}` : `Remapped to Creator Tip #${tipNumber} to avoid duplicate caption collision.`]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 1000);
  return item;
}

function creatorTipPlainBody(body = '') {
  return String(body || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/Creator Tip\s*#\d+\s*[•·—-]\s*Matthew Murphy/ig, '')
    .replace(/#\S+/g, '')
    .replace(/Creator Tip\s*[•·—-]?\s*Matthew Murphy/ig, '')
    .replace(/^\s*Creator Tip\s*$/gim, '')
    .replace(/—\s*Matthew Murphy/ig, '')
    .trim();
}

function creatorTipArticleTitle(item = {}) {
  const tipNumber = creatorTipNumberFromItem(item);
  const rawTitle = String(item?.title || 'Creator Tip').trim();
  const withoutPrefix = rawTitle.replace(/^Tip\s*\d+\s*[—-]\s*/i, '').trim();
  return tipNumber > 0 ? `Creator Tip #${tipNumber}: ${withoutPrefix || rawTitle}` : rawTitle;
}

function creatorTipArticleSlug(item = {}) {
  const tipNumber = creatorTipNumberFromItem(item);
  const title = creatorTipArticleTitle(item)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return tipNumber > 0 ? `creator-tip-${tipNumber}-${title.replace(/^creator-tip-\d+-/, '')}` : title;
}

function creatorTipArticleExcerpt(item = {}) {
  const plain = creatorTipPlainBody(item?.body || '');
  const firstParagraph = plain.split(/\n{2,}/).find(Boolean) || plain;
  return firstParagraph.slice(0, 240).trim();
}

function buildCreatorTipArticleDraft(item = {}) {
  const tipNumber = creatorTipNumberFromItem(item);
  const articleTitle = creatorTipArticleTitle(item);
  const excerpt = creatorTipArticleExcerpt(item);
  const sourceUrl = String(item?.sourceUrl || '').trim();
  const sourceTitle = String(item?.sourceTitle || '').trim();
  const body = creatorTipPlainBody(item?.body || '');
  const paragraphs = body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const intro = paragraphs[0] || excerpt || articleTitle;
  const guidance = paragraphs.slice(1);
  const takeawayList = guidance.length
    ? `<ul>${guidance.map((part) => `<li>${part}</li>`).join('')}</ul>`
    : '';
  const sourceBlock = sourceUrl
    ? `<p><strong>Source inspiration:</strong> <a href="${sourceUrl}">${sourceTitle || sourceUrl}</a></p>`
    : '';
  const content = [
    `<p>${intro}</p>`,
    takeawayList,
    '<p>That is the whole point behind this Creator Tip: build something that gives people a reason to remember you, come back, and trust what you post next.</p>',
    '<p>Matthew Murphy is using Creator Publishing Hub as a live creator-growth lab for consistency, community, and audience quality. This article is part of that running series.</p>',
    sourceBlock,
  ].filter(Boolean).join('\n');
  return {
    id: `creator-tip-article-${tipNumber || randomUUID()}`,
    key: `creator-tip:${tipNumber || 'unknown'}`,
    tipNumber,
    title: articleTitle,
    slug: creatorTipArticleSlug(item),
    excerpt,
    contentHtml: content,
    source: String(item?.source || ''),
    sourceTitle,
    sourceUrl,
    socialDeskDraftId: String(item?.id || ''),
    imagePrompt: String(item?.imagePrompt || ''),
    storyImagePrompt: String(item?.storyImagePrompt || ''),
    canonicalMedia: Array.isArray(item?.media) ? item.media : [],
    authorName: 'Matthew Murphy',
    targetSite: 'creatornewsdesk.com',
    createdAt: new Date().toISOString(),
  };
}

async function buildCreatorTipArticleDrafts() {
  const queue = await readJson(queueFile);
  const items = Array.isArray(queue?.items) ? queue.items : [];
  return creatorTipCanonicalSeedItems(items).map(buildCreatorTipArticleDraft);
}

function creatorTipCycleNumber(item = {}) {
  const match = String(item?.source || '').match(/:cycle-(\d+):/i);
  return match ? Number(match[1]) : 0;
}

function creatorTipCampaignCompanions(items = [], selected = {}) {
  const tipNumber = creatorTipNumberFromItem(selected);
  if (!(tipNumber > 0)) throw new Error('This campaign handoff only works for numbered Creator Tip drafts.');
  const selectedCycle = creatorTipCycleNumber(selected);
  const candidates = (Array.isArray(items) ? items : [])
    .filter((item) => item?.format !== 'story')
    .filter((item) => creatorTipNumberFromItem(item) === tipNumber)
    .filter((item) => !selectedCycle || creatorTipCycleNumber(item) === selectedCycle);
  const pick = (target) => candidates
    .filter((item) => item.target === target)
    .sort((left, right) => {
      const leftReady = left?.mediaApproval?.hiddenAt ? 0 : 1;
      const rightReady = right?.mediaApproval?.hiddenAt ? 0 : 1;
      if (leftReady !== rightReady) return leftReady - rightReady;
      return String(left?.id || '').localeCompare(String(right?.id || ''));
    })[0] || null;
  return {
    tipNumber,
    personal: pick('matthew-profile') || (selected.target === 'matthew-profile' ? selected : null),
    page: pick('matthew-page') || (selected.target === 'matthew-page' ? selected : null),
  };
}

function ensureCampaignDraftReady(item, label) {
  if (!item) throw new Error(`${label} draft is missing for this Creator Tip.`);
  if (!item.mediaApproval?.hiddenAt) throw new Error(`${label} draft is not approved in Media yet.`);
  if (['rejected', 'removed'].includes(item.status)) throw new Error(`${label} draft is not sendable because it is ${item.status}.`);
}

function ensureCampaignSequenceSchedule(item, tipNumber) {
  const intendedScheduledFor = creatorTipLaunchSchedule(tipNumber);
  if (!intendedScheduledFor) throw new Error('This Creator Tip does not have a valid sequence slot.');
  let changed = false;
  if (item.intendedScheduledFor !== intendedScheduledFor) {
    item.intendedScheduledFor = intendedScheduledFor;
    changed = true;
  }
  if (!item.facebookHandoff?.facebookConfirmed && item.scheduledFor !== intendedScheduledFor) {
    item.scheduledFor = intendedScheduledFor;
    changed = true;
  }
  return changed;
}

async function upsertCreatorTipArticleDraft(item = {}) {
  const existing = await readJson(creatorTipArticleDraftsFile).catch(() => ({ updatedAt: null, items: [] }));
  const now = new Date().toISOString();
  const draft = {
    ...buildCreatorTipArticleDraft(item),
    status: 'ready-for-wordpress',
    updatedAt: now,
  };
  const items = (Array.isArray(existing?.items) ? existing.items : []).filter((entry) => entry?.key !== draft.key);
  items.push(draft);
  items.sort((left, right) => (Number(left?.tipNumber || 0) - Number(right?.tipNumber || 0)) || String(left?.id || '').localeCompare(String(right?.id || '')));
  await writeJson(creatorTipArticleDraftsFile, { updatedAt: now, items });
  return draft;
}

async function prepareCreatorTipCampaignHandoff(itemId, { commitPage = true, targets = 'both' } = {}) {
  const queue = await readJson(queueFile);
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const selected = items.find((entry) => entry.id === itemId);
  if (!selected) throw new Error('Draft not found.');
  const scope = normalizeCampaignTargets(targets);
  const includePersonal = scope !== 'page';
  const includePage = scope !== 'personal';
  const { tipNumber, personal, page } = creatorTipCampaignCompanions(items, selected);
  if (includePersonal) ensureCampaignDraftReady(personal, 'Personal profile');
  if (includePage) ensureCampaignDraftReady(page, 'Fan page');
  if (includePersonal) ensureCampaignSequenceSchedule(personal, tipNumber);
  if (includePage) ensureCampaignSequenceSchedule(page, tipNumber);
  for (const item of [includePersonal ? personal : null, includePage ? page : null].filter(Boolean)) {
    if (item.status === 'draft') {
      item.status = 'approved';
      item.approvedAt ||= new Date().toISOString();
    }
  }
  await writeJson(queueFile, queue);

  const articleSource = personal || page || selected;
  const creatorNewsdeskDraft = await upsertCreatorTipArticleDraft(articleSource);
  let fanPage = {
    ok: false,
    skipped: !includePage || !commitPage,
    draftId: page?.id || '',
    message: !includePage ? 'Fan-page send was skipped for personal-only handoff.' : commitPage ? '' : 'Fan-page API send was not requested for this preview.',
  };
  if (includePage && commitPage) {
    try {
      const scheduled = await scheduleFacebookPageDraftViaMetaApi(page.id, { approve: true });
      fanPage = {
        ok: true,
        draftId: scheduled.id,
        status: scheduled.status,
        scheduledFor: scheduled.scheduledFor,
        graphId: scheduled.facebookMatch?.graphId || '',
        sourceUrl: scheduled.facebookMatch?.sourceUrl || '',
      };
    } catch (error) {
      fanPage = { ok: false, draftId: page.id, error: String(error.message || error) };
    }
  }

  return {
    ok: true,
    targets: scope,
    tipNumber,
    personal: includePersonal
      ? {
          draftId: personal.id,
          scheduledFor: personal.scheduledFor,
          target: personal.target,
        }
      : null,
    fanPage,
    creatorNewsdesk: {
      ok: true,
      draftId: creatorNewsdeskDraft.id,
      status: creatorNewsdeskDraft.status,
      file: creatorTipArticleDraftsFile,
    },
  };
}

async function pushCreatorTipCampaignRange({ start = 1, end = 49, commitPage = true, targets = 'both', exportMedia = true } = {}) {
  const first = Math.max(1, Number(start) || 1);
  const last = Math.max(first, Number(end) || first);
  const queue = await readJson(queueFile);
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const scope = normalizeCampaignTargets(targets);
  const results = [];
  for (let tipNumber = first; tipNumber <= last; tipNumber += 1) {
    const candidates = items
      .filter((item) => item?.format !== 'story')
      .filter((item) => creatorTipNumberFromItem(item) === tipNumber)
      .sort((left, right) => {
        const leftTarget = left?.target === 'matthew-profile' ? 0 : left?.target === 'matthew-page' ? 1 : 2;
        const rightTarget = right?.target === 'matthew-profile' ? 0 : right?.target === 'matthew-page' ? 1 : 2;
        if (leftTarget !== rightTarget) return leftTarget - rightTarget;
        const leftReady = left?.mediaApproval?.hiddenAt ? 0 : 1;
        const rightReady = right?.mediaApproval?.hiddenAt ? 0 : 1;
        if (leftReady !== rightReady) return leftReady - rightReady;
        return String(left?.id || '').localeCompare(String(right?.id || ''));
      });
    const selected = candidates.find((item) => item.target === 'matthew-profile')
      || candidates.find((item) => item.target === 'matthew-page')
      || candidates[0];
    if (!selected) {
      results.push({ tipNumber, ok: false, error: `Tip ${tipNumber} is missing from the queue.` });
      continue;
    }
    try {
      const handoff = await prepareCreatorTipCampaignHandoff(selected.id, { commitPage, targets: scope });
      let mediaExport = null;
      if (exportMedia) {
        try {
          mediaExport = await exportCreatorTipCampaignMedia(selected.id, { targets: scope });
        } catch (error) {
          mediaExport = { ok: false, error: String(error.message || error) };
        }
      }
      results.push({ ...handoff, ok: handoff.ok && handoff.fanPage?.ok !== false, mediaExport });
    } catch (error) {
      results.push({ tipNumber, ok: false, error: String(error.message || error) });
    }
  }
  const fanPageOk = results.filter((entry) => entry?.fanPage?.ok).length;
  const fanPageBlocked = results.filter((entry) => entry?.fanPage?.ok === false && entry?.fanPage?.error).length;
  return {
    ok: results.every((entry) => entry.ok),
    range: { start: first, end: last },
    requested: last - first + 1,
    prepared: results.filter((entry) => entry?.creatorNewsdesk?.ok || entry?.personal).length,
    fanPageOk,
    fanPageBlocked,
    mediaExported: results.filter((entry) => entry?.mediaExport?.ok).length,
    results,
  };
}

function defaultPublishingSites() {
  return [
    { id: 'creatornewsdesk', name: 'Creator Newsdesk', siteUrl: 'https://www.creatornewsdesk.com', wpApiBase: 'https://www.creatornewsdesk.com/wp-json/wp/v2', imageDeskUrl: 'https://www.creatornewsdesk.com/wp-admin/edit.php?page=creator-needs-images', logoUrl: 'https://www.creatornewsdesk.com/wp-content/uploads/2026/02/creatornewsdesk-logo-header-228.png', goals: { socialSharesPerDay: PUBLISHING_TARGET_SHARES_PER_DAY, socialTargetWindowDays: PUBLISHING_TARGET_WINDOW_DAYS } },
    { id: 'factology', name: 'The Factology Daily', siteUrl: 'https://thefactologydaily.com', wpApiBase: 'https://thefactologydaily.com/wp-json/wp/v2', imageDeskUrl: 'https://thefactologydaily.com/wp-admin/edit.php?page=creator-needs-images', logoUrl: 'https://thefactologydaily.com/wp-content/themes/factology-daily/assets/factology-mark.png', goals: { socialSharesPerDay: PUBLISHING_TARGET_SHARES_PER_DAY, socialTargetWindowDays: PUBLISHING_TARGET_WINDOW_DAYS } },
    { id: 'creditrepairchoices', name: 'Credit Repair Choices', siteUrl: 'https://creditrepairchoices.com', wpApiBase: 'https://creditrepairchoices.com/wp-json/wp/v2', imageDeskUrl: 'https://creditrepairchoices.com/wp-admin/edit.php?page=creator-needs-images', logoUrl: 'https://creditrepairchoices.com/wp-content/themes/creditrepairchoices/assets/images/credit-repair-choices-logo-header.png', goals: { socialSharesPerDay: PUBLISHING_TARGET_SHARES_PER_DAY, socialTargetWindowDays: PUBLISHING_TARGET_WINDOW_DAYS } },
    { id: 'dailysmirk', name: 'The Daily Smirk', siteUrl: 'https://thedailysmirk.com', wpApiBase: 'https://thedailysmirk.com/wp-json/wp/v2', imageDeskUrl: 'https://thedailysmirk.com/wp-admin/edit.php?page=creator-needs-images', logoUrl: 'https://thedailysmirk.com/wp-content/uploads/2026/07/daily-smirk-site-icon.png', goals: { socialSharesPerDay: PUBLISHING_TARGET_SHARES_PER_DAY, socialTargetWindowDays: PUBLISHING_TARGET_WINDOW_DAYS } },
  ];
}

const WORDPRESS_MEDIA_TOKEN_ENVS = Object.freeze({
  creatornewsdesk: ['CPH_CREATORNEWSDESK_WORKER_TOKEN', 'CND_WORKER_TOKEN'],
  factology: ['CPH_FACTOLOGY_WORKER_TOKEN', 'FACTOLOGY_WORKER_TOKEN'],
  creditrepairchoices: ['CPH_CREDITREPAIRCHOICES_WORKER_TOKEN', 'CREDIT_REPAIR_CHOICES_WORKER_TOKEN'],
  dailysmirk: ['CPH_DAILYSMIRK_WORKER_TOKEN', 'DAILY_SMIRK_WORKER_TOKEN'],
});

function wordpressMediaSite(siteId) {
  return defaultPublishingSites().find((site) => site.id === String(siteId || '').trim()) || null;
}

function wordpressMediaWorkerToken(siteId) {
  const names = WORDPRESS_MEDIA_TOKEN_ENVS[siteId] || [];
  for (const name of names) {
    const token = String(process.env[name] || '').trim();
    if (token) return token;
  }
  return String(process.env.CPH_WORDPRESS_WORKER_TOKEN || '').trim();
}

async function wordpressMediaRequest(site, pathname, { method = 'GET', body } = {}) {
  const token = wordpressMediaWorkerToken(site.id);
  if (!token) {
    const error = new Error(`${site.name} is not connected for Media review on this Mac yet.`);
    error.status = 409;
    throw error;
  }
  const response = await fetch(`${String(site.siteUrl).replace(/\/$/, '')}/wp-json/creator-publishing-hub/v1${pathname}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(payload?.message || payload?.error || `${site.name} returned ${response.status}`));
    error.status = response.status;
    throw error;
  }
  return payload;
}

function wordpressMediaPayloadWithSiteBrand(payload, site) {
  const logoUrl = String(site?.logoUrl || '');
  if (!logoUrl || !Array.isArray(payload?.items)) return payload;
  const payloadSite = payload?.site && typeof payload.site === 'object' && !Array.isArray(payload.site)
    ? payload.site
    : { name: String(payload?.site || site?.name || '').trim() };
  return {
    ...payload,
    site: { ...payloadSite, logo_url: logoUrl },
    items: payload.items.map((item) => ({
      ...item,
      site_logo_url: logoUrl,
      landscape_api_payload: { ...(item.landscape_api_payload || {}), site_logo_url: logoUrl },
      story_api_payload: { ...(item.story_api_payload || {}), site_logo_url: logoUrl },
      complete_payload_shape: { ...(item.complete_payload_shape || {}), site_logo_url: logoUrl },
    })),
  };
}

async function wordpressMediaSources() {
  return Promise.all(defaultPublishingSites().map(async (site) => {
    const baseUrl = String(site.siteUrl).replace(/\/$/, '');
    let status = {};
    let error = '';
    let stale = false;
    try {
      const response = await fetch(`${baseUrl}/wp-json/creator-publishing-hub/v1/public-work-status`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      status = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`${site.name} returned ${response.status}`);
      wordpressMediaStatusCache.set(site.id, status);
    } catch (requestError) {
      const cachedStatus = wordpressMediaStatusCache.get(site.id);
      if (cachedStatus) {
        status = cachedStatus;
        stale = true;
      } else {
        try {
          const jobs = await wordpressMediaRequest(site, '/image-production/jobs?per_page=1');
          status = {
            logo_url: site.logoUrl,
            metrics: { needs_images: Number(jobs?.count || 0) },
          };
          stale = true;
        } catch {
          error = String(requestError.message || requestError);
        }
      }
    }
    const workload = status?.image_workload || {};
    return {
      id: site.id,
      name: site.name,
      siteUrl: site.siteUrl,
      imageDeskUrl: site.imageDeskUrl,
      logoUrl: String(site.logoUrl || status?.logo_url || ''),
      connected: Boolean(wordpressMediaWorkerToken(site.id)),
      stale,
      workload: {
        total: Number(workload.total || status?.metrics?.needs_images || 0),
        redo: Number(workload.redo || status?.metrics?.image_redo || 0),
        missing: Number(workload.missing || status?.metrics?.image_missing || 0),
        providerReplace: Number(workload.provider_replace || status?.metrics?.image_provider_replace || 0),
        providerReview: Number(workload.provider_review || status?.metrics?.image_provider_review || 0),
      },
      error,
    };
  }));
}

function publishingPace(site) {
  const explicit = Number(site?.goals?.socialSharesPerDay || 0);
  if (explicit > 0) return explicit;
  const cadence = String(site?.goals?.automationCadence || '').toLowerCase();
  const hours = cadence.match(/every\s+(\d+)\s+hours?/);
  if (hours && Number(hours[1]) > 0) return Math.max(1, Math.round(24 / Number(hours[1])));
  return Math.max(1, Math.round(Number(site?.goals?.weeklyPublishedPosts || 7) / 7));
}

function plainWpTitle(value, fallback) {
  return String(value || fallback || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#8217;/g, '’').replace(/&quot;/g, '"').trim();
}

async function wordpressPublishedInventory(site) {
  const apiBase = String(site.wpApiBase || `${String(site.siteUrl).replace(/\/$/, '')}/wp-json/wp/v2`).replace(/\/$/, '');
  const firstUrl = `${apiBase}/posts?status=publish&per_page=100&page=1&_fields=id,link,title,featured_media`;
  const firstResponse = await fetch(firstUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (!firstResponse.ok) throw new Error(`WordPress returned ${firstResponse.status}`);
  const first = await firstResponse.json();
  const published = Math.max(first.length, Number(firstResponse.headers.get('x-wp-total') || first.length));
  const totalPages = Math.max(1, Math.min(200, Number(firstResponse.headers.get('x-wp-totalpages') || 1)));
  const pages = [first];
  for (let start = 2; start <= totalPages; start += 8) {
    const batch = Array.from({ length: Math.min(8, totalPages - start + 1) }, (_, index) => start + index);
    pages.push(...await Promise.all(batch.map(async (page) => {
      const response = await fetch(`${apiBase}/posts?status=publish&per_page=100&page=${page}&_fields=id,link,title,featured_media`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`WordPress page ${page} returned ${response.status}`);
      return response.json();
    })));
  }
  const posts = pages.flat();
  const missingFeatured = posts.filter((post) => !Number(post.featured_media)).map((post) => ({ id: post.id, link: post.link, title: plainWpTitle(post.title?.rendered, `Post ${post.id}`) }));
  const shareReady = posts.length - missingFeatured.length;
  const sharesPerDay = publishingPace(site);
  const targetWindowDays = Math.max(1, Number(site?.goals?.socialTargetWindowDays || PUBLISHING_TARGET_WINDOW_DAYS));
  const targetShares = Math.max(0, sharesPerDay * targetWindowDays);
  const recommendedSharesPerDay = sharesPerDay > 0
    ? Math.max(1, Math.min(sharesPerDay, Math.floor(shareReady / targetWindowDays)))
    : 0;
  return {
    id: site.id,
    name: site.name,
    siteUrl: site.siteUrl,
    imageDeskUrl: site.imageDeskUrl || `${String(site.siteUrl).replace(/\/$/, '')}/wp-admin/edit.php?page=creator-needs-images`,
    published,
    shareReady,
    needsFeatured: missingFeatured.length,
    missingFeatured,
    sharesPerDay,
    targetWindowDays,
    targetShares,
    recommendedSharesPerDay,
    runwayDays: sharesPerDay > 0 ? Math.floor(shareReady / sharesPerDay) : null,
  };
}

async function buildPublishingInventory() {
  if (publishingInventoryCache.value && Date.now() - publishingInventoryCache.checkedAt < 5 * 60_000) return publishingInventoryCache.value;
  const configured = await readJson(weeklyGoalsFile).catch(() => ({ sites: [] }));
  const defaults = defaultPublishingSites();
  const byId = new Map(defaults.map((site) => [site.id, site]));
  for (const site of configured.sites || []) byId.set(site.id, { ...(byId.get(site.id) || {}), ...site, goals: { ...(byId.get(site.id)?.goals || {}), ...(site.goals || {}) } });
  const sites = await Promise.all([...byId.values()].map(async (site) => {
    try { return await wordpressPublishedInventory(site); }
    catch (error) { return { id: site.id, name: site.name, siteUrl: site.siteUrl, imageDeskUrl: site.imageDeskUrl, error: error.message }; }
  }));
  const mediaSites = await wordpressMediaSources();
  const priority = wordpressMediaPrioritySummary(sites, mediaSites, { pollMinutes: 45, batchSize: 3 });
  const value = { updatedAt: new Date().toISOString(), sites, priority };
  publishingInventoryCache = { checkedAt: Date.now(), value };
  return value;
}

async function buildWordpressMediaPriorityLane(perPage = 6) {
  const inventory = await buildPublishingInventory();
  const mediaSites = await wordpressMediaSources();
  const priority = wordpressMediaPrioritySummary(inventory.sites, mediaSites, { pollMinutes: 45, batchSize: 3 });
  const candidates = priority.ranked.slice(0, 4);
  const limit = Math.max(1, Math.min(10, Number(perPage || priority.batchSize || 3)));
  for (const candidate of candidates) {
    const site = wordpressMediaSite(candidate.id);
    if (!site) continue;
    try {
      const queue = wordpressMediaPayloadWithSiteBrand(
        await wordpressMediaRequest(site, `/image-production/jobs?per_page=${limit}`),
        site,
      );
      if (!Array.isArray(queue?.items) || queue.items.length === 0) continue;
      return {
        ok: true,
        updatedAt: new Date().toISOString(),
        policy: priority.policy,
        pollMinutes: priority.pollMinutes,
        batchSize: priority.batchSize,
        selected: candidate,
        ranked: priority.ranked,
        queue,
        source: { id: site.id, name: site.name, siteUrl: site.siteUrl, imageDeskUrl: site.imageDeskUrl, logoUrl: site.logoUrl },
      };
    } catch (error) {
      candidate.queueError = String(error.message || error);
    }
  }
  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    policy: priority.policy,
    pollMinutes: priority.pollMinutes,
    batchSize: priority.batchSize,
    selected: null,
    ranked: priority.ranked,
    queue: { count: 0, items: [] },
  };
}

function normalizeTagTargets(value) {
  return (Array.isArray(value) ? value : []).slice(0, 50).map((target) => ({
    name: String(target?.name || '').trim().slice(0, 160),
    url: canonicalFacebookUrl(target?.url || ''),
    reason: String(target?.reason || '').trim().slice(0, 300),
    lastPostAt: String(target?.lastPostAt || '').trim().slice(0, 80),
    lastPostUrl: canonicalFacebookUrl(target?.lastPostUrl || ''),
    pinned: target?.pinned === true,
  })).filter((target) => target.name && target.url);
}

function requiresStoryCompanion(item = {}) {
  return item?.storyMode !== 'disabled'
    && String(item.source || '') !== 'audience-insight:posting-gap'
    && !isCreatorTipCoverCollectionDraft(item);
}

function requiresGeneratedMedia(item = {}) {
  const campaignKind = String(item?.campaign?.kind || '');
  return isCreatorTipItem(item)
    || campaignKind === 'creator-greeting'
    || (campaignKind === 'ai-nightly' && item?.campaign?.visualTestVariant !== 'text-only');
}

function postingGapAccountabilityBody(targets = 0) {
  const opener = targets >= 20
    ? 'Creators, this is your accountability check.'
    : 'Creators, this is your two-day nudge.';
  return `${opener}\n\nI am watching who keeps showing up and who disappears. Some of the creators tagged here have not posted in a while. Others have already crossed the two-day quiet mark. If you want attention, momentum, and reach, you cannot vanish every time the algorithm gets moody.\n\nIf you are tagged, post something today and drop your newest post in the comments so we can see you are still active. Show your work. Teach something. Say what you are building. Accountability goes both ways — I am watching you, and you should be watching me too.\n\n#CreatorsListenUp #DigitalCreators #ContentCreators #CreatorAccountability`;
}

function rebuildCtaTargets(item, audience, limit = 12) {
  const people = Array.isArray(audience?.people) ? audience.people : [];
  const manualTargets = normalizeTagTargets(item.tagTargets).filter((target) => target.pinned === true);
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const eligible = people.filter((person) => {
    const observation = person.profileObservation || {};
    const lastPostTime = Date.parse(observation.lastPostAt || '');
    const category = String(observation.publicFacts?.category || '').toLowerCase();
    const creatorSignals = Array.isArray(observation.creatorSignals) ? observation.creatorSignals : [];
    const creator = category.includes('creator') || category.includes('author') || creatorSignals.length > 0;
    const blocked = engagementTargetBlocked(person);
    const pinnedOnly = observation.pinnedPostVisible === true && (observation.latestVisiblePost?.pinned === true || (Number(observation.visiblePostCount || 0) <= 1 && !(observation.pinnedPosts || []).length));
    const trustedActivity = person.activityObserverRevision === 'multi-post-v4-shared-post-safe';
    return person.name && canonicalFacebookUrl(person.url || '') && Number.isFinite(lastPostTime) && lastPostTime <= cutoff && creator && !blocked && !pinnedOnly && trustedActivity;
  }).sort((left, right) => Date.parse(left.profileObservation.lastPostAt) - Date.parse(right.profileObservation.lastPostAt));
  const seen = new Set(manualTargets.map((target) => target.url));
  const scannedTargets = eligible.map((person) => {
    const observation = person.profileObservation;
    const url = canonicalFacebookUrl(person.url);
    if (seen.has(url)) return null;
    seen.add(url);
    return {
      name: person.name,
      url,
      reason: `Exact linked creator with no fresh visible post inside the last two days. Use this as an accountability tag, not a claim that they quit.`,
      lastPostAt: observation.latestVisiblePost?.displayDate || observation.lastPostAt,
      lastPostUrl: observation.latestVisiblePost?.url || observation.lastPostUrl || '',
    };
  }).filter(Boolean);
  return normalizeTagTargets([...manualTargets, ...scannedTargets].slice(0, limit));
}

function rebuildPinnedPostCtaTargets(item, audience, limit = 12) {
  const people = Array.isArray(audience?.people) ? audience.people : [];
  const manualTargets = normalizeTagTargets(item.tagTargets).filter((target) => target.pinned === true);
  const eligible = people.filter((person) => {
    const observation = person.profileObservation || {};
    const category = String(observation.publicFacts?.category || '').toLowerCase();
    const creator = category === 'digital creator';
    const blocked = ['removed', 'blocked-minor'].includes(person.decision) || person.profileState === 'minor-blocked';
    return person.name && canonicalFacebookUrl(person.url || '') && creator && !blocked
      && person.activityObserverRevision === 'multi-post-v4-shared-post-safe'
      && observation.accessible === true
      && observation.pinnedPostVisible !== true;
  }).sort((left, right) => {
    const leftFollowers = Number(left.profileObservation?.socialCounts?.followers || 0);
    const rightFollowers = Number(right.profileObservation?.socialCounts?.followers || 0);
    return rightFollowers - leftFollowers || String(left.name).localeCompare(String(right.name));
  });
  const seen = new Set(manualTargets.map((target) => target.url));
  const scannedTargets = eligible.map((person) => {
    const url = canonicalFacebookUrl(person.url);
    if (seen.has(url)) return null;
    seen.add(url);
    return {
      name: person.name,
      url,
      reason: 'Trusted public scan captured a creator signal but no pinned-post label. Invite them to share or create a profile-introduction pin; do not claim they definitively have none.',
      lastPostAt: person.profileObservation?.latestVisiblePost?.displayDate || person.profileObservation?.lastPostAt || '',
      lastPostUrl: person.profileObservation?.latestVisiblePost?.url || '',
    };
  }).filter(Boolean);
  return normalizeTagTargets([...manualTargets, ...scannedTargets].slice(0, limit));
}

async function ensurePinnedPostCta() {
  const queue = await readJson(queueFile);
  if (queue.items.some((item) => item.source === 'audience-insight:missing-pinned-post')) return;
  const audience = await readJson(audienceFile);
  const item = {
    id: randomUUID(),
    title: 'Creators, your pinned post is your storefront',
    body: 'Digital creators: your pinned post is your storefront. When someone visits your profile, can they immediately tell who you are, what you create, and why they should follow you?\n\nPin one strong post that introduces you, showcases your best work, or points people to what matters most right now. If you already have one, make sure it still represents the creator you are today.\n\nIf you are tagged, share what you plan to pin—or drop your current pinned post so other creators can learn from it.\n\n— Matthew Murphy\n\n#CreatorsListenUp #DigitalCreators #ContentCreators',
    target: 'matthew-page',
    format: 'feed',
    status: 'draft',
    scheduledFor: null,
    source: 'audience-insight:missing-pinned-post',
    notes: 'Rebuildable CTA using trusted public creator scans where no pinned-post label was observed. Wording must remain invitational because absence is not definitive proof.',
    media: [],
    createdAt: new Date().toISOString(),
    tagTargets: [],
  };
  item.tagTargets = rebuildPinnedPostCtaTargets(item, audience, 12);
  item.ctaRebuild = { rebuiltAt: item.createdAt, selectedTargets: item.tagTargets.length, sourcePeople: Array.isArray(audience.people) ? audience.people.length : 0, refreshState: 'latest-local' };
  queue.items.unshift(item);
  await writeJson(queueFile, queue);
}

async function ensureDailyDiscussions() {
  const queue = await readJson(queueFile);
  const templates = [
    ['Planning can become procrastination', 'A plan is useful until planning becomes the reason nothing ships. What is one thing you are actually finishing before the new week starts?'],
    ['Consistency still has to earn attention', 'Posting more often is not growth if your audience cannot tell why the next post matters. Would you fix the hook, the topic, or the reason people should respond first?'],
    ['Busy is not the same as profitable', 'Some business owners defend a packed calendar that barely pays them. Would you rather serve fewer high-value customers or stay busy all week at thin margins?'],
    ['Automation still needs judgment', 'AI and automation should eliminate repetitive work, but using them to eliminate judgment is asking for trouble. What would you never hand over completely?'],
    ['Reach is not revenue', 'A post can reach thousands and still make nothing. What matters more for a creator trying to monetize: bigger reach, the right audience, or a clearer offer?'],
    ['Followers do not equal community', 'A quiet 25,000 followers can be worth less than 5,000 people who actually respond. True, false, or just an excuse for weak content?'],
    ['Personality can beat polish', 'A perfectly polished post can still feel lifeless. Would you rather follow someone who is flawless or someone who is funny, useful, and unmistakably themselves?'],
  ];
  const now = new Date();
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(now.getTime() + offset * 86400000);
    date.setHours(18, 30, 0, 0);
    const key = localDateKey(date);
    let discussion = queue.items.find((item) => item.source === `daily-debate:${key}`);
    const themeDate = discussion?.scheduledFor ? new Date(discussion.scheduledFor) : date;
    const theme = themeForDate(themeDate);
    const [title, unsignedBody] = templates[themeDate.getDay()];
    const body = `${unsignedBody}\n\n— Matthew Murphy`;
    if (!discussion) {
      discussion = { id: randomUUID(), title, body, target: 'matthew-page', format: 'discussion', status: 'draft', scheduledFor: date.toISOString(), source: `daily-debate:${key}`, notes: `Daily ${theme.label} discussion slot. Review before dispatch.`, media: [], createdAt: new Date().toISOString(), dailyTheme: { key: theme.key, label: theme.label } };
      queue.items.push(discussion);
    } else if (discussion.status === 'draft' && discussion.dailyTheme?.key !== theme.key) {
      discussion.title = title;
      discussion.body = body;
      discussion.notes = `Daily ${theme.label} discussion slot. Review before dispatch.`;
      discussion.dailyTheme = { key: theme.key, label: theme.label };
      discussion.updatedAt = new Date().toISOString();
    }
  }
  await writeJson(queueFile, queue);
}

async function ensureDailyStories() {
  const queue = await readJson(queueFile);
  const discussions = queue.items.filter((item) => item.source?.startsWith('daily-debate:'));
  for (const discussion of discussions) {
    const key = discussion.source.split(':')[1];
    let story = queue.items.find((item) => item.source === `daily-story:${key}`);
    if (!story) {
      const scheduled = new Date(discussion.scheduledFor);
      scheduled.setHours(scheduled.getHours() + 2);
      story = { id: randomUUID(), parentId: discussion.id, title: `${discussion.title} - Story`, body: discussion.body, target: discussion.target, format: 'story', status: 'draft', scheduledFor: scheduled.toISOString(), source: `daily-story:${key}`, notes: 'Original vertical companion. Posts only after the parent feed post is dispatched or published.', media: [], createdAt: new Date().toISOString(), dailyTheme: discussion.dailyTheme || null };
      queue.items.push(story);
    } else if (discussion.dailyTheme && story.status === 'draft' && story.dailyTheme?.key !== discussion.dailyTheme.key) {
      story.title = `${discussion.title} - Story`;
      story.body = discussion.body;
      story.notes = 'Original vertical companion. Posts only after the parent feed post is dispatched or published.';
      story.dailyTheme = discussion.dailyTheme;
      story.updatedAt = new Date().toISOString();
    }
    story.parentId = discussion.id;
    const storyMedia = (discussion.media || []).filter((media) => media.role === 'story');
    if (storyMedia.length) {
      const existingPaths = new Set((story.media || []).map((media) => media.path || media.url));
      story.media = [...(story.media || []), ...storyMedia.filter((media) => !existingPaths.has(media.path || media.url))];
      discussion.media = (discussion.media || []).filter((media) => media.role !== 'story');
    }
    const feedMedia = (story.media || []).filter((media) => media.role === 'feed');
    if (feedMedia.length) {
      const existingPaths = new Set((discussion.media || []).map((media) => media.path || media.url));
      discussion.media = [...(discussion.media || []), ...feedMedia.filter((media) => !existingPaths.has(media.path || media.url))];
      story.media = (story.media || []).filter((media) => media.role !== 'feed');
    }
  }
  await writeJson(queueFile, queue);
}

function nextPersonalSchedule(queue, now = new Date()) {
  const occupied = (queue.items || [])
    .filter((item) => item.scheduledFor && item.status !== 'rejected')
    .map((item) => new Date(item.scheduledFor).valueOf())
    .filter(Number.isFinite);
  const slots = [[10, 30], [14, 0], [18, 30], [21, 0]];
  for (let day = 0; day < 15; day += 1) {
    for (const [hour, minute] of slots) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + day);
      candidate.setHours(hour, minute, 0, 0);
      if (candidate <= new Date(now.valueOf() + 30 * 60_000)) continue;
      if (occupied.every((time) => Math.abs(time - candidate.valueOf()) >= 90 * 60_000)) return candidate.toISOString();
    }
  }
  return new Date(now.valueOf() + 2 * 60 * 60_000).toISOString();
}

function appendMatthewSignature(body) {
  const copy = repairMojibake(body).trim();
  return /(?:—|-)\s*Matthew Murphy(?:\s|$)/i.test(copy) ? copy : `${copy}\n\n— Matthew Murphy`;
}

function contentBankScheduleSlots(queue, scheduledLedger, count, now = new Date()) {
  const allScheduled = [...(queue.items || []), ...(scheduledLedger.items || [])]
    .filter((entry) => entry.status !== 'rejected' && entry.scheduledFor)
    .map((entry) => new Date(entry.scheduledFor))
    .filter((entry) => Number.isFinite(entry.valueOf()));
  const slots = [];
  for (let dayOffset = 1; dayOffset <= 14 && slots.length < count; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);
    const dayKey = localDateKey(day);
    const existingForDay = allScheduled.filter((entry) => localDateKey(entry) === dayKey).length;
    let remainingCapacity = Math.max(0, 30 - existingForDay);
    for (let index = 0; index < 30 && slots.length < count && remainingCapacity > 0; index += 1) {
      const minutes = Math.round((7 * 60 + ((21 * 60 + 30) - 7 * 60) * (index / 29)) / 5) * 5;
      const candidate = new Date(day);
      candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (candidate <= new Date(now.valueOf() + 30 * 60_000)) continue;
      if (allScheduled.some((entry) => Math.abs(entry.valueOf() - candidate.valueOf()) < 10 * 60_000)) continue;
      slots.push(candidate.toISOString());
      allScheduled.push(candidate);
      remainingCapacity -= 1;
    }
  }
  return slots;
}

function buildUserContentBankDrafts(queue, scheduledLedger, { limit = 60, now = new Date() } = {}) {
  const safeLimit = Math.min(120, Math.max(1, Number(limit) || 60));
  const existingSources = new Set((queue.items || []).map((entry) => String(entry.source || '')));
  const existingBodies = new Set((queue.items || []).map((entry) => repairMojibake(entry.body).replace(/\s+/g, ' ').trim().toLocaleLowerCase()).filter(Boolean));
  const candidates = USER_CONTENT_BANK.items.filter((entry) => {
    if (entry.lane !== 'ready') return false;
    if (existingSources.has(`user-content-bank:${USER_CONTENT_BANK.id}:${entry.id}`)) return false;
    return !existingBodies.has(repairMojibake(entry.body).replace(/\s+/g, ' ').trim().toLocaleLowerCase());
  }).slice(0, safeLimit);
  const slots = contentBankScheduleSlots(queue, scheduledLedger, candidates.length, now);
  const created = [];
  for (let index = 0; index < Math.min(candidates.length, slots.length); index += 1) {
    const entry = candidates[index];
    const item = {
      id: randomUUID(),
      title: entry.title,
      body: appendMatthewSignature(entry.body),
      target: 'matthew-page',
      format: 'feed',
      status: 'draft',
      scheduledFor: slots[index],
      source: `user-content-bank:${USER_CONTENT_BANK.id}:${entry.id}`,
      notes: `User-supplied content bank. Original lane: ${entry.lane}.${entry.notes ? ` ${entry.notes}` : ''} Review in Social Desk before using Approve & schedule.`,
      tagTargets: [],
      media: [],
      contentBank: { bankId: USER_CONTENT_BANK.id, itemId: entry.id, lane: entry.lane },
      createdAt: now.toISOString(),
    };
    queue.items.unshift(item);
    created.push(item);
  }
  return created;
}

function trendDraftBody(trend) {
  const hashtag = trend.hashtag;
  const sourceTypes = new Set(trend.sourceTypes || []);
  const lead = sourceTypes.has('facebook-trending')
    ? `Facebook's Professional Dashboard is surfacing ${hashtag} as a trending signal right now.`
    : sourceTypes.has('dashboard-inspiration')
      ? `Facebook's Professional Dashboard is surfacing ${hashtag} in its creator inspiration.`
      : `My Professional Dashboard showed ${hashtag} beside visible content-performance data.`;
  return `${lead}\n\nI do not believe in forcing a trend onto content where it does not belong. The better question is: how could this fit what you already create—and would your audience actually care?\n\nIf you use this hashtag, tell me what you are posting with it and whether it is bringing real views, comments, or followers.\n\n— Matthew Murphy\n\n${[hashtag, '#CreatorsListenUp', '#ContentCreators'].filter((tag, index, all) => all.indexOf(tag) === index).join(' ')}`;
}

function buildProfessionalTrendDrafts(ledger, queue, { limit = 3, now = new Date() } = {}) {
  const dayKey = now.toISOString().slice(0, 10);
  const current = currentProfessionalTrends(ledger, now);
  const created = [];
  for (const trend of current) {
    if (created.length >= limit) break;
    const slug = trend.hashtag.slice(1).toLocaleLowerCase();
    const source = `professional-trend:${slug}:${dayKey}`;
    if ((queue.items || []).some((item) => item.source === source)) continue;
    const scheduledFor = nextPersonalSchedule(queue, now);
    const item = {
      id: randomUUID(),
      title: `Creator trend check: ${trend.hashtag}`,
      body: trendDraftBody(trend),
      target: 'matthew-page',
      format: 'feed',
      status: 'draft',
      scheduledFor,
      source,
      notes: `Review-only draft based on a visible Professional Dashboard ${trend.latest?.sourceType || 'signal'} captured ${trend.lastSeenAt || ledger.updatedAt || 'recently'}. The wording distinguishes Facebook-labeled trends from your own performance evidence.`,
      trendInfo: {
        hashtag: trend.hashtag,
        sourceTypes: trend.sourceTypes || [],
        context: String(trend.latest?.context || '').slice(0, 700),
        capturedAt: trend.lastSeenAt || ledger.updatedAt || null,
      },
      tagTargets: [],
      media: [],
      createdAt: now.toISOString(),
    };
    queue.items.unshift(item);
    created.push(item);
  }
  return { created, considered: current.length };
}

function storyCompanionFor(queue, item) {
  if (item.format === 'story') return item;
  const sourceKey = String(item.source || '').startsWith('daily-debate:') ? String(item.source).split(':')[1] : '';
  const conceptKey = reviewConceptKey(item);
  return queue.items.find((entry) => entry.format === 'story' && (
    entry.parentId === item.id ||
    (sourceKey && entry.source === `daily-story:${sourceKey}`) ||
    (entry.target === item.target && reviewConceptKey(entry) === conceptKey)
  )) || null;
}

function parentPostFor(queue, item) {
  if (item.format !== 'story') return item;
  const sourceKey = String(item.source || '').startsWith('daily-story:') ? String(item.source).split(':')[1] : '';
  return queue.items.find((entry) => entry.id === item.parentId || (sourceKey && entry.source === `daily-debate:${sourceKey}`)) || null;
}

const IMAGE_STYLE_FAMILIES = [
  {
    key: 'retro-suburban-cartoon',
    feed: 'Style family cue: original retro suburban satire with chunky outlines, playful household chaos, expressive faces, bold primary-color blocking, and the comedic rhythm of a long-running middle-America animated family show. Keep it wholly original and never resemble any existing TV family or trademarked cartoon cast.',
    story: 'Style family cue: original retro suburban satire for Story with playful household chaos, chunky outlines, bold primary-color blocking, expressive faces, and wholly original character design. Do not resemble any existing TV family or trademarked cartoon cast.',
  },
  {
    key: 'cut-paper-satire',
    feed: 'Style family cue: irreverent cut-paper satire with simplified layered shapes, flat graphic depth, bold silhouette staging, deadpan absurdity, and crude small-town chaos. Keep it wholly original and never resemble any existing cutout-cartoon series.',
    story: 'Style family cue: irreverent cut-paper satire for Story with flat layered shapes, bold silhouette staging, deadpan absurdity, and wholly original small-town chaos. Do not resemble any existing cutout-cartoon series.',
  },
  {
    key: 'slacker-alt-cartoon',
    feed: 'Style family cue: original slacker alt-cartoon poster energy with rough-edged linework, slightly grimy suburban realism, awkward confidence, sarcastic humor, and hand-drawn 90s counterculture attitude. Keep it wholly original and never resemble any specific slacker-cartoon duo or episode still.',
    story: 'Style family cue: original slacker alt-cartoon Story energy with rough-edged linework, awkward confidence, sarcastic humor, and hand-drawn 90s counterculture attitude. Do not resemble any specific slacker-cartoon duo or episode still.',
  },
  {
    key: 'cozy-neighborhood-strip',
    feed: 'Style family cue: original cozy neighborhood newspaper-strip warmth with clean mid-century cartoon charm, gentle melancholy, simple staging, autumnal or pastel palettes, and sincere humor. Keep it wholly original and never resemble any copyrighted strip characters or layouts.',
    story: 'Style family cue: original cozy neighborhood newspaper-strip warmth for Story with clean mid-century cartoon charm, simple staging, sincere humor, and wholly original character design. Do not resemble any copyrighted strip characters or layouts.',
  },
  {
    key: 'childlike-panel-strip',
    feed: 'Style family cue: original single-panel family-cartoon simplicity with rounded linework, clean suburban innocence, exaggerated everyday observations, and a deceptively sweet look wrapping a sharp point. Keep it wholly original and never resemble any copyrighted family-panel strip characters.',
    story: 'Style family cue: original single-panel family-cartoon simplicity for Story with rounded linework, suburban innocence, and a sharp everyday joke. Do not resemble any copyrighted family-panel strip characters.',
  },
  {
    key: 'office-family-strip',
    feed: 'Style family cue: original classic newspaper-strip domestic comedy with polished ink lines, tidy kitchen-and-living-room staging, relationship banter, and warm old-school comic timing. Keep it wholly original and never resemble any copyrighted legacy strip cast or layouts.',
    story: 'Style family cue: original classic domestic newspaper-strip comedy for Story with polished ink lines, relationship banter, and warm old-school comic timing. Do not resemble any copyrighted legacy strip cast or layouts.',
  },
  {
    key: 'cat-sarcasm-strip',
    feed: 'Style family cue: original cynical pet-strip humor with chunky expressive shapes, lazy sarcasm, simple room staging, warm comic-strip color, and a smug punchline energy. Keep it wholly original and never resemble any copyrighted cat-strip character or layout.',
    story: 'Style family cue: original cynical pet-strip humor for Story with chunky expressive shapes, lazy sarcasm, and a smug punchline energy. Do not resemble any copyrighted cat-strip character or layout.',
  },
  {
    key: 'military-strip-satire',
    feed: 'Style family cue: original barracks-and-office comic-strip satire with brisk linework, regimented staging, mischievous troublemaker energy, and old-school newspaper gag timing. Keep it wholly original and never resemble any copyrighted military-strip characters or scenes.',
    story: 'Style family cue: original barracks-and-office comic-strip satire for Story with brisk linework, mischievous energy, and old-school gag timing. Do not resemble any copyrighted military-strip characters or scenes.',
  },
  {
    key: 'storybook-whimsy',
    feed: 'Style family cue: original whimsical storybook comic energy with hand-inked charm, playful imagination, outdoorsy warmth, sketchbook motion, and reflective humor. Keep it wholly original and never resemble any copyrighted child-and-animal duo or strip panels.',
    story: 'Style family cue: original whimsical storybook comic energy for Story with hand-inked charm, playful imagination, and reflective humor. Do not resemble any copyrighted child-and-animal duo or strip panels.',
  },
  {
    key: 'noir-vigilante-comic',
    feed: 'Style family cue: original noir vigilante comic-poster energy with heavy shadows, moody urban skylines, dramatic cape-like motion, rain-soaked lighting, and brooding confidence. Use broad pulp-comic traditions only and never reproduce any trademarked vigilante, suit, symbol, or publisher look.',
    story: 'Style family cue: original noir vigilante comic Story energy with heavy shadows, moody urban skylines, dramatic motion, and brooding confidence. Use broad pulp-comic traditions only and never reproduce any trademarked vigilante, suit, symbol, or publisher look.',
  },
  {
    key: 'bright-hero-comic',
    feed: 'Style family cue: original bright heroic comic-poster energy with bold anatomy, clean optimism, powerful stance, high-contrast skies, and larger-than-life confidence. Use broad comic traditions only and never reproduce any trademarked hero, suit, logo, or publisher look.',
    story: 'Style family cue: original bright heroic comic Story energy with bold anatomy, clean optimism, powerful stance, and larger-than-life confidence. Use broad comic traditions only and never reproduce any trademarked hero, suit, logo, or publisher look.',
  },
  {
    key: 'kinetic-urban-web-comic',
    feed: 'Style family cue: original kinetic urban action-comic energy with agile body language, dynamic foreshortening, city-motion perspective, graphic impact bursts, and fast-talking wit. Use broad comic traditions only and never reproduce any trademarked wall-crawler, costume, symbol, or publisher look.',
    story: 'Style family cue: original kinetic urban action-comic Story energy with agile body language, dynamic foreshortening, city-motion perspective, and fast-talking wit. Use broad comic traditions only and never reproduce any trademarked wall-crawler, costume, symbol, or publisher look.',
  },
];

function creatorTipStyleKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
}

function normalizeCreatorTipStyleConfig(value = {}) {
  const seen = new Set(CREATOR_TIP_ART_FAMILIES.map((family) => family.key));
  const customStyles = [];
  for (const input of Array.isArray(value.customStyles) ? value.customStyles : []) {
    const key = creatorTipStyleKey(input?.key);
    const label = String(input?.label || '').trim().slice(0, 80);
    const direction = String(input?.direction || '').trim().replace(/\s+/g, ' ').slice(0, 800);
    if (!key || !label || direction.length < 20 || seen.has(key)) continue;
    seen.add(key);
    customStyles.push({ key, label, direction, createdAt: input.createdAt || null });
  }
  const dateOverrides = {};
  for (const [date, key] of Object.entries(value.dateOverrides || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && seen.has(String(key))) dateOverrides[date] = String(key);
  }
  return {
    version: 1,
    updatedAt: value.updatedAt || null,
    customStyles: customStyles.slice(0, 60),
    dateOverrides,
  };
}

function creatorTipStyleFamilies() {
  const custom = creatorTipStyleConfig.customStyles
    .map((style) => creatorTipArtFamilyFromDirection(style))
    .filter(Boolean);
  return [...CREATOR_TIP_ART_FAMILIES, ...custom];
}

function creatorTipStyleForItem(itemOrTipNumber) {
  return creatorTipArtStyle(itemOrTipNumber, {
    families: creatorTipStyleFamilies(),
    dateOverrides: creatorTipStyleConfig.dateOverrides,
  });
}

function creatorTipStyleLibraryPayload(extra = {}) {
  const customKeys = new Set(creatorTipStyleConfig.customStyles.map((style) => style.key));
  const directionByKey = new Map(creatorTipStyleConfig.customStyles.map((style) => [style.key, style.direction]));
  return {
    updatedAt: creatorTipStyleConfig.updatedAt,
    families: creatorTipStyleFamilies().map((family) => ({
      key: family.key,
      label: family.label,
      custom: customKeys.has(family.key),
      direction: directionByKey.get(family.key) || String(family.feed || '').replace(/^.*private visual direction:\s*/i, '').split('. Make the medium')[0],
    })),
    dateOverrides: { ...creatorTipStyleConfig.dateOverrides },
    ...extra,
  };
}

async function saveCreatorTipStyleConfig(nextConfig) {
  const normalized = normalizeCreatorTipStyleConfig({ ...nextConfig, updatedAt: new Date().toISOString() });
  await writeJson(creatorTipArtStylesFile, normalized);
  creatorTipStyleConfig = normalizeCreatorTipStyleConfig(await readJson(creatorTipArtStylesFile));
  return creatorTipStyleConfig;
}

async function assignCreatorTipStyleToDate(publishDate, styleKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) throw new Error('Choose an exact Daily Series date.');
  const family = creatorTipStyleFamilies().find((entry) => entry.key === styleKey);
  if (!family) throw new Error('Choose a style from the current library.');
  await saveCreatorTipStyleConfig({
    ...creatorTipStyleConfig,
    dateOverrides: { ...creatorTipStyleConfig.dateOverrides, [publishDate]: styleKey },
  });
  const queue = await readJson(queueFile);
  let updatedDrafts = 0;
  for (const item of queue.items || []) {
    if (!isCreatorTipItem(item) || ['published', 'removed', 'rejected'].includes(item.status)) continue;
    const baseStyle = creatorTipArtStyle(item, { families: creatorTipStyleFamilies() });
    if (baseStyle?.publishDate !== publishDate) continue;
    const selected = creatorTipStyleForItem(item);
    item.mediaVariant = {
      ...(item.mediaVariant || {}),
      styleKey: selected.key,
      styleLabel: selected.label,
      publishDate,
    };
    item.artworkDay = {
      ...(item.artworkDay || {}),
      key: selected.key,
      label: selected.label,
      publishDate,
      rotationIndex: selected.rotationIndex,
    };
    item.updatedAt = new Date().toISOString();
    updatedDrafts += 1;
  }
  if (updatedDrafts) await writeJson(queueFile, queue);
  return { family, updatedDrafts };
}

function stableImageStyleFamily(item = {}) {
  const seed = `${item.id || ''}|${item.title || ''}|${item.source || ''}`;
  let total = 0;
  for (const char of seed) total = (total * 33 + char.charCodeAt(0)) >>> 0;
  return IMAGE_STYLE_FAMILIES[total % IMAGE_STYLE_FAMILIES.length];
}

function imageStyleFamilyForItem(item = {}) {
  return isCreatorTipItem(item) ? creatorTipStyleForItem(item) : stableImageStyleFamily(item);
}

function creatorTipArtPromptOverride(item = {}, role = 'feed') {
  if (!isCreatorTipItem(item)) return '';
  const tipNumber = creatorTipNumberFromItem(item);
  const displayIdentity = creatorTipDisplayIdentity(item);
  const style = creatorTipStyleForItem(item);
  const roleCue = role === 'story' ? style.story : style.feed;
  return [
    '',
    'ARTWORK BY PUBLISH DAY OVERRIDE (AUTHORITATIVE):',
    `This live Media card is ${displayIdentity.toLocaleUpperCase()}, scheduled for ${style.publishDate} in the fixed sequence.`,
    `Its internal global scheduling number is ${tipNumber}; do not print that internal number when the category identity differs.`,
    `Use the ${style.label} day direction for every post on that publish date.`,
    roleCue,
    `If any earlier saved instruction names a different tip number or style family, ignore it. The visible badge must say exactly "${displayIdentity.toLocaleUpperCase()}".`,
    'Keep the work wholly original: do not include or imitate copyrighted characters, costumes, logos, publisher marks, or recognizable franchise layouts.',
    'Matthew Murphy is the only recognizable branded person. Keep both arms clean and untattooed.',
    'The handwritten signature must read exactly "Matthew Murphy" with a clearly visible space between the two words.',
  ].join('\n');
}

function queueItemWithArtworkDay(item = {}) {
  if (!isCreatorTipItem(item)) return item;
  const style = creatorTipStyleForItem(item);
  if (!style) return item;
  return {
    ...item,
    intendedScheduledFor: item.intendedScheduledFor || style.scheduledFor,
    artworkDay: {
      key: style.key,
      label: style.label,
      publishDate: style.publishDate,
      rotationIndex: style.rotationIndex,
    },
  };
}

function syncPendingCreatorTipArtworkDays(queue = {}) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const producedStylesByDate = new Map();
  for (const item of items) {
    if (!isCreatorTipItem(item) || item?.format === 'story') continue;
    if (!item?.mediaApproval?.hiddenAt && !(Array.isArray(item?.media) && item.media.length > 0)) continue;
    const style = creatorTipStyleForItem(item);
    if (style?.publishDate && !producedStylesByDate.has(style.publishDate)) producedStylesByDate.set(style.publishDate, style);
  }
  let changed = false;
  for (const item of items) {
    if (!isCreatorTipItem(item) || item?.format === 'story') continue;
    if (item?.mediaApproval?.hiddenAt || (Array.isArray(item?.media) && item.media.length > 0)) continue;
    const scheduledStyle = creatorTipStyleForItem({ ...item, mediaVariant: null, artworkDay: null });
    const style = producedStylesByDate.get(scheduledStyle?.publishDate) || scheduledStyle;
    if (!style) continue;
    const artworkDay = {
      key: style.key,
      label: style.label,
      publishDate: style.publishDate,
      rotationIndex: style.rotationIndex,
    };
    const mediaVariant = {
      ...(item.mediaVariant || {}),
      styleKey: style.key,
      styleLabel: style.label,
      publishDate: style.publishDate,
      private: true,
    };
    if (JSON.stringify(item.artworkDay || null) !== JSON.stringify(artworkDay)) {
      item.artworkDay = artworkDay;
      changed = true;
    }
    if (JSON.stringify(item.mediaVariant || null) !== JSON.stringify(mediaVariant)) {
      item.mediaVariant = mediaVariant;
      changed = true;
    }
  }
  return changed;
}

function isDailySetCoverMedia(media = {}) {
  return /daily-set-cover/i.test(String(media.filename || ''));
}

function creatorTipIssueSchedule(queue = {}, publishDate = '') {
  const issueItems = (queue.items || []).filter((item) => item.format !== 'story' && isCreatorTipItem(item))
    .filter((item) => imageStyleFamilyForItem(item)?.publishDate === publishDate);
  const issueTimes = issueItems.map((item) => Date.parse(item.intendedScheduledFor || item.scheduledFor || 0)).filter(Number.isFinite);
  if (!issueTimes.length) return null;
  const firstPostTime = Math.min(...issueTimes);
  const priorTimes = (queue.items || []).filter((item) => item.format !== 'story' && isCreatorTipItem(item))
    .filter((item) => imageStyleFamilyForItem(item)?.publishDate < publishDate)
    .map((item) => Date.parse(item.intendedScheduledFor || item.scheduledFor || 0))
    .filter((time) => Number.isFinite(time) && time < firstPostTime);
  const previousIssueLastPost = priorTimes.length ? Math.max(...priorTimes) : null;
  return {
    firstPostTime,
    stayTunedAt: new Date(Number.isFinite(previousIssueLastPost) ? previousIssueLastPost + 60 * 60 * 1000 : firstPostTime - 9 * 60 * 60 * 1000).toISOString(),
    startsInOneHourAt: new Date(firstPostTime - 60 * 60 * 1000).toISOString(),
  };
}

function syncCreatorTipIssueCoverStories(queue = {}, owner = {}, coverMedia = null, { approve = false } = {}) {
  if (!coverMedia || !isDailySetCoverMedia(coverMedia)) return [];
  const style = imageStyleFamilyForItem(owner);
  const publishDate = style?.publishDate;
  const schedule = creatorTipIssueSchedule(queue, publishDate);
  if (!publishDate || !schedule) return [];
  const tipNumbers = (queue.items || []).filter((item) => item.format !== 'story' && isCreatorTipItem(item))
    .filter((item) => imageStyleFamilyForItem(item)?.publishDate === publishDate)
    .map(creatorTipNumberFromItem)
    .filter((number) => number > 0);
  const firstTip = Math.min(...tipNumbers);
  const lastTip = Math.max(...tipNumbers);
  const definitions = [
    { key: 'stay-tuned', title: `Tomorrow's Creator Tips ${firstTip}-${lastTip}: stay tuned`, scheduledFor: schedule.stayTunedAt, launchPhase: 'stay-tuned' },
    { key: 'starts-in-one-hour', title: `Creator Tips ${firstTip}-${lastTip}: starts in one hour`, scheduledFor: schedule.startsInOneHourAt, launchPhase: 'starts-in-one-hour' },
  ];
  const approvedAt = new Date().toISOString();
  return definitions.map((definition) => {
    const source = `creator-tip-issue:${publishDate}:${definition.key}`;
    let story = (queue.items || []).find((item) => item.source === source);
    if (!story) {
      story = {
        id: randomUUID(),
        title: definition.title,
        body: '',
        target: 'matthew-page',
        format: 'story',
        status: 'draft',
        source,
        notes: 'Image-only Daily Series cover Story. The same approved cover teases the series after the prior set and again one hour before the first post.',
        media: [],
        createdAt: approvedAt,
      };
      queue.items.push(story);
    }
    story.title = definition.title;
    story.body = '';
    story.scheduledFor = definition.scheduledFor;
    story.media = [{ ...coverMedia, role: 'story' }];
    story.issueCover = {
      publishDate,
      styleKey: style.key,
      styleLabel: style.label,
      firstTip,
      lastTip,
      launchPhase: definition.launchPhase,
      captionMode: 'none',
    };
    story.imageReview = withQueueImageReviewRole(story, 'story', null);
    if (approve && !['dispatched', 'scheduled', 'published'].includes(story.status)) {
      story.mediaApproval = { feedApprovedAt: approvedAt, storyApprovedAt: approvedAt, hiddenAt: approvedAt };
      if (Date.parse(definition.scheduledFor) > Date.now() + 10 * 60 * 1000) {
        story.status = 'approved';
        story.approvedAt ||= approvedAt;
        delete story.schedulingBlockedReason;
      } else {
        story.status = 'draft';
        story.schedulingBlockedReason = `The Daily Series cover Story slot (${definition.scheduledFor}) has passed. Choose a recovery slot instead of posting an outdated teaser.`;
      }
    }
    story.updatedAt = approvedAt;
    return story;
  });
}

function queueMediaRoleName(media = {}) {
  const explicit = String(media.role || '').toLowerCase();
  if (['feed', 'story', 'video'].includes(explicit)) return explicit;
  const filename = String(media.filename || '').toLowerCase();
  if (filename.includes('-story')) return 'story';
  if (filename.includes('-feed')) return 'feed';
  if (/video|\.mp4$|\.mov$|\.webm$/i.test(filename) || /video/i.test(String(media.mime || media.type || ''))) return 'video';
  return 'feed';
}

function queueDraftMediaSource(item, role) {
  const list = Array.isArray(item?.media) ? item.media : [];
  return list.find((media) => {
    const mediaRole = queueMediaRoleName(media);
    return role === 'story'
      ? mediaRole === 'story' || mediaRole === 'video'
      : mediaRole === 'feed' || mediaRole === 'video';
  }) || null;
}

function normalizeCampaignTargets(value) {
  const normalizedValue = String(value || 'both').toLowerCase();
  if (['both', 'personal', 'page'].includes(normalizedValue)) return normalizedValue;
  return 'both';
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function spawnRyzen(command, { stdio = ['ignore', 'pipe', 'pipe'], connectTimeout = ryzenSshConnectTimeout, identity = true } = {}) {
  if (ryzenLocal) return spawn('bash', ['-lc', command], { stdio });
  const args = [];
  if (identity) args.push('-i', ryzenSshKey, '-o', 'IdentitiesOnly=yes');
  args.push('-o', 'BatchMode=yes', '-o', `ConnectTimeout=${connectTimeout}`, ryzenHost, command);
  return spawn('ssh', args, { stdio });
}

function readBufferFromRyzen(path) {
  return new Promise((resolve, reject) => {
    const child = spawnRyzen(`cat ${shellSingleQuote(path)}`);
    const chunks = [];
    let error = '';
    child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(error.trim() || `Ryzen media fetch failed (${code})`));
      resolve(Buffer.concat(chunks));
    });
  });
}

async function mediaBufferForExport(media = {}) {
  const directPath = media.path ? normalize(String(media.path)) : '';
  if (directPath) {
    if (directPath.startsWith(`${localGeneratedMediaDir}/`)) return readFile(directPath);
    if (directPath.startsWith(`${ryzenMedia}/`)) return readBufferFromRyzen(directPath);
  }
  const sourceUrl = String(media.url || media.localUrl || media.ryzenUrl || '');
  if (sourceUrl.startsWith('/api/media?')) {
    const parsed = new URL(sourceUrl, `http://127.0.0.1:${port}`);
    const nestedPath = parsed.searchParams.get('path');
    if (nestedPath) return mediaBufferForExport({ ...media, path: nestedPath });
  }
  throw new Error(`Media file is not exportable: ${media.filename || media.path || 'unknown file'}`);
}

function exportMediaExtension(media = {}) {
  const fromName = extname(String(media.filename || media.path || ''));
  if (fromName) return fromName;
  const type = String(media.mime || media.type || '').toLowerCase();
  if (type.includes('png')) return '.png';
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg';
  if (type.includes('webp')) return '.webp';
  if (type.includes('mp4')) return '.mp4';
  if (type.includes('quicktime') || type.includes('mov')) return '.mov';
  return '.bin';
}

function campaignExportFilename(item = {}, role, media = {}) {
  const tipNumber = creatorTipNumberFromItem(item);
  const fallbackId = String(item.id || randomUUID()).replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'draft';
  const tipPart = tipNumber > 0 ? `tip-${String(tipNumber).padStart(3, '0')}` : `draft-${fallbackId}`;
  const rolePart = role === 'story' ? 'story' : 'landscape';
  return safeFilename(`${tipPart}-${rolePart}${exportMediaExtension(media)}`);
}

async function exportCreatorTipCampaignMedia(itemId, { targets = 'both' } = {}) {
  const queue = await readJson(queueFile);
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const selected = items.find((entry) => entry.id === itemId);
  if (!selected) throw new Error('Draft not found.');
  const scope = normalizeCampaignTargets(targets);
  const { tipNumber, personal, page } = creatorTipCampaignCompanions(items, selected);
  const sourceItem = scope === 'page' ? (page || selected) : (personal || selected || page);
  if (!sourceItem) throw new Error('No Creator Tip draft was available to export.');
  const exported = [];
  const roles = [
    { role: 'feed', dir: desktopLandscapeDir, label: 'Landscape' },
    { role: 'story', dir: desktopStoriesDir, label: 'Story' },
  ];
  for (const { role, dir, label } of roles) {
    const media = queueDraftMediaSource(sourceItem, role);
    if (!media) {
      exported.push({ role, ok: false, missing: true, label, message: `${label} artwork is missing.` });
      continue;
    }
    await mkdir(dir, { recursive: true });
    const filename = campaignExportFilename(sourceItem, role, media);
    const destination = join(dir, filename);
    const buffer = await mediaBufferForExport(media);
    await writeFile(destination, buffer);
    exported.push({ role, ok: true, label, filename, path: destination });
  }
  return {
    ok: true,
    tipNumber,
    targets: scope,
    folders: {
      landscape: desktopLandscapeDir,
      stories: desktopStoriesDir,
    },
    exported,
  };
}

function legacyQueueImageReviewRole(item = {}) {
  const review = item.imageReview;
  if (review?.state !== 'needs-review') return null;
  const note = String(review.note || '');
  if (/story|vertical/i.test(note) && !/post art or its story companion/i.test(note)) return 'story';
  if (/landscape|feed|post art/i.test(note)) return 'feed';
  return item.format === 'story' ? 'story' : 'feed';
}

function queueImageReviewForRole(item = {}, role) {
  if (!item) return null;
  const review = item.imageReview;
  if (!review) return null;
  if (['needs-review', 'redo'].includes(review?.[role]?.state)) return review[role];
  return legacyQueueImageReviewRole(item) === role ? review : null;
}

function withQueueImageReviewRole(item = {}, role, nextReview) {
  if (!item) return null;
  const current = item.imageReview || {};
  const scoped = {
    feed: ['needs-review', 'redo'].includes(current.feed?.state) ? { ...current.feed } : null,
    story: ['needs-review', 'redo'].includes(current.story?.state) ? { ...current.story } : null,
  };
  const legacyRole = legacyQueueImageReviewRole(item);
  if (legacyRole && !scoped[legacyRole]) {
    scoped[legacyRole] = {
      state: 'needs-review',
      note: current.note || `Review this ${legacyRole === 'story' ? 'Story' : 'Landscape'} image for regeneration`,
      updatedAt: current.updatedAt || new Date().toISOString(),
    };
  }
  scoped[role] = nextReview;
  const result = {};
  if (['needs-review', 'redo'].includes(scoped.feed?.state)) result.feed = scoped.feed;
  if (['needs-review', 'redo'].includes(scoped.story?.state)) result.story = scoped.story;
  return Object.keys(result).length ? result : null;
}

function queueHasAnyImageReview(item = {}) {
  return Boolean(
    queueImageReviewForRole(item, 'feed')
    || queueImageReviewForRole(item, 'story')
  );
}

function queueImageReviewStateForRoles(roles, notePrefix, updatedAt) {
  const state = {};
  for (const role of roles) {
    state[role] = {
      state: 'redo',
      note: `${role === 'story' ? 'Story' : 'Landscape'} image ${notePrefix}`,
      updatedAt,
    };
  }
  return state;
}

function isProtectedTipReference(item = {}) {
  const source = String(item.source || '').trim();
  if (!/^facebook-creator-tips:matthew-page:cycle-1:tip-(\d+)$/i.test(source)) return false;
  const match = source.match(/tip-(\d+)$/i);
  const tipNumber = Number(match?.[1] || 0);
  if (!(tipNumber >= 1 && tipNumber <= 12)) return false;
  const roles = (Array.isArray(item.media) ? item.media : []).map(queueMediaRoleName);
  return roles.includes('feed') && (roles.includes('story') || roles.includes('video'));
}

function draftImageAudit(queue, item) {
  const itemRole = item.format === 'story' ? 'story' : 'feed';
  const manualReview = queueImageReviewForRole(item, itemRole);
  const manualFlag = Boolean(manualReview);
  const reasons = [];
  if (manualFlag) reasons.push(manualReview.note || 'Manually flagged for regeneration');
  let status = manualFlag ? 'needs-review' : 'ready';
  const ownMedia = Array.isArray(item.media) ? item.media : [];
  const ownRoles = ownMedia.map(queueMediaRoleName);
  if (item.format === 'story') {
    const parent = parentPostFor(queue, item);
    const parentMedia = parent && parent !== item && Array.isArray(parent.media) ? parent.media : [];
    const mediaRequired = requiresGeneratedMedia(item) || requiresGeneratedMedia(parent);
    const pairStarted = mediaRequired || manualFlag || ownMedia.length > 0 || parentMedia.length > 0 || queueHasAnyImageReview(parent);
    if (!pairStarted) return { flagged: false, manualFlag, reasons: [] };
    if (!ownRoles.includes('story') && !ownRoles.includes('video') && mediaRequired) {
      reasons.push('Story image is missing');
      status = 'redo';
    } else if (!ownRoles.includes('story') && !ownRoles.includes('video')) {
      reasons.push('Story lane has no vertical Story media');
      if (status !== 'redo') status = 'needs-review';
    }
  } else {
    const companion = storyCompanionFor(queue, item);
    const storyMedia = companion && Array.isArray(companion.media) ? companion.media : [];
    const storyRoles = storyMedia.map(queueMediaRoleName);
    const ownStoryReady = ownRoles.includes('story') || ownRoles.includes('video');
    const companionStoryReady = storyMedia.length > 0 && (storyRoles.includes('story') || storyRoles.includes('video'));
    const storyHolder = ownStoryReady ? item : (companion || item);
    const storyManualReview = queueImageReviewForRole(storyHolder, 'story');
    const storyManualFlag = Boolean(storyManualReview);
    const mediaRequired = requiresGeneratedMedia(item);
    const pairStarted = mediaRequired || manualFlag || ownMedia.length > 0 || storyMedia.length > 0 || storyManualFlag;
    if (!pairStarted) return { flagged: false, manualFlag, reasons: [] };
    if (!ownRoles.includes('feed') && !ownRoles.includes('video') && mediaRequired) {
      reasons.push('Landscape image is missing');
      status = 'redo';
    } else if (!ownRoles.includes('feed') && !ownRoles.includes('video')) {
      reasons.push('Feed lane has no landscape feed media');
      if (status !== 'redo') status = 'needs-review';
    }
    if (requiresStoryCompanion(item)) {
      if (!ownStoryReady && !companion && (mediaRequired || ownMedia.length > 0)) {
        reasons.push('Story image is missing');
        status = 'redo';
      } else if (!ownStoryReady && companion && !storyMedia.length) {
        reasons.push(mediaRequired ? 'Story image is missing' : 'Story companion image is missing');
        status = 'redo';
      } else if (!ownStoryReady && companion && storyMedia.length > 0 && !companionStoryReady) {
        reasons.push('Story companion is attached, but not as Story media');
        if (status !== 'redo') status = 'needs-review';
      }
      if (storyManualFlag) reasons.push(storyManualReview.note || 'Story companion was flagged for regeneration');
    }
  }
  return { flagged: reasons.length > 0, manualFlag, reasons, status };
}

const fullBleedEdgeRule = 'FULL-BLEED EDGE RULE: Extend the illustrated background sharply to all four canvas edges, like print artwork continuing through a bleed area. Do not add a blurred, mirrored, stretched, duplicated, vignetted, faded, or soft-focus border. Any stated pixel margin is a safety edge only for text, signatures, faces, logos, and important objects; it must not appear as visible padding, a frame, or a border.';

function withFullBleedEdgeRule(prompt) {
  const value = String(prompt || '');
  return /FULL-BLEED EDGE RULE/i.test(value) ? value : `${value}\n\n${fullBleedEdgeRule}`;
}

function imagePromptForFeed(item) {
  const style = imageStyleFamilyForItem(item);
  const basePrompt = item.imagePrompt
    ? String(item.imagePrompt)
    : `Create an original landscape social image for "${item.title || 'this topic'}". Use one strong central subject, bold readable type, layered editorial detail, and a polished magazine-style composition. Source text: ${item.body || '[add post text]'}. ${matthewLikenessAnchor()} ${matthewReferencePackInstruction()} ${style.feed} Vary the art direction across the full series so the collection does not feel repetitive or locked to one cartoon lane. Use the selected style family confidently, but keep the result wholly original and legally distinct from any existing franchise or character. Do not imitate another creator, invent facts, or make a crowded infographic. Keep all text and important subjects at least 30 pixels inside every edge.\n\nSIGNATURE REQUIRED: Add the exact text "Matthew Murphy" as a natural handwritten signature near the bottom-right. It must be clearly legible, inside the safe margin, and subordinate to the headline. Do not omit or misspell the signature.`;
  return withFullBleedEdgeRule(`${creatorGreetingPromptGuard(item, basePrompt)}${creatorTipArtPromptOverride(item, 'feed')}`);
}

function imagePromptForStory(item) {
  const style = imageStyleFamilyForItem(item);
  const basePrompt = item.storyImagePrompt
    ? String(item.storyImagePrompt)
    : `Create an original 1080x1920 vertical Facebook Story image for "${item.title || 'this topic'}". Use this source text: ${item.body || '[add post text]'}. Lead with a short, specific hook and one strong central subject. Keep supporting copy to one or two short lines and end with a natural question that invites an opinion. ${matthewLikenessAnchor()} ${matthewReferencePackInstruction()} ${style.story} Vary the art direction across the full series so the collection does not feel repetitive or locked to one cartoon lane. Use the selected style family confidently, but keep the result wholly original and legally distinct from any existing franchise or character. Use bold readable typography, strong contrast, and polished editorial detail without making a crowded infographic. Keep all text, faces, logos, and important objects at least 30 pixels inside every edge and leave extra clean space near the bottom for Facebook UI. If the premise is hypothetical, label it as a scenario. Do not use Fact or Fiction unless the item is specifically designated that way. Do not copy another creator's wording, identity, family story, or visual composition.\n\nSIGNATURE REQUIRED: Add the exact text "Matthew Murphy" as a natural handwritten signature near the bottom-right. It must be clearly legible, inside the safe margin above Facebook UI, and subordinate to the main message. Do not omit or misspell the signature.`;
  return withFullBleedEdgeRule(`${creatorGreetingPromptGuard(item, basePrompt)}${creatorTipArtPromptOverride(item, 'story')}`);
}

function creatorGreetingPromptGuard(item = {}, prompt = '') {
  if (item?.campaign?.kind !== 'creator-greeting') return prompt;
  const clauses = [];
  if (!/Authorized visible text only/i.test(prompt)) {
    clauses.push('Authorized visible text only: render exactly the primary headline, supporting message, and the spaced handwritten "Matthew Murphy" signature. Do not add any other readable letters, numbers, words, labels, logos, badges, stickers, captions, UI text, or decorative microcopy anywhere.');
  }
  if (!/props wordless/i.test(prompt)) {
    clauses.push('Keep all props wordless: mugs, notebooks, papers, screens, posters, walls, signs, books, folders, windows, desk objects, and background details must have no readable writing or logo-like marks.');
  }
  if (/1080x1920|Facebook Story/i.test(prompt) && !/y=1480/i.test(prompt)) {
    clauses.push('Story-safe signature placement: place the exact spaced handwritten signature "Matthew Murphy" in the lower-right artwork area, with the entire signature inside x=640-980 and y=1380-1480 on the 1080x1920 canvas; no part of the signature may sit below y=1500.');
    clauses.push('Leave y=1500 through the bottom edge as clean background only: no readable text, signature, face, hands, or important prop may appear there. Do not place the signature at the bottom edge.');
  }
  return clauses.length ? `${prompt}\n\n${clauses.join('\n\n')}` : prompt;
}

function compactDraftMedia(media = {}) {
  return {
    filename: media.filename || '',
    role: queueMediaRoleName(media),
    type: media.type || media.mime || '',
    path: media.path || '',
    url: media.url || media.localUrl || media.ryzenUrl || '',
    altText: String(media.altText || '').trim().slice(0, 1000),
  };
}

function reviewConceptKey(item = {}) {
  const campaign = item.campaign || {};
  if (campaign.kind === 'facebook-creator-tips' && campaign.tipNumber) return `creator-tip:${String(campaign.tipNumber).trim()}`;
  if (campaign.kind === 'creators-listen-up' && campaign.sourceId) return `creator-guidance:${String(campaign.sourceId).trim()}`;
  const source = String(item.source || '').trim();
  let match = source.match(/facebook-creator-tips:[^:]+:(?:cycle-\d+:)?tip-(\d+)/i);
  if (match) return `creator-tip:${match[1]}`;
  match = source.match(/creators-listen-up:[^:]+:(\d+)/i);
  if (match) return `creator-guidance:${match[1]}`;
  const text = `${item.title || ''} ${item.notes || ''}`;
  match = text.match(/meta creator guidance\s*#?\s*(\d+)/i);
  if (match) return `creator-guidance:${match[1]}`;
  match = text.match(/(?:^|[^\w])(?:tip|creator tip)\s*#?\s*(\d+)/i);
  if (match) return `creator-tip:${match[1]}`;
  return String(item.title || item.id || '')
    .toLowerCase()
    .replace(/\s+-\s+story$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function reviewCycleKey(item = {}) {
  const source = String(item.source || '').trim();
  const match = source.match(/:cycle-(\d+):/i);
  return match ? `cycle-${match[1]}` : 'base';
}

function creatorTipRepresentativePriority(item = {}) {
  if (item?.target === 'matthew-page') return 0;
  if (item?.target === 'matthew-profile') return 1;
  const source = String(item?.source || '').trim();
  if (/^facebook-creator-tips:[^:]+:cycle-1:tip-(\d+)$/i.test(source)) return 2;
  if (/^facebook-creator-tips:/i.test(source)) return 5;
  return 9;
}

function imageReviewRepresentativeRank(left, right) {
  const leftConcept = reviewConceptKey(left.item);
  const rightConcept = reviewConceptKey(right.item);
  const sameCreatorTip = leftConcept === rightConcept && /^creator-tip:\d+$/i.test(leftConcept);
  if (sameCreatorTip) {
    const leftPriority = creatorTipRepresentativePriority(left.item);
    const rightPriority = creatorTipRepresentativePriority(right.item);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  }
  if (Boolean(left.audit.flagged) !== Boolean(right.audit.flagged)) return Number(right.audit.flagged) - Number(left.audit.flagged);
  if (Boolean(left.feedReady || left.storyReady) !== Boolean(right.feedReady || right.storyReady)) return Number(Boolean(right.feedReady || right.storyReady)) - Number(Boolean(left.feedReady || left.storyReady));
  const leftTime = Date.parse(left.item.scheduledFor || left.item.createdAt || 0) || 0;
  const rightTime = Date.parse(right.item.scheduledFor || right.item.createdAt || 0) || 0;
  return leftTime - rightTime;
}

function buildImageReviewFeed(queue, { mode = 'flagged' } = {}) {
  const dailySetPlans = new Map();
  (queue.items || []).filter((item) => item.format !== 'story').forEach((item) => {
    const style = imageStyleFamilyForItem(item);
    const tipNumber = creatorTipNumberFromItem(item);
    if (!style?.publishDate || !(tipNumber > 0)) return;
    if (!dailySetPlans.has(style.publishDate)) dailySetPlans.set(style.publishDate, { style, tips: new Map() });
    const plan = dailySetPlans.get(style.publishDate);
    if (!plan.tips.has(tipNumber)) plan.tips.set(tipNumber, []);
    plan.tips.get(tipNumber).push(item);
  });
  dailySetPlans.forEach((plan) => {
    const tipNumbers = [...plan.tips.keys()].sort((left, right) => left - right);
    plan.firstTip = tipNumbers[0] || null;
    plan.lastTip = tipNumbers.at(-1) || null;
    plan.coverOwners = plan.tips.get(plan.firstTip) || [];
    const issueCoverRecords = (queue.items || [])
      .filter((item) => item.format === 'story'
        && String(item.source || '').startsWith(`creator-tip-issue:${plan.style.publishDate}:`))
      .map((item) => ({ item, media: (item.media || []).find(isDailySetCoverMedia) }))
      .filter((entry) => entry.media);
    const activeIssueCover = issueCoverRecords.find(({ item }) => !['removed', 'rejected'].includes(item.status));
    const ownerCoverRecords = plan.coverOwners
      .map((item) => ({ item, media: (item.media || []).find((media) => media.role === 'story' && isDailySetCoverMedia(media)) }))
      .filter((entry) => entry.media);
    const activeOwnerCover = ownerCoverRecords.find(({ item }) => !['removed', 'rejected'].includes(item.status));
    const coverReference = activeIssueCover || activeOwnerCover || issueCoverRecords[0] || ownerCoverRecords[0] || null;
    plan.coverReady = Boolean(activeIssueCover || activeOwnerCover);
    plan.coverReference = coverReference ? {
      draftId: coverReference.item.id,
      source: coverReference.item.source || '',
      status: coverReference.item.status || 'draft',
      media: coverReference.media,
      active: !['removed', 'rejected'].includes(coverReference.item.status),
    } : null;
    const approvedTips = [...plan.tips.entries()].filter(([, drafts]) => drafts.length && drafts.every((draft) => {
      const companion = storyCompanionFor(queue, draft);
      const feedReady = (draft.media || []).some((media) => ['feed', 'video'].includes(queueMediaRoleName(media)));
      const storyReady = [...(draft.media || []), ...(companion?.media || [])]
        .some((media) => ['story', 'video'].includes(queueMediaRoleName(media)) && !isDailySetCoverMedia(media));
      return Boolean(draft.mediaApproval?.hiddenAt) && feedReady && storyReady
        && !queueHasAnyImageReview(draft) && !queueHasAnyImageReview(companion);
    })).length;
    plan.pairCount = plan.tips.size;
    plan.approvedPairCount = approvedTips;
    plan.coverUnlocked = plan.pairCount > 0 && approvedTips === plan.pairCount;
    const issueSchedule = creatorTipIssueSchedule(queue, plan.style.publishDate);
    plan.coverStoryScheduledFor = issueSchedule?.startsInOneHourAt || null;
    plan.coverTeaserScheduledFor = issueSchedule?.stayTunedAt || null;
  });
  const grouped = new Map();
  (queue.items || [])
    .filter((item) => item.format !== 'story')
    .map((item) => {
      const companion = storyCompanionFor(queue, item);
      const audit = draftImageAudit(queue, item);
      const manuallyFlagged = queueHasAnyImageReview(item) || queueHasAnyImageReview(companion);
      const feedReady = (Array.isArray(item.media) ? item.media : []).some((media) => {
        const role = queueMediaRoleName(media);
        return role === 'feed' || role === 'video';
      });
      const storyHolder = companion || item;
      const storyReady = (Array.isArray(storyHolder?.media) ? storyHolder.media : []).some((media) => {
        const role = queueMediaRoleName(media);
        return role === 'story' || role === 'video';
      });
      const regenerationLane = !feedReady && !storyReady ? 'both' : !feedReady ? 'feed-only' : !storyReady ? 'story-only' : manuallyFlagged ? 'manual-review' : 'complete';
      return {
        item,
        companion,
        audit,
        manuallyFlagged,
        feedReady,
        storyReady,
        regenerationLane,
        styleFamily: item?.campaign?.kind === 'ai-nightly' ? null : imageStyleFamilyForItem(item),
      };
    })
    .filter((entry) => mode === 'manual' ? entry.manuallyFlagged : entry.audit.flagged)
    .forEach((entry) => {
      const key = `${reviewConceptKey(entry.item)}|${reviewCycleKey(entry.item)}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entry);
    });

  const items = Array.from(grouped.values()).map((entries) => {
    const ranked = [...entries].sort(imageReviewRepresentativeRank);
    const representative = ranked[0];
    return {
      ...representative,
      duplicateCount: Math.max(0, entries.length - 1),
      linkedDraftIds: Array.from(new Set(entries.flatMap(({ item, companion }) => [item?.id, companion?.id]).filter(Boolean))),
      linkedTargets: Array.from(new Set(entries.map(({ item }) => item.target || 'matthew-page'))),
      reasons: Array.from(new Set(entries.flatMap(({ audit }) => audit.reasons || []))),
      manuallyFlagged: entries.some(({ manuallyFlagged }) => manuallyFlagged),
      feedReady: entries.some(({ feedReady }) => feedReady),
      storyReady: entries.some(({ storyReady }) => storyReady),
    };
  });

  const serializeDailySet = (dailySet) => {
    const coverPrompt = [
      `Create an exact 1080x1920 vertical Facebook Story cover for the ${dailySet.style.label || 'Creator Comic'} Daily Series.`,
      `This is the Daily Series cover before CREATOR TIPS #${dailySet.firstTip}-${dailySet.lastTip}; it is not an individual tip card.`,
      `Use a bold original comic-book cover composition with Matthew Murphy as the recognizable lead: ${matthewLikenessAnchor()}`,
      `Use ${dailySet.style.label || 'Creator Comic'} only as visual direction. Never print that style label, an artist credit, or a style-family name anywhere in the Facebook artwork.`,
      `Cover text must include "CREATOR TIPS", "DAILY SERIES", and "TIPS ${dailySet.firstTip}-${dailySet.lastTip}". Other cover copy is optional, brief, and topic-focused.`,
      'Keep the top 250 px, bottom 320 px, and 90 px on both sides clear for Facebook Story controls. Add the exact spaced handwritten signature "Matthew Murphy" above the bottom safe margin.',
      fullBleedEdgeRule,
      'No copyrighted characters, publisher marks, franchise names, tattoos, black hair, black beard, extra limbs, malformed hands, or tiny unreadable cover copy.',
    ].join(' ');
    return {
      publishDate: dailySet.style.publishDate,
      styleKey: dailySet.style.key,
      theme: dailySet.style.label || 'Creator Comic',
      firstTip: dailySet.firstTip,
      lastTip: dailySet.lastTip,
      pairCount: dailySet.pairCount,
      approvedPairCount: dailySet.approvedPairCount,
      coverUnlocked: dailySet.coverUnlocked,
      coverBlockedReason: dailySet.coverUnlocked ? '' : `Approve all ${dailySet.pairCount} Landscape/Story pairs first (${dailySet.approvedPairCount}/${dailySet.pairCount} approved).`,
      coverRequired: dailySet.coverUnlocked && !dailySet.coverReady,
      coverReady: dailySet.coverReady,
      coverReferenceAvailable: Boolean(dailySet.coverReference?.media),
      coverReference: dailySet.coverReference ? {
        draftId: dailySet.coverReference.draftId,
        source: dailySet.coverReference.source,
        status: dailySet.coverReference.status,
        active: dailySet.coverReference.active,
        media: compactDraftMedia(dailySet.coverReference.media),
      } : null,
      coverRole: 'story',
      coverAttachMode: 'prepend',
      coverAttachDraftIds: dailySet.coverOwners.map((owner) => owner.id),
      coverStoryScheduledFor: dailySet.coverStoryScheduledFor,
      coverTeaserScheduledFor: dailySet.coverTeaserScheduledFor,
      coverStoryPlan: [
        { phase: 'stay-tuned', scheduledFor: dailySet.coverTeaserScheduledFor, captionMode: 'none' },
        { phase: 'starts-in-one-hour', scheduledFor: dailySet.coverStoryScheduledFor, captionMode: 'none' },
      ],
      coverPrompt,
    };
  };

  return {
    generatedAt: new Date().toISOString(),
    mode,
    total: items.length,
    dailySets: [...dailySetPlans.values()].map(serializeDailySet).sort((left, right) => left.publishDate.localeCompare(right.publishDate)),
    items: items.map(({ item, companion, manuallyFlagged, feedReady, storyReady, regenerationLane, styleFamily, duplicateCount, linkedDraftIds, linkedTargets, reasons }) => {
      const nightly = item?.campaign?.kind === 'ai-nightly';
      const greeting = item?.campaign?.kind === 'creator-greeting';
      const nightlyMediaLane = String(item?.campaign?.mediaLane || 'future-comic').replace(/[^a-z0-9-]/gi, '-') || 'future-comic';
      const nightlyDate = String(item?.campaign?.nightDate || '').replace(/[^0-9-]/g, '') || 'undated';
      const nightlySlot = String(item?.campaign?.slot || '').replace(/[^0-9]/g, '') || String((item?.campaign?.nightlyIndex ?? 0) + 1);
      const greetingDate = String(item?.campaign?.date || '').replace(/[^0-9-]/g, '') || 'undated';
      const greetingSlot = String(item?.campaign?.categoryKey || 'greeting').replace(/[^a-z0-9-]/gi, '-') || 'greeting';
      const dailySet = greeting ? null : dailySetPlans.get(styleFamily?.publishDate);
      const serializedDailySet = dailySet ? serializeDailySet(dailySet) : null;
      const coverLedDesignGuard = serializedDailySet ? [
        '',
        'DAILY COMIC ISSUE VISUAL BIBLE (AUTHORITATIVE):',
        `This post belongs to the ${serializedDailySet.publishDate} ${serializedDailySet.theme} issue covering Tips ${serializedDailySet.firstTip}-${serializedDailySet.lastTip}.`,
        serializedDailySet.coverReference?.media?.url
          ? `Use the preserved Daily Series cover as the visual reference: ${serializedDailySet.coverReference.media.url}`
          : 'The Daily Series cover is not attached yet; keep the named issue style consistent and leave the cover as a separate required asset.',
        'Translate this exact post idea into a clear comic-book scene or comic-strip beat from that same issue: matching palette, ink treatment, Matthew design, visual era, and issue identity.',
        'Do not fall back to a generic motivational poster, stock editorial illustration, plain quote card, unrelated crowd scene, or text floating over a background.',
        'The Landscape and Story must feel like two purpose-built pages from the same comic issue, not a stretched duplicate.',
      ].join('\n') : '';
      const qcCorrectionGuard = (role, review) => review && ['needs-review', 'redo'].includes(review.state) ? [
        '',
        `QC REDO FOR ${role.toUpperCase()} (AUTHORITATIVE):`,
        `Correct every listed failure: ${String(review.note || 'The current image failed visual review.').trim()}`,
        'Keep the current image only as a reference for what was rejected. Do not reproduce its failed concept, layout, text, anatomy, likeness, crop, or style mismatch.',
        'Return a genuinely corrected image for this role while preserving the approved companion role unchanged.',
      ].join('\n') : '';
      const feedQcGuard = qcCorrectionGuard('Landscape', queueImageReviewForRole(item, 'feed'));
      const storyQcGuard = qcCorrectionGuard('Story', queueImageReviewForRole(companion || item, 'story'));
      return ({
      draftId: item.id,
      draftRef: `D-${String(item.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'UNKNOWN'}`,
      storyDraftId: companion?.id || null,
      storyDraftRef: companion ? `D-${String(companion.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'UNKNOWN'}` : null,
      title: item.title || '',
      body: item.body || '',
      target: item.target || 'matthew-page',
      linkedTargets,
      linkedDraftIds,
      duplicateCount,
      format: item.format || 'feed',
      status: item.status || 'draft',
      scheduledFor: item.scheduledFor || null,
      intendedScheduledFor: item.intendedScheduledFor || styleFamily?.scheduledFor || null,
      artDate: nightly ? nightlyDate : greeting ? greetingDate : styleFamily?.publishDate || null,
      artStyleLabel: nightly ? null : greeting ? 'Daily Greetings' : styleFamily?.label || null,
      mediaVariant: nightly ? {
        styleKey: nightlyMediaLane,
        private: true,
        feedFilenameStem: `ai-nightly-${nightlyDate}-${nightlySlot}-${nightlyMediaLane}-landscape`,
        storyFilenameStem: `ai-nightly-${nightlyDate}-${nightlySlot}-${nightlyMediaLane}-story`,
      } : greeting ? {
        styleKey: 'creator-greeting',
        styleLabel: 'Daily Greetings',
        private: true,
        feedFilenameStem: `creator-greeting-${greetingDate}-${greetingSlot}-landscape`,
        storyFilenameStem: `creator-greeting-${greetingDate}-${greetingSlot}-story`,
      } : styleFamily ? {
        styleKey: styleFamily.key,
        styleLabel: styleFamily.label,
        private: true,
        feedFilenameStem: `tip-${creatorTipNumberFromItem(item)}-${styleFamily.key}-landscape`,
        storyFilenameStem: `tip-${creatorTipNumberFromItem(item)}-${styleFamily.key}-story`,
      } : null,
      dailySet: serializedDailySet,
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
      reasons,
      manuallyFlagged,
      feedReady,
      storyReady,
      regenerationLane,
      styleFamily: nightly ? nightlyMediaLane : greeting ? 'creator-greeting' : styleFamily?.key || null,
      likenessAnchor: matthewLikenessAnchor(),
      likenessReferencePack: MATTHEW_REFERENCE_PACK_DIR,
      likenessCanonicalReferences: MATTHEW_CANONICAL_REFERENCE_ASSETS,
      likenessReferenceInstruction: matthewReferencePackInstruction(),
      notes: item.notes || '',
      feedPrompt: `${imagePromptForFeed(item)}${coverLedDesignGuard}${feedQcGuard}`,
      storyPrompt: `${imagePromptForStory(companion || item)}${coverLedDesignGuard}${storyQcGuard}`,
      feedMedia: (Array.isArray(item.media) ? item.media : [])
        .filter((media) => ['feed', 'video'].includes(queueMediaRoleName(media)))
        .map(compactDraftMedia),
      storyMedia: (Array.isArray((companion || item)?.media) ? (companion || item).media : [])
        .filter((media) => ['story', 'video'].includes(queueMediaRoleName(media)))
        .map(compactDraftMedia),
      feedReview: item.imageReview || null,
      storyReview: companion?.imageReview || null,
    });
    }),
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  const temporary = `${path}.incoming-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

function readJsonFromRyzen(path) {
  return new Promise((resolve, reject) => {
    const child = spawnRyzen(`cat ${shellSingleQuote(path)}`);
    let output = '';
    let error = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(error.trim() || `Ryzen review fetch failed (${code})`));
      try { resolve(JSON.parse(output)); } catch (parseError) { reject(parseError); }
    });
  });
}

let creatorIntelligenceRyzenSyncAt = 0;
let creatorIntelligenceRyzenSyncPromise = null;
let creatorIntelligenceRyzenSyncStatus = { ok: false, error: 'Not checked yet.', checkedAt: null };

async function syncCreatorIntelligenceFromRyzen({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - creatorIntelligenceRyzenSyncAt < 60_000) return creatorIntelligenceRyzenSyncStatus;
  if (creatorIntelligenceRyzenSyncPromise) return creatorIntelligenceRyzenSyncPromise;
  creatorIntelligenceRyzenSyncAt = now;
  creatorIntelligenceRyzenSyncPromise = (async () => {
    const checkedAt = new Date().toISOString();
    try {
      const remote = await readJsonFromRyzen(ryzenCreatorIntelligenceLedger);
      if (!remote || !Array.isArray(remote.posts)) throw new Error('Ryzen returned an invalid Creator Intelligence ledger.');
      const sanitized = mergeCreatorIntelligenceCaptures({
        updatedAt: remote.updatedAt || null,
        policy: remote.policy || '',
        posts: remote.posts,
      }, [], checkedAt).ledger;
      const local = await readJson(creatorIntelligenceLedgerFile);
      if (local.ryzenUpdatedAt !== remote.updatedAt || local.posts.length !== sanitized.posts.length) {
        await writeJson(creatorIntelligenceLedgerFile, {
          updatedAt: sanitized.updatedAt || remote.updatedAt || null,
          policy: sanitized.policy || remote.policy || local.policy,
          posts: sanitized.posts,
          ryzenUpdatedAt: remote.updatedAt || null,
          ryzenFetchedAt: checkedAt,
        });
      }
      creatorIntelligenceRyzenSyncStatus = {
        ok: true,
        checkedAt,
        ryzenUpdatedAt: remote.updatedAt || null,
        total: sanitized.posts.length,
      };
    } catch (error) {
      creatorIntelligenceRyzenSyncStatus = { ok: false, checkedAt, error: String(error?.message || error) };
    }
    return creatorIntelligenceRyzenSyncStatus;
  })().finally(() => {
    creatorIntelligenceRyzenSyncPromise = null;
  });
  return creatorIntelligenceRyzenSyncPromise;
}

function runRyzenPythonJson(script, timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    const child = spawnRyzen('python3 -', { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let error = '';
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      finish(() => reject(new Error('Ryzen JSON command timed out.')));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', (childError) => finish(() => reject(childError)));
    child.on('close', (code) => {
      if (code !== 0) return finish(() => reject(new Error(error.trim() || `Ryzen JSON command failed (${code}).`)));
      try {
        resolve(JSON.parse(output.trim()));
      } catch {
        reject(new Error('Ryzen returned invalid JSON.'));
      }
    });
    child.stdin.end(script);
  });
}

let creatorTipReelWorkerCheckedAt = 0;
let creatorTipReelWorkerCheckPromise = null;
let creatorTipReelWorkerLiveStatus = creatorTipReelWorker;
let creatorTipReelResultSyncAt = 0;
let creatorTipReelResultSyncPromise = null;

async function syncCreatorTipReelResultsFromRyzen({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - creatorTipReelResultSyncAt < 15_000) return;
  if (creatorTipReelResultSyncPromise) return creatorTipReelResultSyncPromise;
  creatorTipReelResultSyncAt = now;
  creatorTipReelResultSyncPromise = runRyzenPythonJson(String.raw`
import json
import pathlib

root = pathlib.Path('/home/mmurphy/homelab/projects/creator-publishing-hub/data/personal-social/creator-tip-reels/completed')
items = []
for candidate in sorted(root.glob('*.json')) if root.exists() else []:
    try:
        payload = json.loads(candidate.read_text())
        items.append({key: payload.get(key) for key in ['id', 'status', 'videoPath', 'filename', 'durationSeconds', 'thumbnailPath', 'narrationProvider', 'providedAudio', 'renderedAt', 'completedAt']})
    except Exception:
        pass
print(json.dumps({'items': items}))
`, 15_000).then(async (remote) => {
    if (!Array.isArray(remote.items) || !remote.items.length) return;
    const ledger = await readJson(creatorTipReelJobsFile).catch(() => ({ updatedAt: null, jobs: [] }));
    const byId = new Map(remote.items.filter((item) => item?.id).map((item) => [item.id, item]));
    let changed = false;
    for (const job of ledger.jobs || []) {
      const result = byId.get(job.id);
      if (!result || job.reviewStatus === 'approved' || (job.renderedAt && job.renderedAt === result.renderedAt)) continue;
      const renderedAt = result.renderedAt || result.completedAt || new Date().toISOString();
      job.renderedMedia = {
        filename: safeFilename(result.filename || `${job.periodEnd}-${job.cadence}-creator-tips-reel.mp4`),
        type: 'video/mp4',
        path: result.videoPath || null,
        url: result.videoPath ? `/api/media?path=${encodeURIComponent(result.videoPath)}&type=video%2Fmp4` : null,
        thumbnailUrl: result.thumbnailPath ? `/api/media?path=${encodeURIComponent(result.thumbnailPath)}&type=image%2Fjpeg` : null,
        durationSeconds: Number.isFinite(Number(result.durationSeconds)) ? Number(result.durationSeconds) : null,
        renderedAt,
      };
      job.status = 'ready-for-review';
      job.workerState = 'rendered';
      job.reviewStatus = 'pending';
      job.publishingApproved = false;
      job.publishAllowed = false;
      job.renderedAt = renderedAt;
      job.narrationProvider = result.narrationProvider || (result.providedAudio ? 'user-owned-audio' : job.narrationProvider);
      if (result.providedAudio) job.providedAudio = result.providedAudio;
      delete job.error;
      changed = true;
    }
    if (changed) {
      ledger.updatedAt = new Date().toISOString();
      await writeJson(creatorTipReelJobsFile, ledger);
    }
  }).finally(() => {
    creatorTipReelResultSyncPromise = null;
  });
  return creatorTipReelResultSyncPromise;
}

async function refreshCreatorTipReelWorkerStatus({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - creatorTipReelWorkerCheckedAt < 60_000) return creatorTipReelWorkerLiveStatus;
  if (creatorTipReelWorkerCheckPromise) return creatorTipReelWorkerCheckPromise;
  creatorTipReelWorkerCheckedAt = now;
  creatorTipReelWorkerCheckPromise = runRyzenPythonJson(String.raw`
import json
import pathlib
import subprocess

def command(args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=8)
    return result.stdout

properties = {}
for line in command(['systemctl', 'show', 'creator-tip-reel-worker.service', '-p', 'ActiveState', '-p', 'SubState', '-p', 'Result', '-p', 'ExecMainStatus']).splitlines():
    if '=' in line:
        key, value = line.split('=', 1)
        properties[key] = value
journal = command(['journalctl', '-u', 'creator-tip-reel-worker.service', '-n', '16', '--no-pager'])
provider_names = command(['sudo', '-n', 'grep', '-E', '^(CREATOR_TIP_REEL_FISH_URL|CPH_FISH_BASE_URL|CREATOR_TIP_REEL_ELEVENLABS_POOL_PATH)=', '/etc/creator-publishing-hub/personal-social.env'])
provider_configured = bool(provider_names.strip())
root = pathlib.Path('/home/mmurphy/homelab/projects/creator-publishing-hub/data/personal-social/creator-tip-reels')
counts = {name: len(list((root / name).glob('*.json'))) if (root / name).exists() else 0 for name in ['ready', 'processing', 'completed', 'failed']}
owned_audio_ready = 0
for candidate in (root / 'ready').glob('*.json') if (root / 'ready').exists() else []:
    try:
        payload = json.loads(candidate.read_text())
        if payload.get('providedAudio', {}).get('source'):
            owned_audio_ready += 1
    except Exception:
        pass
result = properties.get('Result', '')
active = properties.get('ActiveState', '')
credit_error = 'HTTP 402' in journal
if not provider_configured and owned_audio_ready:
    state = 'owned-audio-ready'
elif not provider_configured:
    state = 'voice-provider-required'
elif active == 'active':
    state = 'rendering'
elif result == 'success':
    state = 'ready'
elif credit_error:
    state = 'voice-credits-required'
elif result == 'exec-condition':
    state = 'voice-provider-required'
elif result in ['exit-code', 'timeout', 'signal']:
    state = 'worker-error'
else:
    state = 'unknown'
print(json.dumps({'state': state, 'service': properties, 'counts': counts, 'ownedAudioReady': owned_audio_ready, 'providerConfigured': provider_configured}))
`, 12_000).then((remote) => {
    const reasons = {
      ready: 'Ryzen is ready to render approval-gated reel previews.',
      rendering: 'Ryzen is rendering an approval-gated reel preview now.',
      'owned-audio-ready': `Ryzen can render ${Number(remote.ownedAudioReady || 0)} queued reel${Number(remote.ownedAudioReady || 0) === 1 ? '' : 's'} with Matthew's supplied audio.`,
      'voice-credits-required': 'The configured ElevenLabs fallback is out of credits, and Fish Speech is not configured on Ryzen.',
      'voice-provider-required': 'No Fish Speech endpoint or approved voice fallback is configured on Ryzen.',
      'worker-error': 'The Ryzen reel worker failed its latest preview render. Review the worker error before retrying.',
      unknown: 'Ryzen reel worker health could not be determined.',
    };
    creatorTipReelWorkerLiveStatus = {
      engine: 'fish-speech',
      configured: !['voice-provider-required', 'unknown'].includes(remote.state),
      operational: ['ready', 'rendering', 'owned-audio-ready'].includes(remote.state),
      state: remote.state,
      reason: reasons[remote.state] || reasons.unknown,
      queue: remote.counts || {},
      ownedAudioReady: Number(remote.ownedAudioReady || 0),
      checkedAt: new Date().toISOString(),
    };
    return creatorTipReelWorkerLiveStatus;
  }).catch((error) => {
    creatorTipReelWorkerLiveStatus = {
      ...creatorTipReelWorker,
      configured: false,
      operational: false,
      state: 'unreachable',
      reason: `Ryzen reel worker could not be checked: ${String(error?.message || error)}`,
      checkedAt: new Date().toISOString(),
    };
    return creatorTipReelWorkerLiveStatus;
  }).finally(() => {
    creatorTipReelWorkerCheckPromise = null;
  });
  return creatorTipReelWorkerCheckPromise;
}

function parseKeyValueEnv(output = '') {
  const env = {};
  for (const raw of String(output).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function readRyzenPersonalSocialEnv() {
  const envFile = process.env.CPH_PERSONAL_SOCIAL_ENV || '/etc/creator-publishing-hub/personal-social.env';
  if (String(process.env.CPH_RYZEN_LOCAL || '') === '1') {
    return readFile(envFile, 'utf8')
      .then(parseKeyValueEnv)
      .catch(() => Promise.reject(new Error('Ryzen publishing env file is not readable.')));
  }
  return new Promise((resolve, reject) => {
    const command = `bash -lc 'if [ -r ${envFile} ]; then cat ${envFile}; else sudo -n cat ${envFile}; fi'`;
    const child = spawn('ssh', ['-i', ryzenSshKey, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', ryzenHost, command], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let error = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        const details = (error || '').trim();
        if (details.includes('No such file') || details.includes('cannot access')) {
          return reject(new Error('Ryzen publishing env file is missing.'));
        }
        return reject(new Error('Ryzen publishing env file is not readable.'));
      }
      resolve(parseKeyValueEnv(output));
    });
  });
}

async function metaGraphJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    const message = payload?.error?.message || `Meta request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

async function scheduleMetaPhotoWithCurl({ url, pageToken, caption, scheduledPublishTime, mediaBuffer, mediaType, mediaFilename }) {
  const directory = await mkdtemp(join(tmpdir(), 'social-desk-meta-'));
  const tokenPath = join(directory, 'page-token');
  const captionPath = join(directory, 'caption.txt');
  const mediaPath = join(directory, mediaFilename);
  try {
    await Promise.all([
      writeFile(tokenPath, pageToken, { mode: 0o600 }),
      writeFile(captionPath, caption, { mode: 0o600 }),
      writeFile(mediaPath, mediaBuffer, { mode: 0o600 }),
    ]);
    const output = await new Promise((resolve, reject) => {
      const child = spawn('curl', [
        '--silent',
        '--show-error',
        '--request', 'POST',
        '--form', `access_token=<${tokenPath}`,
        '--form', `caption=<${captionPath}`,
        '--form', 'published=false',
        '--form', 'unpublished_content_type=SCHEDULED',
        '--form', `scheduled_publish_time=${scheduledPublishTime}`,
        '--form', `source=@${mediaPath};type=${mediaType};filename=${mediaFilename}`,
        url,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const finish = (callback) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        callback();
      };
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        finish(() => reject(new Error('Meta photo scheduling timed out after 90 seconds.')));
      }, 90_000);
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', (error) => finish(() => reject(error)));
      child.on('close', (code) => finish(() => code === 0
        ? resolve(stdout)
        : reject(new Error(cleanMetaError(stderr || stdout || `Meta curl failed (${code}).`)))));
    });
    const payload = JSON.parse(String(output || '{}'));
    if (payload?.error) throw new Error(cleanMetaError(payload.error));
    return payload;
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}

async function scheduleMetaTextWithCurl({ url, pageToken, caption, scheduledPublishTime }) {
  const directory = await mkdtemp(join(tmpdir(), 'social-desk-meta-text-'));
  const tokenPath = join(directory, 'page-token');
  const captionPath = join(directory, 'caption.txt');
  try {
    await Promise.all([
      writeFile(tokenPath, pageToken, { mode: 0o600 }),
      writeFile(captionPath, caption, { mode: 0o600 }),
    ]);
    const output = await new Promise((resolve, reject) => {
      const child = spawn('curl', [
        '--silent',
        '--show-error',
        '--request', 'POST',
        '--data-urlencode', `access_token@${tokenPath}`,
        '--data-urlencode', `message@${captionPath}`,
        '--data', 'published=false',
        '--data', 'unpublished_content_type=SCHEDULED',
        '--data', `scheduled_publish_time=${scheduledPublishTime}`,
        url,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const finish = (callback) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        callback();
      };
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        finish(() => reject(new Error('Meta text scheduling timed out after 90 seconds.')));
      }, 90_000);
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', (error) => finish(() => reject(error)));
      child.on('close', (code) => finish(() => code === 0
        ? resolve(stdout)
        : reject(new Error(cleanMetaError(stderr || stdout || `Meta curl failed (${code}).`)))));
    });
    const payload = JSON.parse(String(output || '{}'));
    if (payload?.error) throw new Error(cleanMetaError(payload.error));
    return payload;
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}

function personalPublishingReadiness(force = false) {
  if (!force && personalPublishingReadinessCache.value && Date.now() - personalPublishingReadinessCache.checkedAt < 60_000) {
    return Promise.resolve(personalPublishingReadinessCache.value);
  }
  if (personalPublishingReadinessPromise) return personalPublishingReadinessPromise;
  personalPublishingReadinessPromise = (async () => {
    const result = {
      reachable: true,
      dryRun: null,
      tokenConfigured: false,
      pageIdConfigured: false,
      valid: null,
      canPublish: false,
      needsRefresh: false,
      expiresAt: null,
      expiresSoon: false,
      pageName: '',
      pageId: '',
      error: '',
    };

    let env;
    try {
      env = await readRyzenPersonalSocialEnv();
    } catch (error) {
      result.reachable = false;
      result.error = error.message || 'Ryzen publishing env file is not readable.';
      return result;
    }

    const dryRun = String(env.CPH_PERSONAL_SOCIAL_DRY_RUN || '1') !== '0';
    const pageToken = String(env.CPH_PERSONAL_PAGE_TOKEN || env.CPH_FACEBOOK_PAGE_TOKEN || env.FACEBOOK_ACCESS_TOKEN || '').trim();
    const pageId = String(env.CPH_PERSONAL_PAGE_ID || env.CPH_FACEBOOK_PAGE_ID || '').trim();
    const appId = String(env.CPH_PERSONAL_APP_ID || '').trim();
    const appSecret = String(env.CPH_PERSONAL_APP_SECRET || '').trim();

    result.dryRun = dryRun;
    result.tokenConfigured = Boolean(pageToken);
    result.pageIdConfigured = Boolean(pageId);
    result.pageId = pageId;

    if (!pageToken) {
      result.error = 'The Facebook Page token is not configured on Ryzen.';
      return result;
    }
    if (!pageId) {
      result.error = 'The Facebook Page ID is not configured on Ryzen.';
      return result;
    }

    try {
      const pageData = await metaGraphJson(`https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(pageToken)}`);
      result.pageName = String(pageData?.name || '');
      result.pageId = String(pageData?.id || pageId);
      result.valid = true;
      result.canPublish = !dryRun;
    } catch (error) {
      result.valid = false;
      result.canPublish = false;
      result.needsRefresh = true;
      result.error = error.message || 'Meta rejected the Page token.';
      return result;
    }

    if (appId && appSecret) {
      try {
        const debugData = await metaGraphJson(`https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(pageToken)}&access_token=${encodeURIComponent(appId)}|${encodeURIComponent(appSecret)}`);
        const tokenData = debugData?.data || {};
        if (tokenData.expires_at) {
          const expiresAtMs = Number(tokenData.expires_at) * 1000;
          if (Number.isFinite(expiresAtMs) && expiresAtMs > 0) {
            result.expiresAt = new Date(expiresAtMs).toISOString();
            if (expiresAtMs - Date.now() <= 7 * 24 * 60 * 60 * 1000) {
              result.expiresSoon = true;
            }
          }
        }
        if (tokenData.is_valid === false) {
          result.valid = false;
          result.canPublish = false;
          result.needsRefresh = true;
          result.error = tokenData?.error?.message || 'Meta marked the Page token invalid.';
        }
      } catch {}
    }

    return result;
  })().then((value) => {
    personalPublishingReadinessCache = { checkedAt: Date.now(), value };
    return value;
  }).finally(() => { personalPublishingReadinessPromise = null; });
  return personalPublishingReadinessPromise;
}

function publishingReadinessMessage(readiness) {
  if (!readiness?.reachable) return 'Ryzen publishing readiness could not be verified. The draft remains approved and will retry.';
  if (readiness.valid === false && readiness.needsRefresh) return 'The Facebook Page token on Ryzen is no longer accepted by Meta. Refresh it before approving more drafts.';
  if (readiness.dryRun && !readiness.tokenConfigured) return 'Ryzen is in dry-run mode and the Facebook Page token is not configured. The draft remains approved and will retry.';
  if (readiness.dryRun) return 'Ryzen is still in dry-run mode. The draft remains approved and will retry.';
  if (!readiness.tokenConfigured) return 'The Facebook Page token is not configured on Ryzen. The draft remains approved and will retry.';
  if (readiness.expiresSoon) return 'The Facebook Page token on Ryzen is valid but will expire soon. Refresh it before the next posting window.';
  return '';
}

async function refreshAudienceReviewFromRyzen(force = false) {
  if (!force && Date.now() - audienceReviewRefreshedAt < 30000) return;
  if (audienceReviewRefreshPromise) return audienceReviewRefreshPromise;
  audienceReviewRefreshPromise = (async () => {
    const reviews = (await Promise.all(ryzenAudienceReviews.map((path) => readJsonFromRyzen(path).catch(() => null)))).filter(Boolean);
    if (!reviews.length) throw new Error('No audience review shard is available on Ryzen.');
    const reviewRecords = new Map();
    for (const review of reviews) {
      for (const record of review.profiles || []) {
        const current = reviewRecords.get(record.key);
        if (!current || new Date(record.checkedAt || 0) > new Date(current.checkedAt || 0)) reviewRecords.set(record.key, record);
      }
    }
    const [audience, messageLedger, birthdayLedger] = await Promise.all([readJson(audienceFile), readJson(messageLedgerFile), readJson(birthdayLedgerFile)]);
    const byId = new Map((audience.people || []).filter((person) => person.id).map((person) => [String(person.id), person]));
    const byUrl = new Map((audience.people || []).filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
    let merged = 0;
    for (const record of reviewRecords.values()) {
      const id = String(record.id || '').replace(/[^0-9]/g, '');
      const url = canonicalFacebookUrl(record.url);
      const person = (id && byId.get(id)) || (url && byUrl.get(url));
      if (!person) continue;
      if (person.profileState !== 'minor-blocked') person.profileState = record.profileState || 'pending';
      person.activityReviewState = record.activityReviewState || record.publicObservation?.activityState || 'unknown';
      person.activityObserverRevision = record.activityObserverRevision || null;
      person.profileRetryCount = Number(record.attemptCount || 0);
      person.profileNextRetryAt = record.nextRetryAt || null;
      person.profileObservation = record.publicObservation || null;
      if (typeof record.publicObservation?.verifiedBadge === 'boolean') {
        person.verifiedObserved = true;
        person.verified = record.publicObservation.verifiedBadge;
        person.verifiedObservedAt = record.publicObservation.verifiedBadgeObservedAt || record.checkedAt || new Date().toISOString();
      }
      if (record.publicObservation?.verifiedBadge === true) {
        person.keepLocked = true;
        person.decision = 'keep';
        person.reason = 'Verified account badge captured from Facebook; keep permanently unless manually reviewed.';
      }
      merged += 1;
    }
    let messageMerged = 0;
    for (const thread of messageLedger.threads || []) {
      if (thread.identitySource !== 'active-message-profile-link') continue;
      const record = (thread.actorId && reviewRecords.get(`facebook-id:${thread.actorId}`))
        || [...reviewRecords.values()].find((candidate) => thread.actorId && String(candidate.id || '') === String(thread.actorId)
          || thread.actorUrl && canonicalFacebookUrl(candidate.url) === canonicalFacebookUrl(thread.actorUrl));
      if (!record?.checkedAt) continue;
      if (thread.priorityReviewQueuedAt && new Date(record.checkedAt) < new Date(thread.priorityReviewQueuedAt)) continue;
      const observation = record.publicObservation || {};
      thread.priorityReviewCompletedAt = record.checkedAt;
      thread.priorityReviewState = record.profileState || 'reviewed';
      thread.profileReview = {
        checkedAt: record.checkedAt,
        profileState: record.profileState || 'reviewed',
        activityState: record.activityReviewState || observation.activityState || 'unknown',
        accessible: observation.accessible === true,
        entityType: observation.entityType || 'unknown',
        verifiedBadge: observation.verifiedBadge === true,
        lastPostAt: observation.lastPostAt || null,
        publicFacts: observation.publicFacts || {},
      };
      messageMerged += 1;
    }
    let birthdayMerged = 0;
    for (const birthday of birthdayLedger.people || []) {
      const profile = exactBirthdayProfile(birthday);
      if (!profile) continue;
      const record = reviewRecords.get(profile.identityKey)
        || [...reviewRecords.values()].find((candidate) => profile.actorId && String(candidate.id || '') === profile.actorId
          || canonicalFacebookUrl(candidate.url) === profile.actorUrl);
      if (!record?.checkedAt) continue;
      if (birthday.priorityReviewQueuedAt && new Date(record.checkedAt) < new Date(birthday.priorityReviewQueuedAt)) continue;
      const observation = record.publicObservation || {};
      birthday.priorityReviewCompletedAt = record.checkedAt;
      birthday.priorityReviewState = record.profileState || 'reviewed';
      birthday.priorityReviewError = '';
      birthday.profileReview = {
        checkedAt: record.checkedAt,
        profileState: record.profileState || 'reviewed',
        activityState: record.activityReviewState || observation.activityState || 'unknown',
        accessible: observation.accessible === true,
        entityType: observation.entityType || 'unknown',
        verifiedBadge: observation.verifiedBadge === true,
        lastPostAt: observation.lastPostAt || null,
        publicObservation: observation,
      };
      birthdayMerged += 1;
    }
    const birthdayAudienceMatched = applyBirthdayFactsToAudience(audience, birthdayLedger);
    if (merged || birthdayAudienceMatched) await writeJson(audienceFile, audience);
    if (messageMerged) await writeJson(messageLedgerFile, messageLedger);
    if (birthdayMerged) await writeJson(birthdayLedgerFile, birthdayLedger);
    await ensureBirthdayCreatorDraft(birthdayLedger, audience).catch((error) => console.warn(`Birthday creator draft skipped: ${error.message}`));
    audienceReviewRefreshedAt = Date.now();
  })().finally(() => { audienceReviewRefreshPromise = null; });
  return audienceReviewRefreshPromise;
}

async function bodyJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function repairMojibake(value) {
  let current = String(value || '');
  for (let pass = 0; pass < 3 && /(?:Ã.|Â.|à[¸¹]|â[-™])/.test(current); pass += 1) {
    const next = Buffer.from(current, 'latin1').toString('utf8');
    if (!next || next.includes('\uFFFD') || next === current) break;
    current = next;
  }
  return current.normalize('NFC');
}

async function facebookPostArchiveFiles(directory = facebookImportsDir) {
  const files = [];
  async function visit(current) {
    let entries = [];
    try { entries = await readdir(current, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name === 'your_posts__check_ins__photos_and_videos_1.json') files.push(path);
    }
  }
  await visit(directory);
  return files;
}

async function loadFacebookArchivePosts() {
  const files = await facebookPostArchiveFiles();
  const rows = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8'));
      if (Array.isArray(parsed)) rows.push(...parsed);
    } catch {}
  }
  return { files, rows: normalizeArchivePosts(rows) };
}

function publicFacebookRemixLibrary(library = {}) {
  const candidates = Array.isArray(library.candidates) ? library.candidates : [];
  return {
    schemaVersion: Number(library.schemaVersion || 1),
    id: String(library.id || ''),
    generatedAt: library.generatedAt || null,
    updatedAt: library.updatedAt || library.generatedAt || null,
    source: library.source || {},
    policy: {
      approvalRequired: true,
      autoPublish: false,
      deleteFromMeta: false,
      substantialRemixRequired: true,
      rightsReviewRequired: true,
      ...(library.policy || {}),
    },
    summary: {
      ...(library.summary || {}),
      candidates: candidates.length,
      reelsLoaded: candidates.filter((entry) => entry.kind === 'reel').length,
      postsLoaded: candidates.filter((entry) => entry.kind === 'post').length,
      shortlisted: candidates.filter((entry) => entry.review?.state === 'shortlist').length,
      skipped: candidates.filter((entry) => entry.review?.state === 'skip').length,
      remixesGenerated: candidates.filter((entry) => entry.remix?.state === 'generated').length,
    },
    candidates,
  };
}

function archiveRemixPrompt(candidate = {}) {
  const kind = candidate.kind === 'reel' ? 'archived Facebook reel' : 'archived Facebook text post';
  const destinationLabels = (candidate.destinations || [])
    .map((lane) => typeof lane === 'string' ? lane : lane.label)
    .filter(Boolean);
  const destinationInstruction = destinationLabels.length
    ? `Draft for the approved review lane${destinationLabels.length === 1 ? '' : 's'}: ${destinationLabels.join(' and ')}. Keep the tone appropriate to each destination and do not claim it was published.`
    : 'Keep the draft destination-neutral until Matthew chooses the fan page or personal profile review lane.';
  const visualInstruction = candidate.kind === 'reel'
    ? 'The source video still needs a real edit. Give a concrete edit plan that adds a new on-camera hook, current commentary or analysis, a changed sequence, verified or replaced audio, and a new cover. Captions, borders, crops, or speed changes alone are not a sufficient transformation.'
    : 'Restructure the idea, add current firsthand context or a new lesson, and do not merely paraphrase sentence by sentence.';
  return `Return one JSON object with exactly these keys: title, hook, caption, editPlan, rightsChecklist. Do not use markdown fences.

Create an approval-gated new angle from this ${kind}. ${destinationInstruction} Matthew authored or uploaded the source, but ownership of every visual, person, and audio track is still unverified. Do not invent facts, performance numbers, current platform behavior, people, permissions, or events. Do not claim the media was remixed yet. Avoid engagement bait, hashtag stuffing, generic inspiration, and stale claims. The caption must sound personal and specific, add material new value, and end with one natural question. Keep it under 1,200 characters. ${visualInstruction}

Original date: ${String(candidate.originalAt || '').slice(0, 10)}
Review flags: ${(candidate.flags || []).join(', ') || 'none recorded'}
Original text: ${String(candidate.originalCaption || '').slice(0, 2400)}`;
}

function parseArchiveRemixJson(value) {
  const source = repairMojibake(value).replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The remix provider did not return a JSON object.');
  let parsed;
  try { parsed = JSON.parse(source.slice(start, end + 1)); }
  catch { throw new Error('The remix provider returned invalid JSON.'); }
  const caption = normalizeHumanPostText(parsed.caption).slice(0, 1200);
  const title = normalizeHumanPostText(parsed.title).replace(/\n+/g, ' ').slice(0, 140);
  const hook = normalizeHumanPostText(parsed.hook).replace(/\n+/g, ' ').slice(0, 280);
  const editPlan = (Array.isArray(parsed.editPlan) ? parsed.editPlan : [])
    .map((entry) => normalizeHumanPostText(entry).replace(/\n+/g, ' ').slice(0, 300))
    .filter(Boolean)
    .slice(0, 8);
  const rightsChecklist = (Array.isArray(parsed.rightsChecklist) ? parsed.rightsChecklist : [])
    .map((entry) => normalizeHumanPostText(entry).replace(/\n+/g, ' ').slice(0, 300))
    .filter(Boolean)
    .slice(0, 8);
  if (caption.length < 40 || !title || !hook || editPlan.length < 2 || rightsChecklist.length < 1) {
    throw new Error('The remix provider returned an incomplete review draft.');
  }
  return { title, hook, caption, editPlan, rightsChecklist };
}

function archiveRemixEditorialFallback(candidate = {}, fallbackReason = 'ai-unavailable') {
  const sourceYear = String(candidate.originalAt || '').slice(0, 4) || 'an earlier year';
  const isReel = candidate.kind === 'reel';
  const title = `Revisit the ${sourceYear} idea with a current lesson`;
  const hook = `I shared this in ${sourceYear}. Here is the part I would explain differently now.`;
  const caption = `This started with something I shared in ${sourceYear}. Instead of reposting it unchanged, I want to revisit the idea with current context: what held up, what I would do differently, and the practical lesson I would pass along today. Before this goes live, I will add the specific firsthand detail that makes the update useful rather than nostalgic. What part of the original idea would you want unpacked next?`;
  const editPlan = isReel
    ? [
      'Record the fresh hook on camera and state the current firsthand lesson before showing any archive footage.',
      'Use only a short excerpt of the source clip, change the sequence, and cut back to new commentary that explains what changed.',
      'Replace the original audio unless current ownership or platform licensing is confirmed.',
      'Make a new vertical cover that presents the current lesson rather than the old performance claim.',
    ]
    : [
      'Open with the fresh hook and replace the generic reflection with one specific current firsthand example.',
      'Restructure the original idea around what held up, what changed, and one practical takeaway.',
      'Use a new visual and caption package rather than copying the archived post presentation.',
    ];
  return {
    title,
    hook,
    caption,
    editPlan,
    rightsChecklist: [
      'Confirm ownership or present-day permission for every visual and recognizable person used.',
      'Confirm or replace every music, voice, and sound track before approval.',
      'Remove private information, stale links, and claims that cannot be verified today.',
    ],
    provider: 'editorial-template',
    model: '',
    fallbackReason,
  };
}

async function generateArchiveRemix(candidate) {
  const prompt = archiveRemixPrompt(candidate);
  const openRouter = await openRouterReplySettings();
  let provider = '';
  let model = '';
  let raw = '';
  let fallbackReason = '';
  if (openRouter.enabled) {
    try {
      provider = 'openrouter';
      model = openRouter.model;
      raw = await openRouterChat([
        { role: 'system', content: 'You are an editorial remix assistant. You preserve facts, ownership uncertainty, privacy, and approval gates.' },
        { role: 'user', content: prompt },
      ], openRouter, { temperature: 0.55, maxTokens: 520, reasoningEffort: 'low', timeoutMs: 60_000 });
    } catch (error) {
      if (!ryzenLocal) throw error;
      fallbackReason = `openrouter-${Number(error.status || 0) || 'unavailable'}`;
      raw = '';
    }
  }
  if (!raw && fallbackReason) return archiveRemixEditorialFallback(candidate, fallbackReason);
  if (!raw && ryzenLocal) {
    try {
      provider = 'ollama-local';
      model = archiveRemixLocalModel;
      const { response, value } = await fetchJsonWithTimeout(`${localOllamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          messages: [
            { role: 'system', content: 'You are an editorial remix assistant. Return strict JSON and preserve facts, rights uncertainty, privacy, and approval gates.' },
            { role: 'user', content: prompt },
          ],
          keep_alive: '15m',
          options: { temperature: 0.45, num_predict: 520 },
        }),
      }, 90_000);
      if (!response.ok) throw new Error(String(value?.error || value?.message || `Local Ollama returned ${response.status}`).slice(0, 500));
      raw = String(value?.message?.content || value?.response || '');
    } catch (error) {
      return archiveRemixEditorialFallback(candidate, `${fallbackReason || 'openrouter-not-enabled'};ollama-${error.name === 'AbortError' ? 'timeout' : 'unavailable'}`);
    }
  } else if (!raw) {
    throw new Error('A review-safe remix provider is not enabled on this Social Desk host.');
  }
  return { ...parseArchiveRemixJson(raw), provider, model, fallbackReason };
}

function normalizeScheduledContentCapture(payload = {}) {
  const observedAt = new Date().toISOString();
  const items = [];
  for (const raw of Array.isArray(payload.items) ? payload.items.slice(0, 500) : []) {
    const scheduled = new Date(raw?.scheduledFor || 0);
    const sourceUrl = String(raw?.sourceUrl || '').trim().slice(0, 1000);
    if (!Number.isFinite(scheduled.valueOf())) continue;
    items.push({
      key: String(raw?.key || createHash('sha256').update(`${scheduled.toISOString()}|${sourceUrl}|${raw?.title || ''}`).digest('hex').slice(0, 20)).slice(0, 100),
      title: repairMojibake(raw?.title || 'Facebook scheduled post').replace(/\s+/g, ' ').trim().slice(0, 240),
      scheduledFor: scheduled.toISOString(),
      sourceUrl,
      observedAt,
    });
  }
  return {
    updatedAt: observedAt,
    sourceUrl: String(payload.sourceUrl || 'https://www.facebook.com/professional_dashboard/content/content_library/?filter=SCHEDULED').slice(0, 1000),
    emptyState: payload.emptyState === true,
    rawCount: Math.max(0, Number(payload.rawCount || items.length)),
    items,
  };
}

function archiveScheduleSummary({ archivePosts, archiveFiles, queue, scheduledLedger, guidanceLedger }) {
  const archiveItems = (queue.items || []).filter((item) => String(item.source || '').startsWith('archive-rotation:'));
  const creatorItems = (queue.items || []).filter((item) => String(item.source || '').startsWith('creator-listen-up:themed:'));
  const future = (queue.items || []).filter((item) => item.scheduledFor && new Date(item.scheduledFor) > new Date() && item.status !== 'rejected');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    archive: {
      files: archiveFiles.length,
      reusablePosts: archivePosts.length,
      alreadyQueued: archiveItems.length,
      available: Math.max(0, archivePosts.length - new Set(archiveItems.map((item) => item.archiveRotation?.sourceKey).filter(Boolean)).size),
    },
    queue: {
      future: future.length,
      archiveDrafts: archiveItems.filter((item) => item.status === 'draft').length,
      creatorListenUpDrafts: creatorItems.filter((item) => item.status === 'draft').length,
    },
    facebook: {
      updatedAt: scheduledLedger.updatedAt || null,
      emptyState: scheduledLedger.emptyState === true,
      scheduled: (scheduledLedger.items || []).length,
      items: (scheduledLedger.items || []).map((item) => ({
        key: item.key,
        title: item.title,
        scheduledFor: item.scheduledFor,
        sourceUrl: item.sourceUrl,
        source: item.source || '',
        target: item.target || '',
        draftId: item.draftId || '',
        graphId: item.graphId || '',
      })),
      sourceUrl: scheduledLedger.sourceUrl || 'https://www.facebook.com/professional_dashboard/content/content_library/?filter=SCHEDULED',
    },
    guidance: {
      captured: currentCreatorGuidance(guidanceLedger).length,
      updatedAt: guidanceLedger.updatedAt || null,
    },
    todayTheme: themeForDate(today),
    nextTheme: themeForDate(tomorrow),
    themes: WEEKLY_THEME_PLAN.map(({ day, key, label }) => ({ day, key, label })),
  };
}

function canonicalFacebookUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!/(^|\.)facebook\.com$/i.test(url.hostname)) return '';
    const profileId = url.pathname === '/profile.php' ? String(url.searchParams.get('id') || '').replace(/\D/g, '') : '';
    const photoId = /^\/photo(?:\.php|\/)?$/i.test(url.pathname) ? String(url.searchParams.get('fbid') || '').replace(/\D/g, '') : '';
    url.protocol = 'https:';
    url.hostname = 'www.facebook.com';
    url.search = '';
    if (profileId) url.searchParams.set('id', profileId);
    if (photoId) {
      url.pathname = '/photo/';
      url.searchParams.set('fbid', photoId);
    }
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return '';
  }
}

function canonicalFacebookCommentUrl(value) {
  const canonical = canonicalFacebookUrl(value);
  if (!canonical) return '';
  try {
    const original = new URL(String(value || '').trim());
    const target = new URL(canonical);
    for (const key of ['comment_id', 'reply_comment_id']) {
      const id = String(original.searchParams.get(key) || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 160);
      if (id) target.searchParams.set(key, id);
    }
    return target.toString();
  } catch {
    return canonical;
  }
}

const audienceAvatarRefreshes = new Map();

function decodeFacebookMetaValue(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function facebookProfileImageFromHtml(html = '') {
  const propertyFirst = String(html).match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const contentFirst = String(html).match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);
  return decodeFacebookMetaValue(propertyFirst?.[1] || contentFirst?.[1] || '');
}

function audienceAvatarContentType(buffer, hint = '') {
  if (buffer?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer?.subarray(0, 4).toString() === 'RIFF' && buffer?.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buffer?.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg';
  return String(hint || '').startsWith('image/') ? String(hint).split(';')[0] : 'application/octet-stream';
}

async function fetchAudienceAvatar(person = {}) {
  const profileUrl = canonicalFacebookUrl(person.url || (person.id ? `https://www.facebook.com/profile.php?id=${person.id}` : ''));
  if (!profileUrl) throw new Error('This audience record has no exact Facebook profile URL.');
  const cacheKey = createHash('sha256').update(String(person.key || profileUrl)).digest('hex');
  const cachePath = join(audienceAvatarCacheDir, `${cacheKey}.bin`);
  const cached = await readFile(cachePath).catch(() => null);
  const cachedStat = cached ? await stat(cachePath).catch(() => null) : null;
  if (cached && cachedStat && Date.now() - cachedStat.mtimeMs < 7 * 86_400_000) {
    return { buffer: cached, type: audienceAvatarContentType(cached) };
  }
  if (audienceAvatarRefreshes.has(cacheKey)) return audienceAvatarRefreshes.get(cacheKey);
  const refresh = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const profileResponse = await fetch(profileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,application/xhtml+xml' },
        signal: controller.signal,
      });
      if (!profileResponse.ok) throw new Error(`Facebook profile returned ${profileResponse.status}.`);
      const imageUrl = facebookProfileImageFromHtml(await profileResponse.text());
      if (!/^https:\/\/[^/]*fbcdn\.net\//i.test(imageUrl)) throw new Error('Facebook did not expose a public profile image.');
      const imageResponse = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.facebook.com/' },
        signal: controller.signal,
      });
      if (!imageResponse.ok) throw new Error(`Facebook profile image returned ${imageResponse.status}.`);
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new Error('Facebook profile image was empty or too large.');
      const type = audienceAvatarContentType(buffer, imageResponse.headers.get('content-type') || '');
      if (!type.startsWith('image/')) throw new Error('Facebook returned a non-image profile asset.');
      await mkdir(audienceAvatarCacheDir, { recursive: true });
      const temporaryPath = `${cachePath}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, buffer);
      await rename(temporaryPath, cachePath);
      return { buffer, type };
    } catch (error) {
      if (cached) return { buffer: cached, type: audienceAvatarContentType(cached) };
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();
  audienceAvatarRefreshes.set(cacheKey, refresh);
  try {
    return await refresh;
  } finally {
    audienceAvatarRefreshes.delete(cacheKey);
  }
}

function facebookIdFromUrl(value) {
  try {
    const url = new URL(value);
    return url.pathname === '/profile.php' ? String(url.searchParams.get('id') || '').replace(/\D/g, '') : '';
  } catch {
    return '';
  }
}

function canonicalFacebookSourceUrl(value) {
  const canonical = canonicalFacebookUrl(value);
  if (!canonical) return '';
  try {
    const original = new URL(String(value || '').trim());
    const normalized = new URL(canonical);
    if (/^\/groups\/.+\/posts\//i.test(normalized.pathname)) {
      const commentId = String(original.searchParams.get('comment_id') || '').replace(/\D/g, '');
      if (commentId) normalized.searchParams.set('comment_id', commentId);
    }
    return normalized.toString();
  } catch {
    return canonical;
  }
}

function matchesExactFacebookIdentity(record, actorId, actorUrl) {
  const recordId = String(record?.actorId || record?.id || facebookIdFromUrl(record?.actorUrl || record?.url || '')).replace(/\D/g, '');
  const recordUrl = canonicalFacebookUrl(record?.actorUrl || record?.url || '');
  return Boolean((actorId && recordId && actorId === recordId) || (actorUrl && recordUrl && actorUrl === recordUrl));
}

function findExactFacebookRecord(records, actorId, actorUrl) {
  return (records || []).find((record) => matchesExactFacebookIdentity(record, actorId, actorUrl)) || null;
}

function normalizeEngagementNote(rawNote) {
  const actorUrl = canonicalFacebookUrl(rawNote?.actorUrl || '');
  const actorId = String(rawNote?.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
  const actorName = repairMojibake(rawNote?.actorName || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const note = repairMojibake(rawNote?.note || '').replace(/\r\n?/g, '\n').trim().slice(0, 1000);
  const identityKey = actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
  return identityKey ? { identityKey, actorId, actorUrl, actorName, note } : null;
}

function inviteCandidateIdentityKey(candidate) {
  const actorUrl = canonicalFacebookUrl(candidate?.actorUrl || '');
  const actorId = String(candidate?.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
  return actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
}

function inviteCandidateScope(value) {
  return ['own-profile', 'own-group-post', 'own-group-comment'].includes(value) ? value : 'own-profile';
}

function normalizeInviteCandidate(rawCandidate) {
  const actorUrl = canonicalFacebookUrl(rawCandidate?.actorUrl);
  const actorId = String(rawCandidate?.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
  const actorName = repairMojibake(rawCandidate?.actorName).replace(/\s+/g, ' ').trim().slice(0, 160);
  const identityKey = actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
  if (!identityKey || !actorName) return null;
  const foundAt = /^\d{4}-\d{2}-\d{2}T/.test(String(rawCandidate?.foundAt || ''))
    ? new Date(rawCandidate.foundAt).toISOString()
    : new Date().toISOString();
  return {
    identityKey,
    actorId,
    actorUrl,
    actorName,
    contentScope: inviteCandidateScope(rawCandidate?.contentScope),
    postUrl: canonicalFacebookSourceUrl(rawCandidate?.postUrl),
    sourceUrl: canonicalFacebookSourceUrl(rawCandidate?.sourceUrl),
    inviteAvailable: rawCandidate?.inviteAvailable === true,
    status: ['review', 'source-opened', 'attempted', 'sent'].includes(rawCandidate?.status) ? rawCandidate.status : 'review',
    foundAt,
  };
}

function mergeInviteCandidate(existing, incoming) {
  const sourceKey = `${incoming.contentScope}|${incoming.postUrl || incoming.sourceUrl}`;
  const sources = Array.isArray(existing?.sources) ? [...existing.sources] : [];
  if ((incoming.postUrl || incoming.sourceUrl) && !sources.some((source) => `${source.contentScope}|${source.postUrl || source.sourceUrl}` === sourceKey)) {
    sources.push({
      contentScope: incoming.contentScope,
      postUrl: incoming.postUrl,
      sourceUrl: incoming.sourceUrl,
      foundAt: incoming.foundAt,
      inviteAvailable: incoming.inviteAvailable,
    });
  }
  const status = existing?.status === 'sent' ? 'sent' : incoming.status === 'sent' ? 'sent' : incoming.status || existing?.status || 'review';
  return {
    ...(existing || {}),
    ...incoming,
    actorId: incoming.actorId || existing?.actorId || '',
    actorUrl: incoming.actorUrl || existing?.actorUrl || '',
    actorName: incoming.actorName || existing?.actorName || '',
    inviteAvailable: incoming.inviteAvailable || existing?.inviteAvailable === true,
    status,
    firstSeenAt: existing?.firstSeenAt || incoming.foundAt,
    updatedAt: new Date().toISOString(),
    sources: sources.slice(-20),
  };
}

async function saveInviteCandidates(rawCandidates) {
  const ledger = await readJson(inviteCandidateLedgerFile);
  const byIdentity = new Map((ledger.candidates || []).map((candidate) => [inviteCandidateIdentityKey(candidate), candidate]).filter(([key]) => key));
  let accepted = 0;
  for (const rawCandidate of Array.isArray(rawCandidates) ? rawCandidates.slice(0, 500) : []) {
    const candidate = normalizeInviteCandidate(rawCandidate);
    if (!candidate) continue;
    byIdentity.set(candidate.identityKey, mergeInviteCandidate(byIdentity.get(candidate.identityKey), candidate));
    accepted += 1;
  }
  ledger.candidates = [...byIdentity.values()]
    .sort((left, right) => new Date(left.updatedAt || left.foundAt || 0) - new Date(right.updatedAt || right.foundAt || 0))
    .slice(-10000);
  ledger.updatedAt = new Date().toISOString();
  await writeJson(inviteCandidateLedgerFile, ledger);
  return { ledger, accepted };
}

async function markInviteCandidate(identityKey, status, invite = {}) {
  const ledger = await readJson(inviteCandidateLedgerFile);
  const candidate = (ledger.candidates || []).find((item) => inviteCandidateIdentityKey(item) === identityKey);
  if (!candidate) return;
  candidate.status = status;
  candidate.actionAt = invite.actionAt || new Date().toISOString();
  candidate.updatedAt = new Date().toISOString();
  candidate.inviteId = invite.id || candidate.inviteId || '';
  ledger.updatedAt = candidate.updatedAt;
  await writeJson(inviteCandidateLedgerFile, ledger);
}

function normalizeBirthdayPerson(rawPerson) {
  const actorUrl = canonicalFacebookUrl(rawPerson?.actorUrl);
  const actorId = String(rawPerson?.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
  const actorName = repairMojibake(rawPerson?.actorName).replace(/\s+/g, ' ').trim().slice(0, 160);
  const identityKey = actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
  let profileUrl;
  try { profileUrl = new URL(actorUrl); } catch { profileUrl = null; }
  const profilePath = profileUrl?.pathname || '';
  const usernameParts = profilePath.split('/').filter(Boolean);
  const exactProfile = profilePath === '/profile.php' ? Boolean(actorId) : usernameParts.length === 1 && /^[A-Za-z0-9._-]+$/.test(usernameParts[0]);
  if (!identityKey || !actorName || !exactProfile || /^(?:view post|message|facebook)$/i.test(actorName)) return null;
  const foundAt = /^\d{4}-\d{2}-\d{2}T/.test(String(rawPerson?.foundAt || '')) ? new Date(rawPerson.foundAt).toISOString() : new Date().toISOString();
  const birthdayText = repairMojibake(rawPerson?.birthdayText).replace(/\s+/g, ' ').trim().slice(0, 300);
  const assumeReferenceDate = !new RegExp(`(?:${birthdayFacts.MONTHS.join('|')})\\s*\\d{1,2}`, 'i').test(`${rawPerson?.monthDay || ''} ${birthdayText}`)
    && /^https:\/\/www\.facebook\.com\/(?:friends\/birthdays|notifications)\/?$/i.test(String(rawPerson?.sourceUrl || ''))
    && /\b(?:happy birthday|birthday (?:is )?today|has (?:a )?birthday today)\b/i.test(birthdayText)
    && !/\byou wished\b/i.test(birthdayText);
  const parsed = parseBirthdayFacts(`${rawPerson?.monthDay || ''} ${birthdayText}`, { now: new Date(foundAt), assumeReferenceDate });
  const birthYear = rawPerson?.birthYear === null || rawPerson?.birthYear === '' || rawPerson?.birthYear === undefined ? Number.NaN : Number(rawPerson.birthYear);
  const age = rawPerson?.age === null || rawPerson?.age === '' || rawPerson?.age === undefined ? Number.NaN : Number(rawPerson.age);
  const normalizedBirthYear = Number.isInteger(birthYear) && birthYear >= 1900 && birthYear <= new Date(foundAt).getFullYear() ? birthYear : parsed.birthYear;
  const normalizedAge = Number.isInteger(age) && age >= 0 && age < 125 ? age : parsed.age;
  const monthDay = parseBirthdayFacts(rawPerson?.monthDay, { now: new Date(foundAt) }).monthDay || parsed.monthDay;
  return {
    identityKey,
    actorId,
    actorUrl,
    actorName,
    monthDay,
    birthYear: normalizedBirthYear,
    age: normalizedAge,
    birthDate: monthDay && normalizedBirthYear ? `${monthDay}, ${normalizedBirthYear}` : monthDay,
    birthdayText,
    sourceUrl: canonicalFacebookUrl(rawPerson?.sourceUrl),
    foundAt,
  };
}

async function saveBirthdayPeople(rawPeople) {
  const ledger = await readJson(birthdayLedgerFile);
  const byIdentity = new Map();
  for (const rawPerson of ledger.people || []) {
    const person = normalizeBirthdayPerson(rawPerson);
    if (!person) continue;
    const existing = byIdentity.get(person.identityKey) || {};
    byIdentity.set(person.identityKey, {
      ...existing,
      ...rawPerson,
      ...person,
      monthDay: person.monthDay || existing.monthDay || '',
      birthYear: person.birthYear || existing.birthYear || null,
      age: Number.isInteger(person.age) ? person.age : existing.age ?? null,
      birthDate: person.birthDate || existing.birthDate || '',
      firstSeenAt: rawPerson.firstSeenAt || existing.firstSeenAt || person.foundAt,
      lastSeenAt: rawPerson.lastSeenAt || person.foundAt,
    });
  }
  let accepted = 0;
  for (const rawPerson of Array.isArray(rawPeople) ? rawPeople.slice(0, 500) : []) {
    const person = normalizeBirthdayPerson(rawPerson);
    if (!person) continue;
    const existing = byIdentity.get(person.identityKey) || {};
    byIdentity.set(person.identityKey, {
      ...existing,
      ...person,
      monthDay: person.monthDay || existing.monthDay || '',
      birthYear: person.birthYear || existing.birthYear || null,
      age: Number.isInteger(person.age) ? person.age : existing.age ?? null,
      birthDate: person.birthDate || existing.birthDate || '',
      firstSeenAt: existing.firstSeenAt || person.foundAt,
      lastSeenAt: person.foundAt,
    });
    accepted += 1;
  }
  const attemptedAt = new Date().toISOString();
  ledger.people = [...byIdentity.values()].sort((left, right) => String(left.monthDay || '').localeCompare(String(right.monthDay || '')) || String(left.actorName).localeCompare(String(right.actorName))).slice(-20000);
  ledger.lastAttemptAt = attemptedAt;
  if (accepted > 0) ledger.updatedAt = attemptedAt;
  await writeJson(birthdayLedgerFile, ledger);
  return { ledger, accepted };
}

function normalizeBirthdayWish(rawWish) {
  const profile = exactBirthdayProfile(rawWish);
  const birthdayDateKey = String(rawWish?.birthdayDateKey || '').trim();
  const status = ['attempted', 'sent'].includes(String(rawWish?.status || '')) ? String(rawWish.status) : '';
  const message = repairMojibake(rawWish?.message).replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!profile || !/^\d{4}-\d{2}-\d{2}$/.test(birthdayDateKey) || !status || !/\bhappy birthday\b/i.test(message)) return null;
  const actionAt = /^\d{4}-\d{2}-\d{2}T/.test(String(rawWish?.actionAt || rawWish?.attemptedAt || ''))
    ? new Date(rawWish.actionAt || rawWish.attemptedAt).toISOString()
    : new Date().toISOString();
  const confirmedAt = status === 'sent'
    ? (/^\d{4}-\d{2}-\d{2}T/.test(String(rawWish?.confirmedAt || '')) ? new Date(rawWish.confirmedAt).toISOString() : actionAt)
    : null;
  return {
    id: String(rawWish?.id || randomUUID()),
    wishKey: `${profile.identityKey}|${birthdayDateKey}`,
    ...profile,
    birthdayDateKey,
    monthDay: parseBirthdayFacts(rawWish?.monthDay, { now: new Date(actionAt) }).monthDay || '',
    message,
    sourceUrl: /^https:\/\/www\.facebook\.com\/friends\/birthdays\/?$/i.test(String(rawWish?.sourceUrl || ''))
      ? 'https://www.facebook.com/friends/birthdays'
      : '',
    status,
    attemptedAt: actionAt,
    actionAt,
    confirmedAt,
    error: repairMojibake(rawWish?.error).replace(/\s+/g, ' ').trim().slice(0, 500),
  };
}

function birthdayWishSummary(ledger, now = new Date()) {
  const wishes = Array.isArray(ledger?.wishes) ? ledger.wishes : [];
  const today = localDateKey(now);
  return {
    total: wishes.length,
    sent: wishes.filter((wish) => wish.status === 'sent').length,
    attempted: wishes.filter((wish) => wish.status === 'attempted').length,
    sentToday: wishes.filter((wish) => wish.status === 'sent'
      && localDateKey(new Date(wish.confirmedAt || wish.actionAt || 0)) === today).length,
  };
}

async function saveBirthdayWish(rawWish) {
  const wish = normalizeBirthdayWish(rawWish);
  if (!wish) throw new Error('An exact Facebook identity, birthday date, and Facebook-prefilled greeting are required.');
  const ledger = await readJson(birthdayWishLedgerFile);
  const wishes = Array.isArray(ledger.wishes) ? ledger.wishes : [];
  const index = wishes.findIndex((entry) => entry.wishKey === wish.wishKey);
  let saved;
  if (index >= 0) {
    const existing = wishes[index];
    const keepSent = existing.status === 'sent' && wish.status !== 'sent';
    saved = {
      ...existing,
      ...wish,
      id: existing.id || wish.id,
      firstAttemptedAt: existing.firstAttemptedAt || existing.attemptedAt || wish.attemptedAt,
      status: keepSent ? existing.status : wish.status,
      confirmedAt: keepSent ? existing.confirmedAt : wish.confirmedAt || existing.confirmedAt || null,
    };
    wishes[index] = saved;
  } else {
    saved = { ...wish, firstAttemptedAt: wish.attemptedAt };
    wishes.push(saved);
  }
  ledger.wishes = wishes
    .sort((left, right) => new Date(left.actionAt || 0) - new Date(right.actionAt || 0))
    .slice(-20000);
  ledger.updatedAt = new Date().toISOString();
  await writeJson(birthdayWishLedgerFile, ledger);
  return { ledger, wish: saved, duplicate: index >= 0 };
}

function exactBirthdayProfile(person) {
  const actorUrl = canonicalFacebookUrl(person?.actorUrl);
  const actorId = String(person?.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
  const actorName = repairMojibake(person?.actorName).replace(/\s+/g, ' ').trim().slice(0, 160);
  if ((!actorId && !actorUrl) || !actorName) return null;
  return {
    identityKey: actorId ? `facebook-id:${actorId}` : `facebook-url:${actorUrl}`,
    actorId,
    actorUrl: actorUrl || `https://www.facebook.com/profile.php?id=${actorId}`,
    actorName,
  };
}

function birthdayDistanceDays(monthDay, now = new Date()) {
  const facts = parseBirthdayFacts(monthDay, { now });
  if (!facts.monthDay) return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${facts.monthDay}, ${now.getFullYear()} 12:00:00`);
  if (Number.isNaN(parsed.valueOf())) return Number.POSITIVE_INFINITY;
  return Math.min(...[-1, 0, 1].map((offset) => {
    const candidate = new Date(parsed);
    candidate.setFullYear(now.getFullYear() + offset);
    return Math.abs(candidate.valueOf() - now.valueOf()) / 86400000;
  }));
}

async function queueBirthdayProfilesForRyzen(birthdayLedger, now = new Date()) {
  const candidates = (birthdayLedger.people || []).filter((person) => {
    const profile = exactBirthdayProfile(person);
    if (!profile) return false;
    const reviewedAt = Date.parse(person.profileReview?.checkedAt || '');
    if (Number.isFinite(reviewedAt) && now.valueOf() - reviewedAt < 30 * 86400000) return false;
    const queuedAt = Date.parse(person.priorityReviewQueuedAt || '');
    return !Number.isFinite(queuedAt) || now.valueOf() - queuedAt >= 2 * 86400000;
  }).sort((left, right) => birthdayDistanceDays(left.monthDay, now) - birthdayDistanceDays(right.monthDay, now)
    || String(left.actorName).localeCompare(String(right.actorName)));
  let queued = 0;
  const errors = [];
  let changed = false;
  for (const person of candidates.slice(0, 10)) {
    const profile = exactBirthdayProfile(person);
    const requestedAt = new Date().toISOString();
    try {
      await sendAudiencePriorityToRyzen({
        id: randomUUID(),
        type: 'facebook-audience-profile-priority',
        source: 'personal-social-birthday-priority',
        requestedBy: 'personal-social-desk',
        priority: 1200,
        reason: 'Exact Facebook Birthday Center profile awaiting creator/category review for today’s birthday post.',
        actorId: profile.actorId,
        actorUrl: profile.actorUrl,
        actorName: profile.actorName,
        createdAt: requestedAt,
      });
      person.priorityReviewQueuedAt = requestedAt;
      person.priorityReviewState = 'queued';
      person.priorityReviewError = '';
      queued += 1;
      changed = true;
    } catch (error) {
      person.priorityReviewState = 'retrying';
      person.priorityReviewError = String(error.message || error).slice(0, 500);
      errors.push({ identityKey: profile.identityKey, error: person.priorityReviewError });
      changed = true;
    }
  }
  if (changed) {
    birthdayLedger.updatedAt = new Date().toISOString();
    await writeJson(birthdayLedgerFile, birthdayLedger);
  }
  return { queued, errors };
}

function applyBirthdayFactsToAudience(audience, birthdayLedger) {
  const byId = new Map((audience.people || []).filter((person) => person.id).map((person) => [String(person.id), person]));
  const byUrl = new Map((audience.people || []).filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
  let matched = 0;
  for (const birthday of birthdayLedger.people || []) {
    const actorId = String(birthday.actorId || '').replace(/\D/g, '');
    const actorUrl = canonicalFacebookUrl(birthday.actorUrl);
    const person = (actorId && byId.get(actorId)) || (actorUrl && byUrl.get(actorUrl));
    if (!person) continue;
    const next = {
      monthDay: birthday.monthDay || '',
      birthYear: birthday.birthYear || null,
      age: Number.isInteger(birthday.age) ? birthday.age : null,
      birthDate: birthday.birthDate || (birthday.monthDay && birthday.birthYear ? `${birthday.monthDay}, ${birthday.birthYear}` : birthday.monthDay || ''),
      source: 'facebook-birthday-center',
      observedAt: birthday.lastSeenAt || birthday.foundAt || birthdayLedger.updatedAt || null,
    };
    if (JSON.stringify(person.facebookBirthday || {}) === JSON.stringify(next)) continue;
    person.facebookBirthday = next;
    matched += 1;
  }
  if (matched) audience.importedAt = audience.importedAt || new Date().toISOString();
  return matched;
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nextBirthdaySchedule(queue, now = new Date()) {
  const occupied = (queue.items || []).filter((item) => item.scheduledFor && item.status !== 'rejected')
    .map((item) => new Date(item.scheduledFor).valueOf()).filter(Number.isFinite);
  for (const [hour, minute] of [[10, 30], [14, 0], [16, 30], [21, 0]]) {
    const candidate = new Date(now);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate <= new Date(now.valueOf() + 30 * 60_000)) continue;
    if (occupied.every((time) => Math.abs(time - candidate.valueOf()) >= 90 * 60_000)) return candidate.toISOString();
  }
  const fallback = new Date(now.valueOf() + 45 * 60_000);
  fallback.setMinutes(Math.ceil(fallback.getMinutes() / 15) * 15, 0, 0);
  if (localDateKey(fallback) === localDateKey(now) && fallback.getHours() < 23
    && occupied.every((time) => Math.abs(time - fallback.valueOf()) >= 60 * 60_000)) return fallback.toISOString();
  return null;
}

function birthdayCreatorTargets(birthdayLedger, audience, now = new Date()) {
  const today = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const audienceIndex = engagementAudienceIndex(audience);
  const targets = [];
  for (const birthday of birthdayLedger.people || []) {
    if (!sameBirthdayMonthDay(birthday.monthDay, today)) continue;
    if (Number.isInteger(birthday.age) && birthday.age < 18) continue;
    const profile = exactBirthdayProfile(birthday);
    if (!profile) continue;
    const audiencePerson = (profile.actorId && audienceIndex.byId.get(profile.actorId)) || audienceIndex.byUrl.get(profile.actorUrl) || null;
    if (engagementTargetBlocked(audiencePerson)) continue;
    const review = birthday.profileReview || {};
    const observation = review.publicObservation || {};
    const profileState = String(review.profileState || '').toLowerCase();
    if (['minor-review', 'minor-blocked', 'memorial-review', 'memorialized', 'deceased'].includes(profileState)) continue;
    const category = String(observation.publicFacts?.category || audiencePerson?.profileObservation?.publicFacts?.category || '').trim();
    const creatorSignals = Array.isArray(observation.creatorSignals) ? observation.creatorSignals : [];
    const creator = creatorSignalForPerson(audiencePerson) || /\b(?:creator|author)\b/i.test(category) || creatorSignals.length > 0;
    if (!creator) continue;
    if (review.checkedAt && observation.accessible !== true && !creatorSignalForPerson(audiencePerson)) continue;
    targets.push({
      name: repairMojibake(audiencePerson?.name || profile.actorName).trim(),
      url: profile.actorUrl,
      reason: `Facebook Birthday Center shows ${birthday.monthDay}; exact profile has ${category || 'a captured creator signal'}.`,
    });
  }
  return normalizeTagTargets([...new Map(targets.map((target) => [target.url, target])).values()].slice(0, 20));
}

async function ensureBirthdayCreatorDraft(birthdayLedger = null, audience = null, now = new Date()) {
  const [ledger, roster, queue] = await Promise.all([
    birthdayLedger ? Promise.resolve(birthdayLedger) : readJson(birthdayLedgerFile),
    audience ? Promise.resolve(audience) : readJson(audienceFile),
    readJson(queueFile),
  ]);
  const dateKey = localDateKey(now);
  const source = `audience-engagement:creator-birthdays:${dateKey}`;
  const targets = birthdayCreatorTargets(ledger, roster, now);
  const existing = (queue.items || []).find((item) => item.source === source);
  if (!targets.length) return { created: false, updated: false, targets: 0, item: existing || null };
  if (existing && existing.status !== 'draft') return { created: false, updated: false, targets: targets.length, item: existing };
  const item = existing || { id: randomUUID(), status: 'draft', media: [], createdAt: new Date().toISOString(), source };
  Object.assign(item, {
    title: `Creator birthdays — ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
    body: 'These creators have birthdays today—give them some love! 🎂\n\nIf you are tagged, tell us what you create and what you are working on next. Everyone else, stop by their profile and wish them a happy birthday.\n\n— Matthew Murphy\n\n#CreatorsListenUp #CreatorBirthdays #DigitalCreators',
    target: 'matthew-page',
    format: 'feed',
    scheduledFor: item.scheduledFor || nextBirthdaySchedule(queue, now),
    notes: 'Daily review-only birthday post. Every tag has an exact Birthday Center profile plus a captured creator/category signal. Age is not required. Approve before dispatch.',
    tagTargets: targets,
    birthdayPost: { dateKey, selectedTargets: targets.length, rebuiltAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  });
  if (!existing) queue.items.unshift(item);
  await writeJson(queueFile, queue);
  return { created: !existing, updated: Boolean(existing), targets: targets.length, item };
}

function canonicalFacebookMessageThreadUrl(value) {
  const canonical = canonicalFacebookUrl(value);
  if (!canonical) return '';
  try {
    const url = new URL(canonical);
    const match = url.pathname.match(/^\/messages\/(e2ee\/)?t\/([A-Za-z0-9._-]+)\/?$/i);
    return match ? `https://www.facebook.com/messages/${match[1] || ''}t/${match[2]}` : '';
  } catch {
    return '';
  }
}

function normalizeMessageActorName(value) {
  const name = repairMojibake(value)
    .replace(/\s+/g, ' ')
    .replace(/^(?:Chat|Conversation|Open chat) with\s+/i, '')
    .replace(/^(?:New message|Message) from\s+/i, '')
    .replace(/^Profile picture of\s+/i, '')
    .replace(/(?:'s)?\s+(?:profile picture|avatar)$/i, '')
    .trim()
    .slice(0, 160);
  const letters = (name.match(/\p{L}/gu) || []).length;
  const interfaceText = /^(?:Chats?|Messages?|Messenger|Marketplace|New notification(?: in settings)?|Notifications?|Settings|Search|More|Details|Conversation information|Chat information|Active(?: now| \d+\s*(?:m|h) ago)?|Sent|Delivered|Seen|Follow up\?|Unread message:?|End-to-end encrypted)$/i;
  if (letters < 2 || interfaceText.test(name) || /^(?:You:|You sent\b|You replied\b)/i.test(name)) return '';
  return name;
}

function normalizeMessageThread(rawThread) {
  const threadUrl = canonicalFacebookMessageThreadUrl(rawThread?.threadUrl || rawThread?.sourceUrl);
  const threadId = threadUrl ? new URL(threadUrl).pathname.split('/').filter(Boolean).at(-1) : '';
  const identitySource = rawThread?.identitySource === 'active-message-profile-link' ? 'active-message-profile-link' : '';
  let actorUrl = identitySource ? canonicalFacebookUrl(rawThread?.actorUrl) : '';
  if (actorUrl && /^\/messages(?:\/|$)/i.test(new URL(actorUrl).pathname)) actorUrl = '';
  const actorId = identitySource ? String(rawThread?.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '') : '';
  const actorName = normalizeMessageActorName(rawThread?.actorName);
  const identityKey = actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
  const threadKey = threadId ? `facebook-thread:${threadId}` : identityKey ? `facebook-message:${identityKey}` : '';
  if (!threadKey) return null;
  const rawPreview = repairMojibake(rawThread?.lastPreview).replace(/\s+/g, ' ').trim();
  const byYou = rawPreview.match(/\bby You:\s*(.+)$/i);
  const lastPreview = repairMojibake(byYou?.[1] || rawPreview).replace(/\s+/g, ' ').trim().slice(0, 500);
  const explicitOutbound = /^(?:You:|You sent\b|You replied\b)/i.test(lastPreview) || Boolean(byYou);
  const direction = explicitOutbound ? 'outbound' : ['inbound', 'outbound', 'unknown'].includes(rawThread?.lastDirection) ? rawThread.lastDirection : 'unknown';
  const capturedAt = /^\d{4}-\d{2}-\d{2}T/.test(String(rawThread?.capturedAt || ''))
    ? new Date(rawThread.capturedAt).toISOString()
    : new Date().toISOString();
  const lastMessageAt = /^\d{4}-\d{2}-\d{2}T/.test(String(rawThread?.lastMessageAt || ''))
    ? new Date(rawThread.lastMessageAt).toISOString()
    : null;
  const rawMessageLabel = repairMojibake(rawThread?.lastMessageLabel).replace(/\s+/g, ' ').trim();
  const clockLabel = rawMessageLabel.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i)?.[0] || '';
  const lastMessageLabel = /\b(?:message sent|by You:)\b/i.test(rawMessageLabel) && clockLabel ? clockLabel : rawMessageLabel.slice(0, 120);
  const unread = rawThread?.unread === true;
  return {
    threadKey,
    threadId,
    threadUrl,
    identityKey,
    actorId,
    actorUrl,
    actorName,
    identitySource,
    lastDirection: direction,
    lastPreview,
    lastMessageAt,
    lastMessageLabel,
    unread,
    needsReply: unread || direction === 'inbound',
    source: 'personal-social-chrome-extension',
    capturedAt,
  };
}

async function saveMessageThreads(rawThreads) {
  const ledger = await readJson(messageLedgerFile);
  const byThread = new Map((ledger.threads || []).map((thread) => [thread.threadKey, thread]).filter(([key]) => key));
  let accepted = 0;
  for (const rawThread of Array.isArray(rawThreads) ? rawThreads.slice(0, 500) : []) {
    const thread = normalizeMessageThread(rawThread);
    if (!thread) continue;
    const existing = byThread.get(thread.threadKey) || {};
    byThread.set(thread.threadKey, {
      ...existing,
      ...thread,
      identityKey: thread.identityKey || existing.identityKey || '',
      actorId: thread.actorId || existing.actorId || '',
      actorUrl: thread.actorUrl || existing.actorUrl || '',
      actorName: thread.actorName || existing.actorName || '',
      identitySource: thread.identitySource || existing.identitySource || '',
      lastDirection: thread.lastDirection === 'unknown' ? existing.lastDirection || 'unknown' : thread.lastDirection,
      lastPreview: thread.lastPreview || existing.lastPreview || '',
      lastMessageAt: thread.lastMessageAt || existing.lastMessageAt || null,
      lastMessageLabel: thread.lastMessageLabel || existing.lastMessageLabel || '',
      firstSeenAt: existing.firstSeenAt || thread.capturedAt,
      lastSeenAt: thread.capturedAt,
    });
    accepted += 1;
  }
  ledger.threads = [...byThread.values()]
    .sort((left, right) => new Date(right.lastMessageAt || right.lastSeenAt || 0) - new Date(left.lastMessageAt || left.lastSeenAt || 0))
    .slice(0, 20_000);
  ledger.updatedAt = new Date().toISOString();
  await writeJson(messageLedgerFile, ledger);
  return { ledger, accepted };
}

function buildMessageInbox(ledger, audience) {
  const byId = new Map((audience.people || []).filter((person) => person.id).map((person) => [String(person.id), person]));
  const byUrl = new Map((audience.people || []).filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
  const threads = (ledger.threads || []).map((thread) => {
    const normalized = normalizeMessageThread(thread) || thread;
    thread = { ...thread, ...normalized };
    const person = (thread.actorId && byId.get(String(thread.actorId))) || (thread.actorUrl && byUrl.get(canonicalFacebookUrl(thread.actorUrl))) || null;
    const actorId = String(person?.id || thread.actorId || '').replace(/\D/g, '');
    const actorUrl = canonicalFacebookUrl(person?.url || thread.actorUrl || '') || (actorId ? `https://www.facebook.com/profile.php?id=${actorId}` : '');
    const exactIdentity = Boolean(thread.identitySource && (actorId || actorUrl));
    return {
      ...thread,
      actorId,
      actorUrl,
      identityKey: actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '',
      actorName: person?.name || thread.actorName || 'Facebook conversation',
      exactIdentity,
      follower: Boolean(person),
      friend: person?.friend === true,
      engagementCounted: exactIdentity && Boolean(thread.engagementEventKey),
    };
  });
  const exactPeople = new Set(threads.filter((thread) => thread.exactIdentity).map((thread) => thread.identityKey)).size;
  return {
    updatedAt: ledger.updatedAt || null,
    summary: {
      threads: threads.length,
      unread: threads.filter((thread) => thread.unread).length,
      needsReply: threads.filter((thread) => thread.needsReply).length,
      exactPeople,
      matchedFollowers: threads.filter((thread) => thread.follower).length,
      unresolvedIdentity: threads.filter((thread) => !thread.exactIdentity).length,
      engagementCounted: threads.filter((thread) => thread.engagementCounted).length,
    },
    threads,
  };
}

function messageEngagementFingerprint(thread) {
  const preview = repairMojibake(thread?.lastPreview || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  const timestamp = /^\d{4}-\d{2}-\d{2}T/.test(String(thread?.lastMessageAt || '')) ? String(thread.lastMessageAt) : '';
  if (!preview && !timestamp) return '';
  return createHash('sha256').update(`${thread.threadKey}|${timestamp}|${preview}`).digest('hex');
}

async function recordMessageEngagement(messageLedger) {
  const candidates = (messageLedger.threads || []).filter((thread) => thread.identitySource === 'active-message-profile-link' && thread.lastDirection === 'inbound');
  if (!candidates.length) return { added: 0, matched: 0 };
  const [engagementLedger, audience] = await Promise.all([readJson(engagementLedgerFile), readJson(audienceFile)]);
  const knownEvents = new Map((engagementLedger.events || []).map((event) => [event.eventKey, event]).filter(([key]) => key));
  const byId = new Map((audience.people || []).filter((person) => person.id).map((person) => [String(person.id), person]));
  const byUrl = new Map((audience.people || []).filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
  const capturedAt = new Date().toISOString();
  const newEvents = [];
  let matched = 0;
  let annotated = false;
  for (const thread of candidates) {
    const person = (thread.actorId && byId.get(String(thread.actorId))) || (thread.actorUrl && byUrl.get(canonicalFacebookUrl(thread.actorUrl))) || null;
    const actorId = String(person?.id || thread.actorId || '').replace(/\D/g, '');
    const actorUrl = canonicalFacebookUrl(person?.url || thread.actorUrl || '') || (actorId ? `https://www.facebook.com/profile.php?id=${actorId}` : '');
    const actorName = repairMojibake(person?.name || thread.actorName || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const messageFingerprint = messageEngagementFingerprint(thread);
    if ((!actorId && !actorUrl) || !actorName || !messageFingerprint) continue;
    const event = {
      actorId,
      actorUrl,
      actorName,
      type: 'message',
      text: '',
      messageFingerprint,
      postUrl: '',
      source: 'messages',
      contentScope: 'private-message',
      sourceUrl: thread.threadUrl,
      occurredAt: thread.lastMessageAt || null,
      capturedAt,
    };
    event.eventKey = engagementEventKey(event);
    const existingEvent = knownEvents.get(event.eventKey);
    if (!existingEvent) {
      knownEvents.set(event.eventKey, event);
      newEvents.push(event);
    }
    if (person) matched += 1;
    thread.actorId = actorId;
    thread.actorUrl = actorUrl;
    thread.identityKey = actorId ? `facebook-id:${actorId}` : `facebook-url:${actorUrl}`;
    thread.engagementEventKey = event.eventKey;
    thread.engagementRecordedAt = existingEvent?.capturedAt || capturedAt;
    annotated = true;
  }
  if (newEvents.length) {
    engagementLedger.events = [...(engagementLedger.events || []), ...newEvents].slice(-100000);
    engagementLedger.updatedAt = capturedAt;
    audience.importedAt = capturedAt;
    const queue = await readJson(queueFile);
    applyEngagementLedger(audience, engagementLedger, queue);
    await Promise.all([writeJson(engagementLedgerFile, engagementLedger), writeJson(audienceFile, audience)]);
  }
  if (annotated) await writeJson(messageLedgerFile, messageLedger);
  return { added: newEvents.length, matched };
}

function exactMessageProfile(thread) {
  if (thread?.identitySource !== 'active-message-profile-link') return null;
  const actorUrl = canonicalFacebookUrl(thread.actorUrl);
  const actorId = String(thread.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
  const actorName = repairMojibake(thread.actorName).replace(/\s+/g, ' ').trim().slice(0, 160);
  if ((!actorId && !actorUrl) || !actorName) return null;
  return {
    identityKey: actorId ? `facebook-id:${actorId}` : `facebook-url:${actorUrl}`,
    actorId,
    actorUrl: actorUrl || `https://www.facebook.com/profile.php?id=${actorId}`,
    actorName,
  };
}

async function queueVerifiedMessageProfilesForRyzen(messageLedger) {
  const completed = new Set((messageLedger.threads || [])
    .filter((thread) => thread.priorityReviewQueuedAt)
    .map((thread) => exactMessageProfile(thread)?.identityKey)
    .filter(Boolean));
  const candidates = new Map();
  for (const thread of messageLedger.threads || []) {
    if (thread.lastDirection !== 'inbound') continue;
    const profile = exactMessageProfile(thread);
    if (!profile || completed.has(profile.identityKey) || candidates.has(profile.identityKey)) continue;
    candidates.set(profile.identityKey, profile);
  }
  let queued = 0;
  const errors = [];
  let changed = false;
  for (const profile of [...candidates.values()].slice(0, 10)) {
    const requestedAt = new Date().toISOString();
    try {
      await sendAudiencePriorityToRyzen({
        id: randomUUID(),
        type: 'facebook-audience-profile-priority',
        source: 'personal-social-public-profile-priority',
        requestedBy: 'personal-social-desk',
        priority: 1000,
        reason: 'New exact public Facebook identity for review.',
        actorId: profile.actorId,
        actorUrl: profile.actorUrl,
        actorName: profile.actorName,
        createdAt: requestedAt,
      });
      for (const thread of messageLedger.threads || []) {
        if (exactMessageProfile(thread)?.identityKey !== profile.identityKey) continue;
        thread.priorityReviewQueuedAt = requestedAt;
        thread.priorityReviewState = 'queued';
        thread.priorityReviewError = '';
      }
      completed.add(profile.identityKey);
      queued += 1;
      changed = true;
    } catch (error) {
      for (const thread of messageLedger.threads || []) {
        if (exactMessageProfile(thread)?.identityKey !== profile.identityKey) continue;
        thread.priorityReviewState = 'retrying';
        thread.priorityReviewError = String(error.message || error).slice(0, 500);
      }
      errors.push({ identityKey: profile.identityKey, error: String(error.message || error).slice(0, 500) });
      changed = true;
    }
  }
  if (changed) {
    messageLedger.updatedAt = new Date().toISOString();
    await writeJson(messageLedgerFile, messageLedger);
  }
  return { queued, errors };
}

function unresolvedUnfollowEvents(events, actorId = '', actorUrl = '') {
  return (events || []).filter((event) => ['possible-unfollow', 'user-confirmed-unfollow'].includes(event.type)
    && !event.resolvedAt
    && (!actorId && !actorUrl || matchesExactFacebookIdentity(event, actorId, actorUrl)));
}

function engagementEventKey(event) {
  const identity = String(event.actorId || event.actorUrl || '').trim().toLowerCase();
  const evidence = [event.source, event.sourceUrl, event.postUrl, event.type, event.text, event.messageFingerprint].map((value) => String(value || '').trim().toLowerCase()).join('|');
  return createHash('sha256').update(`${identity}|${evidence}`).digest('hex');
}

function normalizedCommentText(event) {
  let text = repairMojibake(event?.text || '').replace(/\s+/g, ' ').trim();
  const actorName = repairMojibake(event?.actorName || '').replace(/\s+/g, ' ').trim();
  if (actorName && text.toLocaleLowerCase().startsWith(actorName.toLocaleLowerCase())) text = text.slice(actorName.length).trim();
  let previous = '';
  while (text && previous !== text) {
    previous = text;
    text = text.replace(/(?:just now|\d+\s*[smhdwy]|like|love|care|haha|wow|sad|angry|reply|hide|edited|author|follow|\d+)\s*$/iu, '').trim();
  }
  return text.slice(0, 600);
}

function classifyComment(event) {
  const text = normalizedCommentText(event);
  const lower = text.toLocaleLowerCase();
  const wordMatches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) || [];
  const meaningfulCharacters = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  const spam = /(?:https?:\/\/|www\.|\b(?:dm|inbox|message)\s+me\b|\b(?:whatsapp|telegram|crypto|bitcoin|investment|forex|cash\s*app|onlyfans)\b|\b(?:follow|subscribe)\s+(?:me|back)\b|\bclick\s+(?:here|my|the)\b)/iu.test(lower);
  let quality = 'minimal';
  if (!text || meaningfulCharacters === 0) quality = 'empty';
  else if (spam) quality = 'spam';
  else if (wordMatches.length >= 8 || meaningfulCharacters >= 60) quality = 'substantive';
  else if (wordMatches.length >= 2 || /^(?:fb|cmi|congrats|congratulations|awesome|amazing|beautiful|great|nice|love|enjoy|thanks|thank you|well done)$/iu.test(text)) quality = 'legit';
  return { text, quality, wordCount: wordMatches.length, meaningfulCharacters, eligibleForAutoLike: ['legit', 'substantive'].includes(quality) };
}

function recencyMultiplier(event) {
  const timestamp = Date.parse(event.occurredAt || event.capturedAt || '');
  if (!Number.isFinite(timestamp)) return 0.35;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86400000);
  if (ageDays <= 7) return 1;
  if (ageDays <= 30) return 0.85;
  if (ageDays <= 90) return 0.65;
  if (ageDays <= 365) return 0.4;
  return 0.2;
}

function engagementIdentityKey(event) {
  const actorId = String(event?.actorId || '').replace(/\D/g, '');
  const actorUrl = canonicalFacebookUrl(event?.actorUrl || '');
  return actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
}

function validEngagementActor(event) {
  const name = repairMojibake(event?.actorName || '').replace(/\s+/g, ' ').trim();
  const actorUrl = canonicalFacebookUrl(event?.actorUrl || '');
  if (!name || !actorUrl) return false;
  let path = '';
  try { path = new URL(actorUrl).pathname.toLowerCase(); } catch { return false; }
  if (path === '/xmatthewxmurphyx' || ['/ad_center', '/ads', '/professional_dashboard', '/business', '/groups', '/pages'].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return false;
  if (/^(?:facebook|meta|grow your business|boost a reel)/i.test(name)) return false;
  const letters = (name.match(/\p{L}/gu) || []).length;
  const digits = (name.match(/\p{N}/gu) || []).length;
  const allowed = (name.match(/[\p{L}\p{M}\p{N}\s.'’&_-]/gu) || []).length;
  return letters >= 2 && digits <= 6 && allowed / Math.max(1, name.length) >= 0.85;
}

function buildEngagementRows(ledger) {
  const actors = new Map();
  for (const event of ledger.events || []) {
    if (!validEngagementActor(event)) continue;
    if (event.source === 'feed') continue;
    const postUrl = canonicalFacebookUrl(event.postUrl || '');
    if (postUrl && /^\/groups\//i.test(new URL(postUrl).pathname) && !['own-group-post', 'own-group-comment'].includes(event.contentScope)) continue;
    const identityKey = engagementIdentityKey(event);
    if (!identityKey) continue;
    const actor = actors.get(identityKey) || {
      identityKey,
      actorId: String(event.actorId || '').replace(/\D/g, ''),
      actorUrl: canonicalFacebookUrl(event.actorUrl || ''),
      actorName: repairMojibake(event.actorName || '').trim().slice(0, 160),
      events: new Map(),
    };
    if (!actor.actorId && event.actorId) actor.actorId = String(event.actorId).replace(/\D/g, '');
    if (!actor.actorUrl && event.actorUrl) actor.actorUrl = canonicalFacebookUrl(event.actorUrl);
    if (!actor.actorName && event.actorName) actor.actorName = repairMojibake(event.actorName).trim().slice(0, 160);
    const type = String(event.type || '').toLowerCase();
    const postKey = postUrl || canonicalFacebookUrl(event.sourceUrl || '') || 'unknown-post';
    const comment = type === 'comment' ? classifyComment(event) : null;
    const evidenceKey = type === 'comment' ? comment.text.toLocaleLowerCase()
      : type === 'message' ? String(event.messageFingerprint || '')
        : type === 'mention' ? repairMojibake(event.text || '').toLocaleLowerCase().slice(0, 180) : '';
    const dedupeKey = type === 'comment' ? `${type}|${evidenceKey}` : `${type}|${postKey}|${evidenceKey}`;
    const existing = actor.events.get(dedupeKey);
    if (!existing || Date.parse(event.capturedAt || 0) > Date.parse(existing.event.capturedAt || 0)) actor.events.set(dedupeKey, { event, type, postKey, comment });
    actors.set(identityKey, actor);
  }

  return [...actors.values()].map((actor) => {
    const rows = [...actor.events.values()];
    const types = new Set();
    const posts = new Set();
    const messageThreads = new Set();
    const counts = { reactions: 0, comments: 0, shares: 0, mentions: 0, messages: 0 };
    const commentQuality = { substantive: 0, legit: 0, minimal: 0, empty: 0, spam: 0 };
    let weighted = 0;
    let lastEngagedAt = null;
    for (const row of rows) {
      types.add(row.type);
      if (row.type === 'message') {
        counts.messages += 1;
        if (row.postKey !== 'unknown-post') messageThreads.add(row.postKey);
        weighted += 6 * recencyMultiplier(row.event);
      } else if (row.postKey !== 'unknown-post') {
        posts.add(row.postKey);
      }
      if (row.type === 'comment') {
        counts.comments += 1;
        commentQuality[row.comment.quality] += 1;
        weighted += ({ substantive: 10, legit: 7, minimal: 0, empty: 0, spam: 0 }[row.comment.quality] || 0) * recencyMultiplier(row.event);
      } else if (row.type === 'share') {
        counts.shares += 1;
        weighted += 12 * recencyMultiplier(row.event);
      } else if (row.type === 'mention') {
        counts.mentions += 1;
        weighted += 4 * recencyMultiplier(row.event);
      } else if (row.type !== 'message') {
        counts.reactions += 1;
        weighted += 2 * recencyMultiplier(row.event);
      }
      const occurredAt = row.event.occurredAt || row.event.capturedAt;
      if (occurredAt && new Date(occurredAt) > new Date(lastEngagedAt || 0)) lastEngagedAt = occurredAt;
    }
    const publicRows = rows.filter((row) => row.type !== 'message');
    const uniquePosts = posts.size || (publicRows.length ? 1 : 0);
    const consistencyBonus = Math.min(32, Math.max(0, uniquePosts - 1) * 4);
    const varietyBonus = Math.min(8, Math.max(0, types.size - 1) * 2);
    const engagementScore = Math.min(100, Math.round(weighted + consistencyBonus + varietyBonus));
    const engagementLevel = engagementScore >= TOP_ENGAGER_MIN_SCORE ? 'top-engager'
      : engagementScore >= 20 && uniquePosts >= 3 || uniquePosts >= 6 ? 'consistent'
        : engagementScore >= 15 && uniquePosts >= 2 || uniquePosts >= 3 ? 'engaged'
          : engagementScore > 0 ? 'light' : 'monitoring';
    const legitComments = commentQuality.legit + commentQuality.substantive;
    const messageReason = counts.messages ? ` Includes ${counts.messages} verified inbound private message${counts.messages === 1 ? '' : 's'}.` : '';
    return {
      identityKey: actor.identityKey,
      actorId: actor.actorId,
      actorUrl: actor.actorUrl,
      actorName: actor.actorName,
      ...counts,
      commentQuality,
      legitComments,
      engagementScore,
      engagementLevel,
      uniquePosts,
      uniqueMessageThreads: messageThreads.size,
      eventCount: rows.length,
      lastEngagedAt,
      reason: engagementLevel === 'top-engager' ? `Top engager across ${uniquePosts} distinct posts.`
        : engagementLevel === 'consistent' ? `Consistent engagement across ${uniquePosts} distinct posts.`
          : engagementLevel === 'engaged' ? `Repeated engagement across ${uniquePosts} distinct posts.`
            : engagementLevel === 'light' ? `Some exact engagement was captured.${messageReason}` : 'No scoreable engagement was captured.',
    };
  }).sort((left, right) => right.engagementScore - left.engagementScore || right.uniquePosts - left.uniquePosts || right.messages - left.messages || left.actorName.localeCompare(right.actorName));
}

function engagementEventTimestamp(event) {
  const timestamp = Date.parse(event?.occurredAt || event?.capturedAt || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function engagementWeekStartKey(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start.toISOString().slice(0, 10);
}

function weeklyTaggedTargetKeys(queue, weekStart = engagementWeekStartKey()) {
  const tagged = new Set();
  for (const item of queue?.items || []) {
    const post = item?.engagementPost || {};
    if (post.kind !== 'weekly-top' || post.weekStart !== weekStart) continue;
    for (const target of item.tagTargets || []) {
      const url = canonicalFacebookUrl(target?.url || '');
      const name = repairMojibake(target?.name || '').trim().toLocaleLowerCase();
      if (url) tagged.add(`url:${url}`);
      if (name) tagged.add(`name:${name}`);
    }
  }
  return tagged;
}

function engagementRowWasTaggedThisWeek(row, queue, weekStart = engagementWeekStartKey()) {
  const tagged = weeklyTaggedTargetKeys(queue, weekStart);
  const url = canonicalFacebookUrl(row?.actorUrl || '');
  const name = repairMojibake(row?.actorName || '').trim().toLocaleLowerCase();
  return (url && tagged.has(`url:${url}`)) || (name && tagged.has(`name:${name}`));
}

function adjustedTopEngagerScore(score, wasTaggedThisWeek) {
  const raw = Math.max(0, Number(score || 0));
  return wasTaggedThisWeek ? Math.min(TOP_ENGAGER_MIN_SCORE, raw) : raw;
}

function exactAudienceUrl(person) {
  const url = canonicalFacebookUrl(person?.url || '');
  if (url) return url;
  const id = String(person?.id || '').replace(/\D/g, '');
  return id ? `https://www.facebook.com/profile.php?id=${id}` : '';
}

function normalizedAudienceName(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function relationshipIdentityKey(person) {
  const actorId = String(person?.actorId || person?.id || facebookIdFromUrl(person?.actorUrl || person?.url || '')).replace(/\D/g, '');
  const actorUrl = canonicalFacebookUrl(person?.actorUrl || person?.url || '');
  return actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : normalizedAudienceName(person?.actorName || person?.name || '');
}

function relationshipRosterRouteAllowed(kind, route) {
  const allowed = {
    friend: new Set(['friends_all', 'friends_recent', 'friends_with_upcoming_birthdays', 'friends_high_school', 'friends_current_city', 'friends_hometown']),
    following: new Set(['following']),
  };
  return allowed[kind]?.has(route) === true;
}

function relationshipRosterTotal(roster) {
  return Math.max(0, Number(roster?.total || 0), Array.isArray(roster?.people) ? roster.people.length : 0);
}

function applyRelationshipCoverageToAudience(audience, relationshipRosters) {
  const defaults = emptyRelationshipRosters();
  const friendRoster = relationshipRosters?.rosters?.friend || defaults.rosters.friend;
  const followingRoster = relationshipRosters?.rosters?.following || defaults.rosters.following;
  const friendRosterTotal = relationshipRosterTotal(friendRoster);
  const followingRosterTotal = relationshipRosterTotal(followingRoster);
  const friendFollowerMatches = (audience.people || []).filter((person) => person.friend === true).length;
  const followingMatched = (audience.people || []).filter((person) => person.following === true).length;
  audience.coverage = {
    ...(audience.coverage || {}),
    friendRosterTotal,
    followingRosterTotal,
    friendFollowerMatches,
    friendNotFollowing: Math.max(0, friendRosterTotal - friendFollowerMatches),
    followingMatched,
  };
  audience.summary = {
    ...(audience.summary || {}),
    friends: friendFollowerMatches,
    following: followingRosterTotal,
  };
}

async function saveRelationshipRoster(kind, payload = {}) {
  const rosterKind = kind === 'following' ? 'following' : 'friend';
  const route = String(payload.route || '').trim().toLowerCase();
  if (!relationshipRosterRouteAllowed(rosterKind, route)) throw new Error('Unsupported relationship roster route.');
  const incoming = Array.isArray(payload.people) ? payload.people : [];
  const capturedAt = new Date().toISOString();
  const [relationshipRosters, audience, engagementLedger] = await Promise.all([
    readJson(relationshipRostersFile),
    readJson(audienceFile),
    readJson(engagementLedgerFile),
  ]);
  const nextRosters = relationshipRosters?.rosters ? relationshipRosters : emptyRelationshipRosters();
  const roster = {
    ...emptyRelationshipRosters().rosters[rosterKind],
    ...(nextRosters.rosters?.[rosterKind] || {}),
    routes: { ...(nextRosters.rosters?.[rosterKind]?.routes || {}) },
  };
  const records = new Map();
  const byName = new Map();
  for (const existing of roster.people || []) {
    const identityKey = relationshipIdentityKey(existing);
    if (identityKey) records.set(identityKey, existing);
    const nameKey = normalizedAudienceName(existing.actorName || existing.name);
    if (nameKey) byName.set(nameKey, existing);
  }
  const byAudienceId = new Map((audience.people || []).filter((person) => person.id).map((person) => [String(person.id), person]));
  const byAudienceUrl = new Map((audience.people || []).filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
  const byAudienceName = new Map((audience.people || []).map((person) => [normalizedAudienceName(person.name), person]).filter(([name]) => name));
  let accepted = 0;
  let matched = 0;
  for (const rawPerson of incoming) {
    const actorName = repairMojibake(rawPerson.actorName || rawPerson.name || '').trim().slice(0, 160);
    const actorId = String(rawPerson.actorId || rawPerson.id || facebookIdFromUrl(rawPerson.actorUrl || rawPerson.url || '')).replace(/\D/g, '');
    const actorUrl = canonicalFacebookUrl(rawPerson.actorUrl || rawPerson.url || (actorId ? `https://www.facebook.com/profile.php?id=${actorId}` : ''));
    const identityKey = actorId ? `facebook-id:${actorId}` : actorUrl ? `facebook-url:${actorUrl}` : '';
    const nameKey = normalizedAudienceName(actorName);
    if (!actorName || (!identityKey && !nameKey)) continue;
    const existing = (identityKey && records.get(identityKey)) || byName.get(nameKey) || {};
    const merged = {
      ...existing,
      kind: rosterKind,
      actorName,
      actorId,
      actorUrl,
      avatar: String(rawPerson.avatar || existing.avatar || '').slice(0, 1500),
      subtitle: repairMojibake(rawPerson.subtitle || existing.subtitle || '').trim().slice(0, 500),
      sourceUrl: canonicalFacebookUrl(rawPerson.sourceUrl || existing.sourceUrl || ''),
      routes: [...new Set([...(existing.routes || []), route])].slice(-20),
      firstSeenAt: existing.firstSeenAt || capturedAt,
      lastSeenAt: capturedAt,
    };
    const mergedKey = relationshipIdentityKey(merged) || nameKey;
    records.set(mergedKey, merged);
    if (nameKey) byName.set(nameKey, merged);
    accepted += 1;
    const audiencePerson = (actorId && byAudienceId.get(actorId)) || (actorUrl && byAudienceUrl.get(actorUrl)) || byAudienceName.get(nameKey) || null;
    if (audiencePerson) {
      if (rosterKind === 'friend') audiencePerson.friend = true;
      if (rosterKind === 'following') audiencePerson.following = true;
      matched += 1;
    }
  }
  roster.people = [...records.values()].sort((left, right) => String(left.actorName || '').localeCompare(String(right.actorName || '')));
  roster.updatedAt = capturedAt;
  roster.total = Math.max(relationshipRosterTotal(roster), Number(String(payload.pageTotal || '').replace(/[^\d]/g, '')) || 0, Number(payload.visibleCount || 0) || 0);
  roster.complete = roster.complete || payload.complete === true || (roster.total > 0 && roster.people.length >= roster.total);
  roster.routes[route] = {
    updatedAt: capturedAt,
    visibleCount: Math.max(0, Number(payload.visibleCount || 0), roster.people.filter((person) => (person.routes || []).includes(route)).length),
    pageTotal: Number(String(payload.pageTotal || '').replace(/[^\d]/g, '')) || null,
    sourceUrl: canonicalFacebookUrl(payload.sourceUrl),
  };
  nextRosters.updatedAt = capturedAt;
  nextRosters.rosters[rosterKind] = roster;
  applyRelationshipCoverageToAudience(audience, nextRosters);
  const queue = await readJson(queueFile);
  applyEngagementLedger(audience, engagementLedger, queue);
  await Promise.all([
    writeJson(relationshipRostersFile, nextRosters),
    writeJson(audienceFile, audience),
  ]);
  return {
    accepted,
    matched,
    roster,
    coverage: audience.coverage || {},
  };
}

function audienceIdentityMatches(left, right) {
  if (!left || !right) return false;
  if (left.key && right.key && left.key === right.key) return true;
  const leftId = String(left.id || facebookIdFromUrl(left.url || '')).replace(/\D/g, '');
  const rightId = String(right.id || facebookIdFromUrl(right.url || '')).replace(/\D/g, '');
  if (leftId && rightId && leftId === rightId) return true;
  const leftUrl = exactAudienceUrl(left);
  const rightUrl = exactAudienceUrl(right);
  if (leftUrl && rightUrl && leftUrl === rightUrl) return true;
  const leftName = normalizedAudienceName(left.name);
  const rightName = normalizedAudienceName(right.name);
  if (!leftName || leftName !== rightName) return false;
  const leftExact = Boolean(leftId || leftUrl);
  const rightExact = Boolean(rightId || rightUrl);
  return !leftExact || !rightExact;
}

function eachAudienceIdentityMatch(audience, person, callback) {
  for (const candidate of (audience.people || [])) {
    if (audienceIdentityMatches(candidate, person)) callback(candidate);
  }
}

const followerRemovalStatuses = new Set([
  'queued',
  'preparing',
  'switching-identity',
  'blocking',
  'blocked',
  'recording',
  'recorded',
  'unblocking',
  'complete',
  'failed',
]);

function removalTimestamp(value, fallback = new Date().toISOString()) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function removalStepState(status, previous = {}, keepBlocked = false) {
  const steps = {
    block: { status: 'waiting', ...(previous.block || {}) },
    record: { status: 'waiting', ...(previous.record || {}) },
    unblock: { status: 'waiting', ...(previous.unblock || {}) },
  };
  if (['preparing', 'switching-identity', 'blocking'].includes(status)) steps.block.status = 'active';
  if (['blocked', 'recording', 'recorded', 'unblocking', 'complete'].includes(status)) steps.block.status = 'complete';
  if (status === 'recording') steps.record.status = 'active';
  if (['recorded', 'unblocking', 'complete'].includes(status)) steps.record.status = 'complete';
  if (status === 'unblocking') steps.unblock.status = 'active';
  if (status === 'complete') steps.unblock.status = keepBlocked ? 'skipped' : 'complete';
  return steps;
}

function followerRemovalPersonSnapshot(person) {
  if (!person) return null;
  return {
    key: person.key,
    name: person.name,
    id: person.id || '',
    url: person.url || '',
    decision: person.decision || 'undecided',
    removedAt: person.removedAt || null,
    removalMethod: person.removalMethod || null,
    removalJobId: person.removalJobId || null,
    removalAutomationState: person.removalAutomationState || null,
    facebookBlockedAt: person.facebookBlockedAt || null,
    facebookUnblockedAt: person.facebookUnblockedAt || null,
    facebookBlockRetained: person.facebookBlockRetained === true,
    facebookBlockRetainedAt: person.facebookBlockRetainedAt || null,
    reviewedAt: person.reviewedAt || null,
  };
}

function reconcileFollowerRemovalJobs(audience, ledger) {
  const people = Array.isArray(audience?.people) ? audience.people : [];
  const jobs = Array.isArray(ledger?.jobs) ? ledger.jobs : [];
  if (!people.length || !jobs.length) return false;
  let changed = false;
  for (const job of jobs) {
    if (!job?.personKey || !['recorded', 'complete'].includes(String(job.status || ''))) continue;
    const person = people.find((entry) => entry.key === job.personKey);
    if (!person) continue;
    if (job.recordedAt && (person.decision !== 'removed' || !person.removedAt || person.removalJobId !== job.id)) {
      recordFollowerRemoved(audience, person, job, job.recordedAt);
      changed = true;
    }
    if (String(job.status || '') !== 'complete') continue;
    if (job.keepBlocked === true && job.keptBlockedAt && (person.facebookBlockRetained !== true || person.removalAutomationState !== 'complete')) {
      recordFollowerBlockRetained(audience, person, job, job.keptBlockedAt);
      changed = true;
      continue;
    }
    if (job.keepBlocked !== true && job.unblockedAt && (person.facebookUnblockedAt !== job.unblockedAt || person.removalAutomationState !== 'complete')) {
      recordFollowerUnblocked(audience, person, job, job.unblockedAt);
      changed = true;
    }
  }
  return changed;
}

function publicFollowerRemovalJob(job, person = null) {
  return {
    id: job.id,
    personKey: job.personKey,
    personName: job.personName,
    profileUrl: job.profileUrl,
    status: job.status,
    steps: job.steps,
    error: job.error || '',
    failedStep: job.failedStep || '',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    blockedAt: job.blockedAt || null,
    recordedAt: job.recordedAt || null,
    unblockedAt: job.unblockedAt || null,
    keepBlocked: job.keepBlocked === true,
    keptBlockedAt: job.keptBlockedAt || null,
    person: followerRemovalPersonSnapshot(person || job.personSnapshot),
  };
}

function recordFollowerRemoved(audience, person, job, recordedAt) {
  const method = job.keepBlocked ? 'facebook-block' : 'facebook-block-unblock';
  eachAudienceIdentityMatch(audience, person, (candidate) => {
    const alreadyRecorded = (candidate.removalHistory || []).some((entry) => entry.jobId === job.id && entry.type === 'removed');
    candidate.decision = 'removed';
    candidate.removedAt = candidate.removedAt || recordedAt;
    candidate.removalMethod = method;
    candidate.removalJobId = job.id;
    candidate.removalAutomationState = 'recorded';
    candidate.facebookBlockedAt = job.blockedAt || recordedAt;
    candidate.facebookUnblockedAt = null;
    candidate.facebookBlockRetained = job.keepBlocked === true;
    candidate.facebookBlockRetainedAt = job.keepBlocked ? (job.blockedAt || recordedAt) : null;
    candidate.restoredAt = null;
    if (!alreadyRecorded) {
      candidate.removalHistory = [
        ...(Array.isArray(candidate.removalHistory) ? candidate.removalHistory : []),
        {
          type: 'removed',
          recordedAt,
          method,
          jobId: job.id,
          blockedAt: job.blockedAt || recordedAt,
          keepBlocked: job.keepBlocked === true,
          url: exactAudienceUrl(candidate),
        },
      ].slice(-20);
    }
    candidate.reviewedAt = recordedAt;
  });
  audience.updatedAt = recordedAt;
}

function recordFollowerUnblocked(audience, person, job, unblockedAt) {
  eachAudienceIdentityMatch(audience, person, (candidate) => {
    const alreadyRecorded = (candidate.removalHistory || []).some((entry) => entry.jobId === job.id && entry.type === 'unblocked-after-removal');
    candidate.removalAutomationState = 'complete';
    candidate.facebookUnblockedAt = unblockedAt;
    candidate.facebookBlockRetained = false;
    candidate.facebookBlockRetainedAt = null;
    if (!alreadyRecorded) {
      candidate.removalHistory = [
        ...(Array.isArray(candidate.removalHistory) ? candidate.removalHistory : []),
        {
          type: 'unblocked-after-removal',
          recordedAt: unblockedAt,
          method: 'facebook-block-unblock',
          jobId: job.id,
          url: exactAudienceUrl(candidate),
        },
      ].slice(-20);
    }
    candidate.reviewedAt = unblockedAt;
  });
  audience.updatedAt = unblockedAt;
}

function recordFollowerBlockRetained(audience, person, job, keptBlockedAt) {
  eachAudienceIdentityMatch(audience, person, (candidate) => {
    const alreadyRecorded = (candidate.removalHistory || []).some((entry) => entry.jobId === job.id && entry.type === 'block-retained-after-removal');
    candidate.removalAutomationState = 'complete';
    candidate.removalMethod = 'facebook-block';
    candidate.facebookUnblockedAt = null;
    candidate.facebookBlockRetained = true;
    candidate.facebookBlockRetainedAt = keptBlockedAt;
    if (!alreadyRecorded) {
      candidate.removalHistory = [
        ...(Array.isArray(candidate.removalHistory) ? candidate.removalHistory : []),
        {
          type: 'block-retained-after-removal',
          recordedAt: keptBlockedAt,
          method: 'facebook-block',
          jobId: job.id,
          url: exactAudienceUrl(candidate),
        },
      ].slice(-20);
    }
    candidate.reviewedAt = keptBlockedAt;
  });
  audience.updatedAt = keptBlockedAt;
}

function engagementTargetBlocked(person) {
  if (!person) return false;
  const decision = String(person.decision || '').toLowerCase();
  const profileState = String(person.profileState || '').toLowerCase();
  if (['removed', 'blocked-minor'].includes(decision)) return true;
  if (['minor-blocked', 'memorialized', 'deceased'].includes(profileState)) return true;
  const publicFacts = person.profileObservation?.publicFacts || {};
  const age = Number(person.age ?? publicFacts.age ?? person.facebookBirthday?.age);
  return Number.isFinite(age) && age > 0 && age < 18;
}

function engagementAudienceIndex(audience) {
  const byId = new Map();
  const byUrl = new Map();
  for (const person of audience?.people || []) {
    const id = String(person.id || '').replace(/\D/g, '');
    const url = exactAudienceUrl(person);
    if (id) byId.set(id, person);
    if (url) byUrl.set(url, person);
  }
  return { byId, byUrl };
}

function audiencePersonForEngagementRow(index, row) {
  const actorId = String(row?.actorId || '').replace(/\D/g, '');
  const actorUrl = canonicalFacebookUrl(row?.actorUrl || '');
  return actorId && index.byId.get(actorId) || actorUrl && index.byUrl.get(actorUrl) || null;
}

function weeklyTopEngagerCandidates(audience, ledger, queue, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  const events = (ledger?.events || []).filter((event) => event.type !== 'message' && engagementEventTimestamp(event) >= cutoff);
  const audienceIndex = engagementAudienceIndex(audience);
  const weekStart = engagementWeekStartKey();
  return buildEngagementRows({ events }).map((row) => {
    const alreadyTaggedThisWeek = engagementRowWasTaggedThisWeek(row, queue, weekStart);
    const effectiveScore = adjustedTopEngagerScore(row.engagementScore, alreadyTaggedThisWeek);
    if (effectiveScore < TOP_ENGAGER_MIN_SCORE) return null;
    const person = audiencePersonForEngagementRow(audienceIndex, row);
    if (engagementTargetBlocked(person)) return null;
    const url = canonicalFacebookUrl(row.actorUrl || '') || exactAudienceUrl(person);
    const name = repairMojibake(person?.name || row.actorName || '').trim();
    if (!name || !url) return null;
    return {
      name,
      url,
      reason: alreadyTaggedThisWeek
        ? `Already spotlighted this week, so the score is cooled to ${effectiveScore}/100 across ${row.uniquePosts} distinct post${row.uniquePosts === 1 ? '' : 's'}.`
        : `Top exact engager for the current 7-day window: internal score ${effectiveScore}/100 across ${row.uniquePosts} distinct post${row.uniquePosts === 1 ? '' : 's'}.`,
      score: effectiveScore,
      rawScore: row.engagementScore,
      spotlightedThisWeek: alreadyTaggedThisWeek,
      uniquePosts: row.uniquePosts,
      lastEngagedAt: row.lastEngagedAt,
    };
  }).filter(Boolean);
}

function creatorSignalForPerson(person) {
  const observation = person?.profileObservation || {};
  const category = String(observation.publicFacts?.category || '').toLowerCase();
  const type = String(person?.profileType || person?.type || '').toLowerCase();
  const creatorSignals = Array.isArray(observation.creatorSignals) ? observation.creatorSignals : [];
  return /\b(?:creator|author)\b/.test(category) || /\bcreator\b/.test(type) || creatorSignals.length > 0;
}

function creatorWinbackCandidates(audience, queue, weekStart) {
  const recentlyTagged = new Set();
  const recentCutoff = Date.now() - 84 * 86400000;
  for (const item of queue?.items || []) {
    if (!String(item.source || '').startsWith('audience-engagement:creator-winback:')) continue;
    if (String(item.source).includes(`:${weekStart}:`)) continue;
    if (!['approved', 'dispatched', 'published'].includes(item.status)) continue;
    if (Date.parse(item.updatedAt || item.createdAt || '') < recentCutoff) continue;
    for (const target of normalizeTagTargets(item.tagTargets)) recentlyTagged.add(target.url);
  }
  const candidates = (audience?.people || []).map((person) => {
    const url = exactAudienceUrl(person);
    const score = Number(person.engagementScore ?? person.score ?? 0);
    if (!url || !person.name || score > 0 || !creatorSignalForPerson(person) || engagementTargetBlocked(person)) return null;
    const observation = person.profileObservation || {};
    const lastPostTime = Date.parse(observation.lastPostAt || observation.latestVisiblePost?.capturedAt || '');
    return {
      name: repairMojibake(person.name).trim(),
      url,
      reason: 'Exact linked creator with no captured engagement score yet. This is a visibility check, not a claim that the creator is inactive.',
      recentlyTagged: recentlyTagged.has(url),
      lastPostTime: Number.isFinite(lastPostTime) ? lastPostTime : 0,
      followers: Number(observation.socialCounts?.followers || 0),
    };
  }).filter(Boolean).sort((left, right) => Number(left.recentlyTagged) - Number(right.recentlyTagged)
    || right.lastPostTime - left.lastPostTime
    || right.followers - left.followers
    || left.name.localeCompare(right.name));
  const deduped = new Map();
  for (const candidate of candidates) if (!deduped.has(candidate.url)) deduped.set(candidate.url, candidate);
  return [...deduped.values()];
}

function weeklyTopEngagerBody() {
  return 'Weekly community thank-you 👏\n\nThe people tagged below kept showing up in my comments, reactions, and shares this week. I notice it, and I appreciate you.\n\nIf you are tagged, tell everyone what you create, what you are building, or what you want more people to see. Let’s help good people find one another.\n\n— Matthew Murphy\n\n#CommunitySpotlight #TopEngagers #CreatorsSupportingCreators';
}

function creatorWinbackBody(batch, batchCount) {
  const openings = [
    'Creator roll call 👀',
    'Quick algorithm check for my creator circle 👀',
    'Still creating? I want to reconnect.',
    'Creator community check-in 👋',
    'One more creator roll call before the week gets away from us 👀',
  ];
  return `${openings[(batch - 1) % openings.length]}\n\nI have not seen the creators tagged below in my recent comments, reactions, or shares. That does not automatically mean you went quiet—the algorithm may just be keeping us apart.\n\nSo… you unalived, or just not seeing me anymore? 😅\n\nIf you are still creating, comment with what you make and your latest project. I want to reconnect and send some attention your way.\n\n— Matthew Murphy\n\n#CreatorsListenUp #DigitalCreators #CreatorCommunity${batchCount > 1 ? `\n\nCreator roll-call group ${batch} of ${batchCount}.` : ''}`;
}

function inactiveDigitalCreatorCandidates(audience) {
  return (audience.people || []).filter((person) => {
    const observation = person.profileObservation || {};
    const category = String(observation.publicFacts?.category || '').trim().toLocaleLowerCase();
    return person.name
      && canonicalFacebookUrl(person.url || '')
      && category === 'digital creator'
      && observation.accessible === true
      && activityEvidenceTrusted(person)
      && inactiveForReview(person)
      && !removedFromRoster(person)
      && !minorBlockActive(person)
      && !engagementTargetBlocked(person);
  }).sort(compareInactiveOldestFirst).map((person) => {
    const observation = person.profileObservation || {};
    const lastPostAt = observation.lastPostAt || observation.latestVisiblePost?.postedAt || '';
    const inactivityDays = inactivityDaysFromPerson(person);
    return {
      name: repairMojibake(person.name).trim(),
      url: canonicalFacebookUrl(person.url),
      reason: `${inactivityLabel(inactivityDays)}. Trusted multi-post scan found no visible unpinned post newer than ${String(lastPostAt).slice(0, 10)}; Facebook category is Digital creator.`,
      lastPostAt: observation.latestVisiblePost?.displayDate || lastPostAt,
      lastPostUrl: observation.latestVisiblePost?.url || observation.lastPostUrl || '',
      inactivityDays,
      inactivityLabel: inactivityLabel(inactivityDays),
    };
  });
}

function inactivityDaysFromPerson(person) {
  const observation = person?.profileObservation || {};
  const timestamp = Date.parse(String(observation.lastPostAt || observation.latestVisiblePost?.postedAt || ''));
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function inactivityLabel(days) {
  if (!Number.isFinite(days) || days === null) return `${AUDIENCE_INACTIVITY_MONTHS}+ months inactive`;
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months ? `${years}y ${months}mo inactive` : `${years}y inactive`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainder = days % 30;
    return remainder >= 7 ? `${months}mo ${Math.floor(remainder / 7)}w inactive` : `${months}mo inactive`;
  }
  if (days >= 7) return `${Math.floor(days / 7)}w inactive`;
  return `${days}d inactive`;
}

function inactiveDigitalCreatorBody(total) {
  return `Consistency is key, and some of you have not been consistent.\n\nMy app reviewed exact linked Digital creator profiles in my network and the people tagged below are the quietest creator accounts it could confirm, oldest inactivity first.\n\nIf you are building a brand, growing a page, or trying to get the bag, disappearing for months is not how you stay visible long enough for people to remember what you create.\n\nIf you are tagged, check in: are you still creating, rebuilding, taking a break, or did Facebook stop showing your work?\n\n— Matthew Murphy\n\n#CreatorsListenUp #DigitalCreators #CreatorMarketing #BuildInPublic\n\nTop ${total} quiet Digital creators from my latest exact scan.`;
}

function dailyCreatorCampaignSlot(queue, dayOffset, now = new Date()) {
  const occupied = (queue.items || []).filter((item) => item.scheduledFor && item.status !== 'rejected').map((item) => new Date(item.scheduledFor).valueOf()).filter(Number.isFinite);
  const day = new Date(now);
  day.setDate(day.getDate() + Math.max(1, dayOffset + 1));
  for (const [hour, minute] of [[10, 0], [11, 30], [13, 0]]) {
    const candidate = new Date(day);
    candidate.setHours(hour, minute, 0, 0);
    if (occupied.every((time) => Math.abs(time - candidate.valueOf()) >= 75 * 60_000)) return candidate.toISOString();
  }
  day.setHours(10, dayOffset * 5, 0, 0);
  return day.toISOString();
}

function upsertEngagementDraft(queue, source, values) {
  const now = new Date().toISOString();
  let item = (queue.items || []).find((entry) => entry.source === source && entry.status === 'draft');
  let created = false;
  if (!item) {
    created = true;
    item = { id: randomUUID(), status: 'draft', media: [], createdAt: now, source };
  }
  Object.assign(item, {
    title: normalizeHumanPostText(values.title),
    body: normalizeHumanPostText(values.body),
    target: 'matthew-page',
    format: 'feed',
    notes: values.notes,
    tagTargets: normalizeTagTargets(values.tagTargets),
    engagementPost: values.engagementPost,
    updatedAt: now,
  });
  if (values.scheduledFor && !item.scheduledFor) item.scheduledFor = values.scheduledFor;
  if (created) queue.items.unshift(item);
  return { item, created };
}

function buildEngagementPostDrafts(kind, audience, ledger, queue) {
  const weekStart = engagementWeekStartKey();
  if (kind === 'weekly-top') {
    const candidates = weeklyTopEngagerCandidates(audience, ledger, queue);
    const tagTargets = candidates.slice(0, 12);
    if (!tagTargets.length) throw new Error('No exact engagement was captured in the current 7-day window yet.');
    const result = upsertEngagementDraft(queue, `audience-engagement:weekly-top:${weekStart}`, {
      title: 'This week’s community MVPs',
      body: weeklyTopEngagerBody(),
      notes: 'Weekly appreciation draft built from exact Facebook engagement captured during the latest 7-day window. Scores remain internal; review tags before publishing.',
      tagTargets,
      engagementPost: { kind, weekStart, candidateCount: candidates.length, selectedTargets: tagTargets.length, rebuiltAt: new Date().toISOString() },
    });
    return { kind, weekStart, candidateCount: candidates.length, selectedTargets: tagTargets.length, drafts: [result.item], created: Number(result.created), updated: Number(!result.created) };
  }
  if (kind === 'creator-winback') {
    const candidates = creatorWinbackCandidates(audience, queue, weekStart);
    const selected = candidates.slice(0, 100);
    if (!selected.length) throw new Error('No exact linked zero-score creator profiles are eligible for a win-back draft yet.');
    const batchSize = 20;
    const batches = Math.ceil(selected.length / batchSize);
    const drafts = [];
    let created = 0;
    let updated = 0;
    for (let index = 0; index < batches; index += 1) {
      const batch = index + 1;
      const tagTargets = selected.slice(index * batchSize, (index + 1) * batchSize);
      const result = upsertEngagementDraft(queue, `audience-engagement:creator-winback:${weekStart}:${batch}`, {
        title: `Creator roll call — group ${batch} of ${batches}`,
        body: creatorWinbackBody(batch, batches),
        notes: 'Review-only creator win-back draft. Exact linked creator profiles with no captured engagement score; zero is missing captured activity, not proof of inactivity. The 100-person weekly pool is split into 20-person tag batches.',
        tagTargets,
        engagementPost: { kind, weekStart, batch, batches, candidateCount: candidates.length, selectedTargets: tagTargets.length, rebuiltAt: new Date().toISOString() },
      });
      drafts.push(result.item);
      created += Number(result.created);
      updated += Number(!result.created);
    }
    return { kind, weekStart, candidateCount: candidates.length, selectedTargets: selected.length, batches, drafts, created, updated };
  }
  if (kind === 'inactive-digital-creators') {
    const candidates = inactiveDigitalCreatorCandidates(audience);
    const selected = candidates.slice(0, 50);
    if (!selected.length) throw new Error('No exact linked Digital creators have trusted three-month inactivity evidence yet.');
    const oldest = selected[0];
    const result = upsertEngagementDraft(queue, `audience-insight:inactive-digital-creators:${weekStart}:top-50`, {
      title: `Top ${selected.length} quiet Digital creators from my latest scan`,
      body: inactiveDigitalCreatorBody(selected.length),
      notes: 'Review-only creator inactivity draft built only from exact linked profiles explicitly categorized as Digital creator with trusted multi-post evidence. Ordered oldest inactivity first. Facebook tags still require exact composer selection before publishing.',
      tagTargets: selected,
      engagementPost: {
        kind,
        weekStart,
        candidateCount: candidates.length,
        selectedTargets: selected.length,
        oldestInactivityDays: oldest?.inactivityDays ?? null,
        oldestInactivityLabel: oldest?.inactivityLabel || '',
        rebuiltAt: new Date().toISOString(),
      },
    });
    return {
      kind,
      weekStart,
      candidateCount: candidates.length,
      selectedTargets: selected.length,
      drafts: [result.item],
      created: Number(result.created),
      updated: Number(!result.created),
      oldestInactivityDays: oldest?.inactivityDays ?? null,
      oldestInactivityLabel: oldest?.inactivityLabel || '',
    };
  }
  throw new Error('Unknown engagement post type.');
}

function applyEngagementLedger(audience, ledger, queue = null) {
  const people = audience.people || [];
  const byId = new Map(people.filter((person) => person.id).map((person) => [String(person.id), person]));
  const byUrl = new Map(people.filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
  const matchedRows = [];
  const weekStart = engagementWeekStartKey();
  for (const row of buildEngagementRows(ledger)) {
    const person = (row.actorId && byId.get(String(row.actorId))) || (row.actorUrl && byUrl.get(canonicalFacebookUrl(row.actorUrl)));
    if (!person) continue;
    const spotlightedThisWeek = engagementRowWasTaggedThisWeek(row, queue, weekStart);
    const adjustedScore = adjustedTopEngagerScore(row.engagementScore, spotlightedThisWeek);
    const adjustedLevel = adjustedScore >= TOP_ENGAGER_MIN_SCORE ? 'top-engager'
      : adjustedScore >= 20 && row.uniquePosts >= 3 || row.uniquePosts >= 6 ? 'consistent'
        : adjustedScore >= 15 && row.uniquePosts >= 2 || row.uniquePosts >= 3 ? 'engaged'
          : adjustedScore > 0 ? 'light' : 'monitoring';
    person.reactions = Math.max(Number(person.reactions || 0), row.reactions);
    person.comments = Math.max(Number(person.comments || 0), row.comments);
    person.shares = Math.max(Number(person.shares || 0), row.shares);
    person.mentions = Math.max(Number(person.mentions || 0), row.mentions);
    person.capturedReactions = row.reactions;
    person.capturedComments = row.comments;
    person.capturedShares = row.shares;
    person.capturedMentions = row.mentions;
    person.messages = row.messages;
    person.capturedMessages = row.messages;
    person.eventCount = row.eventCount;
    person.recentEvents = row.eventCount;
    person.rawEngagementScore = row.engagementScore;
    person.score = adjustedScore;
    person.engagementScore = adjustedScore;
    person.engagementLevel = adjustedLevel;
    person.spotlightedThisWeek = spotlightedThisWeek;
    person.spotlightWeekStart = spotlightedThisWeek ? weekStart : null;
    person.engagementPosts = row.uniquePosts;
    person.legitComments = row.legitComments;
    person.commentQuality = row.commentQuality;
    person.lastEngagedAt = row.lastEngagedAt;
    person.tier = ['top-engager', 'consistent', 'engaged'].includes(adjustedLevel) ? 'engaged' : adjustedLevel === 'light' ? 'light' : 'monitoring';
    person.reason = adjustedLevel === 'top-engager'
      ? (spotlightedThisWeek ? `Already spotlighted this week, so this top engager is cooled to ${adjustedScore}/100.` : `Top engager at ${adjustedScore}/100 across ${row.uniquePosts} distinct posts.`)
      : adjustedLevel === 'consistent' ? `Consistent engagement across ${row.uniquePosts} distinct posts.`
        : adjustedLevel === 'engaged' ? `Repeated engagement across ${row.uniquePosts} distinct posts.`
          : adjustedLevel === 'light' ? 'Some exact engagement was captured.' : 'No scoreable engagement was captured.';
    person.firstMarkedAt = null;
    person.reviewMarkedAt = null;
    matchedRows.push(row);
  }
  if ((ledger.events || []).length) {
    audience.coverage = {
      ...(audience.coverage || {}),
      hasIncomingEngagement: true,
      engagementCaptureActive: true,
      engagementCapturedAt: ledger.updatedAt || audience.coverage?.engagementCapturedAt || null,
      engagementSources: [...new Set([...(audience.coverage?.engagementSources || []), ...(ledger.events || []).map((event) => event.source).filter(Boolean)])],
    };
  }
  audience.summary = {
    ...(audience.summary || {}),
    total: Number(audience.summary?.total || people.length),
    followers: Number(audience.summary?.followers || people.length),
    engaged: people.filter((person) => ['engaged', 'light'].includes(person.tier)).length,
    coreEngaged: people.filter((person) => person.tier === 'engaged').length,
    light: people.filter((person) => person.tier === 'light').length,
    monitoring: people.filter((person) => person.tier === 'monitoring').length,
    topEngagers: people.filter((person) => person.engagementLevel === 'top-engager').length,
    consistentEngagers: people.filter((person) => person.engagementLevel === 'consistent').length,
    legitCommenters: people.filter((person) => Number(person.legitComments || 0) > 0).length,
  };
  return matchedRows.length;
}

function extensionClientAllowed(req) {
  const client = String(req.headers['x-social-desk-client'] || '');
  const origin = String(req.headers.origin || '');
  return ['engagement-watcher', 'creator-intelligence-monitor'].includes(client)
    && (!origin || origin.startsWith('chrome-extension://'));
}

function normalizeAiModel(value, fallback = defaultAiCommentSettings.model) {
  const aliases = {
    'gpt-oss:120b-cloud': 'gpt-oss:120b',
    'gpt-oss:20b-cloud': 'gpt-oss:20b',
  };
  const rawModel = String(value || '').trim().slice(0, 160);
  const model = aliases[rawModel] || rawModel;
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model) ? model : fallback;
}

async function readAiCommentSettings() {
  const stored = await readJson(aiCommentSettingsFile).catch(() => ({}));
  return {
    ...defaultAiCommentSettings,
    ...stored,
    model: normalizeAiModel(stored.model),
    fallbackEnabled: stored.fallbackEnabled !== false,
    autoSendOwnedReplies: stored.autoSendOwnedReplies !== false,
    fallbackModel: 'opencode/big-pickle',
  };
}

async function readOllamaKey() {
  return (await runProcess('/usr/bin/security', ['find-generic-password', '-s', ollamaKeychainService, '-a', ollamaKeychainAccount, '-w'])).trim();
}

async function ollamaKeyConfigured() {
  try {
    return Boolean(await readOllamaKey());
  } catch {
    return false;
  }
}

async function saveOllamaKey(value) {
  const apiKey = String(value || '').trim();
  if (apiKey.length < 12 || apiKey.length > 4096 || /[\r\n]/.test(apiKey)) throw new Error('Enter a valid Ollama API key.');
  await runProcess('/usr/bin/security', ['add-generic-password', '-U', '-s', ollamaKeychainService, '-a', ollamaKeychainAccount, '-w', apiKey]);
}

async function deleteOllamaKey() {
  try {
    await runProcess('/usr/bin/security', ['delete-generic-password', '-s', ollamaKeychainService, '-a', ollamaKeychainAccount]);
  } catch (error) {
    if (!/could not be found|item not found/i.test(error.message)) throw error;
  }
}

async function readOpenCodeKey() {
  return (await runProcess('/usr/bin/security', ['find-generic-password', '-s', openCodeKeychainService, '-a', openCodeKeychainAccount, '-w'])).trim();
}

async function openCodeKeyConfigured() {
  try {
    return Boolean(await readOpenCodeKey());
  } catch {
    return false;
  }
}

async function openCodeLocalCredentialConfigured() {
  const output = await runProcessWithTimeout(opencodeBin, ['auth', 'list', '--pure'], 5_000).catch(() => '');
  const normalized = output.replace(/\u001b\[[0-9;]*m/g, '');
  const count = normalized.match(/\b(\d+)\s+credentials?\b/i);
  return Number(count?.[1] || 0) > 0;
}

async function saveOpenCodeKey(value) {
  const apiKey = String(value || '').trim();
  if (apiKey.length < 12 || apiKey.length > 4096 || /[\r\n]/.test(apiKey)) throw new Error('Enter a valid OpenCode Zen API key.');
  await runProcess('/usr/bin/security', ['add-generic-password', '-U', '-s', openCodeKeychainService, '-a', openCodeKeychainAccount, '-w', apiKey]);
}

async function deleteOpenCodeKey() {
  try {
    await runProcess('/usr/bin/security', ['delete-generic-password', '-s', openCodeKeychainService, '-a', openCodeKeychainAccount]);
  } catch (error) {
    if (!/could not be found|item not found/i.test(error.message)) throw error;
  }
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const raw = await response.text();
    let value = {};
    try { value = raw ? JSON.parse(raw) : {}; } catch { value = { error: raw.slice(0, 500) }; }
    return { response, value, raw };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The AI request timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function openRouterReplySettings() {
  const stored = ryzenLocal ? await readRyzenPersonalSocialEnv().catch(() => ({})) : {};
  const env = { ...process.env, ...stored };
  const apiKey = String(env.OPENROUTER_API_KEY || '').trim();
  const enabled = /^(?:1|true|yes|on)$/i.test(String(env.CPH_OPENROUTER_COMMENT_ENABLED || ''));
  const baseUrl = String(env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const model = normalizeAiModel(env.CPH_OPENROUTER_COMMENT_MODEL, 'stealth/ox-alpha');
  return {
    apiKey,
    baseUrl,
    model,
    configured: Boolean(apiKey),
    enabled: enabled && Boolean(apiKey),
  };
}

async function openRouterChat(messages, settings, options = {}) {
  if (!settings?.enabled || !settings?.apiKey) throw new Error('OpenRouter is not enabled for PWA replies.');
  const { response, value } = await fetchJsonWithTimeout(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://creatornewsdesk.com',
      'X-OpenRouter-Title': 'Creator Publishing Hub Social Desk',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: Number(options.temperature ?? 0.35),
      max_tokens: Number(options.maxTokens ?? 180),
      reasoning: {
        effort: String(options.reasoningEffort || 'low'),
        exclude: true,
      },
    }),
  }, Number(options.timeoutMs || 60_000));
  if (!response.ok) {
    const error = new Error(String(value?.error?.message || value?.message || `OpenRouter returned ${response.status}`).slice(0, 500));
    error.status = response.status;
    throw error;
  }
  const content = value?.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content.map((part) => part?.text || part?.content || '').join(' ')
    : String(content || '');
  if (!text.trim()) throw new Error('OpenRouter returned an empty response.');
  return text;
}

async function openRouterReply(candidate, settings) {
  const publicCandidate = { ...candidate, crmContext: '' };
  const text = await openRouterChat([
    { role: 'system', content: candidate.kind === 'community-answer'
      ? 'You draft safe, concise Facebook comments for Matthew Murphy to review and post manually on other people\'s posts.'
      : 'You write safe, concise replies for Matthew Murphy on his own Facebook posts.' },
    { role: 'user', content: commentReplyPrompt(publicCandidate) },
  ], settings, { temperature: 0.35, maxTokens: 180 });
  const reply = cleanGeneratedReply(text);
  if (!reply) throw new Error('OpenRouter returned an empty reply.');
  return reply;
}

function ollamaUsageExhausted(status, value, raw = '') {
  const message = `${value?.error || value?.message || ''} ${raw}`.slice(0, 1500);
  if (status === 402) return true;
  return /(?:usage|quota|credit|balance).{0,80}(?:exhausted|exceeded|limit|insufficient|depleted|reached)|(?:insufficient|out of).{0,40}(?:credit|balance)|monthly\s+limit/i.test(message);
}

async function ollamaCloudRequest(path, options = {}) {
  const apiKey = await readOllamaKey().catch(() => '');
  if (!apiKey) throw new Error('Save an Ollama API key in Social Desk first.');
  const { response, value, raw } = await fetchJsonWithTimeout(`https://ollama.com/api/${String(path).replace(/^\/+/, '')}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const error = new Error(String(value?.error || value?.message || `Ollama returned ${response.status}`).slice(0, 500));
    error.status = response.status;
    error.usageExhausted = ollamaUsageExhausted(response.status, value, raw);
    throw error;
  }
  return value;
}

async function ollamaCloudModelCatalog() {
  const apiKey = await readOllamaKey().catch(() => '');
  const { response, value } = await fetchJsonWithTimeout('https://ollama.com/api/tags', {
    method: 'GET',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  }, 15_000);
  if (!response.ok) throw new Error(String(value?.error || value?.message || `Ollama returned ${response.status}`).slice(0, 500));
  return value;
}

function cleanGeneratedReply(value) {
  return repairMojibake(value)
    .replace(/^```(?:text)?\s*|\s*```$/gi, '')
    .replace(/^\s*(?:reply|response)\s*:\s*/i, '')
    .replace(/^['\"]|['\"]$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);
}

function commentReplyPrompt(candidate) {
  return communityReplyPrompt(candidate);
}

async function ollamaReply(candidate, settings) {
  const value = await ollamaCloudRequest('chat', {
    method: 'POST',
    body: JSON.stringify({
      model: settings.model,
      stream: false,
      messages: [
        { role: 'system', content: candidate.kind === 'community-answer'
          ? 'You draft safe, concise Facebook comments for Matthew Murphy to review and post manually on other people\'s posts.'
          : 'You write safe, concise replies for Matthew Murphy on his own Facebook posts.' },
        { role: 'user', content: commentReplyPrompt(candidate) },
      ],
      options: { temperature: 0.45 },
    }),
  });
  const reply = cleanGeneratedReply(value?.message?.content || value?.response || '');
  if (!reply) throw new Error('Ollama returned an empty reply.');
  return reply;
}

async function localOllamaReply(candidate) {
  const { response, value } = await fetchJsonWithTimeout(`${localOllamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: localAiCommentModel,
      stream: false,
      think: false,
      messages: [
        { role: 'system', content: candidate.kind === 'community-answer'
          ? 'You draft safe, concise Facebook comments for Matthew Murphy to review and post manually on other people\'s posts.'
          : 'You write safe, concise replies for Matthew Murphy on his own Facebook posts.' },
        { role: 'user', content: commentReplyPrompt(candidate) },
      ],
      options: { temperature: 0.45, num_predict: 180 },
    }),
  }, 90_000);
  if (!response.ok) throw new Error(String(value?.error || value?.message || `Local Ollama returned ${response.status}`).slice(0, 500));
  const reply = cleanGeneratedReply(value?.message?.content || value?.response || '');
  if (!reply) throw new Error('Local Ollama returned an empty reply.');
  return reply;
}

async function openCodeBigPickleText(prompt) {
  const apiKey = await readOpenCodeKey().catch(() => '');
  const output = await runProcessWithTimeout(opencodeBin, [
    'run', '--pure', '--format', 'json', '--model', 'opencode/big-pickle', '--dir', root, prompt,
  ], 45_000, {
    env: apiKey ? { ...process.env, OPENCODE_API_KEY: apiKey } : process.env,
  });
  const events = output.split(/\r?\n/).map((line) => {
    const start = line.indexOf('{');
    if (start < 0) return null;
    try { return JSON.parse(line.slice(start)); } catch { return null; }
  }).filter(Boolean);
  const failed = events.find((event) => event.type === 'error');
  if (failed) throw new Error(String(failed.error?.data?.message || failed.error?.message || 'OpenCode Big Pickle failed.').slice(0, 500));
  const reply = cleanGeneratedReply(events.filter((event) => event.type === 'text').map((event) => event.part?.text || '').join(' '));
  if (!reply) throw new Error('OpenCode Big Pickle returned an empty reply.');
  return reply;
}

async function openCodeBigPickleReply(candidate) {
  return openCodeBigPickleText(commentReplyPrompt(candidate));
}

function commentIsOlderThanWeek(candidate) {
  if (Number(candidate.commentAgeDays || 0) >= 7) return true;
  const occurredAt = Date.parse(candidate.commentOccurredAt || '');
  return Number.isFinite(occurredAt) && Date.now() - occurredAt >= 7 * 86_400_000;
}

function supersedeMatchingCommentDrafts(drafts = [], current, supersededAt = new Date().toISOString()) {
  for (const previous of drafts) {
    if (previous.commentKey === current.commentKey || previous.kind !== current.kind || ['dismissed', 'sent', 'superseded'].includes(previous.status)) continue;
    const sameExactTarget = current.postUrl
      && previous.postUrl
      && /[?&](?:comment_id|reply_comment_id)=/i.test(current.postUrl)
      && canonicalFacebookCommentUrl(previous.postUrl) === canonicalFacebookCommentUrl(current.postUrl);
    const sameActor = (current.actorId && previous.actorId === current.actorId)
      || (current.actorUrl && canonicalFacebookUrl(previous.actorUrl) === current.actorUrl);
    const previousText = repairMojibake(previous.commentText).replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const currentText = repairMojibake(current.commentText).replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    if (!sameExactTarget && (!sameActor || previousText !== currentText)) continue;
    previous.status = 'superseded';
    previous.supersededBy = current.id;
    previous.supersededAt = supersededAt;
    previous.lastError = '';
  }
}

async function createCommentReplyDraft(payload) {
  const commentKey = String(payload.commentKey || '').trim().slice(0, 160);
  const actorUrl = canonicalFacebookUrl(payload.actorUrl);
  const actorId = String(payload.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
  const actorName = repairMojibake(payload.actorName).trim().slice(0, 160);
  const quality = classifyComment({ text: payload.commentText, actorName });
  const kind = payload.kind === 'community-answer' ? 'community-answer' : 'owned-post-reply';
  const creatorIntelligenceAssist = payload.assistLane === 'creator-intelligence';
  const postUrl = canonicalFacebookCommentUrl(payload.postUrl);
  const capturedExactComment = /[?&](?:comment_id|reply_comment_id)=/i.test(postUrl);
  const exactTarget = kind === 'community-answer' ? postUrl : capturedExactComment || actorId || actorUrl;
  if (!/^[a-z0-9:_-]{8,160}$/i.test(commentKey) || !exactTarget || !actorName) throw new Error('An exact Facebook comment or post target and identity are required.');
  if (!quality.eligibleForAutoLike && !creatorIntelligenceAssist) throw new Error('This comment is not eligible for an automatic AI reply.');
  if (payload.answeredByMatthew === true) throw new Error('Matthew already replied to this comment.');

  const ledger = await readJson(commentReplyLedgerFile);
  const existingReply = (ledger.replies || []).find((reply) => reply.commentKey === commentKey && reply.status === 'sent' && reply.parentVerified === true);
  if (existingReply) return { duplicate: true, alreadyReplied: true, reply: existingReply };
  const existingDraft = (ledger.drafts || []).find((draft) => draft.commentKey === commentKey && !['dismissed', 'sent'].includes(draft.status));
  if (existingDraft) {
    const capturedExactTarget = /[?&](?:comment_id|reply_comment_id)=/i.test(postUrl);
    if (capturedExactTarget) {
      const targetChanged = existingDraft.postUrl !== postUrl;
      const refreshedAt = new Date().toISOString();
      existingDraft.replyText = ensureCommunityReplyQuestion(existingDraft.replyText, existingDraft);
      if (targetChanged) {
        existingDraft.postUrl = postUrl;
        existingDraft.status = kind === 'owned-post-reply' ? 'approved' : existingDraft.status;
        existingDraft.attemptCount = 0;
        existingDraft.actionAt = null;
        existingDraft.lastError = '';
        existingDraft.targetRefreshedAt = refreshedAt;
      }
      supersedeMatchingCommentDrafts(ledger.drafts || [], existingDraft, refreshedAt);
      ledger.updatedAt = refreshedAt;
      await writeJson(commentReplyLedgerFile, ledger);
      return { duplicate: true, targetRefreshed: targetChanged, draft: existingDraft };
    }
    return { duplicate: true, draft: existingDraft };
  }

  const [settings, audience, engagementNotes] = await Promise.all([
    readAiCommentSettings(),
    readJson(audienceFile).catch(() => ({ people: [] })),
    readJson(engagementNotesFile).catch(() => ({ notes: [] })),
  ]);
  const crmPerson = findExactFacebookRecord(audience.people, actorId, actorUrl);
  const crmNote = findExactFacebookRecord(engagementNotes.notes, actorId, actorUrl);
  const crmContext = [
    crmPerson?.tier ? `audience tier ${crmPerson.tier}` : '',
    crmPerson?.engagementLevel ? `engagement level ${crmPerson.engagementLevel}` : '',
    crmPerson?.friend === true ? 'Facebook friend' : '',
    crmPerson?.following === true ? 'Matthew follows this person' : '',
    crmNote?.note ? `relationship note: ${crmNote.note}` : '',
  ].filter(Boolean).join('; ');
  const candidate = {
    kind,
    assistLane: creatorIntelligenceAssist ? 'creator-intelligence' : '',
    commentKey,
    actorId,
    actorUrl,
    actorName,
    commentText: creatorIntelligenceAssist
      ? repairMojibake(payload.commentText).replace(/\s+/g, ' ').trim().slice(0, 600)
      : quality.text,
    postContext: repairMojibake(payload.postContext).replace(/\s+/g, ' ').trim().slice(0, 1600),
    crmContext: repairMojibake(crmContext).replace(/\s+/g, ' ').trim().slice(0, 800),
    ...classifyCommunityReplyIntent(quality.text),
    commentQuality: creatorIntelligenceAssist ? 'captured-post' : quality.quality,
    commentAgeDays: Math.max(0, Number(payload.commentAgeDays || 0)),
    commentOccurredAt: /^\d{4}-\d{2}-\d{2}T/.test(String(payload.commentOccurredAt || '')) ? new Date(payload.commentOccurredAt).toISOString() : null,
    postUrl,
    sourceUrl: canonicalFacebookUrl(payload.sourceUrl),
  };

  const openRouter = await openRouterReplySettings();
  let provider = openRouter.enabled ? 'openrouter' : ryzenLocal ? 'ollama-local' : 'ollama';
  let fallbackReason = '';
  let replyText = '';
  try {
    replyText = provider === 'openrouter'
      ? await openRouterReply(candidate, openRouter)
      : ryzenLocal
      ? await localOllamaReply(candidate)
      : await ollamaReply(candidate, settings);
  } catch (error) {
    if (provider === 'openrouter') {
      provider = ryzenLocal ? 'ollama-local' : 'ollama';
      fallbackReason = `openrouter-${Number(error.status || 0) || 'unavailable'}`;
      replyText = ryzenLocal
        ? await localOllamaReply(candidate)
        : await ollamaReply(candidate, settings);
    } else {
      if (ryzenLocal || !error.usageExhausted || settings.fallbackEnabled !== true) throw error;
      provider = 'opencode';
      fallbackReason = 'ollama-usage-exhausted';
      replyText = await openCodeBigPickleReply(candidate);
    }
  }

  if (commentIsOlderThanWeek(candidate) && !/^sorry,?\s+this\s+(?:just\s+)?showed\s+up/i.test(replyText)) {
    replyText = `Sorry, this just showed up for me — ${replyText}`;
  }
  replyText = cleanGeneratedReply(ensureCommunityReplyQuestion(replyText, candidate));
  const draft = {
    id: randomUUID(),
    ...candidate,
    replyText,
    provider,
    model: provider === 'openrouter' ? openRouter.model : provider === 'ollama-local' ? localAiCommentModel : provider === 'ollama' ? settings.model : settings.fallbackModel,
    fallbackReason,
    status: kind === 'owned-post-reply' && settings.autoSendOwnedReplies === true ? 'approved' : 'draft',
    createdAt: new Date().toISOString(),
    reviewedAt: kind === 'owned-post-reply' && settings.autoSendOwnedReplies === true ? new Date().toISOString() : null,
    reviewedBy: kind === 'owned-post-reply' && settings.autoSendOwnedReplies === true ? 'owned-reply-policy' : null,
    source: candidate.assistLane || 'personal-social-chrome-extension',
    handoff: candidate.assistLane === 'creator-intelligence' ? 'copy-and-open' : undefined,
  };
  supersedeMatchingCommentDrafts(ledger.drafts || [], draft, draft.createdAt);
  ledger.drafts = [...(ledger.drafts || []), draft].slice(-20_000);
  ledger.updatedAt = draft.createdAt;
  await writeJson(commentReplyLedgerFile, ledger);
  return { duplicate: false, draft };
}

function nightDateKey(date = new Date(), timeZone = DEFAULT_AI_NIGHTLY_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function syncAiNightlyResults() {
  const stored = await readJson(aiNightlyLaneFile);
  const pending = (stored.requests || []).filter((request) => request.status === 'spooled-awaiting-ryzen').slice(0, 3);
  if (!pending.length) return { imported: 0, checked: 0 };
  const queue = await readJson(queueFile);
  const firstComments = await readJson(firstCommentLedgerFile);
  let imported = 0;
  let changed = false;
  for (const request of pending) {
    const filename = `${String(request.requestedAt || '').slice(0, 10)}-${request.id}.json`;
    let result;
    try { result = await readJsonFromRyzen(`${ryzenSpool}/done/${filename}`); }
    catch {
      try {
        await readJsonFromRyzen(`${ryzenSpool}/failed/${filename}`);
        request.status = 'failed';
        request.completedAt = new Date().toISOString();
        request.lastError = 'Ryzen nightly draft generation failed its validation gate.';
        changed = true;
      } catch {}
      continue;
    }
    const generated = Array.isArray(result.generatedDrafts) ? result.generatedDrafts.slice(0, 5) : [];
    if (!generated.length) continue;
    const existing = new Set((queue.items || []).filter((item) => item?.campaign?.nightlyRequestId === request.id).map((item) => item?.campaign?.nightlyIndex));
    const assignment = assignAiNightlySlots({
      nightDate: request.nightDate,
      lane: { timeZone: request.timeZone, slots: request.slots },
      candidates: generated.map((post, index) => ({
        id: `${request.id}:${index}`,
        sourceKind: 'local-candidate',
        ownedDestination: true,
        postApproval: { approved: true, approvedBy: 'ryzen-generation-gate' },
        priority: generated.length - index,
      })),
    });
    for (let index = 0; index < generated.length; index += 1) {
      if (existing.has(index)) continue;
      const post = generated[index];
      const visualTestVariant = post.visualTestVariant === 'text-only' ? 'text-only' : 'future-comic';
      const mediaLane = visualTestVariant === 'text-only' ? 'text-only-control' : 'future-comic';
      const slot = assignment.assignments.find((entry) => entry.candidateId === `${request.id}:${index}`);
      if (!slot || !String(post.title || '').trim() || !String(post.body || '').trim()) continue;
      const createdAt = new Date().toISOString();
      const draft = {
        id: randomUUID(),
        title: String(post.title).replace(/\s+/g, ' ').trim().slice(0, 140),
        body: String(post.body).replace(/\r\n?/g, '\n').trim().slice(0, 5000),
        target: 'matthew-page',
        format: 'feed',
        status: 'draft',
        scheduledFor: slot.scheduledFor,
        intendedScheduledFor: slot.scheduledFor,
        source: `ai-nightly:${request.id}:${index}`,
        notes: `Original AI-topic draft generated on Ryzen from research signals. ${visualTestVariant === 'text-only' ? 'Caption-only format control; no image or Story is required.' : 'Original futuristic-comic treatment; review both artwork roles.'} Review wording, facts, timing, and any media before approving. Source posts are research only and must never receive automated engagement.`,
        storyMode: visualTestVariant === 'text-only' ? 'disabled' : 'paired',
        approvalRequired: true,
        publishToFacebook: false,
        media: [],
        imagePrompt: visualTestVariant === 'text-only' ? '' : String(post.imagePrompt || '').trim().slice(0, 5000),
        storyImagePrompt: visualTestVariant === 'text-only' ? '' : String(post.storyImagePrompt || '').trim().slice(0, 5000),
        campaign: {
          kind: 'ai-nightly',
          mediaLane,
          visualTestVariant,
          formatExperiment: 'ai-nightly-future-comic-vs-text-v1',
          artDirection: String(post.artDirection || '').trim().slice(0, 1000),
          nightlyRequestId: request.id,
          nightlyIndex: index,
          nightDate: request.nightDate,
          slot: slot.slot,
          sourceKeys: Array.isArray(post.sourceKeys) ? post.sourceKeys.slice(0, 10) : [],
          generatedBy: result.worker?.model || 'ryzen-local-model',
        },
        createdAt,
      };
      queue.items.unshift(draft);
      const commentText = String(post.firstComment || '').trim().slice(0, 2000);
      if (commentText) {
        firstComments.comments.unshift({
          id: randomUUID(),
          draftId: draft.id,
          target: draft.target,
          text: commentText,
          status: 'draft',
          approvalRequired: true,
          createdAt,
          updatedAt: createdAt,
        });
      }
      imported += 1;
    }
    request.status = 'drafts-ready-for-approval';
    request.completedAt = result.worker?.processedAt || new Date().toISOString();
    request.generatedDrafts = generated.length;
    request.importedDrafts = (queue.items || []).filter((item) => item?.campaign?.nightlyRequestId === request.id).length;
    changed = true;
  }
  if (changed) {
    const updatedAt = new Date().toISOString();
    stored.updatedAt = updatedAt;
    queue.updatedAt = updatedAt;
    firstComments.updatedAt = updatedAt;
    await Promise.all([
      writeJson(aiNightlyLaneFile, stored),
      writeJson(queueFile, queue),
      writeJson(firstCommentLedgerFile, firstComments),
    ]);
  }
  return { imported, checked: pending.length };
}

async function aiNightlyLaneSummary() {
  const [stored, creatorIntelligence, queue, firstComments] = await Promise.all([
    readJson(aiNightlyLaneFile),
    readJson(creatorIntelligenceLedgerFile),
    readJson(queueFile),
    readJson(firstCommentLedgerFile),
  ]);
  const lane = normalizeAiNightlyLane(stored);
  const nightlyDrafts = (queue.items || []).filter((item) => item?.campaign?.kind === 'ai-nightly').slice(0, 100);
  return {
    updatedAt: stored.updatedAt || null,
    enabled: stored.enabled !== false,
    target: 'matthew-page',
    ...lane,
    researchCandidates: (creatorIntelligence.posts || []).length,
    requests: (stored.requests || []).slice(0, 20),
    drafts: nightlyDrafts,
    firstComments: (firstComments.comments || []).filter((entry) => nightlyDrafts.some((draft) => draft.id === entry.draftId)),
    policy: 'Ryzen may research AI topics and generate original drafts. Every post and every first comment requires separate approval. Third-party engagement is never dispatched.',
  };
}

async function requestAiNightlyBatch(payload = {}) {
  const [stored, creatorIntelligence] = await Promise.all([
    readJson(aiNightlyLaneFile),
    readJson(creatorIntelligenceLedgerFile),
  ]);
  const lane = normalizeAiNightlyLane({ ...stored, ...(payload.slots ? { slots: payload.slots } : {}) });
  const nightDate = String(payload.nightDate || nightDateKey(new Date(), lane.timeZone));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nightDate)) throw new Error('Night date must use YYYY-MM-DD.');
  const sources = (creatorIntelligence.posts || []).slice(0, Math.max(12, lane.slots.length * 4)).map((post) => ({
    key: post.key,
    sourceKey: post.sourceKey,
    author: post.author,
    postUrl: post.postUrl,
    text: String(post.text || '').slice(0, 5000),
    metrics: post.metrics || {},
  }));
  if (!sources.length) throw new Error('Ryzen has not supplied any AI research candidates yet. Sync the watcher before requesting tonight.');
  const requestedAt = new Date().toISOString();
  const request = {
    id: randomUUID(),
    nightDate,
    timeZone: lane.timeZone,
    slots: lane.slots,
    target: 'matthew-page',
    requestedAt,
    status: 'spooled-awaiting-ryzen',
    sourceCount: sources.length,
    automatic: payload.automatic === true,
  };
  await sendToRyzen({
    id: request.id,
    type: 'ai-nightly-original-draft-batch',
    requestedBy: 'mmurphy',
    explicitUserRequest: payload.automatic !== true,
    automatic: payload.automatic === true,
    target: request.target,
    nightDate,
    timeZone: lane.timeZone,
    slots: lane.slots,
    postApprovalRequired: true,
    firstCommentApprovalRequired: true,
    thirdPartyEngagementAllowed: false,
    instructions: 'Use the research only to identify topics. Write wholly original Built Not Begged posts, never copy source wording, and return every post as an unapproved Social Desk draft. Use the ai-nightly-future-comic-vs-text-v1 experiment: three slots receive distinct wholly original futuristic-comic Landscape and Story prompts that become progressively more advanced, while the 23:00 slot is a caption-only control with no required media. Preserve Matthew likeness and the exact spaced signature in artwork. Do not name or imitate copyrighted franchises, characters, artists, costumes, logos, or recognizable layouts. Include a separate optional first-comment draft for review. Do not like, react, save, follow, or comment on any source post.',
    sources,
    requestedAt,
  });
  stored.enabled = true;
  stored.timeZone = lane.timeZone;
  stored.slots = [...lane.slots];
  stored.target = 'matthew-page';
  stored.approvalRequired = true;
  stored.requests = [request, ...(stored.requests || [])].slice(0, 100);
  stored.updatedAt = requestedAt;
  await writeJson(aiNightlyLaneFile, stored);
  return request;
}

async function ensureAiNightlyBatch(now = new Date()) {
  // The receiver and Social Desk intentionally keep separate ledgers. Refresh
  // the Social Desk copy before deciding whether tonight has any research.
  await syncCreatorIntelligenceFromRyzen();
  const stored = await readJson(aiNightlyLaneFile);
  if (stored.enabled === false) return { created: false, reason: 'disabled' };
  const lane = normalizeAiNightlyLane(stored);
  const nightDate = nightDateKey(now, lane.timeZone);
  const existing = (stored.requests || []).find((request) => (
    request.nightDate === nightDate
    && !['cancelled', 'failed'].includes(String(request.status || '').toLowerCase())
  ));
  if (existing) return { created: false, reason: 'already-requested', request: existing };
  const request = await requestAiNightlyBatch({ nightDate, automatic: true });
  return { created: true, request };
}

function verifiedOwnedFacebookProof(item = {}, record = {}, scheduled = {}) {
  const graphId = String(item.facebookHandoff?.graphId || record.graphId || scheduled.graphId || '').trim();
  const postUrl = canonicalFacebookUrl(item.facebookHandoff?.sourceUrl || record.facebookUrl || scheduled.sourceUrl || '');
  const verified = Boolean(item.facebookHandoff?.facebookConfirmed || record.confirmedAt || scheduled.observedAt || graphId);
  return { verified, graphId, postUrl, verifiedAt: item.facebookHandoff?.confirmedAt || record.confirmedAt || scheduled.observedAt || null };
}

async function dispatchApprovedFirstComments() {
  const [ledger, queue, metrics, scheduledLedger] = await Promise.all([
    readJson(firstCommentLedgerFile),
    readJson(queueFile),
    readJson(publishingMetricsFile).catch(() => emptyPublishingMetrics()),
    readJson(scheduledContentLedgerFile),
  ]);
  let changed = false;
  for (const comment of ledger.comments || []) {
    if (comment.status !== 'approved-awaiting-post') continue;
    const item = (queue.items || []).find((entry) => entry.id === comment.draftId);
    if (!item || item.target !== 'matthew-page') {
      comment.status = 'failed';
      comment.lastError = 'Only an owned Built Not Begged Page draft can receive an approved first comment.';
      comment.updatedAt = new Date().toISOString();
      changed = true;
      continue;
    }
    if (!item.scheduledFor || Date.parse(item.scheduledFor) > Date.now()) continue;
    const record = (metrics.posts || []).find((entry) => entry.draftId === item.id) || {};
    const scheduled = scheduledLedgerMatchForItem(item, scheduledLedger.items || []) || {};
    const proof = verifiedOwnedFacebookProof(item, record, scheduled);
    if (!proof.verified || (!proof.graphId && !proof.postUrl)) continue;
    try {
      const allowed = assertAiFirstCommentPostingAllowed({
        candidate: {
          id: item.id,
          sourceKind: 'local-draft',
          ownedDestination: true,
          postApproval: { approved: true, approvedAt: item.approvedAt, approvedBy: 'mmurphy' },
        },
        facebookProof: { verified: true, graphId: proof.graphId, facebookUrl: proof.postUrl, verifiedAt: proof.verifiedAt },
        firstComment: {
          text: comment.text,
          approval: { approved: true, approvedAt: comment.approvedAt, approvedBy: 'mmurphy' },
        },
      });
      await sendToRyzen({
        id: comment.id,
        type: 'facebook-own-post-first-comment',
        requestedBy: 'mmurphy',
        explicitUserApproval: true,
        draftId: item.id,
        target: item.target,
        graphId: allowed.facebookProof.postId,
        facebookUrl: allowed.facebookProof.postUrl,
        commentText: allowed.firstComment.text,
        approvedAt: comment.approvedAt,
      });
      comment.status = 'spooled-awaiting-facebook-proof';
      comment.graphId = allowed.facebookProof.postId;
      comment.facebookUrl = allowed.facebookProof.postUrl;
      comment.spooledAt = new Date().toISOString();
      comment.lastError = '';
    } catch (error) {
      comment.lastError = String(error.message || error).slice(0, 500);
      comment.lastAttemptAt = new Date().toISOString();
    }
    comment.updatedAt = new Date().toISOString();
    changed = true;
  }
  if (changed) {
    ledger.updatedAt = new Date().toISOString();
    await writeJson(firstCommentLedgerFile, ledger);
  }
  return ledger;
}

function send(res, status, value) {
  if (!res.hasHeader('Access-Control-Allow-Origin')) res.setHeader('Access-Control-Allow-Origin', 'https://www.facebook.com');
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function api(req, res, url) {
  if (url.pathname === '/api/ollama-settings' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const [settings, openRouter] = await Promise.all([readAiCommentSettings(), openRouterReplySettings()]);
    return send(res, 200, {
      configured: await ollamaKeyConfigured(),
      openCodeConfigured: await openCodeKeyConfigured(),
      openCodeLocalConfigured: await openCodeLocalCredentialConfigured(),
      openRouterConfigured: openRouter.configured,
      openRouterEnabled: openRouter.enabled,
      openRouterModel: openRouter.model,
      preferredProvider: openRouter.enabled ? 'openrouter' : ryzenLocal ? 'ollama-local' : 'ollama',
      ...settings,
    });
  }
  if (url.pathname === '/api/ollama-settings' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const payload = await bodyJson(req);
    if (String(payload.apiKey || '').trim()) await saveOllamaKey(payload.apiKey);
    if (String(payload.openCodeApiKey || '').trim()) await saveOpenCodeKey(payload.openCodeApiKey);
    const current = await readAiCommentSettings();
    const settings = {
      ...current,
      model: normalizeAiModel(payload.model, current.model),
      fallbackEnabled: payload.fallbackEnabled === undefined ? current.fallbackEnabled : payload.fallbackEnabled === true,
      autoSendOwnedReplies: payload.autoSendOwnedReplies === undefined ? current.autoSendOwnedReplies : payload.autoSendOwnedReplies === true,
      fallbackModel: 'opencode/big-pickle',
      updatedAt: new Date().toISOString(),
    };
    await writeJson(aiCommentSettingsFile, settings);
    const openRouter = await openRouterReplySettings();
    return send(res, 200, {
      configured: await ollamaKeyConfigured(),
      openCodeConfigured: await openCodeKeyConfigured(),
      openCodeLocalConfigured: await openCodeLocalCredentialConfigured(),
      openRouterConfigured: openRouter.configured,
      openRouterEnabled: openRouter.enabled,
      openRouterModel: openRouter.model,
      preferredProvider: openRouter.enabled ? 'openrouter' : ryzenLocal ? 'ollama-local' : 'ollama',
      ...settings,
    });
  }
  if (url.pathname === '/api/ollama-key' && req.method === 'DELETE') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    await deleteOllamaKey();
    return send(res, 200, { configured: false });
  }
  if (url.pathname === '/api/opencode-key' && req.method === 'DELETE') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    await deleteOpenCodeKey();
    return send(res, 200, { openCodeConfigured: false });
  }
  if (url.pathname === '/api/ollama-models' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const value = await ollamaCloudModelCatalog();
    const models = [...new Set((value.models || []).map((entry) => normalizeAiModel(entry.model || entry.name, '')).filter(Boolean))].sort();
    return send(res, 200, { models, count: models.length });
  }
  if (url.pathname === '/api/ollama-test' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const settings = await readAiCommentSettings();
    const value = await ollamaCloudRequest('chat', {
      method: 'POST',
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        options: { temperature: 0, num_predict: 2 },
      }),
    });
    if (!cleanGeneratedReply(value?.message?.content || value?.response || '')) return send(res, 502, { error: 'Ollama returned an empty test response.' });
    return send(res, 200, { ok: true, model: settings.model });
  }
  if (url.pathname === '/api/opencode-test' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const configured = await openCodeKeyConfigured();
    const localConfigured = configured ? false : await openCodeLocalCredentialConfigured();
    const reply = await openCodeBigPickleText('Reply with exactly OK and nothing else.');
    if (!reply) return send(res, 502, { error: 'OpenCode Big Pickle returned an empty test response.' });
    return send(res, 200, {
      ok: true,
      model: 'opencode/big-pickle',
      credentialSource: configured ? 'the saved Keychain key' : localConfigured ? "the Mac's existing OpenCode login" : 'no configured credential',
    });
  }
  if (url.pathname === '/api/openrouter-test' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const settings = await openRouterReplySettings();
    if (!settings.enabled) return send(res, 409, { error: 'OpenRouter is not enabled for PWA replies.' });
    const reply = cleanGeneratedReply(await openRouterChat([
      { role: 'user', content: 'Reply with exactly OK and nothing else.' },
    ], settings, { temperature: 0, maxTokens: 32, reasoningEffort: 'low' }));
    if (reply.toUpperCase() !== 'OK') return send(res, 502, { error: 'OpenRouter returned an unexpected test response.' });
    return send(res, 200, { ok: true, model: settings.model, provider: 'openrouter' });
  }
  if (url.pathname === '/api/extension/hourly-feed' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const [commentReplies, birthdayLedger, groupLedger, scheduledContent, replySettings] = await Promise.all([
      readJson(commentReplyLedgerFile),
      readJson(birthdayLedgerFile),
      readJson(pageGroupDistributionFile),
      readJson(scheduledContentLedgerFile).catch(() => ({ items: [] })),
      readAiCommentSettings(),
    ]);
    const now = new Date();
    const replyTasks = (replySettings.autoSendOwnedReplies === true
      ? selectOwnedReplyDrafts(commentReplies.drafts || [], commentReplies.replies || [], { now, limit: 10 })
      : [])
      .map((draft) => ({
        id: draft.id,
        type: 'owned-comment-reply',
        commentKey: draft.commentKey,
        actorId: draft.actorId || '',
        actorUrl: draft.actorUrl || '',
        actorName: draft.actorName || '',
        commentText: draft.commentText || '',
        postUrl: draft.postUrl,
        replyText: draft.replyText,
        provider: draft.provider || '',
        model: draft.model || '',
        attemptCount: Number(draft.attemptCount || 0),
        targetRefreshedAt: draft.targetRefreshedAt || null,
      }));
    const scanUrls = [
      'https://business.facebook.com/latest/inbox/facebook?asset_id=968473109678168',
      'https://www.facebook.com/professional_dashboard/engagement/comments_manager/',
      'https://www.facebook.com/matthewxmurphybuiltnotbegged',
      ...(scheduledContent.items || [])
        .filter((item) => item.target === 'matthew-page' && Date.parse(item.scheduledFor || 0) <= now.getTime())
        .sort((left, right) => Date.parse(right.scheduledFor || 0) - Date.parse(left.scheduledFor || 0))
        .map((item) => canonicalFacebookUrl(item.sourceUrl)),
    ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).slice(0, 8);
    const birthdayAttemptAgeMs = now.getTime() - Date.parse(birthdayLedger.lastAttemptAt || birthdayLedger.updatedAt || 0);
    const groupTask = nextDuePageGroupDistribution(groupLedger, now);
    return send(res, 200, {
      schema: 'cph-engagement-cycle-feed/v2',
      generatedAt: now.toISOString(),
      cadenceMinutes: COMMENT_REPLY_CADENCE_MINUTES,
      owner: 'ryzen-social-desk',
      page: {
        name: 'Matthew Murphy : Built Not Begged',
        url: 'https://www.facebook.com/matthewxmurphybuiltnotbegged',
        assetId: '968473109678168',
        scanUrls,
      },
      birthdayCapture: {
        due: !Number.isFinite(birthdayAttemptAgeMs) || birthdayAttemptAgeMs >= 55 * 60 * 1000,
        url: 'https://www.facebook.com/friends/birthdays',
        lastCapturedAt: birthdayLedger.updatedAt || null,
        lastAttemptAt: birthdayLedger.lastAttemptAt || null,
      },
      replyTasks,
      groupTask: groupTask ? { ...groupTask, execution: 'signed-in-browser-extension', apiUnavailable: true } : null,
      policy: {
        automaticOwnedReplies: replySettings.autoSendOwnedReplies === true,
        ownedReplyApprovalRequired: false,
        retryAfterMinutes: COMMENT_REPLY_RETRY_AFTER_MS / 60_000,
        maxDeliveryAttempts: COMMENT_REPLY_MAX_ATTEMPTS,
        groupApprovalRequired: true,
        groupGraphApiAvailable: false,
        requireRenderedProof: true,
      },
    });
  }
  if (url.pathname === '/api/comment-replies' && req.method === 'GET') {
    const [ledger, moderation, creatorIntelligence] = await Promise.all([
      readJson(commentReplyLedgerFile),
      readJson(groupModerationLedgerFile).catch(() => ({ items: [] })),
      readJson(creatorIntelligenceLedgerFile).catch(() => ({ posts: [] })),
    ]);
    const drafts = Array.isArray(ledger.drafts) ? ledger.drafts : [];
    const replies = Array.isArray(ledger.replies) ? ledger.replies : [];
    const draftedKeys = new Set(drafts.map((draft) => draft.commentKey));
    const communityOpportunities = (moderation.items || []).filter((item) => (
      item.postUrl
      && ['approved', 'captured'].includes(item.status)
      && /\?|\b(?:how|what|why|can|could|should|would|help|advice)\b/i.test(item.body || '')
    )).map((item) => ({
      key: item.key,
      commentKey: `community:${createHash('sha256').update(String(item.key)).digest('hex').slice(0, 24)}`,
      actorName: item.authorName || 'Group member',
      postUrl: item.postUrl,
      text: item.body,
      queueType: item.queueType,
      opportunityType: 'group-question',
      alreadyDrafted: draftedKeys.has(`community:${createHash('sha256').update(String(item.key)).digest('hex').slice(0, 24)}`),
    })).filter((item) => !item.alreadyDrafted).slice(-100).reverse();
    const creatorIntelligenceOpportunities = creatorIntelligenceEngagementOpportunities(
      creatorIntelligence.posts || [],
      draftedKeys,
      { limit: 50 },
    );
    const opportunities = [...creatorIntelligenceOpportunities, ...communityOpportunities].slice(0, 100);
    return send(res, 200, {
      updatedAt: ledger.updatedAt || null,
      drafted: drafts.length,
      waiting: drafts.filter((draft) => draft.status === 'draft').length,
      approved: drafts.filter((draft) => draft.status === 'approved').length,
      sent: replies.filter((reply) => reply.status === 'sent').length,
      attempted: replies.filter((reply) => reply.status === 'attempted').length,
      lastProvider: drafts.at(-1)?.provider || '',
      lastModel: drafts.at(-1)?.model || '',
      drafts: [...drafts].filter((draft) => !['dismissed', 'sent', 'superseded'].includes(draft.status)).reverse().slice(0, 75),
      replies: [...replies].reverse().slice(0, 100),
      opportunities,
    });
  }
  if (url.pathname === '/api/comment-reply-status' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const commentKey = String(url.searchParams.get('commentKey') || '').trim().slice(0, 160);
    if (!/^[a-z0-9:_-]{8,160}$/i.test(commentKey)) return send(res, 400, { error: 'An exact comment is required.' });
    const ledger = await readJson(commentReplyLedgerFile);
    const reply = (ledger.replies || []).find((entry) => entry.commentKey === commentKey && entry.status === 'sent' && entry.parentVerified === true) || null;
    const draft = (ledger.drafts || []).findLast?.((entry) => entry.commentKey === commentKey && !['dismissed', 'sent'].includes(entry.status))
      || [...(ledger.drafts || [])].reverse().find((entry) => entry.commentKey === commentKey && !['dismissed', 'sent'].includes(entry.status))
      || null;
    return send(res, 200, { commentKey, eligible: !reply, replied: Boolean(reply), reply, draft });
  }
  if (url.pathname === '/api/comment-reply-draft' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    try {
      const payload = await bodyJson(req);
      return send(res, 200, await serializeCommentReplyLedgerMutation(() => createCommentReplyDraft(payload)));
    } catch (error) {
      return send(res, error.usageExhausted ? 402 : 400, { error: error.message, usageExhausted: error.usageExhausted === true });
    }
  }
  if (url.pathname === '/api/community-answer-draft' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      const moderation = await readJson(groupModerationLedgerFile);
      const item = (moderation.items || []).find((entry) => entry.key === String(payload.key || ''));
      if (!item?.postUrl || !['approved', 'captured'].includes(item.status)) return send(res, 404, { error: 'An approved captured group question with an exact post URL is required.' });
      const commentKey = `community:${createHash('sha256').update(String(item.key)).digest('hex').slice(0, 24)}`;
      return send(res, 200, await serializeCommentReplyLedgerMutation(() => createCommentReplyDraft({
        kind: 'community-answer',
        commentKey,
        actorName: item.authorName || 'Group member',
        commentText: item.body,
        postContext: 'A creator asked this question in Built Not Begged: Creator Growth Hub. Answer with practical educational value and no promotion.',
        postUrl: item.postUrl,
        sourceUrl: item.postUrl,
      })));
    } catch (error) {
      return send(res, error.usageExhausted ? 402 : 400, { error: error.message, usageExhausted: error.usageExhausted === true });
    }
  }
  if (url.pathname === '/api/creator-intelligence/engagement-assist' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(creatorIntelligenceLedgerFile);
      const item = (ledger.posts || []).find((entry) => entry.key === String(payload.key || ''));
      if (!item?.postUrl || item.researchOnly !== true) return send(res, 404, { error: 'A captured Creator Intelligence post with an exact Facebook URL is required.' });
      const metrics = item.metrics || {};
      return send(res, 200, await serializeCommentReplyLedgerMutation(() => createCommentReplyDraft({
        kind: 'community-answer',
        assistLane: 'creator-intelligence',
        commentKey: creatorIntelligenceDiscussionKey(item),
        actorName: item.author,
        commentText: item.text,
        postContext: `Creator Intelligence captured this public AI post for research. Draft a distinct comment for Matthew Murphy : Built Not Begged that adds one concrete observation tied to the actual post, or asks one thoughtful question. Do not use generic praise, mention becoming a top fan, promote Matthew, copy the source wording, or imply an action was taken. Visible engagement: ${Number(metrics.reactions || 0)} reactions, ${Number(metrics.comments || 0)} comments, ${Number(metrics.shares || 0)} shares.`,
        postUrl: item.postUrl,
        sourceUrl: item.sourceUrl,
      })));
    } catch (error) {
      return send(res, error.usageExhausted ? 402 : 400, { error: error.message, usageExhausted: error.usageExhausted === true });
    }
  }
  const commentReplyReviewMatch = url.pathname.match(/^\/api\/comment-replies\/([^/]+)\/review$/);
  if (commentReplyReviewMatch && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      if (!['approve', 'dismiss'].includes(payload.action)) return send(res, 400, { error: 'action must be approve or dismiss.' });
      return await serializeCommentReplyLedgerMutation(async () => {
        const ledger = await readJson(commentReplyLedgerFile);
        const draft = (ledger.drafts || []).find((entry) => entry.id === decodeURIComponent(commentReplyReviewMatch[1]));
        if (!draft) return send(res, 404, { error: 'Reply draft not found.' });
        if (['sent', 'dismissed'].includes(draft.status)) return send(res, 409, { error: `A ${draft.status} reply cannot be reviewed.` });
        const reviewedAt = new Date().toISOString();
        draft.status = payload.action === 'approve' ? 'approved' : 'dismissed';
        draft.reviewedAt = reviewedAt;
        draft.reviewedBy = 'mmurphy';
        ledger.updatedAt = reviewedAt;
        await writeJson(commentReplyLedgerFile, ledger);
        return send(res, 200, { draft });
      });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/comment-reply-capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const payload = await bodyJson(req);
    const commentKey = String(payload.commentKey || '').trim().slice(0, 160);
    const replyText = cleanGeneratedReply(payload.replyText);
    if (!/^[a-z0-9:_-]{8,160}$/i.test(commentKey) || !replyText) return send(res, 400, { error: 'An exact comment and reply are required.' });
    return serializeCommentReplyLedgerMutation(async () => {
      const ledger = await readJson(commentReplyLedgerFile);
      const parentVerified = payload.parentVerified === true && payload.parentCommentKey === commentKey;
      const status = payload.status === 'sent' && parentVerified ? 'sent' : 'attempted';
      const existing = (ledger.replies || []).find((entry) => entry.commentKey === commentKey && entry.status === 'sent' && entry.parentVerified === true);
      if (existing) return send(res, 200, { added: 0, duplicate: true, reply: existing });
      const recordedPreviousAttempt = [...(ledger.replies || [])].reverse().find((entry) => entry.commentKey === commentKey && entry.status === 'attempted');
      const targetRefreshedAt = Date.parse(payload.targetRefreshedAt || '');
      const previousAttempt = recordedPreviousAttempt && Number.isFinite(targetRefreshedAt)
        && Date.parse(recordedPreviousAttempt.actionAt || 0) < targetRefreshedAt
        ? null
        : recordedPreviousAttempt;
      const attemptCount = status === 'attempted'
        ? nextCommentReplyAttempt(payload.attemptCount, previousAttempt?.attemptCount)
        : Math.max(Number(payload.attemptCount || 0), Number(previousAttempt?.attemptCount || 0));
      const reply = {
        id: randomUUID(),
        commentKey,
        actorId: String(payload.actorId || '').replace(/\D/g, ''),
        actorUrl: canonicalFacebookUrl(payload.actorUrl),
        actorName: repairMojibake(payload.actorName).trim().slice(0, 160),
        postUrl: canonicalFacebookCommentUrl(payload.postUrl),
        replyText,
        provider: String(payload.provider || '').slice(0, 40),
        model: normalizeAiModel(payload.model, ''),
        status,
        parentVerified,
        parentCommentKey: parentVerified ? commentKey : '',
        editorAriaLabel: String(payload.editorAriaLabel || '').trim().slice(0, 200),
        attemptCount,
        targetRefreshedAt: Number.isFinite(targetRefreshedAt) ? new Date(targetRefreshedAt).toISOString() : null,
        lastError: status === 'attempted'
          ? String(payload.lastError || 'Facebook did not confirm the reply inside the intended parent comment thread.').slice(0, 500)
          : '',
        actionAt: /^\d{4}-\d{2}-\d{2}T/.test(String(payload.actionAt || '')) ? new Date(payload.actionAt).toISOString() : new Date().toISOString(),
        source: 'personal-social-chrome-extension',
      };
      const draftId = String(payload.id || '').trim();
      ledger.replies = [...(ledger.replies || []).filter((entry) => !(entry.commentKey === commentKey && entry.status === 'attempted')), reply].slice(-20_000);
      ledger.drafts = (ledger.drafts || []).map((draft) => draft.id === draftId ? {
        ...draft,
        status,
        attemptCount,
        actionAt: reply.actionAt,
        lastError: reply.lastError,
        parentVerified: reply.parentVerified,
        parentCommentKey: reply.parentCommentKey,
      } : draft);
      ledger.updatedAt = reply.actionAt;
      await writeJson(commentReplyLedgerFile, ledger);
      return send(res, 200, { added: 1, duplicate: false, reply });
    });
  }
  if (url.pathname === '/api/queue' && req.method === 'GET') {
    const queue = await readJson(queueFile);
    const expiredGreetings = pruneExpiredCreatorGreetings(queue, { now: new Date() });
    if (expiredGreetings.length) {
      queue.updatedAt = new Date().toISOString();
      await writeJson(queueFile, queue);
    }
    return send(res, 200, {
      ...queue,
      items: (queue.items || []).map(queueItemWithArtworkDay),
    });
  }
  if (url.pathname === '/api/social-currency/weekly' && req.method === 'POST') {
    const result = await ensureWeeklySocialCurrencyQueue();
    return send(res, result.created ? 201 : 200, result);
  }
  if (url.pathname === '/api/social-currency/published' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const queue = await readJson(queueFile);
    const recorded = recordManualSocialCurrencyPost(queue, payload);
    const next = ensureWeeklySocialCurrencyDraft(queue, new Date(), (await readJson(creatorIntelligenceLedgerFile)).posts || []);
    await writeJson(queueFile, queue);
    return send(res, recorded.created ? 201 : 200, { recorded, next });
  }
  if (url.pathname === '/api/social-currency/published' && req.method === 'DELETE') {
    const payload = await bodyJson(req);
    const queue = await readJson(queueFile);
    const result = removeManualSocialCurrencyPost(queue, payload);
    if (result.removed) await writeJson(queueFile, queue);
    return send(res, result.removed ? 200 : 404, result);
  }
  if (url.pathname === '/api/creator-tip-article-drafts' && req.method === 'GET') {
    const drafts = await buildCreatorTipArticleDrafts();
    const stored = await readJson(creatorTipArticleDraftsFile).catch(() => ({ updatedAt: null, items: [] }));
    return send(res, 200, {
      updatedAt: stored?.updatedAt || null,
      canonicalCount: drafts.length,
      items: drafts,
    });
  }
  if (url.pathname === '/api/creator-tip-article-drafts/export' && req.method === 'POST') {
    const drafts = await buildCreatorTipArticleDrafts();
    const payload = { updatedAt: new Date().toISOString(), items: drafts };
    await writeJson(creatorTipArticleDraftsFile, payload);
    return send(res, 200, {
      ok: true,
      updatedAt: payload.updatedAt,
      exported: drafts.length,
      file: creatorTipArticleDraftsFile,
    });
  }
  if (url.pathname === '/api/publishing-inventory' && req.method === 'GET') return send(res, 200, await buildPublishingInventory());
  if (url.pathname === '/api/wordpress-media/sites' && req.method === 'GET') {
    return send(res, 200, { ok: true, sites: await wordpressMediaSources() });
  }
  if (url.pathname === '/api/wordpress-media/priority' && req.method === 'GET') {
    return send(res, 200, await buildWordpressMediaPriorityLane(url.searchParams.get('per_page')));
  }
  if (url.pathname === '/api/wordpress-media/jobs' && req.method === 'GET') {
    const site = wordpressMediaSite(url.searchParams.get('site'));
    if (!site) return send(res, 404, { error: 'Choose a configured WordPress site.' });
    try {
      const payload = wordpressMediaPayloadWithSiteBrand(
        await wordpressMediaRequest(site, '/image-production/jobs?per_page=50'),
        site,
      );
      return send(res, 200, { ...payload, source: { id: site.id, name: site.name, siteUrl: site.siteUrl, imageDeskUrl: site.imageDeskUrl, logoUrl: site.logoUrl } });
    } catch (error) {
      return send(res, Number(error.status || 502), { error: error.message });
    }
  }
  if (url.pathname === '/api/wordpress-media/complete' && req.method === 'POST') {
    const input = await bodyJson(req);
    const site = wordpressMediaSite(input.site);
    const postId = Number(input.post_id || 0);
    const requiredRoles = (Array.isArray(input.required_roles) ? input.required_roles : [])
      .map((role) => String(role || '').toLowerCase())
      .filter((role) => ['landscape', 'story'].includes(role));
    if (!site || !Number.isInteger(postId) || postId <= 0 || requiredRoles.length !== 1) {
      return send(res, 400, { error: 'A configured site, post ID, and exactly one required role are required.' });
    }
    const role = requiredRoles[0];
    const imageValue = role === 'landscape' ? input.landscape_image_base64 : input.story_image_base64;
    const filenameValue = role === 'landscape' ? input.landscape_image_filename : input.story_image_filename;
    if (!String(imageValue || '').trim() || !String(filenameValue || '').trim()) {
      return send(res, 400, { error: `The ${role} image bytes and filename are required.` });
    }
    const payload = {
      post_id: postId,
      required_roles: [role],
      provider: String(input.provider || 'chatgpt-pro').trim().slice(0, 80),
      origin: 'api',
      ...(role === 'landscape' ? {
        landscape_image_base64: imageValue,
        landscape_image_filename: filenameValue,
        require_story_image: false,
      } : {
        story_image_base64: imageValue,
        story_image_filename: filenameValue,
      }),
    };
    try {
      const result = await wordpressMediaRequest(site, '/image-production/complete', { method: 'POST', body: payload });
      const verification = wordpressMediaPayloadWithSiteBrand(
        await wordpressMediaRequest(site, `/image-production/jobs?per_page=50&search=${postId}`),
        site,
      );
      return send(res, 201, { ok: true, site: site.id, role, result, verification });
    } catch (error) {
      return send(res, Number(error.status || 502), { error: error.message });
    }
  }
  if (['/api/wordpress-media/approve', '/api/wordpress-media/reject'].includes(url.pathname) && req.method === 'POST') {
    const input = await bodyJson(req);
    const site = wordpressMediaSite(input.site);
    const role = ['landscape', 'story'].includes(String(input.role || '').toLowerCase()) ? String(input.role).toLowerCase() : '';
    const postId = Number(input.post_id || 0);
    const attachmentId = Number(input.attachment_id || 0);
    if (!site || !role || !Number.isInteger(postId) || postId <= 0 || !Number.isInteger(attachmentId) || attachmentId <= 0) {
      return send(res, 400, { error: 'A configured site, post, image role, and attachment are required.' });
    }
    const action = url.pathname.endsWith('/approve') ? 'approve' : 'reject';
    try {
      const payload = await wordpressMediaRequest(site, `/image-production/${action}`, {
        method: 'POST',
        body: {
          post_id: postId,
          attachment_id: attachmentId,
          role,
          requested_by_user_login: 'mmurphy',
        },
      });
      return send(res, 200, payload);
    } catch (error) {
      return send(res, Number(error.status || 502), { error: error.message });
    }
  }
  if (url.pathname === '/api/group-moderation' && req.method === 'GET') {
    const ledger = await readJson(groupModerationLedgerFile);
    return send(res, 200, {
      config: groupModerationConfig,
      summary: groupModerationSummary(ledger),
      items: (ledger.items || []).slice(-250).reverse(),
      members: (ledger.members || []).slice().sort((left, right) => Number(right.points || 0) - Number(left.points || 0)),
      welcomes: (ledger.welcomes || []).slice(-500).reverse(),
    });
  }
  if (url.pathname === '/api/group-moderation/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(groupModerationLedgerFile);
      const merged = mergeGroupModerationCaptures(ledger, {
        ...payload,
        items: (payload.items || []).map((item) => ({ ...item, queueType: item.queueType || payload.queueType })),
      });
      await writeJson(groupModerationLedgerFile, merged);
      return send(res, 200, { accepted: payload.items?.length || 0, summary: groupModerationSummary(merged) });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/group-moderation/decision' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(groupModerationLedgerFile);
      const updated = recordGroupModerationDecision(ledger, payload);
      await writeJson(groupModerationLedgerFile, updated);
      return send(res, 200, { item: updated.items.find((item) => item.key === (payload.key || payload.postId || payload.postUrl)), summary: groupModerationSummary(updated) });
    } catch (error) {
      return send(res, 409, { error: error.message });
    }
  }
  if (url.pathname === '/api/group-moderation/welcome' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(groupModerationLedgerFile);
      const updated = recordGroupMemberWelcome(ledger, payload);
      await writeJson(groupModerationLedgerFile, updated);
      return send(res, 200, { welcome: groupModerationSummary(updated).welcome });
    } catch (error) {
      return send(res, 409, { error: error.message });
    }
  }
  if (url.pathname === '/api/creator-tip-group-share' && req.method === 'GET') {
    const [scheduledContent, ledger] = await Promise.all([
      readJson(scheduledContentLedgerFile),
      readJson(creatorTipGroupShareLedgerFile),
    ]);
    return send(res, 200, creatorTipGroupShareSummary(scheduledContent, ledger));
  }
  if (url.pathname === '/api/creator-tip-group-share/confirm' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    try {
      const payload = await bodyJson(req);
      const [scheduledContent, ledger] = await Promise.all([
        readJson(scheduledContentLedgerFile),
        readJson(creatorTipGroupShareLedgerFile),
      ]);
      const before = creatorTipGroupShareSummary(scheduledContent, ledger);
      if (!before.due || Number(payload.tipNumber) !== Number(before.next?.tipNumber)) {
        return send(res, 409, { error: 'Only the next due contiguous Page Tip can be confirmed.', expected: before.next, due: before.due });
      }
      const updated = recordCreatorTipGroupShare(ledger, { ...payload, title: before.next.title, sourcePostUrl: before.next.sourcePostUrl });
      await writeJson(creatorTipGroupShareLedgerFile, updated);
      return send(res, 200, creatorTipGroupShareSummary(scheduledContent, updated));
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/page-group-distribution' && req.method === 'GET') {
    const ledger = await readJson(pageGroupDistributionFile).catch(() => mergePageGroupRules({}, {
      ...DEFAULT_PAGE_GROUP,
      observedAt: new Date().toISOString(),
      rulesSource: 'local-default',
    }));
    return send(res, 200, {
      config: PAGE_GROUP_DISTRIBUTION_CONFIG,
      summary: pageGroupDistributionSummary(ledger),
      groups: ledger.groups || [],
      items: [...(ledger.items || [])].reverse().slice(0, 250),
    });
  }
  if (url.pathname === '/api/page-group-distribution/refresh' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      return send(res, 200, await queuePublishedPagePostsForGroupApproval({ limit: payload.limit || 1 }));
    } catch (error) {
      return send(res, 502, { error: cleanMetaError(error) });
    }
  }
  if (url.pathname === '/api/page-group-distribution/groups/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(pageGroupDistributionFile).catch(() => ({ groups: [], items: [] }));
      const updated = mergePageGroupRules(ledger, payload);
      await writeJson(pageGroupDistributionFile, updated);
      return send(res, 200, { summary: pageGroupDistributionSummary(updated), groups: updated.groups });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/page-group-distribution/queue' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(pageGroupDistributionFile);
      const result = queuePageGroupDistribution(ledger, payload);
      await writeJson(pageGroupDistributionFile, result.ledger);
      return send(res, 200, { ...result, summary: pageGroupDistributionSummary(result.ledger) });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  const pageGroupReviewMatch = url.pathname.match(/^\/api\/page-group-distribution\/([^/]+)\/review$/);
  if (pageGroupReviewMatch && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(pageGroupDistributionFile);
      const updated = reviewPageGroupDistribution(ledger, decodeURIComponent(pageGroupReviewMatch[1]), payload);
      await writeJson(pageGroupDistributionFile, updated);
      return send(res, 200, { summary: pageGroupDistributionSummary(updated), items: [...updated.items].reverse().slice(0, 250) });
    } catch (error) {
      return send(res, 409, { error: error.message });
    }
  }
  if (url.pathname === '/api/page-group-distribution/next' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const ledger = await readJson(pageGroupDistributionFile);
    return send(res, 200, { next: nextDuePageGroupDistribution(ledger), summary: pageGroupDistributionSummary(ledger) });
  }
  const pageGroupConfirmMatch = url.pathname.match(/^\/api\/page-group-distribution\/([^/]+)\/confirm$/);
  if (pageGroupConfirmMatch && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(pageGroupDistributionFile);
      const due = nextDuePageGroupDistribution(ledger);
      if (!due || due.id !== decodeURIComponent(pageGroupConfirmMatch[1])) return send(res, 409, { error: 'Only the next approved and rate-limit-safe group item can be confirmed.', next: due });
      const updated = recordPageGroupDistributionProof(ledger, due.id, payload);
      await writeJson(pageGroupDistributionFile, updated);
      return send(res, 200, { item: updated.items.find((item) => item.id === due.id), summary: pageGroupDistributionSummary(updated) });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/creator-newsdesk-group' && req.method === 'GET') {
    const [ledger, groupQueue] = await Promise.all([readJson(creatorNewsSourceLedgerFile), readJson(creatorNewsdeskGroupQueueFile)]);
    return send(res, 200, {
      config: { ...CREATOR_NEWSDESK_GROUP_CONFIG, ...(groupQueue.config || {}) },
      summary: creatorNewsdeskGroupSummary(ledger, groupQueue),
      sources: (ledger.sources || []).slice(0, 100),
      items: (groupQueue.items || []).filter((item) => !['published', 'cancelled'].includes(item.status)).slice(0, 100),
    });
  }
  if (url.pathname === '/api/creator-intelligence' && req.method === 'GET') {
    const ryzenSync = await syncCreatorIntelligenceFromRyzen();
    const ledger = await readJson(creatorIntelligenceLedgerFile);
    const rawPosts = ledger.posts || [];
    const usablePosts = filterCreatorIntelligencePosts(rawPosts);
    return send(res, 200, {
      updatedAt: ledger.updatedAt || null,
      policy: ledger.policy,
      total: Array.isArray(rawPosts) ? rawPosts.length : 0,
      usableTotal: usablePosts.length,
      posts: usablePosts.slice(0, 250),
      sourceHealth: creatorIntelligenceSourceHealth(rawPosts),
      patterns: creatorIntelligencePatternReport(rawPosts),
      ryzenSync,
    });
  }
  if (url.pathname === '/api/creator-intelligence/sync-ryzen' && req.method === 'POST') {
    const ryzenSync = await syncCreatorIntelligenceFromRyzen({ force: true });
    const ledger = await readJson(creatorIntelligenceLedgerFile);
    return send(res, ryzenSync.ok ? 200 : 503, {
      ryzenSync,
      total: Array.isArray(ledger.posts) ? ledger.posts.length : 0,
      updatedAt: ledger.updatedAt || null,
    });
  }
  if (url.pathname === '/api/creator-intelligence/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const capturedAt = new Date().toISOString();
    const ledger = await readJson(creatorIntelligenceLedgerFile);
    const capture = mergeCreatorIntelligenceCaptures(ledger, payload.posts, capturedAt);
    await writeJson(creatorIntelligenceLedgerFile, capture.ledger);
    return send(res, 200, {
      accepted: capture.accepted,
      added: capture.added,
      updated: capture.updated,
      total: capture.ledger.posts.length,
      updatedAt: capturedAt,
    });
  }
  if (url.pathname === '/api/creator-newsdesk-group/rebuild' && req.method === 'POST') {
    const [ledger, groupQueue] = await Promise.all([readJson(creatorNewsSourceLedgerFile), readJson(creatorNewsdeskGroupQueueFile)]);
    const result = rebuildCreatorNewsdeskGroupQueue(ledger, groupQueue, { days: 7 });
    await writeJson(creatorNewsdeskGroupQueueFile, result.queue);
    return send(res, 200, { created: result.created, config: result.queue.config, summary: creatorNewsdeskGroupSummary(ledger, result.queue), items: result.queue.items.filter((item) => item.status === 'ready').slice(0, 100) });
  }
  if (url.pathname === '/api/creator-news-capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const capturedAt = new Date().toISOString();
    const ledger = await readJson(creatorNewsSourceLedgerFile);
    const capture = mergeCreatorNewsSources(ledger, Array.isArray(payload.sources) ? payload.sources : [], capturedAt);
    await writeJson(creatorNewsSourceLedgerFile, capture.ledger);
    const groupQueue = await readJson(creatorNewsdeskGroupQueueFile);
    const rebuilt = rebuildCreatorNewsdeskGroupQueue(capture.ledger, groupQueue, { days: 7, now: new Date(capturedAt) });
    await writeJson(creatorNewsdeskGroupQueueFile, rebuilt.queue);
    return send(res, 200, {
      accepted: capture.accepted,
      added: capture.added,
      eligibleAdded: capture.eligibleAdded,
      scheduled: rebuilt.created,
      summary: creatorNewsdeskGroupSummary(capture.ledger, rebuilt.queue, new Date(capturedAt)),
    });
  }
  if (url.pathname === '/api/creator-newsdesk-group/next' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const [ledger, groupQueue] = await Promise.all([readJson(creatorNewsSourceLedgerFile), readJson(creatorNewsdeskGroupQueueFile)]);
    const now = new Date();
    let changed = false;
    for (const item of groupQueue.items || []) {
      if (item.status === 'failed' && Number(item.attempts || 0) < 3 && item.retryAfter && new Date(item.retryAfter) <= now) {
        item.status = 'ready';
        changed = true;
      }
      if (item.status === 'posting' && item.lastAttemptAt && now - new Date(item.lastAttemptAt) > 10 * 60_000) {
        item.status = Number(item.attempts || 0) < 3 ? 'ready' : 'failed';
        item.lastError = 'Publisher did not confirm the post within ten minutes.';
        changed = true;
      }
    }
    if (changed) {
      groupQueue.updatedAt = now.toISOString();
      await writeJson(creatorNewsdeskGroupQueueFile, groupQueue);
    }
    const due = nextDueCreatorNewsdeskGroupPost(ledger, groupQueue, now);
    return send(res, 200, { ...due, config: { ...CREATOR_NEWSDESK_GROUP_CONFIG, ...(groupQueue.config || {}) } });
  }
  const creatorGroupStatusMatch = url.pathname.match(/^\/api\/creator-newsdesk-group\/([^/]+)\/status$/);
  if (creatorGroupStatusMatch && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const groupQueue = await readJson(creatorNewsdeskGroupQueueFile);
    const updated = updateCreatorNewsdeskGroupPost(groupQueue, creatorGroupStatusMatch[1], payload);
    if (updated.error) return send(res, 409, { error: updated.error });
    await writeJson(creatorNewsdeskGroupQueueFile, updated.queue);
    const ledger = await readJson(creatorNewsSourceLedgerFile);
    return send(res, 200, { item: updated.item, summary: creatorNewsdeskGroupSummary(ledger, updated.queue) });
  }
  if (url.pathname === '/api/professional-trends' && req.method === 'GET') {
    const [ledger, queue, publishing] = await Promise.all([readJson(professionalTrendLedgerFile), readJson(queueFile), personalPublishingReadiness()]);
    return send(res, 200, {
      summary: professionalTrendSummary(ledger, queue),
      items: currentProfessionalTrends(ledger).slice(0, 40),
      publishing,
      claimPolicy: 'Facebook trend labels, Dashboard inspiration, and your own performance signals remain separate.',
    });
  }
  if (url.pathname === '/api/professional-goals' && req.method === 'GET') {
    const [ledger, reels, reelAudio, growthLedger, rosterLedger, engagementLedger, reelWorker] = await Promise.all([
      readJson(professionalGoalsLedgerFile),
      readJson(creatorTipReelJobsFile).catch(() => ({ updatedAt: null, jobs: [] })),
      readJson(creatorTipReelAudioFile).catch(() => ({ tracks: [] })),
      readJson(followerGrowthGoalFile).catch(() => ({})),
      readJson(pageFollowerRosterFile).catch(() => emptyPageFollowerRoster()),
      readJson(engagementLedgerFile).catch(() => ({ events: [] })),
      refreshCreatorTipReelWorkerStatus(),
    ]);
    const roster = pageFollowerRosterSummary(rosterLedger, buildEngagementRows(engagementLedger));
    const reelWorkerWithAudio = { ...reelWorker, availableOwnedAudio: Number(reelAudio.tracks?.length || 0) };
    return send(res, 200, {
      summary: professionalGoalsSummary(ledger, { reelWorker: reelWorkerWithAudio, reelJobs: reels.jobs || [] }),
      tasks: ledger.tasks || [],
      achievements: normalizeProfessionalAchievements(ledger.achievements),
      worker: reelWorkerWithAudio,
      followerGoal: { ...followerGrowthSummary(growthLedger), roster },
    });
  }
  if (url.pathname === '/api/follower-growth-goal' && req.method === 'GET') {
    const [growthLedger, rosterLedger, engagementLedger] = await Promise.all([
      readJson(followerGrowthGoalFile).catch(() => ({})),
      readJson(pageFollowerRosterFile).catch(() => emptyPageFollowerRoster()),
      readJson(engagementLedgerFile).catch(() => ({ events: [] })),
    ]);
    return send(res, 200, {
      ...followerGrowthSummary(growthLedger),
      roster: pageFollowerRosterSummary(rosterLedger, buildEngagementRows(engagementLedger)),
    });
  }
  if (url.pathname === '/api/page-follower-roster' && req.method === 'GET') {
    const [rosterLedger, engagementLedger] = await Promise.all([
      readJson(pageFollowerRosterFile).catch(() => emptyPageFollowerRoster()),
      readJson(engagementLedgerFile).catch(() => ({ events: [] })),
    ]);
    return send(res, 200, pageFollowerRosterSummary(rosterLedger, buildEngagementRows(engagementLedger)));
  }
  if (url.pathname === '/api/page-follower-roster/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const capturedAt = new Date().toISOString();
    try {
      const current = await readJson(pageFollowerRosterFile).catch(() => emptyPageFollowerRoster());
      const capture = mergePageFollowerCapture(current, payload, capturedAt);
      const reportedTotal = Number(capture.ledger.reportedTotal || 0);
      const growthLedger = await readJson(followerGrowthGoalFile).catch(() => ({}));
      const nextGrowth = reportedTotal > 0
        ? mergeFollowerGrowthCapture(growthLedger, {
            followers: reportedTotal,
            source: 'facebook-page-follower-roster',
            sourceUrl: payload.sourceUrl,
          }, capturedAt)
        : growthLedger;
      await Promise.all([
        writeJson(pageFollowerRosterFile, capture.ledger),
        writeJson(followerGrowthGoalFile, nextGrowth),
      ]);
      const engagementLedger = await readJson(engagementLedgerFile).catch(() => ({ events: [] }));
      return send(res, 200, {
        accepted: capture.accepted,
        roster: pageFollowerRosterSummary(capture.ledger, buildEngagementRows(engagementLedger)),
        followerGoal: followerGrowthSummary(nextGrowth),
      });
    } catch (error) {
      return send(res, 400, { error: String(error.message || error) });
    }
  }
  if (url.pathname === '/api/follower-growth-goal/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    try {
      const payload = await bodyJson(req);
      const ledger = await readJson(followerGrowthGoalFile).catch(() => ({}));
      const updated = mergeFollowerGrowthCapture(ledger, payload, new Date().toISOString());
      await writeJson(followerGrowthGoalFile, updated);
      return send(res, 200, followerGrowthSummary(updated));
    } catch (error) {
      return send(res, 400, { error: String(error.message || error) });
    }
  }
  if (url.pathname === '/api/professional-goals/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const capturedAt = new Date().toISOString();
    const ledger = await readJson(professionalGoalsLedgerFile);
    const capture = mergeProfessionalGoalsCapture(ledger, payload, capturedAt);
    if (!capture.accepted) return send(res, 400, { error: 'A valid Facebook Professional Status capture is required.' });
    await writeJson(professionalGoalsLedgerFile, capture.ledger);
    const [reels, reelAudio, reelWorker] = await Promise.all([
      readJson(creatorTipReelJobsFile).catch(() => ({ jobs: [] })),
      readJson(creatorTipReelAudioFile).catch(() => ({ tracks: [] })),
      refreshCreatorTipReelWorkerStatus({ force: true }),
    ]);
    const reelWorkerWithAudio = { ...reelWorker, availableOwnedAudio: Number(reelAudio.tracks?.length || 0) };
    return send(res, 200, {
      accepted: true,
      taskCount: capture.taskCount,
      achievementCount: capture.achievementCount,
      summary: professionalGoalsSummary(capture.ledger, { reelWorker: reelWorkerWithAudio, reelJobs: reels.jobs || [] }),
    });
  }
  if (url.pathname === '/api/professional-trends/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const capturedAt = new Date().toISOString();
    const ledger = await readJson(professionalTrendLedgerFile);
    const capture = mergeProfessionalTrendSignals(ledger, payload.signals, capturedAt);
    await writeJson(professionalTrendLedgerFile, capture.ledger);
    const queue = await readJson(queueFile);
    return send(res, 200, {
      accepted: capture.accepted,
      added: capture.added,
      updated: capture.updated,
      summary: professionalTrendSummary(capture.ledger, queue, new Date(capturedAt)),
    });
  }
  if (url.pathname === '/api/professional-trends/build-drafts' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const limit = Math.min(5, Math.max(1, Number(payload.limit || 3)));
    const [ledger, queue] = await Promise.all([readJson(professionalTrendLedgerFile), readJson(queueFile)]);
    const result = buildProfessionalTrendDrafts(ledger, queue, { limit });
    if (!result.created.length) return send(res, 409, { error: result.considered ? 'Today’s captured trend signals already have drafts.' : 'No current Professional Dashboard hashtag signals have been captured yet.' });
    await writeJson(queueFile, queue);
    return send(res, 201, {
      created: result.created.length,
      drafts: result.created.map((item) => ({ id: item.id, reference: `D-${item.id.slice(0, 8).toUpperCase()}`, title: item.title, scheduledFor: item.scheduledFor })),
      summary: professionalTrendSummary(ledger, queue),
    });
  }
  if (url.pathname === '/api/publishing-readiness' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const readiness = await personalPublishingReadiness();
    return send(res, 200, {
      ...readiness,
      message: publishingReadinessMessage(readiness),
      refreshUrl: 'https://www.facebook.com/professional_dashboard',
    });
  }
  if (url.pathname === '/api/publishing/meta-scheduled-audit' && req.method === 'GET') {
    try {
      return send(res, 200, await facebookScheduledPostsAudit());
    } catch (error) {
      return send(res, 502, { error: cleanMetaError(error) });
    }
  }
  if (url.pathname === '/api/publishing/meta-scheduled-deduplicate' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      if (payload.confirm !== 'remove-exact-duplicates') return send(res, 409, { error: 'Exact duplicate-removal confirmation is required.' });
      return send(res, 200, await deduplicateFacebookScheduledPosts());
    } catch (error) {
      return send(res, 502, { error: cleanMetaError(error) });
    }
  }
  if (url.pathname === '/api/creator-guidance/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const capturedAt = new Date().toISOString();
    const ledger = await readJson(creatorGuidanceLedgerFile);
    const capture = mergeCreatorGuidance(ledger, payload.items, capturedAt);
    await writeJson(creatorGuidanceLedgerFile, capture.ledger);
    return send(res, 200, {
      accepted: capture.accepted,
      added: capture.added,
      total: currentCreatorGuidance(capture.ledger, new Date(capturedAt)).length,
      updatedAt: capturedAt,
    });
  }
  if (url.pathname === '/api/scheduled-content/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const previousLedger = await readJson(scheduledContentLedgerFile).catch(() => ({ items: [] }));
    const ledger = normalizeScheduledContentCapture(await bodyJson(req));
    const capturedKeys = new Set((ledger.items || []).map((item) => item.key).filter(Boolean));
    const capturedDrafts = new Set((ledger.items || []).map((item) => item.draftId).filter(Boolean));
    const futureApiProofs = (Array.isArray(previousLedger.items) ? previousLedger.items : [])
      .filter((item) => item?.source === 'meta-page-api')
      .filter((item) => new Date(item.scheduledFor || 0).valueOf() > Date.now() - 60_000)
      .filter((item) => !(item.key && capturedKeys.has(item.key)))
      .filter((item) => !(item.draftId && capturedDrafts.has(item.draftId)));
    if (futureApiProofs.length) {
      ledger.items = [...ledger.items, ...futureApiProofs].sort((left, right) => (Date.parse(left.scheduledFor || 0) || 0) - (Date.parse(right.scheduledFor || 0) || 0));
      ledger.rawCount = ledger.items.length;
      ledger.emptyState = false;
    }
    await writeJson(scheduledContentLedgerFile, ledger);
    return send(res, 200, { captured: ledger.items.length, emptyState: ledger.emptyState, updatedAt: ledger.updatedAt });
  }
  if (url.pathname === '/api/scheduled-content/manual-proof' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const queue = await readJson(queueFile);
    const confirmedAt = new Date().toISOString();
    const sourceUrl = String(payload.sourceUrl || 'https://www.facebook.com/professional_dashboard/content/content_library/?filter=SCHEDULED').slice(0, 1000);
    const confirmed = [];
    for (const raw of Array.isArray(payload.items) ? payload.items.slice(0, 50) : []) {
      const draftId = String(raw?.draftId || '').trim();
      const item = queue.items.find((entry) => entry.id === draftId);
      const scheduledDate = new Date(raw?.scheduledFor || 0);
      if (!item || item.target !== 'matthew-page' || !Number.isFinite(scheduledDate.valueOf())) continue;
      const scheduledFor = scheduledDate.toISOString();
      const intendedScheduledFor = item.intendedScheduledFor || creatorTipLaunchSchedule(creatorTipNumberFromItem(item)) || item.scheduledFor || scheduledFor;
      item.intendedScheduledFor = intendedScheduledFor;
      item.scheduledFor = scheduledFor;
      item.status = 'scheduled';
      item.dispatchError = '';
      item.facebookHandoff = {
        ...(item.facebookHandoff || {}),
        state: 'manual-scheduled-content-proof',
        preparedAt: item.facebookHandoff?.preparedAt || confirmedAt,
        scheduledAt: confirmedAt,
        confirmedAt,
        scheduledContentObservedAt: confirmedAt,
        scheduledFor,
        facebookConfirmed: true,
        scheduleClicked: true,
        sourceUrl,
        extensionVersion: 'manual-browser-proof',
      };
      if (scheduledFor !== intendedScheduledFor) {
        item.scheduleRecovery = {
          intendedScheduledFor,
          recoveredScheduledFor: scheduledFor,
          confirmedAt,
          reason: String(raw?.reason || 'The original sequence slot passed before Facebook scheduling was restored.').slice(0, 500),
        };
      } else if (item.scheduleRecovery) {
        delete item.scheduleRecovery;
      }
      if (item.schedulingBlockedReason) delete item.schedulingBlockedReason;
      item.updatedAt = confirmedAt;
      const proof = await upsertScheduledContentProof({
        key: `manual-facebook:${draftId}:${scheduledFor}`,
        title: item.title,
        scheduledFor,
        sourceUrl,
        source: 'facebook-scheduled-content-manual',
        target: item.target,
        draftId,
      });
      confirmed.push({ draftId, title: item.title, intendedScheduledFor, scheduledFor, recovery: scheduledFor !== intendedScheduledFor, proof });
    }
    if (!confirmed.length) return send(res, 400, { error: 'No valid Facebook Page schedule proofs were supplied.' });
    queue.updatedAt = confirmedAt;
    await writeJson(queueFile, queue);
    return send(res, 200, { confirmed: confirmed.length, confirmedAt, items: confirmed });
  }
  if (url.pathname === '/api/content-bank' && req.method === 'GET') {
    const queue = await readJson(queueFile);
    return send(res, 200, {
      ...userContentBankSummary(queue.items),
      items: USER_CONTENT_BANK.items.map(({ id, title, lane, notes }) => ({ id, title, lane, notes })),
    });
  }
  if (url.pathname === '/api/content-bank/build-drafts' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const [queue, scheduledLedger] = await Promise.all([readJson(queueFile), readJson(scheduledContentLedgerFile)]);
    const created = buildUserContentBankDrafts(queue, scheduledLedger, { limit: payload.limit });
    if (created.length) await writeJson(queueFile, queue);
    return send(res, 201, {
      created: created.length,
      drafts: created.map((entry) => ({
        id: entry.id,
        reference: `D-${entry.id.slice(0, 8).toUpperCase()}`,
        title: entry.title,
        scheduledFor: entry.scheduledFor,
      })),
      summary: userContentBankSummary(queue.items),
    });
  }
  if (url.pathname === '/api/archive-schedule' && req.method === 'GET') {
    const [{ files, rows }, queue, scheduledLedger, guidanceLedger] = await Promise.all([
      loadFacebookArchivePosts(),
      readJson(queueFile),
      readJson(scheduledContentLedgerFile),
      readJson(creatorGuidanceLedgerFile),
    ]);
    return send(res, 200, archiveScheduleSummary({ archivePosts: rows, archiveFiles: files, queue, scheduledLedger, guidanceLedger }));
  }
  if (url.pathname === '/api/archive-schedule/build' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const [{ files, rows }, queue, scheduledLedger, guidanceLedger] = await Promise.all([
      loadFacebookArchivePosts(),
      readJson(queueFile),
      readJson(scheduledContentLedgerFile),
      readJson(creatorGuidanceLedgerFile),
    ]);
    const result = buildThemedArchiveSchedule({
      archivePosts: rows,
      queueItems: queue.items || [],
      externalScheduledItems: scheduledLedger.items || [],
      guidanceItems: currentCreatorGuidance(guidanceLedger),
      startDate: payload.startDate || null,
      days: payload.days,
      postsPerDay: payload.postsPerDay,
    });
    if (!result.created.length) return send(res, 409, { error: 'No open themed archive slots were found. Sync Facebook Scheduled Content or choose a later day.' });
    const createdAt = new Date().toISOString();
    const items = result.created.map((item) => ({ id: randomUUID(), createdAt, ...item }));
    queue.items.unshift(...items);
    await writeJson(queueFile, queue);
    return send(res, 201, {
      created: items.length,
      drafts: items.map((item) => ({ id: item.id, reference: `D-${item.id.slice(0, 8).toUpperCase()}`, title: item.title, scheduledFor: item.scheduledFor, source: item.source })),
      days: result.days,
      summary: archiveScheduleSummary({ archivePosts: rows, archiveFiles: files, queue, scheduledLedger, guidanceLedger }),
    });
  }
  if (url.pathname === '/api/analytics' && req.method === 'GET') return send(res, 200, await readJson(analyticsFile));
  if (url.pathname === '/api/publishing-pipeline' && req.method === 'GET') {
    return send(res, 200, await refreshPublishingMetrics());
  }
  if (url.pathname === '/api/publishing-pipeline/refresh' && req.method === 'POST') {
    return send(res, 200, await refreshPublishingMetrics({ allowGraph: true, includePagePerformance: true }));
  }
  if (url.pathname === '/api/ai-nightly-lane' && req.method === 'GET') {
    return send(res, 200, await aiNightlyLaneSummary());
  }
  if (url.pathname === '/api/ai-nightly-lane' && req.method === 'PATCH') {
    const payload = await bodyJson(req);
    const stored = await readJson(aiNightlyLaneFile);
    const lane = normalizeAiNightlyLane({ ...stored, slots: payload.slots ?? stored.slots, timeZone: payload.timeZone || stored.timeZone });
    const updated = {
      ...stored,
      enabled: payload.enabled === undefined ? stored.enabled !== false : payload.enabled === true,
      target: 'matthew-page',
      timeZone: lane.timeZone,
      slots: [...lane.slots],
      approvalRequired: true,
      updatedAt: new Date().toISOString(),
    };
    await writeJson(aiNightlyLaneFile, updated);
    return send(res, 200, await aiNightlyLaneSummary());
  }
  if (url.pathname === '/api/ai-nightly-lane/request' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const request = await requestAiNightlyBatch(payload);
    return send(res, 202, { request, lane: await aiNightlyLaneSummary() });
  }
  if (url.pathname === '/api/ai-nightly-lane/sync' && req.method === 'POST') {
    const sync = await syncAiNightlyResults();
    return send(res, 200, { sync, lane: await aiNightlyLaneSummary() });
  }
  if (url.pathname === '/api/first-comments' && req.method === 'GET') {
    return send(res, 200, await dispatchApprovedFirstComments());
  }
  const firstCommentApproveMatch = url.pathname.match(/^\/api\/first-comments\/([^/]+)\/approve$/);
  if (firstCommentApproveMatch && req.method === 'POST') {
    const payload = await bodyJson(req);
    const text = String(payload.text || '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);
    if (!text) return send(res, 400, { error: 'Write the first comment before approving it.' });
    const queue = await readJson(queueFile);
    const item = (queue.items || []).find((entry) => entry.id === firstCommentApproveMatch[1]);
    if (!item) return send(res, 404, { error: 'The Social Desk post was not found.' });
    if (item.target !== 'matthew-page') return send(res, 409, { error: 'Automatic first comments are limited to the owned Built Not Begged Page. Copy and post manually for personal-profile posts.' });
    if (!['approved', 'dispatched', 'scheduled', 'published'].includes(item.status)) return send(res, 409, { error: 'Approve the post itself before approving its first comment.' });
    const approvedAt = new Date().toISOString();
    const ledger = await readJson(firstCommentLedgerFile);
    const existing = (ledger.comments || []).find((entry) => entry.draftId === item.id && !['failed', 'cancelled'].includes(entry.status));
    if (existing?.status === 'facebook-confirmed') return send(res, 409, { error: 'Facebook already confirmed the first comment for this post.' });
    const comment = existing || { id: randomUUID(), draftId: item.id, target: item.target, createdAt: approvedAt };
    comment.text = text;
    comment.status = 'approved-awaiting-post';
    comment.approvedAt = approvedAt;
    comment.approvedBy = 'mmurphy';
    comment.lastError = '';
    comment.updatedAt = approvedAt;
    if (!existing) ledger.comments = [comment, ...(ledger.comments || [])];
    ledger.updatedAt = approvedAt;
    await writeJson(firstCommentLedgerFile, ledger);
    const updated = await dispatchApprovedFirstComments();
    return send(res, 200, { comment: updated.comments.find((entry) => entry.id === comment.id), ledger: updated });
  }
  const firstCommentConfirmMatch = url.pathname.match(/^\/api\/first-comments\/([^/]+)\/confirm$/);
  if (firstCommentConfirmMatch && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Ryzen or extension confirmation is required.' });
    const payload = await bodyJson(req);
    const ledger = await readJson(firstCommentLedgerFile);
    const comment = (ledger.comments || []).find((entry) => entry.id === firstCommentConfirmMatch[1]);
    if (!comment) return send(res, 404, { error: 'First-comment request not found.' });
    if (!String(payload.commentId || payload.proofUrl || '').trim()) return send(res, 400, { error: 'Facebook comment proof is required.' });
    comment.status = 'facebook-confirmed';
    comment.commentId = String(payload.commentId || '').trim().slice(0, 300);
    comment.proofUrl = canonicalFacebookUrl(payload.proofUrl || '') || String(payload.proofUrl || '').trim().slice(0, 1000);
    comment.confirmedAt = new Date().toISOString();
    comment.updatedAt = comment.confirmedAt;
    comment.lastError = '';
    ledger.updatedAt = comment.confirmedAt;
    await writeJson(firstCommentLedgerFile, ledger);
    return send(res, 200, { comment });
  }
  if (url.pathname === '/api/engagement-assist/suggestions' && req.method === 'POST') {
    const payload = await bodyJson(req);
    return send(res, 200, buildEngagementAssistSuggestions(payload));
  }
  if (url.pathname === '/api/engagement-status' && req.method === 'GET') {
    const [ledger, audience, inviteLedger, followLedger, commentLikeLedger, commentReplyLedger, messageLedger, professionalTrendLedger, queue, birthdayWishLedger] = await Promise.all([readJson(engagementLedgerFile), readJson(audienceFile), readJson(inviteLedgerFile), readJson(followLedgerFile), readJson(commentLikeLedgerFile), readJson(commentReplyLedgerFile), readJson(messageLedgerFile), readJson(professionalTrendLedgerFile), readJson(queueFile), readJson(birthdayWishLedgerFile)]);
    applyEngagementLedger(audience, ledger, queue);
    const events = Array.isArray(ledger.events) ? ledger.events : [];
    const engagementRows = buildEngagementRows(ledger);
    const messageInbox = buildMessageInbox(messageLedger, audience);
    const professionalTrends = professionalTrendSummary(professionalTrendLedger, queue);
    const uniqueActors = new Set(events.map((event) => String(event.actorId || event.actorUrl || '')).filter(Boolean));
    const eventTypes = events.reduce((counts, event) => {
      const type = String(event.type || 'other');
      counts[type] = Number(counts[type] || 0) + 1;
      return counts;
    }, {});
    return send(res, 200, {
      online: true,
      updatedAt: ledger.updatedAt || null,
      totalEngagementEvents: events.length,
      uniqueActors: uniqueActors.size,
      eventTypes,
      engaged: Number(audience.summary?.engaged || 0),
      coreEngaged: Number(audience.summary?.coreEngaged || 0),
      light: Number(audience.summary?.light || 0),
      autoInvitesSent: Array.isArray(inviteLedger.invites) ? inviteLedger.invites.length : 0,
      possibleUnfollows: (followLedger.events || []).filter((event) => ['possible-unfollow', 'user-confirmed-unfollow'].includes(event.type) && !event.resolvedAt).length,
      legitComments: engagementRows.reduce((total, row) => total + row.legitComments, 0),
      inboundMessages: engagementRows.reduce((total, row) => total + row.messages, 0),
      topEngagers: engagementRows.filter((row) => row.engagementLevel === 'top-engager').length,
      consistentEngagers: engagementRows.filter((row) => row.engagementLevel === 'consistent').length,
      commentLikesSent: Array.isArray(commentLikeLedger.likes) ? commentLikeLedger.likes.length : 0,
      commentRepliesDrafted: Array.isArray(commentReplyLedger.drafts) ? commentReplyLedger.drafts.length : 0,
      commentRepliesSent: (commentReplyLedger.replies || []).filter((reply) => reply.status === 'sent' && reply.parentVerified === true).length,
      messageThreads: messageInbox.summary.threads,
      messageUnread: messageInbox.summary.unread,
      messageNeedsReply: messageInbox.summary.needsReply,
      messageExactPeople: messageInbox.summary.exactPeople,
      professionalTrendCount: professionalTrends.active,
      professionalTrendingCount: professionalTrends.facebookTrending,
      birthdayWishesSent: birthdayWishSummary(birthdayWishLedger).sent,
      birthdayWishesSentToday: birthdayWishSummary(birthdayWishLedger).sentToday,
      serverTime: new Date().toISOString(),
    });
  }
  if (url.pathname === '/api/engagement-leaderboard' && req.method === 'GET') {
    const [ledger, audience, commentLikeLedger, queue, engagementNotes] = await Promise.all([readJson(engagementLedgerFile), readJson(audienceFile), readJson(commentLikeLedgerFile), readJson(queueFile), readJson(engagementNotesFile)]);
    const byId = new Map((audience.people || []).filter((person) => person.id).map((person) => [String(person.id), person]));
    const byUrl = new Map((audience.people || []).filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
    const likes = Array.isArray(commentLikeLedger.likes) ? commentLikeLedger.likes : [];
    const rows = buildEngagementRows(ledger).map((row) => {
      const person = (row.actorId && byId.get(row.actorId)) || (row.actorUrl && byUrl.get(row.actorUrl)) || null;
      const commentLikes = likes.filter((like) => matchesExactFacebookIdentity(like, row.actorId, row.actorUrl)).length;
      const relationshipNote = findExactFacebookRecord(engagementNotes.notes, row.actorId, row.actorUrl);
      return {
        ...row,
        name: person?.name || row.actorName,
        avatar: person?.avatar || '',
        follower: Boolean(person),
        friend: person?.friend === true,
        following: person?.following === true,
        followState: person?.followState || (person ? 'following' : 'not-in-captured-roster'),
        commentLikes,
        relationshipNote: relationshipNote?.note || '',
        relationshipNoteUpdatedAt: relationshipNote?.updatedAt || null,
      };
    });
    const weekStart = engagementWeekStartKey();
    const weeklyCandidates = weeklyTopEngagerCandidates(audience, ledger, queue);
    const winbackCandidates = creatorWinbackCandidates(audience, queue, weekStart);
    const inactiveCreatorCandidates = inactiveDigitalCreatorCandidates(audience);
    return send(res, 200, {
      updatedAt: ledger.updatedAt || null,
      summary: {
        actors: rows.length,
        followers: rows.filter((row) => row.follower).length,
        friendFollowers: rows.filter((row) => row.friend && row.follower).length,
        friendOnly: rows.filter((row) => row.friend && !row.follower).length,
        followerOnly: rows.filter((row) => row.follower && !row.friend).length,
        followingMatches: rows.filter((row) => row.following).length,
        topEngagers: rows.filter((row) => row.engagementLevel === 'top-engager').length,
        consistentEngagers: rows.filter((row) => row.engagementLevel === 'consistent').length,
        legitComments: rows.reduce((total, row) => total + row.legitComments, 0),
        messages: rows.reduce((total, row) => total + row.messages, 0),
        commentLikes: likes.length,
        privateNotes: rows.filter((row) => row.relationshipNote).length,
        weeklyTopCandidates: weeklyCandidates.length,
        zeroScoreCreators: winbackCandidates.length,
        winbackSelectionSize: Math.min(100, winbackCandidates.length),
        inactiveDigitalCreators: inactiveCreatorCandidates.length,
        inactiveDigitalCreatorsOldestDays: inactiveCreatorCandidates[0]?.inactivityDays ?? null,
        inactiveDigitalCreatorsOldestLabel: inactiveCreatorCandidates[0]?.inactivityLabel || '',
      },
      postBuilder: { weekStart, weeklyTopLimit: 12, winbackPoolLimit: 100, winbackBatchSize: 20, inactiveCreatorPoolLimit: 50, inactiveCreatorBatchSize: 50 },
      people: rows.slice(0, 5000),
    });
  }
  if (url.pathname === '/api/engagement-notes' && req.method === 'POST') {
    const normalized = normalizeEngagementNote(await bodyJson(req));
    if (!normalized) return send(res, 400, { error: 'An exact Facebook profile ID or canonical URL is required.' });
    const ledger = await readJson(engagementNotesFile);
    const notes = Array.isArray(ledger.notes) ? ledger.notes : [];
    const existingIndex = notes.findIndex((note) => matchesExactFacebookIdentity(note, normalized.actorId, normalized.actorUrl));
    const now = new Date().toISOString();
    if (!normalized.note) {
      const removed = existingIndex >= 0;
      if (removed) notes.splice(existingIndex, 1);
      ledger.notes = notes;
      ledger.updatedAt = now;
      await writeJson(engagementNotesFile, ledger);
      return send(res, 200, { removed, note: null, updatedAt: now });
    }
    const existing = existingIndex >= 0 ? notes[existingIndex] : null;
    const saved = {
      id: existing?.id || randomUUID(),
      ...normalized,
      scope: 'private-local',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    if (existingIndex >= 0) notes[existingIndex] = saved;
    else notes.push(saved);
    ledger.notes = notes;
    ledger.updatedAt = now;
    await writeJson(engagementNotesFile, ledger);
    return send(res, 200, { removed: false, note: saved, updatedAt: now });
  }
  if (url.pathname === '/api/engagement-post-drafts' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const kind = String(payload.kind || '');
    if (!['weekly-top', 'creator-winback', 'inactive-digital-creators'].includes(kind)) return send(res, 400, { error: 'Choose a valid engagement post type.' });
    const [ledger, audience, queue] = await Promise.all([readJson(engagementLedgerFile), readJson(audienceFile), readJson(queueFile)]);
    try {
      const result = buildEngagementPostDrafts(kind, audience, ledger, queue);
      await writeJson(queueFile, queue);
      return send(res, 200, {
        ...result,
        drafts: result.drafts.map((item) => ({ id: item.id, reference: `D-${item.id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`, title: item.title, targets: item.tagTargets.length, status: item.status })),
      });
    } catch (error) {
      return send(res, 409, { error: error.message });
    }
  }
  if (url.pathname === '/api/invite-candidates' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const [candidateLedger, inviteLedger] = await Promise.all([readJson(inviteCandidateLedgerFile), readJson(inviteLedgerFile)]);
    const invited = new Map((inviteLedger.invites || []).map((invite) => [inviteCandidateIdentityKey(invite), invite]).filter(([key]) => key));
    const byIdentity = new Map((candidateLedger.candidates || []).map((candidate) => [inviteCandidateIdentityKey(candidate), candidate]).filter(([key]) => key));
    for (const [identityKey, invite] of invited) {
      if (!byIdentity.has(identityKey)) {
        const candidate = normalizeInviteCandidate({ ...invite, foundAt: invite.actionAt, inviteAvailable: true, status: invite.status || 'sent' });
        if (candidate) byIdentity.set(identityKey, { ...candidate, firstSeenAt: candidate.foundAt, updatedAt: invite.actionAt, actionAt: invite.actionAt, inviteId: invite.id, sources: [] });
      }
    }
    const candidates = [...byIdentity.values()].map((candidate) => {
      const invite = invited.get(inviteCandidateIdentityKey(candidate));
      return invite ? { ...candidate, status: invite.status || 'sent', actionAt: invite.actionAt, inviteId: invite.id } : candidate;
    }).sort((left, right) => new Date(right.updatedAt || right.foundAt || 0) - new Date(left.updatedAt || left.foundAt || 0));
    return send(res, 200, {
      updatedAt: candidateLedger.updatedAt || null,
      summary: {
        total: candidates.length,
        review: candidates.filter((candidate) => !['sent', 'attempted'].includes(candidate.status)).length,
        inviteAvailable: candidates.filter((candidate) => candidate.inviteAvailable === true && !['sent', 'attempted'].includes(candidate.status)).length,
        groupActivity: candidates.filter((candidate) => /^own-group-/.test(candidate.contentScope)).length,
        sent: candidates.filter((candidate) => candidate.status === 'sent').length,
      },
      candidates: candidates.slice(0, 1000),
    });
  }
  if (url.pathname === '/api/invite-candidates' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const result = await saveInviteCandidates(payload.candidates);
    return send(res, 200, { accepted: result.accepted, total: result.ledger.candidates.length, updatedAt: result.ledger.updatedAt });
  }
  if (url.pathname === '/api/birthdays' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const [ledger, audience, wishLedger] = await Promise.all([
      readJson(birthdayLedgerFile),
      readJson(audienceFile),
      readJson(birthdayWishLedgerFile),
    ]);
    const audienceMatched = applyBirthdayFactsToAudience(audience, ledger);
    if (audienceMatched) await writeJson(audienceFile, audience);
    const draft = await ensureBirthdayCreatorDraft(ledger, audience).catch(() => ({ item: null, targets: 0 }));
    const todayTargets = birthdayCreatorTargets(ledger, audience);
    return send(res, 200, {
      updatedAt: ledger.updatedAt || null,
      summary: {
        total: (ledger.people || []).length,
        monthDayKnown: (ledger.people || []).filter((person) => person.monthDay).length,
        fullDobKnown: (ledger.people || []).filter((person) => person.birthYear && person.monthDay).length,
        ageKnown: (ledger.people || []).filter((person) => Number.isInteger(person.age)).length,
        creatorBirthdaysToday: todayTargets.length,
        audienceMatched,
        wishes: birthdayWishSummary(wishLedger),
      },
      scheduledDraft: draft.item ? { id: draft.item.id, reference: `D-${draft.item.id.slice(0, 8).toUpperCase()}`, status: draft.item.status, scheduledFor: draft.item.scheduledFor, targets: draft.item.tagTargets?.length || 0 } : null,
      people: ledger.people || [],
    });
  }
  if (url.pathname === '/api/birthday-wishes' && req.method === 'GET') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const ledger = await readJson(birthdayWishLedgerFile);
    return send(res, 200, {
      updatedAt: ledger.updatedAt || null,
      summary: birthdayWishSummary(ledger),
      wishes: [...(ledger.wishes || [])].sort((left, right) => new Date(right.actionAt || 0) - new Date(left.actionAt || 0)).slice(0, 1000),
    });
  }
  if (url.pathname === '/api/birthday-wish-capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    try {
      const result = await saveBirthdayWish(payload.wish);
      return send(res, 200, {
        added: result.duplicate ? 0 : 1,
        duplicate: result.duplicate,
        updatedAt: result.ledger.updatedAt,
        summary: birthdayWishSummary(result.ledger),
        wish: result.wish,
      });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/birthday-capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const capture = birthdayCapturePromise.catch(() => {}).then(async () => {
      const result = await saveBirthdayPeople(payload.people);
      const priority = await queueBirthdayProfilesForRyzen(result.ledger);
      await refreshAudienceReviewFromRyzen(true).catch((error) => console.warn(`Birthday profile review refresh skipped: ${error.message}`));
      const [ledger, audience] = await Promise.all([readJson(birthdayLedgerFile), readJson(audienceFile)]);
      const audienceMatched = applyBirthdayFactsToAudience(audience, ledger);
      if (audienceMatched) await writeJson(audienceFile, audience);
      const draft = await ensureBirthdayCreatorDraft(ledger, audience).catch((error) => ({ item: null, targets: 0, error: error.message }));
      return {
        captured: result.accepted,
        total: ledger.people.length,
        monthDayKnown: ledger.people.filter((person) => person.monthDay).length,
        ageKnown: ledger.people.filter((person) => Number.isInteger(person.age)).length,
        priorityQueued: priority.queued,
        priorityErrors: priority.errors,
        audienceMatched,
        creatorBirthdaysToday: Number(draft.targets || 0),
        scheduledDraft: draft.item ? { id: draft.item.id, reference: `D-${draft.item.id.slice(0, 8).toUpperCase()}`, status: draft.item.status, scheduledFor: draft.item.scheduledFor, targets: draft.item.tagTargets?.length || 0 } : null,
        updatedAt: ledger.updatedAt,
      };
    });
    birthdayCapturePromise = capture.catch(() => {});
    return send(res, 200, await capture);
  }
  if (url.pathname === '/api/invite-status' && req.method === 'GET') {
    const actorUrl = canonicalFacebookUrl(url.searchParams.get('actorUrl'));
    const actorId = String(url.searchParams.get('actorId') || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
    if (!actorId && !actorUrl) return send(res, 400, { error: 'An exact Facebook identity is required.' });
    const identityKey = actorId ? `facebook-id:${actorId}` : `facebook-url:${actorUrl}`;
    const ledger = await readJson(inviteLedgerFile);
    const existing = findExactFacebookRecord(ledger.invites, actorId, actorUrl);
    return send(res, 200, { identityKey, eligible: !existing, invited: Boolean(existing), invite: existing });
  }
  if (url.pathname === '/api/comment-like-status' && req.method === 'GET') {
    const commentKey = String(url.searchParams.get('commentKey') || '').trim().slice(0, 160);
    const actorUrl = canonicalFacebookUrl(url.searchParams.get('actorUrl'));
    const actorId = String(url.searchParams.get('actorId') || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
    if (!/^[a-z0-9:_-]{8,160}$/i.test(commentKey) || (!actorId && !actorUrl)) return send(res, 400, { error: 'An exact comment and Facebook identity are required.' });
    const ledger = await readJson(commentLikeLedgerFile);
    const existing = (ledger.likes || []).find((like) => like.commentKey === commentKey) || null;
    return send(res, 200, { commentKey, eligible: !existing, liked: Boolean(existing), like: existing });
  }
  if (url.pathname === '/api/comment-like-capture' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const commentKey = String(payload.commentKey || '').trim().slice(0, 160);
    const actorUrl = canonicalFacebookUrl(payload.actorUrl);
    const actorId = String(payload.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
    const actorName = repairMojibake(payload.actorName).trim().slice(0, 160);
    const quality = classifyComment({ text: payload.commentText, actorName });
    if (!/^[a-z0-9:_-]{8,160}$/i.test(commentKey) || (!actorId && !actorUrl) || !actorName) return send(res, 400, { error: 'An exact comment and Facebook identity are required.' });
    if (!quality.eligibleForAutoLike) return send(res, 400, { error: 'This comment did not pass the legitimate-comment check.', quality: quality.quality });
    const ledger = await readJson(commentLikeLedgerFile);
    const likes = Array.isArray(ledger.likes) ? ledger.likes : [];
    const existing = likes.find((like) => like.commentKey === commentKey);
    if (existing) return send(res, 200, { added: 0, duplicate: true, totalLikes: likes.length, like: existing });
    const like = {
      id: randomUUID(),
      commentKey,
      actorId,
      actorUrl,
      actorName,
      commentText: quality.text,
      commentQuality: quality.quality,
      postUrl: canonicalFacebookUrl(payload.postUrl),
      sourceUrl: canonicalFacebookUrl(payload.sourceUrl),
      status: payload.status === 'sent' ? 'sent' : 'attempted',
      actionAt: /^\d{4}-\d{2}-\d{2}T/.test(String(payload.actionAt || '')) ? new Date(payload.actionAt).toISOString() : new Date().toISOString(),
      source: 'personal-social-chrome-extension',
    };
    ledger.likes = [...likes, like].slice(-20000);
    ledger.updatedAt = like.actionAt;
    await writeJson(commentLikeLedgerFile, ledger);
    let ryzenQueued = false;
    let ryzenError = '';
    try {
      await sendToRyzen({ type: 'facebook-comment-like', ...like });
      ryzenQueued = true;
    } catch (error) {
      ryzenError = error.message;
    }
    return send(res, 200, { added: 1, duplicate: false, totalLikes: ledger.likes.length, like, ryzenQueued, ryzenError });
  }
  if (url.pathname === '/api/follow-activity' && req.method === 'GET') {
    const [inviteLedger, followLedger] = await Promise.all([readJson(inviteLedgerFile), readJson(followLedgerFile)]);
    const invites = Array.isArray(inviteLedger.invites) ? inviteLedger.invites : [];
    const events = Array.isArray(followLedger.events) ? followLedger.events : [];
    const newestFirst = (left, right) => new Date(right.actionAt || right.detectedAt || right.occurredAt || 0) - new Date(left.actionAt || left.detectedAt || left.occurredAt || 0);
    return send(res, 200, {
      updatedAt: [inviteLedger.updatedAt, followLedger.updatedAt].filter(Boolean).sort().at(-1) || null,
      summary: {
        invited: invites.length,
        possibleUnfollows: unresolvedUnfollowEvents(events).length,
        confirmedUnfollows: events.filter((event) => event.type === 'user-confirmed-unfollow').length,
        refollowed: events.filter((event) => event.type === 'refollowed').length,
      },
      invites: [...invites].sort(newestFirst).slice(0, 1000),
      followEvents: [...events].sort(newestFirst).slice(0, 1000),
    });
  }
  if (url.pathname === '/api/messages' && req.method === 'GET') {
    await refreshAudienceReviewFromRyzen().catch((error) => console.warn(`Message profile review refresh skipped: ${error.message}`));
    const [ledger, audience] = await Promise.all([readJson(messageLedgerFile), readJson(audienceFile)]);
    return send(res, 200, buildMessageInbox(ledger, audience));
  }
  if (url.pathname === '/api/message-capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const payload = await bodyJson(req);
    const { ledger, accepted } = await saveMessageThreads(payload.threads);
    const engagement = await recordMessageEngagement(ledger);
    const priority = await queueVerifiedMessageProfilesForRyzen(ledger);
    const audience = await readJson(audienceFile);
    const inbox = buildMessageInbox(ledger, audience);
    return send(res, 200, { accepted, engagementAdded: engagement.added, engagementMatched: engagement.matched, priorityQueued: priority.queued, priorityErrors: priority.errors, ...inbox.summary, updatedAt: inbox.updatedAt });
  }
  if (url.pathname === '/api/publishing-performance/capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    return send(res, 200, await capturePersonalTimelinePerformance(payload.posts));
  }
  if (url.pathname === '/api/follower-removals' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const personKey = String(payload.personKey || '').trim().slice(0, 500);
    const [audience, ledger] = await Promise.all([readJson(audienceFile), readJson(followerRemovalJobsFile)]);
    const person = (audience.people || []).find((entry) => entry.key === personKey);
    if (!person) return send(res, 404, { error: 'Audience member not found.' });
    const jobs = Array.isArray(ledger.jobs) ? ledger.jobs : [];
    const existing = [...jobs].reverse().find((job) => job.personKey === personKey && job.status !== 'complete');
    if (person.decision === 'removed' && !existing) return send(res, 409, { error: `${person.name || 'This profile'} is already in Removed.` });
    if (payload.keepBlocked !== undefined && typeof payload.keepBlocked !== 'boolean') return send(res, 400, { error: 'keepBlocked must be true or false.' });
    const keepBlocked = payload.keepBlocked === undefined ? shouldKeepAudienceBlocked(person) : payload.keepBlocked;
    const publicFacts = person.profileObservation?.publicFacts || {};
    const age = Number(person.age ?? publicFacts.age ?? person.facebookBirthday?.age);
    if (!keepBlocked && (person.profileState === 'minor-blocked' || person.decision === 'blocked-minor' || (Number.isFinite(age) && age > 0 && age < 18))) {
      return send(res, 409, { error: 'Under-18 profiles must keep the Facebook block enabled.' });
    }
    const profileUrl = exactAudienceUrl(person);
    if (!profileUrl) return send(res, 409, { error: 'An exact Facebook profile URL or numeric ID is required.' });
    if (existing) {
      let changed = false;
      if (existing.status === 'failed') {
        const retriedAt = new Date().toISOString();
        existing.keepBlocked = keepBlocked;
        existing.keptBlockedAt = null;
        existing.status = existing.recordedAt ? 'recorded' : existing.blockedAt ? 'blocked' : 'queued';
        existing.error = '';
        existing.updatedAt = retriedAt;
        existing.steps = removalStepState(existing.status, {}, existing.keepBlocked);
        ledger.updatedAt = retriedAt;
        changed = true;
      } else if (existing.status === 'queued' && existing.keepBlocked !== keepBlocked) {
        existing.keepBlocked = keepBlocked;
        existing.steps = removalStepState(existing.status, existing.steps, existing.keepBlocked);
        existing.updatedAt = new Date().toISOString();
        ledger.updatedAt = existing.updatedAt;
        changed = true;
      }
      if (changed) await writeJson(followerRemovalJobsFile, ledger);
      return send(res, 200, publicFollowerRemovalJob(existing, person));
    }
    const createdAt = new Date().toISOString();
    const job = {
      id: randomUUID(),
      personKey,
      personName: String(person.name || 'Facebook follower').slice(0, 160),
      profileUrl,
      requestedActor: 'Matthew Murphy',
      keepBlocked,
      status: 'queued',
      steps: removalStepState('queued', {}, keepBlocked),
      error: '',
      failedStep: '',
      createdAt,
      updatedAt: createdAt,
      blockedAt: null,
      recordedAt: null,
      unblockedAt: null,
      keptBlockedAt: null,
      personSnapshot: followerRemovalPersonSnapshot(person),
    };
    ledger.jobs = [...jobs, job].slice(-1000);
    ledger.updatedAt = createdAt;
    await writeJson(followerRemovalJobsFile, ledger);
    return send(res, 201, publicFollowerRemovalJob(job, person));
  }
  const followerRemovalMatch = url.pathname.match(/^\/api\/follower-removals\/([A-Za-z0-9-]{10,80})$/);
  if (followerRemovalMatch && req.method === 'GET') {
    const ledger = await readJson(followerRemovalJobsFile);
    const job = (ledger.jobs || []).find((entry) => entry.id === followerRemovalMatch[1]);
    if (!job) return send(res, 404, { error: 'Follower removal job not found.' });
    return send(res, 200, publicFollowerRemovalJob(job));
  }
  if (followerRemovalMatch && req.method === 'PATCH') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension access required.' });
    const payload = await bodyJson(req);
    const status = String(payload.status || '').trim();
    if (!followerRemovalStatuses.has(status) || status === 'queued') return send(res, 400, { error: 'Invalid follower removal status.' });
    const ledger = await readJson(followerRemovalJobsFile);
    const job = (ledger.jobs || []).find((entry) => entry.id === followerRemovalMatch[1]);
    if (!job) return send(res, 404, { error: 'Follower removal job not found.' });
    const updatedAt = removalTimestamp(payload.at);
    if (status === 'recorded' && !job.blockedAt) return send(res, 409, { error: 'The exact profile must appear in Facebook\'s Blocked list before recording removal.' });
    if (status === 'complete' && !job.recordedAt) return send(res, 409, { error: 'The Removed record must be written before the platform action is completed.' });
    job.status = status;
    job.updatedAt = updatedAt;
    job.steps = removalStepState(status, job.steps, job.keepBlocked === true);
    if (status !== 'failed') {
      job.error = '';
      job.failedStep = '';
    }
    if (status === 'blocked') {
      job.blockedAt = removalTimestamp(payload.blockedAt, updatedAt);
      job.steps.block = { status: 'complete', completedAt: job.blockedAt };
    }
    if (status === 'recorded') {
      job.recordedAt = removalTimestamp(payload.recordedAt, updatedAt);
      job.steps.record = { status: 'complete', completedAt: job.recordedAt };
      const audience = await readJson(audienceFile);
      const person = (audience.people || []).find((entry) => entry.key === job.personKey);
      if (!person) return send(res, 404, { error: 'Audience member not found.' });
      recordFollowerRemoved(audience, person, job, job.recordedAt);
      job.personSnapshot = followerRemovalPersonSnapshot(person);
      await writeJson(audienceFile, audience);
    }
    if (status === 'complete') {
      const audience = await readJson(audienceFile);
      const person = (audience.people || []).find((entry) => entry.key === job.personKey);
      if (!person) return send(res, 404, { error: 'Audience member not found.' });
      if (job.keepBlocked) {
        job.keptBlockedAt = removalTimestamp(payload.keptBlockedAt, updatedAt);
        job.unblockedAt = null;
        job.steps.unblock = { status: 'skipped', completedAt: job.keptBlockedAt };
        recordFollowerBlockRetained(audience, person, job, job.keptBlockedAt);
      } else {
        job.unblockedAt = removalTimestamp(payload.unblockedAt, updatedAt);
        job.keptBlockedAt = null;
        job.steps.unblock = { status: 'complete', completedAt: job.unblockedAt };
        recordFollowerUnblocked(audience, person, job, job.unblockedAt);
      }
      job.personSnapshot = followerRemovalPersonSnapshot(person);
      await writeJson(audienceFile, audience);
    }
    if (status === 'failed') {
      job.error = String(payload.error || 'Facebook removal did not finish.').trim().slice(0, 500);
      job.failedStep = ['block', 'record', 'unblock'].includes(payload.failedStep) ? payload.failedStep : 'block';
      job.steps[job.failedStep] = { ...(job.steps[job.failedStep] || {}), status: 'failed', error: job.error };
      if (job.recordedAt) {
        const audience = await readJson(audienceFile);
        const person = (audience.people || []).find((entry) => entry.key === job.personKey);
        if (person) {
          person.removalAutomationState = job.failedStep === 'unblock' ? 'unblock-failed' : 'failed';
          person.reviewedAt = updatedAt;
          job.personSnapshot = followerRemovalPersonSnapshot(person);
          await writeJson(audienceFile, audience);
        }
      }
    }
    ledger.updatedAt = updatedAt;
    await writeJson(followerRemovalJobsFile, ledger);
    return send(res, 200, publicFollowerRemovalJob(job));
  }
  if (url.pathname === '/api/audience' && req.method === 'GET') {
    refreshAudienceReviewFromRyzen().catch((error) => console.warn(`Audience review refresh skipped: ${error.message}`));
    const audience = await readJson(audienceFile);
    if (reconcileFollowerRemovalJobs(audience, await readJson(followerRemovalJobsFile))) await writeJson(audienceFile, audience);
    applyEngagementLedger(audience, await readJson(engagementLedgerFile), await readJson(queueFile));
    audience.riskReview = summarizeAudienceRisk(audience.people || []);
    const statusFilter = String(url.searchParams.get('filter') || 'all').trim().toLowerCase();
    const filteredPeople = statusFilter === 'all'
      ? (audience.people || [])
      : (audience.people || []).filter((person) => audienceFilterMatches(person, statusFilter));
    return send(res, 200, {
      ...audience,
      selectedFilter: statusFilter,
      people: filteredPeople.map(compactAudiencePersonForDesk),
    });
  }
  if (url.pathname === '/api/scan-progress' && req.method === 'GET') {
    return send(res, 200, await buildScanProgressSummary());
  }
  if (url.pathname === '/api/audience-reports' && req.method === 'GET') return send(res, 200, await buildAudienceReports());
  if (url.pathname === '/api/performance-log' && req.method === 'POST') {
    const payload = await bodyJson(req).catch(() => ({}));
    const store = await readJson(performanceLogFile).catch(() => ({ updatedAt: null, entries: [] }));
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const accepted = entries
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        kind: entry.kind === 'view' ? 'view' : 'api',
        name: String(entry.name || '').trim().slice(0, 80),
        label: String(entry.label || '').trim().slice(0, 160),
        view: String(entry.view || '').trim().slice(0, 80),
        viewLabel: String(entry.viewLabel || '').trim().slice(0, 160),
        url: String(entry.url || '').trim().slice(0, 200),
        status: Number.isFinite(Number(entry.status)) ? Number(entry.status) : 0,
        ok: entry.ok === true,
        ms: Math.max(0, Math.round(Number(entry.ms) || 0)),
        apiCount: Math.max(0, Math.round(Number(entry.apiCount) || 0)),
        apiCalls: Array.isArray(entry.apiCalls)
          ? entry.apiCalls.slice(-8).map((call) => ({
              label: String(call?.label || '').trim().slice(0, 120),
              ms: Math.max(0, Math.round(Number(call?.ms) || 0)),
              status: typeof call?.status === 'string' ? call.status.slice(0, 30) : Number(call?.status) || 0,
            }))
          : [],
        error: String(entry.error || '').trim().slice(0, 240),
        at: new Date(entry.at || Date.now()).toISOString(),
      }))
      .filter((entry) => entry.label && entry.ms >= 0);
    store.entries = [...(store.entries || []), ...accepted].slice(-5000);
    store.updatedAt = new Date().toISOString();
    await writeJson(performanceLogFile, store);
    return send(res, 200, { accepted: accepted.length, total: store.entries.length, updatedAt: store.updatedAt });
  }
  if (url.pathname === '/api/performance-log' && req.method === 'GET') {
    const store = await readJson(performanceLogFile).catch(() => ({ updatedAt: null, entries: [] }));
    return send(res, 200, {
      updatedAt: store.updatedAt || null,
      total: Array.isArray(store.entries) ? store.entries.length : 0,
      entries: Array.isArray(store.entries) ? store.entries.slice(-200) : [],
    });
  }
  if (url.pathname === '/api/creator-tip-art-styles' && req.method === 'GET') {
    return send(res, 200, creatorTipStyleLibraryPayload());
  }
  if (url.pathname === '/api/creator-tip-art-styles' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      const action = String(payload.action || 'add');
      if (action === 'add') {
        const label = String(payload.label || '').trim().slice(0, 80);
        const direction = String(payload.direction || '').trim().replace(/\s+/g, ' ').slice(0, 800);
        const baseKey = creatorTipStyleKey(payload.key || label);
        const key = baseKey.startsWith('custom-') ? baseKey : `custom-${baseKey}`;
        if (label.length < 3) return send(res, 400, { error: 'Give the new style a clear name.' });
        if (direction.length < 20) return send(res, 400, { error: 'Describe the medium, linework, palette, mood, and composition.' });
        if (creatorTipStyleFamilies().some((family) => family.key === key || family.label.toLowerCase() === label.toLowerCase())) {
          return send(res, 409, { error: 'That style name already exists.' });
        }
        const createdAt = new Date().toISOString();
        await saveCreatorTipStyleConfig({
          ...creatorTipStyleConfig,
          customStyles: [...creatorTipStyleConfig.customStyles, { key, label, direction, createdAt }],
        });
        let assignment = null;
        const publishDate = String(payload.publishDate || '');
        if (publishDate) assignment = await assignCreatorTipStyleToDate(publishDate, key);
        return send(res, 201, creatorTipStyleLibraryPayload({ added: key, assignment }));
      }
      if (action === 'assign') {
        const publishDate = String(payload.publishDate || '');
        const styleKey = creatorTipStyleKey(payload.styleKey);
        const assignment = await assignCreatorTipStyleToDate(publishDate, styleKey);
        return send(res, 200, creatorTipStyleLibraryPayload({ assignment }));
      }
      return send(res, 400, { error: 'Unsupported style-library action.' });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/image-review-feed' && req.method === 'GET') {
    const queue = await readJson(queueFile);
    const expiredGreetings = pruneExpiredCreatorGreetings(queue, { now: new Date() });
    if (expiredGreetings.length) {
      queue.updatedAt = new Date().toISOString();
      await writeJson(queueFile, queue);
    }
    const mode = url.searchParams.get('mode') === 'manual' ? 'manual' : 'flagged';
    return send(res, 200, buildImageReviewFeed(queue, { mode }));
  }
  if (url.pathname === '/api/image-review/process' && req.method === 'POST') {
    const queue = await readJson(queueFile);
    const flaggedFeed = buildImageReviewFeed(queue, { mode: 'flagged' });
    const flaggedIdSet = new Set(flaggedFeed.items.flatMap((entry) => entry.linkedDraftIds || []));
    if (!flaggedIdSet.size) return send(res, 200, { processedPairs: 0, updatedDrafts: 0 });
    const processedAt = new Date().toISOString();
    const keep = [];
    const move = [];
    let protectedSkipped = 0;
    for (const item of queue.items || []) {
      if (!flaggedIdSet.has(item.id)) {
        keep.push(item);
        continue;
      }
      if (isProtectedTipReference(item)) {
        protectedSkipped += 1;
        keep.push(item);
        continue;
      }
      item.scheduledFor = null;
      if (item.status !== 'published') item.status = 'draft';
      if (queueHasAnyImageReview(item)) {
        const imageReview = {};
        for (const role of ['feed', 'story']) {
          const review = queueImageReviewForRole(item, role);
          if (review) imageReview[role] = { ...review, queuedForRedoAt: processedAt, updatedAt: processedAt };
        }
        item.imageReview = imageReview;
      }
      item.updatedAt = processedAt;
      move.push(item);
    }
    queue.items = [...keep, ...move];
    await writeJson(queueFile, queue);
    return send(res, 200, {
      processedAt,
      processedPairs: flaggedFeed.items.length,
      updatedDrafts: move.length,
      protectedSkipped,
    });
  }
  if (url.pathname === '/api/archive-remix' && req.method === 'GET') {
    const library = await readJson(facebookRemixLibraryFile).catch(() => ({
      schemaVersion: 1,
      candidates: [],
      summary: {},
      policy: { approvalRequired: true, autoPublish: false, deleteFromMeta: false, substantialRemixRequired: true },
    }));
    return send(res, 200, publicFacebookRemixLibrary(library));
  }
  const archiveRemixGenerateMatch = url.pathname.match(/^\/api\/archive-remix\/([A-Za-z0-9-]{12,100})\/generate$/);
  if (archiveRemixGenerateMatch && req.method === 'POST') {
    try {
      const library = await readJson(facebookRemixLibraryFile);
      const candidate = (library.candidates || []).find((entry) => entry.id === archiveRemixGenerateMatch[1]);
      if (!candidate) return send(res, 404, { error: 'Archive remix candidate not found.' });
      const generatedAt = new Date().toISOString();
      candidate.remix = {
        ...(candidate.remix || {}),
        ...(await generateArchiveRemix(candidate)),
        state: 'generated',
        generatedAt,
        approvalState: 'needs-review',
      };
      candidate.review = { ...(candidate.review || {}), state: 'shortlist', updatedAt: generatedAt };
      library.updatedAt = generatedAt;
      await writeJson(facebookRemixLibraryFile, library);
      return send(res, 200, candidate);
    } catch (error) {
      return send(res, /not found/i.test(error.message) ? 404 : /not enabled/i.test(error.message) ? 409 : 502, { error: error.message });
    }
  }
  const archiveRemixMatch = url.pathname.match(/^\/api\/archive-remix\/([A-Za-z0-9-]{12,100})$/);
  if (archiveRemixMatch && req.method === 'PATCH') {
    const payload = await bodyJson(req);
    const state = String(payload.state || '').trim();
    if (!['review', 'shortlist', 'skip'].includes(state)) return send(res, 400, { error: 'Choose review, shortlist, or skip.' });
    const library = await readJson(facebookRemixLibraryFile);
    const candidate = (library.candidates || []).find((entry) => entry.id === archiveRemixMatch[1]);
    if (!candidate) return send(res, 404, { error: 'Archive remix candidate not found.' });
    const updatedAt = new Date().toISOString();
    candidate.review = { ...(candidate.review || {}), state, reviewedAt: updatedAt, updatedAt };
    library.updatedAt = updatedAt;
    await writeJson(facebookRemixLibraryFile, library);
    return send(res, 200, candidate);
  }
  if (url.pathname === '/api/media-index' && req.method === 'GET') return send(res, 200, await readJson(mediaIndexFile).catch(() => ({ archives: [] })));
  if (url.pathname === '/api/comments' && req.method === 'GET') return send(res, 200, await readJson(commentsFile));

  if (url.pathname === '/api/comments/settings' && req.method === 'PATCH') {
    const payload = await bodyJson(req);
    const comments = await readJson(commentsFile);
    if (['review', 'react', 'safe'].includes(payload.mode)) comments.mode = payload.mode;
    await writeJson(commentsFile, comments);
    return send(res, 200, comments);
  }

  const commentMatch = url.pathname.match(/^\/api\/comments\/([^/]+)$/);
  if (commentMatch && req.method === 'PATCH') {
    const payload = await bodyJson(req);
    const comments = await readJson(commentsFile);
    const item = comments.items.find(entry => entry.id === commentMatch[1]);
    if (!item) return send(res, 404, { error: 'Comment not found' });
    item.status = payload.action === 'approve' ? 'approved' : 'dismissed';
    item.reviewedAt = new Date().toISOString();
    if (item.status === 'approved') await sendToRyzen({ type: 'facebook-comment-action', ...item, requestedBy: 'creator-publishing-hub-personal-social-desk' });
    await writeJson(commentsFile, comments);
    return send(res, 200, comments);
  }

  if (url.pathname === '/api/roster-capture' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const incoming = Array.isArray(payload.followers) ? payload.followers : [];
    const capturedAt = new Date().toISOString();
    const [audience, followLedger, relationshipRosters, engagementLedger, queue] = await Promise.all([readJson(audienceFile), readJson(followLedgerFile), readJson(relationshipRostersFile), readJson(engagementLedgerFile), readJson(queueFile)]);
    const followEvents = Array.isArray(followLedger.events) ? followLedger.events : [];
    let followLedgerChanged = false;
    const byKey = new Map((audience.people || []).map(person => [person.key, person]));
    const byId = new Map((audience.people || []).filter(person => person.id).map(person => [String(person.id), person]));
    const byUrl = new Map((audience.people || []).filter(person => person.url).map(person => [canonicalFacebookUrl(person.url), person]));
    const keyFor = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
    for (const follower of incoming) {
      const name = repairMojibake(follower.name).trim();
      const id = String(follower.id || '').replace(/[^0-9]/g, '');
      const url = canonicalFacebookUrl(follower.url || (id ? `https://www.facebook.com/profile.php?id=${id}` : ''));
      const fallbackKey = keyFor(name);
      if (!name || (!id && !url && !fallbackKey)) continue;
      const existing = (id && byId.get(id)) || (url && byUrl.get(url)) || byKey.get(fallbackKey) || {};
      const resolvedId = id || String(existing.id || '').replace(/[^0-9]/g, '');
      const resolvedUrl = url || canonicalFacebookUrl(existing.url);
      const key = resolvedId ? `facebook-id:${resolvedId}` : resolvedUrl ? `facebook-url:${resolvedUrl}` : fallbackKey;
      if (existing.key && existing.key !== key) byKey.delete(existing.key);
      const exactIdentity = Boolean(resolvedId || resolvedUrl);
      const unresolved = exactIdentity ? unresolvedUnfollowEvents(followEvents, resolvedId, resolvedUrl) : [];
      for (const event of unresolved) {
        event.resolvedAt = capturedAt;
        event.resolution = 'exact-roster-recapture';
        followLedgerChanged = true;
      }
      const record = { ...existing, key, id: resolvedId, url: resolvedUrl, avatar: String(follower.avatar || existing.avatar || '').slice(0, 1500), name, identityState: exactIdentity ? 'linked' : 'unlinked-export', followedAt: existing.followedAt || null, friend: existing.friend || false, score: existing.score || 0, recentEvents: existing.recentEvents || 0, lastEngagedAt: existing.lastEngagedAt || null, reactions: existing.reactions || 0, comments: existing.comments || 0, shares: existing.shares || 0, mentions: existing.mentions || 0, eventCount: existing.eventCount || 0, tier: existing.tier || 'monitoring', reason: existing.reason || 'Captured from the live Facebook follower roster; engagement monitoring is in progress.', monitoringStartedAt: existing.monitoringStartedAt || capturedAt, firstMarkedAt: existing.firstMarkedAt || null, reviewMarkedAt: existing.reviewMarkedAt || null, decision: existing.decision || 'undecided', profileState: existing.profileState || 'pending', profileRetryCount: existing.profileRetryCount || 0, keepLocked: existing.keepLocked || false, profileObservation: existing.profileObservation || null };
      if (exactIdentity) {
        record.lastConfirmedFollowerAt = capturedAt;
        record.followState = unresolved.length ? 'following-again' : 'following';
        if (unresolved.length) record.refollowedAt = capturedAt;
        delete record.possibleUnfollowAt;
        delete record.possibleUnfollowReason;
      }
      byKey.set(key, record);
      if (record.id) byId.set(record.id, record);
      if (record.url) byUrl.set(record.url, record);
    }
    audience.people = [...byKey.values()];
    audience.coverage = { ...(audience.coverage || {}), liveCaptureActive: true, liveCapturedAt: capturedAt, rosterIsComplete: payload.complete === true };
    audience.summary = { ...(audience.summary || {}), total: audience.people.length, followers: audience.people.length, monitoring: audience.people.filter(x => x.tier === 'monitoring').length, possibleUnfollows: unresolvedUnfollowEvents(followEvents).length };
    applyRelationshipCoverageToAudience(audience, relationshipRosters);
    applyEngagementLedger(audience, engagementLedger, queue);
    await writeJson(audienceFile, audience);
    if (followLedgerChanged) {
      followLedger.events = followEvents;
      followLedger.updatedAt = capturedAt;
      await writeJson(followLedgerFile, followLedger);
    }
    return send(res, 200, { captured: incoming.length, total: audience.people.length, complete: audience.coverage.rosterIsComplete });
  }

  if (url.pathname === '/api/relationship-roster-capture' && req.method === 'POST') {
    if (!extensionClientAllowed(req)) return send(res, 403, { error: 'Extension client required.' });
    const payload = await bodyJson(req);
    const kind = payload.kind === 'following' ? 'following' : 'friend';
    try {
      const result = await saveRelationshipRoster(kind, payload);
      return send(res, 200, {
        accepted: result.accepted,
        matched: result.matched,
        total: relationshipRosterTotal(result.roster),
        complete: result.roster.complete === true,
        coverage: result.coverage,
      });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }

  if (url.pathname === '/api/engagement-capture' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const incoming = Array.isArray(payload.events) ? payload.events.slice(0, 500) : [];
    const capturedAt = new Date().toISOString();
    const audience = await readJson(audienceFile);
    const ledger = await readJson(engagementLedgerFile);
    const knownEventKeys = new Set((ledger.events || []).map((event) => event.eventKey));
    const byId = new Map((audience.people || []).filter((person) => person.id).map((person) => [String(person.id), person]));
    const byUrl = new Map((audience.people || []).filter((person) => person.url).map((person) => [canonicalFacebookUrl(person.url), person]));
    const newEvents = [];
    let matched = 0;
    let unmatched = 0;
    let ignored = 0;

    for (const rawEvent of incoming) {
      const actorUrl = canonicalFacebookUrl(rawEvent.actorUrl);
      const actorId = String(rawEvent.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
      const actorName = repairMojibake(rawEvent.actorName).trim().slice(0, 160);
      const type = ['reaction', 'like', 'comment', 'share', 'mention'].includes(String(rawEvent.type || '').toLowerCase()) ? String(rawEvent.type).toLowerCase() : '';
      if ((!actorId && !actorUrl) || !actorName || !type) { ignored += 1; continue; }
      const event = {
        actorId,
        actorUrl,
        actorName,
        type,
        text: repairMojibake(rawEvent.text).trim().slice(0, 600),
        postUrl: canonicalFacebookUrl(rawEvent.postUrl),
        source: ['notifications', 'feed', 'comment-thread', 'reaction-list'].includes(rawEvent.source) ? rawEvent.source : 'facebook-page',
        contentScope: ['own-profile', 'own-group-post', 'own-group-comment'].includes(rawEvent.contentScope) ? rawEvent.contentScope : 'own-profile',
        sourceUrl: canonicalFacebookUrl(rawEvent.sourceUrl),
        occurredAt: /^\d{4}-\d{2}-\d{2}T/.test(String(rawEvent.occurredAt || '')) ? new Date(rawEvent.occurredAt).toISOString() : null,
        capturedAt,
      };
      event.eventKey = engagementEventKey(event);
      if (knownEventKeys.has(event.eventKey)) continue;
      knownEventKeys.add(event.eventKey);
      newEvents.push(event);

      let person = (actorId && byId.get(actorId)) || (actorUrl && byUrl.get(actorUrl));
      if (person) {
        matched += 1;
      } else {
        unmatched += 1;
        continue;
      }

      if (actorId && !person.id) person.id = actorId;
      if (actorUrl && !person.url) person.url = actorUrl;
      if (!person.name || person.identityState === 'unlinked-export') person.name = actorName;
      person.identityState = 'linked';
    }

    if (newEvents.length) {
      ledger.events = [...(ledger.events || []), ...newEvents].slice(-100000);
      ledger.updatedAt = capturedAt;
      audience.importedAt = capturedAt;
      await writeJson(engagementLedgerFile, ledger);
    }
    if ((ledger.events || []).length) {
      applyEngagementLedger(audience, ledger, queue);
      await writeJson(audienceFile, audience);
    }

    let ryzenQueued = false;
    let ryzenError = '';
    if (newEvents.length) {
      try {
        await sendToRyzen({ id: randomUUID(), type: 'facebook-engagement-capture', source: 'personal-social-chrome-extension', receivedAt: capturedAt, events: newEvents });
        ryzenQueued = true;
      } catch (error) {
        ryzenError = error.message;
      }
    }
    return send(res, 200, { received: incoming.length, added: newEvents.length, duplicates: incoming.length - ignored - newEvents.length, ignored, matched, unmatched, totalEngagementEvents: ledger.events.length, ryzenQueued, ryzenError });
  }

  if (url.pathname === '/api/invite-capture' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const actorUrl = canonicalFacebookUrl(payload.actorUrl);
    const actorId = String(payload.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
    const actorName = repairMojibake(payload.actorName).trim().slice(0, 160);
    if ((!actorId && !actorUrl) || !actorName) return send(res, 400, { error: 'An exact Facebook identity is required.' });

    const [ledger, followLedger, audience] = await Promise.all([readJson(inviteLedgerFile), readJson(followLedgerFile), readJson(audienceFile)]);
    const invites = Array.isArray(ledger.invites) ? ledger.invites : [];
    const identityKey = actorId ? `facebook-id:${actorId}` : `facebook-url:${actorUrl}`;
    const existing = findExactFacebookRecord(invites, actorId, actorUrl);
    if (existing) {
      if (payload.status === 'sent' && existing.status !== 'sent') {
        existing.status = 'sent';
        existing.confirmedSentAt = new Date().toISOString();
        ledger.updatedAt = existing.confirmedSentAt;
        await writeJson(inviteLedgerFile, ledger);
      }
      await markInviteCandidate(identityKey, existing.status || payload.status || 'attempted', existing);
      return send(res, 200, { added: 0, duplicate: true, totalInvites: invites.length, invite: existing });
    }

    const invite = {
      id: randomUUID(),
      identityKey,
      actorId,
      actorUrl,
      actorName,
      postUrl: canonicalFacebookUrl(payload.postUrl),
      sourceUrl: canonicalFacebookUrl(payload.sourceUrl),
      status: payload.status === 'sent' ? 'sent' : 'attempted',
      actionAt: /^\d{4}-\d{2}-\d{2}T/.test(String(payload.actionAt || '')) ? new Date(payload.actionAt).toISOString() : new Date().toISOString(),
      source: payload.source === 'user-confirmed' ? 'user-confirmed' : 'personal-social-chrome-extension',
    };
    ledger.invites = [...invites, invite].slice(-10000);
    ledger.updatedAt = invite.actionAt;
    await writeJson(inviteLedgerFile, ledger);
    await markInviteCandidate(identityKey, invite.status, invite);

    const person = findExactFacebookRecord(audience.people, actorId, actorUrl);
    let possibleUnfollow = null;
    if (person) {
      person.followState = 'possible-unfollow';
      person.possibleUnfollowAt = invite.actionAt;
      person.possibleUnfollowReason = 'Facebook showed Invite for this exact identity after it had appeared in the captured follower roster.';
      person.lastInvitedAt = invite.actionAt;
      person.reinviteCount = Number(person.reinviteCount || 0) + 1;
      const followEvents = Array.isArray(followLedger.events) ? followLedger.events : [];
      possibleUnfollow = unresolvedUnfollowEvents(followEvents, actorId, actorUrl)[0] || null;
      if (!possibleUnfollow) {
        possibleUnfollow = {
          id: randomUUID(),
          type: 'possible-unfollow',
          identityKey,
          actorId,
          actorUrl,
          actorName,
          evidence: 'Facebook showed Invite in a reaction list on Matthew Murphy\'s own content for an exact identity previously captured in the follower roster.',
          sourceUrl: invite.sourceUrl,
          postUrl: invite.postUrl,
          detectedAt: invite.actionAt,
          inviteId: invite.id,
          resolvedAt: null,
        };
        followEvents.push(possibleUnfollow);
        followLedger.events = followEvents.slice(-10000);
        followLedger.updatedAt = invite.actionAt;
        audience.summary = { ...(audience.summary || {}), possibleUnfollows: unresolvedUnfollowEvents(followLedger.events).length };
        await Promise.all([writeJson(followLedgerFile, followLedger), writeJson(audienceFile, audience)]);
      } else {
        await writeJson(audienceFile, audience);
      }
    }

    let ryzenQueued = false;
    let ryzenError = '';
    try {
      await sendToRyzen({ type: 'facebook-page-invite', ...invite, knownFollowerAtInvite: Boolean(person), possibleUnfollowId: possibleUnfollow?.id || null });
      ryzenQueued = true;
    } catch (error) {
      ryzenError = error.message;
    }
    return send(res, 200, { added: 1, duplicate: false, totalInvites: ledger.invites.length, invite, possibleUnfollow: Boolean(possibleUnfollow), ryzenQueued, ryzenError });
  }

  if (url.pathname === '/api/follow-event' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const actorUrl = canonicalFacebookUrl(payload.actorUrl);
    const actorId = String(payload.actorId || facebookIdFromUrl(actorUrl)).replace(/\D/g, '');
    const type = ['user-confirmed-unfollow', 'refollowed'].includes(payload.type) ? payload.type : '';
    if ((!actorId && !actorUrl) || !type) return send(res, 400, { error: 'An exact Facebook identity and valid follow event type are required.' });
    const occurredAt = /^\d{4}-\d{2}-\d{2}T/.test(String(payload.occurredAt || payload.detectedAt || '')) ? new Date(payload.occurredAt || payload.detectedAt).toISOString() : new Date().toISOString();
    const identityKey = actorId ? `facebook-id:${actorId}` : `facebook-url:${actorUrl}`;
    const [followLedger, audience, engagementLedger] = await Promise.all([readJson(followLedgerFile), readJson(audienceFile), readJson(engagementLedgerFile)]);
    const events = Array.isArray(followLedger.events) ? followLedger.events : [];
    const person = findExactFacebookRecord(audience.people, actorId, actorUrl);
    const engagement = [...(engagementLedger.events || [])].reverse().find((event) => matchesExactFacebookIdentity(event, actorId, actorUrl));
    const actorName = repairMojibake(payload.actorName || person?.name || engagement?.actorName || `Facebook ${actorId || actorUrl}`).trim().slice(0, 160);
    let event;

    if (type === 'user-confirmed-unfollow') {
      event = unresolvedUnfollowEvents(events, actorId, actorUrl)[0] || null;
      if (event?.type === 'user-confirmed-unfollow') return send(res, 200, { added: 0, duplicate: true, event, totalEvents: events.length });
      if (event) {
        event.type = type;
        event.confirmedAt = occurredAt;
        event.source = 'user-confirmed';
        event.evidence = repairMojibake(payload.evidence || event.evidence || 'User confirmed this exact identity had followed before Facebook showed Invite again.').trim().slice(0, 600);
      } else {
        event = { id: randomUUID(), type, identityKey, actorId, actorUrl, actorName, evidence: repairMojibake(payload.evidence || 'User confirmed this exact identity had followed before Facebook showed Invite again.').trim().slice(0, 600), source: 'user-confirmed', detectedAt: occurredAt, confirmedAt: occurredAt, resolvedAt: null };
        events.push(event);
      }
      if (person) {
        person.followState = 'confirmed-unfollow';
        person.possibleUnfollowAt = occurredAt;
        person.possibleUnfollowReason = event.evidence;
      }
    } else {
      const unresolved = unresolvedUnfollowEvents(events, actorId, actorUrl);
      for (const prior of unresolved) {
        prior.resolvedAt = occurredAt;
        prior.resolution = 'refollowed';
      }
      event = { id: randomUUID(), type, identityKey, actorId, actorUrl, actorName, evidence: repairMojibake(payload.evidence || 'The exact identity appeared in the follower roster again.').trim().slice(0, 600), source: payload.source === 'roster-capture' ? 'roster-capture' : 'user-confirmed', detectedAt: occurredAt, resolvedAt: occurredAt };
      events.push(event);
      if (person) {
        person.followState = 'following-again';
        person.refollowedAt = occurredAt;
        person.lastConfirmedFollowerAt = occurredAt;
        delete person.possibleUnfollowAt;
        delete person.possibleUnfollowReason;
      }
    }

    followLedger.events = events.slice(-10000);
    followLedger.updatedAt = occurredAt;
    audience.summary = { ...(audience.summary || {}), possibleUnfollows: unresolvedUnfollowEvents(followLedger.events).length };
    await Promise.all([writeJson(followLedgerFile, followLedger), writeJson(audienceFile, audience)]);
    let ryzenQueued = false;
    let ryzenError = '';
    try {
      await sendToRyzen({ type: 'facebook-follow-status', ...event });
      ryzenQueued = true;
    } catch (error) {
      ryzenError = error.message;
    }
    return send(res, 200, { added: 1, duplicate: false, event, totalEvents: followLedger.events.length, ryzenQueued, ryzenError });
  }

  if (url.pathname === '/api/drafts' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const queue = await readJson(queueFile);
    const item = {
      id: randomUUID(),
      title: normalizeHumanPostText(String(payload.title || 'Untitled post')).slice(0, 140),
      body: normalizeHumanPostText(String(payload.body || '').slice(0, 5000)),
      target: ['creditrepairchoices-page', 'matthew-page', 'matthew-profile'].includes(payload.target) ? payload.target : 'matthew-page',
      format: ['feed', 'story', 'reel', 'discussion'].includes(payload.format) ? payload.format : 'feed',
      status: 'draft',
      scheduledFor: payload.scheduledFor || null,
      source: payload.source || 'manual',
      notes: String(payload.notes || '').slice(0, 1000),
      tagTargets: normalizeTagTargets(payload.tagTargets),
      media: [],
      createdAt: new Date().toISOString(),
    };
    queue.items.unshift(item);
    await writeJson(queueFile, queue);
    return send(res, 201, item);
  }

  if (url.pathname === '/api/creator-tip-collections' && req.method === 'GET') {
    const queue = await readJson(queueFile);
    return send(res, 200, {
      generatedAt: new Date().toISOString(),
      ...buildCreatorTipCollectionPlans(queue.items || []),
    });
  }

  if (url.pathname === '/api/creator-tip-collections/build' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const collectionKey = String(payload.collectionKey || '');
    const queue = await readJson(queueFile);
    const plans = buildCreatorTipCollectionPlans(queue.items || []);
    const plan = [...plans.weeks, ...plans.months].find((entry) => entry.collectionKey === collectionKey);
    if (!plan) return send(res, 404, { error: 'Collection period not found.' });
    if (!plan.ready) return send(res, 409, { error: `This collection still needs ${plan.missingDates.length} daily cover${plan.missingDates.length === 1 ? '' : 's'}.` });
    if (plan.existingDraft) return send(res, 409, { error: 'This collection already has a photo-dump draft.' });
    const createdAt = new Date().toISOString();
    const periodLabel = plan.type === 'month'
      ? new Date(`${plan.periodStart}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${plan.periodStart} through ${plan.periodEnd}`;
    const item = {
      id: randomUUID(),
      title: `${plan.type === 'month' ? 'Monthly' : 'Weekly'} Creator Tips comic collection - ${periodLabel}`,
      body: normalizeHumanPostText(`${plan.coverCount} Daily Creator Tip Series. One collection built a day at a time.\n\nWhich cover would you open first?\n\n#CreatorsListenUp #CreatorTips #ContentCreators #BuiltNotBegged`),
      target: 'matthew-page',
      format: 'feed',
      status: 'draft',
      scheduledFor: plan.suggestedScheduledFor,
      source: `creator-tip-cover-collection:${plan.collectionKey}`,
      notes: 'Attach three or four approved collection photographs to this one Facebook photo-dump draft. It stays locked before the newest source cover existed.',
      storyMode: 'disabled',
      campaign: {
        kind: CREATOR_TIP_COVER_COLLECTION_KIND,
        collectionKey: plan.collectionKey,
        collectionType: plan.type,
        periodStart: plan.periodStart,
        periodEnd: plan.periodEnd,
      },
      collectionPhotoDump: {
        periodType: plan.type,
        startDate: plan.periodStart,
        endDate: plan.periodEnd,
        coverCount: plan.coverCount,
        coverDraftIds: [...new Set(plan.covers.flatMap((cover) => cover.itemIds || []))],
        prompts: plan.prompts,
        requiredImages: 3,
        maximumImages: 4,
        pageFlip: true,
      },
      scheduleGuard: {
        notBeforeAt: plan.availableAfter,
        reason: 'A collection photo dump cannot publish before every included daily cover existed.',
      },
      imagePrompt: plan.prompts.map((entry, index) => `SHOT ${index + 1} - ${entry.label}\n${entry.prompt}`).join('\n\n'),
      media: [],
      imageReview: queueImageReviewStateForRoles(['feed'], 'Collection photoshoot needs three or four approved images.', createdAt),
      createdAt,
    };
    queue.items.unshift(item);
    queue.updatedAt = createdAt;
    await writeJson(queueFile, queue);
    return send(res, 201, item);
  }

  if (url.pathname === '/api/creator-tip-reel-audio' && req.method === 'GET') {
    const library = await readJson(creatorTipReelAudioFile).catch(() => ({ updatedAt: null, tracks: [] }));
    return send(res, 200, library);
  }

  if (url.pathname === '/api/creator-tip-reel-audio' && req.method === 'POST') {
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > 100 * 1024 * 1024) return send(res, 413, { error: 'Reel audio must be smaller than 100 MB.' });
    const type = String(req.headers['content-type'] || 'audio/mpeg').split(';')[0].trim().toLowerCase();
    if (!type.startsWith('audio/')) return send(res, 415, { error: 'Choose an audio file.' });
    const filename = safeFilename(req.headers['x-filename'] || 'owned-reel-audio.mp3');
    const title = String(req.headers['x-title'] || filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).trim().slice(0, 160);
    const durationSeconds = Number(req.headers['x-duration-seconds'] || 0);
    const id = randomUUID();
    const uploaded = await streamCreatorTipReelAudioToRyzen(req, id, filename, type);
    const createdAt = new Date().toISOString();
    const track = {
      id,
      title: title || filename,
      filename,
      type,
      bytes: uploaded.bytes,
      durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : null,
      path: uploaded.path,
      url: `/api/media?path=${encodeURIComponent(uploaded.path)}&type=${encodeURIComponent(type)}`,
      ownedBy: 'mmurphy',
      rights: 'user-supplied',
      createdAt,
    };
    const library = await readJson(creatorTipReelAudioFile).catch(() => ({ updatedAt: null, tracks: [] }));
    library.tracks = [track, ...(library.tracks || []).filter((item) => item.id !== id)].slice(0, 200);
    library.updatedAt = createdAt;
    await writeJson(creatorTipReelAudioFile, library);
    return send(res, 201, { track, library });
  }

  if (url.pathname === '/api/creator-tip-reels' && req.method === 'GET') {
    await syncCreatorTipReelResultsFromRyzen().catch(() => {});
    const [queue, ledger, reelWorker] = await Promise.all([
      readJson(queueFile),
      readJson(creatorTipReelJobsFile).catch(() => ({ updatedAt: null, jobs: [] })),
      refreshCreatorTipReelWorkerStatus(),
    ]);
    const collections = buildCreatorTipCollectionPlans(queue.items || []);
    const daily = collections.covers.map((cover) => {
      try {
        const plan = dailyCreatorTipReelPlan(queue, cover.date);
        return { publishDate: cover.date, ready: true, tipCount: plan.tipCount, frameCount: plan.frames.length, displayCaseBooks: plan.displayCaseCovers.length, notBeforeAt: plan.notBeforeAt };
      } catch (error) {
        return { publishDate: cover.date, ready: false, error: error.message };
      }
    });
    return send(res, 200, {
      updatedAt: ledger.updatedAt,
      worker: reelWorker,
      daily,
      jobs: ledger.jobs || [],
    });
  }

  const reelAudioMatch = url.pathname.match(/^\/api\/creator-tip-reels\/([A-Za-z0-9-]{10,80})\/audio$/);
  if (reelAudioMatch && req.method === 'POST') {
    const payload = await bodyJson(req);
    const [ledger, library] = await Promise.all([
      readJson(creatorTipReelJobsFile).catch(() => ({ updatedAt: null, jobs: [] })),
      readJson(creatorTipReelAudioFile).catch(() => ({ updatedAt: null, tracks: [] })),
    ]);
    const jobIndex = (ledger.jobs || []).findIndex((entry) => entry.id === reelAudioMatch[1]);
    if (jobIndex < 0) return send(res, 404, { error: 'Reel job not found.' });
    const job = ledger.jobs[jobIndex];
    if (!['queued', 'needs-redo'].includes(job.status)) return send(res, 409, { error: 'Owned audio can be assigned only before Reel approval.' });
    const track = (library.tracks || []).find((entry) => entry.id === String(payload.audioId || ''));
    if (!track) return send(res, 404, { error: 'Owned audio track not found.' });
    const assignedAt = new Date().toISOString();
    const updatedJob = {
      ...job,
      status: 'queued',
      workerState: 'spooled-with-owned-audio',
      reviewStatus: 'awaiting-render',
      publishingApproved: false,
      publishAllowed: false,
      providedAudio: {
        id: track.id,
        title: track.title,
        filename: track.filename,
        type: track.type,
        source: track.path,
        durationSeconds: track.durationSeconds,
        ownedBy: 'mmurphy',
        rights: 'user-supplied',
        assignedAt,
      },
      audioAssignedAt: assignedAt,
    };
    delete updatedJob.renderedMedia;
    delete updatedJob.renderedAt;
    delete updatedJob.error;
    delete updatedJob.qc;
    const dispatch = await sendCreatorTipReelToRyzen(updatedJob);
    updatedJob.spoolFilename = dispatch.filename;
    ledger.jobs[jobIndex] = updatedJob;
    ledger.updatedAt = assignedAt;
    await writeJson(creatorTipReelJobsFile, ledger);
    return send(res, 200, { job: updatedJob });
  }

  if (url.pathname === '/api/creator-tip-reels/queue' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const cadence = payload.cadence === 'weekly' ? 'weekly' : 'daily';
    const periodEnd = String(payload.publishDate || payload.throughDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) return send(res, 400, { error: 'Choose a valid reel date.' });
    const [queue, ledger] = await Promise.all([
      readJson(queueFile),
      readJson(creatorTipReelJobsFile).catch(() => ({ updatedAt: null, jobs: [] })),
    ]);
    const existing = (ledger.jobs || []).find((job) => job.cadence === cadence && job.periodEnd === periodEnd && !['failed', 'cancelled'].includes(job.status));
    if (existing) return send(res, 200, { duplicate: true, job: existing });
    let plan;
    try {
      plan = cadence === 'weekly' ? weeklyCreatorTipReelPlan(queue, periodEnd) : dailyCreatorTipReelPlan(queue, periodEnd);
    } catch (error) {
      return send(res, 409, { error: error.message });
    }
    if (cadence === 'weekly' && (plan.dailyPlanCount < 7 || plan.dailyPlanCount % 7 !== 0)) {
      return send(res, 409, { error: `A weekly reel unlocks after each complete seven-day block; ${plan.dailyPlanCount} complete day${plan.dailyPlanCount === 1 ? '' : 's'} are available.` });
    }
    const queuedAt = new Date().toISOString();
    const job = {
      id: randomUUID(),
      ...buildCreatorTipReelRyzenJobPayload(plan),
      status: 'sending',
      workerState: 'spooling',
      reviewStatus: 'awaiting-render',
      publishingApprovalRequired: true,
      publishingApproved: false,
      publishAllowed: false,
      queuedAt,
      scheduleGuard: {
        notBeforeAt: plan.notBeforeAt,
        reason: 'A reel cannot publish before all of its approved Story frames and source Daily Series covers existed.',
      },
      displayCasePrompt: plan.displayCasePrompt || '',
      collectionPrompts: plan.collectionPrompts || [],
    };
    if (cadence === 'weekly') {
      const completedDailyDates = new Set((ledger.jobs || [])
        .filter((entry) => entry.cadence === 'daily' && ['queued', 'processing', 'completed'].includes(entry.status))
        .map((entry) => entry.periodEnd));
      const missingDailyReels = plan.includedDates.filter((date) => !completedDailyDates.has(date));
      if (missingDailyReels.length) {
        return send(res, 409, { error: `Queue the daily reels first. Missing: ${missingDailyReels.join(', ')}.` });
      }
    }
    let dispatch;
    try {
      dispatch = await sendCreatorTipReelToRyzen(job);
    } catch (error) {
      job.status = 'failed';
      job.workerState = 'dispatch-failed';
      job.error = String(error.message || error).slice(0, 500);
      ledger.jobs = [job, ...(ledger.jobs || [])].slice(0, 500);
      ledger.updatedAt = queuedAt;
      await writeJson(creatorTipReelJobsFile, ledger);
      return send(res, 502, { error: error.message, job });
    }
    job.status = 'queued';
    job.workerState = 'spooled-awaiting-worker';
    job.spoolFilename = dispatch.filename;
    ledger.jobs = [job, ...(ledger.jobs || [])].slice(0, 500);
    ledger.updatedAt = queuedAt;
    await writeJson(creatorTipReelJobsFile, ledger);
    return send(res, 201, { duplicate: false, job });
  }

  const reelRenderedMatch = url.pathname.match(/^\/api\/creator-tip-reels\/([A-Za-z0-9-]{10,80})\/rendered$/);
  if (reelRenderedMatch && req.method === 'POST') {
    const payload = await bodyJson(req);
    const ledger = await readJson(creatorTipReelJobsFile).catch(() => ({ updatedAt: null, jobs: [] }));
    const job = (ledger.jobs || []).find((entry) => entry.id === reelRenderedMatch[1]);
    if (!job) return send(res, 404, { error: 'Reel job not found.' });
    const videoUrl = String(payload.videoUrl || '').trim().slice(0, 2000);
    const videoPath = String(payload.videoPath || '').trim().slice(0, 2000);
    if (!videoUrl && !videoPath) return send(res, 400, { error: 'A rendered reel video URL or path is required.' });
    const renderedAt = new Date().toISOString();
    job.renderedMedia = {
      filename: safeFilename(payload.filename || `${job.periodEnd}-${job.cadence}-creator-tips-reel.mp4`),
      type: 'video/mp4',
      url: videoUrl || null,
      path: videoPath || null,
      thumbnailUrl: String(payload.thumbnailUrl || '').trim().slice(0, 2000) || null,
      durationSeconds: Number.isFinite(Number(payload.durationSeconds)) ? Number(payload.durationSeconds) : null,
      renderedAt,
    };
    job.status = 'ready-for-review';
    job.workerState = 'rendered';
    job.reviewStatus = 'pending';
    job.publishingApproved = false;
    job.publishAllowed = false;
    job.renderedAt = renderedAt;
    delete job.error;
    ledger.updatedAt = renderedAt;
    await writeJson(creatorTipReelJobsFile, ledger);
    return send(res, 200, { job });
  }

  const reelReviewMatch = url.pathname.match(/^\/api\/creator-tip-reels\/([A-Za-z0-9-]{10,80})\/review$/);
  if (reelReviewMatch && req.method === 'POST') {
    const payload = await bodyJson(req);
    const action = payload.action === 'approve' ? 'approve' : payload.action === 'qc' ? 'qc' : '';
    if (!action) return send(res, 400, { error: 'Choose Approve or QC redo.' });
    const ledger = await readJson(creatorTipReelJobsFile).catch(() => ({ updatedAt: null, jobs: [] }));
    const job = (ledger.jobs || []).find((entry) => entry.id === reelReviewMatch[1]);
    if (!job) return send(res, 404, { error: 'Reel job not found.' });
    if (!job.renderedMedia?.url && !job.renderedMedia?.path) return send(res, 409, { error: 'The reel must finish rendering before review.' });
    const reviewedAt = new Date().toISOString();
    if (action === 'approve') {
      job.status = 'approved';
      job.reviewStatus = 'approved';
      job.publishingApproved = true;
      job.publishAllowed = true;
      job.approvedAt = reviewedAt;
      job.approvedBy = 'mmurphy';
      delete job.qc;
    } else {
      const allowedIssues = new Set(['audio', 'timing', 'video', 'text', 'page-turns', 'cover', 'other']);
      const issue = allowedIssues.has(payload.issue) ? payload.issue : 'other';
      job.status = 'needs-redo';
      job.workerState = 'review-returned';
      job.reviewStatus = 'qc-redo';
      job.publishingApproved = false;
      job.publishAllowed = false;
      job.qc = {
        issue,
        note: String(payload.note || '').trim().slice(0, 500),
        reviewedAt,
        reviewedBy: 'mmurphy',
      };
    }
    job.reviewedAt = reviewedAt;
    ledger.updatedAt = reviewedAt;
    await writeJson(creatorTipReelJobsFile, ledger);
    return send(res, 200, { job });
  }

  if (url.pathname === '/api/creator-tip-import/categories' && req.method === 'GET') {
    const queue = await readJson(queueFile);
    return send(res, 200, {
      categories: creatorTipCategoryInventory(queue.items || []),
      updatedAt: queue.updatedAt || null,
    });
  }

  if (url.pathname === '/api/affiliate-products' && req.method === 'GET') {
    const store = normalizeAffiliateStore(await readJson(affiliateProductsFile));
    const queue = await readJson(queueFile);
    const feedItems = (queue.items || []).filter((item) => item.format !== 'story' && !String(item.title || '').endsWith(' - Story'));
    const mappingPreview = Object.fromEntries(store.products.map((product) => {
      const matches = feedItems
        .map((item) => ({ item, match: affiliateProductMatch(product, item) }))
        .filter(({ match }) => match)
        .sort((left, right) => right.match.score - left.match.score || String(left.item.title).localeCompare(String(right.item.title)));
      return [product.id, {
        count: matches.length,
        posts: matches.slice(0, 16).map(({ item, match }) => ({
          id: item.id,
          title: item.title || 'Untitled post',
          target: item.target || '',
          status: item.status || 'draft',
          matchedPhrases: match.matchedPhrases,
        })),
      }];
    }));
    return send(res, 200, { ...store, mappingPreview });
  }

  if (url.pathname === '/api/affiliate-products' && req.method === 'POST') {
    const payload = await bodyJson(req);
    let product;
    try {
      product = normalizeAffiliateProduct(payload);
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
    const store = normalizeAffiliateStore(await readJson(affiliateProductsFile));
    const now = new Date().toISOString();
    const existing = store.products.find((entry) => entry.id === product.id || entry.url === product.url);
    const saved = {
      ...product,
      id: existing?.id || product.id || randomUUID(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    store.products = existing
      ? store.products.map((entry) => entry === existing ? saved : entry)
      : [...store.products, saved];
    store.disclosure = String(payload.disclosure || store.disclosure || DEFAULT_DISCLOSURE).trim().slice(0, 500) || DEFAULT_DISCLOSURE;
    store.updatedAt = now;
    await writeJson(affiliateProductsFile, store);
    return send(res, existing ? 200 : 201, { ...store, product: saved });
  }

  const affiliateProductRouteMatch = url.pathname.match(/^\/api\/affiliate-products\/([A-Za-z0-9-]{1,100})$/);
  if (affiliateProductRouteMatch && req.method === 'PATCH') {
    const payload = await bodyJson(req);
    const store = normalizeAffiliateStore(await readJson(affiliateProductsFile));
    const existing = store.products.find((product) => product.id === affiliateProductRouteMatch[1]);
    if (!existing) return send(res, 404, { error: 'Product link not found.' });
    const now = new Date().toISOString();
    const saved = normalizeAffiliateProduct({
      ...existing,
      active: payload.active === undefined ? existing.active : payload.active,
      approvalStatus: payload.approvalStatus || existing.approvalStatus,
      keywords: payload.keywords === undefined ? existing.keywords : payload.keywords,
      matchPhrases: payload.matchPhrases === undefined ? existing.matchPhrases : payload.matchPhrases,
      strictMatching: payload.strictMatching === undefined ? existing.strictMatching : payload.strictMatching,
    });
    Object.assign(saved, { createdAt: existing.createdAt || now, updatedAt: now });
    store.products = store.products.map((product) => product.id === existing.id ? saved : product);
    store.updatedAt = now;
    await writeJson(affiliateProductsFile, store);
    return send(res, 200, { ...store, product: saved });
  }

  if (affiliateProductRouteMatch && req.method === 'DELETE') {
    const store = normalizeAffiliateStore(await readJson(affiliateProductsFile));
    const before = store.products.length;
    store.products = store.products.filter((product) => product.id !== affiliateProductRouteMatch[1]);
    if (store.products.length === before) return send(res, 404, { error: 'Product link not found.' });
    store.updatedAt = new Date().toISOString();
    await writeJson(affiliateProductsFile, store);
    return send(res, 200, store);
  }

  if (url.pathname === '/api/affiliate-products/suggest' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const store = normalizeAffiliateStore(await readJson(affiliateProductsFile));
    const queue = payload.draftId ? await readJson(queueFile) : null;
    const draft = queue?.items?.find((item) => item.id === payload.draftId);
    return send(res, 200, {
      disclosure: store.disclosure,
      suggestions: affiliateProductSuggestions(store, { ...draft, ...payload }),
    });
  }

  if (url.pathname === '/api/affiliate-products/compose' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const store = normalizeAffiliateStore(await readJson(affiliateProductsFile));
    const requestedIds = [...new Set((Array.isArray(payload.productIds) ? payload.productIds : [payload.productId])
      .map((id) => String(id || ''))
      .filter(Boolean))];
    const products = requestedIds.map((id) => store.products.find((entry) => entry.id === id
      && entry.active
      && entry.approvalStatus === 'approved')).filter(Boolean);
    if (!products.length || products.length !== requestedIds.length) {
      return send(res, 404, { error: 'One or more product links are not approved, active, or no longer exist.' });
    }
    return send(res, 200, {
      body: appendAffiliateProducts(payload.body, products, store.disclosure),
      product: products[0],
      products,
      disclosure: store.disclosure,
    });
  }

  if (url.pathname === '/api/creator-tip-import/preview' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const csvText = String(payload.csvText || payload.csv || '');
    if (!csvText.trim()) return send(res, 400, { error: 'Choose a CSV file before previewing it.' });
    const queue = await readJson(queueFile);
    const analysis = analyzeCreatorTipCsv({
      csvText,
      filename: safeFilename(payload.filename || 'creator-tips.csv'),
      fallbackCategory: payload.fallbackCategory || '',
      queueItems: queue.items || [],
    });
    return send(res, 200, {
      ...analysis,
      rows: analysis.rows.slice(0, 30).map((row) => ({
        rowNumber: row.rowNumber,
        category: row.category,
        categoryNumber: row.categoryNumber,
        globalTipNumber: row.globalTipNumber,
        title: row.title,
        body: row.body,
      })),
      duplicates: analysis.duplicates.slice(0, 30),
      errors: analysis.errors.slice(0, 30),
    });
  }

  if (url.pathname === '/api/creator-tip-import/commit' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const csvText = String(payload.csvText || payload.csv || '');
    if (!csvText.trim()) return send(res, 400, { error: 'Choose a CSV file before importing it.' });
    const queue = await readJson(queueFile);
    const analysis = analyzeCreatorTipCsv({
      csvText,
      filename: safeFilename(payload.filename || 'creator-tips.csv'),
      fallbackCategory: payload.fallbackCategory || '',
      queueItems: queue.items || [],
    });
    if (!analysis.accepted) {
      return send(res, analysis.errorCount ? 400 : 409, {
        error: analysis.errorCount ? 'No rows could be imported. Fix the CSV errors and preview it again.' : 'Every row in this CSV is already in Social Desk.',
        analysis: { accepted: 0, duplicateCount: analysis.duplicateCount, errorCount: analysis.errorCount, errors: analysis.errors.slice(0, 30) },
      });
    }
    const requestedTarget = String(payload.target || 'both');
    const targets = requestedTarget === 'matthew-page'
      ? ['matthew-page']
      : requestedTarget === 'matthew-profile'
        ? ['matthew-profile']
        : ['matthew-page', 'matthew-profile'];
    const drafts = buildCreatorTipImportDrafts(analysis, { targets });
    queue.items = [...drafts, ...(queue.items || [])];
    queue.updatedAt = new Date().toISOString();
    await writeJson(queueFile, queue);
    return send(res, 201, {
      importedRows: analysis.accepted,
      createdDrafts: drafts.length,
      target: requestedTarget,
      duplicateCount: analysis.duplicateCount,
      errorCount: analysis.errorCount,
      categories: analysis.categories,
      globalTipStart: analysis.globalTipStart,
      globalTipEnd: analysis.globalTipEnd,
      drafts: drafts.slice(0, 12).map((draft) => ({ id: draft.id, title: draft.title, target: draft.target, scheduledFor: draft.scheduledFor })),
    });
  }

  if (url.pathname === '/api/media-pairs/qc' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const targetIds = Array.isArray(payload.ids) ? payload.ids.map(String).filter(Boolean) : [];
    const note = String(payload.note || '').trim();
    if (!targetIds.length) return send(res, 400, { error: 'No media pair was selected.' });
    if (!note) return send(res, 400, { error: 'Choose at least one QC reason or add a specific correction.' });
    const queue = await readJson(queueFile);
    const linkedDrafts = queue.items.filter((entry) => targetIds.includes(String(entry.id)));
    const feedDraft = linkedDrafts.find((entry) => entry.format !== 'story');
    if (!feedDraft) return send(res, 404, { error: 'Media pair not found.' });
    const storyDraft = linkedDrafts.find((entry) => entry.format === 'story') || feedDraft;
    const updatedAt = new Date().toISOString();
    const review = {
      state: 'redo',
      note,
      preserveMedia: true,
      reason: 'qc-note',
      updatedAt,
    };
    feedDraft.imageReview = withQueueImageReviewRole(feedDraft, 'feed', review);
    storyDraft.imageReview = withQueueImageReviewRole(storyDraft, 'story', review);
    const touchedDrafts = [...new Set([feedDraft, storyDraft])];
    for (const entry of touchedDrafts) {
      entry.mediaApproval = null;
      entry.scheduledFor = null;
      entry.status = 'draft';
      entry.updatedAt = updatedAt;
      delete entry.approvedAt;
      delete entry.facebookHandoff;
    }
    normalizeCreatorTipScheduling(queue, new Date());
    await writeJson(queueFile, queue);
    return send(res, 200, {
      qc: touchedDrafts.length,
      roles: ['feed', 'story'],
      items: queue.items.filter((entry) => targetIds.includes(String(entry.id))),
    });
  }

  if (url.pathname === '/api/media-pairs/approve' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const targetIds = Array.isArray(payload.ids) ? payload.ids.map(String).filter(Boolean) : [];
    if (!targetIds.length) return send(res, 400, { error: 'No media pair was selected.' });
    const queue = await readJson(queueFile);
    const linkedDrafts = queue.items.filter((entry) => targetIds.includes(String(entry.id)));
    const feedDrafts = linkedDrafts.filter((entry) => entry.format !== 'story');
    if (!feedDrafts.length) return send(res, 404, { error: 'Media pair not found.' });
    const score = (entry) => {
      const roles = (Array.isArray(entry.media) ? entry.media : []).map(queueMediaRoleName);
      return Number(roles.includes('feed') || roles.includes('video')) + Number(roles.includes('story') || roles.includes('video'));
    };
    const primaryFeed = [...feedDrafts].sort((left, right) => score(right) - score(left))[0];
    const primaryMedia = Array.isArray(primaryFeed.media) ? primaryFeed.media : [];
    const feedMediaList = primaryMedia.filter((media) => ['feed', 'video'].includes(queueMediaRoleName(media)));
    const feedMedia = feedMediaList[0];
    const collectionDraft = feedDrafts.some(isCreatorTipCoverCollectionDraft);
    const storyDrafts = linkedDrafts.filter((entry) => entry.format === 'story');
    const storyHolder = storyDrafts.find((entry) => (entry.media || []).some((media) => ['story', 'video'].includes(queueMediaRoleName(media)))) || primaryFeed;
    const storyMedia = (storyHolder.media || []).find((media) => ['story', 'video'].includes(queueMediaRoleName(media)) && !isDailySetCoverMedia(media));
    const needsStory = feedDrafts.some(requiresStoryCompanion);
    if (!feedMedia) return send(res, 409, { error: 'This pair still needs its Landscape image.' });
    if (collectionDraft && (feedMediaList.length < 3 || feedMediaList.length > 4)) {
      return send(res, 409, { error: 'A collection photo dump needs three or four approved images.' });
    }
    if (needsStory && !storyMedia) return send(res, 409, { error: 'This pair still needs its Story image.' });
    if (queueImageReviewForRole(primaryFeed, 'feed') || (needsStory && queueImageReviewForRole(storyHolder, 'story'))) {
      return send(res, 409, { error: 'Clear the redo flag before approving this pair.' });
    }
    const approvedAt = new Date().toISOString();
    const ensureRole = (media, role, source) => {
      if (!source) return media;
      const roles = media.map(queueMediaRoleName);
      const roleFound = role === 'feed'
        ? roles.includes('feed') || roles.includes('video')
        : roles.includes('story') || roles.includes('video');
      return roleFound ? media : [...media, { ...source, role }];
    };
    for (const feedDraft of feedDrafts) {
      let media = Array.isArray(feedDraft.media) ? [...feedDraft.media] : [];
      media = ensureRole(media, 'feed', feedMedia);
      if (needsStory) media = ensureRole(media, 'story', storyMedia);
      feedDraft.media = media;
      feedDraft.imageReview = null;
      if (['draft', 'approved', 'dispatched'].includes(feedDraft.status)) {
        feedDraft.status = 'approved';
        feedDraft.approvedAt ||= approvedAt;
      }
      feedDraft.mediaApproval = {
        ...(feedDraft.mediaApproval || {}),
        feedApprovedAt: approvedAt,
        storyApprovedAt: approvedAt,
        hiddenAt: approvedAt,
      };
      const issueCover = primaryMedia.find(isDailySetCoverMedia)
        || (feedDraft.media || []).find(isDailySetCoverMedia)
        || (storyHolder.media || []).find(isDailySetCoverMedia);
      if (issueCover) syncCreatorTipIssueCoverStories(queue, feedDraft, issueCover, { approve: true });
      feedDraft.updatedAt = approvedAt;
    }
    for (const storyDraft of storyDrafts) {
      let media = Array.isArray(storyDraft.media) ? [...storyDraft.media] : [];
      media = ensureRole(media, 'story', storyMedia);
      storyDraft.media = media;
      storyDraft.imageReview = null;
      if (['draft', 'approved', 'dispatched'].includes(storyDraft.status)) {
        storyDraft.status = 'approved';
        storyDraft.approvedAt ||= approvedAt;
      }
      storyDraft.mediaApproval = {
        ...(storyDraft.mediaApproval || {}),
        storyApprovedAt: approvedAt,
      };
      storyDraft.updatedAt = approvedAt;
    }
    normalizeCreatorTipScheduling(queue, new Date());
    await writeJson(queueFile, queue);
    return send(res, 200, {
      approved: linkedDrafts.length,
      items: queue.items.filter((entry) => targetIds.includes(String(entry.id))),
    });
  }

  if (url.pathname === '/api/daily-set-cover/qc' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const publishDate = String(payload.publishDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) return send(res, 400, { error: 'Choose a valid Daily Series date.' });
    const queue = await readJson(queueFile);
    const issueItems = queue.items.filter((item) => item.format !== 'story' && isCreatorTipItem(item)
      && imageStyleFamilyForItem(item)?.publishDate === publishDate);
    if (!issueItems.length) return send(res, 404, { error: 'Daily Series not found.' });
    const issueStories = queue.items.filter((item) => item.format === 'story'
      && String(item.source || '').startsWith(`creator-tip-issue:${publishDate}:`));
    const protectedStory = issueStories.find((item) => ['dispatched', 'scheduled', 'published'].includes(item.status)
      || item.facebookHandoff?.facebookConfirmed);
    if (protectedStory) {
      return send(res, 409, { error: 'This cover already reached Facebook. Cancel its Facebook Story schedule before replacing it.' });
    }
    const updatedAt = new Date().toISOString();
    const note = String(payload.note || 'Daily Series cover: wrong image.').trim();
    let removed = 0;
    for (const item of [...issueItems, ...issueStories]) {
      const media = Array.isArray(item.media) ? item.media : [];
      const nextMedia = media.filter((entry) => !isDailySetCoverMedia(entry));
      removed += media.length - nextMedia.length;
      item.media = nextMedia;
      item.updatedAt = updatedAt;
      if (item.format === 'story') {
        item.imageReview = withQueueImageReviewRole(item, 'story', {
          state: 'redo',
          note,
          preserveMedia: false,
          reason: 'qc-daily-cover',
          updatedAt,
        });
        item.mediaApproval = null;
        item.status = 'draft';
        delete item.approvedAt;
        delete item.facebookHandoff;
      }
    }
    if (!removed) return send(res, 409, { error: 'This Daily Series does not have a cover attached.' });
    queue.updatedAt = updatedAt;
    await writeJson(queueFile, queue);
    return send(res, 200, {
      publishDate,
      removed,
      preservedPairApprovals: issueItems.filter((item) => item.mediaApproval?.hiddenAt).length,
      coverRequired: true,
    });
  }

  if (url.pathname === '/api/media-pairs/redo' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const targetIds = Array.isArray(payload.ids) ? payload.ids.map(String).filter(Boolean) : [];
    if (!targetIds.length) return send(res, 400, { error: 'No media pair was selected.' });
    const queue = await readJson(queueFile);
    const linkedDrafts = queue.items.filter((entry) => targetIds.includes(String(entry.id)));
    if (!linkedDrafts.length) return send(res, 404, { error: 'Media pair not found.' });
    const updatedAt = new Date().toISOString();
    for (const entry of linkedDrafts) {
      entry.media = [];
      entry.scheduledFor = null;
      entry.status = 'draft';
      entry.facebookHandoff = null;
      entry.mediaApproval = null;
      const roles = entry.format === 'story'
        ? ['story']
        : (requiresStoryCompanion(entry) ? ['feed', 'story'] : ['feed']);
      entry.imageReview = queueImageReviewStateForRoles(roles, 'cleared and sent back for redo', updatedAt);
      entry.updatedAt = updatedAt;
    }
    normalizeCreatorTipScheduling(queue, new Date());
    await writeJson(queueFile, queue);
    return send(res, 200, {
      reset: linkedDrafts.length,
      items: queue.items.filter((entry) => targetIds.includes(String(entry.id))),
    });
  }

  const itemMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)$/);
  if (itemMatch && req.method === 'PATCH') {
    const payload = await bodyJson(req);
    const queue = await readJson(queueFile);
    const item = queue.items.find((entry) => entry.id === itemMatch[1]);
    if (!item) return send(res, 404, { error: 'Draft not found' });
    const completedMediaRole = ['feed', 'story'].includes(payload.completedMediaRole) ? payload.completedMediaRole : null;
    if (completedMediaRole) {
      const completedMediaFilename = String(payload.completedMediaFilename || '');
      const verifiedMedia = Array.isArray(payload.media)
        ? payload.media.find((media) => queueMediaRoleName(media) === completedMediaRole && String(media.filename || '') === completedMediaFilename)
        : null;
      if (!verifiedMedia) return send(res, 409, { error: `Saved ${completedMediaRole} media could not be verified.` });
    }
    if (payload.scheduledFor !== undefined && item.scheduleGuard?.notBeforeAt) {
      const requested = Date.parse(String(payload.scheduledFor || ''));
      const notBefore = Date.parse(String(item.scheduleGuard.notBeforeAt || ''));
      if (Number.isFinite(requested) && Number.isFinite(notBefore) && requested < notBefore) {
        return send(res, 409, { error: item.scheduleGuard.reason || 'This post cannot be scheduled before its source media existed.' });
      }
    }
    const previousHiddenAt = item.mediaApproval?.hiddenAt || null;
    for (const key of [
      'title', 'body', 'target', 'format', 'scheduledFor', 'source', 'notes', 'media',
      'imageReview', 'campaign', 'mediaApproval', 'imagePrompt', 'storyImagePrompt',
      'storyPromo', 'sourceTitle', 'sourceUrl', 'approvedAt',
    ]) {
      if (payload[key] !== undefined) item[key] = (key === 'body' || key === 'title') ? normalizeHumanPostText(payload[key]) : payload[key];
    }
    if (completedMediaRole) item.imageReview = withQueueImageReviewRole(item, completedMediaRole, null);
    for (const key of ['archiveRotation', 'creatorGuidance', 'facebookHandoff', 'mediaVariant', 'collectionPhotoDump', 'scheduleGuard', 'storyMode']) {
      if (payload[key] !== undefined) item[key] = payload[key];
    }
    if (payload.tagTargets !== undefined) item.tagTargets = normalizeTagTargets(payload.tagTargets);
    if (['draft', 'approved', 'rejected', 'scheduled', 'published'].includes(payload.status)) item.status = payload.status;
    const issueCover = (item.media || []).find(isDailySetCoverMedia);
    if (issueCover && isCreatorTipItem(item)) syncCreatorTipIssueCoverStories(queue, item, issueCover, { approve: Boolean(item.mediaApproval?.hiddenAt) });
    item.updatedAt = new Date().toISOString();
    if (isCreatorTipItem(item)) normalizeCreatorTipScheduling(queue, new Date());
    await writeJson(queueFile, queue);
    return send(res, 200, item);
  }

  const rebuildCtaMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/rebuild-cta$/);
  if (rebuildCtaMatch && req.method === 'POST') {
    const queue = await readJson(queueFile);
    const item = queue.items.find((entry) => entry.id === rebuildCtaMatch[1]);
    if (!item) return send(res, 404, { error: 'Draft not found' });
    if (!['audience-insight:posting-gap', 'audience-insight:missing-pinned-post'].includes(item.source)) return send(res, 409, { error: 'This draft is not a rebuildable audience CTA' });
    let refreshError = '';
    try { await refreshAudienceReviewFromRyzen(true); }
    catch (error) { refreshError = error.message; }
    const audience = await readJson(audienceFile);
    const rebuiltAt = new Date().toISOString();
    item.tagTargets = item.source === 'audience-insight:missing-pinned-post'
      ? rebuildPinnedPostCtaTargets(item, audience, 12)
      : rebuildCtaTargets(item, audience, 20);
    if (item.source === 'audience-insight:posting-gap') {
      item.body = normalizeHumanPostText(postingGapAccountabilityBody(item.tagTargets.length));
      item.storyMode = 'disabled';
    }
    item.ctaRebuild = {
      rebuiltAt,
      audienceImportedAt: audience.importedAt || null,
      selectedTargets: item.tagTargets.length,
      sourcePeople: Array.isArray(audience.people) ? audience.people.length : 0,
      refreshState: refreshError ? 'latest-local-fallback' : 'ryzen-refreshed',
      refreshError,
    };
    item.notes = item.source === 'audience-insight:missing-pinned-post'
      ? `CTA rebuilt at ${rebuiltAt} from trusted public creator scans with no observed pinned-post label. Keep the wording invitational; absence is not definitive proof.${refreshError ? ` Ryzen was unavailable, so the latest local scan was used: ${refreshError}` : ''}`
      : `CTA rebuilt at ${rebuiltAt} after requesting fresh Ryzen profile scans. This accountability post stays feed-only, prefers up to 20 exact creators, and focuses on creators with no fresh visible post inside the last two days while still acknowledging some may have been quiet longer.${refreshError ? ` Ryzen was unavailable, so the latest local scan was used: ${refreshError}` : ''}`;
    item.updatedAt = rebuiltAt;
    await writeJson(queueFile, queue);
    return send(res, 200, item);
  }

  const relabelTipMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/relabel-tip-variant$/);
  if (relabelTipMatch && req.method === 'POST') {
    return send(res, 409, {
      error: 'Renumbering an existing Creator Tip is disabled. Create a genuinely new tip or wait for the 90-day reuse lock to expire.',
    });
  }

  if (url.pathname === '/api/uploads' && req.method === 'POST') {
    const filename = safeFilename(req.headers['x-filename'] || 'upload.bin');
    const itemId = String(req.headers['x-item-id'] || 'unassigned').replace(/[^a-zA-Z0-9-]/g, '');
    const role = ['feed', 'story', 'video'].includes(req.headers['x-media-role']) ? req.headers['x-media-role'] : 'feed';
    const result = await streamToRyzen(req, itemId, filename, String(req.headers['content-type'] || 'application/octet-stream'), role);
    return send(res, 201, result);
  }

  if (url.pathname === '/api/clipboard-image' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const queue = await readJson(queueFile);
    const item = queue.items.find((entry) => entry.id === String(payload.itemId || ''));
    if (!item) return send(res, 404, { error: 'Draft not found' });
    const clipboard = await readMacClipboardImage();
    const filename = `clipboard-${Date.now()}.${clipboard.extension}`;
    const role = clipboard.height > clipboard.width ? 'story' : 'feed';
    const target = role === 'story' ? storyCompanionFor(queue, item) || item : parentPostFor(queue, item) || item;
    const uploaded = await streamToRyzen(Readable.from(clipboard.buffer), target.id, filename, clipboard.type, role);
    target.media = [...(target.media || []), uploaded];
    target.imageReview = withQueueImageReviewRole(target, role, null);
    target.updatedAt = new Date().toISOString();
    await writeJson(queueFile, queue);
    return send(res, 201, { ...uploaded, draftId: target.id });
  }

  if (url.pathname === '/api/media' && req.method === 'GET') {
    const path = String(url.searchParams.get('path') || '');
    const type = String(url.searchParams.get('type') || 'application/octet-stream');
    const thumb = url.searchParams.get('thumb') === '1';
    const normalizedPath = normalize(path);
    if (normalizedPath.startsWith(`${localGeneratedMediaDir}/`)) {
      try {
        const file = await readFile(normalizedPath);
        res.writeHead(200, {
          'Content-Type': type || mime[extname(normalizedPath)] || 'application/octet-stream',
          'Cache-Control': 'private, no-cache, max-age=0',
        });
        return res.end(file);
      } catch {
        return send(res, 404, { error: 'Media not found' });
      }
    }
    if (!normalizedPath.startsWith(`${ryzenMedia}/`) && !normalizedPath.startsWith(`${ryzenCreatorTipReelRoot}/`)) return send(res, 403, { error: 'Invalid media path' });
    if (thumb && /^image\//i.test(type)) {
      try {
        const thumbPath = mediaThumbPath(normalizedPath);
        await stat(thumbPath);
        const file = await readFile(thumbPath);
        res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=86400' });
        return res.end(file);
      } catch (error) {
        warmRyzenImageThumbnail(normalizedPath).catch((thumbError) => console.warn(`Thumbnail warm failed for ${normalizedPath}: ${thumbError.message}`));
      }
    }
    return streamFromRyzen(res, normalizedPath, type);
  }

  const dispatchMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/dispatch$/);
  if (dispatchMatch && req.method === 'POST') {
    try {
      return send(res, 200, await dispatchApprovedDraft(dispatchMatch[1], { approve: true }));
    } catch (error) {
      return send(res, /not found/i.test(error.message) ? 404 : /waiting|cannot be approved/i.test(error.message) ? 409 : 502, { error: error.message });
    }
  }

  const campaignHandoffMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/campaign-handoff$/);
  if (campaignHandoffMatch && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      return send(res, 200, await prepareCreatorTipCampaignHandoff(campaignHandoffMatch[1], {
        commitPage: payload.commitPage !== false,
        targets: payload.targets || 'both',
      }));
    } catch (error) {
      return send(res, /not found/i.test(error.message) ? 404 : /missing|not approved|not sendable|numbered Creator Tip/i.test(error.message) ? 409 : 502, { error: error.message });
    }
  }

  if (url.pathname === '/api/creator-tip-campaign-push' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      return send(res, 200, await pushCreatorTipCampaignRange({
        start: payload.start || 1,
        end: payload.end || 49,
        commitPage: payload.commitPage !== false,
        targets: payload.targets || 'both',
        exportMedia: payload.exportMedia !== false,
      }));
    } catch (error) {
      return send(res, /missing|not approved|not sendable|numbered Creator Tip/i.test(error.message) ? 409 : 502, { error: cleanMetaError(error) });
    }
  }

  const facebookPageApiScheduleMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/facebook-page-api-schedule$/);
  if (facebookPageApiScheduleMatch && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      return send(res, 200, await scheduleFacebookPageDraftViaMetaApi(facebookPageApiScheduleMatch[1], {
        approve: payload.approve !== false,
        dryRun: payload.dryRun === true || url.searchParams.get('dryRun') === '1',
        scheduledFor: payload.scheduledFor || null,
      }));
    } catch (error) {
      return send(res, /not found/i.test(error.message) ? 404 : /missing|invalid|configured|approved|future|dry-run|sendable|supports/i.test(error.message) ? 409 : 502, { error: cleanMetaError(error) });
    }
  }

  if (url.pathname === '/api/publishing/schedule-approved-page' && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      return send(res, 200, await scheduleApprovedFacebookPageBacklog({
        limit: payload.limit || 250,
        concurrency: payload.concurrency || 4,
      }));
    } catch (error) {
      return send(res, 502, { error: cleanMetaError(error) });
    }
  }

  const campaignMediaExportMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/campaign-media-export$/);
  if (campaignMediaExportMatch && req.method === 'POST') {
    try {
      const payload = await bodyJson(req);
      return send(res, 200, await exportCreatorTipCampaignMedia(campaignMediaExportMatch[1], { targets: payload.targets || 'both' }));
    } catch (error) {
      return send(res, /not found/i.test(error.message) ? 404 : /missing|not exportable|numbered Creator Tip/i.test(error.message) ? 409 : 502, { error: error.message });
    }
  }

  if (url.pathname === '/api/import-analysis' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const posts = Array.isArray(payload.posts) ? payload.posts : [];
    const hours = new Map();
    const formats = new Map();
    let excludedPinned = 0;
    for (const post of posts) {
      const pinned = post.pinned === true || post.isPinned === true || String(post.status || '').toLowerCase() === 'pinned';
      if (pinned) { excludedPinned += 1; continue; }
      const date = new Date(post.timestamp || post.createdAt || 0);
      if (!Number.isNaN(date.valueOf())) {
        const hour = date.getHours();
        const ageDays = Math.max(1, (Date.now() - date.valueOf()) / 86400000);
        const engagement = Number(post.score || post.reactions || 0) + Number(post.comments || 0) * 2 + Number(post.shares || 0) * 3;
        const score = engagement / Math.sqrt(ageDays);
        const row = hours.get(hour) || { hour, posts: 0, score: 0 };
        row.posts += 1; row.score += score; hours.set(hour, row);
      }
      const format = String(post.format || post.type || 'feed').toLowerCase();
      const row = formats.get(format) || { format, posts: 0 };
      row.posts += 1; formats.set(format, row);
    }
    const analytics = {
      importedAt: new Date().toISOString(),
      posts: posts.length,
      analyzedPosts: posts.length - excludedPinned,
      excludedPinned,
      scoring: 'Engagement normalized by post age; pinned posts excluded.',
      bestHours: [...hours.values()].map(x => ({ ...x, average: x.posts ? Math.round(x.score / x.posts) : 0 })).sort((a, b) => b.average - a.average).slice(0, 6),
      formats: [...formats.values()].sort((a, b) => b.posts - a.posts),
    };
    await writeJson(analyticsFile, analytics);
    return send(res, 200, analytics);
  }

  if (url.pathname === '/api/import-audience' && req.method === 'POST') {
    const payload = await bodyJson(req);
    const followers = Array.isArray(payload.followers) ? payload.followers : [];
    const engagements = Array.isArray(payload.engagements) ? payload.engagements : [];
    const coverage = payload.coverage && typeof payload.coverage === 'object' ? payload.coverage : {};
    const existing = await readJson(audienceFile);
    const priorPeople = new Map((existing.people || []).map((person) => [person.key, person]));
    const priorById = new Map((existing.people || []).map((person) => [String(person.id || facebookIdFromUrl(person.url || '')).replace(/\D/g, ''), person]).filter(([id]) => id));
    const priorByUrl = new Map((existing.people || []).map((person) => [canonicalFacebookUrl(person.url || ''), person]).filter(([profileUrl]) => profileUrl));
    const priorByUnlinkedName = new Map((existing.people || []).filter((person) => !person.id && !canonicalFacebookUrl(person.url || '')).map((person) => [String(person.name || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' '), person]));
    const people = new Map();
    const keyFor = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
    const priorPersonFor = (entry, fallbackKey) => {
      const id = String(entry?.id || facebookIdFromUrl(entry?.url || '')).replace(/\D/g, '');
      const profileUrl = canonicalFacebookUrl(entry?.url || '');
      const nameKey = keyFor(entry?.name);
      return priorPeople.get(fallbackKey) || (id && priorById.get(id)) || (profileUrl && priorByUrl.get(profileUrl)) || (!id && !profileUrl && nameKey && priorByUnlinkedName.get(nameKey)) || null;
    };
    for (const follower of followers) {
      const name = String(follower.name || '').trim();
      const incomingKey = keyFor(follower.id || follower.url || name);
      if (!incomingKey || !name) continue;
      const prior = priorPersonFor(follower, incomingKey) || {};
      const key = prior.key || incomingKey;
      people.set(key, { ...prior, key, id: follower.id || prior.id || '', url: follower.url || prior.url || '', name, followedAt: follower.timestamp || prior.followedAt || null, events: [], decision: prior.decision || 'undecided', monitoringStartedAt: prior.monitoringStartedAt || new Date().toISOString(), firstMarkedAt: prior.firstMarkedAt || null, reviewMarkedAt: prior.reviewMarkedAt || null });
    }
    for (const event of engagements) {
      const name = String(event.name || '').trim();
      const incomingKey = keyFor(event.id || event.url || name);
      if (!incomingKey || !name) continue;
      const prior = priorPersonFor(event, incomingKey) || {};
      const key = prior.key || incomingKey;
      const person = people.get(key) || { ...prior, key, id: event.id || prior.id || '', url: event.url || prior.url || '', name, followedAt: prior.followedAt || null, events: [], decision: prior.decision || 'undecided', monitoringStartedAt: prior.monitoringStartedAt || new Date().toISOString(), firstMarkedAt: prior.firstMarkedAt || null, reviewMarkedAt: prior.reviewMarkedAt || null };
      person.events.push({ type: String(event.type || 'reaction'), timestamp: event.timestamp || null, post: String(event.post || '').slice(0, 240) });
      people.set(key, person);
    }
    for (const prior of priorPeople.values()) {
      if (prior.decision !== 'removed' || people.has(prior.key)) continue;
      people.set(prior.key, { ...prior, events: [] });
    }
    const weights = { reaction: 2, like: 2, comment: 6, share: 9, mention: 4 };
    const now = Date.now();
    const scored = [...people.values()].map((person) => {
      let score = 0; let recentEvents = 0; let lastEngagedAt = null;
      const counts = { reactions: 0, comments: 0, shares: 0, mentions: 0 };
      for (const event of person.events) {
        const type = event.type.toLowerCase();
        const timestamp = new Date(event.timestamp || 0).valueOf();
        const ageDays = timestamp > 0 ? Math.max(0, (now - timestamp) / 86400000) : 730;
        const recency = Math.pow(0.5, ageDays / 180);
        score += (weights[type] || 1) * recency;
        if (ageDays <= 365) recentEvents += 1;
        if (timestamp > new Date(lastEngagedAt || 0).valueOf()) lastEngagedAt = new Date(timestamp).toISOString();
        if (type === 'comment') counts.comments += 1;
        else if (type === 'share') counts.shares += 1;
        else if (type === 'mention') counts.mentions += 1;
        else counts.reactions += 1;
      }
      const roundedScore = Math.round(score * 10) / 10;
      let tier = 'monitoring';
      let reason = 'Baseline saved; waiting for enough observed incoming-engagement history.';
      let firstMarkedAt = person.firstMarkedAt || null;
      let reviewMarkedAt = person.reviewMarkedAt || null;
      const monitoringDays = Math.max(0, Math.floor((now - new Date(person.monitoringStartedAt || now).valueOf()) / 86400000));
      if (person.events.length > 0 && (roundedScore >= 8 || counts.comments + counts.shares >= 2)) { tier = 'engaged'; reason = 'Repeated or high-intent engagement was found.'; firstMarkedAt = null; reviewMarkedAt = null; }
      else if (person.events.length > 0) { tier = 'light'; reason = 'Some engagement was found, but it is limited or old.'; firstMarkedAt = null; reviewMarkedAt = null; }
      else if (coverage.hasFollowerRoster && coverage.hasIncomingEngagement && monitoringDays >= 30) { tier = 'review'; reason = `No incoming engagement observed for ${monitoringDays} days.`; firstMarkedAt ||= new Date(now).toISOString(); reviewMarkedAt ||= new Date(now).toISOString(); }
      else if (coverage.hasFollowerRoster && coverage.hasIncomingEngagement && monitoringDays >= 15) { tier = 'first-mark'; reason = `First mark: no incoming engagement observed for ${monitoringDays} days.`; firstMarkedAt ||= new Date(now).toISOString(); }
      return { ...person, ...counts, score: roundedScore, recentEvents, lastEngagedAt, tier, reason, monitoringDays, firstMarkedAt, reviewMarkedAt, eventCount: person.events.length, events: undefined };
    }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    const summary = {
      total: scored.length,
      followers: followers.length,
      engaged: scored.filter((person) => ['engaged', 'light'].includes(person.tier)).length,
      coreEngaged: scored.filter((person) => person.tier === 'engaged').length,
      light: scored.filter((person) => person.tier === 'light').length,
      monitoring: scored.filter((person) => person.tier === 'monitoring').length,
      firstMark: scored.filter((person) => person.tier === 'first-mark').length,
      review: scored.filter((person) => person.tier === 'review').length,
      unknown: scored.filter((person) => person.tier === 'unknown').length,
    };
    const importedAt = new Date().toISOString();
    const priorKeys = new Set((existing.people || []).map((person) => person.key));
    const currentKeys = new Set(scored.map((person) => person.key));
    const rosterIsComplete = coverage.rosterIsComplete === true;
    const changes = {
      newFollowers: scored.filter((person) => !priorKeys.has(person.key)).map(compactPerson),
      possibleUnfollows: rosterIsComplete ? (existing.people || []).filter((person) => !currentKeys.has(person.key)).map(compactPerson) : [],
      comparisonSafe: rosterIsComplete,
      note: rosterIsComplete ? 'Compared against a complete follower roster.' : 'Partial roster: missing names are not treated as unfollows.',
    };
    const audience = { importedAt, coverage: { ...coverage, rosterIsComplete }, summary, changes, people: scored };
    reconcileFollowerRemovalJobs(audience, await readJson(followerRemovalJobsFile));
    await writeJson(audienceFile, audience);
    await writeJson(join(audienceSnapshotsDir, `${importedAt.replace(/[:.]/g, '-')}.json`), { importedAt, coverage: audience.coverage, summary, changes, people: scored.map(compactPerson) });
    return send(res, 200, audience);
  }

  const audienceMatch = url.pathname.match(/^\/api\/audience\/([^/]+)$/);
  if (audienceMatch && req.method === 'GET') {
    const audience = await readJson(audienceFile);
    const person = audience.people.find((entry) => entry.key === decodeURIComponent(audienceMatch[1]));
    return person ? send(res, 200, person) : send(res, 404, { error: 'Audience member not found' });
  }

  const audienceAvatarMatch = url.pathname.match(/^\/api\/audience-avatar\/([^/]+)$/);
  if (audienceAvatarMatch && req.method === 'GET') {
    const audience = await readJson(audienceFile);
    const person = audience.people.find((entry) => entry.key === decodeURIComponent(audienceAvatarMatch[1]));
    if (!person) return send(res, 404, { error: 'Audience member not found' });
    try {
      const avatar = await fetchAudienceAvatar(person);
      res.writeHead(200, { 'Content-Type': avatar.type, 'Cache-Control': 'private, max-age=86400' });
      return res.end(avatar.buffer);
    } catch (error) {
      return send(res, 404, { error: String(error.message || error).slice(0, 300) });
    }
  }
  if (audienceMatch && req.method === 'PATCH') {
    const payload = await bodyJson(req);
    const audience = await readJson(audienceFile);
    const person = audience.people.find((entry) => entry.key === decodeURIComponent(audienceMatch[1]));
    if (!person) return send(res, 404, { error: 'Audience member not found' });
    const previousDecision = person.decision || 'undecided';
    const previousRiskDisposition = person.riskDisposition || 'pending';
    if (['undecided', 'keep', 'candidate', 'removed', 'blocked-minor'].includes(payload.decision)) person.decision = payload.decision;
    if (payload.id !== undefined) person.id = String(payload.id || '').replace(/[^0-9]/g, '').slice(0, 32);
    if (payload.url !== undefined) person.url = String(payload.url || '').slice(0, 500);
    if (payload.manualNote !== undefined) person.manualNote = String(payload.manualNote || '').slice(0, 1000);
    if (payload.manualReason !== undefined) person.manualReason = String(payload.manualReason || '').slice(0, 100);
    if (payload.keepLocked !== undefined) person.keepLocked = payload.keepLocked === true;
    if (['pending', 'retrying', 'verified', 'closer-review', 'memorial-review', 'memorialized', 'minor-review', 'minor-blocked'].includes(payload.profileState)) person.profileState = payload.profileState;
    if (payload.unblockEligibleAt !== undefined) person.unblockEligibleAt = /^\d{4}-\d{2}-\d{2}T/.test(String(payload.unblockEligibleAt || '')) ? String(payload.unblockEligibleAt).slice(0, 40) : null;
    if (person.profileState === 'memorialized') { person.keepLocked = true; person.decision = 'keep'; }
    if (person.profileState === 'minor-blocked') { person.keepLocked = true; person.decision = 'blocked-minor'; person.manualReason = 'under-18'; }
    const reviewedAt = new Date().toISOString();
    if (['pending', 'ignored', 'removal-review'].includes(payload.riskDisposition)) {
      const riskDisposition = payload.riskDisposition;
      const signalSnapshot = audienceRiskSignals(person).slice(0, 20).map((signal) => ({
        code: signal.code,
        label: signal.label,
        domain: signal.domain || '',
        url: signal.url || '',
        excerpt: signal.excerpt || '',
      }));
      person.riskDisposition = riskDisposition;
      person.riskReviewedAt = reviewedAt;
      person.riskSignalsAtReview = signalSnapshot;
      person.riskHistory = [
        ...(Array.isArray(person.riskHistory) ? person.riskHistory : []),
        { from: previousRiskDisposition, to: riskDisposition, recordedAt: reviewedAt, signals: signalSnapshot },
      ].slice(-20);
      if (riskDisposition === 'removal-review' && !person.keepLocked && person.decision !== 'removed' && person.decision !== 'blocked-minor') {
        person.decision = 'candidate';
        person.manualReason = 'risk-signal';
      }
      if (riskDisposition !== 'removal-review' && person.decision === 'candidate' && person.manualReason === 'risk-signal') {
        person.decision = 'undecided';
        person.manualReason = '';
      }
    }
    const removalMethods = new Set(['facebook-manual-confirmed', 'facebook-remove-follower', 'facebook-block', 'facebook-block-unblock']);
    if (person.decision === 'removed' && previousDecision !== 'removed') {
      const method = removalMethods.has(payload.removalMethod) ? payload.removalMethod : 'facebook-manual-confirmed';
      eachAudienceIdentityMatch(audience, person, (candidate) => {
        candidate.decision = 'removed';
        candidate.removedAt = reviewedAt;
        candidate.removalMethod = method;
        candidate.restoredAt = null;
        candidate.removalHistory = [
          ...(Array.isArray(candidate.removalHistory) ? candidate.removalHistory : []),
          { type: 'removed', recordedAt: reviewedAt, method, url: exactAudienceUrl(candidate) },
        ].slice(-20);
      });
    } else if (previousDecision === 'removed' && person.decision !== 'removed') {
      eachAudienceIdentityMatch(audience, person, (candidate) => {
        candidate.removalHistory = [
          ...(Array.isArray(candidate.removalHistory) ? candidate.removalHistory : []),
          { type: 'restored', recordedAt: reviewedAt, method: 'manual-restore', url: exactAudienceUrl(candidate) },
        ].slice(-20);
        candidate.decision = person.decision || 'undecided';
        candidate.removedAt = null;
        candidate.removalMethod = null;
        candidate.removalJobId = null;
        candidate.removalAutomationState = null;
        candidate.restoredAt = reviewedAt;
      });
    }
    person.reviewedAt = reviewedAt;
    await writeJson(audienceFile, audience);
    return send(res, 200, person);
  }

  return send(res, 404, { error: 'Unknown endpoint' });
}

function compactPerson(person) {
  return { key: person.key, name: person.name, tier: person.tier, score: person.score, lastEngagedAt: person.lastEngagedAt || null, decision: person.decision || 'undecided' };
}

function compactAudienceProfileObservationForDesk(observation = {}) {
  return {
    checkedAt: observation?.checkedAt || null,
    coverPhotoAvailable: observation?.coverPhotoAvailable === true,
    lastPostAt: observation?.lastPostAt || null,
    latestVisiblePost: observation?.latestVisiblePost ? {
      postedAt: observation.latestVisiblePost.postedAt || null,
      displayDate: observation.latestVisiblePost.displayDate || '',
      url: observation.latestVisiblePost.url || '',
      pinned: observation.latestVisiblePost.pinned === true,
    } : null,
  };
}

function compactAudienceFactSummary(person = {}) {
  const observation = person?.profileObservation || {};
  const publicFacts = observation?.publicFacts || person?.publicFacts || {};
  const category = String(publicFacts?.category || '').trim();
  const employment = String(publicFacts?.employment || '').trim().toLowerCase();
  const relationshipStatus = String(publicFacts?.relationshipStatus || '').trim().toLowerCase();
  const gender = String(publicFacts?.gender || '').trim().toLowerCase();
  const entityType = observation?.entityType === 'page' ? 'page' : observation?.entityType === 'profile' ? 'profile' : 'unknown';
  const creator = /\b(?:digital creator|content creator|blogger|public figure)\b/i.test(category);
  return {
    type: entityType === 'page' ? 'business' : creator ? 'creator' : person?.url ? 'personal' : 'unknown',
    entityType,
    category,
    country: String(publicFacts?.country || '').trim(),
    location: String(publicFacts?.location || publicFacts?.city || '').trim(),
    work: String(publicFacts?.work || '').trim(),
    birthDate: String(publicFacts?.birthDate || person?.facebookBirthday?.birthDate || '').trim(),
    age: Number.isFinite(Number(publicFacts?.age)) ? Number(publicFacts.age) : (Number.isFinite(Number(person?.facebookBirthday?.age)) ? Number(person.facebookBirthday.age) : null),
    gender: /female/.test(gender) ? 'female' : /male/.test(gender) ? 'male' : /non.?binary/.test(gender) ? 'non-binary' : '',
    relationshipStatus: relationshipStatus.includes('in a relationship') ? 'relationship' : relationshipStatus.includes('engaged') ? 'engaged' : relationshipStatus.includes('married') ? 'married' : relationshipStatus.includes('complicated') ? 'complicated' : relationshipStatus.includes('separated') ? 'separated' : relationshipStatus.includes('divorced') ? 'divorced' : relationshipStatus.includes('widowed') ? 'widowed' : relationshipStatus.includes('single') ? 'single' : '',
    employment: employment.includes('self') || employment.includes('owner') ? 'self-employed' : employment.includes('student') ? 'student' : employment.includes('retired') ? 'retired' : employment.includes('home') ? 'homemaker' : employment.includes('unemployed') ? 'unemployed' : employment ? 'employed' : '',
    verified: person?.verified === true,
    verificationObserved: person?.verifiedObserved === true,
    mutualFriends: Number(person?.mutualFriends || 0),
    mutualFriendsObserved: person?.mutualFriendsObserved === true,
    linkState: Array.isArray(person?.riskSignals) && person.riskSignals.some((signal) => String(signal?.kind || '') === 'link')
      ? 'review'
      : 'unknown',
    socialCounts: {
      followers: Number.isFinite(observation?.socialCounts?.followers) ? observation.socialCounts.followers : null,
      following: Number.isFinite(observation?.socialCounts?.following) ? observation.socialCounts.following : null,
      friends: Number.isFinite(observation?.socialCounts?.friends) ? observation.socialCounts.friends : null,
    },
    friendsPublic: observation?.friendsPublic === true,
    checkinsObserved: Number.isFinite(observation?.checkinsObserved) ? observation.checkinsObserved : null,
    reviewsGivenObserved: Number.isFinite(observation?.reviewsGivenObserved) ? observation.reviewsGivenObserved : null,
    reelsVisible: Number.isFinite(publicFacts?.reelsVisible) ? publicFacts.reelsVisible : null,
    photosVisible: Number.isFinite(publicFacts?.photosVisible) ? publicFacts.photosVisible : null,
    albumsVisible: Number.isFinite(publicFacts?.albumsVisible) ? publicFacts.albumsVisible : null,
    profilePicturesVisible: publicFacts?.profilePicturesVisible === true,
    coverPhotosVisible: publicFacts?.coverPhotosVisible === true,
    bio: String(publicFacts?.bio || '').trim(),
  };
}

function compactAudiencePersonForDesk(person = {}) {
  return {
    key: person.key,
    name: person.name,
    originalExportName: person.originalExportName || '',
    tier: person.tier,
    score: person.score,
    engagementScore: Number(person.engagementScore || person.score || 0),
    engagementLevel: person.engagementLevel || '',
    engagementPosts: Number(person.engagementPosts || 0),
    uniquePosts: Number(person.uniquePosts || 0),
    lastEngagedAt: person.lastEngagedAt || null,
    decision: person.decision || 'undecided',
    reason: person.reason || '',
    id: person.id || '',
    url: person.url || '',
    avatar: person.avatar || '',
    friend: person.friend === true,
    keepLocked: person.keepLocked === true,
    profileState: person.profileState || '',
    profileRetryCount: Number(person.profileRetryCount || 0),
    profileNextRetryAt: person.profileNextRetryAt || null,
    activityObserverRevision: person.activityObserverRevision || '',
    activityReviewState: person.activityReviewState || '',
    followState: person.followState || '',
    followedAt: person.followedAt || null,
    firstMarkedAt: person.firstMarkedAt || null,
    reviewMarkedAt: person.reviewMarkedAt || null,
    monitoringStartedAt: person.monitoringStartedAt || null,
    lastConfirmedFollowerAt: person.lastConfirmedFollowerAt || null,
    identityState: person.identityState || '',
    identitySource: person.identitySource || '',
    mentions: Number(person.mentions || 0),
    comments: Number(person.comments || 0),
    reactions: Number(person.reactions || 0),
    shares: Number(person.shares || 0),
    messages: Number(person.messages || 0),
    commentLikes: Number(person.commentLikes || 0),
    legitComments: Number(person.legitComments || 0),
    eventCount: Number(person.eventCount || 0),
    verified: person.verified === true,
    verifiedObserved: person.verifiedObserved === true,
    verifiedObservedAt: person.verifiedObservedAt || null,
    mutualFriends: Number(person.mutualFriends || 0),
    mutualFriendsObserved: person.mutualFriendsObserved === true,
    mutualFriendsObservedAt: person.mutualFriendsObservedAt || null,
    archiveSubtitle: person.archiveSubtitle || '',
    facebookBirthday: person.facebookBirthday ? {
      date: person.facebookBirthday.date || '',
      age: Number.isFinite(person.facebookBirthday.age) ? person.facebookBirthday.age : null,
      monthDay: person.facebookBirthday.monthDay || '',
      source: person.facebookBirthday.source || '',
    } : null,
    profileObservation: compactAudienceProfileObservationForDesk(person.profileObservation || {}),
    factSummary: compactAudienceFactSummary(person),
    riskDisposition: person.riskDisposition || 'pending',
    riskSignals: Array.isArray(person.riskSignals)
      ? person.riskSignals.slice(0, 12).map((signal) => ({
          code: signal?.code || '',
          label: signal?.label || '',
          domain: signal?.domain || '',
          url: signal?.url || '',
          excerpt: signal?.excerpt || '',
        }))
      : [],
    removedAt: person.removedAt || null,
    removalAutomationState: person.removalAutomationState || '',
    manualNote: person.manualNote || '',
    manualReason: person.manualReason || '',
  };
}

function audienceFilterMatches(person = {}, filter = 'all') {
  const engagementScore = Number(person?.engagementScore || person?.score || 0);
  const hasLink = Boolean(person?.id || person?.url);
  const birthdayAge = Number(person?.facebookBirthday?.age);
  const minor = person?.decision === 'blocked-minor'
    || person?.profileState === 'minor-blocked'
    || (Number.isFinite(birthdayAge) && birthdayAge > 0 && birthdayAge < 18);
  if (filter === 'engaged') return Number(person?.eventCount || 0) > 0 || Boolean(person?.lastEngagedAt);
  if (filter === 'top-engager') return engagementScore >= 30 || person?.engagementLevel === 'top-engager';
  if (filter === 'consistent') return ['consistent', 'top-engager'].includes(String(person?.engagementLevel || ''));
  if (filter === 'linked') return hasLink;
  if (filter === 'unlinked') return !hasLink;
  if (filter === 'minor') return minor;
  if (filter === 'memorial') return ['memorial-review', 'memorialized'].includes(String(person?.profileState || ''));
  if (filter === 'candidate') return person?.decision === 'candidate';
  if (filter === 'removed') return person?.decision === 'removed';
  if (filter === 'warning') {
    const disposition = String(person?.riskDisposition || 'pending');
    const signals = Array.isArray(person?.riskSignals) ? person.riskSignals.length : 0;
    return disposition === 'removal-review' || (disposition !== 'ignored' && signals > 0);
  }
  return true;
}

async function buildScanProgressSummary() {
  const revision = 'multi-post-v4-shared-post-safe';
  const audience = await readJson(audienceFile);
  const hourly = new Map();
  let scannable = 0;
  let processed = 0;
  for (const person of audience.people || []) {
    const profileUrl = String(person.url || '');
    if (!(person.id || profileUrl) || profileUrl.includes('/groups/') || person.decision === 'removed') continue;
    scannable += 1;
    if (person.activityObserverRevision !== revision) continue;
    processed += 1;
    const timestamp = Date.parse(person.profileObservation?.checkedAt || person.checkedAt || '');
    if (!Number.isFinite(timestamp)) continue;
    const hour = Math.floor(timestamp / 3600000) * 3600000;
    hourly.set(hour, (hourly.get(hour) || 0) + 1);
  }
  let cumulative = 0;
  const history = [...hourly.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, count]) => ({
      timestamp: new Date(timestamp).toISOString(),
      processed: cumulative += count,
    }));
  if (history.length === 1) {
    history.unshift({
      timestamp: new Date(Date.parse(history[0].timestamp) - 3600000).toISOString(),
      processed: 0,
    });
  }
  const remaining = Math.max(0, scannable - processed);
  const rosterTotal = Number(audience.summary?.followers || audience.summary?.total || (audience.people || []).length || 0);
  return {
    revision,
    processed,
    remaining,
    scannable,
    rosterTotal,
    unlinked: Math.max(0, rosterTotal - scannable),
    rosterIsComplete: audience.coverage?.rosterIsComplete === true,
    liveCapturedAt: audience.coverage?.liveCapturedAt || null,
    percentage: scannable ? Math.round((processed / scannable) * 1000) / 10 : 0,
    history,
    generatedAt: new Date().toISOString(),
  };
}

async function buildAudienceReports() {
  const files = (await readdir(audienceSnapshotsDir).catch(() => [])).filter((name) => name.endsWith('.json')).sort();
  const snapshots = await Promise.all(files.map((name) => readJson(join(audienceSnapshotsDir, name))));
  const current = await readJson(audienceFile);
  if (!snapshots.some((snapshot) => snapshot.importedAt === current.importedAt) && current.importedAt) snapshots.push(current);
  const windows = [
    ['daily', 1],
    ['weekly', 7],
    ['biweekly', 14],
    ['monthly', 30],
  ];
  const now = Date.now();
  const reports = Object.fromEntries(windows.map(([label, days]) => {
    const candidates = snapshots.filter((snapshot) => now - new Date(snapshot.importedAt || 0).valueOf() <= days * 86400000);
    const first = candidates[0] || snapshots.at(-1) || current;
    const latest = candidates.at(-1) || snapshots.at(-1) || current;
    return [label, {
      days,
      from: first?.importedAt || null,
      to: latest?.importedAt || null,
      snapshots: candidates.length,
      roster: latest?.summary?.followers || 0,
      rosterChange: Number(latest?.summary?.followers || 0) - Number(first?.summary?.followers || 0),
      newFollowers: candidates.reduce((sum, snapshot) => sum + Number(snapshot.changes?.newFollowers?.length || 0), 0),
      possibleUnfollows: candidates.reduce((sum, snapshot) => sum + Number(snapshot.changes?.possibleUnfollows?.length || 0), 0),
      firstMarks: latest?.summary?.firstMark || 0,
      reviewMarks: latest?.summary?.review || 0,
      engaged: latest?.summary?.engaged || 0,
      comparisonSafe: candidates.every((snapshot) => snapshot.coverage?.rosterIsComplete === true),
    }];
  }));
  return { generatedAt: new Date().toISOString(), totalSnapshots: snapshots.length, reports };
}

const activeDraftDispatches = new Set();
let facebookScheduleCommitTail = Promise.resolve();
const HOURLY_PAGE_STORY_RUNWAY_HOURS = 24;
const HOURLY_PAGE_STORY_REFRESH_MS = 5 * 60 * 1000;
let hourlyPageStoryLastPlannedAt = 0;
let hourlyPageStoryPlanningPromise = null;

function serializeFacebookScheduleCommit(callback) {
  const commit = facebookScheduleCommitTail.then(callback, callback);
  facebookScheduleCommitTail = commit.catch(() => {});
  return commit;
}

async function ensureHourlyPageStories({ force = false, now = new Date() } = {}) {
  if (!force && Date.now() - hourlyPageStoryLastPlannedAt < HOURLY_PAGE_STORY_REFRESH_MS) {
    return { skipped: true, reason: 'runway-recently-checked' };
  }
  if (hourlyPageStoryPlanningPromise) return hourlyPageStoryPlanningPromise;
  hourlyPageStoryPlanningPromise = serializeFacebookScheduleCommit(async () => {
    const queue = await readJson(queueFile);
    const dailySeriesResult = ensureRecurringPageDailySeries(queue, { now, createId: randomUUID });
    const plannableItems = (queue.items || []).filter((item) => item.format === 'story' || !queueImageReviewForRole(item, 'story'));
    const plan = buildHourlyPageStoryPlan(plannableItems, {
      now,
      hours: HOURLY_PAGE_STORY_RUNWAY_HOURS,
    });
    if (plan.assignments.length) {
      const createdAt = now.toISOString();
      for (const assignment of plan.assignments) {
        const source = assignment.source;
        const dailySeries = assignment.dailySeries || null;
        queue.items.push({
          id: randomUUID(),
          parentId: source.id,
          title: `${String(source.title || 'Creator Story').replace(/\s+-\s+Story$/i, '')} - Story`,
          body: '',
          target: 'matthew-page',
          format: 'story',
          status: 'approved',
          scheduledFor: assignment.scheduledFor,
          source: dailySeries
            ? `daily-series-story:${dailySeries.key}:position-${dailySeries.position}:${assignment.scheduledFor}`
            : `hourly-story:${source.id}`,
          notes: dailySeries
            ? 'Approved Story from the date-scoped fan-page Daily Series. The same validated 12-item set runs twice per rolling 24 hours; the profile source rows and feed cadence are unchanged.'
            : 'Approved vertical artwork in the rolling hourly Story lane. One image posts at the top of each hour after its source Page post has Facebook confirmation.',
          media: [{ ...assignment.media, role: 'story' }],
          mediaApproval: {
            storyApprovedAt: source.mediaApproval?.storyApprovedAt || source.mediaApproval?.hiddenAt || createdAt,
            hiddenAt: source.mediaApproval?.hiddenAt || createdAt,
          },
          approvedAt: source.mediaApproval?.storyApprovedAt || source.mediaApproval?.hiddenAt || createdAt,
          approvalRequired: false,
          publishToFacebook: true,
          captionMode: 'none',
          hourlyStory: {
            cadence: 'one-per-hour',
            targetPerRollingDay: HOURLY_PAGE_STORY_RUNWAY_HOURS,
            sourceDraftId: source.id,
            sourceScheduledFor: source.scheduledFor || null,
            plannedAt: createdAt,
            ...(dailySeries ? {
              dailySeriesKey: dailySeries.key,
              dailySeriesPosition: dailySeries.position,
              dailySeriesTipNumber: dailySeries.tipNumber,
              dailySeriesAnchorAt: dailySeries.anchorAt,
              dailySeriesSequenceIndex: dailySeries.sequenceIndex,
            } : {}),
          },
          createdAt,
          updatedAt: createdAt,
        });
      }
      queue.updatedAt = createdAt;
    }
    if (dailySeriesResult.changed || plan.assignments.length) await writeJson(queueFile, queue);
    hourlyPageStoryLastPlannedAt = Date.now();
    return {
      skipped: false,
      targetPerRollingDay: plan.targetPerRollingDay,
      occupied: plan.occupied,
      created: plan.created,
      shortage: plan.shortage,
      dailySeries: dailySeriesResult,
    };
  }).finally(() => {
    hourlyPageStoryPlanningPromise = null;
  });
  return hourlyPageStoryPlanningPromise;
}

function personalSocialDestination(item) {
  if (item.target === 'matthew-page') {
    return { platform: 'facebook-page', pageId: '968473109678168', publicProfileId: '61586176289229', label: 'Matthew Murphy : Built Not Begged' };
  }
  if (item.target === 'matthew-profile') {
    return { platform: 'facebook-profile', profileSlug: 'xmatthewxmurphyx', label: 'Matthew Murphy Personal Profile' };
  }
  return { platform: 'facebook-page', pageId: '1172674669269415', label: 'Credit Repair Choices' };
}

function cleanMetaError(error) {
  const source = error?.message || error?.error?.message || String(error || 'Meta rejected the schedule request.');
  return String(source)
    .replace(/access_token=[^&\s]+/gi, 'access_token=[hidden]')
    .replace(/EA[A-Za-z0-9_-]{20,}/g, '[hidden-token]')
    .slice(0, 500);
}

function graphApiVersionFromEnv(env = {}) {
  const requested = String(env.CPH_GRAPH_VERSION || env.FACEBOOK_GRAPH_VERSION || 'v20.0').trim();
  return /^v\d+\.\d+$/i.test(requested) ? requested : 'v20.0';
}

async function facebookPageApiConfig(item = {}) {
  const env = await readRyzenPersonalSocialEnv();
  const destination = personalSocialDestination(item);
  const pageId = String(env.CPH_PERSONAL_PAGE_ID || env.CPH_FACEBOOK_PAGE_ID || destination.pageId || '').trim();
  const pageToken = String(env.CPH_PERSONAL_PAGE_TOKEN || env.CPH_FACEBOOK_PAGE_TOKEN || env.FACEBOOK_ACCESS_TOKEN || '').trim();
  const dryRunEnabled = String(env.CPH_PERSONAL_SOCIAL_DRY_RUN || '1') !== '0';
  return {
    destination,
    graphVersion: graphApiVersionFromEnv(env),
    pageId,
    pageToken,
    dryRunEnabled,
    tokenConfigured: Boolean(pageToken),
    pageIdConfigured: Boolean(pageId),
  };
}

async function facebookScheduledPostsAudit() {
  const config = await facebookPageApiConfig({ target: 'matthew-page' });
  if (!config.pageIdConfigured || !config.tokenConfigured) throw new Error('The Built Not Begged Page API credentials are not configured.');
  const posts = [];
  let nextUrl = `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.pageId)}/scheduled_posts?fields=id,message,scheduled_publish_time&limit=100&access_token=${encodeURIComponent(config.pageToken)}`;
  for (let page = 0; nextUrl && page < 6; page += 1) {
    const payload = await metaGraphJson(nextUrl);
    posts.push(...(Array.isArray(payload?.data) ? payload.data : []));
    nextUrl = String(payload?.paging?.next || '');
  }
  const queue = await readJson(queueFile);
  const byGraphId = new Map((queue.items || [])
    .filter((item) => item.target === 'matthew-page' && item.facebookHandoff?.graphId)
    .map((item) => [String(item.facebookHandoff.graphId), item]));
  const matched = posts.map((post) => {
    const graphId = String(post?.id || '');
    const item = byGraphId.get(graphId) || (queue.items || []).find((candidate) => candidate.target === 'matthew-page'
      && candidate.format !== 'story'
      && Math.abs(Date.parse(candidate.scheduledFor || 0) / 1000 - Number(post?.scheduled_publish_time || 0)) < 2
      && normalizeHumanPostText(candidate.body || candidate.title) === normalizeHumanPostText(post?.message || ''));
    return {
      graphId,
      scheduledFor: Number(post?.scheduled_publish_time || 0) > 0 ? new Date(Number(post.scheduled_publish_time) * 1000).toISOString() : null,
      draftId: item?.id || '',
      tipNumber: creatorTipNumberFromItem(item || {}) || null,
      title: item?.title || '',
    };
  });
  const slotCounts = new Map();
  for (const post of matched) {
    if (!post.scheduledFor) continue;
    slotCounts.set(post.scheduledFor, (slotCounts.get(post.scheduledFor) || 0) + 1);
  }
  return {
    checkedAt: new Date().toISOString(),
    pageId: config.pageId,
    pageName: config.destination.label,
    metaScheduledCount: posts.length,
    matchedDrafts: matched.filter((post) => post.draftId).length,
    unmatched: matched.filter((post) => !post.draftId),
    duplicateSlots: [...slotCounts.entries()].filter(([, count]) => count > 1).map(([scheduledFor, count]) => ({ scheduledFor, count })),
    posts: matched,
  };
}

function normalizedFacebookGraphId(value = '') {
  return String(value || '').trim().split('_').at(-1) || '';
}

async function deduplicateFacebookScheduledPosts() {
  const audit = await facebookScheduledPostsAudit();
  const config = await facebookPageApiConfig({ target: 'matthew-page' });
  const queue = await readJson(queueFile);
  const queueByDraftId = new Map((queue.items || []).filter((item) => item.id).map((item) => [item.id, item]));
  const groups = new Map();
  for (const post of audit.posts) {
    if (!post.draftId) continue;
    if (!groups.has(post.draftId)) groups.set(post.draftId, []);
    groups.get(post.draftId).push(post);
  }
  const keepByDraftId = new Map();
  const duplicates = [];
  for (const [draftId, posts] of groups) {
    const localGraphId = normalizedFacebookGraphId(queueByDraftId.get(draftId)?.facebookHandoff?.graphId);
    const keep = posts.find((post) => normalizedFacebookGraphId(post.graphId) === localGraphId) || posts[0];
    keepByDraftId.set(draftId, keep);
    duplicates.push(...posts.filter((post) => post.graphId !== keep.graphId));
  }

  const results = new Array(duplicates.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < duplicates.length) {
      const index = cursor;
      cursor += 1;
      const post = duplicates[index];
      try {
        const deleteUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(post.graphId)}`);
        deleteUrl.searchParams.set('access_token', config.pageToken);
        const response = await fetch(deleteUrl, { method: 'DELETE', headers: { accept: 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.error || payload?.success !== true) throw new Error(payload?.error?.message || `Meta delete failed (${response.status}).`);
        results[index] = { ok: true, graphId: post.graphId, draftId: post.draftId };
      } catch (error) {
        results[index] = { ok: false, graphId: post.graphId, draftId: post.draftId, error: cleanMetaError(error) };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, duplicates.length || 1) }, () => worker()));

  const confirmedAt = new Date().toISOString();
  for (const [draftId, keep] of keepByDraftId) {
    const item = queueByDraftId.get(draftId);
    if (!item) continue;
    item.status = 'scheduled';
    item.dispatchError = '';
    item.facebookHandoff = {
      ...(item.facebookHandoff || {}),
      state: 'page-api-scheduled',
      facebookConfirmed: true,
      scheduleClicked: true,
      confirmedAt: item.facebookHandoff?.confirmedAt || confirmedAt,
      scheduledFor: item.scheduledFor,
      graphId: keep.graphId,
      sourceUrl: `https://www.facebook.com/${encodeURIComponent(keep.graphId)}`,
    };
    item.updatedAt = confirmedAt;
  }
  queue.updatedAt = confirmedAt;
  await writeJson(queueFile, queue);
  return {
    before: audit.metaScheduledCount,
    uniqueDrafts: groups.size,
    duplicateObjects: duplicates.length,
    removed: results.filter((result) => result?.ok).length,
    failed: results.filter((result) => !result?.ok),
  };
}

function facebookGraphPostUrl(pageId, payload = {}) {
  const postId = String(payload?.post_id || payload?.id || '').trim();
  if (postId) return `https://www.facebook.com/${encodeURIComponent(postId)}`;
  return `https://www.facebook.com/professional_dashboard/content/content_library/?filter=SCHEDULED&asset_id=${encodeURIComponent(pageId)}`;
}

async function upsertScheduledContentProof(proof = {}) {
  const now = new Date().toISOString();
  const ledger = await readJson(scheduledContentLedgerFile).catch(() => ({ updatedAt: null, sourceUrl: null, emptyState: null, items: [] }));
  const items = Array.isArray(ledger.items) ? ledger.items : [];
  const key = String(proof.key || '').trim() || createHash('sha256').update(`${proof.draftId || ''}|${proof.scheduledFor || ''}|${proof.graphId || ''}`).digest('hex').slice(0, 20);
  const normalized = {
    key,
    title: String(proof.title || 'Facebook scheduled post').replace(/\s+/g, ' ').trim().slice(0, 240),
    scheduledFor: new Date(proof.scheduledFor).toISOString(),
    sourceUrl: String(proof.sourceUrl || '').slice(0, 1000),
    observedAt: now,
    source: proof.source || 'meta-page-api',
    target: proof.target || 'matthew-page',
    draftId: proof.draftId || '',
    graphId: proof.graphId || '',
  };
  const withoutDuplicate = items.filter((item) => {
    if (item?.key && item.key === normalized.key) return false;
    if (normalized.draftId && item?.draftId === normalized.draftId) return false;
    return true;
  });
  withoutDuplicate.push(normalized);
  withoutDuplicate.sort((left, right) => (Date.parse(left.scheduledFor || 0) || 0) - (Date.parse(right.scheduledFor || 0) || 0));
  await writeJson(scheduledContentLedgerFile, {
    ...ledger,
    updatedAt: now,
    sourceUrl: ledger.sourceUrl || 'https://www.facebook.com/professional_dashboard/content/content_library/?filter=SCHEDULED',
    emptyState: false,
    rawCount: withoutDuplicate.length,
    items: withoutDuplicate,
  });
  return normalized;
}

function publishingMetricNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function publishingMetricText(value, limit = 5000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function publishingMetricTargetLabel(target) {
  return personalSocialDestination({ target }).label || publishingMetricText(target, 160);
}

function scheduledLedgerMatchForItem(item, scheduledItems = []) {
  const draftMatch = (scheduledItems || []).find((entry) => entry?.draftId && entry.draftId === item.id);
  if (draftMatch) return draftMatch;
  const planned = new Date(item?.scheduledFor || 0).valueOf();
  if (!Number.isFinite(planned)) return null;
  return (scheduledItems || []).find((entry) => {
    const scheduled = new Date(entry?.scheduledFor || 0).valueOf();
    if (!Number.isFinite(scheduled) || Math.abs(scheduled - planned) >= 90_000) return false;
    if (entry?.target && item?.target && entry.target !== item.target) return false;
    return publishingMetricText(entry?.title, 240).toLowerCase().includes(publishingMetricText(item?.title, 64).toLowerCase())
      || publishingMetricText(item?.title, 240).toLowerCase().includes(publishingMetricText(entry?.title, 64).toLowerCase());
  }) || null;
}

async function currentDestinationFollowerSnapshot(target, audience, { allowGraph = false } = {}) {
  const observedAt = new Date().toISOString();
  if (target === 'matthew-profile') {
    const followerCount = publishingMetricNumber(audience?.summary?.followers ?? audience?.summary?.total);
    return {
      target,
      label: publishingMetricTargetLabel(target),
      currentFollowers: followerCount,
      currentFollowerSource: followerCount === null ? 'unavailable' : 'captured-follower-roster',
      observedAt,
      support: 'aggregate-only',
    };
  }
  const destination = personalSocialDestination({ target });
  if (!allowGraph || destination.platform !== 'facebook-page') {
    return {
      target,
      label: destination.label,
      currentFollowers: null,
      currentFollowerSource: 'waiting-for-page-refresh',
      observedAt,
      support: 'aggregate-only',
    };
  }
  try {
    const config = await facebookPageApiConfig({ target });
    if (!config.pageIdConfigured || !config.tokenConfigured) {
      return {
        target,
        label: destination.label,
        currentFollowers: null,
        currentFollowerSource: 'page-api-not-configured',
        observedAt,
        support: 'aggregate-only',
      };
    }
    const payload = await metaGraphJson(`https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.pageId)}?fields=id,name,followers_count,fan_count&access_token=${encodeURIComponent(config.pageToken)}`);
    return {
      target,
      label: String(payload?.name || destination.label || '').trim() || destination.label,
      currentFollowers: publishingMetricNumber(payload?.followers_count ?? payload?.fan_count),
      currentFollowerSource: 'meta-page-api',
      observedAt,
      support: 'aggregate-only',
    };
  } catch (error) {
    return {
      target,
      label: destination.label,
      currentFollowers: null,
      currentFollowerSource: `page-api-error:${cleanMetaError(error)}`,
      observedAt,
      support: 'aggregate-only',
    };
  }
}

async function fetchFacebookPostPerformance(graphId, target) {
  if (!graphId) return null;
  const config = await facebookPageApiConfig({ target });
  if (!config.pageIdConfigured || !config.tokenConfigured) return null;
  const fields = [
    'permalink_url',
    'created_time',
    'reactions.limit(0).summary(true)',
    'comments.limit(0).summary(true)',
    'shares',
  ].join(',');
  const payload = await metaGraphJson(`https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(graphId)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(config.pageToken)}`);
  return {
    postUrl: String(payload?.permalink_url || '').trim(),
    observedAt: new Date().toISOString(),
    metrics: {
      reactions: publishingMetricNumber(payload?.reactions?.summary?.total_count) || 0,
      comments: publishingMetricNumber(payload?.comments?.summary?.total_count) || 0,
      shares: publishingMetricNumber(payload?.shares?.count) || 0,
    },
    source: 'meta-page-api',
  };
}

let pageGroupDistributionRefreshPromise = null;

async function queuePublishedPagePostsForGroupApproval({ limit = 1, now = new Date() } = {}) {
  if (pageGroupDistributionRefreshPromise) return pageGroupDistributionRefreshPromise;
  pageGroupDistributionRefreshPromise = (async () => {
    const [queue, storedGroupLedger, scheduledLedger] = await Promise.all([
      readJson(queueFile),
      readJson(pageGroupDistributionFile),
      readJson(scheduledContentLedgerFile).catch(() => ({ items: [] })),
    ]);
    let groupLedger = storedGroupLedger;
    const queued = [];
    const skipped = [];
    let changed = false;
    for (const group of groupLedger.groups || []) {
      if (group.groupId === DEFAULT_PAGE_GROUP.groupId && group.autoApprovePublishedPosts === undefined) {
        group.autoApprovePublishedPosts = true;
        changed = true;
      }
    }
    const maximum = Math.min(10, Math.max(1, Number(limit) || 1));
    const candidates = (queue.items || [])
      .filter((item) => item.target === 'matthew-page' && item.format !== 'story')
      .filter((item) => !isCreatorTipItem(item))
      .filter((item) => ['scheduled', 'published'].includes(item.status))
      .filter((item) => Date.parse(item.scheduledFor || 0) <= now.getTime() - 5 * 60_000)
      .filter((item) => hasVerifiedFacebookScheduleProof(item))
      .sort((left, right) => Date.parse(right.scheduledFor || 0) - Date.parse(left.scheduledFor || 0));

    for (const item of candidates) {
      if (queued.length >= maximum) break;
      const sourceKey = `page-draft:${item.id}`;
      const scheduled = scheduledLedgerMatchForItem(item, scheduledLedger.items || []) || {};
      const proof = verifiedOwnedFacebookProof(item, {}, scheduled);
      if (!proof.graphId) {
        skipped.push({ draftId: item.id, reason: 'missing-graph-id' });
        continue;
      }
      const live = await fetchFacebookPostPerformance(proof.graphId, item.target).catch(() => null);
      const sourcePostUrl = canonicalFacebookUrl(live?.postUrl || '');
      if (!sourcePostUrl) {
        skipped.push({ draftId: item.id, reason: 'not-live-on-facebook' });
        continue;
      }
      const existing = (groupLedger.items || []).find((entry) => entry.sourceKey === sourceKey);
      if (existing) {
        if (existing.status === 'needs-approval' && existing.sourcePostUrl !== sourcePostUrl) {
          existing.sourcePostUrl = sourcePostUrl;
          existing.updatedAt = now.toISOString();
          groupLedger.updatedAt = now.toISOString();
          changed = true;
          skipped.push({ draftId: item.id, reason: 'repaired-existing-source-url', itemId: existing.id });
        } else {
          skipped.push({ draftId: item.id, reason: 'already-queued', itemId: existing.id });
        }
        continue;
      }
      const result = queuePageGroupDistribution(groupLedger, {
        sourceKey,
        sourcePostUrl,
        title: item.title,
        body: item.body,
        scheduledFor: now.toISOString(),
      }, now);
      groupLedger = result.ledger;
      queued.push(...result.queued.map((entry) => ({ ...entry, draftId: item.id })));
      changed ||= result.queued.length > 0;
      skipped.push(...result.skipped.map((entry) => ({ ...entry, draftId: item.id })));
    }
    if (changed) await writeJson(pageGroupDistributionFile, groupLedger);
    return {
      checkedAt: now.toISOString(),
      candidates: candidates.length,
      queued: queued.length,
      skipped,
      items: queued,
      summary: pageGroupDistributionSummary(groupLedger, now),
    };
  })().finally(() => {
    pageGroupDistributionRefreshPromise = null;
  });
  return pageGroupDistributionRefreshPromise;
}

async function fetchFacebookPageHistorySummary() {
  const config = await facebookPageApiConfig({ target: 'matthew-page' });
  if (!config.pageIdConfigured || !config.tokenConfigured) return null;
  const postsById = new Map();
  const seenPages = new Set();
  let nextUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.pageId)}/published_posts`);
  nextUrl.searchParams.set('fields', 'id,message,created_time,permalink_url');
  nextUrl.searchParams.set('limit', '100');
  nextUrl.searchParams.set('access_token', config.pageToken);
  for (let page = 0; nextUrl && page < 20 && !seenPages.has(nextUrl.href); page += 1) {
    seenPages.add(nextUrl.href);
    const payload = await metaGraphJson(nextUrl.href);
    for (const post of Array.isArray(payload?.data) ? payload.data : []) {
      const graphId = String(post?.id || '').trim();
      if (graphId) postsById.set(graphId, post);
    }
    nextUrl = payload?.paging?.next ? new URL(payload.paging.next) : null;
  }
  return summarizeFacebookPageHistory([...postsById.values()], {
    pageId: config.pageId,
    observedAt: new Date().toISOString(),
  });
}

function normalizeTimelinePerformanceCapture(post = {}) {
  const postUrl = canonicalFacebookUrl(post.postUrl || '');
  if (!postUrl) return null;
  return {
    postUrl,
    postKey: publishingMetricText(post.postKey, 180),
    body: String(post.body || post.postText || '').replace(/\r\n?/g, '\n').trim().slice(0, 12000),
    timestamp: publishingMetricText(post.timestamp, 160),
    discoveredAt: /^\d{4}-\d{2}-\d{2}T/.test(String(post.discoveredAt || '')) ? new Date(post.discoveredAt).toISOString() : new Date().toISOString(),
    metrics: {
      reactions: Math.max(0, Number(post.reactionCount || 0)),
      comments: Math.max(0, Number(post.commentCount || 0)),
      shares: Math.max(0, Number(post.shareCount || 0)),
    },
    source: 'chrome-timeline',
  };
}

function publishingCaptureMatchScore(item, capture) {
  const normalizedBody = publishingMetricText(item?.body || '').toLowerCase();
  const captureBody = publishingMetricText(capture?.body || '').toLowerCase();
  let score = 0;
  if (item?.facebookHandoff?.sourceUrl && item.facebookHandoff.sourceUrl === capture.postUrl) score += 90;
  if (normalizedBody && captureBody && normalizedBody === captureBody) score += 70;
  if (normalizedBody && captureBody && (captureBody.includes(normalizedBody.slice(0, 120)) || normalizedBody.includes(captureBody.slice(0, 120)))) score += 35;
  if (item?.scheduledFor) {
    const driftHours = Math.abs(new Date(capture.discoveredAt).valueOf() - new Date(item.scheduledFor).valueOf()) / 3_600_000;
    if (Number.isFinite(driftHours)) score += Math.max(0, 18 - Math.round(driftHours));
  }
  return score;
}

function upsertPublishingRecord(ledger, values = {}) {
  const posts = Array.isArray(ledger.posts) ? ledger.posts : [];
  const key = String(values.draftId || '').trim();
  const existingIndex = posts.findIndex((record) => (key && record.draftId === key)
    || (values.graphId && record.graphId === values.graphId)
    || (values.facebookUrl && record.facebookUrl === values.facebookUrl));
  const previous = existingIndex >= 0 ? posts[existingIndex] : {};
  const next = {
    ...previous,
    ...values,
    draftId: key || previous.draftId || '',
    target: values.target || previous.target || '',
    title: values.title || previous.title || '',
    body: values.body ?? previous.body ?? '',
    scheduledFor: values.scheduledFor || previous.scheduledFor || null,
    updatedAt: new Date().toISOString(),
  };
  if (existingIndex >= 0) posts[existingIndex] = next;
  else posts.push(next);
  ledger.posts = posts;
  ledger.updatedAt = next.updatedAt;
  return next;
}

async function refreshPublishingMetrics({ allowGraph = false, includePagePerformance = false } = {}) {
  const [queue, scheduledLedger, audience, stored] = await Promise.all([
    readJson(queueFile),
    readJson(scheduledContentLedgerFile),
    readJson(audienceFile),
    readJson(publishingMetricsFile).catch(() => emptyPublishingMetrics()),
  ]);
  const ledger = {
    ...emptyPublishingMetrics(),
    ...stored,
    destinations: { ...(stored.destinations || {}) },
    posts: Array.isArray(stored.posts) ? stored.posts : [],
    facebookPageHistory: stored.facebookPageHistory || null,
    creatorTipPageProgress: queue.creatorTipPageProgress || stored.creatorTipPageProgress || null,
  };
  for (const target of ['matthew-profile', 'matthew-page']) {
    const latest = await currentDestinationFollowerSnapshot(target, audience, { allowGraph });
    const previous = ledger.destinations[target] || {};
    ledger.destinations[target] = {
      ...previous,
      ...latest,
      currentFollowers: latest.currentFollowers ?? previous.currentFollowers ?? null,
      currentFollowerSource: latest.currentFollowerSource || previous.currentFollowerSource || 'unavailable',
    };
  }
  if (allowGraph) {
    try {
      ledger.facebookPageHistory = await fetchFacebookPageHistorySummary();
    } catch (error) {
      ledger.facebookPageHistory = {
        ...(ledger.facebookPageHistory || {}),
        source: 'meta-published-posts-error',
        observedAt: new Date().toISOString(),
        error: cleanMetaError(error),
      };
    }
  }
  const items = (queue.items || []).filter((item) => item.format !== 'story')
    .filter((item) => item.mediaApproval?.hiddenAt || ['approved', 'dispatched', 'scheduled', 'published'].includes(item.status));
  for (const item of items) {
    const scheduledProof = scheduledLedgerMatchForItem(item, scheduledLedger.items || []);
    const destination = ledger.destinations[item.target] || {};
    const existingRecord = (ledger.posts || []).find((entry) => entry.draftId === item.id)
      || (item.facebookHandoff?.graphId ? (ledger.posts || []).find((entry) => entry.graphId === item.facebookHandoff.graphId) : null)
      || null;
    const record = upsertPublishingRecord(ledger, {
      draftId: item.id,
      target: item.target,
      title: item.title,
      body: item.body,
      scheduledFor: item.scheduledFor || scheduledProof?.scheduledFor || null,
      approvedAt: item.approvedAt || item.mediaApproval?.hiddenAt || null,
      preparedAt: item.facebookHandoff?.preparedAt || item.dispatchedAt || null,
      dispatchedAt: item.dispatchedAt || null,
      confirmedAt: item.facebookHandoff?.confirmedAt || null,
      graphId: item.facebookHandoff?.graphId || scheduledProof?.graphId || '',
      facebookUrl: item.facebookHandoff?.sourceUrl || scheduledProof?.sourceUrl || '',
      lastError: publishingMetricText(item.dispatchError || '', 500),
      status: item.status,
      ...(scheduledProof ? {
        scheduledContentObservedAt: scheduledProof.observedAt || scheduledProof.capturedAt || scheduledLedger.updatedAt || new Date().toISOString(),
      } : {}),
      unfollowSupport: 'aggregate-only',
      currentFollowers: destination.currentFollowers ?? null,
      currentFollowerSource: destination.currentFollowerSource || 'unavailable',
      currentFollowerObservedAt: destination.observedAt || null,
      followerDelta: Number.isFinite(destination.currentFollowers) && Number.isFinite(Number(existingRecord?.followersAtPublish))
        ? Number(destination.currentFollowers) - Number(existingRecord.followersAtPublish)
        : null,
    });
    if (record.followersAtPublish === undefined || record.followersAtPublish === null) {
      const publishAnchor = item.facebookHandoff?.preparedAt || item.dispatchedAt || item.facebookHandoff?.confirmedAt || scheduledProof?.observedAt || '';
      if (publishAnchor && Number.isFinite(destination.currentFollowers)) {
        upsertPublishingRecord(ledger, {
          draftId: item.id,
          followersAtPublish: destination.currentFollowers,
          followerSourceAtPublish: destination.currentFollowerSource || 'unavailable',
          publishedAt: publishAnchor,
        });
      }
    }
    if (includePagePerformance && item.target === 'matthew-page' && record.graphId) {
      try {
        const performance = await fetchFacebookPostPerformance(record.graphId, item.target);
        if (performance) {
          upsertPublishingRecord(ledger, {
            draftId: item.id,
            facebookUrl: performance.postUrl || record.facebookUrl,
            performance,
          });
        }
      } catch (error) {
        upsertPublishingRecord(ledger, {
          draftId: item.id,
          lastError: cleanMetaError(error),
        });
      }
    }
  }
  await writeJson(publishingMetricsFile, ledger);
  return buildPublishingPipeline({
    queueItems: (queue.items || []).map(queueItemWithArtworkDay),
    scheduledItems: scheduledLedger.items || [],
    metricsLedger: ledger,
    now: new Date(),
  });
}

async function capturePersonalTimelinePerformance(posts = []) {
  const captures = (Array.isArray(posts) ? posts : []).map(normalizeTimelinePerformanceCapture).filter(Boolean);
  if (!captures.length) return { accepted: 0, matched: 0, updatedAt: new Date().toISOString() };
  const [queue, stored] = await Promise.all([
    readJson(queueFile),
    readJson(publishingMetricsFile).catch(() => emptyPublishingMetrics()),
  ]);
  const ledger = {
    ...emptyPublishingMetrics(),
    ...stored,
    destinations: { ...(stored.destinations || {}) },
    posts: Array.isArray(stored.posts) ? stored.posts : [],
  };
  let matched = 0;
  for (const capture of captures) {
    const exact = ledger.posts.find((record) => record.facebookUrl && record.facebookUrl === capture.postUrl);
    if (exact?.draftId) {
      upsertPublishingRecord(ledger, {
        draftId: exact.draftId,
        facebookUrl: capture.postUrl,
        performance: {
          metrics: capture.metrics,
          observedAt: capture.discoveredAt,
          postUrl: capture.postUrl,
          source: capture.source,
        },
      });
      matched += 1;
      continue;
    }
    const candidates = (queue.items || []).filter((item) => item.target === 'matthew-profile')
      .filter((item) => item.format !== 'story' && (item.mediaApproval?.hiddenAt || ['approved', 'dispatched', 'scheduled', 'published'].includes(item.status)));
    const best = candidates
      .map((item) => ({ item, score: publishingCaptureMatchScore(item, capture) }))
      .sort((left, right) => right.score - left.score)[0];
    if (!best || best.score < 30) continue;
    upsertPublishingRecord(ledger, {
      draftId: best.item.id,
      target: best.item.target,
      title: best.item.title,
      body: best.item.body,
      scheduledFor: best.item.scheduledFor || null,
      facebookUrl: capture.postUrl,
      performance: {
        metrics: capture.metrics,
        observedAt: capture.discoveredAt,
        postUrl: capture.postUrl,
        source: capture.source,
      },
    });
    matched += 1;
  }
  await writeJson(publishingMetricsFile, ledger);
  return { accepted: captures.length, matched, updatedAt: ledger.updatedAt || new Date().toISOString() };
}

async function scheduleFacebookPageDraftViaMetaApi(itemId, { approve = false, dryRun = false, scheduledFor = null, captureAnalytics = true } = {}) {
  if (activeDraftDispatches.has(`page-api:${itemId}`)) throw new Error('This fan-page draft is already being scheduled.');
  activeDraftDispatches.add(`page-api:${itemId}`);
  try {
    const queue = await readJson(queueFile);
    let item = queue.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error('Draft not found.');
    if (item.target !== 'matthew-page') throw new Error('The Meta Page API lane only supports the Matthew Murphy fan page.');
    if (['rejected', 'removed'].includes(item.status)) throw new Error(`This draft is not sendable because it is ${item.status}.`);
    if (hasVerifiedFacebookScheduleProof(item)) throw new Error('This fan-page draft already has Facebook scheduling proof.');
    const sequenceGate = creatorTipSequenceGate(queue, item);
    if (!sequenceGate.allowed) throw new Error(sequenceGate.reason);
    if (approve && ['draft', 'approved', 'dispatched'].includes(item.status)) {
      item.status = 'approved';
      item.approvedAt ||= new Date().toISOString();
    }
    if (item.status !== 'approved' && item.status !== 'scheduled') throw new Error('The fan-page draft must be approved before it can be scheduled.');
    const textOnly = item?.campaign?.kind === 'ai-nightly' && item?.campaign?.visualTestVariant === 'text-only';
    if (!textOnly && !item.mediaApproval?.hiddenAt) throw new Error('Approve the pair in Media before scheduling the fan page.');
    if (scheduledFor) item.scheduledFor = new Date(scheduledFor).toISOString();
    else if (!item.scheduledFor) item.scheduledFor = nextPersonalSchedule(queue);
    const scheduledDate = new Date(item.scheduledFor);
    if (!Number.isFinite(scheduledDate.valueOf())) throw new Error('The fan-page draft has an invalid scheduled time.');
    if (item.scheduleGuard?.notBeforeAt && scheduledDate.valueOf() < Date.parse(item.scheduleGuard.notBeforeAt)) {
      throw new Error(item.scheduleGuard.reason || 'This post cannot be scheduled before its source media existed.');
    }
    if (scheduledDate.valueOf() <= Date.now() + 10 * 60_000) throw new Error('Meta needs the scheduled time to be more than 10 minutes in the future.');
    const feedMedia = queueDraftMediaSource(item, 'feed');
    if (!textOnly && !feedMedia) throw new Error('The fan-page draft is missing its Landscape image.');
    const caption = normalizeHumanPostText(item.body || item.title || '');
    if (!caption) throw new Error('The fan-page draft is missing post text.');
    const config = await facebookPageApiConfig(item);
    if (!config.pageIdConfigured) throw new Error('The Facebook Page ID is not configured on Ryzen.');
    const mediaFilename = textOnly ? 'caption-only' : campaignExportFilename(item, 'feed', feedMedia);
    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        id: item.id,
        status: item.status,
        scheduledFor: item.scheduledFor,
        pageIdConfigured: config.pageIdConfigured,
        tokenConfigured: config.tokenConfigured,
        dryRunEnabled: config.dryRunEnabled,
        mediaFilename,
        captionCharacters: caption.length,
      };
    }
    if (config.dryRunEnabled) throw new Error('Fan-page API scheduling is still in dry-run mode on Ryzen. Set CPH_PERSONAL_SOCIAL_DRY_RUN=0 after the Page token is verified.');
    if (!config.tokenConfigured) throw new Error('The Facebook Page token is not configured on Ryzen.');

    let payload;
    if (textOnly) {
      payload = await scheduleMetaTextWithCurl({
        url: `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.pageId)}/feed`,
        pageToken: config.pageToken,
        caption,
        scheduledPublishTime: String(Math.floor(scheduledDate.valueOf() / 1000)),
      });
    } else {
      const mediaBuffer = await mediaBufferForExport(feedMedia);
      const mediaType = String(feedMedia.mime || feedMedia.type || '').includes('/')
        ? String(feedMedia.mime || feedMedia.type)
        : exportMediaExtension(feedMedia).toLowerCase() === '.png'
          ? 'image/png'
          : exportMediaExtension(feedMedia).toLowerCase() === '.jpg' || exportMediaExtension(feedMedia).toLowerCase() === '.jpeg'
            ? 'image/jpeg'
            : 'image/webp';
      payload = await scheduleMetaPhotoWithCurl({
        url: `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.pageId)}/photos`,
        pageToken: config.pageToken,
        caption,
        scheduledPublishTime: String(Math.floor(scheduledDate.valueOf() / 1000)),
        mediaBuffer,
        mediaType,
        mediaFilename,
      });
    }
    const graphId = String(payload?.post_id || payload?.id || '').trim();
    if (!graphId) throw new Error('Meta scheduled the request without returning a post or photo ID, so Social Desk did not mark it confirmed.');
    const sourceUrl = facebookGraphPostUrl(config.destination.publicProfileId || config.pageId, payload);
    let proof;
    item = await serializeFacebookScheduleCommit(async () => {
      proof = await upsertScheduledContentProof({
        key: `meta-page-api:${item.id}:${graphId}`,
        title: item.title,
        scheduledFor: item.scheduledFor,
        sourceUrl,
        source: 'meta-page-api',
        target: item.target,
        draftId: item.id,
        graphId,
      });
      const latestQueue = await readJson(queueFile);
      const latestItem = latestQueue.items.find((entry) => entry.id === item.id);
      if (!latestItem) throw new Error('Draft disappeared before Facebook confirmation could be saved.');
      const confirmedAt = new Date().toISOString();
      latestItem.status = 'scheduled';
      latestItem.dispatchError = '';
      latestItem.facebookHandoff = {
        ...(latestItem.facebookHandoff || {}),
        state: 'page-api-scheduled',
        preparedAt: latestItem.facebookHandoff?.preparedAt || confirmedAt,
        scheduledAt: confirmedAt,
        confirmedAt,
        scheduledFor: latestItem.scheduledFor,
        facebookConfirmed: true,
        scheduleClicked: true,
        sourceUrl: proof.sourceUrl,
        graphId,
        extensionVersion: 'meta-page-api',
      };
      latestItem.mediaApproval = {
        ...(latestItem.mediaApproval || {}),
        archivedAt: latestItem.mediaApproval?.archivedAt || confirmedAt,
      };
      latestItem.updatedAt = confirmedAt;
      latestQueue.updatedAt = confirmedAt;
      await writeJson(queueFile, latestQueue);
      return latestItem;
    });
    if (!captureAnalytics) {
      return {
        ok: true,
        id: item.id,
        status: item.status,
        scheduledFor: item.scheduledFor,
        analyticsDeferredUntilPublish: true,
        facebookMatch: proof,
      };
    }
    const audience = await readJson(audienceFile).catch(() => ({ summary: {} }));
    const pageSnapshot = await currentDestinationFollowerSnapshot(item.target, audience, { allowGraph: true });
    const publishingMetrics = await readJson(publishingMetricsFile).catch(() => emptyPublishingMetrics());
    const pagePerformance = await fetchFacebookPostPerformance(graphId, item.target).catch(() => null);
    const metricsLedger = {
      ...emptyPublishingMetrics(),
      ...publishingMetrics,
      destinations: { ...(publishingMetrics.destinations || {}) },
      posts: Array.isArray(publishingMetrics.posts) ? publishingMetrics.posts : [],
    };
    metricsLedger.destinations[item.target] = {
      ...(metricsLedger.destinations[item.target] || {}),
      ...pageSnapshot,
    };
    upsertPublishingRecord(metricsLedger, {
      draftId: item.id,
      target: item.target,
      title: item.title,
      body: item.body,
      scheduledFor: item.scheduledFor,
      approvedAt: item.approvedAt || item.mediaApproval?.hiddenAt || null,
      preparedAt: item.facebookHandoff?.preparedAt || null,
      confirmedAt: item.facebookHandoff?.confirmedAt || null,
      graphId,
      facebookUrl: proof.sourceUrl,
      status: item.status,
      followersAtPublish: pageSnapshot.currentFollowers,
      followerSourceAtPublish: pageSnapshot.currentFollowerSource || 'unavailable',
      currentFollowers: pageSnapshot.currentFollowers,
      currentFollowerSource: pageSnapshot.currentFollowerSource || 'unavailable',
      currentFollowerObservedAt: pageSnapshot.observedAt || null,
      followerDelta: 0,
      unfollowSupport: 'aggregate-only',
      ...(pagePerformance ? { performance: pagePerformance } : {}),
    });
    await writeJson(publishingMetricsFile, metricsLedger);
    return {
      ok: true,
      id: item.id,
      status: item.status,
      scheduledFor: item.scheduledFor,
      facebookMatch: proof,
    };
  } finally {
    activeDraftDispatches.delete(`page-api:${itemId}`);
  }
}

async function dispatchApprovedDraft(itemId, { approve = false } = {}) {
  if (activeDraftDispatches.has(itemId)) throw new Error('This draft is already being scheduled.');
  activeDraftDispatches.add(itemId);
  try {
    const queue = await readJson(queueFile);
    let item = queue.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error('Draft not found.');
    if (['dispatched', 'published'].includes(item.status)) return item;
    if (approve) {
      if (!['draft', 'approved'].includes(item.status)) throw new Error('A rejected draft cannot be approved for scheduling.');
      item.status = 'approved';
      item.approvedAt ||= new Date().toISOString();
    }
    if (item.status !== 'approved') throw new Error('The draft must be approved before it can be scheduled.');
    const parent = parentPostFor(queue, item);
    const parentHasFacebookProof = parent ? hasVerifiedFacebookScheduleProof(parent) : false;
    if (item.format === 'story' && parent && !['dispatched', 'published'].includes(parent.status) && !parentHasFacebookProof) {
      throw new Error(`Story is waiting for parent draft D-${parent.id.slice(0, 8).toUpperCase()} to finish.`);
    }
    if (item.format === 'story' && parentHasFacebookProof && Date.parse(item.scheduledFor || 0) <= Date.parse(parent.scheduledFor || 0)) {
      throw new Error('Story must be scheduled after its Facebook-confirmed source post.');
    }
    item.scheduledFor ||= nextPersonalSchedule(queue);
    item.lastDispatchAttemptAt = new Date().toISOString();
    item.dispatchError = '';
    await writeJson(queueFile, queue);

    const persistDispatchState = async (fields) => {
      const latestQueue = await readJson(queueFile);
      const latestItem = latestQueue.items.find((entry) => entry.id === itemId);
      if (!latestItem) throw new Error('Draft not found.');
      Object.assign(latestItem, fields);
      await writeJson(queueFile, latestQueue);
      item = latestItem;
      return latestItem;
    };

    const readiness = await personalPublishingReadiness(true);
    if (!readiness.canPublish) {
      const dispatchError = publishingReadinessMessage(readiness);
      await persistDispatchState({ status: 'approved', dispatchError });
      throw new Error(dispatchError);
    }

    const latestQueue = await readJson(queueFile);
    item = latestQueue.items.find((entry) => entry.id === itemId);
    if (!item || item.status !== 'approved') throw new Error('The draft changed while publishing readiness was checked.');

    const dispatchMedia = (item.media || []).filter((media) => item.format === 'story' ? media.role === 'story' : media.role !== 'story');
    const job = {
      ...item,
      media: item.format === 'story'
        ? await stageStoryMediaForRyzen(item.id, dispatchMedia)
        : dispatchMedia,
      destination: personalSocialDestination(item),
      dispatchedAt: new Date().toISOString(),
      requestedBy: 'creator-publishing-hub-personal-social-desk',
    };
    try {
      await sendToRyzen(job);
    } catch (error) {
      await persistDispatchState({
        status: 'approved',
        dispatchError: String(error.message || error).slice(0, 500),
      });
      throw error;
    }
    return persistDispatchState({ status: 'dispatched', dispatchedAt: job.dispatchedAt, dispatchError: '' });
  } finally {
    activeDraftDispatches.delete(itemId);
  }
}

async function dispatchApprovedDrafts() {
  await ensureHourlyPageStories().catch((error) => console.warn(`Hourly Page Story runway skipped: ${error.message}`));
  const queue = await readJson(queueFile);
  const retryCutoff = Date.now() - 5 * 60_000;
  const pageApproved = queue.items.filter((item) => item.target === 'matthew-page'
    && item.format !== 'story'
    && (item.mediaApproval?.hiddenAt || (item?.campaign?.kind === 'ai-nightly' && item?.campaign?.visualTestVariant === 'text-only'))
    && !hasVerifiedFacebookScheduleProof(item)
    && ['approved', 'dispatched', 'scheduled'].includes(item.status)
    && Date.parse(item.scheduledFor || 0) > Date.now() + 10 * 60_000
    && !activeDraftDispatches.has(`page-api:${item.id}`)
    && (!item.lastDispatchAttemptAt || new Date(item.lastDispatchAttemptAt).valueOf() <= retryCutoff))
    .sort((left, right) => Date.parse(left.scheduledFor || 0) - Date.parse(right.scheduledFor || 0))
    .slice(0, 3);
  for (const item of pageApproved) {
    await scheduleFacebookPageDraftViaMetaApi(item.id, { approve: true, captureAnalytics: false }).catch((error) => console.warn(`Approved Page draft ${item.id} is still waiting for Meta: ${error.message}`));
  }

  const pageStoryApproved = queue.items.filter((item) => item.target === 'matthew-page'
    && item.format === 'story'
    && item.status === 'approved'
    && item.mediaApproval?.hiddenAt
    && !item.facebookHandoff?.facebookConfirmed
    && Date.parse(item.scheduledFor || 0) > Date.now() + 60_000
    && !activeDraftDispatches.has(item.id)
    && (!item.lastDispatchAttemptAt || new Date(item.lastDispatchAttemptAt).valueOf() <= retryCutoff))
    .sort((left, right) => Date.parse(left.scheduledFor || 0) - Date.parse(right.scheduledFor || 0))
    .slice(0, 3);
  for (const item of pageStoryApproved) {
    await dispatchApprovedDraft(item.id).catch((error) => console.warn(`Approved Page Story ${item.id} is still waiting for Ryzen: ${error.message}`));
  }

  const profileApproved = queue.items.filter((item) => item.target === 'matthew-profile'
    && item.status === 'approved'
    && !activeDraftDispatches.has(item.id)
    && (!item.lastDispatchAttemptAt || new Date(item.lastDispatchAttemptAt).valueOf() <= retryCutoff)).slice(0, 3);
  for (const item of profileApproved) await dispatchApprovedDraft(item.id).catch((error) => console.warn(`Approved profile draft ${item.id} is still waiting for Ryzen: ${error.message}`));
}

async function scheduleApprovedFacebookPageBacklog({ limit = 250, concurrency = 4 } = {}) {
  const queue = await readJson(queueFile);
  const candidates = queue.items.filter((item) => item.target === 'matthew-page'
    && item.format !== 'story'
    && (item.mediaApproval?.hiddenAt || (item?.campaign?.kind === 'ai-nightly' && item?.campaign?.visualTestVariant === 'text-only'))
    && !hasVerifiedFacebookScheduleProof(item)
    && ['approved', 'dispatched', 'scheduled'].includes(item.status)
    && Date.parse(item.scheduledFor || 0) > Date.now() + 10 * 60_000)
    .sort((left, right) => {
      const leftTip = creatorTipNumberFromItem(left);
      const rightTip = creatorTipNumberFromItem(right);
      if (leftTip && rightTip && leftTip !== rightTip) return leftTip - rightTip;
      if (leftTip !== rightTip) return leftTip ? -1 : 1;
      return Date.parse(left.scheduledFor || 0) - Date.parse(right.scheduledFor || 0);
    })
    .slice(0, Math.min(500, Math.max(1, Number(limit) || 250)));
  const results = new Array(candidates.length);
  const creatorTipCandidates = candidates.filter((item) => isCreatorTipItem(item));
  const otherCandidates = candidates.filter((item) => !isCreatorTipItem(item));
  for (const item of creatorTipCandidates) {
    const index = candidates.indexOf(item);
    try {
      const scheduled = await scheduleFacebookPageDraftViaMetaApi(item.id, { approve: true, captureAnalytics: false });
      results[index] = {
        ok: true,
        draftId: item.id,
        title: item.title,
        scheduledFor: scheduled.scheduledFor,
        graphId: scheduled.facebookMatch?.graphId || '',
      };
    } catch (error) {
      const message = cleanMetaError(error);
      results[index] = { ok: false, draftId: item.id, title: item.title, scheduledFor: item.scheduledFor, error: message };
      break;
    }
  }
  let cursor = 0;
  const worker = async () => {
    while (cursor < otherCandidates.length) {
      const item = otherCandidates[cursor];
      cursor += 1;
      const index = candidates.indexOf(item);
      try {
        const scheduled = await scheduleFacebookPageDraftViaMetaApi(item.id, { approve: true, captureAnalytics: false });
        results[index] = {
          ok: true,
          draftId: item.id,
          title: item.title,
          scheduledFor: scheduled.scheduledFor,
          graphId: scheduled.facebookMatch?.graphId || '',
        };
      } catch (error) {
        const message = cleanMetaError(error);
        results[index] = { ok: false, draftId: item.id, title: item.title, scheduledFor: item.scheduledFor, error: message };
      }
    }
  };
  const workerCount = Math.min(6, Math.max(1, Number(concurrency) || 4), otherCandidates.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  for (let index = 0; index < results.length; index += 1) {
    if (!results[index]) {
      const item = candidates[index];
      results[index] = {
        ok: false,
        draftId: item.id,
        title: item.title,
        scheduledFor: item.scheduledFor,
        error: 'Stopped at the first Creator Tip sequence gap.',
      };
    }
  }
  return {
    requested: candidates.length,
    confirmed: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

function sendToRyzen(job) {
  return new Promise((resolve, reject) => {
    const createdAt = job.createdAt || job.receivedAt || new Date().toISOString();
    const filename = `${createdAt.slice(0, 10)}-${job.id || randomUUID()}.json`;
    const remote = `mkdir -p '${ryzenSpool}' && cat > '${ryzenSpool}/${filename}'`;
    const child = spawnRyzen(remote, { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = '';
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      finish(() => reject(new Error('Ryzen dispatch timed out after 15 seconds. The local Social Desk record was kept.')));
    }, 15000);
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', (childError) => finish(() => reject(childError)));
    child.on('close', (code) => finish(() => code === 0 ? resolve() : reject(new Error(error.trim() || `Ryzen dispatch failed (${code})`))));
    child.stdin.end(`${JSON.stringify(job, null, 2)}\n`);
  });
}

function readRyzenStoryReceipts() {
  return new Promise((resolve, reject) => {
    const remote = `python3 - <<'PY'
import glob, json, os
from datetime import datetime, timezone
root = ${JSON.stringify(ryzenSpool)}
paths = []
for state in ('done', 'failed'):
    candidates = glob.glob(os.path.join(root, state, '*.json'))
    candidates.sort(key=lambda path: os.path.getmtime(path), reverse=True)
    paths.extend((state, path) for path in candidates[:500])
receipts = []
for state, path in paths:
    try:
        with open(path, encoding='utf-8') as handle:
            job = json.load(handle)
    except Exception:
        continue
    if job.get('format') != 'story' or not job.get('id'):
        continue
    receipt = {
        'id': job.get('id'),
        'state': state,
        'facebook': job.get('facebook'),
        'observedAt': datetime.fromtimestamp(os.path.getmtime(path), timezone.utc).isoformat().replace('+00:00', 'Z'),
    }
    if state == 'failed':
        try:
            with open(path + '.error.txt', encoding='utf-8') as handle:
                receipt['error'] = handle.read(1000)
        except Exception:
            receipt['error'] = 'Ryzen Story worker failed without an error receipt.'
    receipts.append(receipt)
print(json.dumps(receipts))
PY`;
    const child = spawnRyzen(remote);
    let output = '';
    let error = '';
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      finish(() => reject(new Error('Ryzen Story receipt check timed out.')));
    }, 15_000);
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', (childError) => finish(() => reject(childError)));
    child.on('close', (code) => finish(() => {
      if (code !== 0) return reject(new Error(error.trim() || `Ryzen Story receipt check failed (${code}).`));
      try { return resolve(JSON.parse(output || '[]')); }
      catch { return reject(new Error('Ryzen returned malformed Story receipts.')); }
    }));
  });
}

async function syncRyzenStoryReceipts() {
  const receipts = await readRyzenStoryReceipts();
  if (!receipts.length) return { checked: 0, confirmed: 0, failed: 0 };
  return serializeFacebookScheduleCommit(async () => {
    const queue = await readJson(queueFile);
    const byId = new Map((queue.items || []).map((item) => [item.id, item]));
    let confirmed = 0;
    let failed = 0;
    for (const receipt of receipts) {
      const item = byId.get(receipt.id);
      if (!item || item.format !== 'story' || item.facebookHandoff?.facebookConfirmed) continue;
      const storyId = String(receipt.facebook?.storyId || receipt.facebook?.stories?.[0]?.storyId || '').trim();
      if (receipt.state === 'done' && receipt.facebook?.kind === 'photo-story' && storyId) {
        const confirmedAt = receipt.facebook.publishedAt || receipt.observedAt || new Date().toISOString();
        item.status = 'published';
        item.dispatchError = '';
        item.facebookHandoff = {
          ...(item.facebookHandoff || {}),
          state: 'page-story-api-published',
          preparedAt: item.facebookHandoff?.preparedAt || item.dispatchedAt || confirmedAt,
          confirmedAt,
          publishedAt: confirmedAt,
          scheduledFor: item.scheduledFor,
          facebookConfirmed: true,
          graphId: storyId,
          storyIds: (receipt.facebook.stories || []).map((story) => story.storyId).filter(Boolean),
          photoIds: (receipt.facebook.stories || []).map((story) => story.photoId).filter(Boolean),
          extensionVersion: 'meta-page-story-api',
        };
        item.mediaApproval = {
          ...(item.mediaApproval || {}),
          archivedAt: item.mediaApproval?.archivedAt || confirmedAt,
        };
        item.updatedAt = confirmedAt;
        confirmed += 1;
      } else if (receipt.state === 'failed' && item.status === 'dispatched') {
        item.status = 'failed';
        item.dispatchError = cleanMetaError(receipt.error || 'Ryzen Story worker failed.');
        item.updatedAt = receipt.observedAt || new Date().toISOString();
        failed += 1;
      }
    }
    if (confirmed || failed) {
      queue.updatedAt = new Date().toISOString();
      await writeJson(queueFile, queue);
    }
    return { checked: receipts.length, confirmed, failed };
  });
}

function sendCreatorTipReelToRyzen(job) {
  return new Promise((resolve, reject) => {
    const filename = `${job.periodEnd || new Date().toISOString().slice(0, 10)}-${job.cadence}-${job.id}.json`;
    const incoming = `${ryzenCreatorTipReelSpool}/.${filename}.incoming`;
    const target = `${ryzenCreatorTipReelSpool}/${filename}`;
    const remote = `mkdir -p '${ryzenCreatorTipReelSpool}' && cat > '${incoming}' && mv '${incoming}' '${target}'`;
    const child = spawnRyzen(remote, { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = '';
    const timeout = setTimeout(() => child.kill('SIGTERM'), 15_000);
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', (childError) => {
      clearTimeout(timeout);
      reject(childError);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve({ filename, spool: ryzenCreatorTipReelSpool });
      else reject(new Error(error.trim() || `Ryzen reel dispatch failed (${code}).`));
    });
    child.stdin.end(`${JSON.stringify(job, null, 2)}\n`);
  });
}

function dailyCreatorTipReelPlan(queue = {}, publishDate = '') {
  const items = (queue.items || []).filter((item) => item.format !== 'story'
    && item.target === 'matthew-page'
    && isCreatorTipItem(item)
    && imageStyleFamilyForItem(item)?.publishDate === publishDate);
  const collections = buildCreatorTipCollectionPlans(queue.items || []);
  const cover = collections.covers.find((entry) => entry.date === publishDate && entry.usable);
  if (!cover) throw new Error(`The ${publishDate} daily reel is waiting for one approved, unflagged Daily Series cover.`);
  const monthToDateCovers = collections.covers.filter((entry) => entry.usable && entry.date.startsWith(publishDate.slice(0, 7)) && entry.date <= publishDate);
  const plan = buildDailyCreatorTipReelPlan({ items, publishDate, dailyCover: cover.media, monthToDateCovers });
  const finalPostAt = Math.max(...items.map((item) => Date.parse(item.intendedScheduledFor || item.scheduledFor || 0)).filter(Number.isFinite));
  const guards = [cover.existenceAt, Number.isFinite(finalPostAt) ? new Date(finalPostAt + 60 * 60 * 1000).toISOString() : null]
    .filter(Boolean)
    .map(Date.parse)
    .filter(Number.isFinite);
  plan.sourceCoverExistenceAt = cover.existenceAt;
  plan.notBeforeAt = guards.length ? new Date(Math.max(...guards)).toISOString() : null;
  return plan;
}

function weeklyCreatorTipReelPlan(queue = {}, throughDate = '') {
  const collections = buildCreatorTipCollectionPlans(queue.items || []);
  const week = collections.weeks.find((plan) => plan.periodEnd === throughDate);
  if (!week?.ready) throw new Error(`The weekly reel is waiting for all seven approved daily covers through ${throughDate}.`);
  const dailyPlans = collections.covers
    .filter((cover) => cover.usable && cover.date.startsWith(throughDate.slice(0, 7)) && cover.date <= throughDate)
    .map((cover) => dailyCreatorTipReelPlan(queue, cover.date));
  const plan = buildWeeklyCreatorTipReelPlan({ dailyPlans, throughDate });
  const guards = dailyPlans.map((daily) => Date.parse(daily.notBeforeAt || 0)).filter(Number.isFinite);
  plan.notBeforeAt = guards.length ? new Date(Math.max(...guards)).toISOString() : week.availableAfter;
  return plan;
}

function sendAudiencePriorityToRyzen(job) {
  return new Promise((resolve, reject) => {
    const createdAt = job.createdAt || new Date().toISOString();
    const filename = `${createdAt.slice(0, 10)}-${job.id || randomUUID()}.json`;
    const incoming = `${ryzenAudiencePriorityRoot}/ready/.${filename}.incoming`;
    const target = `${ryzenAudiencePriorityRoot}/ready/${filename}`;
    const remote = `mkdir -p '${ryzenAudiencePriorityRoot}/ready' && cat > '${incoming}' && mv '${incoming}' '${target}'`;
    const child = spawnRyzen(remote, { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = '';
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      finish(() => reject(new Error('Ryzen priority dispatch timed out after 15 seconds. The verified local identity was kept.')));
    }, 15000);
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', (childError) => finish(() => reject(childError)));
    child.on('close', (code) => finish(() => code === 0 ? resolve() : reject(new Error(error.trim() || `Ryzen priority dispatch failed (${code})`))));
    child.stdin.end(`${JSON.stringify(job, null, 2)}\n`);
  });
}

function safeFilename(value) {
  const cleaned = String(value).normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(-180) || 'upload.bin';
}

async function resolveLocalStoryMediaPath(mediaPath) {
  const requestedPath = String(mediaPath || '').trim();
  if (!requestedPath) throw new Error('Story media has no local file path.');
  try {
    await stat(requestedPath);
    return requestedPath;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const legacyDeskRoot = '/Users/mmurphy/Projects/Creator-Newsdesk/apps/personal-social-desk';
  if (requestedPath.startsWith(`${legacyDeskRoot}/`)) {
    const currentPath = join(root, requestedPath.slice(legacyDeskRoot.length + 1));
    await stat(currentPath);
    return currentPath;
  }
  throw new Error(`Story media file is missing: ${requestedPath}`);
}

async function uploadStoryMediaFileToRyzen(itemId, media) {
  if (media?.storage === 'ryzen' && String(media.path || '').startsWith(`${ryzenMedia}/`)) return media;
  const sourcePath = await resolveLocalStoryMediaPath(media?.path);
  const buffer = await readFile(sourcePath);
  const filename = safeFilename(media?.filename || sourcePath.split('/').pop() || 'story-image.webp');
  const remoteDir = `${ryzenMedia}/${itemId}`;
  const remotePath = `${remoteDir}/${Date.now()}-${filename}`;
  const remote = `mkdir -p ${shellSingleQuote(remoteDir)} && cat > ${shellSingleQuote(remotePath)}`;
  await new Promise((resolve, reject) => {
    const child = spawnRyzen(remote, { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = '';
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0
      ? resolve()
      : reject(new Error(error.trim() || `Ryzen Story media upload failed (${code})`)));
    child.stdin.end(buffer);
  });
  return {
    ...media,
    filename,
    bytes: buffer.length,
    storage: 'ryzen',
    attachedAt: new Date().toISOString(),
    path: remotePath,
    url: `/api/media?path=${encodeURIComponent(remotePath)}&type=${encodeURIComponent(media?.type || media?.mime || 'image/webp')}`,
  };
}

async function stageStoryMediaForRyzen(itemId, media = []) {
  const storyMedia = media.filter((entry) => entry?.role === 'story');
  if (!storyMedia.length) throw new Error('Story publishing requires an approved vertical image.');
  return Promise.all(storyMedia.map((entry) => uploadStoryMediaFileToRyzen(itemId, entry)));
}

async function readMacClipboardImage() {
  if (ryzenLocal) throw new Error('Use the browser Paste image action when Social Desk is hosted on Ryzen.');
  const folder = await mkdtemp(join(tmpdir(), 'creator-social-clipboard-'));
  const sourcePath = join(folder, 'clipboard-source');
  const webpPath = join(folder, 'clipboard.webp');
  const script = `ObjC.import('AppKit');
var pasteboard = $.NSPasteboard.generalPasteboard;
var imageData = pasteboard.dataForType('public.png');
if (!imageData) imageData = pasteboard.dataForType('public.tiff');
if (!imageData) throw new Error('No image was found on the macOS clipboard.');
imageData.writeToFileAtomically('${sourcePath}', true);`;
  try {
    await runProcess('osascript', ['-l', 'JavaScript', '-e', script]);
    const dimensions = (await runProcess(imageIdentifyBin, ryzenLocal ? ['-format', '%w %h', sourcePath] : ['identify', '-format', '%w %h', sourcePath])).trim().split(/\s+/).map(Number);
    await runProcess(imageConvertBin, [sourcePath, '-auto-orient', '-strip', '-resize', '2048x2048>', '-quality', '88', webpPath]);
    const buffer = await readFile(webpPath);
    if (buffer.length < 12 || buffer.subarray(0, 4).toString() !== 'RIFF' || buffer.subarray(8, 12).toString() !== 'WEBP') throw new Error('The clipboard image could not be converted to WebP.');
    return { buffer, type: 'image/webp', extension: 'webp', width: dimensions[0] || 0, height: dimensions[1] || 0 };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; let error = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(error.trim() || `${command} failed (${code})`)));
  });
}

function runProcessWithTimeout(command, args, timeoutMs = 45_000, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; let error = ''; let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(() => reject(new Error(`${command} timed out after ${Math.round(timeoutMs / 1000)} seconds.`)));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', (childError) => finish(() => reject(childError)));
    child.on('close', (code) => finish(() => code === 0 ? resolve(output) : reject(new Error(error.trim() || `${command} failed (${code})`))));
  });
}

function streamToRyzen(req, itemId, filename, type, role) {
  return new Promise((resolve, reject) => {
    const remoteDir = `${ryzenMedia}/${itemId}`;
    const remotePath = `${remoteDir}/${Date.now()}-${filename}`;
    const remote = `mkdir -p ${shellSingleQuote(remoteDir)} && cat > ${shellSingleQuote(remotePath)}`;
    const child = spawnRyzen(remote, { stdio: ['pipe', 'ignore', 'pipe'], identity: false });
    let error = ''; let stdinError = ''; let bytes = 0;
    let settled = false;
    const fail = (uploadError) => {
      if (settled) return;
      settled = true;
      req.unpipe(child.stdin);
      child.stdin.destroy();
      reject(uploadError);
    };
    req.on('data', (chunk) => { bytes += chunk.length; });
    req.on('error', fail);
    req.pipe(child.stdin);
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.stdin.on('error', (uploadError) => { stdinError = uploadError.message; });
    child.on('error', fail);
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolve({ filename, type, role, bytes, storage: 'ryzen', attachedAt: new Date().toISOString(), path: remotePath, url: `/api/media?path=${encodeURIComponent(remotePath)}&type=${encodeURIComponent(type)}` });
      } else {
        reject(new Error(error.trim() || stdinError || `Ryzen upload failed (${code})`));
      }
    });
  });
}

function streamCreatorTipReelAudioToRyzen(req, id, filename, type) {
  return new Promise((resolve, reject) => {
    const remotePath = `${ryzenCreatorTipReelAudio}/${id}-${filename}`;
    const remote = `mkdir -p ${shellSingleQuote(ryzenCreatorTipReelAudio)} && cat > ${shellSingleQuote(remotePath)}`;
    const child = spawnRyzen(remote, { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = '';
    let bytes = 0;
    req.on('data', (chunk) => { bytes += chunk.length; });
    req.pipe(child.stdin);
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0
      ? resolve({ id, filename, type, bytes, path: remotePath })
      : reject(new Error(error.trim() || `Ryzen reel-audio upload failed (${code})`)));
  });
}

function copyRyzenFileToLocal(path, destination) {
  return new Promise((resolve, reject) => {
    const child = spawnRyzen(`cat ${shellSingleQuote(path)}`);
    const output = spawn('bash', ['-lc', `cat > '${destination.replace(/'/g, `'\\''`)}'`], { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = '';
    child.stderr.on('data', (chunk) => { error += chunk; });
    output.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject);
    output.on('error', reject);
    child.stdout.pipe(output.stdin);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(error.trim() || 'Could not copy Ryzen media.'));
    });
    output.on('close', (code) => {
      if (code !== 0) return reject(new Error(error.trim() || 'Could not write local media cache.'));
      resolve(destination);
    });
  });
}

function mediaThumbPath(path) {
  return join(mediaThumbsDir, `${createHash('sha1').update(path).digest('hex')}.webp`);
}

function warmRyzenImageThumbnail(path) {
  if (pendingRyzenThumbs.has(path)) return pendingRyzenThumbs.get(path);
  const task = ensureRyzenImageThumbnail(path).finally(() => pendingRyzenThumbs.delete(path));
  pendingRyzenThumbs.set(path, task);
  return task;
}

async function ensureRyzenImageThumbnail(path) {
  const thumbPath = mediaThumbPath(path);
  try {
    await stat(thumbPath);
    return thumbPath;
  } catch {}
  const tempDir = await mkdtemp(join(tmpdir(), 'creator-social-thumb-'));
  const sourcePath = join(tempDir, 'source');
  const thumbTempPath = join(tempDir, 'thumb.webp');
  try {
    await copyRyzenFileToLocal(path, sourcePath);
    await runProcessWithTimeout(imageConvertBin, [sourcePath, '-auto-orient', '-resize', '50%', '-strip', '-quality', '84', thumbTempPath], 60_000);
    const buffer = await readFile(thumbTempPath);
    if (!buffer.length) throw new Error('Thumbnail conversion returned an empty file.');
    await writeFile(thumbPath, buffer);
    return thumbPath;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function streamFromRyzen(res, path, type) {
  const child = spawnRyzen(`cat ${shellSingleQuote(path)}`);
  let error = '';
  let settled = false;
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    child.kill('SIGTERM');
    if (!res.headersSent) send(res, 504, { error: 'Ryzen media preview timed out' });
    else res.destroy();
  }, 45_000);
  timeout.unref();
  child.stderr.on('data', (chunk) => { error += chunk; });
  child.on('error', () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    if (!res.headersSent) send(res, 502, { error: 'Ryzen media preview failed' });
    else res.destroy();
  });
  child.on('close', (code) => {
    clearTimeout(timeout);
    if (settled) return;
    settled = true;
    if (code !== 0 && !res.headersSent) send(res, 404, { error: error.trim() || 'Media not found' });
  });
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'private, max-age=300' });
  child.stdout.pipe(res);
}

async function serve(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const path = join(publicDir, safePath);
  if (!path.startsWith(publicDir)) return send(res, 403, { error: 'Forbidden' });
  try {
    const file = await readFile(path);
    const extension = extname(path);
    res.writeHead(200, {
      'Content-Type': mime[extension] || 'application/octet-stream',
      ...(extension === '.webmanifest' ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' } : {}),
    });
    res.end(file);
  } catch {
    const index = await readFile(join(publicDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': mime['.html'] });
    res.end(index);
  }
}

await ensureData();
await ensureAiNightlyBatch().catch((error) => console.warn(`Automatic Ryzen night-draft request skipped: ${error.message}`));
await syncRyzenStoryReceipts().catch((error) => console.warn(`Initial Ryzen Story receipt sync skipped: ${error.message}`));
await ensureHourlyPageStories({ force: true }).catch((error) => console.warn(`Initial hourly Page Story runway skipped: ${error.message}`));
setInterval(() => refreshAudienceReviewFromRyzen().catch((error) => console.warn(`Audience review refresh skipped: ${error.message}`)), 300000).unref();
setInterval(() => dispatchApprovedDrafts().catch((error) => console.warn(`Approved draft scheduler skipped: ${error.message}`)), 30_000).unref();
setInterval(() => syncRyzenStoryReceipts().catch((error) => console.warn(`Ryzen Story receipt sync skipped: ${error.message}`)), 60_000).unref();
setInterval(() => dispatchApprovedFirstComments().catch((error) => console.warn(`Approved first-comment scheduler skipped: ${error.message}`)), 30_000).unref();
setInterval(() => syncAiNightlyResults().catch((error) => console.warn(`Ryzen night-draft sync skipped: ${error.message}`)), 60_000).unref();
setInterval(() => ensureAiNightlyBatch().catch((error) => console.warn(`Automatic Ryzen night-draft request skipped: ${error.message}`)), 15 * 60_000).unref();
setInterval(() => ensureWeeklySocialCurrencyQueue().catch((error) => console.warn(`Weekly Social Currency check skipped: ${error.message}`)), 6 * 60 * 60 * 1000).unref();
setInterval(() => queuePublishedPagePostsForGroupApproval().catch((error) => console.warn(`Automatic Page-to-group queue skipped: ${cleanMetaError(error)}`)), 60 * 60 * 1000).unref();
setTimeout(() => queuePublishedPagePostsForGroupApproval().catch((error) => console.warn(`Initial Page-to-group queue skipped: ${cleanMetaError(error)}`)), 30_000).unref();
createServer(async (req, res) => {
  try {
    const requestOrigin = String(req.headers.origin || '');
    if (requestOrigin === 'https://www.facebook.com' || requestOrigin.startsWith('chrome-extension://')) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': requestOrigin === 'https://www.facebook.com' || requestOrigin.startsWith('chrome-extension://') ? requestOrigin : 'https://www.facebook.com',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Social-Desk-Client',
        'Access-Control-Max-Age': '86400',
      });
      return res.end();
    }
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return await serve(req, res, url);
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
}).listen(port, '127.0.0.1', () => console.log(`Creator Social Desk: http://127.0.0.1:${port}`));
