(function () {
  const $ = (id) => document.getElementById(id);
  const INDUSTRIES = ["Manufacturing", "IT Services", "Retail", "Logistics", "Healthcare", "Real Estate"];
  const SOURCES = ["Google Maps", "JustDial", "IndiaMART", "International"];
  const FIELDS = { employees: "Company size", years: "Years in business", rating: "Rating", reviews: "Review count", website: "Has website", email: "Email found", phone: "Phone verified", industry: "Industry", source: "Lead source" };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const sigmoid = (z) => 1 / (1 + Math.exp(-z));

  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Feature encoding ----------
  function encode(l) {
    return [
      Math.log1p(l.employees), l.years, l.rating, Math.log1p(l.reviews), +l.website, +l.email, +l.phone,
      ...INDUSTRIES.map((i) => +(l.industry === i)),
      ...SOURCES.map((s) => +(l.source === s))
    ];
  }

  // ---------- Synthetic training data ----------
  const IND_FX = { Manufacturing: .5, "IT Services": .3, Retail: -.2, Logistics: .4, Healthcare: .1, "Real Estate": -.3 };
  const SRC_FX = { "Google Maps": .1, JustDial: -.1, IndiaMART: .4, International: -.2 };

  function randomLead(r) {
    const pick = (a) => a[Math.floor(r() * a.length)];
    return {
      employees: Math.round(Math.exp(r() * Math.log(400))) + 1,
      years: 1 + Math.floor(r() * 30),
      rating: Math.round((2.8 + r() * 2.2) * 10) / 10,
      reviews: Math.round(Math.exp(r() * Math.log(800))),
      website: r() < .7, email: r() < .45, phone: r() < .6,
      industry: pick(INDUSTRIES), source: pick(SOURCES)
    };
  }

  // The hidden "rule" the model has to rediscover from noisy outcomes
  function trueLogit(l) {
    return -2.4 + .45 * (Math.log1p(l.employees) - 3) + 1.0 * l.email + .6 * l.website + .5 * l.phone
      + .5 * (l.rating - 3.8) + .2 * (Math.log1p(l.reviews) - 3.5) + .02 * l.years
      + IND_FX[l.industry] + SRC_FX[l.source] + .7 * (l.email && l.website ? 1 : 0);
  }

  // ---------- Gradient boosting (logistic loss, regression trees) ----------
  function buildThresholds(X) {
    const d = X[0].length, T = [];
    for (let j = 0; j < d; j++) {
      const vals = [...new Set(X.map((r) => r[j]))].sort((a, b) => a - b);
      if (vals.length < 2) { T.push([]); continue; }
      if (vals.length === 2) { T.push([(vals[0] + vals[1]) / 2]); continue; }
      const th = [];
      for (let q = 1; q <= 9; q++) { const k = Math.floor((q * (vals.length - 1)) / 10); th.push((vals[k] + vals[k + 1]) / 2); }
      T.push([...new Set(th)]);
    }
    return T;
  }

  function grow(X, res, hess, idx, depth, T, imp) {
    const sumR = idx.reduce((a, i) => a + res[i], 0), sumH = idx.reduce((a, i) => a + hess[i], 0);
    const leaf = { v: sumH > 1e-9 ? sumR / sumH : 0 };
    if (depth === 0 || idx.length < 20) return leaf;
    const n = idx.length, base = (sumR * sumR) / n;
    let best = null;
    for (let j = 0; j < T.length; j++) for (const t of T[j]) {
      let sl = 0, nl = 0;
      for (const i of idx) if (X[i][j] <= t) { sl += res[i]; nl++; }
      const nr = n - nl;
      if (nl < 10 || nr < 10) continue;
      const sr = sumR - sl, gain = (sl * sl) / nl + (sr * sr) / nr - base;
      if (!best || gain > best.gain) best = { j, t, gain };
    }
    if (!best || best.gain <= 1e-9) return leaf;
    imp[best.j] += best.gain;
    const L = [], R = [];
    for (const i of idx) (X[i][best.j] <= best.t ? L : R).push(i);
    return { j: best.j, t: best.t, l: grow(X, res, hess, L, depth - 1, T, imp), r: grow(X, res, hess, R, depth - 1, T, imp) };
  }

  const predictTree = (n, x) => (n.v !== undefined ? n.v : predictTree(x[n.j] <= n.t ? n.l : n.r, x));

  function trainGBM(X, y, nTrees, lr, depth) {
    const n = X.length, T = buildThresholds(X), imp = new Array(X[0].length).fill(0);
    const p0 = y.reduce((a, b) => a + b, 0) / n, F0 = Math.log(p0 / (1 - p0));
    const F = new Array(n).fill(F0), trees = [], all = [...Array(n).keys()];
    for (let m = 0; m < nTrees; m++) {
      const p = F.map(sigmoid), res = y.map((yi, i) => yi - p[i]), hess = p.map((v) => v * (1 - v));
      const tree = grow(X, res, hess, all, depth, T, imp);
      trees.push(tree);
      for (let i = 0; i < n; i++) F[i] += lr * predictTree(tree, X[i]);
    }
    return { F0, lr, trees, imp };
  }

  const rawScore = (m, x) => m.trees.reduce((a, t) => a + m.lr * predictTree(t, x), m.F0);

  function auc(scores, y) {
    const o = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
    let rs = 0, pos = 0;
    o.forEach(([, i], r) => { if (y[i]) { rs += r + 1; pos++; } });
    const neg = y.length - pos;
    return (rs - (pos * (pos + 1)) / 2) / (pos * neg);
  }

  // ---------- State ----------
  let model, SAMPLE, HOT, WARM, tableLeads = [];
  const prob = (l) => sigmoid(rawScore(model, encode(l)));

  $("lead-model").textContent = "Training model in your browser…";
  setTimeout(init, 60);

  function init() {
    const r = rng(11);
    const leads = Array.from({ length: 2000 }, () => randomLead(r));
    const y = leads.map((l) => +(r() < sigmoid(trueLogit(l))));
    const X = leads.map(encode);
    model = trainGBM(X.slice(0, 1600), y.slice(0, 1600), 60, .15, 3);
    const a = auc(X.slice(1600).map((x) => rawScore(model, x)), y.slice(1600));
    const ps = X.slice(0, 1600).map((x) => sigmoid(rawScore(model, x))).sort((p, q) => p - q);
    WARM = ps[Math.floor(.35 * ps.length)];
    HOT = ps[Math.floor(.7 * ps.length)];
    SAMPLE = leads.slice(0, 60);
    $("lead-model").textContent = `Gradient boosting · 60 trees · depth 3 · trained on 1,600 synthetic leads · hold-out AUC ${a.toFixed(2)}`;

    INDUSTRIES.forEach((i) => $("ld-industry").add(new Option(i)));
    SOURCES.forEach((s) => $("ld-source").add(new Option(s)));
    $("ld-industry").value = "Manufacturing";
    $("ld-source").value = "IndiaMART";

    ["company", "city", "industry", "source", "employees", "years", "rating", "reviews", "website", "email", "phone"]
      .forEach((f) => $("ld-" + f).addEventListener("input", update));

    buildTable();
    update();
  }

  const readLead = () => ({
    company: $("ld-company").value.trim() || "Your Company",
    city: $("ld-city").value.trim(),
    industry: $("ld-industry").value, source: $("ld-source").value,
    employees: Math.max(1, +$("ld-employees").value || 1),
    years: Math.max(0, +$("ld-years").value || 0),
    rating: +$("ld-rating").value,
    reviews: Math.max(0, +$("ld-reviews").value || 0),
    website: $("ld-website").checked, email: $("ld-email").checked, phone: $("ld-phone").checked
  });

  function writeLead(l) {
    $("ld-company").value = l.company; $("ld-city").value = l.city;
    $("ld-industry").value = l.industry; $("ld-source").value = l.source;
    $("ld-employees").value = l.employees; $("ld-years").value = l.years;
    $("ld-rating").value = l.rating; $("ld-reviews").value = l.reviews;
    $("ld-website").checked = l.website; $("ld-email").checked = l.email; $("ld-phone").checked = l.phone;
    update();
  }

  const tierOf = (p) => (p >= HOT ? "Hot" : p >= WARM ? "Warm" : "Cold");

  // "What moved the score": swap one field at a time for typical values from the training data
  function drivers(lead) {
    const base = prob(lead);
    return Object.keys(FIELDS).map((f) => {
      let s = 0;
      for (const t of SAMPLE) s += prob({ ...lead, [f]: t[f] });
      return { f, d: (base - s / SAMPLE.length) * 100 };
    }).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5);
  }

  function update() {
    $("ld-rating-val").textContent = (+$("ld-rating").value).toFixed(1);
    const lead = readLead(), p = prob(lead), tier = tierOf(p);
    $("ld-score").textContent = Math.round(p * 100);
    const t = $("ld-tier"); t.textContent = tier; t.className = "tier " + tier;
    $("ld-drivers").innerHTML = drivers(lead).map(({ f, d }) =>
      `<div class="drv"><span>${FIELDS[f]}</span><div class="bar"><i class="${d >= 0 ? "pos" : "neg"}" style="width:${Math.min(100, Math.abs(d) * 4)}%"></i></div><span>${d >= 0 ? "+" : ""}${d.toFixed(0)} pts</span></div>`
    ).join("");
  }

  // ---------- Fictional lead table ----------
  function buildTable() {
    const r = rng(99);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const PREFIX = ["Apex", "Nova", "Shree", "Bharat", "Kaveri", "Orion", "Zenith", "Sunrise", "Metro", "Prime", "Vertex", "Anand"];
    const SUFFIX = { Manufacturing: ["Auto Components", "Packaging", "Textiles"], "IT Services": ["Infotech", "Softworks"], Retail: ["Traders", "Mart"], Logistics: ["Logistics", "Freight"], Healthcare: ["Diagnostics", "Clinic"], "Real Estate": ["Realty", "Builders"] };
    const CITIES = ["Ludhiana", "Pune", "Jaipur", "Indore", "Surat", "Chandigarh", "Bengaluru", "Hyderabad", "Kochi", "Noida"];
    tableLeads = Array.from({ length: 20 }, () => {
      const l = randomLead(r);
      l.company = `${pick(PREFIX)} ${pick(SUFFIX[l.industry])}`;
      l.city = pick(CITIES);
      l.p = prob(l);
      return l;
    }).sort((a, b) => b.p - a.p);

    $("ld-table").innerHTML =
      "<table><thead><tr><th>Company</th><th>City</th><th>Industry</th><th>Source</th><th>Email</th><th>Score</th><th>Tier</th></tr></thead><tbody>" +
      tableLeads.map((l, i) =>
        `<tr class="click" data-i="${i}"><td>${esc(l.company)}</td><td>${esc(l.city)}</td><td>${esc(l.industry)}</td><td>${esc(l.source)}</td><td>${l.email ? "✓" : "–"}</td><td class="${tierOf(l.p) === "Hot" ? "hot" : ""}">${Math.round(l.p * 100)}</td><td>${tierOf(l.p)}</td></tr>`
      ).join("") + "</tbody></table>";

    $("ld-table").addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-i]");
      if (!tr) return;
      writeLead(tableLeads[+tr.dataset.i]);
      $("panel-leads").scrollIntoView({ behavior: "smooth" });
    });
  }

  // ---------- Cold email (calls YOUR backend; the API key never touches the browser) ----------
  $("ld-email-btn").addEventListener("click", async () => {
    const l = readLead(), box = $("ld-email-out"), btn = $("ld-email-btn");
    btn.disabled = true; box.textContent = "Writing…";
    try {
      const res = await fetch("/api/cold-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: l.company, industry: l.industry, city: l.city, employees: l.employees })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Invalid input or server error (" + res.status + ")");
      box.textContent = data.email + (data.source === "template" ? "\n\n(Template fallback: the AI writer is switched off on this server.)" : "");
    } catch (e) {
      box.textContent = "Could not generate email: " + e.message;
    } finally {
      btn.disabled = false;
    }
  });
})();