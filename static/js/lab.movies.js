(async function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const status = $("mv-status");

  let movies;
  try {
    const res = await fetch("/static/data/movies.json");
    if (!res.ok) throw new Error(res.status);
    movies = await res.json();
  } catch (e) {
    status.className = "status err";
    status.textContent = "Could not load /static/data/movies.json. Check the file path.";
    return;
  }

  const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  // ---------- TF-IDF ----------
  // Genres and keywords count once; the director counts double so fans of a director get their films first.
  function termsOf(m) {
    const t = [];
    m.genres.forEach((g) => t.push("genre:" + g.toLowerCase()));
    m.keywords.forEach((k) => t.push("kw:" + k.toLowerCase()));
    m.director.split(/,|&/).forEach((d) => { const x = "dir:" + d.trim().toLowerCase(); t.push(x, x); });
    t.push("era:" + Math.floor(m.year / 10) * 10 + "s");
    return t;
  }

  const docs = movies.map((m) => { const c = {}; termsOf(m).forEach((t) => (c[t] = (c[t] || 0) + 1)); return c; });
  const df = {};
  docs.forEach((d) => Object.keys(d).forEach((t) => (df[t] = (df[t] || 0) + 1)));
  const N = movies.length;
  const idf = (t) => Math.log((N + 1) / (df[t] + 1)) + 1;

  const vecs = docs.map((d) => {
    const v = {}; let norm = 0;
    for (const t in d) { v[t] = d[t] * idf(t); norm += v[t] * v[t]; }
    norm = Math.sqrt(norm);
    for (const t in v) v[t] /= norm;
    return v;
  });

  const label = (t) => {
    const k = t.slice(0, t.indexOf(":")), v = t.slice(t.indexOf(":") + 1);
    return k === "genre" ? titleCase(v) : k === "dir" ? "dir. " + titleCase(v) : v;
  };

  // ---------- UI ----------
  const byTitle = new Map(movies.map((m, i) => [m.title.toLowerCase(), i]));
  let liked = [];

  const list = $("mv-list");
  [...movies].sort((a, b) => a.title.localeCompare(b.title)).forEach((m) => list.appendChild(new Option(m.title)));
  const genres = [...new Set(movies.flatMap((m) => m.genres))].sort();
  genres.forEach((g) => $("mv-genre").add(new Option(g, g)));

  function render() {
    $("mv-chips").innerHTML = liked.map((i) =>
      `<span class="chip">${esc(movies[i].title)} <button data-rm="${i}" aria-label="Remove">×</button></span>`).join("");

    const out = $("mv-results");
    if (!liked.length) { out.innerHTML = ""; status.textContent = "Add one or more movies you like to get recommendations."; return; }

    // Taste profile = average of the liked movies' vectors
    const prof = {};
    liked.forEach((i) => { for (const t in vecs[i]) prof[t] = (prof[t] || 0) + vecs[i][t] / liked.length; });
    const g = $("mv-genre").value;

    const rows = [];
    movies.forEach((m, i) => {
      if (liked.includes(i) || (g && !m.genres.includes(g))) return;
      let s = 0; const shared = [];
      for (const t in vecs[i]) if (prof[t]) { const c = prof[t] * vecs[i][t]; s += c; shared.push([t, c]); }
      const why = shared.filter(([t]) => !t.startsWith("era:")).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => label(t));
      rows.push({ i, s, why });
    });
    rows.sort((a, b) => b.s - a.s);

    out.innerHTML = rows.slice(0, 8).map(({ i, s, why }) => {
      const m = movies[i];
      return `<div class="movie">
        <div class="match">${Math.round(s * 100)}% match</div>
        <h4>${esc(m.title)}</h4>
        <div class="meta">${m.year} · ${esc(m.genres.join(", "))}</div>
        <div class="why">${why.length ? "Because: " + esc(why.join(" · ")) : ""}</div>
        <button class="btn ghost" data-like="${i}">+ I like this too</button>
      </div>`;
    }).join("");
    status.textContent = `Showing the top ${Math.min(8, rows.length)} of ${rows.length} movies, ranked by similarity to your taste.`;
  }

  function add(i) { if (!liked.includes(i)) { liked.push(i); render(); } }

  $("mv-input").addEventListener("input", (e) => {
    const i = byTitle.get(e.target.value.trim().toLowerCase());
    if (i !== undefined) { add(i); e.target.value = ""; }
  });
  $("mv-genre").addEventListener("change", render);
  $("mv-clear").addEventListener("click", () => { liked = []; render(); });
  $("mv-example").addEventListener("click", () => {
    liked = ["inception", "interstellar"].map((t) => byTitle.get(t)).filter((i) => i !== undefined);
    render();
  });
  $("mv-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (b) { liked = liked.filter((i) => i !== +b.dataset.rm); render(); }
  });
  $("mv-results").addEventListener("click", (e) => {
    const b = e.target.closest("[data-like]");
    if (b) add(+b.dataset.like);
  });

  render();
})();