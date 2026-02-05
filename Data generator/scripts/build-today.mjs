import fs from "node:fs";
import { XMLParser } from "fast-xml-parser";

const FEEDS = [
  // BBC
  { source: "BBC", topic: "Tech",     url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { source: "BBC", topic: "Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },

  // FT (may be blocked in some environments)
  { source: "FT", topic: "AI",        url: "https://www.ft.com/artificial-intelligence?format=rss" },
  { source: "FT", topic: "Tech",      url: "https://www.ft.com/technology?format=rss" },
  { source: "FT", topic: "Markets",   url: "https://www.ft.com/markets?format=rss" },
  { source: "FT", topic: "Companies", url: "https://www.ft.com/companies?format=rss" }
];

const KEYWORDS = [
  "ai","artificial intelligence","machine learning","deep learning",
  "llm","large language model","openai","anthropic","google","microsoft","nvidia",
  "data","analytics","business analytics","bi","dashboard","metrics","kpi",
  "earnings","revenue","profit","guidance","ipo","acquisition","merger",
  "markets","stocks","equities","bonds","rates","inflation","fed","ecb",
  "semiconductor","chips","cloud","saas","automation","productivity"
];

const parser = new XMLParser({ ignoreAttributes: false });

function clean(s = "") {
  return String(s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
function toText(x){
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && "#text" in x) return x["#text"];
  return String(x);
}

function scoreItem(text) {
  const t = text.toLowerCase();
  let score = 0;
  for (const k of KEYWORDS) if (t.includes(k)) score += 3;

  // boosts
  if (t.includes("ai") || t.includes("artificial intelligence")) score += 4;
  if (t.includes("market") || t.includes("stocks") || t.includes("earnings")) score += 2;

  return score;
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, { headers: { "user-agent": "daily-brief/1.0" } });
  const xml = await res.text();
  const json = parser.parse(xml);

  const channel = json?.rss?.channel;
  const items = channel?.item || [];

  return items.map(it => {
    const title = clean(toText(it.title));
    const description = clean(toText(it.description));
    const url = clean(toText(it.link)) || clean(toText(it.guid));
    const pubDate = clean(toText(it.pubDate));

    return { source: feed.source, topic: feed.topic, title, description, url, pubDate };
  }).filter(x => x.title && x.url);
}

function dedupe(items){
  const seen = new Set();
  const out = [];
  for (const it of items){
    const key = (it.url || it.title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function rank(items){
  return items
    .map(x => ({ ...x, _score: scoreItem(`${x.title} ${x.description}`) }))
    .sort((a,b) => (b._score - a._score) || (new Date(b.pubDate) - new Date(a.pubDate)));
}

function pickTop(items, n){
  const r = rank(items);
  return r.slice(0, n).map(({ _score, ...rest }) => rest);
}

const all = [];
for (const f of FEEDS) {
  try {
    all.push(...await fetchFeed(f));
  } catch (e) {
    console.warn("Feed failed:", f.url, e.message);
  }
}

const cleaned = dedupe(all);

const bbcItems = cleaned.filter(x => x.source === "BBC");
const ftItems  = cleaned.filter(x => x.source === "FT");

const out = {
  generatedAt: new Date().toISOString(),
  bbc: pickTop(bbcItems, 2),
  ft:  pickTop(ftItems, 2)
};

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/today.json", JSON.stringify(out, null, 2));
console.log("Wrote data/today.json");
