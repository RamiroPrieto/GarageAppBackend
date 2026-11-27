import { en } from './content/en';
import { es } from './content/es';
import { it } from './content/it';
import {
  LEGAL_LANGUAGES,
  LEGAL_PAGES,
  type LegalContent,
  type LegalIdentity,
  type LegalLanguage,
  type LegalPage,
} from './legal.types';

const CONTENT: Record<LegalLanguage, LegalContent> = { it, en, es };
const LANGUAGE_NAMES: Record<LegalLanguage, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
};

const STYLE = `
:root{color-scheme:light dark;--bg:#fff;--text:#1c2430;--muted:#5b6675;--link:#0b5cad;--line:#dde3ea;--mark:#ffe58a}
@media(prefers-color-scheme:dark){:root{--bg:#12161c;--text:#e8ecf1;--muted:#a3adba;--link:#7db8f5;--line:#2b333d;--mark:#7a6200}}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,sans-serif}
main,header,footer{max-width:44rem;margin:0 auto;padding:1rem 1.25rem}
header,footer{display:flex;flex-wrap:wrap;gap:.5rem 1rem;font-size:.9rem;color:var(--muted)}
header strong{margin-right:auto;color:var(--text)}
footer{border-top:1px solid var(--line);padding-bottom:3rem}
h1{font-size:1.8rem;line-height:1.2;margin:.5rem 0}
h2{font-size:1.15rem;margin:2rem 0 .5rem}
p,ul{margin:.5rem 0 1rem}ul{padding-left:1.25rem}li{margin:.35rem 0}
p,li{overflow-wrap:anywhere}
a{color:var(--link)}mark{background:var(--mark);color:inherit}
.updated{color:var(--muted);font-size:.9rem}`;

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

export function renderLegalPage(
  page: LegalPage,
  language: LegalLanguage,
  identity: LegalIdentity,
) {
  const content = CONTENT[language];
  const pages = content.pages({
    ...identity,
    name: identity.name ?? content.missing.name,
    address: identity.address ?? content.missing.address,
  });
  const { title, sections } = pages[page];

  // Everything is escaped first; only our own markup is added afterwards.
  const email = escapeHtml(identity.email);
  const text = (value: string) => {
    let html = escapeHtml(value).replaceAll(
      email,
      () => `<a href="mailto:${email}">${email}</a>`,
    );
    for (const missing of Object.values(content.missing)) {
      html = html.replaceAll(missing, `<mark>${missing}</mark>`);
    }
    return html;
  };

  const body = sections
    .map(({ heading, body: blocks }) =>
      [
        heading ? `<h2>${text(heading)}</h2>` : '',
        ...blocks.map((block) =>
          typeof block === 'string'
            ? `<p>${text(block)}</p>`
            : `<ul>${block.map((item) => `<li>${text(item)}</li>`).join('')}</ul>`,
        ),
      ].join('\n'),
    )
    .join('\n');
  const languages = LEGAL_LANGUAGES.map((code) =>
    code === language
      ? `<span>${LANGUAGE_NAMES[code]}</span>`
      : `<a href="/${page}?lang=${code}" hreflang="${code}">${LANGUAGE_NAMES[code]}</a>`,
  ).join('');
  const links = LEGAL_PAGES.filter((other) => other !== page)
    .map(
      (other) =>
        `<a href="/${other}?lang=${language}">${escapeHtml(pages[other].title)}</a>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · GarageApp</title>
<style>${STYLE}</style>
</head>
<body>
<header><strong>GarageApp</strong>${languages}</header>
<main>
<h1>${escapeHtml(title)}</h1>
<p class="updated">${escapeHtml(content.updated)}</p>
${body}
</main>
<footer>${links}</footer>
</body>
</html>`;
}
