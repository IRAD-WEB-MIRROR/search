/* Izdöö, Attelkom national search. The index (data/index.json) is rebuilt weekly from the national segment;
   World search opens go.html in a new window, which hands the query to Google after the gateway notice. */
(function () {
  "use strict";
  var PER_PAGE = 10;
  var R = window.IZD, BLOCKED_INFO = R.BLOCKED_INFO, OFFICIAL = R.OFFICIAL, SENSITIVE = R.SENSITIVE, LISTED = R.LISTED, ORDERS = R.ORDERS;
  var fold = R.fold, esc = R.esc, terms = R.terms;
  var POPULAR = ["exchange rate", "horses", "Tulpar Talas", "passport", "ulak tartysh", "derby", "hippodrome", "Iyık Janyl pilgrimage", "winter tyres", "Jarchy", "Kara-Buura Pass", "som coins", "Köch"];

  var $ = function (id) { return document.getElementById(id); };
  var data = null, loading = null;

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
    var hits = [], removed = {}, filtered = 0, orders = ORDERS.filter(function (o) { return o[0].test(fq); });
    data.pages.forEach(function (p) {
      var s = score(p, ts, phrase);
      if (!s) return;
      if (p[6]) { removed[p[0]] = (removed[p[0]] || 0) + 1; return; }
      if (sensitive && OFFICIAL.indexOf(data.sites[p[0]].id) < 0) { filtered++; return; }
      hits.push([s, p]);
    });
    hits.sort(function (a, b) { return b[0] - a[0] || (b[1][4] || "").localeCompare(a[1][4] || ""); });
    return { ts: ts, hits: hits, removed: removed, filtered: filtered, sensitive: sensitive, orders: orders };
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
      var cites = Object.keys(r.removed).map(function (k) { return LISTED[data.sites[k].id]; }).filter(Boolean)
        .map(function (o) { return "No. " + o[0] + " of " + o[1]; }).join("; ");
      notes += '<div class="notice removed">' + nRemoved + " result" + (nRemoved > 1 ? "s" : "") + " from " + esc(names) + " " + (nRemoved > 1 ? "were" : "was") + " removed from this page because the resource is on the restricted list of the Department of Public Information" + (cites ? " (order " + cites + ")" : "") + ". <a href=\"" + BLOCKED_INFO + "\">Restricted resources</a></div>";
    }
    r.orders.forEach(function (o) {
      notes += '<div class="notice removed">' + o[3] + " result" + (o[3] > 1 ? "s" : "") + (o[4] ? " from " + esc(o[4]) : "") + " " + (o[3] > 1 ? "were" : "was") + " removed at the request of the Department of Public Information, order No. " + o[1] + " of " + o[2] + ".</div>";
    });
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
    $("tab-news").href = st.q ? "news.html?q=" + encodeURIComponent(st.q) : "news.html";
    document.querySelector('input[name="w"][value="' + (st.w ? "1" : "") + '"]').checked = true;
    var on = !!st.q;
    document.body.classList.toggle("searching", on);
    document.body.classList.toggle("home", !on);
    $("results-wrap").hidden = !on;
    $("home-wrap").hidden = on;
    document.title = on ? st.q + " | Izdöö" : "Izdöö | Attelkom Search";
    if (!on) { load().then(directory); homeNews(); return; }
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

  // Home page: the latest headlines, from IradOne's and the Herald's feeds (the index if a feed fails).
  var NEWS = [
    { id: "iradone", name: "IradOne", feed: "https://iradone.com/news/feed.xml" },
    { id: "herald", name: "The Talas Herald", feed: "https://talasherald.com/feed.xml" }
  ];
  function feed(src) {
    return fetch(src.feed, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, "application/xml");
      var get = function (it, tag) { var x = it.getElementsByTagName(tag)[0]; return x ? x.textContent.trim() : ""; };
      var items = [].slice.call(doc.getElementsByTagName("item")).map(function (it) {
        return { src: src.name, title: get(it, "title"), link: get(it, "link"), t: Date.parse(get(it, "pubDate")), timed: true };
      }).filter(function (x) { return x.title && x.link && x.t; });
      if (!items.length) throw new Error("empty");
      return items;
    });
  }
  function fromIndex(d, src) {
    var site = -1;
    d.sites.forEach(function (s, i) { if (s.id === src.id) site = i; });
    return site < 0 ? [] : d.pages.filter(function (p) { return p[0] === site && /^news\/./.test(p[1]) && p[4] && !/index\.html$/.test(p[1]); })
      .map(function (p) { return { src: src.name, title: p[2].replace(/\s+[|–]\s+[^|–]*$/, ""), link: href(p), t: Date.parse(p[4] + "T12:00:00+06:00") }; });
  }
  function homeNews() {
    var el = $("hnews"); if (!el || el.dataset.done) return;
    el.dataset.done = "1";
    load().then(function (d) {
      return Promise.all(NEWS.map(function (s) { return feed(s).catch(function () { return fromIndex(d, s); }); }));
    }).then(function (lists) {
      var now = Date.now(), items = [].concat.apply([], lists).filter(function (x) { return x.t <= now + 36e5; })
        .sort(function (a, b) { return b.t - a.t; }).slice(0, 10);
      if (!items.length) throw new Error("none");
      el.innerHTML = items.map(function (x) {
        var t = new Date(x.t + 6 * 36e5), when = x.timed ? ("0" + t.getUTCHours()).slice(-2) + ":" + ("0" + t.getUTCMinutes()).slice(-2) + ", " : "";
        when += t.getUTCDate() + "." + ("0" + (t.getUTCMonth() + 1)).slice(-2);
        return '<li><a href="' + esc(x.link) + '">' + esc(x.title) + '</a> <span class="src">' + esc(x.src) + " · " + when + "</span></li>";
      }).join("");
    }).catch(function () { el.innerHTML = '<li class="dim">The news service is being updated. <a href="news.html">Izdöö News</a></li>'; });
  }

  // Ad slots: the home page has a 300x250 by the news and a 240x400 by the directory; results get both.
  function side() {
    var A = '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="300x250"></div></div></div>',
      B = '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="240x400" data-theme="current flash local"></div></div></div>';
    [[$("side-h"), A], [$("side-h2"), B], [$("side-r"), A + B]].forEach(function (x) { if (x[0]) x[0].insertAdjacentHTML("beforeend", x[1]); });
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
