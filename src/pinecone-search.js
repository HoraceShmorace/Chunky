const { generateEmbedding, pineconeSearch } = require('./lib/pinecone-sdk')
require('dotenv').config()

async function main() {
  const query = process.argv[2]

  if (!query) {
    console.error('Usage: node search-pinecone.js "your search text"')
    process.exit(1)
  }

  const embedding = await generateEmbedding(query)
  const results = await pineconeSearch(embedding)

  console.log(JSON.stringify(results, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
