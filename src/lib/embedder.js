const OpenAI = require('openai')
require('dotenv').config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function embedChunks(chunks, batchSize = 20) {
  const embeddedChunks = []
  const maxRetries = 3

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const texts = batch.map(chunk => chunk.text)

    const embeddings = await retry(async () => {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts
      })
      return response.data
    }, maxRetries)

    for (let j = 0; j < batch.length; j++) {
      embeddedChunks.push({
        text: batch[j].text,
        metadata: batch[j].metadata,
        embedding: embeddings[j].embedding
      })
    }

    console.log(`Embedded paragraphs ${i}–${i + batch.length - 1}`)
  }

  return embeddedChunks
}

async function retry(fn, attempts = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === attempts) throw error
      console.warn(`Retry ${attempt} failed. Retrying after ${delayMs}ms...`)
      await new Promise(res => setTimeout(res, delayMs))
    }
  }
}

module.exports = { embedChunks }