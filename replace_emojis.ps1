$files = @("app.js", "index.html")

$replacements = @{
    "📦" = "<i class=`"ph ph-package`"></i>";
    "👁️" = "<i class=`"ph ph-eye`"></i>";
    "🔐" = "<i class=`"ph ph-lock-key`"></i>";
    "🔑" = "<i class=`"ph ph-key`"></i>";
    "❌" = "<i class=`"ph ph-x-circle`"></i>";
    "📥" = "<i class=`"ph ph-download-simple`"></i>";
    "🔄" = "<i class=`"ph ph-arrows-clockwise`"></i>";
    "⚠️" = "<i class=`"ph ph-warning`"></i>";
    "📋" = "<i class=`"ph ph-clipboard-text`"></i>";
    "✅" = "<i class=`"ph ph-check-circle`"></i>";
    "📊" = "<i class=`"ph ph-chart-bar`"></i>";
    "📝" = "<i class=`"ph ph-note-pencil`"></i>";
    "📤" = "<i class=`"ph ph-upload-simple`"></i>";
    "📜" = "<i class=`"ph ph-scroll`"></i>";
    "🔍" = "<i class=`"ph ph-magnifying-glass`"></i>";
    "📅" = "<i class=`"ph ph-calendar-blank`"></i>";
    "➕" = "<i class=`"ph ph-plus`"></i>";
    "✏️" = "<i class=`"ph ph-pencil-simple`"></i>";
    "🗑️" = "<i class=`"ph ph-trash`"></i>";
    "📉" = "<i class=`"ph ph-trend-down`"></i>";
    "📄" = "<i class=`"ph ph-file-text`"></i>";
    "📕" = "<i class=`"ph ph-file-pdf`"></i>";
    "🖨️" = "<i class=`"ph ph-printer`"></i>";
    "💾" = "<i class=`"ph ph-floppy-disk`"></i>";
    "📂" = "<i class=`"ph ph-folder-open`"></i>";
    "⬇️" = "<i class=`"ph ph-download-simple`"></i>";
    "📲" = "<i class=`"ph ph-device-mobile`"></i>";
    "❤️" = "<i class=`"ph-fill ph-heart`" style=`"color: #ef9a9a;`"></i>";
    "🔥" = "<i class=`"ph-fill ph-fire`" style=`"color: #ff9800;`"></i>";
    "📭" = "<i class=`"ph ph-mailbox`"></i>";
    "✓" = "<i class=`"ph ph-check`"></i>"
}

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content -Path $file -Encoding UTF8 -Raw
        foreach ($key in $replacements.Keys) {
            $value = $replacements[$key]
            $content = $content.Replace($key, $value)
        }
        
        if ($file -match "index.html" -and $content -notmatch "phosphor-icons") {
            $content = $content.Replace("</head>", "    <script src=`"https://unpkg.com/@phosphor-icons/web`"></script>`n  </head>")
        }
        
        Set-Content -Path $file -Value $content -Encoding UTF8
    }
}
