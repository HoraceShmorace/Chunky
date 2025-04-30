const fs = require('fs')
const mammoth = require('mammoth')

async function parseDocx(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  const { value } = await mammoth.convertToHtml({ buffer: fileBuffer })

  const plainText = autoFixMissingSpaces(
    value
      .replace(/<\/p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  )

  const lines = plainText.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  const elements = []
  let currentHeadingPath = []

  for (const line of lines) {
    if (isJunkLine(line)) continue

    const fixedLine = autoFixHeadingSpacing(line)
    const headingLevel = getHeadingLevel(fixedLine)

    if (headingLevel > 0) {
      currentHeadingPath = currentHeadingPath.slice(0, headingLevel - 1)
      currentHeadingPath.push(fixedLine.trim())

      elements.push({
        type: `heading${headingLevel}`,
        text: fixedLine.trim()
      })
    } else {
      elements.push({
        type: isCaption(line) ? 'caption' : 'paragraph',
        text: line.trim(),
        headingPath: [...currentHeadingPath]
      })
    }
  }

  return elements
}

function getHeadingLevel(text) {
  const lower = text.toLowerCase()

  if (
    lower.startsWith('chapter') ||
    lower.startsWith('part') ||
    lower.startsWith('prologue') ||
    (text === text.toUpperCase() && text.length > 5 && text.length < 100)
  ) {
    return 1
  }

  if (
    lower.startsWith('section') ||
    /^[0-9]+\.[0-9]+$/.test(lower)
  ) {
    return 2
  }

  if (
    /^[0-9]+\.[0-9]+\.[0-9]+$/.test(lower)
  ) {
    return 3
  }

  return 0
}

function isCaption(text) {
  const lower = text.toLowerCase()
  return (
    lower.startsWith('figure') ||
    lower.startsWith('table') ||
    lower.startsWith('chart') ||
    lower.startsWith('diagram')
  )
}

function autoFixHeadingSpacing(text) {
  return text
    .replace(/(chapter\s*\d+)([A-Z])/i, '$1 $2')
    .replace(/(part\s*\d+)([A-Z])/i, '$1 $2')
    .replace(/(section\s*\d+)([A-Z])/i, '$1 $2')
}

function autoFixMissingSpaces(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
}

function isJunkLine(text) {
  if (!/[a-zA-Z0-9]/.test(text)) return true
  if (text.length < 5) return true
  if (/^[•\-\s\t.]+$/.test(text)) return true
  return false
}

module.exports = { parseDocx }
