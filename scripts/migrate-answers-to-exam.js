const fs = require('fs');
const path = require('path');

const BASE_DIR = 'd:/HocLieuWeb/hoclieutoan';

function findJsonPairs(dir) {
    const pairs = [];
    
    function walk(directory) {
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name === 'exam.json') {
                const dir = path.dirname(fullPath);
                const answersPath = path.join(dir, 'answers.json');
                
                if (fs.existsSync(answersPath)) {
                    pairs.push({
                        examPath: fullPath,
                        answersPath: answersPath,
                        relativePath: path.relative(BASE_DIR, fullPath)
                    });
                }
            }
        }
    }
    
    walk(dir);
    return pairs;
}

function migrateExam(examPath, answersPath) {
    const examContent = JSON.parse(fs.readFileSync(examPath, 'utf-8'));
    const answersContent = JSON.parse(fs.readFileSync(answersPath, 'utf-8'));
    
    let migrated = 0;
    
    if (examContent.questions && Array.isArray(examContent.questions)) {
        for (const question of examContent.questions) {
            const explanation = answersContent[question.q_id];
            
            if (explanation) {
                question.detailed_explanation = explanation;
                migrated++;
            } else {
                question.detailed_explanation = "Chưa có đáp án.";
            }
            
            // Handle group questions
            if (question.is_group && question.sub_questions) {
                for (const subQ of question.sub_questions) {
                    const subExplanation = answersContent[subQ.q_id];
                    if (subExplanation) {
                        subQ.detailed_explanation = subExplanation;
                        migrated++;
                    } else {
                        subQ.detailed_explanation = "Chưa có đáp án.";
                    }
                }
            }
        }
    }
    
    fs.writeFileSync(examPath, JSON.stringify(examContent, null, 2), 'utf-8');
    
    return migrated;
}

function main() {
    console.log('=== Migration Script: Merge answers.json into exam.json ===\n');
    
    const pairs = findJsonPairs(BASE_DIR);
    
    console.log(`Found ${pairs.length} exam/answers pairs:\n`);
    
    let totalMigrated = 0;
    
    for (const pair of pairs) {
        console.log(`Processing: ${pair.relativePath}`);
        
        try {
            const count = migrateExam(pair.examPath, pair.answersPath);
            console.log(`  ✓ Migrated ${count} questions`);
            totalMigrated += count;
        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
        }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total pairs processed: ${pairs.length}`);
    console.log(`Total questions migrated: ${totalMigrated}`);
}

main();
