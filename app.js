async function loadToday() {
  const res = await fetch("data/today.json", { cache: "no-store" });
  const data = await res.json();

  const updated = new Date(data.generatedAt);
  document.getElementById("dateLine").textContent =
    `Updated\n${updated.toLocaleString()}`;

  document.getElementById("intro").innerHTML = `
    Your daily 4-link newsletter, tuned for <b>AI</b>, <b>tech</b>, <b>markets</b>, and <b>companies</b>.
    <br/>Open links in a new tab, skim, then move on.
  `;

  renderList("bbcList", data.bbc || []);
  renderList("ftList", data.ft || []);
}

function renderList(targetId, items){
  const list = document.getElementById(targetId);
  list.innerHTML = "";

  if (!items.length){
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<p class="desc">No items available right now.</p>`;
    list.appendChild(li);
    return;
  }

  for (const item of items){
    const li = document.createElement("li");
    li.className = "item";

    const host = safeHost(item.url);
    li.innerHTML = `
      <div class="item-top">
        <h3 class="title">${escapeHtml(item.title)}</h3>
        <div class="meta">
          <div class="pill">${escapeHtml(item.topic || "Brief")}</div>
          ${item.pubDate ? `<div class="pill">${new Date(item.pubDate).toLocaleDateString()}</div>` : ``}
        </div>
      </div>
      ${item.description ? `<p class="desc">${escapeHtml(item.description)}</p>` : ``}
      <a class="read" href="${item.url}" target="_blank" rel="noopener noreferrer">
        Read <span>${host}</span>
      </a>
    `;
    list.appendChild(li);
  }
}

function safeHost(url){
  try { return new URL(url).hostname.replace("www.",""); }
  catch { return ""; }
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => (
    { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[s]
  ));
}

document.getElementById("refreshBtn").addEventListener("click", loadToday);
loadToday();
