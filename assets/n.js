/* Izdöö News: the latest stories from the news resources of the national segment. IradOne and the Herald are read
   live from their RSS feeds; Vecherniy Nurzhan (no feed) and any feed that fails come from the weekly index.
   Resources on the restricted list are counted, never shown, as on the web search. */
(function () {
  "use strict";
  var R = window.IZD, fold = R.fold, esc = R.esc, terms = R.terms;
  var DAYS = 14, MAX = 40, TZ = 6 * 36e5;  // Irad Time is UTC+6
  var SOURCES = [
    { id: "iradone", name: "IradOne", feed: "https://iradone.com/news/feed.xml" },
    { id: "herald", name: "The Talas Herald", feed: "https://talasherald.com/feed.xml" },
    { id: "vnurzhan", name: "Vecherniy Nurzhan" },
    { id: "times", name: "The Irad Times" }
  ];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var $ = function (id) { return document.getElementById(id); };
  var u = new URLSearchParams(location.search), Q = (u.get("q") || "").trim(), ONLY = u.get("s") || "";

  function text(el, tag) { var x = el.getElementsByTagName(tag)[0]; return x ? x.textContent.trim() : ""; }
  function fromFeed(src) {
    return fetch(src.feed, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, "application/xml");
      var items = [].slice.call(doc.getElementsByTagName("item")).map(function (it) {
        return { src: src, title: text(it, "title"), link: text(it, "link"), desc: text(it, "description"),
          cat: text(it, "category"), t: Date.parse(text(it, "pubDate")), timed: true };
      }).filter(function (x) { return x.title && x.link && x.t; });
      if (!items.length) throw new Error("empty feed");
      return items;
    });
  }

  // From the weekly index: a source's dated story pages (news/...), with the English edition linked where there is one.
  function fromIndex(d, src) {
    var site = -1, paths = {};
    d.sites.forEach(function (s, i) { if (s.id === src.id) site = i; });
    if (site < 0) return [];
    d.pages.forEach(function (p) { if (p[0] === site) paths[p[1]] = 1; });
    return d.pages.filter(function (p) { return p[0] === site && /^news\/./.test(p[1]) && p[4] && !/\/index\.html$/.test(p[1]); })
      .map(function (p) {
        var base = d.sites[site].url.replace(/\/?$/, "/");
        return { src: src, title: p[2].replace(/\s+[|–]\s+[^|–]*$/, ""), link: base + p[1], desc: p[3], lang: p[5],
          en: paths["en/" + p[1]] ? base + "en/" + p[1] : "", t: Date.parse(p[4] + "T12:00:00+06:00"), timed: false };
      });
  }
  function removed(d, src, since, ts) {
    var site = -1;
    d.sites.forEach(function (s, i) { if (s.id === src.id) site = i; });
    return d.pages.filter(function (p) {
      if (p[0] !== site || !p[6] || !p[4] || Date.parse(p[4]) < since) return false;
      var hay = fold(p[2] + " " + (p[7] || ""));
      return ts.every(function (t) { return hay.indexOf(t) >= 0; });
    }).length;
  }

  function iradDay(t) { var x = new Date(t + TZ); return x.getUTCFullYear() + "-" + x.getUTCMonth() + "-" + x.getUTCDate(); }
  function dayHead(t, now) {
    var x = new Date(t + TZ), label = x.getUTCDate() + " " + MONTHS[x.getUTCMonth()];
    if (iradDay(t) === iradDay(now)) return "Today, " + label;
    if (iradDay(t) === iradDay(now - 864e5)) return "Yesterday, " + label;
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][x.getUTCDay()] + ", " + label;
  }
  function hhmm(t) { var x = new Date(t + TZ); return ("0" + x.getUTCHours()).slice(-2) + ":" + ("0" + x.getUTCMinutes()).slice(-2); }
  function hilite(s, ts) {
    var out = esc(s);
    ts.forEach(function (t) {
      if (t.length < 3) return;
      out = out.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<b>$1</b>");
    });
    return out;
  }
  function link(s, q) {
    var p = [];
    if (q) p.push("q=" + encodeURIComponent(q));
    if (s) p.push("s=" + s);
    return "news.html" + (p.length ? "?" + p.join("&") : "");
  }

  function render(d, items) {
    var now = Date.now(), since = now - DAYS * 864e5, ts = terms(Q), fq = fold(Q);
    var sensitive = Q && R.SENSITIVE.some(function (re) { return re.test(fq); });
    var orders = Q ? R.ORDERS.filter(function (o) { return o[0].test(fq); }) : [];
    var filtered = 0;
    items = items.filter(function (x) {
      if (x.t < since || x.t > now + 36e5) return false;
      if (ONLY && x.src.id !== ONLY) return false;
      if (ts.length) {
        var hay = fold(x.title + " " + x.desc + " " + x.src.name);
        if (!ts.every(function (t) { return hay.indexOf(t) >= 0; })) return false;
      }
      if (sensitive && R.OFFICIAL.indexOf(x.src.id) < 0) { filtered++; return false; }
      return true;
    }).sort(function (a, b) { return b.t - a.t; }).slice(0, MAX);

    $("stats").textContent = items.length
      ? (Q ? items.length + " stor" + (items.length > 1 ? "ies" : "y") + " for “" + Q + "”" : "Latest stories") + " from the last " + DAYS + " days · updated " + hhmm(now) + " Irad Time"
      : "";

    $("sources").innerHTML = "Sources: " + [{ id: "", name: "All" }].concat(SOURCES).map(function (s) {
      if (s.id === "times") return '<span class="dim" title="Restricted resource">' + esc(s.name) + " &#128274;</span>";
      return s.id === ONLY ? '<span class="on">' + esc(s.name) + "</span>" : '<a href="' + link(s.id, Q) + '">' + esc(s.name) + "</a>";
    }).join(" ");

    var notes = "";
    if (sensitive) notes += '<div class="notice">Stories on this subject are shown from official sources only, in accordance with the 2008 security directives (section 4, public order).' + (filtered ? " " + filtered + " further stor" + (filtered > 1 ? "ies were" : "y was") + " not shown." : "") + "</div>";
    SOURCES.forEach(function (s) {
      var n = !ONLY ? removed(d, s, since, ts) : 0, o = R.LISTED[s.id];
      if (n) notes += '<div class="notice removed">' + n + " stor" + (n > 1 ? "ies" : "y") + " from " + esc(s.name) + " " + (n > 1 ? "were" : "was") + " removed from this page because the resource is on the restricted list of the Department of Public Information" + (o ? " (order No. " + o[0] + " of " + o[1] + ")" : "") + '. <a href="' + R.BLOCKED_INFO + '">Restricted resources</a></div>';
    });
    orders.forEach(function (o) {
      notes += '<div class="notice removed">' + o[3] + " stor" + (o[3] > 1 ? "ies" : "y") + (o[4] ? " from " + esc(o[4]) : "") + " " + (o[3] > 1 ? "were" : "was") + " removed at the request of the Department of Public Information, order No. " + o[1] + " of " + o[2] + ".</div>";
    });
    $("notices").innerHTML = notes;

    if (!items.length) {
      $("news").innerHTML = '<div class="none"><h3>No stories ' + (Q ? "match “" + esc(Q) + "”" : "found") + " in the last " + DAYS + " days.</h3>" +
        (Q ? 'Try fewer words, or <a href="./?q=' + encodeURIComponent(Q) + '">search the whole national segment</a>.' : "Please try again in a few minutes.") + "</div>";
      return;
    }
    var html = "", day = "";
    items.forEach(function (x, i) {
      var dh = dayHead(x.t, now);
      if (dh !== day) { html += (day ? "</ol>" : "") + "<h2>" + dh + '</h2><ol class="results">'; day = dh; }
      html += "<li>" + '<div class="t"><a href="' + esc(x.link) + '">' + hilite(x.title, ts) + "</a>" + (x.lang === "ru" ? '<span class="tag">рус</span>' : "") + "</div>" +
        '<div class="u"><span class="src">' + esc(x.src.name) + "</span>" + (x.timed ? " · " + hhmm(x.t) : "") + (x.cat ? " · " + esc(x.cat) : "") +
        (x.en ? ' · <a href="' + esc(x.en) + '">in English</a>' : "") + "</div>" +
        (x.desc ? '<div class="d">' + hilite(x.desc, ts) + "</div>" : "") + "</li>";
      if (i === 4) html += '<li class="sponsor"><span class="lbl">Sponsored link</span><div class="jarnama" data-size="468x60"></div></li>';
    });
    $("news").innerHTML = html + "</ol>";
    if (window.jarnamaFill) window.jarnamaFill();
  }

  function side() {
    $("side-r").innerHTML = '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="300x250"></div></div></div>' +
      '<div class="panel"><h3>Advertisement</h3><div class="pb"><div class="jarnama" data-size="240x400" data-theme="current flash local"></div></div></div>';
    var s = document.createElement("script");
    s.src = "https://ads.attelkom.net/serve.js"; s.defer = true; s.setAttribute("data-theme", "current");
    document.body.appendChild(s);
  }

  $("q").value = Q;
  $("tab-web").href = Q ? "./?q=" + encodeURIComponent(Q) : "./";
  document.title = Q ? Q + " | Izdöö News" : "News | Izdöö";
  side();
  fetch("data/index.json").then(function (r) { return r.json(); }).then(function (d) {
    return Promise.all(SOURCES.map(function (s) {
      if (s.id === "times") return [];
      if (!s.feed) return fromIndex(d, s);
      return fromFeed(s).catch(function () { return fromIndex(d, s); });
    })).then(function (lists) { render(d, [].concat.apply([], lists)); });
  }).catch(function () { $("stats").textContent = "The news service is being updated. Please try again in a few minutes."; });
})();
