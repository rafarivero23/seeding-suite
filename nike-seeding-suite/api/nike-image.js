// GET /api/nike-image?sku=DD1391-100
// Server-side lookup of a Nike product image by style-color SKU. Returns the image bytes.
// Tries, in order: Nike's image server, the product page (og:image), then the nike.com search page.
// Nike can change or block these at any time; the app falls back to manual drop / paste.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MIN_BYTES = 6000; // smaller responses are usually "image not available" placeholders

async function get(url, accept) {
  return fetch(url, {
    headers: { "User-Agent": UA, Accept: accept || "*/*", "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(6000),
  });
}

async function tryImage(url) {
  try {
    const r = await get(url, "image/avif,image/webp,image/png,image/jpeg,*/*");
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < MIN_BYTES) return null;
    return { buf, type };
  } catch {
    return null;
  }
}

function imagesFromHtml(html, styleColor) {
  const out = [];
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (og) out.push(og[1]);
  const re = /https:\/\/static\.nike\.com\/a\/images\/[^"'\s\\)]+?\.(?:png|jpg|jpeg|webp)/gi;
  const all = html.match(re) || [];
  // prefer images whose URL mentions the style-color
  const key = styleColor.replace("-", "").toLowerCase();
  all.sort((a, b) => (b.toLowerCase().replace(/[-_]/g, "").includes(key) ? 1 : 0) - (a.toLowerCase().replace(/[-_]/g, "").includes(key) ? 1 : 0));
  out.push(...all);
  // ask for a large rendition
  return [...new Set(out)].map((u) => u.replace(/\/t_[^/]+\//, "/t_PDP_1280_v1/"));
}

async function tryPage(url, styleColor) {
  try {
    const r = await get(url, "text/html");
    if (!r.ok) return null;
    const html = await r.text();
    for (const img of imagesFromHtml(html, styleColor).slice(0, 3)) {
      const hit = await tryImage(img);
      if (hit) return hit;
    }
  } catch {}
  return null;
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const raw = String(req.query.sku || "").trim().toUpperCase();
  const m = raw.match(/^([A-Z0-9]{6,8})[-_ ]?([A-Z0-9]{3})$/);
  if (!m) return res.status(400).json({ error: "Expected a Nike style-color SKU like DD1391-100" });
  const [, style, color] = m;
  const sc = `${style}-${color}`;

  const attempts = [
    () => tryImage(`https://secure-images.nike.com/is/image/DotCom/${style}_${color}?wid=1200&hei=1200&fmt=png-alpha`),
    () => tryImage(`https://images.nike.com/is/image/DotCom/${style}_${color}?wid=1200&hei=1200&fmt=jpg`),
    () => tryPage(`https://www.nike.com/t/p/${sc}`, sc),
    () => tryPage(`https://www.nike.com/w?q=${encodeURIComponent(sc)}&vst=${encodeURIComponent(sc)}`, sc),
  ];
  for (const attempt of attempts) {
    const hit = await attempt();
    if (hit) {
      res.setHeader("Content-Type", hit.type);
      res.setHeader("Cache-Control", "public, s-maxage=2592000, max-age=86400");
      return res.status(200).send(hit.buf);
    }
  }
  res.status(404).json({ error: "Not found", sku: sc });
}
