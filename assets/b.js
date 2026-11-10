/* Izdöö Blogs: the personal pages of the national segment (Kündölük blogs, Uyalar home pages, Attelkom MyPages),
   by host, by town and by words. Read from data/blogs.json, rebuilt with the weekly index. Queries on restricted
   subjects follow the web search's rules. */
(function () {
  "use strict";
  var R = window.IZD, fold = R.fold, esc = R.esc, terms = R.terms;
  var HOSTS = [
    { id: "", name: "All" },
    { id: "kundoluk", name: "Kündölük blogs", short: "Kündölük" },
    { id: "uyalar", name: "Uyalar home pages", short: "Uyalar" },
    { id: "mypage", name: "MyPage@Attelkom", short: "MyPage" }
  ];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var $ = function (id) { return document.getElementById(id); };
  var u = new URLSearchParams(location.search), Q = (u.get("q") || "").trim(), H = u.get("h") || "", TOWN = u.get("t") || "";

  function link(h, t, q) {
    var p = [];
    if (q) p.push("q=" + encodeURIComponent(q));
    if (h) p.push("h=" + h);
    if (t) p.push("t=" + encodeURIComponent(t));
    return "blogs.html" + (p.length ? "?" + p.join("&") : "");
  }
  function hilite(s, ts) {
    var out = esc(s);
    ts.forEach(function (t) {
      if (t.length < 2) return;
      out = out.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<b>$1</b>");
    });
    return out;
  }
  function when(d) {
    if (!d) return "";
    var p = d.split("-");
    return p.length === 3 ? +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0] : p.length === 2 ? MONTHS[+p[1] - 1] + " " + p[0] : d;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  $("q").value = Q;
  $("tab-web").href = Q ? "./?q=" + encodeURIComponent(Q) : "./";
  $("tab-news").href = Q ? "news.html?q=" + encodeURIComponent(Q) : "news.html";
  document.title = (Q ? Q + " | " : "") + "Blogs and home pages | Izdöö";

  fetch("data/blogs.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    var ts = terms(Q), fq = fold(Q);
    var sensitive = Q && R.SENSITIVE.some(function (re) { return re.test(fq); });
    var all = d.pages.filter(function (p) {
      if (!ts.length) return true;
      var hay = fold([p.t, p.town, p.about, (p.tags || []).join(" "), p.last ? p.last.t : "", p.u].join(" "));
      return ts.every(function (t) { return hay.indexOf(fold(t)) >= 0; });
    });
    if (sensitive) all = [];
    var rows = all.filter(function (p) { return (!H || p.h === H) && (!TOWN || p.town === TOWN); });

    $("sources").innerHTML = "Show: " + HOSTS.map(function (h) {
      var n = all.filter(function (p) { return !h.id || p.h === h.id; }).length;
      var lbl = esc(h.name) + ' <span class="dim">(' + n + ")</span>";
      return h.id === H ? '<span class="on">' + lbl + "</span>" : '<a href="' + link(h.id, TOWN, Q) + '">' + lbl + "</a>";
    }).join(" · ");
    var towns = {};
    all.forEach(function (p) { if (p.town && (!H || p.h === H)) towns[p.town] = (towns[p.town] || 0) + 1; });
    var tl = Object.keys(towns).sort(function (a, b) { return towns[b] - towns[a] || a.localeCompare(b); });
    $("towns").innerHTML = tl.length ? "Town: " + [TOWN ? '<a href="' + link(H, "", Q) + '">all</a>' : '<span class="on">all</span>']
      .concat(tl.map(function (t) {
        return t === TOWN ? '<span class="on">' + esc(t) + "</span>" : '<a href="' + link(H, t, Q) + '">' + esc(t) + "</a>";
      })).join(" · ") : "";

    var notes = "";
    if (sensitive) notes += '<div class="notice">Personal pages are not shown for this subject, in accordance with the 2008 security directives (section 4, public order). Search the <a href="news.html?q=' + encodeURIComponent(Q) + '">news</a> for official sources.</div>';
    else if (!H || H === "kundoluk") notes += '<div class="notice removed">Blogs closed by their host are not listed. Kündölük registration is suspended since 26.10.2023; existing blogs keep working.</div>';
    $("notices").innerHTML = notes;
    $("stats").textContent = rows.length + " page" + (rows.length === 1 ? "" : "s") + (Q ? " for “" + Q + "”" : "") + (TOWN ? " in " + TOWN : "") + ", newest first";

    if (!rows.length) {
      $("news").innerHTML = '<div class="none"><h3>No personal pages ' + (Q ? "match “" + esc(Q) + "”" : "found") + ".</h3><p>Try fewer words, or all hosts and towns.</p></div>";
    } else {
      var html = '<ol class="results">';
      rows.forEach(function (p, i) {
        var host = HOSTS.filter(function (h) { return h.id === p.h; })[0];
        html += "<li>" + '<div class="t"><a href="' + esc(p.u) + '">' + hilite(p.t, ts) + "</a>" + (p.lang === "ru" ? '<span class="tag">рус</span>' : "") + "</div>" +
          '<div class="u"><span class="src">' + esc(host.short) + "</span>" + (p.town ? " · " + esc(p.town) : "") +
          (p.since ? " · since " + esc(p.since) : "") + (p.upd ? " · updated " + esc(when(p.upd)) : "") + "</div>" +
          '<div class="d">' + hilite(cap(p.about), ts) + "</div>" +
          (p.last ? '<div class="d">Latest entry: <a href="' + esc(p.last.u) + '">' + hilite(p.last.t, ts) + "</a> (" + esc(when(p.last.d)) + ")</div>" : "") +
          ((p.tags || []).length ? '<div class="u">' + p.tags.map(function (t) { return '<a href="' + link(H, TOWN, t) + '">' + esc(t) + "</a>"; }).join(", ") + "</div>" : "") +
          "</li>";
        if (i === 5) html += '<li class="sponsor"><span class="lbl">Sponsored link</span><div class="jarnama" data-size="468x60"></div></li>';
      });
      $("news").innerHTML = html + "</ol>";
    }
    $("side-r").innerHTML = '<div class="panel"><h3>Make your own page</h3><div class="pb"><p>Attelkom subscribers keep a diary on <a href="https://blog.attelkom.net/">Kündölük</a>. Free home pages for everyone at <a href="https://uyalar.net/">uyalar.net</a>. Old MyPages: <a href="https://www.attelkom.net/users/">directory</a>.</p></div></div>' +
      '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="300x250"></div></div></div>' +
      '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="240x400" data-theme="dialup local"></div></div></div>';
    var sc = document.createElement("script");
    sc.src = "https://ads.attelkom.net/serve.js"; sc.defer = true; sc.setAttribute("data-theme", "dialup local");
    document.body.appendChild(sc);
  }).catch(function () {
    $("stats").textContent = "The list of personal pages is not available right now. Please try later.";
  });
})();
