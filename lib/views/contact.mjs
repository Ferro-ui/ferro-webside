import {escape, telHref, mapsHref} from '../util.mjs'

// The values behind every [data-contact] spot and window.ferroContact.
export const contactValues = c => ({
  email: c.email || '', phone: c.phone || '', address: c.address || '', orgNr: c.orgNr || '',
  facebook: c.facebookUrl || '', brochure: c.brochureUrl || '', privacy: c.privacyUrl || '',
})

export const draftInstructions = email => 'Åpne utkastet og send det. Du kan også kopiere teksten og sende den til ' + email + '.'

// Targeted replacements inside the Kontakt screen. The form markup and its hooks stay untouched.
export function applyContact(html, contact) {
  const facts = `
          <div><dt>Telefon</dt><dd><a href="${escape(telHref(contact.phone))}">${escape(contact.phone)}</a></dd></div>
          <div><dt>E-post</dt><dd><a href="mailto:${escape(contact.email)}">${escape(contact.email)}</a></dd></div>
          <div><dt>Adresse</dt><dd><a href="${escape(mapsHref(contact.address))}" target="_blank" rel="noopener">${escape(contact.address)} ↗</a></dd></div>
          ${contact.orgNr ? `<div><dt>Org.nr.</dt><dd>${escape(contact.orgNr)}</dd></div>` : ''}
          ${contact.facebookUrl ? `<div><dt>Facebook</dt><dd><a href="${escape(contact.facebookUrl)}" target="_blank" rel="noopener">Ferro Stålentreprenør ↗</a></dd></div>` : ''}
          <div><dt>Ansatte</dt><dd><a href="#ansatte">Se kontaktpersonene våre →</a></dd></div>
          ${contact.brochureUrl ? `<div><dt>Brosjyre</dt><dd><a href="${escape(contact.brochureUrl)}" target="_blank" rel="noopener">Les brosjyren vår ↗</a></dd></div>` : ''}
        `
  const head = `<div>
          <p class="h26-kicker"><span class="h26-film-dot"></span>Kontakt oss</p>
          <h1>${escape(contact.heading)}</h1>
        </div>
        <p>${escape(contact.intro)}</p>`
  const options = '<option value="">Velg byggtype</option>' + (contact.buildingTypes || [])
    .map(name => String(name ?? '').trim()).filter(Boolean).map(name => '<option>' + escape(name) + '</option>').join('')
  const screen = /(<div class="screen" data-screen="kontakt"[^>]*>)([\s\S]*?)(<\/div>\s*<\/main>)/
  return html.replace(screen, (_, open, body, end) => open + body
    .replace(/(<header class="h26-page-head h26-shell">)[\s\S]*?(<\/header>)/, (_, a, b) => a + '\n        ' + head + '\n      ' + b)
    .replace(/(<dl class="h26-facts">)[\s\S]*?(<\/dl>)/, (_, a, b) => a + facts + b)
    .replace(/(<h2 class="h26-form-title">)[\s\S]*?(<\/h2>)/, (_, a, b) => a + escape(contact.formTitle) + b)
    .replace(/(<p class="form-intro">)[\s\S]*?(<\/p>)/, (_, a, b) => a + escape(contact.formIntro) + b)
    .replace(/(<select name="byggtype">)[\s\S]*?(<\/select>)/, (_, a, b) => a + options + b)
    .replace(/(henvendelsen\. <a href=")[^"]*(")/, (_, a, b) => a + escape(contact.privacyUrl) + b)
    .replace(/(<p data-draft-instructions>)[\s\S]*?(<\/p>)/, (_, a, b) => a + escape(draftInstructions(contact.email)) + b) + end)
}

// Server-side fill of [data-contact] spots (menu, footer, bands), the same job
// js/contact-links.js does in the browser for screens rendered later.
const HREF = {phone: telHref, email: v => 'mailto:' + v, facebook: v => v, brochure: v => v, privacy: v => v}
const TEXT = new Set(['phone', 'email', 'address', 'orgNr'])
export function fillContact(html, values) {
  return html.replace(/<(a|span)\b([^>]*?)\sdata-contact="(\w+)"([^>]*)>([^<]*)<\/\1>/g, (m, tag, before, key, after, text) => {
    const value = values[key]
    if (!value) return m
    let attrs = before + ' data-contact="' + key + '"' + after
    if (tag === 'a' && HREF[key]) attrs = attrs.replace(/\shref="[^"]*"/, () => ' href="' + escape(HREF[key](value)) + '"')
    if (TEXT.has(key)) {
      const prefix = (attrs.match(/\sdata-prefix="([^"]*)"/) || [])[1] || ''
      text = prefix + escape(value)
    }
    return '<' + tag + attrs + '>' + text + '</' + tag + '>'
  })
}
