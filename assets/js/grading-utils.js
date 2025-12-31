/**
 * grading-utils.js - Centralized auto-grading utilities
 * Consolidates duplicate grading logic from script.js
 */
(function() {
  'use strict';

  /**
   * Convert index to letter (0 -> A, 1 -> B, etc.)
   * @param {number} i - Index
   * @returns {string}
   */
  function letterFromIndex(i) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return (i >= 0 && i < alphabet.length) ? alphabet[i] : '?';
  }

  /**
   * Convert letter to index (A -> 0, B -> 1, etc.)
   * @param {string} ch - Letter
   * @returns {number}
   */
  function indexFromLetter(ch) {
    if (!ch) return -1;
    const u = String(ch).toUpperCase();
    const code = u.charCodeAt(0) - 65;
    return (code >= 0 && code < 26) ? code : -1;
  }

  /**
   * Normalize number input (handles both comma and dot decimals)
   * @param {string} str - Input string
   * @returns {number}
   */
  function normalizeNumberInput(str) {
    if (typeof str !== 'string') return NaN;
    const cleaned = str.trim().replace(',', '.');
    return parseFloat(cleaned);
  }

  /**
   * Extract correct MC answer from answers text
   * @param {string} answerText - Model answer text
   * @returns {string|null}
   */
  function extractCorrectMC(answerText) {
    if (!answerText) return null;
    const m = answerText.match(/Đáp án đúng:\s*([A-D])/i);
    return m ? m[1].toUpperCase() : null;
  }

  /**
   * Get expected MC index from question data
   * @param {object} question - Question object
   * @param {string} answerText - Answer text
   * @returns {number|null}
   */
  function getExpectedMCIndex(question, answerText) {
    if (typeof question.correct_index === 'number') return question.correct_index;
    const letter = extractCorrectMC(answerText);
    if (letter) return indexFromLetter(letter);
    return null;
  }

  /**
   * Extract TF answers from answer text
   * @param {string} answerText - Model answer text
   * @returns {object}
   */
  function extractCorrectTF(answerText) {
    const map = {};
    const text = answerText || '';
    const lines = text.split(/\n/);
    const re = /^\s*([a-dA-D])\)\s*(Đúng|Sai)/;
    for (const line of lines) {
      const m = line.match(re);
      if (m) map[m[1].toLowerCase()] = (m[2] === 'Đúng');
    }
    return map;
  }

  /**
   * Parse TF question structure
   * @param {object} question - Question object
   * @returns {object}
   */
  function getTFParsed(question) {
    if (Array.isArray(question.statements) && question.statements.length) {
      const items = question.statements.map((text, i) => ({ key: String.fromCharCode(97 + i), text: text || '' }));
      return { stem: (question.stem || '').replace(/\n/g, '<br>'), items };
    }
    if (question.statements && typeof question.statements === 'object') {
      const items = ['a', 'b', 'c', 'd'].filter(k => k in question.statements)
        .map(k => ({ key: k, text: question.statements[k] || '' }));
      return { stem: (question.stem || '').replace(/\n/g, '<br>'), items };
    }
    return { stem: '', items: [] };
  }

  /**
   * Get expected TF array from question data
   * @param {object} question - Question object
   * @param {string} answerText - Answer text
   * @returns {Array}
   */
  function getExpectedTFArray(question, answerText) {
    const parsed = getTFParsed(question);
    const len = parsed.items.length || 0;
    if (Array.isArray(question.correct_values)) {
      const arr = question.correct_values.slice(0, len);
      while (arr.length < len) arr.push(null);
      return arr;
    }
    const map = extractCorrectTF(answerText || '');
    const out = new Array(len).fill(null);
    for (let i = 0; i < len; i++) {
      const key = String.fromCharCode(97 + i);
      if (typeof map[key] !== 'undefined') out[i] = map[key];
    }
    return out;
  }

  /**
   * Parse expected numeric value from answer text
   * @param {string} answerText - Answer text
   * @returns {object|null}
   */
  function extractCorrectShortNumeric(answerText) {
    if (!answerText) return null;
    const matches = answerText.match(/-?\d+(?:[\.,]\d+)?/g);
    if (!matches || !matches.length) return null;
    const raw = matches[matches.length - 1];
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    const decimals = (hasComma || hasDot) ? (raw.split(hasComma ? ',' : '.')[1] || '').length : 0;
    const value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value)) return null;
    return { value, decimals };
  }

  /**
   * Get expected short answer spec
   * @param {object} question - Question object
   * @param {string} answerText - Answer text
   * @returns {object|null}
   */
  function getExpectedShortSpec(question, answerText) {
    if (question && typeof question.final_answer !== 'undefined' && question.final_answer !== null) {
      const raw = String(question.final_answer).trim();
      if (raw.length) {
        const hasComma = raw.includes(',');
        const hasDot = raw.includes('.');
        const decimals = (hasComma || hasDot) ? (raw.split(hasComma ? ',' : '.')[1] || '').length : 0;
        const value = parseFloat(raw.replace(',', '.'));
        if (!isNaN(value)) return { value, decimals };
      }
    }
    return extractCorrectShortNumeric(answerText);
  }

  /**
   * Grade a single question
   * @param {object} question - Question object
   * @param {*} studentAnswer - Student's answer
   * @param {string} answerText - Model answer text
   * @param {string} parentType - Parent type for grouped questions
   * @returns {object} - { correct: boolean|null, points: number, maxPoints: number }
   */
  function gradeQuestion(question, studentAnswer, answerText, parentType) {
    const qType = question.type || parentType || 'multiple_choice';
    let correct = null;
    let points = 0;
    let maxPoints = 0;

    if (qType === 'multiple_choice') {
      const expectedIdx = getExpectedMCIndex(question, answerText);
      if (expectedIdx !== null && expectedIdx >= 0) {
        maxPoints = 1;
        const stuIdx = (typeof studentAnswer === 'number') ? studentAnswer : indexFromLetter(studentAnswer);
        if (stuIdx === expectedIdx) {
          correct = true;
          points = 1;
        } else if (studentAnswer !== undefined && studentAnswer !== null) {
          correct = false;
        }
      }
    } else if (qType === 'true_false') {
      const expectedArr = getExpectedTFArray(question, answerText);
      const parsed = getTFParsed(question);
      let totalCorrect = 0;
      const total = parsed.items.length;
      
      for (let i = 0; i < expectedArr.length; i++) {
        maxPoints += 1;
        const u = Array.isArray(studentAnswer) 
          ? studentAnswer[i] 
          : (studentAnswer ? studentAnswer[String.fromCharCode(97 + i)] : undefined);
        if (typeof expectedArr[i] === 'boolean' && typeof u === 'boolean' && u === expectedArr[i]) {
          totalCorrect++;
          points += 1;
        }
      }
      correct = (totalCorrect === total && total > 0);
    } else if (qType === 'short') {
      const expected = getExpectedShortSpec(question, answerText);
      if (expected) {
        maxPoints = 1;
        const stuNum = normalizeNumberInput(String(studentAnswer || ''));
        if (!isNaN(stuNum)) {
          const stuStr = stuNum.toFixed(expected.decimals);
          const expStr = expected.value.toFixed(expected.decimals);
          if (stuStr === expStr) {
            correct = true;
            points = 1;
          } else {
            correct = false;
          }
        }
      }
    } else if (qType === 'essay') {
      // Essay questions are not auto-graded
      correct = null;
    }

    return { correct, points, maxPoints, qType };
  }

  /**
   * Grade all questions in exam data
   * @param {object} examData - Exam data with questions array
   * @param {object} studentAnswers - Map of question ID to student answer
   * @param {object} answersMap - Map of question ID to model answer
   * @returns {object} - { totalPoints, maxPoints, details: [] }
   */
  function gradeExam(examData, studentAnswers, answersMap) {
    let totalPoints = 0;
    let maxPoints = 0;
    const details = [];
    const typeStats = {
      multiple_choice: { correct: 0, incorrect: 0 },
      true_false: { correct: 0, incorrect: 0 },
      short: { correct: 0, incorrect: 0 },
      essay: { correct: 0, incorrect: 0 }
    };

    const questions = examData?.questions || [];
    
    for (const q of questions) {
      if (q && q.is_group && Array.isArray(q.sub_questions)) {
        for (const sub of q.sub_questions) {
          const result = gradeQuestion(
            sub,
            studentAnswers[sub.q_id],
            answersMap[sub.q_id] || sub.model_answer || '',
            q.type
          );
          totalPoints += result.points;
          maxPoints += result.maxPoints;
          details.push({
            q_id: sub.q_id,
            type: result.qType,
            correct: result.correct,
            points: result.points,
            maxPoints: result.maxPoints
          });
          
          // Update type stats
          const statKey = result.qType || 'multiple_choice';
          if (typeStats[statKey]) {
            if (result.correct === true) typeStats[statKey].correct++;
            else typeStats[statKey].incorrect++;
          }
        }
      } else if (q) {
        const result = gradeQuestion(
          q,
          studentAnswers[q.q_id],
          answersMap[q.q_id] || q.model_answer || '',
          null
        );
        totalPoints += result.points;
        maxPoints += result.maxPoints;
        details.push({
          q_id: q.q_id,
          type: result.qType,
          correct: result.correct,
          points: result.points,
          maxPoints: result.maxPoints
        });
        
        // Update type stats
        const statKey = result.qType || 'multiple_choice';
        if (typeStats[statKey]) {
          if (result.correct === true) typeStats[statKey].correct++;
          else typeStats[statKey].incorrect++;
        }
      }
    }

    const percent = maxPoints > 0 ? Math.round(100 * totalPoints / maxPoints) : 0;

    return {
      totalPoints,
      maxPoints,
      percent,
      details,
      typeStats
    };
  }

  // Expose utilities globally
  window.GradingUtils = {
    letterFromIndex,
    indexFromLetter,
    normalizeNumberInput,
    extractCorrectMC,
    getExpectedMCIndex,
    extractCorrectTF,
    getTFParsed,
    getExpectedTFArray,
    extractCorrectShortNumeric,
    getExpectedShortSpec,
    gradeQuestion,
    gradeExam
  };
})();
