// Ferro admin: boot, login, layout, sections, save and publish.

import {h, $, dialog, toast, formatDate} from './dom.js'
import {ConflictError} from './errors.js'
import {createGithubBackend} from './backend-github.js'
import {createMockBackend} from './backend-mock.js'
import {store, loadAll, siteDoc, change, onChange, isDirty, hasDraft, differsFromPublished, errorsFor, docLabel,
  saveDrafts, publish, removeProject, addProject} from './store.js'
import * as autosave from './autosave.js'
import {createPreview} from './preview.js'
import {createDeployStatus} from './deploy.js'
import {openHistory} from './history.js'
import {showErrors} from './forms/fields.js'
import {homeSection} from './forms/home.js'
import {aboutSection} from './forms/about.js'
import {contactSection} from './forms/contact.js'
import {settingsSection} from './forms/settings.js'
import {renderProjectList, renderProjectEdit, confirmDelete, badges} from './forms/projects.js'
import {toFileText} from '../lib/util.mjs'
import {isProjectPath} from '../lib/content.mjs'

const SITE_SECTIONS = [homeSection, aboutSection, contactSection, settingsSection]
const NAV = [homeSection, {id: 'prosjekter', label: 'Prosjekter'}, aboutSection, contactSection, settingsSection]
const mock = new URLSearchParams(location.search).has('mock')
const app = $('#app')

async function loadConfig() {
  try { return (await import('./config.js')).default } catch {
    return {repo: 'Ferro-ui/ferro-webside', branch: 'main', siteUrl: new URL('../', location.href).href}
  }
}

async function start() {
  store.config = await loadConfig()
  store.backend = mock ? createMockBackend(store.config) : createGithubBackend(store.config)
  autosave.init(`${mock ? 'demo' : 'github'}:${store.config.repo}`)
  if (store.backend.restore()) boot()
  else loginScreen()
}

// ---------- Login ----------

function loginScreen(message = '') {
  document.title = 'Logg inn · Ferro admin'
  const err = h('p', {class: 'field-error', role: 'alert', hidden: !message}, message)
  const input = h('input', {type: 'password', id: 'token', autocomplete: 'off', spellcheck: 'false', class: 'mono', placeholder: 'github_pat_…', required: true})
  const button = h('button', {type: 'submit', class: 'btn btn-primary'}, 'Logg inn')
  const newToken = `https://github.com/settings/personal-access-tokens/new`
  app.replaceChildren(h('main', {class: 'login'},
    h('img', {src: '../assets/img/ferro-logo.svg', alt: 'Ferro Stålentreprenør', width: 116, height: 77}),
    h('h1', {}, 'Redigere nettstedet'),
    h('p', {}, 'Du logger inn med en nøkkel fra GitHub (et token). Nøkkelen lagres bare i denne fanen og slettes når du lukker den.'),
    h('form', {class: 'login-form', onsubmit: async e => {
      e.preventDefault()
      button.disabled = true
      button.textContent = 'Sjekker …'
      err.hidden = true
      try { await store.backend.login(input.value); input.value = ''; boot() } catch (x) {
        err.textContent = x.message; err.hidden = false; button.disabled = false; button.textContent = 'Logg inn'; input.focus()
      }
    }},
      h('div', {class: 'field'}, h('label', {for: 'token'}, 'Token fra GitHub'), input), err, button),
    h('details', {class: 'login-help', open: true},
      h('summary', {}, 'Slik lager du et token'),
      h('ol', {},
        h('li', {}, 'Logg inn på GitHub og åpne ', h('a', {href: newToken, target: '_blank', rel: 'noopener'}, 'Fine-grained tokens → Generate new token ↗'), '.'),
        h('li', {}, 'Gi tokenet et navn, for eksempel «Ferro admin», og velg hvor lenge det skal gjelde (for eksempel 90 dager).'),
        h('li', {}, 'Under «Resource owner» velger du ', h('strong', {}, store.config.repo.split('/')[0]), '.'),
        h('li', {}, 'Under «Repository access» velger du ', h('strong', {}, 'Only select repositories'), ' og så ', h('strong', {}, store.config.repo), '. Ikke velg «Public repositories». Da kan tokenet bare lese.'),
        h('li', {}, 'Under «Permissions → Repository permissions» setter du ', h('strong', {}, 'Contents: Read and write'), ' og ', h('strong', {}, 'Actions: Read-only'), '. Actions trengs for å vise når nettstedet er publisert.'),
        h('li', {}, 'Trykk «Generate token», kopier tokenet og lim det inn her.')),
      h('p', {class: 'hint'}, 'Ikke del tokenet med andre. Mister du det, sletter du det på GitHub og lager et nytt.')),
    h('p', {class: 'hint'}, 'Vil du bare se hvordan det fungerer? ', h('a', {href: '?mock=1'}, 'Åpne demomodus'), ' – der lagres ingenting.')))
  input.focus()
}

