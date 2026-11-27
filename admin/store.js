// Admin state: every content file as a document with its published version,
// an optional draft and the version being edited. Saving and publishing turn
// a set of documents into one commit.

import {clone, toFileText} from '../lib/util.mjs'
import {SITE_PATH, PROJECT_DIR, DRAFT_DIR, projectPath, draftPathFor, publishedPathFor, isProjectPath, imagePaths, sortProjects} from '../lib/content.mjs'
import {validateSite, validateProject} from '../lib/schema.mjs'
import {uploadFamily} from '../lib/views/images.mjs'
import * as autosave from './autosave.js'

export const store = {
  backend: null,
  config: null,
  head: null,
  docs: new Map(),          // path of the published file -> doc
  uploads: new Map(),       // path -> {bytes, dataUrl, committed}
  repoUploads: new Set(),
  lastPublish: null,
}

const listeners = new Set()
export const onChange = fn => listeners.add(fn)
export function emit(doc, why = 'edit') {
  for (const fn of listeners) fn(doc, why)
}

const parse = text => { try { return JSON.parse(text) } catch { return null } }

function makeDoc(path, publishedText, draftText) {
  const published = publishedText != null ? parse(publishedText) : null
  const draft = draftText != null ? parse(draftText) : null
  return {
    path, kind: path === SITE_PATH ? 'site' : 'project',
    published, publishedText: published ? toFileText(published) : null,
    draft, draftText: draft ? toFileText(draft) : null,
    current: clone(draft ?? published),
  }
}

export async function loadAll() {
  const {head, files, uploads} = await store.backend.load()
  const texts = new Map(files.map(f => [f.path, f.text]))
  store.head = head
  store.repoUploads = new Set(uploads)
  store.docs = new Map()
  const paths = new Set()
  for (const {path} of files) {
    if (path.startsWith(DRAFT_DIR)) paths.add(publishedPathFor(path))
    else if (path === SITE_PATH || isProjectPath(path)) paths.add(path)
  }
  for (const path of paths) {
    if (path !== SITE_PATH && !isProjectPath(path)) continue
    const doc = makeDoc(path, texts.get(path), texts.get(draftPathFor(path)))
    if (doc.current) store.docs.set(path, doc)
  }
  if (!store.docs.has(SITE_PATH)) throw new Error('content/site.json mangler i repoet.')
}

export const siteDoc = () => store.docs.get(SITE_PATH)
export const projectDocs = () => sortProjects([...store.docs.values()].filter(d => d.kind === 'project').map(d => d.current))
  .map(p => [...store.docs.values()].find(d => d.current === p))

export const baseText = doc => doc.draftText ?? doc.publishedText
export const isDirty = doc => toFileText(doc.current) !== baseText(doc)
export const differsFromPublished = doc => toFileText(doc.current) !== doc.publishedText
export const hasDraft = doc => doc.draftText != null
export const docLabel = doc => doc.kind === 'site' ? 'Sideinnhold (forside, om oss, kontakt, innstillinger)' : 'Prosjekt: ' + (doc.current.title || doc.current.slug)
export const targetPath = doc => doc.kind === 'site' ? SITE_PATH : projectPath(doc.current.slug)

// What the render gets: the site and every project as currently edited.
export function content(override) {
  const site = override?.path === SITE_PATH ? override.data : siteDoc().current
  const projects = [...store.docs.values()].filter(d => d.kind === 'project')
    .map(d => override?.path === d.path ? override.data : d.current)
  return {site, projects}
}

export function validationContext() {
  const {site, projects} = content()
  return {categories: site.categories, projects: projects.filter(p => p.published === true).map(p => p.slug)}
}

export function errorsFor(doc) {
  const ctx = validationContext()
  if (doc.kind === 'site') return validateSite(doc.current, ctx)
  const errors = validateProject(doc.current, ctx)
  const clash = [...store.docs.values()].some(d => d !== doc && d.kind === 'project' && d.current.slug === doc.current.slug)
  if (clash) errors.push({path: ['slug'], message: 'Et annet prosjekt bruker allerede denne adressen.'})
  return errors
}

export function change(doc, why) {
  autosave.schedule(doc)
  emit(doc, why)
}

// Uploads that the given documents point at and that are not in the repo yet.
function pendingUploadsFor(docs) {
  const used = imagePaths(docs.map(d => d.current))
  const out = []
  for (const path of used) {
    const up = store.uploads.get(path)
    if (!up || up.committed) continue
    for (const p of uploadFamily(path)) {
      const file = store.uploads.get(p)
      if (file) out.push({path: p, bytes: file.bytes})
    }
  }
  return out
}

function markUploadsCommitted(changes) {
  for (const c of changes) if (c.bytes) { const up = store.uploads.get(c.path); if (up) up.committed = true; store.repoUploads.add(c.path) }
}

async function commit(changes, message) {
  const result = await store.backend.commit({changes, message, base: store.head})
  store.head = result.commit
  markUploadsCommitted(changes)
  return result
}

export async function saveDrafts(docs) {
  const changes = docs.map(doc => ({path: draftPathFor(doc.path), text: toFileText(doc.current)}))
  changes.push(...pendingUploadsFor(docs))
  const names = docs.map(d => d.kind === 'site' ? 'sideinnhold' : d.current.slug).join(', ')
  const result = await commit(changes, `Utkast: ${names} (via admin)`)
  for (const doc of docs) {
    doc.draft = clone(doc.current)
    doc.draftText = toFileText(doc.current)
    autosave.clear(doc)
    emit(doc, 'saved')
  }
  return result
}

export async function publish(docs) {
  const changes = []
  for (const doc of docs) {
    const target = targetPath(doc)
    changes.push({path: target, text: toFileText(doc.current)})
    if (target !== doc.path && doc.publishedText != null) changes.push({path: doc.path, delete: true})
    if (doc.draftText != null) changes.push({path: draftPathFor(doc.path), delete: true})
  }
  changes.push(...pendingUploadsFor(docs))
  const names = docs.map(d => d.kind === 'site' ? 'sideinnhold' : d.current.slug).join(', ')
  const result = await commit(changes, `Publisert: ${names} (via admin)`)
  for (const doc of docs) {
    const target = targetPath(doc)
    autosave.clear(doc)
    if (target !== doc.path) { store.docs.delete(doc.path); doc.path = target; store.docs.set(target, doc) }
    doc.published = clone(doc.current)
    doc.publishedText = toFileText(doc.current)
    doc.draft = null
    doc.draftText = null
    emit(doc, 'saved')
  }
  store.lastPublish = result.commit
  return result
}

export async function removeProject(doc) {
  const changes = []
  if (doc.publishedText != null) changes.push({path: doc.path, delete: true})
  if (doc.draftText != null) changes.push({path: draftPathFor(doc.path), delete: true})
  let result = null
  if (changes.length) result = await commit(changes, `Slettet prosjekt: ${doc.current.slug} (via admin)`)
  autosave.clear(doc)
  store.docs.delete(doc.path)
  emit(doc, 'removed')
  return {result, published: doc.publishedText != null}
}

// A project that exists only in the browser until it is saved.
export function addProject(data) {
  const doc = {path: projectPath(data.slug), kind: 'project', published: null, publishedText: null, draft: null, draftText: null, current: data}
  store.docs.set(doc.path, doc)
  change(doc, 'structure')
  return doc
}

export const isProjectFile = path => path.startsWith(PROJECT_DIR)
