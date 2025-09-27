// const API_URL = "http://localhost:3000";
const API_URL = ""; 

document.addEventListener('DOMContentLoaded', () => {
    // === Lấy các phần tử HTML ===
    const classSelectionScreen = document.getElementById('class-selection-screen');
    const examSelectionScreen = document.getElementById('exam-selection-screen');
    const examScreen = document.getElementById('exam-screen');
    const resultsScreen = document.getElementById('results-screen');
    const classMenu = document.getElementById('class-menu');
    const examMenu = document.getElementById('exam-menu');
    const backToClassSelectionBtn = document.getElementById('back-to-class-selection');
    const examTitleHeader = document.getElementById('exam-title-header');
    const timerDisplay = document.getElementById('timer');
    const examQuestionsContainer = document.getElementById('exam-questions-container');
    const submitExamBtn = document.getElementById('submit-exam-btn');
    const resultsContainer = document.getElementById('results-container');
    // THAY ĐỔI: Lấy container của checkbox thay vì select
    const questionCheckboxContainer = document.getElementById('question-checkbox-container');
    const userQueryInput = document.getElementById('user-query-input');
    const getAIExplanationBtn = document.getElementById('get-ai-explanation-btn');
    const aiExplanationArea = document.getElementById('ai-explanation-area');
    const restartBtn = document.getElementById('restart-btn');

    let timerInterval;
    let currentExamData;

    classMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const selectedGrade = e.target.dataset.grade;
            populateExamMenu(selectedGrade);
            classSelectionScreen.classList.add('hidden');
            examSelectionScreen.classList.remove('hidden');
        }
    });

    backToClassSelectionBtn.addEventListener('click', () => {
        examSelectionScreen.classList.add('hidden');
        classSelectionScreen.classList.remove('hidden');
    });

    function populateExamMenu(grade) {
        examMenu.innerHTML = '';
        const gradeKey = `grade${grade}`;
        const gradeData = window.examData.grades[gradeKey] || {};

        // Combine exams and tools for display
        const allItems = [
            ...(gradeData.exams || []),
            ...(gradeData.tools || [])
        ];

        document.getElementById('exam-selection-title').textContent = `Bài kiểm tra Lớp ${grade}`;

        if (allItems.length > 0) {
            allItems.forEach(item => {
                const button = document.createElement('button');
                button.className = 'w-full sm:w-3/4 bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600';
                button.textContent = item.title;
                button.addEventListener('click', () => {
                    if (item.type === 'tool' && item.url) {
                        // Redirect to the tool page
                        window.location.href = item.url;
                    } else {
                        // Start regular exam
                        startExam(item);
                    }
                });
                examMenu.appendChild(button);
            });
        } else {
            examMenu.innerHTML = `<p class="text-gray-500">Chưa có bài kiểm tra nào cho lớp này.</p>`;
        }
    }

    function startExam(examData) {
        currentExamData = examData;
        examTitleHeader.textContent = currentExamData.title;
        let examHTML = '';

        currentExamData.questions.forEach(q => {
            if (q.is_group) {
                examHTML += `<div class="question-container">`;
                examHTML += `${q.group_title}`;
                examHTML += `<div class="pl-4">`;
                q.sub_questions.forEach(sub_q => {
                    examHTML += `<p class="mt-4">${sub_q.question_text}</p>`;
                });
                examHTML += `</div></div>`;
            } else {
                examHTML += `<div class="question-container">${q.question_text}</div>`;
            }
        });

        examQuestionsContainer.innerHTML = examHTML;
        if (window.MathJax) {
            MathJax.typeset();
        }

        examSelectionScreen.classList.add('hidden');
        examScreen.classList.remove('hidden');
        window.scrollTo(0, 0);
        startTimer(currentExamData.duration);
    }

    function startTimer(duration) {
        clearInterval(timerInterval);
        let timer = duration;
        timerInterval = setInterval(() => {
            const hours = Math.floor(timer / 3600);
            const minutes = Math.floor((timer % 3600) / 60);
            const seconds = timer % 60;
            timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            if (--timer < 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "Hết giờ!";
                submitExamBtn.click();
            }
        }, 1000);
    }

    submitExamBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        let resultsHTML = '';
        
        currentExamData.questions.forEach((q, index) => {
            resultsHTML += `<div class="p-4 rounded-lg border bg-gray-50 border-gray-200 mb-4">`;
            if (q.is_group) {
                resultsHTML += `<p class="text-lg text-blue-700 font-bold">${q.group_title.replace('(6 điểm)', '')}</p>`;
                q.sub_questions.forEach(sub_q => {
                    resultsHTML += `<div class="text-sm mt-4 pt-2 border-t border-gray-200">`;
                    resultsHTML += `<p class="font-semibold">${sub_q.question_text}</p>`;
                    resultsHTML += `<div class="mt-2" style="font-weight: normal !important;">${sub_q.model_answer}</div>`;
                    resultsHTML += `</div>`;
                });
            } else {
                const titleMatch = q.question_text.match(/<strong>(.*?)<\/strong>/);
                const titleText = titleMatch ? titleMatch[0] : q.question_text;
                resultsHTML += `<p class="text-lg text-blue-700 font-bold">${titleText}</p>`;
                resultsHTML += `<div class="text-sm mt-2 pt-2 border-t border-gray-200" style="font-weight: normal !important;">${q.model_answer}</div>`;
            }
            resultsHTML += `</div>`;
        });
        
        resultsContainer.innerHTML = resultsHTML;
        if (window.MathJax) {
            MathJax.typeset();
        }
    
        populateQuestionCheckboxes(); // THAY ĐỔI: gọi hàm mới
        aiExplanationArea.innerHTML = '<p class="text-gray-500">Câu trả lời của AI sẽ xuất hiện ở đây...</p>';
        userQueryInput.value = '';
    
        examScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    // THAY ĐỔI: Tạo danh sách các checkbox câu hỏi
    function populateQuestionCheckboxes() {
        questionCheckboxContainer.innerHTML = '';
        currentExamData.questions.forEach((q) => {
            if (q.is_group) {
                q.sub_questions.forEach(sub_q => {
                    const questionId = sub_q.q_id;
                    const questionLabel = sub_q.question_text.substring(0, 2); // Lấy "a)", "b)"...
                    const questionText = `Bài ${q.q_id.slice(-1)}${questionLabel}`; // vd: Bài 1a
                    
                    const item = document.createElement('div');
                    item.className = 'question-checkbox-item';
                    item.innerHTML = `
                        <input type="checkbox" id="q-chk-${questionId}" value="${questionId}">
                        <label for="q-chk-${questionId}">Thắc mắc về ${questionText}</label>
                    `;
                    questionCheckboxContainer.appendChild(item);
                });
            } else {
                const questionId = q.q_id;
                const questionText = q.question_text.substring(q.question_text.indexOf('<strong>') + 8, q.question_text.indexOf(':'));
                
                const item = document.createElement('div');
                item.className = 'question-checkbox-item';
                item.innerHTML = `
                    <input type="checkbox" id="q-chk-${questionId}" value="${questionId}">
                    <label for="q-chk-${questionId}">Thắc mắc về ${questionText}</label>
                `;
                questionCheckboxContainer.appendChild(item);
            }
        });
    }

    // THAY ĐỔI: Cập nhật logic để xử lý nhiều câu hỏi và prompt động
    getAIExplanationBtn.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('#question-checkbox-container input[type="checkbox"]:checked');
        const userQuery = userQueryInput.value.trim();

        if (selectedCheckboxes.length === 0) {
            alert("Vui lòng chọn ít nhất một câu hỏi để thắc mắc.");
            return;
        }

        const questionsForAI = [];
        selectedCheckboxes.forEach(checkbox => {
            const questionId = checkbox.value;
            let questionData = null;
            for (const q of currentExamData.questions) {
                if (q.is_group) {
                    questionData = q.sub_questions.find(sub_q => sub_q.q_id === questionId);
                    if (questionData) break;
                } else {
                    if (q.q_id === questionId) {
                        questionData = q;
                        break;
                    }
                }
            }
            if (questionData) {
                questionsForAI.push({
                    question: questionData.question_text,
                    modelAnswer: questionData.model_answer
                });
            }
        });

        let finalUserQuery = userQuery;
        if (userQuery === '') {
            finalUserQuery = "Hãy giải thích kĩ hơn về các câu đã được chọn.";
        }
        
        aiExplanationArea.innerHTML = `<p class="text-indigo-600">🤖 AI đang suy nghĩ... Vui lòng chờ.</p>`;
        getAIExplanationBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/get-explanation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questions: questionsForAI, // Gửi một mảng câu hỏi
                    userQuery: finalUserQuery  // Gửi prompt cuối cùng
                })
            });
            if (!response.ok) throw new Error(`Lỗi từ máy chủ: ${response.statusText}`);
            const data = await response.json();
            aiExplanationArea.innerHTML = data.explanation;
            if (window.MathJax) {
                MathJax.typeset();
            }
        } catch (error) {
            console.error("Lỗi khi gọi AI:", error);
            aiExplanationArea.innerHTML = `<p class="text-red-600">Đã xảy ra lỗi. Vui lòng đảm bảo máy chủ backend đang chạy và thử lại.</p>`;
        } finally {
            getAIExplanationBtn.disabled = false;
        }
    });

    restartBtn.addEventListener('click', () => {
        resultsScreen.classList.add('hidden');
        classSelectionScreen.classList.remove('hidden');
        currentExamData = null;
    });
});