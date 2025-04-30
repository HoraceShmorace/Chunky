const { runSingleIngestion, runBatchIngestion } = require('./lib/ingester')

async function main() {
  const input = process.argv[2]

  if (input) {
    await runSingleIngestion(input)
  } else {
    await runBatchIngestion()
  }
}

main().catch(error => {
  console.error('Ingestion failed:', error)
  process.exit(1)
})
