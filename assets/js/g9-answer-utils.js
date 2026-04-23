(function () {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function stripDiacritics(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  function firstNonEmptyString() {
    for (const value of arguments) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  function getOptionCount(question) {
    return Array.isArray(question && question.options) ? question.options.length : 0;
  }

  function getOptionLetter(index) {
    return Number.isInteger(index) && index >= 0 ? (LETTERS[index] || String(index + 1)) : '';
  }

  function normalizeComparableText(value) {
    return stripDiacritics(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/[\$`'"’“”]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[^a-z0-9]+/g, '');
  }

  function extractIndexBase(raw) {
    if (!isObject(raw)) return null;
    const baseValue = raw.indexBase ?? raw.base ?? raw.answer_base ?? raw.index_base;
    if (baseValue === 0 || baseValue === '0') return 0;
    if (baseValue === 1 || baseValue === '1') return 1;
    return null;
  }

  function normalizeIndexFromNumber(num, optionCount, indexBase) {
    if (!Number.isInteger(num) || optionCount <= 0) return null;
    if (indexBase === 1) {
      return num >= 1 && num <= optionCount ? num - 1 : null;
    }
    if (indexBase === 0) {
      return num >= 0 && num < optionCount ? num : null;
    }
    if (num >= 0 && num < optionCount) return num;
    if (num === optionCount && optionCount > 0) return optionCount - 1;
    return null;
  }

  function normalizeIndexFromString(raw, question, indexBase) {
    const optionCount = getOptionCount(question);
    if (!optionCount) return null;
    const text = String(raw == null ? '' : raw).trim();
    if (!text) return null;

    const bracketMatch = text.match(/\[\s*(\d+)\s*\]/);
    if (bracketMatch) {
      return normalizeIndexFromNumber(Number(bracketMatch[1]), optionCount, 0);
    }

    const asciiUpper = stripDiacritics(text).toUpperCase();
    const letterMatch = asciiUpper.match(/(?:^|\b)([A-Z])(?:\b|$)/);
    if (letterMatch) {
      const letterIndex = LETTERS.indexOf(letterMatch[1]);
      if (letterIndex >= 0 && letterIndex < optionCount) return letterIndex;
    }

    const numericText = asciiUpper.replace(/[^0-9-]/g, ' ').trim();
    if (numericText) {
      const firstToken = numericText.split(/\s+/)[0];
      const num = Number(firstToken);
      if (Number.isInteger(num)) {
        return normalizeIndexFromNumber(num, optionCount, indexBase);
      }
    }

    const normalizedRaw = normalizeComparableText(text)
      .replace(/^(dapan|phuongan|option|luachon|chon)+/g, '')
      .trim();

    if (!normalizedRaw) return null;

    const options = Array.isArray(question.options) ? question.options : [];
    for (let i = 0; i < options.length; i++) {
      const normalizedOption = normalizeComparableText(options[i]);
      if (!normalizedOption) continue;
      if (normalizedRaw === normalizedOption) return i;
      if (normalizedRaw.length >= 8 && normalizedRaw.endsWith(normalizedOption)) return i;
      if (normalizedOption.length >= 8 && normalizedOption.endsWith(normalizedRaw)) return i;
    }

    return null;
  }

  function resolveMCIndex(raw, question, inheritedIndexBase) {
    const optionCount = getOptionCount(question);
    if (!optionCount || raw == null) return null;

    if (typeof raw === 'number') {
      return normalizeIndexFromNumber(raw, optionCount, inheritedIndexBase ?? null);
    }

    if (typeof raw === 'string') {
      return normalizeIndexFromString(raw, question, inheritedIndexBase ?? null);
    }

    if (Array.isArray(raw)) {
      for (const item of raw) {
        const index = resolveMCIndex(item, question, inheritedIndexBase ?? null);
        if (index !== null) return index;
      }
      return null;
    }

    if (isObject(raw)) {
      const indexBase = extractIndexBase(raw) ?? inheritedIndexBase ?? null;
      const priorityKeys = [
        'correct_index',
        'index',
        'answer_index',
        'correctIndex',
        'answerIndex',
        'correct_answer_index',
        'choice_index',
        'value',
        'answer',
        'correct_answer',
        'option',
        'choice',
        'letter',
        'text',
        'label'
      ];
      for (const key of priorityKeys) {
        if (!(key in raw)) continue;
        const index = resolveMCIndex(raw[key], question, indexBase);
        if (index !== null) return index;
      }
    }

    return null;
  }

  function extractEssayText(raw) {
    if (raw == null) return '';
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      return String(raw).trim();
    }
    if (Array.isArray(raw)) {
      return raw.map(extractEssayText).filter(Boolean).join('; ').trim();
    }
    if (isObject(raw)) {
      const priorityKeys = [
        'final_answer',
        'finalAnswer',
        'answer',
        'solution',
        'result',
        'text',
        'value',
        'summary'
      ];
      for (const key of priorityKeys) {
        if (!(key in raw)) continue;
        const text = extractEssayText(raw[key]);
        if (text) return text;
      }
    }
    return '';
  }

  function extractExplanation(question, externalRaw) {
    if (typeof question.detailed_explanation === 'string' && question.detailed_explanation.trim()) {
      return question.detailed_explanation.trim();
    }
    if (isObject(externalRaw)) {
      return firstNonEmptyString(
        externalRaw.detailed_explanation,
        externalRaw.detailedExplanation,
        externalRaw.explanation,
        externalRaw.solution
      );
    }
    return '';
  }

  function resolveMultipleChoiceAnswer(question, externalRaw) {
    const embeddedIndex = resolveMCIndex(
      question.correct_index ?? question.correctIndex ?? question.answer_index ?? question.answerIndex,
      question,
      0
    );
    const externalIndex = resolveMCIndex(externalRaw, question, null);
    const index = embeddedIndex !== null ? embeddedIndex : externalIndex;
    const text = index !== null && Array.isArray(question.options) ? (question.options[index] ?? '') : '';
    return {
      kind: 'multiple_choice',
      hasAnswer: index !== null,
      index,
      letter: index !== null ? getOptionLetter(index) : '',
      text,
      explanation: extractExplanation(question, externalRaw),
      source: embeddedIndex !== null ? 'chunk' : (externalIndex !== null ? 'answers.json' : null),
      conflict: embeddedIndex !== null && externalIndex !== null && embeddedIndex !== externalIndex
        ? { embeddedIndex, externalIndex }
        : null
    };
  }

  function resolveEssayAnswer(question, externalRaw) {
    const embeddedAnswer = extractEssayText(question.final_answer ?? question.finalAnswer);
    const externalAnswer = extractEssayText(externalRaw);
    return {
      kind: 'essay',
      hasAnswer: !!(embeddedAnswer || externalAnswer || extractExplanation(question, externalRaw)),
      finalAnswer: embeddedAnswer || externalAnswer || '',
      explanation: extractExplanation(question, externalRaw),
      source: embeddedAnswer ? 'chunk' : (externalAnswer ? 'answers.json' : null),
      conflict: null
    };
  }

  function resolveQuestionAnswer(question, rawAnswers) {
    const externalRaw = rawAnswers && question ? rawAnswers[question.chunk_id] : undefined;
    if (!question || !question.type) {
      return {
        kind: 'unknown',
        hasAnswer: false,
        source: null,
        conflict: null
      };
    }
    if (question.type === 'multiple_choice') {
      return resolveMultipleChoiceAnswer(question, externalRaw);
    }
    return resolveEssayAnswer(question, externalRaw);
  }

  function buildAnswerLookup(chunks, rawAnswers) {
    const lookup = {};
    const conflicts = [];
    for (const question of Array.isArray(chunks) ? chunks : []) {
      const resolved = resolveQuestionAnswer(question, rawAnswers || {});
      lookup[question.chunk_id] = resolved;
      if (resolved && resolved.conflict) {
        conflicts.push({
          chunk_id: question.chunk_id,
          embeddedIndex: resolved.conflict.embeddedIndex,
          externalIndex: resolved.conflict.externalIndex
        });
      }
    }
    return { lookup, conflicts };
  }

  function getTopicAnswerStats(chunks, lookup, section) {
    const stats = {
      mcTotal: 0,
      mcResolved: 0,
      essayTotal: 0,
      essayResolved: 0
    };
    for (const question of Array.isArray(chunks) ? chunks : []) {
      if (question.section !== section) continue;
      const resolved = lookup ? lookup[question.chunk_id] : null;
      if (question.type === 'multiple_choice') {
        stats.mcTotal += 1;
        if (resolved && resolved.hasAnswer) stats.mcResolved += 1;
      } else {
        stats.essayTotal += 1;
        if (resolved && resolved.hasAnswer) stats.essayResolved += 1;
      }
    }
    return stats;
  }

  window.G9AnswerUtils = {
    getOptionLetter,
    normalizeComparableText,
    resolveQuestionAnswer,
    buildAnswerLookup,
    getTopicAnswerStats
  };
})();
