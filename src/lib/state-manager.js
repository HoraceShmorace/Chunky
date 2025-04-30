const fs = require('fs')
const path = require('path')

const statePath = path.join(__dirname, 'state.json')

function loadState() {
  if (!fs.existsSync(statePath)) return {}
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
}

function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

function markBatchComplete(book, batchNumber) {
  const state = loadState()
  if (!state[book]) state[book] = { completedBatches: [], failedBatches: [] }
  state[book].completedBatches.push(batchNumber)
  saveState(state)
}

function markBatchFailed(book, batchNumber) {
  const state = loadState()
  if (!state[book]) state[book] = { completedBatches: [], failedBatches: [] }
  state[book].failedBatches.push(batchNumber)
  saveState(state)
}

module.exports = { loadState, markBatchComplete, markBatchFailed }
