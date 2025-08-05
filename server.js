const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Khởi tạo các client AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Hàm generateWithFallback vẫn giữ nguyên để đảm bảo tính ổn định
async function generateWithFallback(prompt) {
    try {
        console.log("Attempting with Google Gemini...");
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        console.log("Success with Google Gemini.");
        return result.response.text();
    } catch (googleError) {
        if (googleError.status === 429 || googleError.status === 503) {
            console.warn(`Google API failed (${googleError.status}). Falling back to Groq...`);
            try {
                console.log("Attempting with Groq...");
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'llama3-8b-8192',
                });
                console.log("Success with Groq.");
                return chatCompletion.choices[0]?.message?.content || "";
            } catch (groqError) {
                console.error("Groq API failed. Falling back to OpenAI...", groqError.message);
                try {
                    console.log("Attempting with OpenAI...");
                    const chatCompletion = await openai.chat.completions.create({
                        messages: [{ role: "user", content: prompt }],
                        model: "gpt-4o-mini",
                    });
                    console.log("Success with OpenAI.");
                    return chatCompletion.choices[0]?.message?.content || "";
                } catch (openAIError) {
                    console.error("OpenAI API also failed:", openAIError.message);
                    throw openAIError;
                }
            }
        } else {
            console.error("An unhandled Google API error occurred:", googleError.message);
            throw googleError;
        }
    }
}


// Endpoint mới để giải đáp thắc mắc của học sinh
app.post('/get-explanation', async (req, res) => {
    try {
        const { question, modelAnswer, userQuery } = req.body;
        if (!question || !modelAnswer || !userQuery) {
            return res.status(400).json({ error: 'Thiếu dữ liệu câu hỏi, đáp án hoặc thắc mắc.' });
        }

        // --- PROMPT MỚI DÀNH CHO GIÁO VIÊN TOÁN AI ---
        const prompt = `
            Bạn là một giáo viên dạy Toán giỏi và tận tâm. Vai trò của bạn là giải đáp thắc mắc của học sinh một cách rõ ràng, dễ hiểu.
            
            Dưới đây là thông tin về một bài toán:
            
            1.  **Đề bài:**
                ${question.replace(/<[^>]*>/g, '')}  // Loại bỏ tag HTML để AI tập trung vào nội dung
            
            2.  **Lời giải mẫu (Nguồn thông tin chính xác):**
                ${modelAnswer.replace(/<[^>]*>/g, '')} // Loại bỏ tag HTML
            
            3.  **Thắc mắc của học sinh:**
                "${userQuery}"

            **Nhiệm vụ của bạn:**
            - Dựa **hoàn toàn** vào "Lời giải mẫu" để giải thích. Không đưa ra phương pháp giải khác trừ khi học sinh yêu cầu.
            - Trả lời thẳng vào câu hỏi của học sinh. Giải thích từng bước một cách cặn kẽ nếu cần.
            - Sử dụng ngôn ngữ đơn giản, thân thiện, như đang nói chuyện trực tiếp với học sinh.
            - Giữ câu trả lời ngắn gọn, tập trung vào vấn đề học sinh đang thắc mắc.
            - Toàn bộ câu trả lời của bạn PHẢI được định dạng trong một khối HTML duy nhất. Sử dụng thẻ <p> cho các đoạn văn và <strong> để nhấn mạnh các ý chính. Không sử dụng Markdown.

            Ví dụ định dạng phản hồi:
            <div>
                <p>Chào em, câu hỏi của em rất hay! Để anh/chị giải thích nhé.</p>
                <p>Ở bước 2 của lời giải, chúng ta có ... sở dĩ phải làm vậy là vì ...</p>
                <p><strong>Điểm mấu chốt ở đây là:</strong> ...</p>
                <p>Hy vọng em đã hiểu rõ hơn. Nếu còn thắc mắc, đừng ngần ngại hỏi tiếp nhé!</p>
            </div>
        `;

        const explanationText = await generateWithFallback(prompt);
        // Dọn dẹp output từ AI để đảm bảo nó là HTML hợp lệ
        let cleanedText = explanationText.replace(/```html/g, '').replace(/```/g, '').trim();
        
        // Đảm bảo luôn có một container div bao bọc
        if (!cleanedText.startsWith('<div>')) {
            cleanedText = `<div>${cleanedText}</div>`;
        }
        
        res.json({ explanation: cleanedText });

    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ error: 'Không thể nhận được giải thích từ AI.' });
    }
});

// Phục vụ các file tĩnh (quan trọng để HTML có thể tải JS và CSS)
app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});