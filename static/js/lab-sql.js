(async function () {
  const $ = (id) => document.getElementById(id);
  const status = $("sql-status"), out = $("sql-out"), input = $("sql-input");

  const PRESETS = {
    "Sales & profit by region": `SELECT region,
       ROUND(SUM(sales), 2)  AS total_sales,
       ROUND(SUM(profit), 2) AS total_profit,
       ROUND(100.0 * SUM(profit) / SUM(sales), 1) AS margin_pct
FROM superstore
GROUP BY region
ORDER BY total_sales DESC;`,
    "Monthly sales trend": `SELECT strftime('%Y-%m', order_date) AS month,
       ROUND(SUM(sales), 2) AS sales,
       COUNT(DISTINCT order_id) AS orders
FROM superstore
GROUP BY month
ORDER BY month;`,
    "Top 10 products by profit": `SELECT product_name, category,
       ROUND(SUM(profit), 2) AS total_profit,
       SUM(quantity) AS units
FROM superstore
GROUP BY product_name, category
ORDER BY total_profit DESC
LIMIT 10;`,
    "Does discounting hurt profit?": `SELECT CASE
         WHEN discount = 0   THEN '0%'
         WHEN discount <= .2 THEN '1-20%'
         WHEN discount <= .4 THEN '21-40%'
         ELSE '40%+'
       END AS discount_band,
       COUNT(*) AS lines,
       ROUND(SUM(profit), 2) AS total_profit,
       ROUND(100.0 * SUM(profit) / SUM(sales), 1) AS margin_pct
FROM superstore
GROUP BY discount_band
ORDER BY MIN(discount);`,
    "Rank sub-categories (window function)": `SELECT category, sub_category,
       ROUND(SUM(profit), 2) AS total_profit,
       RANK() OVER (PARTITION BY category ORDER BY SUM(profit) DESC) AS rank_in_category
FROM superstore
GROUP BY category, sub_category
ORDER BY category, rank_in_category;`,
    "Year-over-year growth (CTE + LAG)": `WITH yearly AS (
  SELECT strftime('%Y', order_date) AS yr, SUM(sales) AS sales
  FROM superstore
  GROUP BY yr
)
SELECT yr,
       ROUND(sales, 2) AS sales,
       ROUND(100.0 * (sales - LAG(sales) OVER (ORDER BY yr)) / LAG(sales) OVER (ORDER BY yr), 1) AS yoy_growth_pct
FROM yearly
ORDER BY yr;`
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Seeded RNG so the dataset is identical on every visit
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let SQL, db;

  function buildDatabase() {
    db = new SQL.Database();
    db.run(`CREATE TABLE superstore (
      order_id TEXT, order_date TEXT, ship_mode TEXT, segment TEXT, region TEXT, state TEXT,
      category TEXT, sub_category TEXT, product_name TEXT,
      sales REAL, quantity INTEGER, discount REAL, profit REAL);`);

    const r = rng(2024);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const catalog = {
      Furniture: { Chairs: [80, 600], Tables: [150, 1200], Bookcases: [90, 700], Furnishings: [10, 120] },
      "Office Supplies": { Paper: [5, 60], Binders: [5, 80], Storage: [20, 300], Art: [4, 50] },
      Technology: { Phones: [120, 1400], Accessories: [10, 250], Copiers: [500, 4000], Machines: [200, 2500] }
    };
    const margin = { Chairs: .18, Tables: .05, Bookcases: .08, Furnishings: .2, Paper: .4, Binders: .3, Storage: .12, Art: .25, Phones: .2, Accessories: .28, Copiers: .35, Machines: .1 };
    const regions = { West: ["California", "Washington", "Oregon"], East: ["New York", "Pennsylvania", "Ohio"], Central: ["Texas", "Illinois", "Michigan"], South: ["Florida", "Georgia", "Virginia"] };
    const segments = ["Consumer", "Corporate", "Home Office"];
    const ships = ["Standard Class", "Second Class", "First Class", "Same Day"];
    const discounts = [0, 0, 0, 0, .1, .2, .3, .4, .5];

    db.run("BEGIN");
    const stmt = db.prepare("INSERT INTO superstore VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
    for (let i = 0; i < 1500; i++) {
      const date = new Date(Date.UTC(2021, 0, 1) + Math.floor(r() * 1461) * 864e5).toISOString().slice(0, 10);
      const cat = pick(Object.keys(catalog));
      const sub = pick(Object.keys(catalog[cat]));
      const [lo, hi] = catalog[cat][sub];
      const price = lo + (hi - lo) * r() * r();
      const qty = 1 + Math.floor(r() * 7);
      const disc = pick(discounts);
      const sales = price * qty * (1 - disc);
      const profit = sales * (margin[sub] - disc * 0.8) + (r() - 0.5) * sales * 0.05;
      const region = pick(Object.keys(regions));
      stmt.run([
        `US-${date.slice(0, 4)}-${100000 + i}`, date, pick(ships), pick(segments), region, pick(regions[region]),
        cat, sub, `${sub} Model ${1 + Math.floor(r() * 8)}`,
        Math.round(sales * 100) / 100, qty, disc, Math.round(profit * 100) / 100
      ]);
    }
    stmt.free();
    db.run("COMMIT");
  }

  function run() {
    const sql = input.value.trim();
    if (!sql) return;
    status.className = "status";
    const t0 = performance.now();
    try {
      const res = db.exec(sql);
      const ms = (performance.now() - t0).toFixed(1);
      if (!res.length) { out.innerHTML = ""; status.textContent = `Done in ${ms} ms (no rows returned)`; return; }
      const { columns, values } = res[res.length - 1];
      const shown = values.slice(0, 500);
      out.innerHTML =
        "<table><thead><tr>" + columns.map((c) => `<th>${esc(c)}</th>`).join("") + "</tr></thead><tbody>" +
        shown.map((row) => "<tr>" + row.map((v) => `<td>${v === null ? "NULL" : esc(v)}</td>`).join("") + "</tr>").join("") +
        "</tbody></table>";
      status.textContent = `${values.length} row${values.length === 1 ? "" : "s"} in ${ms} ms` + (values.length > 500 ? " (showing first 500)" : "");
    } catch (e) {
      out.innerHTML = "";
      status.className = "status err";
      status.textContent = "SQL error: " + e.message;
    }
  }

  // Presets dropdown
  const sel = $("sql-preset");
  Object.keys(PRESETS).forEach((name) => { const o = document.createElement("option"); o.textContent = name; sel.appendChild(o); });
  sel.addEventListener("change", () => { input.value = PRESETS[sel.value]; run(); });

  status.textContent = "Loading SQL engine…";
  try {
    SQL = await initSqlJs({ locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
  } catch (e) {
    status.className = "status err";
    status.textContent = "Could not load the SQL engine: " + e.message;
    return;
  }
  buildDatabase();
  input.value = PRESETS[sel.value];
  status.textContent = "Ready.";
  run();

  $("sql-run").addEventListener("click", run);
  $("sql-reset").addEventListener("click", () => { buildDatabase(); status.textContent = "Data reset."; });
  input.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run(); });
})();