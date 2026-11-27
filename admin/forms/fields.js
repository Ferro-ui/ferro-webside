// Form fields built from lib/schema.mjs. Inputs write straight into the object
// they edit; typing never rebuilds the form, so focus stays put. Adding,
// removing or moving rows calls ctx.changed(true), which rebuilds the section.

import {h, nextId, toast} from '../dom.js'
import {prepareImage, imageUrl} from '../images.js'
import {store, projectDocs, siteDoc} from '../store.js'

const INPUT = {url: 'url', email: 'email', phone: 'tel', number: 'number', link: 'text', text: 'text', slug: 'text'}

export function renderFields(fields, obj, ctx, base = []) {
  return fields.map(def => renderField(def, obj, ctx, [...base, def.key]))
}

function wrap(def, path, control, id, extra = []) {
  const errId = id + '-err', hintId = id + '-hint'
  control.setAttribute?.('aria-describedby', [def.hint && hintId, errId].filter(Boolean).join(' '))
  return h('div', {class: 'field field-' + def.type, dataset: {path: path.join('.')}},
    h('label', {for: id}, def.label, def.required ? h('span', {class: 'req', 'aria-hidden': 'true'}, ' *') : ''),
    control, ...extra,
    def.hint ? h('p', {class: 'hint', id: hintId}, def.hint) : '',
    h('p', {class: 'field-error', id: errId, hidden: true}))
}

function counter(def, input) {
  if (!def.max) return ''
  const el = h('span', {class: 'counter', 'aria-hidden': 'true'})
  const update = () => { el.textContent = `${input.value.length}/${def.max}`; el.classList.toggle('over', input.value.length > def.max) }
  input.addEventListener('input', update)
  update()
  return el
}

export function renderField(def, obj, ctx, path) {
  const id = nextId('f')
  const key = def.key
  const set = value => { obj[key] = value; ctx.changed(false) }

  if (def.type === 'list') return renderList(def, obj, ctx, path)
  if (def.type === 'object') {
    obj[key] ??= {}
    return h('fieldset', {class: 'group', dataset: {path: path.join('.')}}, h('legend', {}, def.label), renderFields(def.fields, obj[key], ctx, path))
  }
  if (def.type === 'image') return renderImage(def, obj, ctx, path, id)
  if (def.type === 'boolean') {
    const input = h('input', {type: 'checkbox', id, checked: obj[key] === true, onchange: e => set(e.target.checked)})
    return h('div', {class: 'field field-boolean', dataset: {path: path.join('.')}}, h('label', {for: id}, input, ' ', def.label),
      def.hint ? h('p', {class: 'hint'}, def.hint) : '', h('p', {class: 'field-error', id: id + '-err', hidden: true}))
  }
  if (['select','project','category'].includes(def.type)) {
    const options = def.type === 'project'
      ? projectDocs().map(d => ({value: d.current.slug, label: (d.current.title || d.current.slug) + (d.current.published ? '' : ' (ikke publisert)')}))
      : def.type === 'category' ? Object.entries(siteDoc().current.categories).map(([value,label])=>({value,label})) : def.options
    const input = h('select', {id, onchange: e => { set(e.target.value); ctx.onSelect?.(def, obj, e.target.value) }},
      h('option', {value: ''}, '– Velg –'), options.map(o => h('option', {value: o.value, selected: o.value === obj[key]}, o.label)))
    return wrap(def, path, input, id)
  }
  if (def.type === 'textarea') {
    const input = h('textarea', {id, rows: def.rows || 4, oninput: e => set(e.target.value)})
    input.value = obj[key] ?? ''
    return wrap(def, path, input, id, [counter(def, input)])
  }
  const input = h('input', {id, type: INPUT[def.type] || 'text', autocomplete: 'off', spellcheck: def.type === 'text' ? 'true' : 'false',
    step: def.step, min: def.min, max: def.type === 'number' ? def.max : undefined, inputmode: def.type === 'phone' ? 'tel' : undefined,
    oninput: e => set(def.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)})
  input.value = obj[key] ?? ''
  return wrap(def, path, input, id, [def.type === 'text' ? counter(def, input) : ''])
}

