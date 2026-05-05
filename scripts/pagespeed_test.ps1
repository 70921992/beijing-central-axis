$url = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://70921992.github.io/beijing-central-axis/&strategy=mobile&category=performance&key=YOUR_API_KEY'
try {
    $r = Invoke-WebRequest -Uri $url -TimeoutSec 60 -UseBasicParsing
    $d = ConvertFrom-Json $r.Content
    $lr = $d.lighthouseResult
    $perf = $lr.categories.performance
    $score = [math]::Round($perf.score * 100)
    $lcp = $lr.audits.'largest-contentful-paint'.numericValue
    $cls = $lr.audits.'cumulative-layout-shift'.numericValue
    $tbt = $lr.audits.'total-blocking-time'.numericValue
    $fcp = $lr.audits.'first-contentful-paint'.numericValue
    Write-Host '=== PageSpeed Insights Mobile ==='
    Write-Host "Performance Score: $score / 100"
    Write-Host "LCP: $([math]::Round($lcp)) ms"
    Write-Host "CLS: $([math]::Round($cls * 100) / 100)"
    Write-Host "TBT: $([math]::Round($tbt)) ms"
    Write-Host "FCP: $([math]::Round($fcp)) ms"
    Write-Host ''
    $opp = $lr.audits.'render-blocking-resources'.details.items
    if ($opp) {
        Write-Host '=== Render Blocking Resources ==='
        foreach ($item in $opp) {
            Write-Host "  $($item.url)"
        }
    }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)"
}
