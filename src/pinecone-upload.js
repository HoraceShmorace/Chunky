require('dotenv').config()

const { uploadBooks, uploadAllBooks } = require('./lib/pinecone-sdk')

async function main() {
  const args = process.argv.slice(2)

  if (args.length > 0) {
    console.log(`Uploading specified books: ${args.join(', ')}`)
    await uploadBooks(args)
  } else {
    console.log('No books specified. Uploading all books in /files/out.')
    await uploadAllBooks()
  }
}

main().catch(error => {
  console.error('Upload failed:', error)
  process.exit(1)
})
