const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { Pinecone } = require('@pinecone-database/pinecone')
const { OpenAI } = require('openai')
const { loadState, markBatchComplete, markBatchFailed } = require('./state-manager')
require('dotenv').config()

const REQUIRED_ENV = ['PINECONE_API_KEY', 'PINECONE_REGION', 'PINECONE_INDEX', 'OPENAI_API_KEY']
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`)
    process.exit(1)
  }
}

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_REGION = process.env.PINECONE_REGION
const PINECONE_INDEX = process.env.PINECONE_INDEX

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  })

  return response.data[0].embedding
}

async function createIndex() {
  const existing = await pinecone.listIndexes()

  if (existing.indexes.some(idx => idx.name === PINECONE_INDEX)) {
    console.log(`Index "${PINECONE_INDEX}" already exists.`)
    return
  }

  console.log(`Creating index "${PINECONE_INDEX}"...`)

  await pinecone.createIndex({
    name: PINECONE_INDEX,
    dimension: 1536,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: PINECONE_REGION
      }
    },
    waitUntilReady: true
  })

  console.log(`Index "${PINECONE_INDEX}" is ready.`)
}

function validateVectors(vectors, expectedDim = 1536) {
  for (const vec of vectors) {
    if (!vec.id || typeof vec.id !== 'string') {
      throw new Error(`Vector has invalid or missing ID: ${JSON.stringify(vec)}`)
    }
    if (!Array.isArray(vec.values) || vec.values.length !== expectedDim) {
      throw new Error(`Vector ${vec.id} has invalid embedding length: expected ${expectedDim}, got ${vec.values.length}`)
    }
  }
}

const delay = (ms) => new Promise(res => setTimeout(res, ms))

async function upsertWithRetry(index, batch, namespace, batchNumber, bookName, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await index.upsert(batch, { namespace })
      console.log(`Batch ${batchNumber} succeeded.`)
      markBatchComplete(bookName, batchNumber)
      return
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Batch ${batchNumber}, Attempt ${attempt} failed: ${err.message}`)
      if (attempt === retries) {
        markBatchFailed(bookName, batchNumber)
        throw err
      }
      const backoffTime = 1000 * Math.pow(2, attempt)
      console.log(`Retrying batch ${batchNumber} in ${backoffTime}ms...`)
      await delay(backoffTime)
    }
  }
}

async function uploadBook(bookName) {
  const outputDir = path.join(__dirname, '../..', 'files', 'out', bookName)

  if (!fs.existsSync(outputDir)) {
    console.error(`Book folder "${bookName}" not found.`)
    return
  }

  const state = loadState()
  const completedBatches = (state[bookName] && state[bookName].completedBatches) || []

  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.json') || f.endsWith('.json.gz'))
  const index = pinecone.index(PINECONE_INDEX)

  let batchNumber = 0
  const batchSize = 50

  for (const file of files) {
    const filePath = path.join(outputDir, file)
    const buffer = fs.readFileSync(filePath)
    const json = file.endsWith('.gz') ? zlib.gunzipSync(buffer).toString('utf-8') : buffer.toString('utf-8')
    const chunks = JSON.parse(json)

    const vectors = chunks.map(chunk => ({
      id: `${chunk.metadata.bookTitle.replace(/\s+/g, '_')}-${chunk.metadata.paragraphIndex}`,
      values: chunk.embedding,
      metadata: {
        bookTitle: chunk.metadata.bookTitle,
        headingPath: chunk.metadata.headingPath,
        isCaption: chunk.metadata.isCaption,
        text: chunk.text
      }
    }))

    validateVectors(vectors)

    for (let i = 0; i < vectors.length; i += batchSize) {
      batchNumber++
      if (completedBatches.includes(batchNumber)) {
        console.log(`Skipping already completed batch ${batchNumber}`)
        continue
      }
      const batch = vectors.slice(i, i + batchSize)
      await upsertWithRetry(index, batch, 'library', batchNumber, bookName)
    }
  }

  console.log(`Upload complete for "${bookName}".`)
}

async function uploadBooks(bookNames) {
  for (const bookName of bookNames) {
    await uploadBook(bookName)
  }
}

async function uploadAllBooks() {
  const outputDir = path.join(__dirname, '../..', 'files', 'out')
  const books = fs.readdirSync(outputDir).filter(f => fs.statSync(path.join(outputDir, f)).isDirectory())

  await uploadBooks(books)
}

async function deleteNamespace(namespace) {
  const index = pinecone.index(PINECONE_INDEX)

  console.log(`Deleting namespace "${namespace}"...`)

  await index.deleteAll({ namespace })

  console.log(`Namespace "${namespace}" deleted.`)
}

async function deleteAllNamespaces() {
  const index = pinecone.index(PINECONE_INDEX)

  console.log('Deleting all namespaces...')

  await index.deleteAll({})

  console.log('All namespaces deleted.')
}

async function pineconeSearch(embedding) {
  const index = pinecone.index(PINECONE_INDEX)

  const queryRequest = {
    vector: embedding,
    topK: 5,
    includeMetadata: true
  }

  const queryResponse = await index.query(queryRequest)

  return queryResponse.matches.map(match => ({
    score: match.score,
    bookTitle: match.metadata.bookTitle || '',
    headingPath: match.metadata.headingPath || '',
    text: match.metadata.text || ''
  }))
}

module.exports = {
  generateEmbedding,
  createIndex,
  uploadBook,
  uploadBooks,
  uploadAllBooks,
  deleteNamespace,
  deleteAllNamespaces,
  pineconeSearch
}