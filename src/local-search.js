const { search } = require('./lib/local-sdk')

async function main() {
  const query = process.argv[2]
  if (!query) {
    console.error('Usage: node search-local.js "your search text"')
    process.exit(1)
  }

  const results = await search(query)

  console.log(JSON.stringify(results, null, 2))
  return
}

main()
