// Small helpers shared by the build (Node) and the admin (browser).

export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))

// JSON that is safe inside a <script> element.
export const scriptJson = value => JSON.stringify(value)
  .replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')

export function telHref(phone) {
  const digits = String(phone ?? '').replace(/\s+/g, '')
  return 'tel:' + (/^[0-9]{8}$/.test(digits) ? '+47' + digits : digits)
}

export function mapsHref(address) {
  const words = String(address ?? '').replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean)
  return 'https://www.google.com/maps/search/?api=1&query=' + words.map(encodeURIComponent).join('+')
}

// UTF-8 safe base64. btoa only takes Latin-1, and spreading a big array into
// String.fromCharCode overflows the stack, so bytes are encoded in chunks.
export function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
export function base64ToBytes(b64) {
  const binary = atob(String(b64).replace(/\s+/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
export const encodeBase64 = text => bytesToBase64(new TextEncoder().encode(text))
export const decodeBase64 = b64 => new TextDecoder().decode(base64ToBytes(b64))

export const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))

// Stable text form used for files in the repo and for change detection.
export const toFileText = data => JSON.stringify(data, null, 2) + '\n'
