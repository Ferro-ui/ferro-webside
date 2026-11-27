// Image uploads: shrink and convert in the browser (canvas -> WebP) before
// anything is sent. The original is capped at 2400 px on the longest side, and
// 1280 and 640 px copies are made for srcset. Nothing is uploaded here; the
// files ride along with the next draft or publish commit.

import {AdminError} from './errors.js'
import {UPLOAD_DIR} from '../lib/content.mjs'
import {UPLOAD_WIDTHS, MAX_UPLOAD_SIDE, variantPath} from '../lib/views/images.mjs'
import {store} from './store.js'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 30 * 1024 * 1024

export function slugifyName(name) {
  const base = String(name).replace(/\.[^.]+$/, '').toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return base || 'bilde'
}

async function encode(bitmap, side) {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82))
  if (!blob || blob.type !== 'image/webp') throw new AdminError('Nettleseren klarer ikke å lage WebP-bilder. Prøv Chrome, Edge, Firefox eller nyere Safari.')
  return {blob, width: w, height: h}
}

const toDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

export async function prepareImage(file) {
  if (!TYPES.includes(file.type)) throw new AdminError('Velg et bilde i JPEG-, PNG- eller WebP-format.')
  if (file.size > MAX_BYTES) throw new AdminError('Bildet er større enn 30 MB. Velg et mindre bilde.')
  let bitmap
  try { bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'}) } catch { throw new AdminError('Bildet kunne ikke leses.') }
  const path = `${UPLOAD_DIR}${slugifyName(file.name)}-${Date.now().toString(36)}.webp`
  const main = await encode(bitmap, MAX_UPLOAD_SIDE)
  const variants = await Promise.all(UPLOAD_WIDTHS.map(async w => ({path: variantPath(path, w), ...(await encode(bitmap, w))})))
  bitmap.close?.()
  const preview = await toDataUrl(variants.find(v => v.path.endsWith('-1280.webp')).blob)
  const files = [{path, ...main}, ...variants]
  for (const f of files) store.uploads.set(f.path, {bytes: new Uint8Array(await f.blob.arrayBuffer()), committed: false, dataUrl: f.path === path ? preview : null})
  return {path, width: main.width, height: main.height, bytes: files.reduce((sum, f) => sum + f.blob.size, 0)}
}

// Where to show an image from, in the admin and in the preview.
export function imageUrl(path) {
  if (!path) return ''
  const up = store.uploads.get(path)
  if (up?.dataUrl) return up.dataUrl
  return store.backend.imageUrl(path)
}
