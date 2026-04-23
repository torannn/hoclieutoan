/**
 * features.js - Comprehensive learning features module
 * Includes: Bookmarks, Statistics, Gamification, AI Tutor, Smart Review
 */

(function() {
  'use strict';

  // ============================================
  // STORAGE KEYS
  // ============================================
  const STORAGE_KEYS = {
    BOOKMARKS: 'hlt_bookmarks',
    STATS: 'hlt_statistics',
    ACHIEVEMENTS: 'hlt_achievements',
    STREAK: 'hlt_streak',
    GOALS: 'hlt_goals',
    LEADERBOARD_CACHE: 'hlt_leaderboard_cache'
  };

  // ============================================
  // 1. BOOKMARK SYSTEM
  // ============================================
  const BookmarkManager = {
    bookmarks: [],

    init() {
      this.load();
      this.setupContextMenu();
      console.log('📌 BookmarkManager initialized with', this.bookmarks.length, 'bookmarks');
    },

    load() {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
        this.bookmarks = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.bookmarks = [];
      }
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(this.bookmarks));
        // Sync to Firebase if available
        if (window.Auth && Auth.getUser() && window.syncToFirebase) {
          syncToFirebase('bookmarks', this.bookmarks);
        }
      } catch (e) {
        console.error('Failed to save bookmarks:', e);
      }
    },

    add(questionData) {
      const bookmark = {
        id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        questionId: questionData.questionId,
        examPath: questionData.examPath,
        examTitle: questionData.examTitle,
        questionIndex: questionData.questionIndex,
        questionText: questionData.questionText,
        questionHtml: questionData.questionHtml,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        userAnswer: questionData.userAnswer,
        isCorrect: questionData.isCorrect,
        modelAnswer: questionData.modelAnswer || '', // Persist model answer
        note: questionData.note || '',
        tags: questionData.tags || [],
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewed: null,
        difficulty: questionData.difficulty || 'medium'
      };
      
      // Check if already bookmarked
      const exists = this.bookmarks.find(b => 
        b.examPath === bookmark.examPath && 
        b.questionIndex === bookmark.questionIndex
      );
      
      if (exists) {
        return { success: false, message: 'Câu hỏi đã được bookmark' };
      }
      
      this.bookmarks.unshift(bookmark);
      this.save();
      
      // Award achievement
      AchievementManager.checkBookmarkAchievements(this.bookmarks.length);
      
      return { success: true, bookmark };
    },

    remove(bookmarkId) {
      const index = this.bookmarks.findIndex(b => b.id === bookmarkId);
      if (index > -1) {
        this.bookmarks.splice(index, 1);
        this.save();
        return true;
      }
      return false;
    },

    getAll() {
      return this.bookmarks;
    },

    getByExam(examPath) {
      return this.bookmarks.filter(b => b.examPath === examPath);
    },

    getForReview(limit = 10) {
      // Prioritize: wrong answers, not reviewed recently, high difficulty
      return [...this.bookmarks]
        .sort((a, b) => {
          let scoreA = 0, scoreB = 0;
          
          // Wrong answers get priority
          if (!a.isCorrect) scoreA += 100;
          if (!b.isCorrect) scoreB += 100;
          
          // Not reviewed recently
          const daysSinceA = a.lastReviewed ? 
            (Date.now() - new Date(a.lastReviewed).getTime()) / (1000 * 60 * 60 * 24) : 999;
          const daysSinceB = b.lastReviewed ? 
            (Date.now() - new Date(b.lastReviewed).getTime()) / (1000 * 60 * 60 * 24) : 999;
          scoreA += Math.min(daysSinceA, 30);
          scoreB += Math.min(daysSinceB, 30);
          
          // Difficulty
          const diffMap = { easy: 1, medium: 2, hard: 3 };
          scoreA += (diffMap[a.difficulty] || 2) * 10;
          scoreB += (diffMap[b.difficulty] || 2) * 10;
          
          return scoreB - scoreA;
        })
        .slice(0, limit);
    },

    markReviewed(bookmarkId) {
      const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
      if (bookmark) {
        bookmark.reviewCount++;
        bookmark.lastReviewed = new Date().toISOString();
        this.save();
      }
    },

    updateNote(bookmarkId, note) {
      const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
      if (bookmark) {
        bookmark.note = note;
        this.save();
      }
    },

    setupContextMenu() {
      // Create context menu element
      const menu = document.createElement('div');
      menu.id = 'bookmark-context-menu';
      menu.className = 'bookmark-context-menu';
      menu.innerHTML = `
        <div class="context-menu-item" data-action="bookmark">
          <i class="fa-solid fa-bookmark"></i>
          <span>Bookmark câu hỏi</span>
        </div>
        <div class="context-menu-item" data-action="bookmark-note">
          <i class="fa-solid fa-note-sticky"></i>
          <span>Bookmark với ghi chú</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="ask-ai">
          <i class="fa-solid fa-robot"></i>
          <span>Hỏi AI về câu này</span>
        </div>
        <div class="context-menu-item" data-action="report">
          <i class="fa-solid fa-flag"></i>
          <span>Báo lỗi câu hỏi</span>
        </div>
      `;
      document.body.appendChild(menu);

      // Context menu state
      let currentQuestionData = null;

      // Helper to get question index from palette node
      const getQuestionIndexFromPalette = (node) => {
        // Palette nodes have data-q attribute or textContent is the question number
        const qAttr = node.dataset?.q;
        if (qAttr !== undefined) return parseInt(qAttr);
        const text = node.textContent?.trim();
        if (text && !isNaN(parseInt(text))) return parseInt(text) - 1; // 1-indexed to 0-indexed
        return null;
      };

      // Helper to find question container by index
      const findQuestionContainer = (index) => {
        // Try various selectors
        const selectors = [
          `[data-question-index="${index}"]`,
          `.question-container:nth-child(${index + 1})`,
          `#exam-questions-container > div:nth-child(${index + 1})`
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return el;
        }
        // Fallback: get all question containers
        const containers = document.querySelectorAll('.question-container, #exam-questions-container > div');
        return containers[index] || null;
      };

      // Right-click handler - ONLY on results screen (after submission)
      document.addEventListener('contextmenu', (e) => {
        // Check if we're on the results screen
        const resultsScreen = document.getElementById('results-screen');
        const isOnResultsScreen = resultsScreen && !resultsScreen.classList.contains('hidden');
        
        // If not on results screen, don't show context menu for questions
        if (!isOnResultsScreen) {
          menu.classList.remove('show');
          return;
        }
        
        // Check if clicking on palette node (results palette)
        const paletteNode = e.target.closest('#results-question-palette button, .qp-node');
        
        // Check if clicking on question container (in results)
        const questionContainer = e.target.closest('.result-item, .question-container, [data-question-index]');
        
        if (!paletteNode && !questionContainer) {
          menu.classList.remove('show');
          return;
        }

        e.preventDefault();
        
        let questionIndex = 0;
        let container = null;
        
        if (paletteNode) {
          // Get index from palette node
          questionIndex = getQuestionIndexFromPalette(paletteNode);
          if (questionIndex === null) {
            // Try to get from position in parent
            const parent = paletteNode.parentElement;
            const nodes = Array.from(parent.children);
            questionIndex = nodes.indexOf(paletteNode);
          }
          container = findQuestionContainer(questionIndex);
        } else if (questionContainer) {
          // Try to get index from id="q-X" (1-indexed) or data attribute
          const idMatch = questionContainer.id?.match(/^q-(\d+)$/);
          if (idMatch) {
            questionIndex = parseInt(idMatch[1]) - 1; // Convert to 0-indexed
          } else if (questionContainer.dataset.questionIndex) {
            questionIndex = parseInt(questionContainer.dataset.questionIndex);
          } else {
            // Fallback: count position among siblings
            const allContainers = document.querySelectorAll('.question-container');
            questionIndex = Array.from(allContainers).indexOf(questionContainer);
          }
          container = questionContainer;
        }
        
        // Always use global data as primary source (most reliable)
        currentQuestionData = this.extractQuestionDataFromGlobal(questionIndex);
        
        // Debug log
        console.log('📌 Bookmark context - Index:', questionIndex, 'Data:', currentQuestionData);
        
        // Position menu using clientX/clientY (viewport coords) for fixed positioning
        const menuWidth = 220;
        const menuHeight = 180;
        let x = e.clientX;
        let y = e.clientY;
        
        // Ensure menu stays within viewport
        if (x + menuWidth > window.innerWidth) {
          x = window.innerWidth - menuWidth - 10;
        }
        if (y + menuHeight > window.innerHeight) {
          y = window.innerHeight - menuHeight - 10;
        }
        
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.add('show');
        
        // Check if already bookmarked
        const isBookmarked = this.bookmarks.some(b => 
          b.examPath === currentQuestionData.examPath && 
          b.questionIndex === currentQuestionData.questionIndex
        );
        
        const bookmarkItem = menu.querySelector('[data-action="bookmark"]');
        if (isBookmarked) {
          bookmarkItem.innerHTML = '<i class="fa-solid fa-bookmark-slash"></i><span>Bỏ bookmark</span>';
          bookmarkItem.dataset.action = 'unbookmark';
        } else {
          bookmarkItem.innerHTML = '<i class="fa-solid fa-bookmark"></i><span>Bookmark câu hỏi</span>';
          bookmarkItem.dataset.action = 'bookmark';
        }
      });

      // Hide menu on click outside or scroll
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.remove('show');
        }
      });
      
      document.addEventListener('scroll', () => {
        menu.classList.remove('show');
      }, true);

      // Menu item click handlers
      menu.addEventListener('click', async (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item || !currentQuestionData) return;

        const action = item.dataset.action;
        menu.classList.remove('show');

        switch (action) {
          case 'bookmark':
            const result = this.add(currentQuestionData);
            if (result.success) {
              this.showToast('✅ Đã bookmark câu hỏi!', 'success');
            } else {
              this.showToast(result.message, 'info');
            }
            break;

          case 'unbookmark':
            const existing = this.bookmarks.find(b => 
              b.examPath === currentQuestionData.examPath && 
              b.questionIndex === currentQuestionData.questionIndex
            );
            if (existing) {
              this.remove(existing.id);
              this.showToast('🗑️ Đã bỏ bookmark!', 'success');
            }
            break;

          case 'bookmark-note':
            const { value: note } = await Swal.fire({
              title: 'Ghi chú cho câu hỏi',
              input: 'textarea',
              inputPlaceholder: 'Nhập ghi chú của bạn...',
              showCancelButton: true,
              confirmButtonText: 'Lưu',
              cancelButtonText: 'Hủy'
            });
            if (note !== undefined) {
              currentQuestionData.note = note;
              const res = this.add(currentQuestionData);
              if (res.success) {
                this.showToast('✅ Đã bookmark với ghi chú!', 'success');
              }
            }
            break;

          case 'ask-ai':
            AITutor.askAboutQuestion(currentQuestionData);
            break;

          case 'report':
            this.reportQuestion(currentQuestionData);
            break;
        }
      });
    },

    extractQuestionData(container, questionIndex) {
      const examPath = window.currentExamPath || location.hash.match(/path=([^&]+)/)?.[1] || '';
      const examTitle = document.querySelector('#exam-title-header, #exam-title, .exam-title')?.textContent || 'Đề kiểm tra';
      
      // Try to get question ID from container
      const qId = container.dataset?.qid || container.id?.replace('q-', '') || null;
      
      // PRIORITY: Use global currentExamData if available (most reliable)
      if (window.currentExamData && window.currentExamData.questions) {
        const globalData = this.extractQuestionDataFromGlobal(questionIndex);
        if (globalData.options.length > 0) {
          // Merge with any DOM-specific data (like user's current selection)
          const selectedInput = container.querySelector('input:checked');
          if (selectedInput) {
            const selectedValue = selectedInput.value;
            // Map value to letter (0->A, 1->B, etc)
            if (!isNaN(parseInt(selectedValue))) {
              globalData.userAnswer = String.fromCharCode(65 + parseInt(selectedValue));
            } else {
              globalData.userAnswer = selectedValue;
            }
          }
          return globalData;
        }
      }
      
      // Fallback: Extract from DOM
      let questionTextEl = container.querySelector('.question-text, .prose > p, .prose');
      if (!questionTextEl) {
        questionTextEl = container.querySelector('p, div');
      }
      const questionText = questionTextEl?.textContent?.trim() || '';
      const questionHtml = questionTextEl?.innerHTML || '';
      
      // Get options from DOM
      const options = [];
      const optionSelectors = [
        'label:has(input[type="radio"])',
        'label:has(input[type="checkbox"])',
        '.option',
        '[data-option]'
      ];
      
      let optionElements = [];
      for (const sel of optionSelectors) {
        try {
          const found = container.querySelectorAll(sel);
          if (found.length > 0) {
            optionElements = found;
            break;
          }
        } catch (e) {}
      }
      
      optionElements.forEach((opt, i) => {
        const label = String.fromCharCode(65 + i);
        let text = opt.textContent?.trim() || '';
        // Remove radio button text and label prefix
        text = text.replace(/^[A-D][.\):\s]+/, '').trim();
        options.push({ label, text, html: opt.innerHTML });
      });
      
      // Get selected answer
      const selectedInput = container.querySelector('input:checked');
      let userAnswer = null;
      if (selectedInput) {
        const val = selectedInput.value;
        userAnswer = !isNaN(parseInt(val)) ? String.fromCharCode(65 + parseInt(val)) : val;
      }
      
      return {
        questionId: qId || `${examPath}_q${questionIndex}`,
        examPath: decodeURIComponent(examPath),
        examTitle,
        questionIndex,
        questionText,
        questionHtml,
        options,
        correctAnswer: null,
        userAnswer,
        isCorrect: false
      };
    },

    // Extract question data from global currentExamData when container not found
    extractQuestionDataFromGlobal(questionIndex) {
      const examData = window.currentExamData;
      const examPath = window.currentExamPath || location.hash.match(/path=([^&]+)/)?.[1] || '';
      const examTitle = document.querySelector('#exam-title-header, #exam-title')?.textContent || 'Đề kiểm tra';
      
      if (!examData || !examData.questions) {
        return this.createEmptyQuestionData(examPath, examTitle, questionIndex);
      }
      
      // Find the question - handle both flat and grouped structures
      let q = null;
      let actualIndex = 0;
      
      for (const question of examData.questions) {
        if (question.is_group && Array.isArray(question.sub_questions)) {
          // Grouped questions
          for (const sub of question.sub_questions) {
            if (actualIndex === questionIndex) {
              q = sub;
              break;
            }
            actualIndex++;
          }
        } else {
          if (actualIndex === questionIndex) {
            q = question;
            break;
          }
          actualIndex++;
        }
        if (q) break;
      }
      
      if (!q) {
        // Fallback: try direct index access
        q = examData.questions[questionIndex];
      }
      
      if (!q) {
        return this.createEmptyQuestionData(examPath, examTitle, questionIndex);
      }
      
      const options = [];
      
      // Parse options from question data - handle exam.json format
      // Format 1: options array (most common in exam.json)
      if (q.options && Array.isArray(q.options)) {
        q.options.forEach((opt, i) => {
          const label = String.fromCharCode(65 + i); // A, B, C, D
          const text = typeof opt === 'string' ? opt : (opt.text || opt.content || '');
          options.push({ label, text, html: text });
        });
      }
      // Format 2: A, B, C, D properties
      else if (q.A !== undefined) {
        ['A', 'B', 'C', 'D'].forEach(letter => {
          if (q[letter]) {
            options.push({ label: letter, text: q[letter], html: q[letter] });
          }
        });
      }
      
      // Get correct answer
      let correctAnswer = null;
      if (q.correct_index !== undefined && options[q.correct_index]) {
        correctAnswer = options[q.correct_index].label; // A, B, C, or D
      } else if (q.answer) {
        correctAnswer = q.answer;
      } else if (q.correctAnswer) {
        correctAnswer = q.correctAnswer;
      }
      
      // Get user's answer from studentAnswers
      const qId = q.id || q.q_id || `q${questionIndex}`;
      let userAnswer = null;
      if (window.studentAnswers) {
        userAnswer = window.studentAnswers[qId] || window.studentAnswers[questionIndex] || null;
      }
      
      // Get question text - exam.json uses "stem" field
      const questionText = q.stem || q.question || q.text || q.content || `Câu ${questionIndex + 1}`;
      
      // Get model answer/solution from answersMap or question's model_answer
      let modelAnswer = '';
      if (window.answersMap && (window.answersMap[qId] || window.answersMap[q.q_id])) {
        modelAnswer = window.answersMap[qId] || window.answersMap[q.q_id];
      } else if (q.model_answer) {
        modelAnswer = q.model_answer;
      } else if (q.explanation) { // Thêm trường explanation nếu có
        modelAnswer = q.explanation;
      }
      
      console.log(`[Features] Extracted data for Q${questionIndex}:`, { qId, hasModelAnswer: !!modelAnswer });

      // Determine if answer is correct
      let isCorrect = false;
      if (q.type === 'multiple_choice' && q.correct_index !== undefined) {
        const userIdx = typeof userAnswer === 'number' ? userAnswer : null;
        isCorrect = userIdx === q.correct_index;
      } else if (correctAnswer && userAnswer) {
        isCorrect = correctAnswer === userAnswer;
      }
      
      return {
        questionId: qId,
        examPath: decodeURIComponent(examPath),
        examTitle,
        questionIndex,
        questionText,
        questionHtml: questionText,
        options,
        correctAnswer,
        userAnswer,
        isCorrect,
        isSkipped: userAnswer === null || userAnswer === undefined,
        section: q.section || '',
        type: q.type || 'multiple_choice',
        modelAnswer // Include the detailed solution
      };
    },

    createEmptyQuestionData(examPath, examTitle, questionIndex) {
      return {
        questionId: `${examPath}_q${questionIndex}`,
        examPath: decodeURIComponent(examPath),
        examTitle,
        questionIndex,
        questionText: `Câu ${questionIndex + 1}`,
        questionHtml: '',
        options: [],
        correctAnswer: null,
        userAnswer: null,
        isCorrect: false
      };
    },

    showToast(message, type = 'info') {
      if (window.Swal) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: type,
          title: message,
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
      }
    },

    async reportQuestion(questionData) {
      const { value: reason } = await Swal.fire({
        title: 'Báo lỗi câu hỏi',
        input: 'select',
        inputOptions: {
          'wrong_answer': 'Đáp án sai',
          'typo': 'Lỗi chính tả',
          'unclear': 'Câu hỏi không rõ ràng',
          'duplicate': 'Câu hỏi trùng lặp',
          'other': 'Lý do khác'
        },
        inputPlaceholder: 'Chọn lý do',
        showCancelButton: true,
        confirmButtonText: 'Gửi báo cáo',
        cancelButtonText: 'Hủy'
      });

      if (reason) {
        // Save report locally or send to server
        console.log('Report:', { questionData, reason });
        this.showToast('📨 Đã gửi báo cáo. Cảm ơn bạn!', 'success');
      }
    }
  };

  // ============================================
  // 2. STATISTICS SYSTEM
  // ============================================
  const StatisticsManager = {
    stats: null,

    init() {
      this.load();
      console.log('📊 StatisticsManager initialized');
    },

    load() {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.STATS);
        this.stats = saved ? JSON.parse(saved) : this.getDefaultStats();
      } catch (e) {
        this.stats = this.getDefaultStats();
      }
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(this.stats));
        if (window.Auth && Auth.getUser() && window.syncToFirebase) {
          syncToFirebase('statistics', this.stats);
        }
      } catch (e) {
        console.error('Failed to save stats:', e);
      }
    },

    getDefaultStats() {
      return {
        totalExams: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        totalTimeSpent: 0, // in seconds
        examsByGrade: {},
        examsByType: {},
        dailyActivity: {},
        weeklyProgress: [],
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        questionTypeStats: {
          multipleChoice: { total: 0, correct: 0 },
          trueFalse: { total: 0, correct: 0 },
          fillBlank: { total: 0, correct: 0 }
        }
      };
    },

    recordExamAttempt(attemptData) {
      const { 
        examPath, 
        grade, 
        score, 
        totalQuestions, 
        correctAnswers, 
        timeSpent,
        questionResults 
      } = attemptData;

      // Update totals
      this.stats.totalExams++;
      this.stats.totalQuestions += totalQuestions;
      this.stats.correctAnswers += correctAnswers;
      this.stats.totalTimeSpent += timeSpent;

      // Update averages
      this.stats.averageScore = Math.round(
        (this.stats.correctAnswers / this.stats.totalQuestions) * 100
      );
      
      // Update best score
      const currentScore = Math.round((correctAnswers / totalQuestions) * 100);
      if (currentScore > this.stats.bestScore) {
        this.stats.bestScore = currentScore;
      }

      // Update by grade
      if (!this.stats.examsByGrade[grade]) {
        this.stats.examsByGrade[grade] = { count: 0, totalScore: 0 };
      }
      this.stats.examsByGrade[grade].count++;
      this.stats.examsByGrade[grade].totalScore += currentScore;

      // Update daily activity
      const today = new Date().toISOString().split('T')[0];
      if (!this.stats.dailyActivity[today]) {
        this.stats.dailyActivity[today] = { exams: 0, questions: 0, timeSpent: 0 };
      }
      this.stats.dailyActivity[today].exams++;
      this.stats.dailyActivity[today].questions += totalQuestions;
      this.stats.dailyActivity[today].timeSpent += timeSpent;

      // Update streak
      this.updateStreak();

      // Update question type stats if available
      if (questionResults) {
        questionResults.forEach(q => {
          const type = q.type || 'multipleChoice';
          if (this.stats.questionTypeStats[type]) {
            this.stats.questionTypeStats[type].total++;
            if (q.isCorrect) this.stats.questionTypeStats[type].correct++;
          }
        });
      }

      this.stats.lastActivityDate = new Date().toISOString();
      this.save();

      // Check achievements
      AchievementManager.checkStatsAchievements(this.stats);

      return this.stats;
    },

    updateStreak() {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (this.stats.lastActivityDate) {
        const lastDate = this.stats.lastActivityDate.split('T')[0];
        
        if (lastDate === today) {
          // Already active today, no change
        } else if (lastDate === yesterday) {
          // Consecutive day
          this.stats.currentStreak++;
        } else {
          // Streak broken
          this.stats.currentStreak = 1;
        }
      } else {
        this.stats.currentStreak = 1;
      }

      if (this.stats.currentStreak > this.stats.longestStreak) {
        this.stats.longestStreak = this.stats.currentStreak;
      }
    },

    getStats() {
      return this.stats;
    },

    getWeeklyData() {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const dayData = this.stats.dailyActivity[date] || { exams: 0, questions: 0, timeSpent: 0 };
        data.push({
          date,
          dayName: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(date).getDay()],
          ...dayData
        });
      }
      return data;
    },

    getMonthlyData() {
      const data = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const dayData = this.stats.dailyActivity[date] || { exams: 0, questions: 0, timeSpent: 0 };
        data.push({ date, ...dayData });
      }
      return data;
    }
  };

  // ============================================
  // 3. ACHIEVEMENT/GAMIFICATION SYSTEM
  // ============================================
  const AchievementManager = {
    achievements: [],
    definitions: [
      // Exam achievements
      { id: 'first_exam', name: 'Khởi đầu', desc: 'Hoàn thành đề kiểm tra đầu tiên', icon: '🎯', category: 'exam' },
      { id: 'exam_10', name: 'Chăm chỉ', desc: 'Hoàn thành 10 đề kiểm tra', icon: '📚', category: 'exam' },
      { id: 'exam_50', name: 'Siêng năng', desc: 'Hoàn thành 50 đề kiểm tra', icon: '🏆', category: 'exam' },
      { id: 'exam_100', name: 'Học giả', desc: 'Hoàn thành 100 đề kiểm tra', icon: '👑', category: 'exam' },
      
      // Score achievements
      { id: 'perfect_score', name: 'Hoàn hảo', desc: 'Đạt điểm 10/10 trong một đề', icon: '💯', category: 'score' },
      { id: 'high_score_5', name: 'Xuất sắc', desc: 'Đạt trên 8 điểm 5 lần', icon: '⭐', category: 'score' },
      { id: 'avg_80', name: 'Ổn định', desc: 'Điểm trung bình trên 80%', icon: '📈', category: 'score' },
      
      // Streak achievements
      { id: 'streak_3', name: 'Kiên trì', desc: 'Học 3 ngày liên tiếp', icon: '🔥', category: 'streak' },
      { id: 'streak_7', name: 'Tuần lễ vàng', desc: 'Học 7 ngày liên tiếp', icon: '🌟', category: 'streak' },
      { id: 'streak_30', name: 'Tháng hoàn hảo', desc: 'Học 30 ngày liên tiếp', icon: '💎', category: 'streak' },
      
      // Bookmark achievements
      { id: 'bookmark_1', name: 'Ghi chú', desc: 'Bookmark câu hỏi đầu tiên', icon: '📌', category: 'bookmark' },
      { id: 'bookmark_10', name: 'Sưu tầm', desc: 'Bookmark 10 câu hỏi', icon: '📑', category: 'bookmark' },
      { id: 'bookmark_50', name: 'Thư viện', desc: 'Bookmark 50 câu hỏi', icon: '📚', category: 'bookmark' },
      
      // Time achievements
      { id: 'time_1h', name: 'Tập trung', desc: 'Học tổng cộng 1 giờ', icon: '⏰', category: 'time' },
      { id: 'time_10h', name: 'Chuyên cần', desc: 'Học tổng cộng 10 giờ', icon: '⏱️', category: 'time' },
      { id: 'time_100h', name: 'Master', desc: 'Học tổng cộng 100 giờ', icon: '🎖️', category: 'time' },
      
      // Special achievements
      { id: 'night_owl', name: 'Cú đêm', desc: 'Học sau 11 giờ đêm', icon: '🦉', category: 'special' },
      { id: 'early_bird', name: 'Chim sớm', desc: 'Học trước 6 giờ sáng', icon: '🐦', category: 'special' },
      { id: 'weekend_warrior', name: 'Chiến binh cuối tuần', desc: 'Học vào cả 2 ngày cuối tuần', icon: '⚔️', category: 'special' }
    ],

    init() {
      this.load();
      console.log('🏆 AchievementManager initialized with', this.achievements.length, 'unlocked');
    },

    load() {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
        this.achievements = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.achievements = [];
      }
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(this.achievements));
      } catch (e) {
        console.error('Failed to save achievements:', e);
      }
    },

    unlock(achievementId) {
      if (this.achievements.includes(achievementId)) return false;
      
      const achievement = this.definitions.find(a => a.id === achievementId);
      if (!achievement) return false;

      this.achievements.push(achievementId);
      this.save();

      // Show notification
      this.showUnlockNotification(achievement);
      
      return true;
    },

    showUnlockNotification(achievement) {
      if (window.Swal) {
        Swal.fire({
          title: '🎉 Thành tựu mới!',
          html: `
            <div class="achievement-unlock">
              <div class="achievement-icon">${achievement.icon}</div>
              <div class="achievement-name">${achievement.name}</div>
              <div class="achievement-desc">${achievement.desc}</div>
            </div>
          `,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            popup: 'achievement-popup'
          }
        });
      }
    },

    checkStatsAchievements(stats) {
      // Exam count achievements
      if (stats.totalExams >= 1) this.unlock('first_exam');
      if (stats.totalExams >= 10) this.unlock('exam_10');
      if (stats.totalExams >= 50) this.unlock('exam_50');
      if (stats.totalExams >= 100) this.unlock('exam_100');

      // Score achievements
      if (stats.averageScore >= 80) this.unlock('avg_80');

      // Streak achievements
      if (stats.currentStreak >= 3) this.unlock('streak_3');
      if (stats.currentStreak >= 7) this.unlock('streak_7');
      if (stats.currentStreak >= 30) this.unlock('streak_30');

      // Time achievements
      const hours = stats.totalTimeSpent / 3600;
      if (hours >= 1) this.unlock('time_1h');
      if (hours >= 10) this.unlock('time_10h');
      if (hours >= 100) this.unlock('time_100h');

      // Special time-based achievements
      const hour = new Date().getHours();
      if (hour >= 23 || hour < 4) this.unlock('night_owl');
      if (hour >= 4 && hour < 6) this.unlock('early_bird');
    },

    checkBookmarkAchievements(count) {
      if (count >= 1) this.unlock('bookmark_1');
      if (count >= 10) this.unlock('bookmark_10');
      if (count >= 50) this.unlock('bookmark_50');
    },

    checkScoreAchievement(score, totalQuestions) {
      if (score === totalQuestions) this.unlock('perfect_score');
    },

    getAll() {
      return this.definitions.map(def => ({
        ...def,
        unlocked: this.achievements.includes(def.id),
        unlockedAt: null // Could track unlock dates
      }));
    },

    getUnlocked() {
      return this.definitions.filter(def => this.achievements.includes(def.id));
    },

    getProgress() {
      return {
        unlocked: this.achievements.length,
        total: this.definitions.length,
        percentage: Math.round((this.achievements.length / this.definitions.length) * 100)
      };
    }
  };

  // ============================================
  // 4. AI TUTOR SYSTEM
  // ============================================
  const AITutor = {
    model: 'llama-3.3-70b-versatile',
    conversationHistory: [],
    isOpen: false,
    lastQuestionContext: '',
    lastStructuredQuestion: null,
    lastResponseAudit: null,
    pendingAuditPayload: null,

    init() {
      this.createUI();
      console.log('🤖 AITutor initialized');
    },

    createUI() {
      // Create floating button
      const fab = document.createElement('button');
      fab.id = 'ai-tutor-fab';
      fab.className = 'ai-tutor-fab';
      fab.innerHTML = '<i class="fa-solid fa-robot"></i>';
      fab.title = 'Hỏi AI Tutor';
      document.body.appendChild(fab);

      // Create chat panel
      const panel = document.createElement('div');
      panel.id = 'ai-tutor-panel';
      panel.className = 'ai-tutor-panel';
      panel.innerHTML = `
        <!-- Resize handles -->
        <div class="ai-resize-handle ai-resize-handle-n" data-resize="n"></div>
        <div class="ai-resize-handle ai-resize-handle-w" data-resize="w"></div>
        <div class="ai-resize-handle ai-resize-handle-nw" data-resize="nw">
          <div class="ai-resize-grip"><span></span><span></span><span></span><span></span></div>
        </div>
        <div class="ai-tutor-header">
          <div class="ai-tutor-title">
            <i class="fa-solid fa-robot"></i>
            <span>AI Tutor</span>
          </div>
          <div class="ai-tutor-actions">
            <button class="ai-tutor-btn" id="ai-bookmarks-btn" title="Bookmarks">
              <i class="fa-solid fa-bookmark"></i>
            </button>
            <button class="ai-tutor-btn" id="ai-presets-btn" title="Prompting">
              <i class="fa-solid fa-sliders"></i>
            </button>
            <button class="ai-tutor-btn" id="ai-features" title="Tính năng">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </button>
            <button class="ai-tutor-btn" id="ai-clear-chat" title="Xóa hội thoại">
              <i class="fa-solid fa-trash"></i>
            </button>
            <button class="ai-tutor-btn" id="ai-close" title="Đóng">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
        <div class="ai-tutor-body">
          <div id="ai-side-panel" class="ai-tutor-side hidden">
            <div class="ai-side-header">
              <div class="ai-side-title" id="ai-side-title">Bookmarks</div>
              <button id="ai-side-close" class="ai-side-close" title="Đóng">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div id="ai-bookmarks" class="ai-tutor-bookmarks hidden">
              <div class="ai-bookmarks-list" id="ai-bookmarks-list"></div>
            </div>
            <div id="ai-preset-buttons" class="ai-preset-container hidden"></div>
          </div>
          <div class="ai-tutor-main">
            <div class="ai-tutor-messages" id="ai-messages">
              <div class="ai-message ai-message-bot">
                <div class="ai-message-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="ai-message-content">
                  Xin chào! Tôi là AI Tutor. Tôi có thể giúp bạn:
                  <ul>
                    <li>📖 Giải thích câu hỏi đã bookmark</li>
                    <li>✏️ Hướng dẫn giải bài tập từng bước</li>
                    <li>📐 Tra cứu công thức Toán học</li>
                    <li>📊 Phân tích kết quả học tập</li>
                    <li>🎯 Tạo bài tập tương tự để luyện tập</li>
                  </ul>
                  Nhấn <strong>✨</strong> để xem tất cả tính năng!
                </div>
              </div>
            </div>
            <div class="ai-tutor-input">
              <textarea id="ai-input" placeholder="Nhập câu hỏi của bạn..." rows="1"></textarea>
              <button id="ai-send" class="ai-send-btn">
                <i class="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);

      // Event listeners
      fab.addEventListener('click', () => this.toggle());
      document.getElementById('ai-close').addEventListener('click', () => this.close());
      document.getElementById('ai-clear-chat').addEventListener('click', () => this.clearChat());
      document.getElementById('ai-features').addEventListener('click', () => this.showQuickActions());
      document.getElementById('ai-send').addEventListener('click', () => this.sendMessage());

      const sidePanel = document.getElementById('ai-side-panel');
      const sideTitle = document.getElementById('ai-side-title');
      const sideClose = document.getElementById('ai-side-close');

      const bookmarksBtn = document.getElementById('ai-bookmarks-btn');
      const presetsBtn = document.getElementById('ai-presets-btn');
      const bookmarksPanel = document.getElementById('ai-bookmarks');
      const presetsPanel = document.getElementById('ai-preset-buttons');
      if (bookmarksBtn && bookmarksPanel) {
        bookmarksBtn.addEventListener('click', () => {
          if (sidePanel) sidePanel.classList.remove('hidden');
          if (sideTitle) sideTitle.textContent = 'Bookmarks';
          bookmarksPanel.classList.remove('hidden');
          if (presetsPanel) presetsPanel.classList.add('hidden');
          this.loadBookmarks();
        });
      }
      if (presetsBtn && presetsPanel) {
        presetsBtn.addEventListener('click', () => {
          if (sidePanel) sidePanel.classList.remove('hidden');
          if (sideTitle) sideTitle.textContent = 'Prompting';
          presetsPanel.classList.remove('hidden');
          if (bookmarksPanel) bookmarksPanel.classList.add('hidden');
          if (typeof this.lastQuestionContext === 'string' && this.lastQuestionContext) {
            this.showPresetButtons(this.lastQuestionContext);
          } else {
            this.showPresetButtons('');
          }
        });
      }

      if (sideClose && sidePanel) {
        sideClose.addEventListener('click', () => {
          sidePanel.classList.add('hidden');
          if (bookmarksPanel) bookmarksPanel.classList.add('hidden');
          if (presetsPanel) presetsPanel.classList.add('hidden');
        });
      }
      
      const input = document.getElementById('ai-input');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Auto-resize textarea
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });

      // Setup custom resize functionality
      this.setupResize(panel);
    },

    setupResize(panel) {
      const handles = panel.querySelectorAll('.ai-resize-handle');
      let isResizing = false;
      let currentHandle = null;
      let startX, startY, startWidth, startHeight, startLeft, startTop;

      handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          isResizing = true;
          currentHandle = handle.dataset.resize;
          
          const rect = panel.getBoundingClientRect();
          startX = e.clientX;
          startY = e.clientY;
          startWidth = rect.width;
          startHeight = rect.height;
          startLeft = rect.left;
          startTop = rect.top;
          
          document.body.style.cursor = handle.style.cursor;
          document.body.style.userSelect = 'none';
        });
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        if (currentHandle.includes('w')) {
          const newWidth = Math.max(320, startWidth - dx);
          panel.style.width = newWidth + 'px';
        }
        
        if (currentHandle.includes('n')) {
          const newHeight = Math.max(300, startHeight - dy);
          panel.style.height = newHeight + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          currentHandle = null;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });

      // Touch support for mobile
      handles.forEach(handle => {
        handle.addEventListener('touchstart', (e) => {
          const touch = e.touches[0];
          isResizing = true;
          currentHandle = handle.dataset.resize;
          
          const rect = panel.getBoundingClientRect();
          startX = touch.clientX;
          startY = touch.clientY;
          startWidth = rect.width;
          startHeight = rect.height;
        }, { passive: true });
      });

      document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        
        if (currentHandle.includes('w')) {
          const newWidth = Math.max(320, startWidth - dx);
          panel.style.width = newWidth + 'px';
        }
        
        if (currentHandle.includes('n')) {
          const newHeight = Math.max(300, startHeight - dy);
          panel.style.height = newHeight + 'px';
        }
      }, { passive: true });

      document.addEventListener('touchend', () => {
        isResizing = false;
        currentHandle = null;
      });
    },

    toggle() {
      this.isOpen = !this.isOpen;
      const panel = document.getElementById('ai-tutor-panel');
      const fab = document.getElementById('ai-tutor-fab');
      
      if (this.isOpen) {
        panel.classList.add('open');
        fab.classList.add('active');
        this.loadBookmarks();
      } else {
        // Closing animation
        panel.style.transform = 'translateY(20px) scale(0.9)';
        panel.style.opacity = '0';
        
        setTimeout(() => {
          panel.classList.remove('open');
          panel.style.transform = '';
          panel.style.opacity = '';
          fab.classList.remove('active');
        }, 300);
      }
    },

    open() {
      if (!this.isOpen) this.toggle();
    },

    close() {
      if (this.isOpen) this.toggle();
    },

    isDebugEnabled() {
      try {
        const params = new URLSearchParams(window.location.search || '');
        return params.get('ai_debug') === '1' || localStorage.getItem('ai_debug') === '1';
      } catch (error) {
        return localStorage.getItem('ai_debug') === '1';
      }
    },

    setDebugEnabled(enabled) {
      try {
        localStorage.setItem('ai_debug', enabled ? '1' : '0');
      } catch (error) {
      }
      return this.isDebugEnabled();
    },

    normalizeAuditText(text) {
      return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    },

    extractAuditKeywords(text, limit = 12) {
      const stopWords = new Set(['giai', 'cac', 'sau', 'cho', 'voi', 'mot', 'hai', 'ba', 'bon', 'nhung', 'hay', 'the', 'va', 'cua', 'trong', 'neu', 'khi', 'roi', 'theo', 'dang', 'bai', 'toan', 'phuong', 'trinh', 'he', 'bat', 'phuong', 'minh', 'tinh', 'gia', 'tri']);
      const tokens = this.normalizeAuditText(text)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length >= 3 && !stopWords.has(token));
      return [...new Set(tokens)].slice(0, limit);
    },

    buildStructuredQuestionPrompt(questionData) {
      const lines = ['Hãy hướng dẫn tôi giải bài toán này từng bước.', ''];
      if (questionData.topicTitle) lines.push(`[Chủ đề] ${questionData.topicTitle}`);
      if (questionData.questionId) lines.push(`[Mã câu] ${questionData.questionId}`);
      if (questionData.questionType) lines.push(`[Loại câu] ${questionData.questionType}`);
      if (questionData.questionNumber) lines.push(`[Câu trong phiên] ${questionData.questionNumber}`);
      if (questionData.sessionLength) lines.push(`[Tổng số câu trong phiên] ${questionData.sessionLength}`);

      lines.push('', '[Đề bài]', questionData.prompt || '');

      if (questionData.subparts && questionData.subparts.length) {
        lines.push('', '[Các ý của bài toán]');
        questionData.subparts.forEach(part => {
          lines.push(`${part.label || '-'} ${part.text || ''}`.trim());
        });
      }

      if (questionData.options && questionData.options.length) {
        lines.push('', '[Các đáp án]');
        questionData.options.forEach(option => {
          lines.push(`${option.label || '-'}. ${option.text || ''}`.trim());
        });
      }

      if (questionData.userAnswerLabel) {
        lines.push('', `[Lựa chọn của học sinh] ${questionData.userAnswerLabel}`);
      }

      if (questionData.answer && questionData.answer.hasAnswer) {
        if (questionData.answer.kind === 'multiple_choice') {
          lines.push('', '[Đáp án đúng]', `${questionData.answer.letter || ''}${questionData.answer.text ? ` — ${questionData.answer.text}` : ''}`.trim());
        } else if (questionData.answer.finalAnswer) {
          lines.push('', '[Đáp án tham khảo]', questionData.answer.finalAnswer);
        }
        if (questionData.answer.explanation) {
          lines.push('', '[Lời giải tham khảo]', questionData.answer.explanation);
        }
      }

      lines.push('', '[Yêu cầu cho AI]');
      lines.push('1. Nhắc lại đầy đủ dữ kiện của đề trước khi giải.');
      lines.push('2. Nếu bài có nhiều ý, giải tuần tự từng ý và ghi rõ ý tương ứng.');
      lines.push('3. Nếu đã có đáp án hoặc lời giải tham khảo, phải bám sát chúng để giảng giải.');
      lines.push('4. Chỉ được nói đề thiếu dữ kiện nếu trong toàn bộ nội dung trên thật sự không có dữ kiện toán học cụ thể.');

      return lines.join('\n');
    },

    auditAIResponse(responseText, questionData) {
      if (!questionData) return null;

      const sourceText = [
        questionData.prompt || '',
        ...(questionData.subparts || []).map(part => `${part.label || ''} ${part.text || ''}`),
        ...(questionData.options || []).map(option => `${option.label || ''} ${option.text || ''}`)
      ].join(' ');

      const normalizedResponse = this.normalizeAuditText(responseText);
      const questionKeywords = this.extractAuditKeywords(sourceText);
      const matchedKeywords = questionKeywords.filter(keyword => normalizedResponse.includes(keyword));
      const subpartLabels = (questionData.subparts || []).map(part => String(part.label || '').trim()).filter(Boolean);
      const coveredSubparts = subpartLabels.filter(label => {
        const normalizedLabel = this.normalizeAuditText(label).replace(/[^a-z0-9]/g, '');
        if (!normalizedLabel) return false;
        return normalizedResponse.includes(normalizedLabel) || normalizedResponse.includes(`y ${normalizedLabel}`) || normalizedResponse.includes(`phan ${normalizedLabel}`);
      });

      const genericPatterns = [
        'vui long cung cap',
        'khong co du lieu cu the',
        'khong co phuong trinh cu the',
        'de bai chua day du',
        'khong the giai chi tiet',
        'vi du minh hoa',
        'phuong phap tong quat'
      ];

      const issues = [];
      const hasConcreteQuestion = !!((questionData.subparts && questionData.subparts.length) || (questionData.options && questionData.options.length) || questionKeywords.length >= 3);
      const hasGenericFailure = genericPatterns.some(pattern => normalizedResponse.includes(pattern));

      if (hasConcreteQuestion && hasGenericFailure) {
        issues.push('AI có dấu hiệu coi đề là thiếu dữ kiện dù câu hỏi đã có nội dung cụ thể.');
      }

      if (subpartLabels.length > 1 && coveredSubparts.length === 0) {
        issues.push('AI chưa nhắc tới các ý a), b), c)... của bài toán.');
      }

      if (questionKeywords.length >= 4 && matchedKeywords.length < 2) {
        issues.push('Độ khớp từ khóa giữa câu hỏi và phản hồi AI đang thấp.');
      }

      if (questionData.answer && questionData.answer.kind === 'multiple_choice' && questionData.answer.letter) {
        const mentionedAnswer = normalizedResponse.includes(`dap an ${this.normalizeAuditText(questionData.answer.letter)}`)
          || normalizedResponse.includes(`chon ${this.normalizeAuditText(questionData.answer.letter)}`)
          || (questionData.answer.text && normalizedResponse.includes(this.normalizeAuditText(questionData.answer.text).slice(0, 24)));
        if ((normalizedResponse.includes('dap an') || normalizedResponse.includes('lua chon')) && !mentionedAnswer) {
          issues.push('AI có nói về đáp án nhưng không khớp rõ với đáp án chuẩn của câu hỏi.');
        }
      }

      return {
        ok: issues.length === 0,
        suspected: issues.length > 0,
        issues,
        questionId: questionData.questionId || '',
        questionType: questionData.questionType || '',
        questionKeywords,
        matchedKeywords,
        subpartLabels,
        coveredSubparts,
        debugEnabled: this.isDebugEnabled(),
        responseLength: String(responseText || '').trim().length
      };
    },

    formatAuditReport(report) {
      if (!report) return '';
      const lines = ['🔎 **AI Debug Report**'];
      lines.push(`- Mã câu: ${report.questionId || '—'}`);
      lines.push(`- Loại câu: ${report.questionType || '—'}`);
      lines.push(`- Kết quả kiểm tra: ${report.ok ? 'Ổn' : 'Cần xem lại'}`);
      lines.push(`- Độ dài phản hồi: ${report.responseLength}`);
      if (report.issues.length) lines.push(`- Cảnh báo: ${report.issues.join(' | ')}`);
      if (report.questionKeywords.length) lines.push(`- Từ khóa đề: ${report.questionKeywords.join(', ')}`);
      if (report.matchedKeywords.length) lines.push(`- Từ khóa khớp: ${report.matchedKeywords.join(', ')}`);
      if (report.subpartLabels.length) lines.push(`- Các ý trong đề: ${report.subpartLabels.join(', ')}`);
      if (report.coveredSubparts.length) lines.push(`- Các ý AI đã nhắc: ${report.coveredSubparts.join(', ')}`);
      return lines.join('\n');
    },

    emitAuditReport(report) {
      this.lastResponseAudit = report;
      if (!report) return;
      try {
        window.dispatchEvent(new CustomEvent('hoclieutoan:ai-audit', { detail: report }));
      } catch (error) {
      }
      if (report.suspected || report.debugEnabled) {
        const logger = report.suspected ? console.warn : console.log;
        logger('[AITutor][Audit]', report);
      }
    },

    async submitStructuredQuestion(questionData, options = {}) {
      this.open();
      const prompt = this.buildStructuredQuestionPrompt(questionData || {});
      this.lastQuestionContext = prompt;
      this.lastStructuredQuestion = questionData || null;
      this.pendingAuditPayload = questionData || null;

      const sidePanel = document.getElementById('ai-side-panel');
      const presetsPanel = document.getElementById('ai-preset-buttons');
      const bookmarksPanel = document.getElementById('ai-bookmarks');
      const sideTitle = document.getElementById('ai-side-title');
      if (sidePanel) sidePanel.classList.remove('hidden');
      if (sideTitle) sideTitle.textContent = 'Prompting';
      if (presetsPanel) presetsPanel.classList.remove('hidden');
      if (bookmarksPanel) bookmarksPanel.classList.add('hidden');
      this.showPresetButtons(prompt);

      const delayMs = Number.isFinite(options.delayMs) ? options.delayMs : 100;
      return new Promise(resolve => {
        setTimeout(async () => {
          const input = document.getElementById('ai-input');
          if (!input) {
            resolve(null);
            return;
          }
          input.value = prompt;
          input.focus();
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 200) + 'px';
          const response = await this.sendMessage({ auditPayload: questionData || null });
          resolve(response);
        }, delayMs);
      });
    },
    
    toggleBookmarks() {
      const section = document.getElementById('ai-bookmarks');
      const toggleBtn = document.getElementById('ai-bookmarks-toggle');
      if (section && toggleBtn) {
        section.classList.toggle('collapsed');
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-chevron-down');
          icon.classList.toggle('fa-chevron-up');
        }
      }
    },

    loadBookmarks() {
      const list = document.getElementById('ai-bookmarks-list');
      const bookmarks = BookmarkManager.getForReview(5);
      
      if (bookmarks.length === 0) {
        list.innerHTML = '<div class="ai-no-bookmarks">Chưa có câu hỏi bookmark</div>';
        return;
      }

      list.innerHTML = bookmarks.map(b => `
        <div class="ai-bookmark-item" data-bookmark-id="${b.id}">
          <div class="ai-bookmark-title">${b.questionText.substring(0, 50)}...</div>
          <div class="ai-bookmark-meta">
            ${b.isCorrect ? '✅' : '❌'} ${b.examTitle}
          </div>
        </div>
      `).join('');

      // Click to ask about bookmark
      list.querySelectorAll('.ai-bookmark-item').forEach(item => {
        item.addEventListener('click', () => {
          const bookmarkId = item.dataset.bookmarkId;
          const bookmark = BookmarkManager.bookmarks.find(b => b.id === bookmarkId);
          if (bookmark) {
            this.askAboutBookmark(bookmark);
          }
        });
      });
    },

    // Format question with full context for AI (including solution)
    formatQuestionForAI(data) {
      if (data && (data.prompt || (data.subparts && data.subparts.length) || (data.answer && typeof data.answer === 'object'))) {
        return this.buildStructuredQuestionPrompt(data);
      }

      let text = `**Câu ${data.questionIndex + 1}:** ${data.questionText}`;
      
      // Add options if available
      if (data.options && data.options.length > 0) {
        text += '\n\n**Các đáp án:**';
        data.options.forEach(opt => {
          text += `\n${opt.label}. ${opt.text}`;
        });
      }
      
      // Add correct answer if known
      if (data.correctAnswer) {
        text += `\n\n**Đáp án đúng:** ${data.correctAnswer}`;
      }
      
      // Add user's answer if they got it wrong
      if (data.userAnswer !== undefined && data.userAnswer !== null) {
        const userLabel = typeof data.userAnswer === 'number' 
          ? String.fromCharCode(65 + data.userAnswer) 
          : data.userAnswer;
        if (!data.isCorrect) {
          text += `\n**Học sinh đã chọn:** ${userLabel} ✗`;
        }
      } else if (data.isSkipped) {
        text += `\n**Học sinh:** Bỏ qua câu này`;
      }
      
      // Add the existing solution/model answer
      if (data.modelAnswer) {
        // Clean up HTML tags from model answer for better AI processing
        const cleanSolution = data.modelAnswer
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        text += `\n\n**Lời giải có sẵn:**\n${cleanSolution}`;
      }
      
      return text;
    },

    askAboutBookmark(bookmark) {
      this.open();
      const formattedQuestion = this.formatQuestionForAI(bookmark);
      this.lastStructuredQuestion = bookmark;
      this.pendingAuditPayload = bookmark;
      
      // Get user's preferred prompt template
      const preferredTemplate = localStorage.getItem('ai_prompt_template') || 'deep_dive';
      const template = this.presetPrompts[preferredTemplate]?.template || this.presetPrompts.deep_dive.template;
      const prompt = template.replace('{question}', formattedQuestion);
      
      // Fill in but DO NOT auto-send
      setTimeout(() => {
        const input = document.getElementById('ai-input');
        input.value = prompt;
        input.focus();
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        this.lastQuestionContext = formattedQuestion;
        this.showPresetButtons(formattedQuestion);
      }, 300);
    },

    // Preset prompts - organized by pedagogical purpose
    // Groups: Explanatory, Socratic, Critical Thinking
    presetPrompts: {
      // ═══════════════════════════════════════════════════
      // NHÓM 1: "NGƯỜI GIẢNG GIẢI" (Explanatory Mode)
      // ═══════════════════════════════════════════════════
      deep_dive: {
        label: '🔍 Phân tích sâu',
        group: 'explanatory',
        template: `Bạn là một gia sư toán học chuyên nghiệp. Dựa vào [Lời giải tham khảo] được cung cấp, hãy viết lại lời giải này cho học sinh.

{question}

Yêu cầu:
1. Chia nhỏ lời giải thành các bước rõ ràng
2. Ở mỗi bước, không chỉ đưa ra phép tính, hãy giải thích TẠI SAO lại thực hiện bước đó (tư duy đằng sau)
3. Sử dụng ngôn ngữ tự nhiên, mạch lạc, tránh chỉ liệt kê công thức khô khan`
      },
      
      eli5: {
        label: '🧒 Đơn giản hóa',
        group: 'explanatory',
        template: `Hãy đóng vai một người bạn học giỏi giảng bài cho bạn mình. Hãy giải thích lại [Lời giải tham khảo] này bằng ngôn ngữ cực kỳ đơn giản, đời thường.

{question}

Yêu cầu:
1. Cố gắng sử dụng một hình ảnh ẩn dụ hoặc so sánh thực tế để mô tả logic của bài toán (nếu có thể)
2. Tránh dùng thuật ngữ chuyên sâu mà không giải thích
3. Chỉ ra điểm mấu chốt (key moment) để giải quyết bài toán này là gì`
      },
      
      flashcard: {
        label: '📋 Kiến thức & Mẹo',
        group: 'explanatory',
        template: `Dựa trên bài toán và [Lời giải tham khảo], hãy tạo ra một thẻ ghi nhớ (flashcard) kiến thức.

{question}

Output cần có:
📚 **Kiến thức nền tảng:** Liệt kê các công thức hoặc định lý đã được sử dụng
⚠️ **Bẫy thường gặp:** Cảnh báo những lỗi sai dễ mắc phải ở dạng bài này
💡 **Mẹo ghi nhớ:** Một câu thần chú hoặc quy tắc nhanh để nhớ cách giải dạng này`
      },

      // ═══════════════════════════════════════════════════
      // NHÓM 2: "PHƯƠNG PHÁP SOCRATIC" (Inquiry-Based)
      // ═══════════════════════════════════════════════════
      socratic_guide: {
        label: '🧭 Dẫn dắt Socratic',
        group: 'socratic',
        template: `Bạn là một huấn luyện viên phương pháp Socratic. Bạn ĐÃ BIẾT [Lời giải tham khảo], nhưng KHÔNG ĐƯỢC TIẾT LỘ nó cho người dùng ngay.

{question}

Nhiệm vụ của bạn:
1. Hãy bắt đầu bằng cách hỏi tôi bước đầu tiên tôi nghĩ nên làm là gì
2. Nếu tôi trả lời đúng hướng (khớp với logic của lời giải tham khảo), hãy khen ngợi và gợi mở bước tiếp theo
3. Nếu tôi sai, hãy đặt câu hỏi gợi ý để tôi tự nhận ra lỗi sai (không sửa lưng trực tiếp)
4. Mục tiêu là giúp tôi tự viết ra được lời giải

Hãy bắt đầu bằng câu hỏi đầu tiên!`
      },
      
      concept_check: {
        label: '❓ Kiểm tra tư duy',
        group: 'socratic',
        template: `Hãy đóng vai một giáo viên khó tính đang kiểm tra bài cũ. Dựa vào [Lời giải tham khảo], hãy chọn ra một bước quan trọng nhất/khó nhất trong lời giải đó và hỏi vặn tôi.

{question}

Ví dụ câu hỏi: "Tại sao ở bước đó, ta lại làm như vậy? Điều kiện để làm việc đó là gì?"

Chỉ xác nhận đúng sai sau khi tôi đã giải thích lý do. Hãy bắt đầu!`
      },

      // ═══════════════════════════════════════════════════
      // NHÓM 3: "TƯ DUY MỞ RỘNG" (Critical Thinking)
      // ═══════════════════════════════════════════════════
      optimize: {
        label: '⚡ Tối ưu & So sánh',
        group: 'critical',
        template: `Dựa vào [Lời giải tham khảo], hãy đóng vai một chuyên gia toán học bình luận về lời giải này.

{question}

Hãy phân tích:
1. **Đánh giá độ phức tạp:** Lời giải này đã ngắn gọn nhất chưa?
2. **Đề xuất cách khác (nếu có):** Liệu có cách nào giải nhanh hơn (mẹo trắc nghiệm) hoặc tổng quát hơn không?
3. **So sánh ưu nhược điểm** của cách giải trong lời giải tham khảo với các phương pháp thông thường khác`
      },
      
      generalize: {
        label: '🎯 Khái quát hóa',
        group: 'critical',
        template: `Từ bài toán cụ thể và [Lời giải tham khảo] này, hãy giúp tôi xây dựng một "Thuật toán tổng quát" (Algorithm) để giải quyết mọi bài toán cùng dạng.

{question}

Output theo format:
📌 **Bước 1 - Nhận diện dạng bài:** Dấu hiệu nhận biết
📌 **Bước 2 - Thiết lập:** Phương trình/công thức cần dùng
📌 **Bước 3 - Xử lý:** Các bước xử lý đại số chuẩn
📌 **Bước 4 - Kết luận:** Cách trình bày kết quả`
      },
      
      what_if: {
        label: '🔄 Giả định What If',
        group: 'critical',
        template: `Hãy sử dụng [Lời giải tham khảo] làm gốc, sau đó đặt ra một tình huống giả định để thách thức tôi.

{question}

Ví dụ: "Nếu đề bài thay đổi dữ kiện X thành Y (ví dụ: đổi dấu + thành dấu -), thì lời giải trên sẽ thay đổi như thế nào? Kết quả có còn dương không?"

Hãy đặt câu hỏi What-If và sau đó giải thích sự thay đổi đó.`
      },
      
      similar: {
        label: '📝 Bài tập tương tự',
        group: 'critical',
        template: `Dựa trên câu hỏi và [Lời giải tham khảo] sau:

{question}

Hãy tạo 2-3 bài tập tương tự với độ khó tăng dần để tôi luyện tập thêm. Với mỗi bài, cho biết đáp án và gợi ý ngắn gọn.`
      }
    },

    askAboutQuestion(questionData) {
      this.open();
      
      const formattedQuestion = this.formatQuestionForAI(questionData);
      this.lastStructuredQuestion = questionData;
      this.pendingAuditPayload = questionData;
      
      // Get user's preferred prompt template from localStorage or use default
      const preferredTemplate = localStorage.getItem('ai_prompt_template') || 'deep_dive';
      const template = this.presetPrompts[preferredTemplate]?.template || this.presetPrompts.deep_dive.template;
      
      // Build prompt from template
      const prompt = template.replace('{question}', formattedQuestion);
      
      // Fill in the prompt but DO NOT auto-send - let user edit first
      setTimeout(() => {
        const input = document.getElementById('ai-input');
        input.value = prompt;
        input.focus();
        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        this.lastQuestionContext = formattedQuestion;
        // Show preset buttons
        this.showPresetButtons(formattedQuestion);
      }, 300);
    },
    
    showPresetButtons(questionContext) {
      const container = document.getElementById('ai-preset-buttons');
      if (!container) return;
      
      // Group presets by category
      const groups = {
        explanatory: { label: '📖 Giảng giải', icon: '📖', presets: [] },
        socratic: { label: '🎓 Socratic', icon: '🎓', presets: [] },
        critical: { label: '🧠 Tư duy', icon: '🧠', presets: [] }
      };
      
      Object.entries(this.presetPrompts).forEach(([key, preset]) => {
        const group = preset.group || 'explanatory';
        if (groups[group]) {
          groups[group].presets.push({ key, ...preset });
        }
      });
      
      // Build HTML with collapsible group toggles
      let html = '<div class="ai-preset-scroll">';
      Object.entries(groups).forEach(([groupKey, group]) => {
        if (group.presets.length > 0) {
          // Group toggle button
          html += `<button class="ai-preset-group-toggle" data-group="${groupKey}">
            ${group.label}
            <span class="toggle-icon">▼</span>
          </button>`;
          
          // Options container (hidden by default)
          html += `<div class="ai-preset-options" data-group-options="${groupKey}">`;
          group.presets.forEach(preset => {
            html += `<button class="ai-preset-btn" data-preset="${preset.key}" title="${preset.label}">${preset.label}</button>`;
          });
          html += `</div>`;
        }
      });
      html += '</div>';
      
      container.innerHTML = html;
      
      // Handle group toggle clicks
      container.querySelectorAll('.ai-preset-group-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
          const groupKey = toggle.dataset.group;
          const options = container.querySelector(`[data-group-options="${groupKey}"]`);
          const isExpanded = toggle.classList.contains('expanded');
          
          // Close all other groups
          container.querySelectorAll('.ai-preset-group-toggle').forEach(t => t.classList.remove('expanded'));
          container.querySelectorAll('.ai-preset-options').forEach(o => o.classList.remove('show'));
          
          // Toggle current group
          if (!isExpanded) {
            toggle.classList.add('expanded');
            options.classList.add('show');
          }
        });
      });
      
      // Handle preset button clicks
      container.querySelectorAll('.ai-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const presetKey = btn.dataset.preset;
          const template = this.presetPrompts[presetKey]?.template || '';
          const input = document.getElementById('ai-input');
          input.value = template.replace('{question}', questionContext);
          input.focus();
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 200) + 'px';
          // Highlight selected preset
          container.querySelectorAll('.ai-preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
      
      container.classList.remove('hidden');
    },

    async sendMessage(options = {}) {
      const input = document.getElementById('ai-input');
      const message = input.value.trim();
      const auditPayload = options.auditPayload || this.pendingAuditPayload || null;
      
      if (!message) return;

      // Add user message to UI
      this.addMessage(message, 'user');
      input.value = '';
      input.style.height = 'auto';

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message
      });

      // Show typing indicator
      const typingId = this.showTyping();

      try {
        const response = await this.callAIService(message);
        this.removeTyping(typingId);
        this.addMessage(response, 'bot');

        const auditReport = this.auditAIResponse(response, auditPayload);
        this.emitAuditReport(auditReport);
        if (auditReport && auditReport.debugEnabled) {
          this.addMessage(this.formatAuditReport(auditReport), 'bot', !auditReport.ok);
        } else if (auditReport && auditReport.suspected) {
          this.addMessage('⚠️ Kiểm tra tự động cho thấy phản hồi AI có thể chưa bám sát đầy đủ đề bài. Bạn nên đối chiếu lại các ý của câu hỏi hoặc hỏi lại.', 'bot', true);
        }
        this.pendingAuditPayload = null;
        
        this.conversationHistory.push({
          role: 'assistant',
          content: response
        });
        return response;
      } catch (error) {
        this.removeTyping(typingId);
        const errorMsg = error.message || 'Lỗi không xác định';
        this.addMessage(`Xin lỗi, đã có lỗi xảy ra (${errorMsg}). Vui lòng thử lại sau.`, 'bot', true);
        console.error('AI Error:', error);
        return null;
      }
    },

    async callAIService(message) {
      const systemPrompt = `Bạn là một gia sư Toán học thông minh và thân thiện, chuyên hỗ trợ học sinh Việt Nam từ lớp 9 đến lớp 12.

CONTEXT QUAN TRỌNG:
- Khi user gửi câu hỏi có kèm "[Lời giải có sẵn]" hoặc "[Lời giải tham khảo]", đó là lời giải chuẩn đã được kiểm duyệt
- Hãy DỰA VÀO lời giải đó để giảng giải, KHÔNG tự bịa ra cách giải khác trừ khi được yêu cầu
- Mục tiêu là giúp học sinh HIỂU lời giải, không phải tạo lời giải mới
- Nếu user gửi khối "[Đề bài]", "[Các ý của bài toán]", "[Các đáp án]", hãy coi đó là dữ kiện chính thức và đầy đủ của câu hỏi
- Nếu bài có nhiều ý a), b), c)... phải giải lần lượt từng ý, không được bỏ qua
- Chỉ được nói đề thiếu dữ kiện khi trong toàn bộ message thật sự không có biểu thức, phương trình, hệ thức hoặc dữ kiện cụ thể

