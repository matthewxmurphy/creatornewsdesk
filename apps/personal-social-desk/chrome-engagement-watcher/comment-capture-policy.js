(function initCommentCapturePolicy(globalScope) {
  function clean(value = '') {
    return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  }

  function isCommentsManagerUrl(value = '') {
    try {
      const url = new URL(value, 'https://www.facebook.com');
      return /^\/professional_dashboard\/engagement\/comments_manager\/?$/i.test(url.pathname)
        || (url.hostname === 'business.facebook.com' && /^\/latest\/inbox\/facebook\/?$/i.test(url.pathname));
    } catch {
      return false;
    }
  }

  function isBusinessCommentsUrl(value = '') {
    try {
      const url = new URL(value, 'https://business.facebook.com');
      return url.hostname === 'business.facebook.com' && /^\/latest\/inbox\/facebook\/?$/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  function isUnansweredCommentsLabel(value = '') {
    return /^you haven['’]t responded$/i.test(clean(value));
  }

  function isResponseFilterLabel(value = '') {
    return /^(?:all comments|you haven['’]t responded|you['’]ve responded)$/i.test(clean(value));
  }

  function isCommentExpansionLabel(value = '') {
    const label = clean(value);
    return /^(?:view|see|show|load)(?: all)?(?: \d+)?(?: more)? (?:comments?|repl(?:y|ies))$/i.test(label)
      || /^view previous comments$/i.test(label);
  }

  function isMatthewCommentAria(value = '') {
    return /^(?:comment by matthew murphy|reply by matthew murphy\b)/i.test(clean(value));
  }

  const api = {
    clean,
    isCommentsManagerUrl,
    isBusinessCommentsUrl,
    isUnansweredCommentsLabel,
    isResponseFilterLabel,
    isCommentExpansionLabel,
    isMatthewCommentAria,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.SocialDeskCommentCapturePolicy = api;
}(typeof globalThis === 'undefined' ? this : globalThis));