// ---------- App ----------

const ui = {}
let current = {section: homeSection, doc: null}
const openRows = new Set()

async function boot() {
  app.replaceChildren(h('p', {class: 'loading', role: 'status'}, 'Henter innholdet …'))
  try { await loadAll() } catch (e) { return handleError(e, true) }
  layout()
  ui.preview.init().catch(e => toast('Fant ikke malen for forhåndsvisning: ' + e.message, 'error'))
  route()
  offerAutosave()
  store.backend.user().then(login => { if (login) ui.user.textContent = login })
}

function layout() {
  document.title = 'Ferro admin'
  ui.preview = createPreview()
  ui.deploy = createDeployStatus()
  ui.status = h('span', {class: 'save-status', 'aria-live': 'polite'})
  ui.user = h('span', {class: 'user hint'})
  ui.save = h('button', {type: 'button', class: 'btn', onclick: () => saveAll(), title: 'Ctrl/Cmd + S'}, 'Lagre utkast')
  ui.publish = h('button', {type: 'button', class: 'btn btn-primary', onclick: () => publishDialog()}, 'Publiser …')
  ui.nav = h('nav', {class: 'side', 'aria-label': 'Deler av nettstedet'})
  ui.main = h('main', {class: 'editor', id: 'editor', tabindex: '-1'})
  ui.notice = h('div', {class: 'notices'})
  ui.togglePreview = h('button', {type: 'button', class: 'btn btn-preview', 'aria-pressed': 'false', onclick: () => {
    const on = document.body.classList.toggle('show-preview')
    ui.togglePreview.setAttribute('aria-pressed', String(on))
    ui.togglePreview.textContent = on ? 'Tilbake til skjemaet' : 'Forhåndsvis'
    ui.preview.fit()
  }}, 'Forhåndsvis')
  app.replaceChildren(
    mock ? h('div', {class: 'demo-banner', role: 'note'}, 'Demomodus – endringer lagres ikke. ', h('a', {href: './'}, 'Logg inn for å redigere på ekte')) : '',
    h('header', {class: 'top'},
      h('a', {class: 'brand', href: '#forside'}, h('img', {src: '../assets/img/ferro-logo.svg', alt: 'Ferro', width: 54, height: 36}), h('span', {}, 'Admin')),
      h('div', {class: 'top-status'}, ui.status, ui.deploy.el),
      h('div', {class: 'top-actions'}, ui.togglePreview, ui.save, ui.publish,
        h('a', {class: 'btn btn-quiet', href: store.config.siteUrl, target: '_blank', rel: 'noopener'}, 'Se nettstedet ↗'),
        ui.user,
        h('button', {type: 'button', class: 'btn btn-quiet', onclick: logout}, mock ? 'Avslutt' : 'Logg ut'))),
    h('div', {class: 'layout'}, ui.nav, h('div', {class: 'editor-wrap'}, ui.notice, ui.main), ui.preview.el),
    h('div', {id: 'toast', class: 'toast', hidden: true, role: 'status', 'aria-live': 'polite'}))
  onChange((doc, why) => {
    updateStatus()
    if (why === 'structure' || why === 'saved' || why === 'removed') renderNav()
    if (why === 'structure') renderSection()
    else if (why === 'saved') { renderSectionHead(); offerAutosave() }
  })
  addEventListener('hashchange', route)
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveAll() }
  })
  addEventListener('beforeunload', e => {
    if ([...store.docs.values()].some(isDirty)) { autosave.flush([...store.docs.values()]); e.preventDefault(); e.returnValue = '' }
  })
  renderNav()
  updateStatus()
}

