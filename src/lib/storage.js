const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

async function saveEmbeddings(bookTitle, embeddedChunks, batchSize = 1000) {
  if (typeof bookTitle !== 'string' || bookTitle.trim() === '') {
    throw new Error('Invalid bookTitle provided to saveEmbeddings.')
  }

  const safeTitle = bookTitle.toLowerCase().replace(/\s+/g, '_')
  const outputDir = path.join(__dirname, '../..', 'files', 'out', safeTitle)

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  for (let i = 0; i < embeddedChunks.length; i += batchSize) {
    const batch = embeddedChunks.slice(i, i + batchSize)
    const filepath = path.join(outputDir, `batch_${i}.json.gz`)

    const json = JSON.stringify(batch)
    const compressed = zlib.gzipSync(json)

    fs.writeFileSync(filepath, compressed)
    console.log(`Saved ${batch.length} vectors to ${filepath}`)
  }
}

module.exports = { saveEmbeddings }
