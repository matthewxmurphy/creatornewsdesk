const EDUCATION_KEYWORDS = new Set(['fb', 'cmi']);

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function classifyCommunityReplyIntent(commentText = '') {
  const text = normalizedText(commentText);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  const keyword = words.find((word) => EDUCATION_KEYWORDS.has(word));
  if (keyword && words.length <= 6) return { intent: 'education-keyword', keyword: keyword.toUpperCase() };
  if (/^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))\b/i.test(text)) {
    return { intent: 'greeting', keyword: '' };
  }
  if (/\b(?:that(?:'s| is) right|you(?:'re| are) right|i agree|agreed|exactly|so true|very true|correct)\b/i.test(text)) {
    return { intent: 'agreement', keyword: '' };
  }
  if (/\b(?:curious|wondering|interested|want to know|would like to know)\b/i.test(text)) {
    return { intent: 'curiosity', keyword: '' };
  }
  if (/\?|^(?:how|what|why|when|where|which|can|could|should|would|is|are|do|does|did)\b/i.test(text)) {
    return { intent: 'question', keyword: '' };
  }
  if (/\b(?:thank|thanks|congrats|congratulations|awesome|amazing|great|love|helpful|useful|wow|cool)\b/i.test(text)) {
    return { intent: 'appreciation', keyword: '' };
  }
  return { intent: 'conversation', keyword: '' };
}