function renderNav() {
  const docs = [...store.docs.values()]
  const site = siteDoc()
  ui.nav.replaceChildren(h('ul', {}, NAV.map(s => {
    const dirty = s.id === 'prosjekter' ? docs.some(d => d.kind === 'project' && differsFromPublished(d)) : differsFromSection(site, s)
    const active = current.section?.id === s.id || (s.id === 'prosjekter' && current.doc)
    return h('li', {}, h('a', {href: '#' + s.id, 'aria-current': active ? 'page' : null}, s.label, dirty ? h('span', {class: 'dot', title: 'Ikke publisert'}, h('span', {class: 'sr-only'}, ' (endret)')) : ''))
  })))
}

function differsFromSection(site, section) {
  if (!site.published) return true
  const pick = data => JSON.stringify(section.id === 'innstillinger' ? [data.settings, data.nav] : data[section.base[0]])
  return pick(site.current) !== pick(site.published)
}

function updateStatus() {
  const docs = [...store.docs.values()]
  const dirty = docs.filter(isDirty).length
  const unpublished = docs.filter(differsFromPublished).length
  ui.status.textContent = dirty ? `Ulagrede endringer (${dirty})` : unpublished ? `Ikke publisert (${unpublished})` : 'Alt er publisert'
  ui.status.className = 'save-status' + (dirty ? ' is-dirty' : unpublished ? ' is-draft' : '')
  ui.save.disabled = !dirty
  ui.publish.disabled = !unpublished
}

function route() {
  ui.preview.showVersion(null)
  const hash = decodeURIComponent(location.hash.slice(1)) || 'forside'
  if (hash.startsWith('prosjekt/')) {
    const slug = hash.slice('prosjekt/'.length)
    const doc = [...store.docs.values()].find(d => d.kind === 'project' && d.current.slug === slug)
    if (doc) { current = {section: null, doc}; renderSection(); renderNav(); ui.preview.goto('#prosjekt/' + slug); ui.preview.focusProject(slug); return }
  }
  const section = SITE_SECTIONS.find(s => s.id === hash)
  current = section ? {section, doc: null} : {section: {id: 'prosjekter', label: 'Prosjekter'}, doc: null}
  if (!section && hash !== 'prosjekter') history.replaceState(null, '', '#forside'), current = {section: homeSection, doc: null}
  renderSection()
  renderNav()
  ui.preview.goto(current.section.hash || '#prosjekter')
  ui.preview.focusProject(null)
  ui.main.focus({preventScroll: true})
}

const openProject = doc => { location.hash = '#prosjekt/' + encodeURIComponent(doc.current.slug) }

function editedDoc() {
  if (current.doc) return current.doc
  return current.section?.id === 'prosjekter' ? null : siteDoc()
}

function renderSectionHead() {
  const head = ui.main.querySelector('.section-head')
  if (head) head.replaceWith(sectionHead())
}

function sectionHead() {
  const doc = editedDoc()
  const title = current.doc ? (current.doc.current.title || 'Nytt prosjekt') : current.section.label
  const draftNote = doc && hasDraft(doc) ? h('p', {class: 'note note-draft'}, 'Denne delen har et lagret utkast som ikke er publisert. Repoet er offentlig, så utkast kan leses på GitHub.') : ''
  return h('div', {class: 'section-head'},
    current.doc ? h('a', {href: '#prosjekter', class: 'back'}, '← Alle prosjekter') : '',
    h('div', {class: 'section-title'}, h('h1', {}, title), doc && doc.kind === 'project' ? badges(doc) : doc ? siteBadges(doc) : ''),
    current.section?.intro ? h('p', {class: 'intro'}, current.section.intro) : '',
    draftNote,
    doc ? h('div', {class: 'section-tools'},
      doc.publishedText != null ? h('button', {type: 'button', class: 'btn btn-small', onclick: () => openHistory(doc, ui.preview, () => {})}, 'Historikk') : '',
      current.doc ? h('button', {type: 'button', class: 'btn btn-small btn-danger', onclick: () => deleteProject(current.doc)}, 'Slett prosjektet') : '') : '')
}

