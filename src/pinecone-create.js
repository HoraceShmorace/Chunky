require('dotenv').config()

const { createIndex } = require('./lib/pinecone-sdk')

async function main() {
  await createIndex()
}

main().catch(error => {
  console.error('Index creation failed:', error)
  process.exit(1)
})
