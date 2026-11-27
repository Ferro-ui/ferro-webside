// h(tag, attrs, ...children): a tiny DOM builder. Attributes starting with "on"
// become event listeners; false/null attributes are skipped.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === false || value == null) continue
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value)
    else if (key === 'class') el.className = value
    else if (key === 'dataset') Object.assign(el.dataset, value)
    else if (key in el && typeof value !== 'string' && key !== 'list') el[key] = value
    else el.setAttribute(key, value === true ? '' : value)
  }
  append(el, children)
  return el
}
export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue
    el.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return el
}
export const $ = (sel, root = document) => root.querySelector(sel)

let uid = 0
export const nextId = prefix => `${prefix}-${++uid}`

export function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('nb-NO', {day: 'numeric', month: 'short', year: 'numeric'}) + ' kl. ' + d.toLocaleTimeString('nb-NO', {hour: '2-digit', minute: '2-digit'})
}

// Accessible modal built on <dialog>. Resolves with the value of the pressed button.
export function dialog({title, body, buttons = [{label: 'OK', value: true, primary: true}], danger = false}) {
  return new Promise(resolve => {
    const box = h('dialog', {class: 'dlg' + (danger ? ' dlg-danger' : ''), 'aria-labelledby': 'dlg-title'},
      h('h2', {id: 'dlg-title'}, title),
      h('div', {class: 'dlg-body'}, body),
      h('div', {class: 'dlg-actions'}, buttons.map(b => h('button', {type: 'button', class: b.primary ? 'btn btn-primary' : b.danger ? 'btn btn-danger' : 'btn',
        onclick: () => { box.close(); resolve(typeof b.value === 'function' ? b.value(box) : b.value) }}, b.label))))
    box.addEventListener('cancel', () => resolve(undefined))
    box.addEventListener('close', () => setTimeout(() => box.remove(), 0))
    document.body.append(box)
    box.showModal()
  })
}

let toastTimer
export function toast(message, kind = 'info') {
  const el = $('#toast')
  el.textContent = message
  el.className = 'toast toast-' + kind
  el.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { el.hidden = true }, kind === 'error' ? 9000 : 4000)
}
