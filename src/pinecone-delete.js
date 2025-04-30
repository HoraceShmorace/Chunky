require('dotenv').config()

const { deleteNamespace, deleteAllNamespaces } = require('./lib/pinecone-sdk')

async function main() {
  const namespace = process.argv[2]

  if (namespace) {
    console.log(`Deleting namespace: ${namespace}`)
    await deleteNamespace(namespace)
  } else {
    console.log('No namespace specified. Deleting all namespaces in /files/out.')
    await deleteAllNamespaces()
  }
}

main().catch(error => {
  console.error('Delete failed:', error)
  process.exit(1)
})