function renderImage(def, obj, ctx, path, id) {
  const key = def.key
  const thumb = h('img', {class: 'thumb', alt: '', hidden: !obj[key]})
  const status = h('span', {class: 'hint', 'aria-live': 'polite'})
  const pathInput = h('input', {id, type: 'text', class: 'mono', placeholder: 'content/uploads/bilde.webp', oninput: e => { obj[key] = e.target.value.trim(); refresh(); ctx.changed(false) }})
  pathInput.value = obj[key] ?? ''
  const file = h('input', {type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true, onchange: async e => {
    const picked = e.target.files[0]
    e.target.value = ''
    if (!picked) return
    status.textContent = 'Gjør klar bildet …'
    try {
      const result = await prepareImage(picked)
      obj[key] = result.path
      pathInput.value = result.path
      status.textContent = `Klar: ${result.width} × ${result.height} px, ${Math.round(result.bytes / 1024)} kB. Lastes opp når du lagrer eller publiserer.`
      refresh()
      ctx.changed(false)
      if (def.alt && !obj[def.alt]) {
        const alt = ctx.root?.querySelector(`[data-path="${[...path.slice(0, -1), def.alt].join('.')}"] input`)
        alt?.focus()
        toast('Skriv en kort tekst som beskriver bildet.', 'info')
      }
    } catch (err) { status.textContent = ''; toast(err.message, 'error') }
  }})
  function refresh() {
    thumb.hidden = !obj[key]
    if (obj[key]) thumb.src = imageUrl(obj[key])
    remove.hidden = !obj[key]
  }
  const remove = h('button', {type: 'button', class: 'btn btn-small', onclick: () => { obj[key] = ''; pathInput.value = ''; status.textContent = ''; refresh(); ctx.changed(false) }}, 'Fjern')
  const pick = h('button', {type: 'button', class: 'btn btn-small', onclick: () => file.click()}, obj[key] ? 'Bytt bilde' : 'Velg bilde')
  refresh()
  return wrap(def, path, pathInput, id, [h('div', {class: 'image-row'}, thumb, h('div', {class: 'image-actions'}, pick, remove, file, status))])
}

