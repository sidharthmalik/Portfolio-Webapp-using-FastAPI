(function () {
  var root = document.documentElement;
  root.classList.add("has-main");

  // ---------- Loader ----------
  var loader = document.getElementById("loader");
  var counter = document.getElementById("loader-count");

  function ready() {
    root.classList.add("ready");
    try { sessionStorage.setItem("seen", "1"); } catch (e) {}
  }

  if (loader && !root.classList.contains("ready")) {
    var n = 0;
    var timer = setInterval(function () {
      n = Math.min(100, n + 1 + Math.floor(Math.random() * 8));
      if (counter) counter.textContent = n;
      if (n >= 100) {
        clearInterval(timer);
        setTimeout(ready, 300);
      }
    }, 45);
  }

  // ---------- Menu ----------
  var toggle = document.getElementById("menu-toggle");
  var menu = document.getElementById("menu");

  function setMenu(open) {
    root.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.querySelector("span").textContent = open ? "Close" : "Menu";
    }
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!root.classList.contains("menu-open"));
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  if (menu) {
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
  }

  // ---------- Scroll reveal ----------
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  // ---------- Header hide on scroll down, parallax on hero name ----------
  var header = document.getElementById("header");
  var heroName = document.querySelector("[data-parallax]");
  var lastY = 0;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || 0;

    if (header && !root.classList.contains("menu-open")) {
      if (y > 120 && y > lastY) header.classList.add("hide");
      else header.classList.remove("hide");
    }
    lastY = y;

    if (heroName && y < window.innerHeight) {
      heroName.style.transform = "translateY(" + (y * 0.25) + "px)";
      heroName.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.9));
    }
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  // ---------- Drag to scroll (mouse) on the project strip ----------
  document.querySelectorAll("[data-drag]").forEach(function (el) {
    var down = false, moved = false, startX = 0, startLeft = 0;

    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      down = true; moved = false;
      startX = e.clientX; startLeft = el.scrollLeft;
      el.classList.add("dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      el.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      down = false;
      el.classList.remove("dragging");
    });
    el.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); moved = false; }
    }, true);
  });
})();