import {escape} from '../util.mjs'
import {srcsetFor} from './images.mjs'

// Data for the drone film: what window.ferroHomeScenes holds on the site.
export function homeScenes(home, projects, img = x => x) {
  const bySlug = new Map(projects.map(p => [p.slug, p]))
  return (home.scenes || []).flatMap(row => {
    const p = bySlug.get(row.project)
    if (!p || !Number.isFinite(row.start)) return []
    return [{start: row.start, label: row.label || p.sted, title: row.title || p.title + ' · ' + p.sted, slug: p.slug,
      image: img(row.image || p.hero || 'assets/img/hero-drone-v4-poster-480.webp')}]
  })
}

export function featuredCards(home, projects, img = x => x) {
  const bySlug = new Map(projects.map(p => [p.slug, p]))
  return (home.featured || []).filter(row => bySlug.has(row.project)).map(row => {
    const image = row.image ? `
              <img src="${escape(img(row.image))}"${srcsetFor(row.image, img)} width="1280" height="720" alt="${escape(row.alt)}" loading="lazy">` : ''
    return `
            <article class="h26-project">${image}
              <p class="h26-metadata">${escape(row.meta)}</p>
              <h3>${escape(row.title)}</h3>
              <p>${escape(row.text)}</p>
              <a class="h26-case-link" href="#prosjekt/${escape(row.project)}">Se prosjektet <span aria-hidden="true">↗</span></a>
            </article>`
  }).join('') + '\n          '
}

// Targeted replacements inside the home screen. Everything else in the
// template (the 3D sketch, the process steps, the scripts' hooks) stays as is.
export function applyHome(html, home, projects, img = x => x) {
  const scenes = homeScenes(home, projects, img)
  html = html.replace(/(<div class="flight-intro h26-shell">\s*)<h1>[\s\S]*?<\/h1>\s*<p>[\s\S]*?<\/p>/,
    (_, open) => `${open}<h1>${escape(home.heading)}</h1>\n            <p>${escape(home.intro)}</p>`)
  if (scenes.length) {
    const first = scenes[0], prev = scenes[scenes.length - 1], next = scenes[1 % scenes.length]
    const peek = (dir, scene) => `<button class="flight-peek" type="button" data-neighbor="${dir}" aria-label="Vis ${escape(scene.label)}" tabindex="-1"><img alt="" src="${escape(scene.image)}"></button>`
    html = html
      .replace(/<button class="flight-peek" type="button" data-neighbor="-1"[^>]*>[\s\S]*?<\/button>/, () => peek(-1, prev))
      .replace(/<button class="flight-peek" type="button" data-neighbor="1"[^>]*>[\s\S]*?<\/button>/, () => peek(1, next))
      .replace(/<a href="[^"]*" data-film-link><span data-caption>[\s\S]*?<\/span>/,
        () => `<a href="#prosjekt/${escape(first.slug)}" data-film-link><span data-caption>${escape(first.title)}</span>`)
      .replace(/(<div class="flight-chapters"[^>]*>)[\s\S]*?(<\/div>)/, (_, open, end) => open + scenes.map((s, i) => `
                <button type="button" data-chapter="${i}" aria-pressed="${i === 0}">${escape(s.label)}</button>`).join('') + '\n              ' + end)
  }
  const cards = featuredCards(home, projects, img)
  html = html.replace(/(<div class="h26-project-grid">)[\s\S]*?(<\/div>\s*<\/section>)/, (_, open, end) => open + cards + end)
  if (!(home.featured || []).length) html = html.replace('id="h26-prosjekter"', 'hidden id="h26-prosjekter"')
  return html
}
