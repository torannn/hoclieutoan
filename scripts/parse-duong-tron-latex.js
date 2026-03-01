const fs = require('fs');
const path = require('path');

const TEX_FILE = 'd:/HocLieuWeb/hoclieutoan/data/grade10/Duong-tron-trong-mat-phang-toa-do/chu-de-phuong-trinh-duong-tron-toan-10-knttvcs-le-ba-bao_vi.tex';
const OUTPUT_DIR = 'd:/HocLieuWeb/hoclieutoan/data/grade10/Duong-tron-trong-mat-phang-toa-do';

function parseLatexFile(content) {
    const questions = [];
    let questionCounter = 0;
    
    // Pattern to match \begin{ex}...\end{ex} blocks
    const exPattern = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/g;
    
    let match;
    while ((match = exPattern.exec(content)) !== null) {
        const block = match[1];
        questionCounter++;
        
        // Extract stem (text before \choice or \choiceTF or \loigiai)
        let stem = block.split(/\\choice/)[0].split(/\\loigiai/)[0].trim();
        // Clean up stem
        stem = stem.replace(/\\choiceTF\{/, '').replace(/\\choice\{/, '').trim();
        
        // Check for \choiceTF (true/false with 2 options)
        const choiceTFMatch = block.match(/\\choiceTF\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/);
        // Check for \choice (multiple choice with 4 options)
        const choiceMatch = block.match(/\\choice\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/);
        
        let options = [];
        let type = 'multiple_choice';
        let correctIndex = null;
        
        if (choiceTFMatch) {
            // True/False style - 2 options, empty slots
            const opt1 = choiceTFMatch[1].trim();
            const opt2 = choiceTFMatch[2].trim();
            if (opt1 || opt2) {
                options = [opt1 || '', opt2 || ''].filter(Boolean);
                type = 'multiple_choice'; // Treat as MC with 2 options
            }
        } else if (choiceMatch) {
            // Multiple choice with 4 options
            options = [
                choiceMatch[1].trim(),
                choiceMatch[2].trim(),
                choiceMatch[3].trim(),
                choiceMatch[4].trim()
            ].filter(opt => opt && opt !== '{}');
            type = 'multiple_choice';
        }
        
        // Extract solution from \loigiai{...}
        let solution = '';
        const loigiaiMatch = block.match(/\\loigiai\{([\s\S]*?)\}/);
        if (loigiaiMatch) {
            solution = loigiaiMatch[1].trim();
            // Clean up solution text
            solution = solution.replace(/\\begin\{align\*\}/g, '')
                .replace(/\\end\{align\*\}/g, '')
                .replace(/\$\$/g, '')
                .replace(/\\\[[\s\S]*?\\\]/g, '')
                .replace(/\\\([\s\S]*?\\\)/g, '')
                .replace(/\\dfrac/g, '\\frac')
                .replace(/\\rightarrow/g, '\\to')
                .replace(/\\Leftrightarrow/g, '\\iff')
                .replace(/\n+/g, ' ')
                .trim();
        }
        
        // Only add if we have a stem
        if (stem && stem.length > 5) {
            // Generate q_id
            const qId = `g10_geo_circle_${questionCounter}_p1`;
            
            questions.push({
                q_id: qId,
                section: "Lớp 10 > Hình học > Chương III. Phương trình đường tròn > Bài. Phương trình đường tròn",
                type: type,
                stem: stem,
                options: options.length > 0 ? options : null,
                correct_index: correctIndex,
                main_section: "duong-tron",
                detailed_explanation: solution || "Chưa có lời giải."
            });
        }
    }
    
    return questions;
}

function main() {
    console.log('=== Parsing LaTeX to Exam JSON ===\n');
    
    const content = fs.readFileSync(TEX_FILE, 'utf-8');
    console.log(`Read ${content.length} characters from LaTeX file`);
    
    const questions = parseLatexFile(content);
    console.log(`Extracted ${questions.length} questions\n`);
    
    // Create output structure
    const examData = {
        title: "Chủ đề phương trình đường tròn - Lê Bá Bảo",
        duration: questions.length * 3, // 3 minutes per question
        questions: questions
    };
    
    // Save to exam.json
    const outputPath = path.join(OUTPUT_DIR, 'exam.json');
    fs.writeFileSync(outputPath, JSON.stringify(examData, null, 2), 'utf-8');
    console.log(`Saved to: ${outputPath}`);
    
    // Also create answers.json for backward compatibility
    const answersMap = {};
    questions.forEach(q => {
        answersMap[q.q_id] = q.detailed_explanation;
    });
    
    const answersPath = path.join(OUTPUT_DIR, 'answers.json');
    fs.writeFileSync(answersPath, JSON.stringify(answersMap, null, 2), 'utf-8');
    console.log(`Saved to: ${answersPath}`);
    
    // Show sample questions
    console.log('\n=== Sample Questions ===');
    questions.slice(0, 3).forEach((q, idx) => {
        console.log(`\n--- Question ${idx + 1} ---`);
        console.log(`ID: ${q.q_id}`);
        console.log(`Type: ${q.type}`);
        console.log(`Stem: ${q.stem.substring(0, 100)}...`);
        if (q.options) {
            console.log(`Options: ${q.options.length}`);
        }
    });
}

main();
