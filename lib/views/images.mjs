import {escape} from '../util.mjs'

// Uploads from the admin come with 1280 and 640 px copies next to the original:
// content/uploads/name.webp, name-1280.webp, name-640.webp.
export const UPLOAD_WIDTHS = [640, 1280]
export const MAX_UPLOAD_SIDE = 2400

export const isUpload = path => /^content\/uploads\/[^/]+\.webp$/.test(String(path || ''))
export const variantPath = (path, width) => String(path).replace(/\.webp$/, `-${width}.webp`)
export const uploadFamily = path => isUpload(path) ? [path, ...UPLOAD_WIDTHS.map(w => variantPath(path, w))] : [path]

export function srcsetFor(path, img = x => x) {
  if (!isUpload(path)) return ''
  const urls = [...UPLOAD_WIDTHS.map(w => [img(variantPath(path, w)), w]), [img(path), MAX_UPLOAD_SIDE]]
  // Data URLs contain commas and cannot sit in srcset. They only occur in the admin preview.
  if (urls.some(([u]) => /^(data|blob):/.test(u))) return ''
  return ` srcset="${escape(urls.map(([u, w]) => `${u} ${w}w`).join(', '))}" sizes="(max-width: 700px) 100vw, 50vw"`
}
