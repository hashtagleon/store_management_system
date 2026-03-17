const fs = require('fs');

const emojiToIcon = {
    '📦': '<i class="ph ph-package"></i>',
    '👁️': '<i class="ph ph-eye"></i>',
    '🔐': '<i class="ph ph-lock-key"></i>',
    '🔑': '<i class="ph ph-key"></i>',
    '❌': '<i class="ph ph-x-circle"></i>',
    '📥': '<i class="ph ph-download-simple"></i>',
    '🔄': '<i class="ph ph-arrows-clockwise"></i>',
    '⚠️': '<i class="ph ph-warning"></i>',
    '📋': '<i class="ph ph-clipboard-text"></i>',
    '✅': '<i class="ph ph-check-circle"></i>',
    '📊': '<i class="ph ph-chart-bar"></i>',
    '📝': '<i class="ph ph-note-pencil"></i>',
    '📤': '<i class="ph ph-upload-simple"></i>',
    '📜': '<i class="ph ph-scroll"></i>',
    '🔍': '<i class="ph ph-magnifying-glass"></i>',
    '📅': '<i class="ph ph-calendar-blank"></i>',
    '➕': '<i class="ph ph-plus"></i>',
    '✏️': '<i class="ph ph-pencil-simple"></i>',
    '🗑️': '<i class="ph ph-trash"></i>',
    '📉': '<i class="ph ph-trend-down"></i>',
    '📄': '<i class="ph ph-file-text"></i>',
    '📕': '<i class="ph ph-file-pdf"></i>',
    '🖨️': '<i class="ph ph-printer"></i>',
    '💾': '<i class="ph ph-floppy-disk"></i>',
    '📂': '<i class="ph ph-folder-open"></i>',
    '⬇️': '<i class="ph ph-download-simple"></i>',
    '📲': '<i class="ph ph-device-mobile"></i>',
    '❤️': '<i class="ph-fill ph-heart" style="color: #ef9a9a;"></i>',
    '🔥': '<i class="ph-fill ph-fire" style="color: #ff9800;"></i>',
    '📭': '<i class="ph ph-mailbox"></i>',
    '✓': '<i class="ph ph-check"></i>'
};

function replaceInFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    
    for (const [emoji, icon] of Object.entries(emojiToIcon)) {
        content = content.split(emoji).join(icon);
    }
    
    if (filepath.endsWith('index.html') && !content.includes('phosphor-icons')) {
        const cdnLink = '<script src="https://unpkg.com/@phosphor-icons/web"></script>';
        content = content.replace('</head>', `    ${cdnLink}\n  </head>`);
    }
    
    fs.writeFileSync(filepath, content, 'utf-8');
}

replaceInFile('index.html');
replaceInFile('app.js');
