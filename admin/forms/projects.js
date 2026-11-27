import {projectFields} from '../../lib/schema.mjs'
import {newProject, PROJECT_DIR} from '../../lib/content.mjs'
import {renderFields} from './fields.js'
import {h, dialog, toast} from '../dom.js'
import {store, siteDoc, projectDocs, addProject, change, isDirty, hasDraft, differsFromPublished} from '../store.js'
import {slugifyName} from '../images.js'

export function badges(doc) {
  return h('span', {class: 'badges'},
    doc.publishedText == null ? h('span', {class: 'badge badge-new'}, 'Ny') : '',
    doc.current.published === false ? h('span', {class: 'badge'}, 'Skjult') : '',
    hasDraft(doc) ? h('span', {class: 'badge badge-draft'}, 'Utkast') : '',
    isDirty(doc) ? h('span', {class: 'badge badge-dirty'}, 'Ulagret') : '',
    !isDirty(doc) && !hasDraft(doc) && differsFromPublished(doc) ? h('span', {class: 'badge badge-dirty'}, 'Ikke publisert') : '')
}

export function renderProjectList({open}) {
  const docs = projectDocs()
  const cats = siteDoc().current.categories
  const move = (i, dir) => {
    const a = docs[i], b = docs[i + dir]
    if (!b) return
    // Give every project a clean order first, then swap the two.
    docs.forEach((d, k) => { if (d.current.order !== (k + 1) * 10) { d.current.order = (k + 1) * 10; change(d, 'quiet') } })
    ;[a.current.order, b.current.order] = [b.current.order, a.current.order]
    change(a, 'structure'); change(b, 'structure')
  }
  return [
    h('div', {class: 'list-actions'}, h('button', {type: 'button', class: 'btn btn-primary', onclick: () => createProject(open)}, '+ Nytt prosjekt')),
    h('ol', {class: 'project-list'}, docs.map((doc, i) => h('li', {class: 'project-row'},
      h('button', {type: 'button', class: 'project-open', onclick: () => open(doc)},
        h('strong', {}, doc.current.title || doc.current.slug),
        h('span', {class: 'hint'}, [doc.current.sted, cats[doc.current.category]].filter(Boolean).join(' · ')),
        badges(doc)),
      h('div', {class: 'row-tools'},
        h('button', {type: 'button', class: 'icon', 'aria-label': `Flytt ${doc.current.title} opp`, disabled: i === 0, onclick: () => move(i, -1)}, '↑'),
        h('button', {type: 'button', class: 'icon', 'aria-label': `Flytt ${doc.current.title} ned`, disabled: i === docs.length - 1, onclick: () => move(i, 1)}, '↓'))))),
    h('p', {class: 'hint'}, 'Rekkefølgen her er rekkefølgen på prosjektsiden.'),
  ]
}

async function createProject(open) {
  const input = h('input', {type: 'text', id: 'new-project-title', maxlength: 100})
  const err = h('p', {class: 'field-error', hidden: true})
  const body = h('div', {class: 'field'}, h('label', {for: 'new-project-title'}, 'Navn på prosjektet'), input, err,
    h('p', {class: 'hint'}, 'Prosjektet blir lagret som skjult til du slår på «Vis på nettstedet» og publiserer.'))
  setTimeout(() => input.focus(), 50)
  const title = await dialog({title: 'Nytt prosjekt', body, buttons: [{label: 'Avbryt', value: null}, {label: 'Opprett', primary: true, value: () => input.value.trim()}]})
  if (!title) return
  const used = new Set([...store.docs.values()].filter(d => d.kind === 'project').map(d => d.current.slug))
  let slug = slugifyName(title), n = 2
  while (used.has(slug) || store.docs.has(PROJECT_DIR + slug + '.json')) slug = `${slugifyName(title)}-${n++}`
  const docs = projectDocs()
  const order = Math.max(0, ...docs.map(d => d.current.order || 0)) + 10
  const doc = addProject({...newProject(slug, Object.keys(siteDoc().current.categories)[0], order), title})
  open(doc)
}

export function renderProjectEdit(doc, ctx) {
  const cats = siteDoc().current.categories
  const published = h('input', {type: 'checkbox', id: 'project-published', checked: doc.current.published === true,
    onchange: e => { doc.current.published = e.target.checked; ctx.changed(true) }})
  return [
    h('div', {class: 'field field-boolean field-published'},
      h('label', {for: 'project-published'}, published, ' Vis på nettstedet'),
      h('p', {class: 'hint'}, 'Slå av for å skjule prosjektet uten å slette det. Endringen gjelder når du publiserer.')),
    ...renderFields(projectFields(cats), doc.current, ctx),
  ]
}

export async function confirmDelete(doc) {
  return dialog({
    title: 'Slette prosjektet?', danger: true,
    body: h('div', {}, h('p', {}, `«${doc.current.title || doc.current.slug}» blir fjernet fra nettstedet og fra listen her.`),
      h('p', {class: 'hint'}, 'Tidligere versjoner finnes fortsatt i historikken på GitHub. Vil du bare skjule det, slå av «Vis på nettstedet» i stedet.')),
    buttons: [{label: 'Avbryt', value: false}, {label: 'Slett prosjektet', danger: true, value: true}],
  })
}

export {toast}
