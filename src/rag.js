/**
 * node rag.js "Explain how serotonin affects mood"
 */

const OpenAI = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const { pineconeSearch } = require('./lib/pinecone-sdk')

async function embedQuery(query) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query
  })

  return response.data[0].embedding
}

async function generateRagResponse(question) {
  const queryEmbedding = await embedQuery(question)
  const results = await pineconeSearch(queryEmbedding)
  const context = results.map(r => r.text).join('\n\n---\n\n')
  const prompt = `
Use the following context to answer the user's question.

Context:
${context}

Question:
${question}

Answer concisely and clearly:
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.2
  })

  return {
    answer: completion.choices[0].message.content.trim(),
    context: context
  }
}

async function main() {
  const question = process.argv.slice(2).join(' ')
  if (!question) {
    console.error('Usage: node rag.js "your question here"')
    process.exit(1)
  }

  const { answer, context } = await generateRagResponse(question)
  console.log(`\n>>> Answer:\n${answer}\n`)
  console.log(`\n>>> Context:\n${context}\n`)
}

main().catch(console.error)
