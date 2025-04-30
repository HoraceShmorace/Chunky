const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function loadEmbeddings(filePath) {
  const ext = path.extname(filePath)

  if (ext === '.gz') {
    const compressed = fs.readFileSync(filePath)
    const json = zlib.gunzipSync(compressed).toString('utf-8')
    return JSON.parse(json)
  }

  if (ext === '.json') {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  }

  throw new Error(`Unsupported file extension: ${ext}`)
}

module.exports = { loadEmbeddings }