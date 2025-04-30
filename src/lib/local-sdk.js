const fs = require('fs')
const path = require('path')
const { loadEmbeddings } = require('./reader')
const OpenAI = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function loadAllEmbeddings(outputDir = path.join(__dirname, '../..', 'files', 'out')) {
  const books = fs.readdirSync(outputDir).filter(f => fs.statSync(path.join(outputDir, f)).isDirectory())

  const allChunks = []
  for (const book of books) {
    const bookDir = path.join(outputDir, book)
    const files = fs.readdirSync(bookDir).filter(f => f.endsWith('.json') || f.endsWith('.json.gz'))

    for (const file of files) {
      const filePath = path.join(bookDir, file)
      const chunks = loadEmbeddings(filePath)
      allChunks.push(...chunks)
    }
  }

  console.log(`Loaded ${allChunks.length} total embeddings from ${books.length} books.`)
  return allChunks
}

async function embedQuery(query) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query
  })

  return response.data[0].embedding
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
  return dot / (magA * magB)
}

async function search(query, topN = 5) {
  const allChunks = await loadAllEmbeddings()
  const queryEmbedding = await embedQuery(query)

  const scored = allChunks.map(chunk => ({
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
    chunk
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topN).map(result => ({
    score: result.score,
    text: result.chunk.text,
    headingPath: result.chunk.metadata.headingPath || [],
    bookTitle: result.chunk.metadata.bookTitle || '',
    paragraphIndex: result.chunk.metadata.paragraphIndex ?? null,
    isCaption: result.chunk.metadata.isCaption ?? false
  }))
}

module.exports = { search }
