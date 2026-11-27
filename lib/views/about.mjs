import {escape, telHref} from '../util.mjs'
import {srcsetFor} from './images.mjs'

// Inner HTML of the Om oss screen. Classes and structure follow the site template.
export function aboutView(about, contact = {}, img = x => x) {
  const pic = path => `src="${escape(img(path))}"${srcsetFor(path, img)}`
  const people = (about.people || []).filter(p => p?.name).map(p => `
            <article class="h26-person">
              ${p.photo ? `<img ${pic(p.photo)} alt="${escape(p.name)}" loading="lazy" decoding="async">` : ''}
              <h3>${escape(p.name)}</h3>
              <p>${escape(p.role)}</p>
              ${p.email ? `<a class="h26-text-link" href="mailto:${escape(p.email)}">${escape(p.email)}</a>` : ''}
              ${p.phone ? `<a class="h26-text-link" href="${escape(telHref(p.phone))}">${escape(p.phone)}</a>` : ''}
            </article>`).join('')
  const items = (about.briefItems || []).filter(Boolean).map(name => '<li>' + escape(name) + '</li>').join('')
  const phone = contact.phone || about.people?.[0]?.phone || ''
  const email = contact.email || about.people?.[0]?.email || ''
  return `
      <header class="h26-page-head h26-shell">
        <div>
          <p class="h26-kicker"><span class="h26-film-dot"></span>Om oss</p>
          <h1>${escape(about.heading)}</h1>
        </div>
        <p>${escape(about.intro)}</p>
      </header>
      ${about.heroImage ? `<div class="h26-shell">
        <img class="h26-detail-hero h26-detail-hero--wide" ${pic(about.heroImage)} width="1280" height="720" alt="${escape(about.heroAlt)}" loading="lazy">
      </div>` : ''}
      <section class="h26-build-section" id="ansatte" aria-labelledby="h26-team-title">
        <div class="h26-section h26-shell">
          <div class="h26-section-head">
            <h2 id="h26-team-title">${escape(about.teamHeading)}</h2>
            <p>${escape(about.teamIntro)}</p>
          </div>
          <div class="h26-team">${people}
          </div>
          ${about.joinTitle || about.joinText ? `<div class="h26-team-join">
            <p><strong>${escape(about.joinTitle)}</strong> ${escape(about.joinText)}</p>
            ${about.joinEmail ? `<a class="h26-text-link" href="mailto:${escape(about.joinEmail)}">Send søknad <span aria-hidden="true">↗</span></a>` : ''}
          </div>` : ''}
        </div>
      </section>
      <section class="h26-section h26-shell h26-build-layout">${about.officePhoto ? `<img class="office-photo" ${pic(about.officePhoto)} loading="lazy" alt="${escape(about.officeAlt)}">` : ''}<div><h2>${escape(about.officeHeading)}</h2><p>${escape(about.officeText)}</p><a class="h26-text-link" href="#kontakt">Finn veien til oss →</a></div></section>
      ${about.briefHeading ? `<section class="h26-section h26-shell h26-build-layout"><div><h2>${escape(about.briefHeading)}</h2><p>${escape(about.briefText)}</p></div><ul class="h26-build-list">${items}</ul></section>` : ''}
      <section class="h26-contact" aria-labelledby="h26-omoss-contact-title">
        <div class="h26-section h26-shell h26-contact-layout">
          <div><h2 id="h26-omoss-contact-title">${escape(about.closingHeading)}</h2><p>${escape(about.closingText)}</p></div>
          <div class="h26-contact-links">
            ${phone ? `<a class="h26-button h26-button-light" href="${escape(telHref(phone))}">Ring ${escape(phone)}</a>` : ''}
            ${email ? `<a class="h26-button h26-button-quiet" href="mailto:${escape(email)}">Send e-post <span aria-hidden="true">↗</span></a>` : ''}
          </div>
        </div>
      </section>
    `
}

export function applyAbout(html, about, contact, img) {
  return html.replace(/(<div class="screen" data-screen="omoss"[^>]*>)[\s\S]*?(<\/div>\s*<!-- =+ KONTAKT)/,
    (_, open, end) => open + aboutView(about, contact, img) + end)
}
