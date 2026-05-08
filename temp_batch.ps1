$baseDir = 'C:\Users\ok\modernisum\Ai-school\frontend\SuperAdmin\src'
$files = @(Get-ChildItem $baseDir -Filter '*.jsx' -Recurse)

$varReplacements = @{
    'var(--accent)' = 'var(--color-primary)'
    'var(--bg-lighter)' = 'var(--surface-layer2)'
    'var(--text2)' = 'var(--text-secondary)'
    'var(--text3)' = 'var(--text-tertiary)'
    'var(--glass-border)' = 'var(--border-default)'
    'var(--glass)' = 'var(--surface-overlay)'
    'var(--green)' = 'var(--color-success)'
    'var(--blue)' = 'var(--color-info)'
    'var(--red)' = 'var(--color-danger)'
    'var(--amber)' = 'var(--color-warning)'
    'var(--border)' = 'var(--border-default)'
    "var(--bg')" = "var(--surface-root)'"
    'var(--bg2)' = 'var(--surface-layer2)'
    'var(--card-bg)' = 'var(--surface-layer1)'
    'var(--bg-light)' = 'var(--surface-layer2)'
    'var(--text-light)' = 'var(--text-secondary)'
    'var(--text1)' = 'var(--text-primary)'
    'var(--border2)' = 'var(--border-default)'
    'var(--primary)' = 'var(--color-primary)'
}

$colorReplacements = @{
    '#6366f1' = 'var(--color-primary)'
    '#8b5cf6' = 'var(--color-secondary)'
    '#10b981' = 'var(--color-success)'
    '#34d399' = 'color-mix(in srgb, var(--color-success) 80%, white)'
    '#ef4444' = 'var(--color-danger)'
    '#f87171' = 'color-mix(in srgb, var(--color-danger) 70%, white)'
    '#f59e0b' = 'var(--color-warning)'
    '#fbbf24' = 'color-mix(in srgb, var(--color-warning) 80%, white)'
    '#3b82f6' = 'var(--color-info)'
    '#06b6d4' = 'var(--color-accent)'
    '#2563eb' = 'var(--color-secondary)'
    '#f43f5e' = 'var(--color-danger)'
    '#991b1b' = 'color-mix(in srgb, var(--color-danger) 60%, black)'
    '#92400e' = 'color-mix(in srgb, var(--color-warning) 60%, black)'
    '#065f46' = 'color-mix(in srgb, var(--color-success) 60%, black)'
    '#60a5fa' = 'color-mix(in srgb, var(--color-info) 70%, white)'
    '#64748b' = 'var(--text-tertiary)'
    '#94a3b8' = 'var(--text-secondary)'
    '#475569' = 'var(--text-disabled)'
}

$rgbaReplacements = @{
    'rgba(239, 68, 68, 0.1)' = 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
    'rgba(239,68,68,0.1)' = 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
    'rgba(239, 68, 68, 0.12)' = 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
    'rgba(239,68,68,0.12)' = 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
    'rgba(239, 68, 68, 0.15)' = 'color-mix(in srgb, var(--color-danger) 15%, transparent)'
    'rgba(239,68,68,0.15)' = 'color-mix(in srgb, var(--color-danger) 15%, transparent)'
    'rgba(239, 68, 68, 0.2)' = 'color-mix(in srgb, var(--color-danger) 20%, transparent)'
    'rgba(239,68,68,0.2)' = 'color-mix(in srgb, var(--color-danger) 20%, transparent)'
    'rgba(239, 68, 68, 0.25)' = 'var(--border-danger)'
    'rgba(239,68,68,0.25)' = 'var(--border-danger)'
    'rgba(16, 185, 129, 0.1)' = 'color-mix(in srgb, var(--color-success) 10%, transparent)'
    'rgba(16,185,129,0.1)' = 'color-mix(in srgb, var(--color-success) 10%, transparent)'
    'rgba(16, 185, 129, 0.12)' = 'color-mix(in srgb, var(--color-success) 12%, transparent)'
    'rgba(16,185,129,0.12)' = 'color-mix(in srgb, var(--color-success) 12%, transparent)'
    'rgba(16, 185, 129, 0.15)' = 'color-mix(in srgb, var(--color-success) 15%, transparent)'
    'rgba(16,185,129,0.15)' = 'color-mix(in srgb, var(--color-success) 15%, transparent)'
    'rgba(16, 185, 129, 0.2)' = 'color-mix(in srgb, var(--color-success) 20%, transparent)'
    'rgba(16,185,129,0.2)' = 'color-mix(in srgb, var(--color-success) 20%, transparent)'
    'rgba(16, 185, 129, 0.25)' = 'var(--border-success)'
    'rgba(245, 158, 11, 0.1)' = 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
    'rgba(245,158,11,0.1)' = 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
    'rgba(245, 158, 11, 0.12)' = 'color-mix(in srgb, var(--color-warning) 12%, transparent)'
    'rgba(245,158,11,0.12)' = 'color-mix(in srgb, var(--color-warning) 12%, transparent)'
    'rgba(245, 158, 11, 0.15)' = 'color-mix(in srgb, var(--color-warning) 15%, transparent)'
    'rgba(245,158,11,0.15)' = 'color-mix(in srgb, var(--color-warning) 15%, transparent)'
    'rgba(245, 158, 11, 0.2)' = 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
    'rgba(245,158,11,0.2)' = 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
    'rgba(99, 102, 241, 0.1)' = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
    'rgba(99,102,241,0.1)' = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
    'rgba(99, 102, 241, 0.06)' = 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
    'rgba(99,102,241,0.06)' = 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
    'rgba(99, 102, 241, 0.12)' = 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
    'rgba(99,102,241,0.12)' = 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
    'rgba(99, 102, 241, 0.15)' = 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
    'rgba(99,102,241,0.15)' = 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
    'rgba(59, 130, 246, 0.1)' = 'color-mix(in srgb, var(--color-info) 10%, transparent)'
    'rgba(59,130,246,0.1)' = 'color-mix(in srgb, var(--color-info) 10%, transparent)'
    'rgba(59, 130, 246, 0.12)' = 'color-mix(in srgb, var(--color-info) 12%, transparent)'
    'rgba(59,130,246,0.12)' = 'color-mix(in srgb, var(--color-info) 12%, transparent)'
    'rgba(0,0,0,0.2)' = 'color-mix(in srgb, black 20%, transparent)'
    'rgba(0,0,0,0.6)' = 'var(--surface-overlay)'
    'rgba(255,255,255,0.05)' = 'color-mix(in srgb, white 5%, transparent)'
    'rgba(255, 255, 255, 0.05)' = 'color-mix(in srgb, white 5%, transparent)'
}

foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    $changed = $false

    foreach ($key in $varReplacements.Keys) {
        if ($c.Contains($key)) {
            $c = $c.Replace($key, $varReplacements[$key])
            $changed = $true
        }
    }

    foreach ($key in $colorReplacements.Keys) {
        if ($c.Contains($key)) {
            $c = $c.Replace($key, $colorReplacements[$key])
            $changed = $true
        }
    }

    foreach ($key in $rgbaReplacements.Keys) {
        if ($c.Contains($key)) {
            $c = $c.Replace($key, $rgbaReplacements[$key])
            $changed = $true
        }
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($f.FullName, $c)
        Write-Host "Updated: $($f.FullName.Replace($baseDir + '\', ''))"
    }
}
Write-Host "Batch color/var replacement done"
