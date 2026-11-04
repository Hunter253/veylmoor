# Runs the browser tests. Needs Node.js and Chrome or Edge. Exit code 0 means every test passed.
& node (Join-Path $PSScriptRoot 'browser_tests.mjs')
exit $LASTEXITCODE