function siteBadges(doc) {
  return h('span', {class: 'badges'}, hasDraft(doc) ? h('span', {class: 'badge badge-draft'}, 'Utkast') : '', isDirty(doc) ? h('span', {class: 'badge badge-dirty'}, 'Ulagret') : '')
}

function renderSection(opts = {}) {
  const y = ui.main.scrollTop
  const doc = editedDoc()
  const form = h('form', {class: 'form', novalidate: true, onsubmit: e => e.preventDefault()})
  const ctx = {
    root: form, openRows,
    changed: (structural, o = {}) => {
      if (structural) { change(doc, 'structure'); if (o.focus) requestAnimationFrame(() => ui.main.querySelector(`[data-path="${CSS.escape(o.focus)}"] input, [data-path="${CSS.escape(o.focus)}"] summary`)?.focus()) }
      else { change(doc, 'edit'); validate() }
    },
  }
  let nodes
  if (current.doc) nodes = renderProjectEdit(current.doc, ctx)
  else if (current.section.id === 'prosjekter') nodes = renderProjectList({open: openProject})
  else nodes = current.section.render(ctx)
  form.append(...nodes)
  ui.main.replaceChildren(sectionHead(), form)
  function validate() {
    if (!doc) return
    showErrors(form, errorsFor(doc), current.section?.base || [])
    renderSectionHeadBadges()
  }
  validate()
  ui.main.scrollTop = opts.keepScroll === false ? 0 : y
}

function renderSectionHeadBadges() {
  const doc = editedDoc()
  const holder = ui.main.querySelector('.section-title .badges')
  if (doc && holder) holder.replaceWith(doc.kind === 'project' ? badges(doc) : siteBadges(doc))
}

// ---------- Save, publish, delete ----------

async function saveAll() {
  const docs = [...store.docs.values()].filter(isDirty)
  if (!docs.length) return toast('Ingen ulagrede endringer.')
  await run(ui.save, 'Lagrer …', async () => {
    await saveDrafts(docs)
    toast(mock ? 'Utkastet er lagret (bare i demoen).' : 'Utkastet er lagret. Det vises ikke på nettstedet før du publiserer.', 'ok')
  })
}

async function publishDialog() {
  const docs = [...store.docs.values()].filter(differsFromPublished)
  if (!docs.length) return toast('Alt er allerede publisert.')
  const rows = docs.map(doc => {
    const errors = errorsFor(doc)
    const box = h('input', {type: 'checkbox', checked: !errors.length, disabled: !!errors.length})
    return {doc, box, errors, el: h('li', {}, h('label', {}, box, ' ', docLabel(doc)),
      errors.length ? h('p', {class: 'field-error'}, `${errors.length} feil må rettes først: ${errors[0].message} `, h('a', {href: doc.kind === 'project' ? '#prosjekt/' + doc.current.slug : '#' + sectionFor(errors[0].path)}, 'Gå til feltet')) : '')}
  })
  const body = h('div', {},
    h('p', {}, 'Dette blir publisert samlet, i én endring. Nettstedet er oppdatert omtrent ett minutt etterpå.'),
    h('ul', {class: 'publish-list'}, rows.map(r => r.el)),
    h('p', {class: 'hint'}, 'Repoet på GitHub er offentlig. Alt du lagrer der, også utkast, kan leses av alle som ser i repoet.'))
  body.addEventListener('click', e => { if (e.target.closest('a')) document.querySelector('dialog.dlg[open]')?.close() })
  const ok = await dialog({title: 'Publiser endringer', body, buttons: [{label: 'Avbryt', value: false}, {label: 'Publiser nå', primary: true, value: true}]})
  if (!ok) return
  const selected = rows.filter(r => r.box.checked && !r.errors.length).map(r => r.doc)
  if (!selected.length) return toast('Ingenting valgt.')
  await run(ui.publish, 'Publiserer …', async () => {
    const result = await publish(selected)
    toast(mock ? 'Publisert i demoen. Nettstedet endres ikke.' : 'Publisert. Nettstedet bygges nå.', 'ok')
    ui.deploy.watch(result.commit)
    if (current.doc) history.replaceState(null, '', '#prosjekt/' + encodeURIComponent(current.doc.current.slug))
  })
}

