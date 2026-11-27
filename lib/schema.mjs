// The one place that describes the content: fields, labels, limits and rules.
// The admin builds its forms from it, the build refuses content that fails it,
// and the tests check it. Messages are Norwegian because editors see them.

const field = (type, key, label, opts = {}) => ({type, key, label, ...opts})
export const text = (key, label, opts) => field('text', key, label, {max: 200, ...opts})
export const textarea = (key, label, opts) => field('textarea', key, label, {max: 1000, ...opts})
export const url = (key, label, opts) => field('url', key, label, opts)
export const email = (key, label, opts) => field('email', key, label, opts)
export const phone = (key, label, opts) => field('phone', key, label, opts)
export const link = (key, label, opts) => field('link', key, label, opts)
export const image = (key, label, opts) => field('image', key, label, opts)
export const number = (key, label, opts) => field('number', key, label, opts)
export const slug = (key, label, opts) => field('slug', key, label, opts)
export const select = (key, label, opts) => field('select', key, label, opts)
export const project = (key, label, opts) => field('project', key, label, opts)
export const boolean = (key, label, opts) => field('boolean', key, label, opts)
export const list = (key, label, of, opts) => field('list', key, label, {of, ...opts})
export const object = (key, label, fields, opts) => field('object', key, label, {fields, ...opts})