function escapedPattern(value) {
  return normalizedText(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function usableCommunityPostContext(candidate = {}) {
  const context = normalizedText(candidate.postContext).slice(0, 1600);
  if (!context) return '';
  let remainder = context;
  for (const value of [candidate.actorName, candidate.commentText]) {
    const pattern = escapedPattern(value);
    if (pattern) remainder = remainder.replace(new RegExp(pattern, 'gi'), ' ');
  }
  remainder = remainder
    .replace(/\b(?:like|reply|hide|share|author|follow|see translation|most relevant)\b/gi, ' ')
    .replace(/\b\d+\s*(?:s|m|h|d|w|y|sec|secs|min|mins|hour|hours|day|days|week|weeks|year|years)\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim();
  return remainder ? context : '';
}

function firstName(actorName = '') {
  return normalizedText(actorName).split(/\s+/)[0] || '';
}

export function safeCommunityReplyFallback(candidate = {}) {
  const classification = classifyCommunityReplyIntent(candidate.commentText);
  const intent = candidate.intent || classification.intent;
  const name = firstName(candidate.actorName);
  if (intent === 'greeting') {
    const greeting = normalizedText(candidate.commentText).match(/^(good\s+(?:morning|afternoon|evening)|hi|hello|hey)\b/i)?.[1] || 'Hello';
    return `${greeting.replace(/^./, (letter) => letter.toUpperCase())}${name ? `, ${name}` : ''}. What caught your attention in this post?`;
  }
  if (intent === 'agreement') return `Thanks for weighing in${name ? `, ${name}` : ''}. Which part did you agree with most?`;
  if (intent === 'curiosity') return `Thanks for joining in${name ? `, ${name}` : ''}. What part are you most curious about?`;
  if (intent === 'appreciation') return `Thanks${name ? `, ${name}` : ''}. What part of the post stood out to you most?`;
  if (intent === 'education-keyword') return `Thanks for commenting${name ? `, ${name}` : ''}. What part of your Facebook strategy do you want to improve first?`;
  if (intent === 'question') return `Thanks for asking${name ? `, ${name}` : ''}. What result are you hoping to get?`;
  return `Thanks for commenting${name ? `, ${name}` : ''}. What caught your attention in this post?`;
}

export function ensureCommunityReplySafety(replyText = '', candidate = {}) {
  const reply = normalizedText(replyText).slice(0, 420);
  const classification = classifyCommunityReplyIntent(candidate.commentText);
  const intent = candidate.intent || classification.intent;
  if (['greeting', 'agreement', 'curiosity', 'appreciation'].includes(intent)) {
    return safeCommunityReplyFallback({ ...candidate, intent });
  }
  const context = usableCommunityPostContext(candidate);
  const prohibited = /\b(?:we(?:'re| are) aligned|i was just confirming(?: the details)?|how can i assist you|explore further|applying in your work)\b/i;
  const unsupportedClaim = !context && /\b(?:glad you found it helpful|confirm(?:ing|ed)? the details|on the same page|in your work|our discussion|the point we(?:'re| are) discussing)\b/i.test(reply);
  if (!reply || prohibited.test(reply) || unsupportedClaim || /^you(?:'re| are) absolutely right\b/i.test(reply)) {
    return safeCommunityReplyFallback(candidate);
  }
  return reply;
}

export function communityReplyPrompt(candidate = {}) {
  const classification = classifyCommunityReplyIntent(candidate.commentText);
  const intent = candidate.intent || classification.intent;
  const keyword = candidate.keyword || classification.keyword;
  const context = usableCommunityPostContext(candidate);
  const crmContext = normalizedText(candidate.crmContext).slice(0, 800);
  const instructions = [
    'Write one short Facebook reply in Matthew Murphy\'s warm, direct, educational voice.',
    'Return only the reply text. Use one to three sentences and stay under 420 characters.',
    'Do not use hashtags, a signature, quotation marks, engagement bait, or say you are AI.',
    'Do not invent facts, promise work, offer money, or give legal, medical, or personalized financial advice.',
    'Never invent a prior discussion or claim Matthew was confirming details, that everyone is aligned, that the post helped them, or that they applied it in their work.',
    'Do not say "you are absolutely right," "how can I assist you," "explore further," or "what made you want to join the conversation."',
    'Answer questions directly when the supplied post context supports an answer. If context is insufficient, give one safe practical principle and ask one focused follow-up question.',
    'Except when a question would be unsafe or insensitive, end with exactly one easy-to-answer question grounded in the comment or original post.',
    'Do not repeat a canned question across comments. Prefer a specific invitation such as asking what stood out, what they have tried, or what result they want.',
  ];
  if (intent === 'education-keyword') {
    instructions.push(`The commenter used the short education keyword ${keyword || 'shown below'}. Do not reply with only thanks. Give one concrete Facebook or creator-marketing lesson tied to the original post, then ask one relevant question that helps them apply it.`);
  } else if (intent === 'greeting') {
    instructions.push('Return the greeting naturally. Do not offer assistance or invent a topic; ask what caught their attention in this post.');
  } else if (intent === 'agreement') {
    instructions.push('Thank them for weighing in without declaring them absolutely right or inventing what they agreed with. Ask which part they agreed with most.');
  } else if (intent === 'curiosity') {
    instructions.push('Acknowledge their curiosity without pretending to know its subject when post context is missing. Ask what part they are most curious about.');
  } else if (intent === 'appreciation') {
    instructions.push('Thank them naturally. Only connect the thanks to a topic that appears in the supplied post context, and ask what part of the post stood out.');
  } else if (intent === 'question') {
    instructions.push('Lead with the useful answer, not a greeting. Keep it practical, avoid pretending to know details that are not supplied, and end with one related follow-up question.');
  } else {
    instructions.push('Acknowledge the actual point, add one useful observation, and end with one focused question that moves the conversation forward.');
  }
  return [
    ...instructions,
    `Intent: ${intent}`,
    `Commenter: ${normalizedText(candidate.actorName).slice(0, 160)}`,
    `Comment or question: ${normalizedText(candidate.commentText).slice(0, 600)}`,
    `Original post context: ${context || 'Not captured; stay general and do not invent details.'}`,
    crmContext ? `Private CRM context for tone only; never mention or reveal it: ${crmContext}` : '',
  ].filter(Boolean).join('\n');
}

export function ensureCommunityReplyQuestion(replyText = '', candidate = {}) {
  const reply = ensureCommunityReplySafety(replyText, candidate);
  if (!reply || /[?？]/u.test(reply)) return reply;
  const classification = classifyCommunityReplyIntent(candidate.commentText);
  const intent = candidate.intent || classification.intent;
  const question = intent === 'education-keyword'
    ? 'What part of your Facebook strategy do you want to improve first?'
    : intent === 'greeting'
      ? 'What caught your attention in this post?'
      : intent === 'agreement'
        ? 'Which part did you agree with most?'
        : intent === 'curiosity'
          ? 'What part are you most curious about?'
    : intent === 'question'
      ? 'What result are you hoping to get?'
      : intent === 'appreciation'
        ? 'What part of the post stood out to you most?'
        : 'What caught your attention in this post?';
  const room = Math.max(0, 420 - question.length - 1);
  const lead = reply.slice(0, room).trim().replace(/[,:;\-–—]+$/u, '').trim();
  return `${lead}${lead ? ' ' : ''}${question}`.slice(0, 420);
}
