$migrationFiles = Get-ChildItem -Path "c:\Users\User\Documents\modernisum\Backend\migrations\*" -Include "*.sql" | Where-Object { $_.Name -notlike "*.down.sql" } | Sort-Object Name
foreach ($f in $migrationFiles) {
    Write-Host "Applying migration: $($f.Name)"
    Get-Content -Raw $f.FullName | docker exec -i school_postgres psql -U school_user -d school_db
}
