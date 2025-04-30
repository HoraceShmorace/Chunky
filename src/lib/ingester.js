const path = require('path')
const fs = require('fs')
const { parseDocx } = require('./parser')
const { buildChunks } = require('./chunker')
const { embedChunks } = require('./embedder')
const { saveEmbeddings } = require('./storage')

const inDir = path.join(__dirname, '../..', 'files', 'in')
const processedDir = path.join(__dirname, '../..', 'files', 'processed')

async function runIngestion(filePath, bookName) {
  const elements = await parseDocx(filePath)
  const chunks = buildChunks(elements, bookName)
  const embeddedChunks = await embedChunks(chunks)
  await saveEmbeddings(bookName, embeddedChunks)
}

function moveToProcessed(fileName) {
  const fromPath = path.join(inDir, fileName)
  const toPath = path.join(processedDir, fileName)

  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true })
  }

  fs.renameSync(fromPath, toPath)
  console.log(`Moved "${fileName}" to processed.`)
}

async function runSingleIngestion(inputFileName) {
  const filePath = path.join(inDir, inputFileName)
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${inputFileName}`)
    process.exit(1)
  }

  const bookName = path.basename(inputFileName, '.docx')
  console.log(`Processing single book: ${bookName}`)

  try {
    await runIngestion(filePath, bookName)
    moveToProcessed(inputFileName)
  } catch (error) {
    console.error(`Failed processing "${inputFileName}":`, error)
    process.exit(1)
  }
}

async function runBatchIngestion() {
  const files = fs.readdirSync(inDir).filter(f => f.endsWith('.docx'))

  for (const file of files) {
    const filePath = path.join(inDir, file)
    const bookName = path.basename(file, '.docx')
    console.log(`Processing book: ${bookName}`)

    try {
      await runIngestion(filePath, bookName)
      moveToProcessed(file)
    } catch (error) {
      console.error(`Failed processing "${file}":`, error)
    }
  }
}

module.exports = { runSingleIngestion, runBatchIngestion }
