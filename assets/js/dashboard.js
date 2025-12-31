/**
 * dashboard.js - Dashboard UI Components
 * Renders statistics, achievements, bookmarks, and review suggestions
 */

(function() {
  'use strict';

  const Dashboard = {
    container: null,

    init(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.warn('Dashboard container not found:', containerId);
        return;
      }
      this.render();
    },

    render() {
      if (!this.container) return;

      const stats = window.Features?.Stats?.getStats() || {};
      const achievements = window.Features?.Achievements?.getAll() || [];
      const bookmarks = window.Features?.Bookmarks?.getAll() || [];
      const suggestions = window.Features?.Review?.getSuggestions() || [];
      const weeklyData = window.Features?.Stats?.getWeeklyData() || [];

      this.container.innerHTML = `
        <!-- Streak Banner -->
        ${this.renderStreakBanner(stats)}

        <!-- Stats Overview -->
        <div class="dashboard-section">
          <h3 class="dashboard-section-title">
            <i class="fa-solid fa-chart-line"></i>
            Thống kê học tập
          </h3>
          ${this.renderStatsCards(stats)}
        </div>

        <!-- Weekly Activity Chart -->
        <div class="dashboard-section">
          <h3 class="dashboard-section-title">
            <i class="fa-solid fa-calendar-week"></i>
            Hoạt động tuần này
          </h3>
          ${this.renderWeeklyChart(weeklyData)}
        </div>

        <!-- Smart Review Suggestions -->
        ${suggestions.length > 0 ? `
        <div class="dashboard-section">
          <h3 class="dashboard-section-title">
            <i class="fa-solid fa-lightbulb"></i>
            Gợi ý ôn tập
          </h3>
          ${this.renderSuggestions(suggestions)}
        </div>
        ` : ''}

        <!-- Achievements -->
        <div class="dashboard-section">
          <h3 class="dashboard-section-title">
            <i class="fa-solid fa-trophy"></i>
            Thành tựu (${achievements.filter(a => a.unlocked).length}/${achievements.length})
          </h3>
          ${this.renderAchievements(achievements)}
        </div>

        <!-- Recent Bookmarks -->
        ${bookmarks.length > 0 ? `
        <div class="dashboard-section">
          <h3 class="dashboard-section-title">
            <i class="fa-solid fa-bookmark"></i>
            Câu hỏi đã bookmark (${bookmarks.length})
          </h3>
          ${this.renderBookmarks(bookmarks.slice(0, 5))}
          ${bookmarks.length > 5 ? `
            <button class="view-all-btn" onclick="Dashboard.showAllBookmarks()">
              Xem tất cả ${bookmarks.length} bookmark
            </button>
          ` : ''}
        </div>
        ` : ''}

        <!-- Goals -->
        <div class="dashboard-section">
          <h3 class="dashboard-section-title">
            <i class="fa-solid fa-bullseye"></i>
            Mục tiêu
          </h3>
          ${this.renderGoals()}
        </div>
      `;

      // Add event listeners
      this.attachEventListeners();
    },

    renderStreakBanner(stats) {
      if (!stats.currentStreak || stats.currentStreak < 1) {
        return `
          <div class="streak-display streak-empty">
            <div class="streak-fire">🎯</div>
            <div class="streak-info">
              <div class="streak-count">Bắt đầu streak!</div>
              <div class="streak-label">Hoàn thành 1 đề để bắt đầu chuỗi ngày học</div>
            </div>
          </div>
        `;
      }

      return `
        <div class="streak-display">
          <div class="streak-fire">🔥</div>
          <div class="streak-info">
            <div class="streak-count">${stats.currentStreak} ngày liên tiếp!</div>
            <div class="streak-label">Kỷ lục: ${stats.longestStreak} ngày • Tiếp tục phát huy!</div>
          </div>
        </div>
      `;
    },

    renderStatsCards(stats) {
      const cards = [
        {
          icon: 'fa-file-pen',
          iconClass: 'primary',
          value: stats.totalExams || 0,
          label: 'Đề đã làm',
          change: null
        },
        {
          icon: 'fa-check-circle',
          iconClass: 'success',
          value: `${stats.averageScore || 0}%`,
          label: 'Điểm trung bình',
          change: null
        },
        {
          icon: 'fa-star',
          iconClass: 'warning',
          value: `${stats.bestScore || 0}%`,
          label: 'Điểm cao nhất',
          change: null
        },
        {
          icon: 'fa-clock',
          iconClass: 'danger',
          value: this.formatTime(stats.totalTimeSpent || 0),
          label: 'Thời gian học',
          change: null
        }
      ];

      return `
        <div class="stats-dashboard">
          ${cards.map(card => `
            <div class="stat-card">
              <div class="stat-icon ${card.iconClass}">
                <i class="fa-solid ${card.icon}"></i>
              </div>
              <div class="stat-value">${card.value}</div>
              <div class="stat-label">${card.label}</div>
              ${card.change ? `
                <div class="stat-change ${card.change > 0 ? 'positive' : 'negative'}">
                  <i class="fa-solid fa-arrow-${card.change > 0 ? 'up' : 'down'}"></i>
                  ${Math.abs(card.change)}%
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    },

    renderWeeklyChart(weeklyData) {
      const maxExams = Math.max(...weeklyData.map(d => d.exams), 1);
      
      return `
        <div class="weekly-chart">
          ${weeklyData.map(day => {
            const height = (day.exams / maxExams) * 100;
            const isToday = day.date === new Date().toISOString().split('T')[0];
            return `
              <div class="chart-bar-container">
                <div class="chart-bar ${isToday ? 'today' : ''}" style="height: ${Math.max(height, 5)}%">
                  <span class="chart-value">${day.exams}</span>
                </div>
                <div class="chart-label ${isToday ? 'today' : ''}">${day.dayName}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    renderSuggestions(suggestions) {
      return `
        <div class="review-suggestions">
          ${suggestions.map(s => `
            <div class="suggestion-card" data-type="${s.type}">
              <div class="suggestion-icon">${s.icon}</div>
              <div class="suggestion-content">
                <div class="suggestion-title">${s.title}</div>
                <div class="suggestion-desc">${s.description}</div>
              </div>
              <span class="suggestion-priority ${s.priority}">${s.priority === 'high' ? 'Ưu tiên' : s.priority === 'medium' ? 'Nên làm' : 'Gợi ý'}</span>
            </div>
          `).join('')}
        </div>
      `;
    },

    renderAchievements(achievements) {
      // Group by category
      const categories = {
        exam: 'Đề thi',
        score: 'Điểm số',
        streak: 'Streak',
        bookmark: 'Bookmark',
        time: 'Thời gian',
        special: 'Đặc biệt'
      };

      return `
        <div class="achievements-grid">
          ${achievements.slice(0, 12).map(a => `
            <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}" title="${a.desc}">
              <div class="achievement-card-icon">${a.icon}</div>
              <div class="achievement-card-name">${a.name}</div>
              <div class="achievement-card-desc">${a.desc}</div>
            </div>
          `).join('')}
        </div>
        ${achievements.length > 12 ? `
          <button class="view-all-btn" onclick="Dashboard.showAllAchievements()">
            Xem tất cả thành tựu
          </button>
        ` : ''}
      `;
    },

    renderBookmarks(bookmarks) {
      if (bookmarks.length === 0) {
        return `
          <div class="empty-state">
            <i class="fa-solid fa-bookmark"></i>
            <p>Chưa có bookmark nào</p>
            <small>Click chuột phải vào câu hỏi để bookmark</small>
          </div>
        `;
      }

      return `
        <div class="bookmarks-list">
          ${bookmarks.map(b => `
            <div class="bookmark-card" data-id="${b.id}">
              <div class="bookmark-status ${b.isCorrect ? 'correct' : 'wrong'}">
                ${b.isCorrect ? '✅' : '❌'}
              </div>
              <div class="bookmark-content">
                <div class="bookmark-question">${this.escapeHtml(b.questionText)}</div>
                <div class="bookmark-meta">
                  <span><i class="fa-solid fa-file-pen"></i> ${b.examTitle}</span>
                  <span><i class="fa-solid fa-clock"></i> ${this.formatDate(b.createdAt)}</span>
                </div>
              </div>
              <div class="bookmark-actions">
                <button class="bookmark-action-btn" onclick="Dashboard.askAIAboutBookmark('${b.id}')" title="Hỏi AI">
                  <i class="fa-solid fa-robot"></i>
                </button>
                <button class="bookmark-action-btn danger" onclick="Dashboard.removeBookmark('${b.id}')" title="Xóa">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    renderGoals() {
      const goals = window.Features?.Goals?.getActive() || [];
      
      if (goals.length === 0) {
        return `
          <div class="empty-state">
            <i class="fa-solid fa-bullseye"></i>
            <p>Chưa có mục tiêu nào</p>
            <button class="add-goal-btn" onclick="Dashboard.showAddGoalModal()">
              <i class="fa-solid fa-plus"></i> Thêm mục tiêu
            </button>
          </div>
        `;
      }

      return `
        <div class="goals-list">
          ${goals.map(g => {
            const progress = Math.min((g.current / g.target) * 100, 100);
            return `
              <div class="goal-card ${g.completed ? 'completed' : ''}">
                <div class="goal-header">
                  <div class="goal-title">${this.getGoalTitle(g)}</div>
                  <div class="goal-progress-text">${g.current}/${g.target}</div>
                </div>
                <div class="goal-progress-bar">
                  <div class="goal-progress-fill" style="width: ${progress}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button class="add-goal-btn" onclick="Dashboard.showAddGoalModal()">
          <i class="fa-solid fa-plus"></i> Thêm mục tiêu
        </button>
      `;
    },

    getGoalTitle(goal) {
      const titles = {
        daily_exams: `Làm ${goal.target} đề hôm nay`,
        weekly_exams: `Làm ${goal.target} đề tuần này`,
        score_target: `Đạt ${goal.target}% điểm`,
        streak: `Duy trì streak ${goal.target} ngày`
      };
      return titles[goal.type] || goal.type;
    },

    // Utility functions
    formatTime(seconds) {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    },

    formatDate(dateStr) {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) return 'Vừa xong';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;
      
      return date.toLocaleDateString('vi-VN');
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    // Event handlers
    attachEventListeners() {
      // Suggestion card clicks
      this.container.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
          const type = card.dataset.type;
          this.handleSuggestionClick(type);
        });
      });
    },

    handleSuggestionClick(type) {
      switch (type) {
        case 'wrong_answers':
        case 'not_reviewed':
          this.showAllBookmarks();
          break;
        case 'weak_areas':
          // Could navigate to practice mode
          break;
        case 'streak':
          location.hash = '#/classes';
          break;
      }
    },

    // Modal functions
    async showAllBookmarks() {
      const bookmarks = window.Features?.Bookmarks?.getAll() || [];
      
      await Swal.fire({
        title: 'Tất cả Bookmark',
        html: `
          <div class="swal-bookmarks-list">
            ${bookmarks.length === 0 ? '<p>Chưa có bookmark nào</p>' : 
              bookmarks.map(b => `
                <div class="swal-bookmark-item">
                  <span class="swal-bookmark-status">${b.isCorrect ? '✅' : '❌'}</span>
                  <div class="swal-bookmark-content">
                    <div class="swal-bookmark-question">${this.escapeHtml(b.questionText.substring(0, 80))}...</div>
                    <div class="swal-bookmark-meta">${b.examTitle}</div>
                  </div>
                  <button class="swal-bookmark-ask" data-id="${b.id}">
                    <i class="fa-solid fa-robot"></i>
                  </button>
                </div>
              `).join('')
            }
          </div>
        `,
        width: 600,
        showCloseButton: true,
        showConfirmButton: false,
        didOpen: () => {
          document.querySelectorAll('.swal-bookmark-ask').forEach(btn => {
            btn.addEventListener('click', () => {
              Swal.close();
              this.askAIAboutBookmark(btn.dataset.id);
            });
          });
        }
      });
    },

    async showAllAchievements() {
      const achievements = window.Features?.Achievements?.getAll() || [];
      const progress = window.Features?.Achievements?.getProgress() || { unlocked: 0, total: 0, percentage: 0 };
      
      await Swal.fire({
        title: `Thành tựu (${progress.unlocked}/${progress.total})`,
        html: `
          <div class="swal-achievements-progress">
            <div class="swal-progress-bar">
              <div class="swal-progress-fill" style="width: ${progress.percentage}%"></div>
            </div>
            <span>${progress.percentage}% hoàn thành</span>
          </div>
          <div class="swal-achievements-grid">
            ${achievements.map(a => `
              <div class="swal-achievement ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="swal-achievement-icon">${a.icon}</div>
                <div class="swal-achievement-name">${a.name}</div>
                <div class="swal-achievement-desc">${a.desc}</div>
              </div>
            `).join('')}
          </div>
        `,
        width: 700,
        showCloseButton: true,
        showConfirmButton: false
      });
    },

    async showAddGoalModal() {
      const { value: formValues } = await Swal.fire({
        title: 'Thêm mục tiêu mới',
        html: `
          <div class="swal-form">
            <label>Loại mục tiêu</label>
            <select id="goal-type" class="swal2-input">
              <option value="daily_exams">Số đề làm hôm nay</option>
              <option value="weekly_exams">Số đề làm tuần này</option>
              <option value="score_target">Điểm mục tiêu (%)</option>
              <option value="streak">Duy trì streak (ngày)</option>
            </select>
            <label>Mục tiêu</label>
            <input type="number" id="goal-target" class="swal2-input" min="1" value="5">
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Thêm',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          return {
            type: document.getElementById('goal-type').value,
            target: parseInt(document.getElementById('goal-target').value)
          };
        }
      });

      if (formValues) {
        window.Features?.Goals?.add(formValues);
        this.render();
        Swal.fire({
          icon: 'success',
          title: 'Đã thêm mục tiêu!',
          timer: 1500,
          showConfirmButton: false
        });
      }
    },

    askAIAboutBookmark(bookmarkId) {
      const bookmark = window.Features?.Bookmarks?.bookmarks?.find(b => b.id === bookmarkId);
      if (bookmark && window.Features?.AI) {
        window.Features.AI.askAboutBookmark(bookmark);
      }
    },

    removeBookmark(bookmarkId) {
      Swal.fire({
        title: 'Xóa bookmark?',
        text: 'Bạn có chắc muốn xóa bookmark này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#dc2626'
      }).then((result) => {
        if (result.isConfirmed) {
          window.Features?.Bookmarks?.remove(bookmarkId);
          this.render();
        }
      });
    }
  };

  // Expose to global scope
  window.Dashboard = Dashboard;

})();
