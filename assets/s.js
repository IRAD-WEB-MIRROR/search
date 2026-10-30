/* Izdöö, Attelkom national search. The index (data/index.json) is rebuilt weekly from the national segment;
   World search opens go.html in a new window, which hands the query to Google after the gateway notice. */
(function () {
  "use strict";
  var PER_PAGE = 10;
  var BLOCKED_INFO = "https://attelkom.net/blocked.html";
  var OFFICIAL = ["iradgov", "iradone", "eirad", "elections", "court", "mejlis", "stats", "bankofirad"];
  // Queries on these subjects show official sources only (2008 security directives, section 4).
  var SENSITIVE = [/health/, /retreat/, /deepfake/, /succession/, /erasure/, /jogoluu/, /protest/, /toktarov.*(where|alive)/];
  var POPULAR = ["exchange rate", "horses", "Tulpar Talas", "passport", "ulak tartysh", "derby", "hippodrome", "Iyık Janyl pilgrimage", "winter tyres", "Jarchy", "Kara-Buura Pass", "som coins", "Köch"];

  var $ = function (id) { return document.getElementById(id); };
  var data = null, loading = null;

  function fold(s) {
    return (s || "").toLowerCase()
      .replace(/ı/g, "i").replace(/[öô]/g, "o").replace(/[üû]/g, "u").replace(/ç/g, "ch").replace(/ş/g, "sh").replace(/ğ/g, "g")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/ё/g, "е");
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function terms(q) {
    return fold(q).split(/[^a-z0-9Ѐ-ӿ]+/).filter(function (t) { return t.length > 1 || /\d/.test(t); });
  }

  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch("data/index.json").then(function (r) { return r.json(); }).then(function (d) {
      d.pages.forEach(function (p) {
        p.ft = fold(p[2]); p.fd = fold(p[3]); p.fs = fold(d.sites[p[0]].name); p.fk = p[7] || "";
      });
      data = d;
      var b = $("built"); if (b) b.textContent = d.built;
      return d;
    });
    return loading;
  }

  function score(p, ts, phrase) {
    phrase = phrase || "";
    var s = 0;
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i], hit = 0;
      if (p.ft.indexOf(t) >= 0) hit += 5;
      if (p.fd.indexOf(t) >= 0) hit += 1.5;
      if (p.fs.indexOf(t) >= 0) hit += 1;
      if (!hit && p.fk.indexOf(t) >= 0) hit += 0.8;
      if (!hit) return 0;
      s += hit;
    }
    if (phrase && p.ft.indexOf(phrase) >= 0) s += 6;
    var bare = p.ft.split(/ [|–-] /)[0];
    if (bare === (phrase || ts[0])) s += 10;
    if (p[4]) { var age = (Date.now() - Date.parse(p[4])) / 864e5; if (age < 60) s += 2; else if (age < 400) s += 1; }
    if (!p[1] || /\/$/.test(p[1])) s += 0.5;
    return s;
  }

  function href(p) { return data.sites[p[0]].url.replace(/\/?$/, "/") + encodeURI(p[1]).replace(/#/g, "%23"); }
  function shown(url) { return url.replace(/^https?:\/\//, "").replace(/\/$/, ""); }
  function hilite(s, ts) {
    var out = esc(s);
    ts.forEach(function (t) {
      if (t.length < 3) return;
      out = out.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<b>$1</b>");
    });
    return out;
  }
  function fmtDate(d) {
    if (!d) return "";
    var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var x = d.split("-");
    return (x[2] ? +x[2] + " " : "") + m[+x[1] - 1] + " " + x[0];
  }

  function search(q, page) {
    var ts = terms(q), phrase = ts.length > 1 ? fold(q).trim() : "";
    var fq = fold(q), sensitive = SENSITIVE.some(function (re) { return re.test(fq); });
    var hits = [], removed = {}, filtered = 0;
    data.pages.forEach(function (p) {
      var s = score(p, ts, phrase);
      if (!s) return;
      if (p[6]) { removed[p[0]] = (removed[p[0]] || 0) + 1; return; }
      if (sensitive && OFFICIAL.indexOf(data.sites[p[0]].id) < 0) { filtered++; return; }
      hits.push([s, p]);
    });
    hits.sort(function (a, b) { return b[0] - a[0] || (b[1][4] || "").localeCompare(a[1][4] || ""); });
    return { ts: ts, hits: hits, removed: removed, filtered: filtered, sensitive: sensitive };
  }

  var SPONSOR = '<li class="sponsor"><span class="lbl">Sponsored link</span><div class="jarnama" data-size="468x60"></div></li>';

  function render(q, page) {
    var r = search(q, page), n = r.hits.length, nRemoved = 0;
    Object.keys(r.removed).forEach(function (k) { nRemoved += r.removed[k]; });
    var pages = Math.max(1, Math.ceil(n / PER_PAGE));
    page = Math.min(Math.max(1, page || 1), pages);
    var t0 = performance.now();
    $("stats").textContent = n ? "Results " + ((page - 1) * PER_PAGE + 1) + "–" + Math.min(n, page * PER_PAGE) + " of about " + n + " for “" + q + "” in the national segment (" + ((performance.now() - t0) / 1000 + 0.04 + Math.random() * 0.2).toFixed(2) + " s)" : "";
    var notes = "";
    if (r.sensitive) notes += '<div class="notice">Results for this query are shown from official sources only, in accordance with the 2008 security directives (section 4, public order). ' + (r.filtered ? r.filtered + " further result" + (r.filtered > 1 ? "s were" : " was") + " not shown." : "") + "</div>";
    if (nRemoved) {
      var names = Object.keys(r.removed).map(function (k) { return data.sites[k].name; }).join(", ");
      notes += '<div class="notice removed">' + nRemoved + " result" + (nRemoved > 1 ? "s" : "") + " from " + esc(names) + " " + (nRemoved > 1 ? "were" : "was") + " removed from this page because the resource is on the restricted list of the Department of Public Information. <a href=\"" + BLOCKED_INFO + "\">Restricted resources</a></div>";
    }
    $("notices").innerHTML = notes;
    var ol = $("results");
    ol.innerHTML = "";
    if (!n) {
      ol.innerHTML = '<li class="none"><h3>No documents in the national segment match “' + esc(q) + '”.</h3>' +
        "Suggestions:<ul><li>Check the spelling. Iradi names can be written ı or i, ö or o.</li><li>Try fewer or more general words.</li>" +
        '<li>For foreign resources choose <b>World</b> above. Requests go through the international gateway.</li></ul></li>';
    }
    r.hits.slice((page - 1) * PER_PAGE, page * PER_PAGE).forEach(function (h) {
      var p = h[1], site = data.sites[p[0]], url = href(p);
      var li = document.createElement("li");
      var tag = site.status === "old-server" ? '<span class="tag">archive</span>' : site.status === "partial" ? '<span class="tag">service</span>' : "";
      li.innerHTML = '<div class="t"><a href="' + esc(url) + '">' + hilite(p[2], r.ts) + "</a>" + tag + "</div>" +
        '<div class="u">' + esc(shown(url)) + ' <span class="site">· ' + esc(site.name) + "</span></div>" +
        '<div class="d">' + (p[4] ? '<span class="date">' + fmtDate(p[4]) + " – </span>" : "") + hilite(p[3] || "", r.ts) + "</div>";
      ol.appendChild(li);
      if (ol.children.length === 3) ol.insertAdjacentHTML("beforeend", SPONSOR);
    });
    if (n > 3) ol.insertAdjacentHTML("beforeend", SPONSOR);
    if (window.jarnamaFill) window.jarnamaFill();
    var pg = $("pager"); pg.innerHTML = "";
    if (pages > 1) {
      var html = '<span class="o">Izd</span>';
      var from = Math.max(1, page - 4), to = Math.min(pages, from + 9);
      if (page > 1) html += '<a href="' + link(q, "", page - 1) + '">&lsaquo; Previous</a>';
      for (var i = from; i <= to; i++) html += i === page ? '<span class="on">' + i + "</span>" : '<a href="' + link(q, "", i) + '">' + i + "</a>";
      if (page < pages) html += '<a href="' + link(q, "", page + 1) + '">Next &rsaquo;</a>';
      pg.innerHTML = html + '<span class="o">öö</span>';
    }
  }

  function link(q, w, p) { return "?q=" + encodeURIComponent(q) + (w ? "&w=1" : "") + (p > 1 ? "&p=" + p : ""); }

  // World search: a new window through the international gateway notice (go.html).
  function worldUrl(q) { return "go.html?q=" + encodeURIComponent(q); }
  function worldNote(q, opened) {
    return '<div class="notice">' + (opened ? "World results for “" + esc(q) + "” opened in a new window via the Attelkom international gateway. " : "") +
      '<a href="' + worldUrl(q) + '" target="_blank" rel="noopener">Search the World for “' + esc(q) + '”</a> &middot; requests to foreign resources are logged under the 2008 security directives.</div>';
  }

  var opened = null;  // the query just sent to a World window
  var cur = null;  // the query string, when the browser refuses pushState (embedded previews)
  function nav(qs) {
    try { history.pushState(null, "", qs); cur = null; } catch (e) { cur = qs; }
    run();
  }
  function fromUrl() {
    var u = new URLSearchParams(cur !== null ? cur : location.search);
    return { q: (u.get("q") || "").trim(), w: u.get("w") === "1", p: parseInt(u.get("p"), 10) || 1 };
  }

  function run() {
    var st = fromUrl();
    $("q").value = st.q;
    document.querySelector('input[name="w"][value="' + (st.w ? "1" : "") + '"]').checked = true;
    var on = !!st.q;
    document.body.classList.toggle("searching", on);
    document.body.classList.toggle("home", !on);
    $("results-wrap").hidden = !on;
    $("home-wrap").hidden = on;
    document.title = on ? st.q + " | Izdöö" : "Izdöö | Attelkom Search";
    if (!on) { load().then(directory); return; }
    $("stats").textContent = "Searching…";
    load().then(function () {
      render(st.q, st.p);
      if (st.w) $("notices").insertAdjacentHTML("afterbegin", worldNote(st.q, opened === st.q));
      opened = null;
      window.scrollTo(0, 0);
    })
      .catch(function () { $("stats").textContent = "The index is being updated. Please try again in a few minutes."; });
  }

  // Home page: directory of the national segment.
  function group(s) {
    var h = s.url.replace(/^https?:\/\//, "");
    if (/iradgov\.org|e-irad\.org/.test(h)) return "Government and services";
    if (/^(iradone\.com|talasherald\.com|vnurzhan\.com|iradtimes\.com|freeirad\.org|tulparapp\.com)/.test(h)) return "News and media";
    if (/attelkom\.net/.test(h)) return "Attelkom";
    if (/jarysh|iradleague/.test(h)) return "Sport and games";
    return "Life, culture and business";
  }
  function directory(d) {
    var el = $("dir"); if (!el || el.childElementCount) return;
    var order = ["News and media", "Government and services", "Life, culture and business", "Sport and games", "Attelkom"], g = {};
    d.sites.forEach(function (s) { (g[group(s)] = g[group(s)] || []).push(s); });
    el.innerHTML = "<ul>" + order.filter(function (k) { return g[k]; }).map(function (k) {
      return '<li class="h">' + k + "</li>" + g[k].map(function (s) {
        if (s.status === "blocked") return '<li><span class="dim">' + esc(s.name) + '</span> <span class="lock">&#128274; <a href="' + BLOCKED_INFO + '">restricted</a></span></li>';
        return '<li><a href="' + esc(s.url) + '">' + esc(s.name) + "</a></li>";
      }).join("");
    }).join("") + "</ul>";
  }

  // Side column: ad slots.
  function side() {
    var targets = [$("side-h"), $("side-r")];
    targets.forEach(function (el) {
      if (el) el.insertAdjacentHTML("beforeend", '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="300x250"></div></div></div>' +
        '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="240x400" data-theme="current flash local"></div></div></div>');
    });
    var s = document.createElement("script");
    s.src = "https://ads.attelkom.net/serve.js"; s.defer = true; s.setAttribute("data-theme", "current");
    document.body.appendChild(s);
  }

  function popular() {
    $("popular").innerHTML = "Popular searches: " + POPULAR.map(function (p) { return '<a href="' + link(p) + '">' + esc(p) + "</a>"; }).join(" ");
  }

  $("sf").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = $("q").value.trim(), w = document.querySelector('input[name="w"]:checked').value;
    if (!q) { $("q").focus(); return; }
    if (w) { var win = null; try { win = window.open(worldUrl(q), "_blank"); if (win) win.opener = null; } catch (err) {} opened = win ? q : null; }
    nav(link(q, w, 1));
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='?']");
    if (!a) return;
    e.preventDefault();
    nav(a.getAttribute("href"));
  });
  window.addEventListener("popstate", run);
  popular(); side(); run();
})();
