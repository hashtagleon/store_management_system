import os

emoji_to_icon = {
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
}

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for emoji, icon in emoji_to_icon.items():
        content = content.replace(emoji, icon)
        
    if filepath.endswith('index.html') and 'phosphor-icons' not in content:
        cdn_link = '<script src="https://unpkg.com/@phosphor-icons/web"></script>'
        content = content.replace('</head>', f'    {cdn_link}\n  </head>')
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('index.html')
replace_in_file('app.js')
