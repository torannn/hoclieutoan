const fs = require('fs');
const path = require('path');

const EXAM_FILE = 'd:/HocLieuWeb/hoclieutoan/data/grade10/Duong-tron-trong-mat-phang-toa-do/exam.json';
const OUTPUT_DIR = 'd:/HocLieuWeb/hoclieutoan/data/grade10/Duong-tron-trong-mat-phang-toa-do';

function main() {
    console.log('=== Processing exam.json ===\n');
    
    const examData = JSON.parse(fs.readFileSync(EXAM_FILE, 'utf-8'));
    const questions = examData.questions;
    
    // Categories
    const essayQuestions = []; // <4 options, null correct_index, has solution
    const noSolutionQuestions = []; // "Chưa có lời giải."
    const validQuestions = []; // Everything else
    
    let subQCounter = 0;
    
    questions.forEach((q, idx) => {
        const optionCount = q.options ? q.options.length : 0;
        const hasSolution = q.detailed_explanation && q.detailed_explanation !== "Chưa có lời giải.";
        
        // Check if it's an essay question (OCR misinterpreted a), b) as options)
        if (optionCount > 0 && optionCount < 4 && q.correct_index === null) {
            // This is likely an essay question where OCR misinterpreted
            essayQuestions.push(q);
        }
        // Check if no solution
        else if (!hasSolution) {
            noSolutionQuestions.push(q);
        }
        // Valid multiple choice questions
        else {
            validQuestions.push(q);
        }
    });
    
    console.log(`Total questions: ${questions.length}`);
    console.log(`Essay questions (convert to sub-questions): ${essayQuestions.length}`);
    console.log(`No solution questions (move to self_solve): ${noSolutionQuestions.length}`);
    console.log(`Valid questions: ${validQuestions.length}`);
    
    // Convert essay questions to sub-questions format
    const exampleExercises = [];
    
    essayQuestions.forEach(q => {
        const options = q.options || [];
        const subQuestions = [];
        
        options.forEach((opt, optIdx) => {
            subQCounter++;
            // Extract the sub-question letter (a, b, c, d) from option
            const letter = String.fromCharCode(97 + optIdx); // a, b, c, d
            
            subQuestions.push({
                q_id: `${q.q_id}_sub${optIdx + 1}`,
                type: 'short_answer',
                stem: `${letter}) ${opt}`,
                correct_index: null,
                detailed_explanation: q.detailed_explanation || "Chưa có lời giải."
            });
        });
        
        // Create a group question
        exampleExercises.push({
            q_id: q.q_id,
            type: 'group',
            stem: q.stem,
            is_group: true,
            sub_questions: subQuestions,
            main_section: q.main_section,
            detailed_explanation: q.detailed_explanation
        });
    });
    
    // Save example exercises (archived)
    const exampleExercisesData = {
        title: "Bài tập ví dụ - Phương trình đường tròn (Lê Bá Bảo)",
        description: "Các bài tập tự luận được chuyển đổi từ dạng trắc nghiệm OCR",
        type: "example_exercises",
        questions: exampleExercises
    };
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'example_exercises.json'),
        JSON.stringify(exampleExercisesData, null, 2),
        'utf-8'
    );
    console.log(`\n✓ Saved example_exercises.json (${exampleExercises.length} questions)`);
    
    // Save no-solution questions to self_solve
    const selfSolveData = {
        title: "Bài tập tự luyện - Phương trình đường tròn",
        description: "Các câu hỏi chưa có lời giải, dành cho học sinh tự giải",
        type: "self_solve",
        questions: noSolutionQuestions
    };
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'self_solve.json'),
        JSON.stringify(selfSolveData, null, 2),
        'utf-8'
    );
    console.log(`✓ Saved self_solve.json (${noSolutionQuestions.length} questions)`);
    
    // Update exam.json with only valid questions
    examData.questions = validQuestions;
    examData.question_count = validQuestions.length;
    
    fs.writeFileSync(EXAM_FILE, JSON.stringify(examData, null, 2), 'utf-8');
    console.log(`✓ Updated exam.json (${validQuestions.length} questions remaining)`);
    
    // Show sample of each category
    console.log('\n=== Sample Essay Questions (will convert to sub-questions) ===');
    essayQuestions.slice(0, 2).forEach(q => {
        console.log(`\nQ: ${q.stem.substring(0, 60)}...`);
        console.log(`  Options: ${q.options.join(', ')}`);
    });
    
    console.log('\n=== Sample No-Solution Questions ===');
    noSolutionQuestions.slice(0, 2).forEach(q => {
        console.log(`\nQ: ${q.stem.substring(0, 60)}...`);
    });
}

main();
