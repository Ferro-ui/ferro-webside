// Version history for one content file: list commits, preview an old version
// in the preview pane, and restore it as a new unsaved edit.

import {h, dialog, formatDate, toast} from './dom.js'
import {store, change} from './store.js'
import {draftPathFor} from '../lib/content.mjs'

export async function openHistory(doc, preview, onRestore) {
  const list = h('ol', {class: 'history'}, h('li', {}, 'Henter historikk …'))
  const body = h('div', {}, h('p', {class: 'hint'}, 'Velg en versjon for å se den i forhåndsvisningen. «Gjenopprett» legger den inn som en endring du kan publisere.'), list)
  const closed = dialog({title: 'Historikk', body, buttons: [{label: 'Lukk', value: null}]})
  let entries = []
  try {
    const [published, drafts] = await Promise.all([store.backend.history(doc.path), store.backend.history(draftPathFor(doc.path)).catch(() => [])])
    entries = [...published.map(e => ({...e, path: doc.path, kind: 'Publisert'})), ...drafts.map(e => ({...e, path: draftPathFor(doc.path), kind: 'Utkast'}))]
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  } catch (e) {
    list.replaceChildren(h('li', {class: 'err'}, e.message))
    return
  }
  if (!entries.length) list.replaceChildren(h('li', {}, 'Ingen tidligere versjoner ennå.'))
  else list.replaceChildren(...entries.map(entry => h('li', {},
    h('div', {}, h('strong', {}, formatDate(entry.date)), ' · ', entry.kind, ' · ', entry.author),
    h('div', {class: 'hint'}, entry.message),
    h('button', {type: 'button', class: 'btn btn-small', onclick: () => show(entry)}, 'Vis i forhåndsvisning'))))

  async function show(entry) {
    const text = await store.backend.readAt(entry.path, entry.sha)
    if (text == null) return toast('Fant ikke filen i denne versjonen.', 'error')
    const data = JSON.parse(text)
    document.querySelector('dialog.dlg[open]')?.close()
    preview.showVersion(doc.path, data, `Viser versjonen fra ${formatDate(entry.date)}.`, [
      h('button', {type: 'button', class: 'btn btn-small btn-primary', onclick: () => {
        doc.current = data
        preview.showVersion(null)
        change(doc, 'structure')
        onRestore?.()
        toast('Versjonen er lagt inn. Publiser for å gjøre den gjeldende.', 'ok')
      }}, 'Gjenopprett'),
      h('button', {type: 'button', class: 'btn btn-small', onclick: () => preview.showVersion(null)}, 'Tilbake til mine endringer'),
    ])
  }
  return closed
}
