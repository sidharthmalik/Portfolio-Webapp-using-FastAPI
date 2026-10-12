(function () {
  const $ = (id) => document.getElementById(id);
  const COLORS = ["#c6ff00", "#2f6bff", "#ff5c8a", "#ffb020", "#22d3ee", "#a78bfa", "#34d399", "#f87171"];
  const NAMES = ["Champions", "Loyal Customers", "Potential Loyalists", "Needs Attention", "At Risk", "Hibernating", "Almost Lost", "Lost"];
  const LABEL = { R: "Recency (days since last order)", F: "Frequency (orders)", M: "Monetary (total spend)" };
  let customers = [], chart = null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const setStatus = (t, err) => { const el = $("rfm-status"); el.textContent = t; el.className = "status" + (err ? " err" : ""); };

  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Sample data: 4 hidden customer "personalities" ----------
  function sampleData() {
    const r = rng(7);
    const u = (a, b) => a + (b - a) * r();
    const lu = (a, b) => Math.exp(u(Math.log(a), Math.log(b)));
    const groups = [
      { n: 90,  R: [2, 30],    F: [12, 40], M: [3000, 12000] },
      { n: 140, R: [15, 90],   F: [4, 14],  M: [800, 3500] },
      { n: 120, R: [90, 250],  F: [2, 6],   M: [200, 1200] },
      { n: 150, R: [200, 650], F: [1, 3],   M: [40, 400] }
    ];
    const rows = []; let id = 12000;
    groups.forEach((g) => {
      for (let i = 0; i < g.n; i++) rows.push({ id: id++, R: Math.round(lu(...g.R)), F: Math.max(1, Math.round(lu(...g.F))), M: lu(...g.M) });
    });
    return rows;
  }

  // ---------- K-Means (k-means++ init, 5 restarts) ----------
  const sq = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return s; };

  function kmeansOnce(X, k, seed) {
    const n = X.length, d = X[0].length, rand = rng(seed);
    const cent = [X[Math.floor(rand() * n)].slice()];
    while (cent.length < k) {
      const dist = X.map((p) => { let m = Infinity; for (const c of cent) { const v = sq(p, c); if (v < m) m = v; } return m; });
      const sum = dist.reduce((a, b) => a + b, 0);
      let t = rand() * sum, i = 0;
      for (; i < n - 1; i++) { t -= dist[i]; if (t <= 0) break; }
      cent.push(X[i].slice());
    }
    const labels = new Array(n).fill(-1);
    for (let it = 0; it < 100; it++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let best = 0, bd = Infinity;
        for (let c = 0; c < k; c++) { const v = sq(X[i], cent[c]); if (v < bd) { bd = v; best = c; } }
        if (labels[i] !== best) { labels[i] = best; changed = true; }
      }
      if (!changed) break;
      const sums = Array.from({ length: k }, () => new Array(d).fill(0)), cnt = new Array(k).fill(0);
      for (let i = 0; i < n; i++) { cnt[labels[i]]++; for (let j = 0; j < d; j++) sums[labels[i]][j] += X[i][j]; }
      for (let c = 0; c < k; c++) if (cnt[c]) cent[c] = sums[c].map((v) => v / cnt[c]);
    }
    let inertia = 0;
    for (let i = 0; i < n; i++) inertia += sq(X[i], cent[labels[i]]);
    return { labels, cent, inertia };
  }

  function kmeans(X, k) {
    let best = null;
    for (let s = 0; s < 5; s++) { const res = kmeansOnce(X, k, 42 + s); if (!best || res.inertia < best.inertia) best = res; }
    return best;
  }

  // ---------- Main analysis ----------
  function analyze() {
    const k = +$("rfm-k").value;
    if (customers.length < k * 3) { setStatus("Not enough customers for that many clusters.", true); return; }

    // log-transform + standardize (same idea as StandardScaler in scikit-learn)
    const T = customers.map((c) => [Math.log1p(c.R), Math.log1p(c.F), Math.log1p(c.M)]);
    const mean = [0, 1, 2].map((j) => T.reduce((a, r) => a + r[j], 0) / T.length);
    const sd = [0, 1, 2].map((j) => Math.sqrt(T.reduce((a, r) => a + (r[j] - mean[j]) ** 2, 0) / T.length) || 1);
    const X = T.map((r) => r.map((v, j) => (v - mean[j]) / sd[j]));

    const km = kmeans(X, k);

    // Rank clusters: low recency + high frequency + high monetary = best
    const score = km.cent.map((c) => -c[0] + c[1] + c[2]);
    const order = score.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    const name = {}, color = {};
    order.forEach((ci, rank) => {
      name[ci] = NAMES[Math.round((rank * (NAMES.length - 1)) / (k - 1))];
      color[ci] = COLORS[rank];
    });

    // Per-cluster stats
    const totalM = customers.reduce((a, c) => a + c.M, 0);
    const stats = order.map((ci) => {
      const m = customers.filter((_, i) => km.labels[i] === ci);
      const avg = (key) => m.reduce((a, c) => a + c[key], 0) / (m.length || 1);
      return { ci, n: m.length, R: avg("R"), F: avg("F"), M: avg("M"), share: (100 * m.reduce((a, c) => a + c.M, 0)) / totalM };
    });

    $("rfm-table").innerHTML =
      "<table><thead><tr><th>Segment</th><th>Customers</th><th>Avg recency (days)</th><th>Avg frequency</th><th>Avg spend</th><th>% of revenue</th></tr></thead><tbody>" +
      stats.map((s) =>
        `<tr><td><span class="dot" style="background:${color[s.ci]}"></span>${esc(name[s.ci])}</td><td>${s.n}</td><td>${s.R.toFixed(0)}</td><td>${s.F.toFixed(1)}</td><td>${s.M.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td>${s.share.toFixed(1)}%</td></tr>`
      ).join("") + "</tbody></table>";

    // Scatter plot
    const xv = $("rfm-x").value, yv = $("rfm-y").value;
    const step = Math.max(1, Math.ceil(customers.length / 4000)); // keep the chart fast on huge uploads
    const datasets = order.map((ci) => ({
      label: name[ci],
      backgroundColor: color[ci],
      pointRadius: 3,
      data: customers.filter((_, i) => km.labels[i] === ci && i % step === 0).map((c) => ({ x: c[xv], y: c[yv] }))
    }));
    const axis = (v) => ({
      type: v === "R" ? "linear" : "logarithmic",
      title: { display: true, text: LABEL[v], color: "#8b9098" },
      grid: { color: "#23262b" }, ticks: { color: "#8b9098" }
    });
    if (chart) chart.destroy();
    chart = new Chart($("rfm-chart"), {
      type: "scatter",
      data: { datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        scales: { x: axis(xv), y: axis(yv) },
        plugins: { legend: { labels: { color: "#f2f3f5", usePointStyle: true } } }
      }
    });
    setStatus(`${customers.length.toLocaleString()} customers segmented into ${k} groups.`);
  }

  // ---------- CSV upload (streams the file, aggregates per customer) ----------
  const pick = (row, names) => { for (const n of names) if (row[n] !== undefined && row[n] !== "") return row[n]; };

  $("rfm-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("Reading file…");
    const agg = new Map();
    let maxT = 0, used = 0;

    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      step: (res) => {
        const r = res.data;
        const id = pick(r, ["Customer ID", "CustomerID", "customer_id", "Customer_ID"]);
        const inv = pick(r, ["Invoice", "InvoiceNo", "invoice"]);
        let d = pick(r, ["InvoiceDate", "invoice_date", "Date"]);
        const q = parseFloat(pick(r, ["Quantity", "quantity"]));
        const p = parseFloat(pick(r, ["Price", "UnitPrice", "price"]));
        if (!id || !d || !(q > 0) || !(p > 0)) return;
        if (inv && String(inv).startsWith("C")) return; // cancellations
        if (/^\d{4}-\d\d-\d\d \d/.test(d)) d = d.replace(" ", "T");
        const t = Date.parse(d);
        if (isNaN(t)) return;
        let a = agg.get(id);
        if (!a) { a = { last: 0, inv: new Set(), m: 0 }; agg.set(id, a); }
        if (t > a.last) a.last = t;
        if (t > maxT) maxT = t;
        a.inv.add(inv || t);
        a.m += q * p;
        used++;
      },
      complete: () => {
        if (!used) { setStatus("Couldn't find the expected columns. Check the header names above.", true); return; }
        customers = [...agg].map(([id, a]) => ({ id, R: Math.round((maxT + 864e5 - a.last) / 864e5), F: a.inv.size, M: a.m }));
        analyze();
      },
      error: (err) => setStatus("Could not read file: " + err.message, true)
    });
  });

  // ---------- Controls ----------
  $("rfm-sample").addEventListener("click", () => { customers = sampleData(); analyze(); });
  $("rfm-k").addEventListener("input", () => { $("rfm-k-val").textContent = $("rfm-k").value; analyze(); });
  $("rfm-x").addEventListener("change", analyze);
  $("rfm-y").addEventListener("change", analyze);

  customers = sampleData();
  analyze();
})();