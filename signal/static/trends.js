const SignalTrends = (() => {
  const LIMIT = 20;
  const STOP_WORDS = new Set(('a about after again all also am an and any are as at be because been before being but by can could did do does for from get gets had has have he her his how i if in into is it its just may more most new not now of off on one or our out over says say said she so than that the their them then there these they this to up us was we were what when where which who why will with would you your vs via amid').split(' '));

  function tokens(title) {
    const text = title.normalize('NFKC').replace(/\s+[-–—|]\s+[^-–—|]+$/, '').replace(/[’']s\b/gu, '');
    return [...text.matchAll(/[\p{L}\p{N}]+(?:[.&'’-][\p{L}\p{N}]+)*\.?/gu)]
      .map((match) => ({
        text: match[0],
        term: match[0].toLowerCase().replace(/[’]/g, "'").replace(/\.$/, ''),
        index: match.index,
        end: match.index + match[0].length,
        source: text,
      }));
  }

  function significant(token) {
    return token.term.length > 1
      && (!STOP_WORDS.has(token.term) || /^(?:US|U\.S\.?|WHO)$/.test(token.text))
      && /\p{L}/u.test(token.term);
  }

  function named(token) {
    return (significant(token) || token.text === 'New') && /^\p{Lu}/u.test(token.text);
  }

  function adjacent(left, right) {
    return (!left.text.endsWith('.') || /^(?:\p{Lu}\.){2,}$/u.test(left.text))
      && /^\s+$/.test(left.source.slice(left.end, right.index));
  }

  function compute(stories, removed = [], limit = LIMIT) {
    const blocked = new Set(removed.map((term) => term.toLowerCase()));
    const counts = new Map();
    const names = new Set();

    for (const story of stories) {
      const words = tokens(story.header_title);
      const seen = new Set();
      for (let i = 0; i < words.length; i += 1) {
        const word = words[i];
        const nameStart = word.text === 'New' && words[i + 1]
          && named(words[i + 1]) && adjacent(word, words[i + 1]);
        if (!significant(word) && !nameStart) continue;
        // A sentence-initial capital alone is not evidence of a proper noun.
        const sentenceStart = i === 0
          || /[.!?]\s*$/.test(word.source.slice(words[i - 1].index, word.index));
        if (named(word) && (!sentenceStart || /\p{Lu}.*\p{Lu}/u.test(word.text)
            || /^\p{Lu}\p{Ll}+\p{Lu}/u.test(word.text))) {
          names.add(word.term);
        }
        seen.add(word.term);
        let phrase = word.term;
        for (let j = i + 1; j < Math.min(i + 4, words.length); j += 1) {
          if (!significant(words[j]) || !adjacent(words[j - 1], words[j])) break;
          phrase += ` ${words[j].term}`;
          seen.add(phrase);
          if (words.slice(i, j + 1).every(named)) {
            for (const part of words.slice(i, j + 1)) names.add(part.term);
          }
        }
      }
      for (const term of seen) counts.set(term, (counts.get(term) || 0) + 1);
    }

    const candidates = [...counts].filter(([term, count]) =>
      count >= 2 && !blocked.has(term) && (names.has(term) || term.includes(' ')));
    // Prefer a complete phrase over equally frequent fragments of that phrase.
    return candidates.filter(([term, count]) => !candidates.some(([other, total]) =>
      other !== term && total === count && ` ${other} `.includes(` ${term} `)))
      .sort((a, b) => b[1] - a[1]
        || b[0].split(' ').length - a[0].split(' ').length
        || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([term, count]) => ({ term, count }));
  }

  function matches(story, term) {
    const words = tokens(story.header_title);
    const parts = term.split(' ');
    return words.some((word, i) => parts.every((part, offset) =>
      words[i + offset]?.term === part
      && (offset === 0 || adjacent(words[i + offset - 1], words[i + offset]))));
  }

  return { compute, matches };
})();
