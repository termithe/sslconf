import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://localhost:3024";
const origin = "https://www.sslconf.com";
const paths = ["/", "/scan", "/check", "/installation", "/headers", "/decode", "/csr", "/csr/generate", "/match", "/methodology", "/privacy", "/acceptable-use"];
const allPaths = paths.flatMap((path) => [path, path === "/" ? "/es" : `/es${path}`]);
const titles = new Set();
async function html(path) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.equal(response.status, 200, path);
  return response.text();
}
for (const path of allPaths) {
  const body = await html(path);
  const title = body.match(/<title>(.*?)<\/title>/)?.[1];
  assert.ok(title, `title: ${path}`);
  assert.ok(!titles.has(title), `unique title: ${path}`);
  titles.add(title);
  assert.ok(body.includes(`rel="canonical" href="${origin}${path === "/" ? "" : path}"`), `canonical: ${path}`);
  assert.ok(body.includes('name="robots" content="index, follow"'), `index: ${path}`);
  for (const lang of ["en", "es", "x-default"]) assert.ok(body.includes(`hrefLang="${lang}"`), `hreflang: ${path}/${lang}`);
  assert.ok(body.includes("| SSLConf</title>"), `brand title: ${path}`);
  const result = await html(`${path}?host=example.com`);
  assert.ok(result.includes('name="robots" content="noindex, follow"'), `noindex: ${path}`);
  assert.ok(!result.includes('rel="canonical"'), `result canonical: ${path}`);
  assert.ok(!result.includes('hrefLang='), `result hreflang: ${path}`);
}
const home = await html("/");
assert.ok(home.includes('"@type":"WebSite"'), "WebSite JSON-LD type");
assert.ok(home.includes('"name":"SSLConf"'), "WebSite JSON-LD name");
assert.ok(home.includes(`"url":"${origin}/"`), "WebSite JSON-LD url");
const sitemap = await html("/sitemap.xml");
assert.equal((sitemap.match(/<loc>/g) ?? []).length, allPaths.length);
for (const path of allPaths) assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`));
assert.ok(!sitemap.includes("?" + "host="));
const robots = await html("/robots.txt");
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.ok(robots.includes("Disallow: /api/"));
const localized = await fetch(base + "/scan?host=example.com", { headers: { "Accept-Language": "es-ES" }, redirect: "manual" });
assert.equal(localized.status, 307);
assert.ok(localized.headers.get("location").endsWith("/es/scan?host=example.com"));
assert.equal((await fetch(base + "/not-a-real-page", { redirect: "manual" })).status, 404);
console.log(`SEO OK: ${allPaths.length} pages, unique titles, WebSite JSON-LD, query exclusion, sitemap, robots, language redirect and 404 (${base}).`);