Nhiệm vụ của bạn:
1. Giải thích các bài toán một cách chi tiết, dễ hiểu
2. Hướng dẫn từng bước cách giải
3. Chỉ ra các lỗi sai thường gặp và cách tránh
4. Đưa ra mẹo và phương pháp ghi nhớ
5. Khuyến khích và động viên học sinh
6. Với câu hỏi Socratic: Dẫn dắt bằng câu hỏi, không đưa đáp án ngay

Quy tắc format:
- Sử dụng tiếng Việt
- Giải thích rõ ràng, có cấu trúc
- **QUAN TRỌNG**: Sử dụng LaTeX cho công thức toán:
  + Inline math: dùng $...$ (ví dụ: $x^2 + y^2 = r^2$)
  + Display math: dùng $$...$$ (ví dụ: $$\\int_0^1 x^2 dx = \\frac{1}{3}$$)
- Đưa ra ví dụ minh họa khi phù hợp
- Trình bày theo cấu trúc: **Bước 1:**, **Bước 2:**, v.v.`;

      const cfg = window.APP_CONFIG || {};
      const baseUrl = (typeof cfg.apiBaseUrl === 'string') ? cfg.apiBaseUrl.replace(/\/+$/, '') : '';
      const url = `${baseUrl}/api/ai/chat`;

      console.log('AI Request URL:', url); // Debug log

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: this.conversationHistory.slice(-10),
          context: systemPrompt
        })
      });

      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch (e) { /* ignore */ }
        throw new Error(`API Error: ${response.status}${detail ? ' - ' + detail : ''}`);
      }

      const data = await response.json();
      return (data && (data.message || data.choices?.[0]?.message?.content)) || '';
    },

    addMessage(content, type, isError = false) {
      const container = document.getElementById('ai-messages');
      const div = document.createElement('div');
      div.className = `ai-message ai-message-${type}${isError ? ' ai-message-error' : ''}`;
      
      if (type === 'bot') {
        div.innerHTML = `
          <div class="ai-message-avatar"><i class="fa-solid fa-robot"></i></div>
          <div class="ai-message-content">${this.formatMessage(content)}</div>
        `;
      } else {
        div.innerHTML = `
          <div class="ai-message-content">${this.escapeHtml(content)}</div>
          <div class="ai-message-avatar"><i class="fa-solid fa-user"></i></div>
        `;
      }
      
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      
      // Render math formulas with MathJax
      this.renderMath(div);
    },

    // Render LaTeX math in element using MathJax
    renderMath(element) {
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([element]).then(() => {
          // Scroll to bottom after rendering
          const container = document.getElementById('ai-messages');
          if (container) container.scrollTop = container.scrollHeight;
        }).catch(err => console.warn('MathJax render error:', err));
      }
    },

    formatMessage(content) {
      content = String(content == null ? '' : content);

      // First, protect LaTeX math expressions from escaping
      const mathBlocks = [];
      let idx = 0;

      // Protect display math $$...$$ and \[...\]
      let formatted = content.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (match) => {
        mathBlocks.push(match);
        return `%%MATH_BLOCK_${idx++}%%`;
      });

      // Protect inline math $...$ and \(...\) (but not $$ which we already handled)
      formatted = formatted.replace(/\$([^\$\n]+?)\$|\\\(([\s\S]+?)\\\)/g, (match) => {
        mathBlocks.push(match);
        return `%%MATH_BLOCK_${idx++}%%`;
      });

      // Unescape stringified control chars that slipped in from JSON payloads.
      // Math was extracted above, so these replacements won't break LaTeX like \neq, \tau.
      formatted = formatted
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '    ');
      
      // Now escape HTML
      formatted = this.escapeHtml(formatted);
      
      // Bold
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Italic (but not inside math)
      formatted = formatted.replace(/(?<!\$)\*([^\*\$]+?)\*(?!\$)/g, '<em>$1</em>');
      
      // Code blocks
      formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      
      // Inline code (but not math)
      formatted = formatted.replace(/`([^`\$]+?)`/g, '<code>$1</code>');
      
      // Numbered lists: 1. 2. 3. etc
      formatted = formatted.replace(/^(\d+)\.\s+(.*?)$/gm, '<li class="numbered">$2</li>');
      formatted = formatted.replace(/(<li class="numbered">.*?<\/li>\n?)+/gs, '<ol>$&</ol>');
      
      // Bullet lists
      formatted = formatted.replace(/^[-•]\s+(.*?)$/gm, '<li>$1</li>');
      formatted = formatted.replace(/(<li>(?!class).*?<\/li>\n?)+/gs, (match) => {
        if (!match.includes('class="numbered"')) return `<ul>${match}</ul>`;
        return match;
      });
      
      // Line breaks (but not inside lists)
      formatted = formatted.replace(/\n/g, '<br>');
      
      // Clean up extra breaks around lists
      formatted = formatted.replace(/<br>(<[ou]l>)/g, '$1');
      formatted = formatted.replace(/(<\/[ou]l>)<br>/g, '$1');
      formatted = formatted.replace(/<li([^>]*)>(.*?)<br><\/li>/g, '<li$1>$2</li>');

      // Restore math expressions (they must be treated as text, not raw HTML)
      mathBlocks.forEach((block, i) => {
        formatted = formatted.replace(`%%MATH_BLOCK_${i}%%`, this.escapeHtml(block));
      });
      
      return formatted;
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    showTyping() {
      const container = document.getElementById('ai-messages');
      const id = 'typing-' + Date.now();
      const div = document.createElement('div');
      div.id = id;
      div.className = 'ai-message ai-message-bot ai-typing';
      div.innerHTML = `
        <div class="ai-message-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="ai-message-content">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      return id;
    },

    removeTyping(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    },

    clearChat() {
      this.conversationHistory = [];
      this.lastStructuredQuestion = null;
      this.lastResponseAudit = null;
      this.pendingAuditPayload = null;
      const container = document.getElementById('ai-messages');
      container.innerHTML = `
        <div class="ai-message ai-message-bot">
          <div class="ai-message-avatar"><i class="fa-solid fa-robot"></i></div>
          <div class="ai-message-content">
            Đã xóa hội thoại. Tôi sẵn sàng giúp bạn!
          </div>
        </div>
      `;
    },

    // ===== ADVANCED AI FEATURES =====
    
    // Generate practice problems similar to a bookmarked question
    async generateSimilarProblems(bookmark) {
      this.open();
      const prompt = `Dựa trên câu hỏi sau, hãy tạo 3 câu hỏi tương tự để học sinh luyện tập:\n\n${this.formatQuestionForAI(bookmark)}\n\nYêu cầu:\n- Mỗi câu có 4 đáp án A, B, C, D\n- Độ khó tương đương\n- Cùng dạng bài/chủ đề\n- Có đáp án và giải thích ngắn`;
      
      document.getElementById('ai-input').value = prompt;
      this.sendMessage();
    },

    // Explain a concept/topic
    async explainConcept(topic) {
      this.open();
      const prompt = `Hãy giải thích chi tiết về chủ đề "${topic}" trong Toán học:\n\n1. Định nghĩa và khái niệm cơ bản\n2. Công thức quan trọng\n3. Ví dụ minh họa\n4. Các dạng bài thường gặp\n5. Mẹo ghi nhớ và lưu ý`;
      
      document.getElementById('ai-input').value = prompt;
      this.sendMessage();
    },

    // Analyze exam performance and give recommendations
    async analyzePerformance() {
      const stats = StatisticsManager.getStats();
      const bookmarks = BookmarkManager.getAll();
      const wrongAnswers = bookmarks.filter(b => !b.isCorrect);
      
      this.open();
      
      const performanceData = `
Thống kê học tập:
- Tổng số đề đã làm: ${stats.totalExams}
- Điểm trung bình: ${stats.averageScore}%
- Điểm cao nhất: ${stats.bestScore}%
- Tổng thời gian học: ${Math.round(stats.totalTimeSpent / 60)} phút
- Streak hiện tại: ${stats.currentStreak} ngày

Câu hỏi bookmark (${bookmarks.length} câu):
- Câu trả lời sai: ${wrongAnswers.length}
- Các câu sai gần đây: ${wrongAnswers.slice(0, 3).map(b => b.questionText.substring(0, 50)).join('; ')}
      `.trim();

      const prompt = `Dựa trên dữ liệu học tập sau, hãy phân tích và đưa ra lời khuyên:\n\n${performanceData}\n\nHãy:\n1. Đánh giá tiến độ học tập\n2. Xác định điểm mạnh/yếu\n3. Đề xuất kế hoạch ôn tập\n4. Gợi ý chủ đề cần tập trung`;
      
      document.getElementById('ai-input').value = prompt;
      this.sendMessage();
    },

    // Create a study plan
    async createStudyPlan(examDate, topics) {
      this.open();
      const daysUntilExam = examDate ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
      
      const prompt = `Hãy tạo kế hoạch ôn tập Toán trong ${daysUntilExam} ngày với các chủ đề: ${topics || 'Đại số, Hình học, Giải tích'}\n\nYêu cầu:\n1. Phân bổ thời gian hợp lý\n2. Ưu tiên chủ đề quan trọng\n3. Xen kẽ lý thuyết và bài tập\n4. Có ngày ôn tập tổng hợp\n5. Đề xuất số lượng đề cần làm`;
      
      document.getElementById('ai-input').value = prompt;
      this.sendMessage();
    },

    // Quick formula lookup
    async lookupFormula(topic) {
      this.open();
      const prompt = `Liệt kê tất cả công thức quan trọng về "${topic}" trong Toán học:\n\n- Công thức cơ bản\n- Công thức nâng cao\n- Điều kiện áp dụng\n- Ví dụ áp dụng ngắn`;
      
      document.getElementById('ai-input').value = prompt;
      this.sendMessage();
    },

    // Solve step by step
    async solveStepByStep(problem) {
      this.open();
      const prompt = `Giải chi tiết bài toán sau từng bước:\n\n"${problem}"\n\nYêu cầu:\n1. Phân tích đề bài\n2. Xác định phương pháp giải\n3. Trình bày lời giải từng bước\n4. Kiểm tra lại kết quả\n5. Rút ra bài học/mẹo`;
      
      document.getElementById('ai-input').value = prompt;
      this.sendMessage();
    },

    // Quick actions menu
    showQuickActions() {
      const actions = [
        { icon: '📊', label: 'Phân tích kết quả học tập', action: () => this.analyzePerformance() },
        { icon: '📅', label: 'Tạo kế hoạch ôn tập', action: () => this.createStudyPlan() },
        { icon: '📐', label: 'Tra cứu công thức', action: () => this.promptForFormula() },
        { icon: '✏️', label: 'Giải bài tập', action: () => this.promptForProblem() },
        { icon: '🎯', label: 'Tạo bài tập tương tự', action: () => this.promptForSimilar() }
      ];

      Swal.fire({
        title: 'AI Tutor - Tính năng',
        html: `
          <div class="ai-quick-actions">
            ${actions.map((a, i) => `
              <button class="ai-quick-action-btn" data-index="${i}">
                <span class="ai-quick-icon">${a.icon}</span>
                <span>${a.label}</span>
              </button>
            `).join('')}
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
          document.querySelectorAll('.ai-quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              Swal.close();
              actions[parseInt(btn.dataset.index)].action();
            });
          });
        }
      });
    },

    promptForFormula() {
      Swal.fire({
        title: 'Tra cứu công thức',
        input: 'text',
        inputPlaceholder: 'VD: Lượng giác, Đạo hàm, Tích phân...',
        showCancelButton: true,
        confirmButtonText: 'Tra cứu',
        cancelButtonText: 'Hủy'
      }).then(result => {
        if (result.isConfirmed && result.value) {
          this.lookupFormula(result.value);
        }
      });
    },

    promptForProblem() {
      Swal.fire({
        title: 'Giải bài tập',
        input: 'textarea',
        inputPlaceholder: 'Nhập đề bài cần giải...',
        showCancelButton: true,
        confirmButtonText: 'Giải',
        cancelButtonText: 'Hủy'
      }).then(result => {
        if (result.isConfirmed && result.value) {
          this.solveStepByStep(result.value);
        }
      });
    },

    promptForSimilar() {
      const bookmarks = BookmarkManager.getAll();
      if (bookmarks.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Chưa có bookmark',
          text: 'Hãy bookmark một số câu hỏi trước để tạo bài tập tương tự'
        });
        return;
      }

      Swal.fire({
        title: 'Chọn câu hỏi mẫu',
        html: `
          <div class="swal-bookmarks-list">
            ${bookmarks.slice(0, 10).map((b, i) => `
              <div class="swal-bookmark-item" data-index="${i}">
                <span>${b.questionText.substring(0, 60)}...</span>
              </div>
            `).join('')}
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
          document.querySelectorAll('.swal-bookmark-item').forEach(item => {
            item.addEventListener('click', () => {
              Swal.close();
              this.generateSimilarProblems(bookmarks[parseInt(item.dataset.index)]);
            });
          });
        }
      });
    }
  };

  // ============================================
  // 5. SMART REVIEW SYSTEM
  // ============================================
  const SmartReview = {
    init() {
      console.log('🧠 SmartReview initialized');
    },

    getSuggestions() {
      const bookmarks = BookmarkManager.getForReview(10);
      const stats = StatisticsManager.getStats();
      
      const suggestions = [];

      // Suggest reviewing wrong answers
      const wrongAnswers = bookmarks.filter(b => !b.isCorrect);
      if (wrongAnswers.length > 0) {
        suggestions.push({
          type: 'wrong_answers',
          title: 'Ôn tập câu sai',
          description: `Bạn có ${wrongAnswers.length} câu trả lời sai cần ôn tập`,
          items: wrongAnswers.slice(0, 5),
          priority: 'high',
          icon: '❌'
        });
      }

      // Suggest bookmarks not reviewed recently
      const notReviewed = bookmarks.filter(b => {
        if (!b.lastReviewed) return true;
        const days = (Date.now() - new Date(b.lastReviewed).getTime()) / (1000 * 60 * 60 * 24);
        return days > 3;
      });
      if (notReviewed.length > 0) {
        suggestions.push({
          type: 'not_reviewed',
          title: 'Cần ôn lại',
          description: `${notReviewed.length} câu hỏi chưa ôn tập gần đây`,
          items: notReviewed.slice(0, 5),
          priority: 'medium',
          icon: '📚'
        });
      }

      // Suggest based on weak areas (question types with low accuracy)
      const weakTypes = Object.entries(stats.questionTypeStats)
        .filter(([type, data]) => data.total > 5 && (data.correct / data.total) < 0.6)
        .map(([type]) => type);
      
      if (weakTypes.length > 0) {
        suggestions.push({
          type: 'weak_areas',
          title: 'Điểm yếu cần cải thiện',
          description: `Bạn cần luyện tập thêm: ${weakTypes.join(', ')}`,
          items: [],
          priority: 'high',
          icon: '📈'
        });
      }

      // Streak reminder
      if (stats.currentStreak > 0) {
        suggestions.push({
          type: 'streak',
          title: `Giữ streak ${stats.currentStreak} ngày!`,
          description: 'Hãy hoàn thành ít nhất 1 đề hôm nay',
          items: [],
          priority: 'low',
          icon: '🔥'
        });
      }

      return suggestions;
    },

    startReviewSession(bookmarkIds) {
      // Create a review session with selected bookmarks
      const session = {
        id: `review_${Date.now()}`,
        bookmarks: bookmarkIds,
        startedAt: new Date().toISOString(),
        currentIndex: 0,
        results: []
      };
      
      sessionStorage.setItem('current_review_session', JSON.stringify(session));
      return session;
    }
  };

  // ============================================
  // 6. GOALS SYSTEM
  // ============================================
  const GoalsManager = {
    goals: [],

    init() {
      this.load();
      console.log('🎯 GoalsManager initialized');
    },

    load() {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
        this.goals = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.goals = [];
      }
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(this.goals));
      } catch (e) {
        console.error('Failed to save goals:', e);
      }
    },

    add(goal) {
      const newGoal = {
        id: `goal_${Date.now()}`,
        type: goal.type, // 'daily_exams', 'weekly_exams', 'score_target', 'streak'
        target: goal.target,
        current: 0,
        createdAt: new Date().toISOString(),
        deadline: goal.deadline || null,
        completed: false
      };
      this.goals.push(newGoal);
      this.save();
      return newGoal;
    },

    updateProgress(goalId, progress) {
      const goal = this.goals.find(g => g.id === goalId);
      if (goal) {
        goal.current = progress;
        if (goal.current >= goal.target) {
          goal.completed = true;
          goal.completedAt = new Date().toISOString();
        }
        this.save();
      }
    },

    getActive() {
      return this.goals.filter(g => !g.completed);
    },

    getCompleted() {
      return this.goals.filter(g => g.completed);
    }
  };

  // ============================================
  // INITIALIZE ALL FEATURES
  // ============================================
  function initAllFeatures() {
    BookmarkManager.init();
    StatisticsManager.init();
    AchievementManager.init();
    AITutor.init();
    SmartReview.init();
    GoalsManager.init();

    // Expose to global scope for script.js access
    window.BookmarkManager = BookmarkManager;
    window.Features = {
      Bookmarks: BookmarkManager,
      Stats: StatisticsManager,
      Achievements: AchievementManager,
      AI: AITutor,
      Review: SmartReview,
      Goals: GoalsManager
    };

    // Setup screen visibility observer for AI FAB
    setupAIFabVisibility();

    console.log('✅ All features initialized!');
  }

  // Control AI FAB visibility based on current screen
  function setupAIFabVisibility() {
    const fab = document.getElementById('ai-tutor-fab');
    if (!fab) return;

    // Initially hide FAB
    fab.style.display = 'none';

    // Observer for hash changes
    const updateFabVisibility = () => {
      const hash = window.location.hash;
      const resultsScreen = document.getElementById('results-screen');
      const dashboardScreen = document.getElementById('dashboard-screen');
      
      // Show FAB only on results screen or dashboard
      const isOnResults = resultsScreen && !resultsScreen.classList.contains('hidden');
      const isOnDashboard = dashboardScreen && !dashboardScreen.classList.contains('hidden');
      const isResultsRoute = hash.includes('/results');
      const isDashboardRoute = hash.includes('/dashboard');
      
      if (isOnResults || isOnDashboard || isResultsRoute || isDashboardRoute) {
        fab.style.display = 'flex';
      } else {
        fab.style.display = 'none';
        // Also close panel if open
        if (AITutor.isOpen) {
          AITutor.close();
        }
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', updateFabVisibility);
    
    // Also observe screen visibility changes
    const observer = new MutationObserver(updateFabVisibility);
    const resultsScreen = document.getElementById('results-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    if (resultsScreen) observer.observe(resultsScreen, { attributes: true, attributeFilter: ['class'] });
    if (dashboardScreen) observer.observe(dashboardScreen, { attributes: true, attributeFilter: ['class'] });
    
    // Initial check
    setTimeout(updateFabVisibility, 500);
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllFeatures);
  } else {
    initAllFeatures();
  }

})();
