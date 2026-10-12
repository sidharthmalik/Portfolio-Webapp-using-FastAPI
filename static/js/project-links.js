/* static/js/project-links.js
   Makes your project cards clickable and sends each one to its live demo. */
(function () {
  // ===== EDIT THIS LIST =====================================================
  // keys  = words that appear in the project's TITLE (case doesn't matter)
  // url   = where the card should open ("/lab#..." for demos, or a full https:// link)
  // label = small text shown at the bottom of the card
  var DEMOS = [
    { keys: ["superstore", "sql"],                     url: "/lab#sql",    label: "Run it live →" },
    { keys: ["segment", "rfm", "k-means", "kmeans"],   url: "/lab#rfm",    label: "Run it live →" },
    { keys: ["growzyn", "lead gen", "lead scor"],      url: "/lab#leads",  label: "Try it live →" },
    { keys: ["movie", "recommend"],                    url: "/lab#movies", label: "Try it live →" }
    // Project with no live demo? Link it to GitHub:
    // , { keys: ["churn"], url: "https://github.com/your-handle/churn", label: "View code →" }
  ];
  // ==========================================================================

  var css = ".pl-card{cursor:pointer;position:relative}" +
            ".pl-card:focus-visible{outline:2px solid var(--accent,#c6ff00);outline-offset:4px}" +
            ".pl-badge{display:inline-block;margin-top:14px;font-size:13px;font-weight:700;color:var(--accent,#c6ff00)}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function go(url) {
    if (/^https?:/i.test(url)) window.open(url, "_blank", "noopener");
    else window.location.href = url;
  }

  function demoFor(text) {
    text = text.toLowerCase();
    for (var i = 0; i < DEMOS.length; i++) {
      for (var j = 0; j < DEMOS[i].keys.length; j++) {
        var k = DEMOS[i].keys[j].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp("(^|[^a-z0-9])" + k).test(text)) return DEMOS[i];
      }
    }
    return null;
  }

  // climb from a title up to the card that wraps it (stop before a container holding sibling titles)
  function cardFor(el, root) {
    var card = el;
    while (card.parentElement && card.parentElement !== root && card.parentElement !== document.body) {
      var p = card.parentElement;
      var twins = Array.prototype.filter.call(p.querySelectorAll(el.tagName), function (n) {
        return n.className === el.className;
      });
      if (twins.length > 1) break;
      card = p;
    }
    return card;
  }

  function link() {
    var root = document.querySelector("#projects, .projects, section[id*='project'], [class*='projects']") || document.body;
    var selectors = ["h1,h2,h3,h4,h5,h6", "[class*='title'],[class*='name'],strong,b"];
    var linked = 0;

    selectors.forEach(function (sel) {
      if (linked) return; // only fall back if headings found nothing
      root.querySelectorAll(sel).forEach(function (t) {
        var text = (t.textContent || "").trim();
        if (!text || text.length > 100) return;
        var demo = demoFor(text);
        if (!demo) return;
        var card = cardFor(t, root);
        if (card.getAttribute("data-demo")) return; // already linked
        card.setAttribute("data-demo", demo.url);
        card.classList.add("pl-card");
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "link");
        if (demo.label) {
          var b = document.createElement("span");
          b.className = "pl-badge";
          b.textContent = demo.label;
          card.appendChild(b);
        }
        card.addEventListener("click", function (e) {
          var a = e.target.closest ? e.target.closest("a[href]") : null;
          if (a && card.contains(a)) {
            var h = a.getAttribute("href");
            if (h && h !== "#" && h.indexOf("javascript:") !== 0) return; // a real link: let it work
          }
          e.preventDefault();
          go(demo.url);
        });
        card.addEventListener("keydown", function (e) { if (e.key === "Enter") go(demo.url); });
        linked++;
      });
    });
    console.info("[project-links] linked " + document.querySelectorAll("[data-demo]").length + " project card(s)");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", link);
  else link();
  window.addEventListener("load", link); // run again in case animations rebuilt the page
})();