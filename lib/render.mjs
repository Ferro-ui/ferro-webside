// One render for the build and for the admin preview.
// Input: the site template (index.html) and the content. Output: finished HTML
// plus the generated js/projects.js. Only marked regions of the template change.

import {escape, scriptJson} from './util.mjs'
import {publishedProjects, clientProject} from './content.mjs'
import {applyHome, homeScenes} from './views/home.mjs'
import {applyAbout} from './views/about.mjs'
import {applyContact, fillContact, contactValues} from './views/contact.mjs'

export {fillContact, contactValues}

// Screens the site's router knows; menu links to them get data-nav for the active state.
const NAV_SCREENS = {'#prosjekter': 'prosjekter', '#om-oss': 'omoss', '#omoss': 'omoss', '#kontakt': 'kontakt'}

export function absoluteUrl(path, siteUrl) {
  try { return new URL(path, siteUrl).href } catch { return '' }
}

export function applyHead(html, settings) {
  const s = settings || {}
  const site = s.siteUrl || ''
  const tags = [
    `<link rel="canonical" href="${escape(site)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="nb_NO">`,
    `<meta property="og:site_name" content="Ferro Stålentreprenør">`,
    `<meta property="og:title" content="${escape(s.title)}">`,
    `<meta property="og:description" content="${escape(s.description)}">`,
    `<meta property="og:url" content="${escape(site)}">`,
  ]
  if (s.ogImage) {
    tags.push(`<meta property="og:image" content="${escape(absoluteUrl(s.ogImage, site))}">`)
    if (s.ogImageAlt) tags.push(`<meta property="og:image:alt" content="${escape(s.ogImageAlt)}">`)
    tags.push(`<meta name="twitter:card" content="summary_large_image">`)
  }
  return html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(s.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escape(s.description)}">\n` + tags.join('\n'))
}

export function applyNav(html, nav) {
  const items = (nav || []).map(item => {
    const external = /^https?:/.test(item.href)
    const screen = NAV_SCREENS[item.href]
    return `<a href="${escape(item.href)}"${screen ? ` data-nav="${screen}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${escape(item.label)}</a>`
  })
  const lines = []
  for (let i = 0; i < items.length; i += 2) lines.push(items.slice(i, i + 2).join(''))
  return html.replace(/(<nav id="ferro-menu"[^>]*>)([\s\S]*?)(<a class="site-menu-phone")/,
    (_, open, body, phone) => open + '\n        ' + lines.join('\n        ') + phone)
}

export function projectsScript(site, projects, img = x => x) {
  return 'const projectCategories = ' + JSON.stringify(site.categories, null, 2) + ';\n\n' +
    'const ferroProjects = ' + JSON.stringify(publishedProjects(projects).map(p => clientProject(p, img)), null, 2) + ';\n'
}

// opts.img maps an image path to the URL to show (the preview points uploads
// elsewhere). opts.inline puts the projects data in the page instead of js/projects.js.
export function renderSite(template, {site, projects}, opts = {}) {
  const img = opts.img || (x => x)
  const live = publishedProjects(projects)
  const contact = site.contact
  let html = template
  html = applyHead(html, site.settings)
  html = applyNav(html, site.nav)
  html = applyHome(html, site.home, live, img)
  html = applyAbout(html, site.about, contact, img)
  html = applyContact(html, contact)
  html = fillContact(html, contactValues(contact))
  const projectsJs = projectsScript(site, projects, img)
  const data = '<script>window.ferroContact=' + scriptJson(contactValues(contact)) +
    ';window.ferroHomeScenes=' + scriptJson(homeScenes(site.home, live, img)) + '</script>\n'
  const projectsTag = opts.inline ? '<script>' + projectsJs.replaceAll('</script', '<\\/script') + '</script>' : '<script src="js/projects.js"></script>'
  html = html.replace('<script src="js/projects.js"></script>', () => data + projectsTag)
  return {html, projectsJs}
}