function sectionFor(path) {
  const map = {home: 'forside', about: 'om-oss', contact: 'kontakt', settings: 'innstillinger', nav: 'innstillinger'}
  return map[path[0]] || 'forside'
}

async function deleteProject(doc) {
  if (!(await confirmDelete(doc))) return
  await run(null, '', async () => {
    const {published} = await removeProject(doc)
    location.hash = '#prosjekter'
    toast(published ? 'Prosjektet er slettet. Nettstedet oppdateres om litt.' : 'Prosjektet er slettet.', 'ok')
    if (published && store.head) ui.deploy.watch(store.head)
  })
}

async function run(button, busyText, fn) {
  const label = button?.textContent
  if (button) { button.disabled = true; button.textContent = busyText }
  try { await fn() } catch (e) { await handleError(e) } finally {
    if (button) { button.textContent = label; updateStatus() }
  }
}

async function handleError(e, fatal = false) {
  console.error(e)
  if (e instanceof ConflictError) {
    autosave.flush([...store.docs.values()])
    const reload = await dialog({title: 'Innholdet er endret et annet sted',
      body: h('p', {}, 'Noen har publisert eller lagret i mellomtiden, kanskje fra en annen fane eller maskin. Endringene dine er tatt vare på i nettleseren. Last inn siste versjon, så får du tilbud om å hente dem inn igjen.'),
      buttons: [{label: 'Ikke nå', value: false}, {label: 'Last inn på nytt', primary: true, value: true}]})
    if (reload) {
      try { await loadAll(); renderNav(); renderSection(); updateStatus(); ui.preview.refresh(); offerAutosave() } catch (x) { handleError(x) }
    }
    return
  }
  if (e.status === 401) {
    autosave.flush([...store.docs.values()])
    store.backend.logout()
    return loginScreen('Innloggingen er utløpt. Endringene dine er tatt vare på i nettleseren. Logg inn igjen.')
  }
  if (fatal) {
    if (!mock) store.backend.logout()
    return mock ? app.replaceChildren(h('p', {class: 'loading field-error'}, e.message)) : loginScreen(e.message)
  }
  toast(e.message || 'Noe gikk galt.', 'error')
}

function logout() {
  if ([...store.docs.values()].some(isDirty)) autosave.flush([...store.docs.values()])
  store.backend.logout()
  location.href = './'
}

// ---------- Autosave offer ----------

function offerAutosave() {
  const entries = autosave.entries().filter(entry => {
    const doc = store.docs.get(entry.path)
    if (!doc) return isProjectPath(entry.path)
    return entry.text !== toFileText(doc.current)
  })
  ui.notice.replaceChildren()
  if (!entries.length) return
  const names = entries.map(entry => {
    const doc = store.docs.get(entry.path)
    try { return doc ? docLabel(doc) : 'Nytt prosjekt: ' + (JSON.parse(entry.text).title || '') } catch { return entry.path }
  })
  const newest = entries.map(e => e.at).sort().at(-1)
  const box = h('div', {class: 'note note-autosave', role: 'region', 'aria-label': 'Ulagrede endringer'},
    h('p', {}, h('strong', {}, 'Du har ulagrede endringer fra ' + formatDate(newest) + '. '), names.join(', ') + '.'),
    h('div', {}, h('button', {type: 'button', class: 'btn btn-small btn-primary', onclick: () => {
      for (const entry of entries) {
        let data
        try { data = JSON.parse(entry.text) } catch { continue }
        const doc = store.docs.get(entry.path)
        if (doc) { doc.current = data; change(doc, 'quiet') } else addProject(data)
      }
      box.remove()
      renderNav(); renderSection(); updateStatus(); ui.preview.refresh()
      toast('Endringene er hentet inn igjen. Husk å lagre eller publisere.', 'ok')
    }}, 'Hent inn igjen'), ' ',
    h('button', {type: 'button', class: 'btn btn-small', onclick: () => { entries.forEach(e => autosave.drop(e.path)); box.remove() }}, 'Forkast')))
  ui.notice.append(box)
}

start()
