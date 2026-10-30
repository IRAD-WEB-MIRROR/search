/* Izdöö rules shared by the web search (s.js) and the news tab (n.js): what is filtered, what was removed and why,
   and the text folding both use to match a query. */
(function () {
  "use strict";
  var BLOCKED_INFO = "https://attelkom.net/blocked.html";
  var OFFICIAL = ["iradgov", "iradone", "eirad", "elections", "court", "mejlis", "stats", "bankofirad"];
  // Queries on these subjects show official sources only (2008 security directives, section 4).
  var SENSITIVE = [/health/, /retreat/, /deepfake/, /succession/, /erasure/, /jogoluu/, /protest/, /toktarov.*(where|alive)/];
  // Removals at the request of the Department of Public Information: the order is cited with the count withdrawn.
  var LISTED = { times: ["PI-R 0811/2026", "15.10.2026"], freeirad: ["PI-R 0102/2024", "06.02.2024"], "bet-jarysh": ["PI-R 0958/2023", "22.11.2023"] };
  var ORDERS = [
    [/central square|erkin bolot|bolot uulu|detain|water cannon|tear gas|students? march/, "PI-R 0874/2023", "13.10.2023", 2, "the Talas Herald"],
    [/baylanysh|without connection|protest (poem|poet|antholog)/, "PI-R 0391/2024", "15.05.2024", 3, "Arsha Books"],
    [/governor.*(health|absen|seen|appear|ill)|last appearance|where is the governor|губернатор.*(здоров|где|болен)|где губернатор/, "PI-R 0598/2024", "26.07.2024", 1, "Vecherniy Nurzhan"],
    [/satylbayt|not for sale|sale remarks|не продается|продажа ирада/, "PI-R 0133/2025", "21.02.2025", 1, "Vecherniy Nurzhan"],
    [/tulparcoin|tlpr|тулпаркоин/, "PI-R 0779/2026", "08.10.2026", 4, ""]
  ];

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

  window.IZD = { BLOCKED_INFO: BLOCKED_INFO, OFFICIAL: OFFICIAL, SENSITIVE: SENSITIVE, LISTED: LISTED, ORDERS: ORDERS, fold: fold, esc: esc, terms: terms };
})();
