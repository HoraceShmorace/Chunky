function buildChunks(elements, bookTitle) {
  const chunks = []
  let currentHeadingPath = []
  let paragraphCounter = 0

  for (const el of elements) {
    if (el.type.startsWith('heading')) {
      const headingLevel = parseInt(el.type.replace('heading', ''), 10)
      currentHeadingPath = currentHeadingPath.slice(0, headingLevel - 1)
      currentHeadingPath.push(el.text.trim())
    }

    if (el.type === 'paragraph' || el.type === 'caption') {
      const metadata = {
        bookTitle,
        headingPath: [...currentHeadingPath],
        paragraphIndex: paragraphCounter,
        isCaption: el.type === 'caption'
      }

      chunks.push({
        text: el.text.trim(),
        metadata
      })

      paragraphCounter++
    }
  }

  return chunks
}

module.exports = { buildChunks }
