// "Found" means an exact command-line match against our canonical launch
// (`<electron.exe> .`) — nothing else counts. Any other process sharing the
// executable path (renderer/GPU/utility children, a differently-invoked
// electron.exe, or nothing running at all) is "not found" and must not
// block whatever chains after this script.
//
//   not found (empty OR only partial/non-matching processes) -> exit 0
//   found and killed successfully                             -> exit 0
//   found but killing failed                                  -> exit 1
import electron from 'electron'
import { execFileSync } from 'node:child_process'

const canonicalCommandLine = `${electron} .`

function queryExactMatches() {
  const listScript = `
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -eq "${canonicalCommandLine}" } |
  Select-Object ProcessId |
  ConvertTo-Json
`
  const raw = execFileSync('powershell', ['-NoProfile', '-Command', listScript], {
    encoding: 'utf8'
  }).trim()
  if (!raw) return []
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : [parsed]
}

const matches = queryExactMatches()

if (matches.length === 0) {
  console.log('No exact-match electron.exe process found — nothing to kill.')
  process.exit(0)
}

const ids = matches.map((p) => p.ProcessId).join(',')
execFileSync('powershell', ['-NoProfile', '-Command', `Stop-Process -Id ${ids} -Force`], {
  stdio: 'inherit'
})

const survivors = queryExactMatches()
if (survivors.length > 0) {
  console.error(
    `Found ${matches.length} process(es) but failed to kill: ${survivors.map((p) => p.ProcessId).join(', ')}`
  )
  process.exit(1)
}

console.log(`Killed ${matches.length} process(es): ${matches.map((p) => p.ProcessId).join(', ')}`)
