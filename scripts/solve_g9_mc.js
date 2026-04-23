const fs = require('fs');

// Read .env manually
const envPath = '../server/.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) process.env[parts[0]] = parts.slice(1).join('=');
  });
}

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error("Missing GROQ_API_KEY in server/.env");
  process.exit(1);
}

const chunksPath = '../data/grade9/on-thi-tuyen-sinh/ON_TAP_LOP_9_chunks.json';
const outPath = '../data/grade9/on-thi-tuyen-sinh/answers.json';

const data = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
const mcqs = data.chunks.filter(c => c.type === 'multiple_choice');

let answers = {};
if (fs.existsSync(outPath)) {
  answers = JSON.parse(fs.readFileSync(outPath, 'utf8'));
}

async function solveQuestion(q) {
  const prompt = `Bạn là một giáo viên Toán xuất sắc. 
Hãy giải câu trắc nghiệm Toán lớp 9 sau và CHỈ TRẢ VỀ ĐÚNG 1 CHỮ SỐ (0, 1, 2, hoặc 3) tương ứng với vị trí của đáp án đúng. Không giải thích, không viết thêm bất kỳ ký tự nào khác.

Câu hỏi:
${q.prompt}

Các đáp án (index 0 đến 3):
0) ${q.options[0]}
1) ${q.options[1]}
2) ${q.options[2]}
3) ${q.options[3]}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 10
      })
    });
    
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    const answerStr = json.choices[0].message.content.trim();
    const match = answerStr.match(/[0123]/);
    
    if (match) {
      return parseInt(match[0], 10);
    } else {
      console.log(`[!] Failed to parse index for ${q.chunk_id}, got: "${answerStr}"`);
      return null;
    }
  } catch (err) {
    console.error(`[!] Error solving ${q.chunk_id}:`, err.message);
    return null;
  }
}

async function run() {
  console.log(`Found ${mcqs.length} MCQs to solve...`);
  
  for (let i = 0; i < mcqs.length; i++) {
    const q = mcqs[i];
    if (answers[q.chunk_id] !== undefined) {
      // already solved
      continue;
    }
    
    process.stdout.write(`Solving ${i + 1}/${mcqs.length} (${q.chunk_id})... `);
    const ans = await solveQuestion(q);
    
    if (ans !== null) {
      answers[q.chunk_id] = ans;
      console.log(`✅ Index: ${ans}`);
      fs.writeFileSync(outPath, JSON.stringify(answers, null, 2));
    } else {
      console.log('❌ Failed');
    }
    
    // Rate limit sleep (2000ms to stay under 30 RPM limit)
    await new Promise(resolve => setTimeout(resolve, 2050));
  }
  
  console.log('Done!');
}

run();