export const PATTERNS = {
  email: /^[^\s@<>"]+@[^\s@<>".]+(\.[^\s@<>".]+)*\.[a-z]{2,}$/i,
  phone: /^\+?[0-9][0-9 ]{6,18}[0-9]$/,
  slug: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  image: /^(assets|content\/uploads)\/[A-Za-z0-9_\-./]+\.(webp|jpe?g|png|svg|avif)$/i,
  orgNr: /^[0-9]{3} ?[0-9]{3} ?[0-9]{3}$/,
}

export const MESSAGES = {
  required: 'Fyll ut feltet.',
  max: n => `Maks ${n} tegn.`,
  url: 'Skriv en full adresse som starter med https://',
  email: 'Skriv en gyldig e-postadresse, for eksempel navn@firma.no.',
  phone: 'Skriv telefonnummeret med tall og mellomrom, for eksempel 958 37 123.',
  slug: 'Bruk små bokstaver, tall og bindestrek, for eksempel nytt-lagerbygg.',
  link: 'Bruk en lenke som starter med # (en del av siden) eller https://',
  image: 'Bildet må ligge under assets/ eller content/uploads/ og være WebP, JPEG, PNG, SVG eller AVIF.',
  alt: 'Bildet trenger en kort tekst som beskriver det.',
  number: (min, max) => `Skriv et tall fra ${min} til ${max}.`,
  maxItems: n => `Maks ${n} rader.`,
  minItems: n => `Minst ${n} rad${n === 1 ? '' : 'er'}.`,
  select: 'Velg et av alternativene.',
  project: 'Velg et prosjekt som finnes.',
  pattern: 'Formatet stemmer ikke.',
}

export const settingsFields = [
  url('siteUrl', 'Adressen til nettstedet', {required: true, hint: 'Full adresse med / til slutt. Brukes i delingslenker og sitemap.xml.'}),
  text('title', 'Tittel i søkeresultater', {required: true, max: 70, hint: 'Vises i fanen og hos Google. Hold den under 60 tegn.'}),
  textarea('description', 'Beskrivelse i søkeresultater', {required: true, max: 170, rows: 3, hint: 'Én eller to setninger, helst under 155 tegn.'}),
  image('ogImage', 'Bilde ved deling', {alt: 'ogImageAlt', hint: 'Vises når noen deler lenken på Facebook eller i meldinger. Helst 1200 × 630 px.'}),
  text('ogImageAlt', 'Tekst som beskriver delingsbildet', {max: 140, requiredWith: 'ogImage'}),
]

export const navFields = [
  list('nav', 'Menyen øverst', [
    text('label', 'Tekst', {required: true, max: 30}),
    link('href', 'Lenke', {required: true, hint: 'For eksempel #prosjekter eller #kontakt.'}),
  ], {max: 8, min: 1, itemLabel: row => row.label || 'Ny lenke'}),
]

export const contactFields = [
  text('heading', 'Overskrift', {required: true, max: 80}),
  textarea('intro', 'Ingress', {max: 300, rows: 2}),
  phone('phone', 'Telefon', {required: true, hint: 'Med tall og mellomrom, for eksempel 958 37 123. Brukes i menyen, bunnen og på kontaktsiden.'}),
  email('email', 'E-post', {required: true, hint: 'Mottar også e-postutkastet fra skjemaet.'}),
  text('address', 'Adresse', {required: true, max: 100, hint: 'Kartlenken lages fra adressen.'}),
  text('orgNr', 'Organisasjonsnummer', {pattern: 'orgNr', max: 11, hint: 'Ni sifre, for eksempel 926 542 680.'}),
  url('facebookUrl', 'Facebook-side'),
  url('brochureUrl', 'Brosjyre'),
  url('privacyUrl', 'Personvernerklæring', {required: true}),
  text('formTitle', 'Overskrift over skjemaet', {required: true, max: 80}),
  textarea('formIntro', 'Tekst over skjemaet', {max: 300, rows: 2}),
  list('buildingTypes', 'Byggtyper i skjemaet', text('', 'Byggtype', {required: true, max: 40}), {max: 30}),
]

export const homeFields = [
  text('heading', 'Hovedoverskrift', {required: true, max: 80}),
  textarea('intro', 'Ingress', {max: 300, rows: 3}),
  field('mainFilm', 'video', 'Bytt film', {hint: 'MP4, maks 40 MB. Kontroller starttidene for scenene når du bytter film.'}),
  list('scenes', 'Scener i dronefilmen', [
    project('project', 'Prosjekt', {required: true}),
    text('label', 'Knappetekst', {required: true, max: 20, hint: 'Kort stedsnavn, for eksempel Nome.'}),
    number('start', 'Starttid i filmen (sekunder)', {required: true, min: 0, max: 600, step: 0.01}),
    text('title', 'Bildetekst', {required: true, max: 80}),
    image('image', 'Lite bilde ved siden av filmen'),
  ], {max: 8, sortable: true, itemLabel: row => `${row.label || 'Ny scene'} · ${row.start ?? 0} s`,
    check: rows => {
      const errors = []
      rows.forEach((row, i) => { if (i && Number(row.start) <= Number(rows[i - 1].start)) errors.push({path: [i, 'start'], message: 'Starttiden må være senere enn scenen før.'}) })
      return errors
    }}),
  list('films', 'Flere filmer på forsiden', [
    text('label', 'Knappetekst', {required:true,max:40}),
    project('project','Prosjekt',{required:true}),
    field('video','video','Videofil',{required:true}),
  ], {max:12,sortable:true,itemLabel:r=>r.label || 'Ny film'}),
  list('featured', 'Utvalgte prosjekter', [
    project('project', 'Prosjekt', {required: true}),
    text('title', 'Tittel på kortet', {required: true, max: 80}),
    text('meta', 'Sted og type', {max: 80, hint: 'For eksempel Dalen · Industri og kontor.'}),
    textarea('text', 'Kort tekst', {max: 200, rows: 2}),
    image('image', 'Bilde', {alt: 'alt'}),
    text('alt', 'Tekst som beskriver bildet', {max: 140, requiredWith: 'image'}),
  ], {max: 6, sortable: true, itemLabel: row => row.title || 'Nytt kort'}),
  object('building','Hva vi bygger',[
    text('heading','Overskrift',{required:true}), textarea('intro','Innledning'),
    list('items','Byggtyper',[text('label','Lenketekst',{required:true}),field('category','category','Prosjektkategori',{required:true})],{sortable:true,max:20,itemLabel:r=>r.label || 'Ny byggtype'})
  ]),
  object('process','Slik jobber vi',[
    text('heading','Overskrift',{required:true}), textarea('intro','Innledning'),
    image('image','Prosessbilde',{alt:'alt'}),text('alt','Bildebeskrivelse',{requiredWith:'image'}),
    list('steps','Trinn',[text('title','Tittel',{required:true}),textarea('text','Beskrivelse')],{sortable:true,max:16,itemLabel:r=>r.title || 'Nytt trinn'})
  ]),
]

export const aboutFields = [
  text('heading', 'Overskrift', {required: true, max: 80}),
  textarea('intro', 'Ingress', {max: 300, rows: 2}),
  image('heroImage', 'Stort bilde', {alt: 'heroAlt'}),
  text('heroAlt', 'Tekst som beskriver bildet', {max: 140, requiredWith: 'heroImage'}),
  text('teamHeading', 'Overskrift over ansatte', {required: true, max: 80}),
  textarea('teamIntro', 'Tekst over ansatte', {max: 300, rows: 2}),
  list('people', 'Ansatte', [
    text('name', 'Navn', {required: true, max: 80}),
    text('role', 'Stilling', {max: 80}),
    email('email', 'E-post'),
    phone('phone', 'Telefon'),
    image('photo', 'Portrett', {hint: 'Navnet brukes som tekst til bildet.'}),
  ], {max: 12, sortable: true, itemLabel: row => row.name || 'Ny person'}),
  text('joinTitle', 'Rekruttering, uthevet', {max: 60}),
  text('joinText', 'Rekruttering, tekst', {max: 160}),
  email('joinEmail', 'E-post for søknader'),
  text('officeHeading', 'Overskrift om kontoret', {required: true, max: 80}),
  textarea('officeText', 'Tekst om kontoret', {max: 400, rows: 3}),
  image('officePhoto', 'Bilde av kontoret', {alt: 'officeAlt'}),
  text('officeAlt', 'Tekst som beskriver bildet', {max: 140, requiredWith: 'officePhoto'}),
  text('briefHeading', 'Overskrift før første samtale', { max: 80}),
  textarea('briefText', 'Innledning før første samtale', {max: 300, rows: 2}),
  list('briefItems', 'Før første samtale', text('', 'Punkt', {required: true, max: 80}), {max: 20, sortable: true}),
  text('closingHeading', 'Overskrift nederst', {required: true, max: 80}),
  textarea('closingText', 'Tekst nederst', {max: 300, rows: 2}),
]

export function projectFields(categories = {}) {
  return [
    text('title', 'Navn på prosjektet', {required: true, max: 100}),
    slug('slug', 'Adresse', {required: true, max: 60, hint: 'Brukes i lenken #prosjekt/adresse. Bytt den helst ikke etter publisering.'}),
    select('category', 'Kategori', {required: true, options: Object.entries(categories).map(([value, label]) => ({value, label}))}),
    text('sted', 'Sted', {required: true, max: 60}),
    textarea('lead', 'Kort tekst', {required: true, max: 300, rows: 2, hint: 'Vises på prosjektkortet og øverst på prosjektsiden.'}),
    text('headline', 'Overskrift på prosjektsiden', {max: 120, hint: 'Tomt felt gir navnet på prosjektet.'}),
    image('hero', 'Hovedbilde', {alt: 'heroAlt'}),
    text('heroAlt', 'Tekst som beskriver hovedbildet', {max: 140, requiredWith: 'hero'}),
    list('body', 'Brødtekst', textarea('', 'Avsnitt', {required: true, max: 1500, rows: 4}), {max: 20, sortable: true}),
    list('specs', 'Leveransen', text('', 'Punkt', {required: true, max: 160}), {max: 20, sortable: true}),
    text('client', 'Byggherre', {max: 100}),
    text('byggetid', 'Byggetid', {max: 60, hint: 'For eksempel Juni – november 2023.'}),
    list('facts', 'Fakta', [
      text('label', 'Overskrift', {required: true, max: 40}),
      text('value', 'Verdi', {required: true, max: 120}),
    ], {max: 12, sortable: true, itemLabel: row => row.label || 'Ny rad'}),
    list('gallery', 'Bildegalleri', image('', 'Bilde', {required: true, hint: 'Knappen til hvert bilde får tekst fra prosjektnavnet.'}), {max: 30, sortable: true}),
    object('quote', 'Sitat fra kunden', [
      textarea('text', 'Sitat', {max: 600, rows: 3}),
      text('name', 'Navn', {max: 80, requiredWith: 'text'}),
      text('org', 'Firma', {max: 100}),
    ]),
  ]
}

export const SECTIONS = {
  home: {label: 'Forside', fields: homeFields},
  about: {label: 'Om oss', fields: aboutFields},
  contact: {label: 'Kontakt', fields: contactFields},
  settings: {label: 'Innstillinger', fields: [...settingsFields]},
  nav: {label: 'Meny', fields: navFields},
}

const isEmpty = value => value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length)

export function checkUrl(value) {
  try {
    const u = new URL(value)
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname && !/\s/.test(value)
  } catch { return false }
}

// Returns a message for a single value, or '' when it is fine.
export function checkValue(def, value, ctx = {}, sibling = {}) {
  if (def.requiredWith && isEmpty(value) && !isEmpty(sibling[def.requiredWith])) return def.requiredWith.match(/image|photo|hero/i) ? MESSAGES.alt : MESSAGES.required
  if (isEmpty(value)) return def.required ? MESSAGES.required : ''
  switch (def.type) {
    case 'text': case 'textarea':
      if (typeof value !== 'string') return MESSAGES.required
      if (def.max && value.length > def.max) return MESSAGES.max(def.max)
      if (def.pattern && !PATTERNS[def.pattern].test(value.trim())) return def.pattern === 'orgNr' ? 'Skriv ni sifre, for eksempel 926 542 680.' : MESSAGES.pattern
      return ''
    case 'url': return checkUrl(value) ? '' : MESSAGES.url
    case 'email': return PATTERNS.email.test(value) ? '' : MESSAGES.email
    case 'phone': return PATTERNS.phone.test(value) && value.replace(/\D/g, '').length >= 8 ? '' : MESSAGES.phone
    case 'link': return /^#[a-z0-9\-/]*$/i.test(value) || checkUrl(value) ? '' : MESSAGES.link
    case 'slug': return PATTERNS.slug.test(value) && value.length <= (def.max || 60) ? '' : MESSAGES.slug
    case 'video': return /^content\/uploads\/[a-z0-9-]+\.mp4$/.test(value) ? '' : 'Last opp en MP4-film.'
    case 'image': return PATTERNS.image.test(value) && !value.includes('..') ? '' : MESSAGES.image
    case 'number': {
      const n = typeof value === 'number' ? value : NaN
      return Number.isFinite(n) && n >= def.min && n <= def.max ? '' : MESSAGES.number(def.min, def.max)
    }
    case 'category': return Object.hasOwn(ctx.categories || {},value) ? '' : MESSAGES.select
    case 'select': return def.options.some(o => o.value === value) ? '' : MESSAGES.select
    case 'project': return !ctx.projects || ctx.projects.includes(value) ? '' : MESSAGES.project
    case 'boolean': return typeof value === 'boolean' ? '' : MESSAGES.select
    default: return ''
  }
}

// Validates an object against a field list. Returns [{path: [...], message}].
export function validateFields(fields, data, ctx = {}, base = []) {
  const errors = []
  const obj = data && typeof data === 'object' ? data : {}
  for (const def of fields) {
    const value = obj[def.key]
    const path = [...base, def.key]
    if (def.type === 'list') {
      const rows = value ?? []
      if (!Array.isArray(rows)) { errors.push({path, message: MESSAGES.required}); continue }
      if (def.max && rows.length > def.max) errors.push({path, message: MESSAGES.maxItems(def.max)})
      if (def.min && rows.length < def.min) errors.push({path, message: MESSAGES.minItems(def.min)})
      rows.forEach((row, i) => {
        if (Array.isArray(def.of)) errors.push(...validateFields(def.of, row, ctx, [...path, i]))
        else {
          const message = checkValue(def.of, row, ctx)
          if (message) errors.push({path: [...path, i], message})
        }
      })
      if (def.check) errors.push(...def.check(rows).map(e => ({...e, path: [...path, ...e.path]})))
    } else if (def.type === 'object') {
      if (value != null) errors.push(...validateFields(def.fields, value, ctx, path))
    } else {
      const message = checkValue(def, value, ctx, obj)
      if (message) errors.push({path, message})
    }
  }
  return errors
}

export function validateSite(site, ctx = {}) {
  const errors = []
  const part = (key, fields) => errors.push(...validateFields(fields, site?.[key], ctx, [key]))
  part('settings', settingsFields)
  part('contact', contactFields)
  errors.push(...validateFields(homeFields, site?.home, {...ctx,categories:site?.categories}, ['home']))
  part('about', aboutFields)
  errors.push(...validateFields(navFields, site, ctx))
  const cats = site?.categories
  if (!cats || typeof cats !== 'object' || !Object.keys(cats).length) errors.push({path: ['categories'], message: MESSAGES.required})
  else for (const [key, label] of Object.entries(cats)) {
    if (!PATTERNS.slug.test(key) || typeof label !== 'string' || !label.trim()) errors.push({path: ['categories', key], message: MESSAGES.pattern})
  }
  return errors
}

export function validateProject(doc, ctx = {}) {
  const errors = validateFields(projectFields(ctx.categories || {}), doc, ctx)
  if (typeof doc?.published !== 'boolean') errors.push({path: ['published'], message: MESSAGES.select})
  if (doc?.order !== undefined && !Number.isFinite(doc.order)) errors.push({path: ['order'], message: MESSAGES.number(0, 9999)})
  if (ctx.fileSlug && doc?.slug !== ctx.fileSlug) errors.push({path: ['slug'], message: 'Adressen må være lik filnavnet.'})
  return errors
}

export const formatPath = path => path.join('.')
