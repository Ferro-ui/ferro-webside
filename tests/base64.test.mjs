import test from 'node:test'
import assert from 'node:assert/strict'
import {encodeBase64, decodeBase64, bytesToBase64, base64ToBytes} from '../lib/util.mjs'

test('base64 round-trip keeps æøå and other UTF-8', () => {
  for (const text of ['æøå ÆØÅ', 'Låve på 800 m² — «sitat» ↗', '€ 😀 Ринг']) {
    assert.equal(decodeBase64(encodeBase64(text)), text)
  }
  assert.equal(encodeBase64('æøå'), Buffer.from('æøå', 'utf8').toString('base64'))
})

test('base64 handles content bigger than one 32 KB chunk', () => {
  const text = 'Ferrobygget på Ulefoss. '.repeat(10000)
  assert.equal(decodeBase64(encodeBase64(text)), text)
  const bytes = new Uint8Array(200000).map((_, i) => i % 256)
  assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes)
})

test('decoding tolerates the line breaks GitHub puts in base64', () => {
  const b64 = encodeBase64('ø'.repeat(100)).replace(/(.{60})/g, '$1\n')
  assert.equal(decodeBase64(b64), 'ø'.repeat(100))
})
