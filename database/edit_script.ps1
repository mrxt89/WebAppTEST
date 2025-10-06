$content = Get-Content script.sql -Encoding Unicode -Raw

# Pattern with trailing space on ItemDescription line (line 3 of the SELECT)
$oldPattern = "        -- CORREZIONE: Usa i valori calcolati correttamente dalla tabella temporanea invece della tabella originale`r`n        SELECT exp.ComponentId, exp.Line as ComponentLine, exp.ComponentId as ItemId,`r`n            exp.ComponentItemCode as ItemCode, exp.ComponentDescription as ItemDescription, `r`n            exp.Quantity, exp.UoM, exp.UnitCost, exp.FixedCost, exp.TotalCost, exp.ComponentType,`r`n            (exp.CalculatedQty * ISNULL(exp.UnitCost, 0)) + (ISNULL(exp.FixedCost, 0) / @ProductionLot * exp.CalculatedQty) as CalculatedTotalCost`r`n        FROM #BOMExplosionCorrect exp`r`n        WHERE exp.IsLoop = 0 AND exp.Level > 0  -- Solo i componenti, non il root`r`n        ORDER BY exp.Line;"

# Replacement WITHOUT trailing space on ItemDescription line, but WITH new Path and ParentBOMId columns
$newPattern = "        -- CORREZIONE: Usa i valori calcolati correttamente dalla tabella temporanea invece della tabella originale`r`n        SELECT exp.ComponentId, exp.Line as ComponentLine, exp.ComponentId as ItemId,`r`n            exp.ComponentItemCode as ItemCode, exp.ComponentDescription as ItemDescription,`r`n            exp.Quantity, exp.UoM, exp.UnitCost, exp.FixedCost, exp.TotalCost, exp.ComponentType,`r`n            (exp.CalculatedQty * ISNULL(exp.UnitCost, 0)) + (ISNULL(exp.FixedCost, 0) / @ProductionLot * exp.CalculatedQty) as CalculatedTotalCost,`r`n            exp.Path,`r`n            exp.ParentBOMId`r`n        FROM #BOMExplosionCorrect exp`r`n        WHERE exp.IsLoop = 0 AND exp.Level > 0  -- Solo i componenti, non il root`r`n        ORDER BY exp.Line;"

if ($content.Contains($oldPattern)) {
    Write-Host "Pattern found! Making replacement..."
    $newContent = $content.Replace($oldPattern, $newPattern)
    Set-Content script.sql -Value $newContent -Encoding Unicode -NoNewline
    Write-Host "Successfully modified the file"
} else {
    Write-Host "ERROR: Pattern not found in file"
}