function renderList(def, obj, ctx, path) {
  obj[def.key] ??= []
  const rows = obj[def.key]
  const isObject = Array.isArray(def.of)
  const listEl = h('ol', {class: 'rows' + (isObject ? ' rows-objects' : '')})
  const move = (from, to) => {
    if (to < 0 || to >= rows.length) return
    rows.splice(to, 0, rows.splice(from, 1)[0])
    ctx.changed(true, {focus: `${path.join('.')}.${to}`})
  }
  rows.forEach((row, i) => {
    const rowPath = [...path, i]
    const label = isObject ? (def.itemLabel?.(row) || `Rad ${i + 1}`) : `${def.of.label} ${i + 1}`
    const tools = h('div', {class: 'row-tools'},
      def.sortable ? h('span', {class: 'drag', title: 'Dra for å flytte', 'aria-hidden': 'true'}, '⋮⋮') : '',
      def.sortable ? h('button', {type: 'button', class: 'icon', 'aria-label': `Flytt ${label} opp`, disabled: i === 0, onclick: () => move(i, i - 1)}, '↑') : '',
      def.sortable ? h('button', {type: 'button', class: 'icon', 'aria-label': `Flytt ${label} ned`, disabled: i === rows.length - 1, onclick: () => move(i, i + 1)}, '↓') : '',
      h('button', {type: 'button', class: 'icon icon-danger', 'aria-label': `Fjern ${label}`, onclick: () => { rows.splice(i, 1); ctx.changed(true) }}, '✕'))
    let item
    if (isObject) {
      const open = ctx.openRows?.has(rowPath.join('.'))
      const details = h('details', {open, ontoggle: e => ctx.openRows?.[e.target.open ? 'add' : 'delete'](rowPath.join('.'))},
        h('summary', {}, h('span', {class: 'row-title'}, label)),
        h('div', {class: 'row-body'}, renderFields(def.of, row, {...ctx, changed: (structural, opts) => {
          details.querySelector('.row-title').textContent = def.itemLabel?.(row) || `Rad ${i + 1}`
          ctx.changed(structural, opts)
        }}, rowPath)))
      item = h('li', {class: 'row', dataset: {path: rowPath.join('.')}}, details, tools)
    } else {
      const holder = {get v() { return rows[i] }, set v(x) { rows[i] = x }}
      const field = renderField({...def.of, key: 'v', label: label}, holder, ctx, rowPath)
      field.querySelector('label')?.classList.add('sr-only')
      item = h('li', {class: 'row row-inline', dataset: {path: rowPath.join('.')}}, field, tools)
    }
    if (def.sortable) dragRow(item, i, move)
    listEl.append(item)
  })
  const add = h('button', {type: 'button', class: 'btn btn-small', disabled: def.max && rows.length >= def.max, onclick: () => {
    const fresh = isObject ? Object.fromEntries(def.of.map(f => [f.key, f.type === 'list' ? [] : f.type === 'number' ? (rows.length ? Number(rows.at(-1)?.start ?? 0) + 3 : 0) : ''])) : ''
    rows.push(fresh)
    ctx.openRows?.add([...path, rows.length - 1].join('.'))
    ctx.changed(true, {focus: `${path.join('.')}.${rows.length - 1}`})
  }}, '+ Legg til')
  return h('fieldset', {class: 'group group-list', dataset: {path: path.join('.')}},
    h('legend', {}, def.label, h('span', {class: 'count'}, ` (${rows.length}${def.max ? ' av ' + def.max : ''})`)),
    def.hint ? h('p', {class: 'hint'}, def.hint) : '',
    h('p', {class: 'field-error', hidden: true}),
    listEl, add)
}

// Mouse/touch drag on the handle; the arrow buttons do the same from the keyboard.
function dragRow(item, index, move) {
  const handle = item.querySelector('.drag')
  if (!handle) return
  handle.addEventListener('pointerdown', () => { item.draggable = true })
  item.addEventListener('dragstart', e => { e.dataTransfer.setData('text/x-row', String(index)); e.dataTransfer.effectAllowed = 'move'; item.classList.add('dragging') })
  item.addEventListener('dragend', () => { item.draggable = false; item.classList.remove('dragging') })
  item.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('text/x-row')) { e.preventDefault(); item.classList.add('drop') } })
  item.addEventListener('dragleave', () => item.classList.remove('drop'))
  item.addEventListener('drop', e => {
    e.preventDefault()
    item.classList.remove('drop')
    const from = Number(e.dataTransfer.getData('text/x-row'))
    if (Number.isInteger(from) && from !== index) move(from, index)
  })
}

// Puts schema errors next to their fields. Paths are relative to the document.
export function showErrors(root, errors, base = []) {
  for (const el of root.querySelectorAll('.field-error')) { el.hidden = true; el.textContent = '' }
  for (const el of root.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid')
  for (const el of root.querySelectorAll('.has-error')) el.classList.remove('has-error')
  const prefix = base.join('.')
  for (const e of errors) {
    const p = e.path.join('.')
    if (prefix && !p.startsWith(prefix)) continue
    const field = root.querySelector(`[data-path="${CSS.escape(p)}"]`)
    if (!field) continue
    const msg = field.querySelector(':scope > .field-error, :scope > .field > .field-error') || field.querySelector('.field-error')
    if (msg) { msg.textContent = e.message; msg.hidden = false }
    field.querySelector('input, textarea, select')?.setAttribute('aria-invalid', 'true')
    field.closest('details')?.classList.add('has-error')
  }
}

export {store}
