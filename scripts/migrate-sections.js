const fs = require('fs');
const path = require('path');

const SECTIONS_DIR = 'd:/HocLieuWeb/hoclieutoan/BankOnTap/sections';
const ANSWERS_FILE = 'd:/HocLieuWeb/hoclieutoan/BankOnTap/answers.json';

function migrateSectionFiles() {
    const answersContent = JSON.parse(fs.readFileSync(ANSWERS_FILE, 'utf-8'));
    
    const files = fs.readdirSync(SECTIONS_DIR).filter(f => f.startsWith('section-') && f.endsWith('.json'));
    
    console.log(`Found ${files.length} section files\n`);
    
    let totalMigrated = 0;
    
    for (const file of files) {
        const filePath = path.join(SECTIONS_DIR, file);
        console.log(`Processing: ${file}`);
        
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            let migrated = 0;
            
            if (content.questions && Array.isArray(content.questions)) {
                for (const question of content.questions) {
                    const explanation = answersContent[question.q_id];
                    
                    if (explanation) {
                        question.detailed_explanation = explanation;
                        migrated++;
                    } else {
                        question.detailed_explanation = "Chưa có đáp án.";
                    }
                }
            }
            
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
            console.log(`  ✓ Migrated ${migrated} questions`);
            totalMigrated += migrated;
        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
        }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total section files processed: ${files.length}`);
    console.log(`Total questions migrated: ${totalMigrated}`);
}

migrateSectionFiles();
