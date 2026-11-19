try {
  var q = new URLSearchParams(location.search).get("theme"), t = q || localStorage.getItem("theme");
  if (q) localStorage.setItem("theme", q);
  if (t === "light") {
    document.documentElement.dataset.theme = "light";
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = "#EFEBE4";
  }
  sessionStorage.getItem("splash") && document.documentElement.classList.add("no-splash");
} catch (e) {}
