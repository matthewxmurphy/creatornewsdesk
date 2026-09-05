(function birthdayFactsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module?.exports) module.exports = api;
  else root.SocialDeskBirthdayFacts = api;
}(typeof globalThis === 'object' ? globalThis : this, () => {
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthPattern = MONTHS.join('|');

  function cleanBirthdayText(value) {
    return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  }

  function validAge(value) {
    const age = Number(value);
    return Number.isInteger(age) && age >= 0 && age < 125 ? age : null;
  }

  function validBirthYear(value, reference = new Date()) {
    const year = Number(value);
    return Number.isInteger(year) && year >= 1900 && year <= reference.getFullYear() ? year : null;
  }

  function birthdayOccurrenceYear(monthIndex, day, reference) {
    const candidates = [-1, 0, 1].map((offset) => {
      const year = reference.getFullYear() + offset;
      const date = new Date(year, monthIndex, day, 12, 0, 0, 0);
      return { year, distance: Math.abs(date.valueOf() - reference.valueOf()) };
    });
    candidates.sort((left, right) => left.distance - right.distance);
    return candidates[0].year;
  }

  function ageFromBirthDate(monthIndex, day, year, reference) {
    let age = reference.getFullYear() - year;
    if (reference.getMonth() < monthIndex || (reference.getMonth() === monthIndex && reference.getDate() < day)) age -= 1;
    return validAge(age);
  }

  function parseBirthdayFacts(value, options = {}) {
    const reference = options.now instanceof Date && !Number.isNaN(options.now.valueOf()) ? options.now : new Date();
    const text = cleanBirthdayText(value);
    const dateMatch = text.match(new RegExp(`(${monthPattern})\\s*(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?`, 'i'));
    let monthIndex = dateMatch ? MONTHS.findIndex((month) => month.toLowerCase() === dateMatch[1].toLowerCase()) : -1;
    let day = dateMatch ? Number(dateMatch[2]) : null;
    if (monthIndex < 0 || !Number.isInteger(day) || day < 1 || day > 31) {
      monthIndex = -1;
      day = null;
    }

    if (monthIndex < 0 && options.assumeReferenceDate === true) {
      monthIndex = reference.getMonth();
      day = reference.getDate();
    }

    const monthDay = monthIndex >= 0 ? `${MONTHS[monthIndex]} ${day}` : '';
    let birthYear = validBirthYear(dateMatch?.[3], reference);
    const dateTail = dateMatch ? text.slice((dateMatch.index || 0) + dateMatch[0].length) : text;
    const ageMatch = dateTail.match(/(?:turns?|turned|turning)\s*(\d{1,3})/i)
      || dateTail.match(/(?:^|\D)(\d{1,3})\s*years?\s*old\b/i)
      || text.match(/(?:turns?|turned|turning)\s*(\d{1,3})/i)
      || text.match(/(?:^|\D)(\d{1,3})\s*years?\s*old\b/i);
    let age = validAge(ageMatch?.[1]);

    if (birthYear === null && age !== null && monthIndex >= 0) {
      birthYear = birthdayOccurrenceYear(monthIndex, day, reference) - age;
      birthYear = validBirthYear(birthYear, reference);
    }
    if (age === null && birthYear !== null && monthIndex >= 0) age = ageFromBirthDate(monthIndex, day, birthYear, reference);

    return {
      monthDay,
      birthYear,
      age,
      birthDate: monthDay && birthYear ? `${monthDay}, ${birthYear}` : monthDay,
    };
  }

  function sameBirthdayMonthDay(left, right) {
    const leftFacts = parseBirthdayFacts(left);
    const rightFacts = parseBirthdayFacts(right);
    return Boolean(leftFacts.monthDay && leftFacts.monthDay === rightFacts.monthDay);
  }

  return { MONTHS, cleanBirthdayText, parseBirthdayFacts, sameBirthdayMonthDay };
}));

