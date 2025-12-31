/**
 * Backend Server for Hoc Lieu Toan
 * Features: AI Tutor API, Leaderboard, User Data Sync
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

const app = express();
const PORT = process.env.PORT || 3001;

dotenv.config();

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5500'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 AI requests per minute
  message: { error: 'AI rate limit exceeded. Please wait a moment.' }
});

// ============================================
// CONFIGURATION
// ============================================
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
  console.warn('Missing GROQ_API_KEY. AI endpoints will not work until you set it in environment variables (e.g. in a local .env file).');
}

// In-memory storage (replace with database in production)
const leaderboardData = new Map();
const userStats = new Map();

// ============================================
// AI TUTOR ENDPOINT
// ============================================
const SYSTEM_PROMPT = `Bạn là một gia sư Toán học thông minh và thân thiện, chuyên hỗ trợ học sinh Việt Nam từ lớp 9 đến lớp 12. 

Nhiệm vụ của bạn:
1. Giải thích các bài toán một cách chi tiết, dễ hiểu
2. Hướng dẫn từng bước cách giải
3. Chỉ ra các lỗi sai thường gặp
4. Đưa ra mẹo và phương pháp ghi nhớ
5. Khuyến khích và động viên học sinh

Quy tắc:
- Sử dụng tiếng Việt
- Giải thích rõ ràng, có cấu trúc
- Sử dụng ký hiệu toán học khi cần (có thể dùng LaTeX với $..$ cho inline và $$...$$ cho block)
- Đưa ra ví dụ minh họa khi phù hợp
- Luôn kiểm tra lại đáp án
- Trả lời ngắn gọn nhưng đầy đủ`;

app.post('/api/ai/chat', aiLimiter, async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'AI service is not configured on server (missing GROQ_API_KEY).' });
    }

    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Build conversation with system prompt
    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10) // Keep last 10 messages for context
    ];

    // Add context if provided (e.g., current question being discussed)
    if (context) {
      conversation[0].content += `\n\nContext hiện tại:\n${context}`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: conversation,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API Error:', error);
      return res.status(response.status).json({ error: 'AI service error' });
    }

    const data = await response.json();
    res.json({
      message: data.choices[0].message.content,
      usage: data.usage
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Streaming endpoint for real-time responses
app.post('/api/ai/chat/stream', aiLimiter, async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      res.write(`data: ${JSON.stringify({ error: 'AI service is not configured on server (missing GROQ_API_KEY).' })}\n\n`);
      res.end();
      return;
    }

    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10)
    ];

    if (context) {
      conversation[0].content += `\n\nContext hiện tại:\n${context}`;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: conversation,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      })
    });

    if (!response.ok) {
      res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
      res.end();
      return;
    }

    // Stream the response
    response.body.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
          } else {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    });

    response.body.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('AI Stream Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    res.end();
  }
});

// ============================================
// LEADERBOARD ENDPOINTS
// ============================================
app.get('/api/leaderboard', apiLimiter, (req, res) => {
  const { grade, period = 'weekly' } = req.query;
  
  // Get leaderboard data
  let entries = Array.from(leaderboardData.values());
  
  // Filter by grade if specified
  if (grade) {
    entries = entries.filter(e => e.grade === grade);
  }
  
  // Filter by period
  const now = Date.now();
  const periodMs = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    alltime: Infinity
  };
  
  const cutoff = now - (periodMs[period] || periodMs.weekly);
  entries = entries.filter(e => new Date(e.lastActivity).getTime() > cutoff);
  
  // Sort by score
  entries.sort((a, b) => b.totalScore - a.totalScore);
  
  // Return top 100
  res.json({
    period,
    grade: grade || 'all',
    entries: entries.slice(0, 100).map((e, i) => ({
      rank: i + 1,
      userId: e.userId,
      displayName: e.displayName,
      avatar: e.avatar,
      totalScore: e.totalScore,
      examsCompleted: e.examsCompleted,
      streak: e.streak
    }))
  });
});

app.post('/api/leaderboard/update', apiLimiter, (req, res) => {
  const { userId, displayName, avatar, grade, score, examsCompleted, streak } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  const existing = leaderboardData.get(userId) || {
    userId,
    displayName: displayName || 'Anonymous',
    avatar: avatar || null,
    grade: grade || 'unknown',
    totalScore: 0,
    examsCompleted: 0,
    streak: 0,
    lastActivity: new Date().toISOString()
  };
  
  // Update stats
  if (score !== undefined) existing.totalScore += score;
  if (examsCompleted !== undefined) existing.examsCompleted += examsCompleted;
  if (streak !== undefined) existing.streak = Math.max(existing.streak, streak);
  if (displayName) existing.displayName = displayName;
  if (avatar) existing.avatar = avatar;
  if (grade) existing.grade = grade;
  existing.lastActivity = new Date().toISOString();
  
  leaderboardData.set(userId, existing);
  
  res.json({ success: true, data: existing });
});

// ============================================
// USER STATS SYNC ENDPOINTS
// ============================================
app.get('/api/user/:userId/stats', apiLimiter, (req, res) => {
  const { userId } = req.params;
  const stats = userStats.get(userId);
  
  if (!stats) {
    return res.status(404).json({ error: 'User stats not found' });
  }
  
  res.json(stats);
});

app.post('/api/user/:userId/stats', apiLimiter, (req, res) => {
  const { userId } = req.params;
  const { statistics, bookmarks, achievements, goals } = req.body;
  
  const existing = userStats.get(userId) || {};
  
  const updated = {
    ...existing,
    userId,
    statistics: statistics || existing.statistics,
    bookmarks: bookmarks || existing.bookmarks,
    achievements: achievements || existing.achievements,
    goals: goals || existing.goals,
    lastSync: new Date().toISOString()
  };
  
  userStats.set(userId, updated);
  
  res.json({ success: true, lastSync: updated.lastSync });
});

// ============================================
// REPORT ENDPOINT
// ============================================
const reports = [];

app.post('/api/report', apiLimiter, (req, res) => {
  const { questionId, examPath, reason, details, userId } = req.body;
  
  const report = {
    id: `report_${Date.now()}`,
    questionId,
    examPath,
    reason,
    details,
    userId,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  reports.push(report);
  console.log('New report:', report);
  
  res.json({ success: true, reportId: report.id });
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API endpoints:`);
  console.log(`   POST /api/ai/chat - AI Tutor chat`);
  console.log(`   POST /api/ai/chat/stream - AI Tutor streaming`);
  console.log(`   GET  /api/leaderboard - Get leaderboard`);
  console.log(`   POST /api/leaderboard/update - Update leaderboard`);
  console.log(`   GET  /api/user/:id/stats - Get user stats`);
  console.log(`   POST /api/user/:id/stats - Sync user stats`);
  console.log(`   POST /api/report - Report question`);
});

module.exports = app;
