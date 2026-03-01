const fs = require('fs');
const path = require('path');

const BASE_DIR = 'd:/HocLieuWeb/hoclieutoan';
const ARCHIVE_DIR = 'd:/HocLieuWeb/hoclieutoan/archives/answers-backup';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function findAndArchiveAnswers() {
    ensureDir(ARCHIVE_DIR);
    
    let archived = 0;
    let skipped = 0;
    
    function walk(directory) {
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            
            if (entry.isDirectory()) {
                // Skip node_modules and archives directories
                if (entry.name !== 'node_modules' && entry.name !== 'archives') {
                    walk(fullPath);
                }
            } else if (entry.name === 'answers.json') {
                const examPath = path.join(path.dirname(fullPath), 'exam.json');
                
                // Check if exam.json exists and has detailed_explanation
                if (fs.existsSync(examPath)) {
                    try {
                        const examContent = JSON.parse(fs.readFileSync(examPath, 'utf-8'));
                        const hasDetailedExplanation = examContent.questions && 
                            examContent.questions.some(q => q.detailed_explanation);
                        
                        if (hasDetailedExplanation) {
                            // Archive the file
                            const relativePath = path.relative(BASE_DIR, fullPath);
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const archiveName = `${relativePath.replace(/[/\\]/g, '_')}.${timestamp}`;
                            const archivePath = path.join(ARCHIVE_DIR, archiveName);
                            
                            fs.copyFileSync(fullPath, archivePath);
                            fs.unlinkSync(fullPath);
                            
                            console.log(`✓ Archived: ${relativePath}`);
                            archived++;
                        } else {
                            console.log(`✗ Skipped (no detailed_explanation): ${path.relative(BASE_DIR, fullPath)}`);
                            skipped++;
                        }
                    } catch (e) {
                        console.log(`✗ Error processing ${fullPath}: ${e.message}`);
                    }
                }
            }
        }
    }
    
    walk(BASE_DIR);
    
    console.log(`\n=== Summary ===`);
    console.log(`Archived: ${archived}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Archive location: ${ARCHIVE_DIR}`);
}

findAndArchiveAnswers();
