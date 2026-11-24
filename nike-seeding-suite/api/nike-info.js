// GET /api/nike-info?sku=IV6649-115  ->  { sku, name, subtitle, color }
// Reads the product name, type and colorway from nike.com (product page first, then search page).
// Nike can change or block these pages at any time; the app keeps whatever came from Excel if this fails.

export const config = { maxDuration: 30 };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function html(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  }
}

const unescape = (s) =>
  String(s || "")
    .replace(/\\u0026/g, "&").replace(/\\u002F/gi, "/").replace(/\\"/g, '"')
    .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .trim();

function field(chunk, key) {
  const m = chunk.match(new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"'));
  return m ? unescape(m[1]) : "";
}

// Look for the JSON block that mentions this style-color and read title / subtitle / colorDescription near it.
function fromJson(page, sc) {
  let idx = page.indexOf('"' + sc + '"');
  if (idx < 0) idx = page.indexOf(sc);
  if (idx < 0) return null;
  const win = page.slice(Math.max(0, idx - 4000), idx + 4000);
  // choose the occurrences closest to the SKU
  const near = (key) => {
    const re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"', "g");
    let best = "", bestD = Infinity, m;
    while ((m = re.exec(win))) {
      const d = Math.abs(m.index - 4000);
      if (d < bestD && m[1].length < 140) { bestD = d; best = unescape(m[1]); }
    }
    return best;
  };
  const name = near("fullTitle") || near("title") || near("productName");
  if (!name) return null;
  return { name, subtitle: near("subtitle") || near("subTitle"), color: near("colorDescription") || near("colorway") };
}

export default async function handler(req, res) {
  const raw = String(req.query.sku || "").trim().toUpperCase();
  const m = raw.match(/^([A-Z0-9]{6,8})[-_ ]?([A-Z0-9]{3})$/);
  if (!m) return res.status(400).json({ error: "Expected a Nike style-color SKU like DD1391-100" });
  const sc = `${m[1]}-${m[2]}`;

  // 1) product page
  let page = await html(`https://www.nike.com/t/p/${sc}`);
  let info = page && page.includes(sc) ? fromJson(page, sc) : null;
  if (!info && page && page.includes(sc)) {
    const og = page.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (og) info = { name: unescape(og[1]).replace(/\s*[.|]\s*Nike(\.com)?.*$/i, ""), subtitle: "", color: field(page, "colorDescription") };
  }
  // 2) search page
  if (!info) {
    page = await html(`https://www.nike.com/w?q=${encodeURIComponent(sc)}&vst=${encodeURIComponent(sc)}`);
    if (page) info = fromJson(page, sc);
  }
  if (!info || !info.name) return res.status(404).json({ error: "Not found", sku: sc });
  res.setHeader("Cache-Control", "public, s-maxage=2592000, max-age=86400");
  res.status(200).json({ sku: sc, ...info });
}
