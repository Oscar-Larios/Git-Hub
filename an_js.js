// ═══════════════════════════════════════════════════════
// ANÁLISIS DE RATIOS
// ═══════════════════════════════════════════════════════

var anTipo   = "competitividad";
var anDesc   = "sin";
var anGrupos = ["Estado"];
var anTags   = { estado:[], municipio:[], cp:[], tipo:[], marca:[], modelo:[] };

var AN_CAMPO = {
  "Estado":"Estado", "Municipio":"Municipio", "CP":"CP",
  "Tipo":"Tipo", "Marca":"Marca", "Marca_Submarca":"Marca_Submarca", "Modelo":"Modelo"
};

var AN_COLORS = {
  "prima_allianz":       "#003A8F",
  "prima_allianz_desc":  "#5B8FD6",
  "prima_chubb":         "#000000",
  "prima_chubb_desc":    "#666666",
  "prima_gnp":           "#F58220",
  "prima_gnp_desc":      "#FBBB80",
  "prima_hdi":           "#0B6310",
  "prima_hdi_desc":      "#5BBF63",
  "prima_qualitas":      "#3908AB",
  "prima_qualitas_desc": "#9B7FE8",
};


var anGrafTipo    = "barras";  // "barras" | "lineas"
var anGrafMetrica = "prima";   // "prima"  | "cuota"
var anMapMetrica  = "prima";   // "prima"  | "ratio" | "cuota"
var _anLeafletMap = null;
var anMapLevel    = "estado"; // "estado" | "municipio" | "cp"
var anMapCpMode   = "puntos";  // "puntos"  | "poligonos"  (solo para CP)
var anMapPalette  = "azul";   // solo para prima/cuota

var anMapContornos      = { estado: false, municipio: false, cp: false };
var anMapContornoScope  = "muestra"; // "muestra" | "todos"
var _anMapContourLayers = {};        // { estado: layer, municipio: layer, cp: layer }
var _anMapContourUpdate = null;      // función capturada en anRenderMapa

var anMapCompany   = "allianz"; // "allianz"|"chubb"|"gnp"|"hdi"|"qualitas"|"todas"
var anMapTodasMode = "min";     // "min" | "max"

// Paletas por compañía (claro → oscuro usando colores de marca)
var AN_COMPANY_PALETTES = {
  "allianz":  ["#DBEAFE","#BFDBFE","#93C5FD","#3B82F6","#1D4ED8","#003A8F"],
  "chubb":    ["#F3F4F6","#E5E7EB","#9CA3AF","#6B7280","#374151","#111827"],
  "gnp":      ["#FFF7ED","#FED7AA","#FCA05A","#F58220","#EA580C","#9A3412"],
  "hdi":      ["#F0FDF4","#BBF7D0","#86EFAC","#22C55E","#16A34A","#0B6310"],
  "qualitas": ["#F5F3FF","#DDD6FE","#A78BFA","#7C3AED","#5B21B6","#3B0764"],
};

// Etiquetas cortas por compañía
var AN_COMPANY_LABELS_SHORT = {
  "allianz": "Allianz", "chubb": "CHUBB", "gnp": "GNP",
  "hdi": "HDI", "qualitas": "Qualitas",
};

var AN_MAP_PALETTES = {
  "azul":    ["#EFF6FF","#BFDBFE","#93C5FD","#3B82F6","#2563EB","#1D4ED8","#1E3A8A"],
  "rojo":    ["#FFF5F5","#FED7D7","#FCA5A5","#F87171","#EF4444","#DC2626","#7F1D1D"],
  "verde":   ["#F0FDF4","#BBF7D0","#86EFAC","#4ADE80","#22C55E","#16A34A","#14532D"],
  "naranja": ["#FFF7ED","#FED7AA","#FB923C","#F97316","#EA580C","#C2410C","#7C2D12"],
  "morado":  ["#F5F3FF","#DDD6FE","#C4B5FD","#A78BFA","#7C3AED","#5B21B6","#3B0764"],
  "calido":  ["#FFFBEB","#FDE68A","#FCD34D","#F59E0B","#D97706","#B45309","#78350F"],
};

function anInit() {
  var checkMap = [
    ["an-chk-estado",    "estado",    AN_FILTROS.estados],
    ["an-chk-municipio", "municipio", AN_FILTROS.municipios],
    ["an-chk-cp",        "cp",        AN_FILTROS.cps],
    ["an-chk-tipo",      "tipo",      AN_FILTROS.tipos],
    ["an-chk-marca",     "marca",     AN_FILTROS.marcas],
    ["an-chk-modelo",    "modelo",    AN_FILTROS.modelos]
  ];
  checkMap.forEach(function(triple) {
    var containerId = triple[0];
    var key         = triple[1];
    var values      = triple[2];
    var cont = document.getElementById(containerId);
    if (!cont || cont.children.length > 0) return;
    values.forEach(function(v) {
      var label = document.createElement("label");
      label.className = "an-chk-item";
      var cb = document.createElement("input");
      cb.type  = "checkbox";
      cb.value = v;
      var esExcluida = key === "marca" &&
                       AN_FILTROS.excluir_default &&
                       AN_FILTROS.excluir_default.indexOf(v) >= 0;
      cb.checked = !esExcluida;
      if (esExcluida && anTags[key].indexOf(v) < 0) {
        anTags[key].push(v);
      }
      cb.addEventListener("change", (function(k, val, checkbox) {
        return function() {
          if (checkbox.checked) {
            anTags[k] = anTags[k].filter(function(x){ return x !== val; });
          } else {
            if (anTags[k].indexOf(val) < 0) anTags[k].push(val);
          }
          anRender();
        };
      })(key, v, cb));
      label.appendChild(cb);
      var span = document.createElement("span");
      span.textContent = v;
      label.appendChild(span);
      cont.appendChild(label);
    });
  });

  var grupo_cont = document.getElementById("an-grupo-btns");
  if (grupo_cont && grupo_cont.children.length === 0) {
    AN_FILTROS.grupos_disponibles.forEach(function(g, i) {
      var b = document.createElement("div");
      b.className   = "cob-tab" + (g === "Estado" ? " active" : "");
      b.textContent = AN_FILTROS.grupos_labels[i];
      b.dataset.grupo = g;
      b.onclick = function() { anToggleGrupo(g, b); };
      grupo_cont.appendChild(b);
    });
    anRenderGrupoChips();
  }
}

// Descripción flotante bajo el header de cada tipo
function anDescCard(html) {
  var d = document.createElement("div");
  d.style.cssText =
    "background:#eff6ff;border-left:4px solid #2563EB;padding:9px 14px;" +
    "border-radius:0 6px 6px 0;font-size:12px;color:#1e3a8a;line-height:1.7;" +
    "margin-bottom:14px;";
  d.innerHTML = html;
  return d;
}

function anToggleGrupo(g, btn) {
  if (anGrupos.indexOf(g) >= 0) {
    if (anGrupos.length > 1) {
      anGrupos = anGrupos.filter(function(x){ return x !== g; });
      btn.classList.remove("active");
    }
  } else {
    anGrupos.push(g);
    btn.classList.add("active");
  }
  anRenderGrupoChips();
  anRender();
}

function anRenderGrupoChips() {
  var cont  = document.getElementById("an-grupo-chips");
  var order = document.getElementById("an-grupo-order");
  if (!cont) return;
  cont.innerHTML = "";
  // En pestaña mapa, ocultar grupos geográficos de los chips
  var GEO = ["Estado", "Municipio", "CP"];
  var display = (anTipo === "mapa")
    ? anGrupos.filter(function(g){ return GEO.indexOf(g) < 0; })
    : anGrupos;
  display.forEach(function(g, i) {
    var idx  = AN_FILTROS.grupos_disponibles.indexOf(g);
    var lbl  = AN_FILTROS.grupos_labels[idx];
    var chip = document.createElement("span");
    chip.className = "group-chip";
    chip.textContent = (i + 1) + ". " + lbl + " ";
    var rm = document.createElement("span");
    rm.className   = "rm";
    rm.textContent = "\u00d7";
    rm.onclick     = (function(gg) { return function() { anRemoveGrupo(gg); }; })(g);
    chip.appendChild(rm);
    cont.appendChild(chip);
  });
  if (order) {
    order.textContent = display.length > 1
      ? "Orden: " + display.map(function(g, i) {
          var idx = AN_FILTROS.grupos_disponibles.indexOf(g);
          return (i + 1) + ". " + AN_FILTROS.grupos_labels[idx];
        }).join(" \u2192 ")
      : "";
  }
}

function anRemoveGrupo(g) {
  if (anGrupos.length <= 1) return;
  anGrupos = anGrupos.filter(function(x) { return x !== g; });
  document.querySelectorAll("#an-grupo-btns .cob-tab").forEach(function(b) {
    if (b.dataset.grupo === g) b.classList.remove("active");
  });
  anRenderGrupoChips();
  anRender();
}

function anAddTag(key, sel) {
  var val = sel.value;
  if (!val) return;
  if (anTags[key].indexOf(val) < 0) {
    anTags[key].push(val);
    anRenderTags(key);
    anRender();
  }
  sel.value = "";
}

function anRemoveTag(key, val) {
  anTags[key] = anTags[key].filter(function(v) { return v !== val; });
  anRenderTags(key);
  anRender();
}

function anRenderTags(key) {
  var cont = document.getElementById("an-tags-" + key);
  if (!cont) return;
  cont.innerHTML = "";
  anTags[key].forEach(function(val) {
    var t  = document.createElement("span");
    t.className   = "filter-tag";
    t.textContent = val + " ";
    var rm = document.createElement("span");
    rm.className   = "rm";
    rm.textContent = "\u00d7";
    rm.onclick     = (function(k, v) { return function() { anRemoveTag(k, v); }; })(key, val);
    t.appendChild(rm);
    cont.appendChild(t);
  });
}

function anSetTipo(t) {
  anTipo = t; anSortCol = -1; anSortAsc = true;
  if (t !== "mapa" && _anLeafletMap) {
    _anLeafletMap.remove(); _anLeafletMap = null;
    _anMapContourUpdate = null; _anMapContourLayers = {};
  }
  document.querySelectorAll("#an-tipo .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active",
      (i === 0 && t === "competitividad") ||
      (i === 1 && t === "cuota") ||
      (i === 2 && t === "boxplot") ||
      (i === 3 && t === "graficas") ||
      (i === 4 && t === "vehiculos") ||
      (i === 5 && t === "mapa"));
  });
  anRender();
  // Deshabilitar/habilitar tabs geográficos en "Agrupar por" cuando mapa activo
  var GEO = ["Estado", "Municipio", "CP"];
  document.querySelectorAll("#an-grupo-btns .cob-tab").forEach(function(b) {
    if (GEO.indexOf(b.dataset.grupo) >= 0) {
      b.style.opacity       = (t === "mapa") ? "0.35" : "";
      b.style.pointerEvents = (t === "mapa") ? "none"  : "";
      b.title               = (t === "mapa") ? "Nivel controlado por los botones del mapa" : "";
      if (t === "mapa") {
        b.classList.remove("active");  // quitar apariencia activa visualmente
      } else {
        // restaurar active según anGrupos actual
        b.classList.toggle("active", anGrupos.indexOf(b.dataset.grupo) >= 0);
      }
    }
  });
}

function anSetDesc(d) {
  anDesc = d; anSortCol = -1; anSortAsc = true;
  document.querySelectorAll("#an-desc .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active", (i === 0 && d === "sin") || (i === 1 && d === "con"));
  });
  anRender();
}


function anSetGrafTipo(t) {
  anGrafTipo = t;
  document.querySelectorAll("#an-graf-tipo .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active", (i===0 && t==="barras") || (i===1 && t==="lineas"));
  });
  anRender();
}

function anSetGrafMetrica(m) {
  anGrafMetrica = m;
  document.querySelectorAll("#an-graf-metrica .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active", (i===0 && m==="prima") || (i===1 && m==="cuota"));
  });
  anRender();
}

function anSelAll(containerId, key, checked) {
  var cont = document.getElementById(containerId);
  if (!cont) return;
  var boxes = cont.querySelectorAll("input[type=checkbox]");
  anTags[key] = [];
  boxes.forEach(function(cb) {
    cb.checked = checked;
    if (!checked) anTags[key].push(cb.value);
  });
  anRender();
}

function anFiltrar() {
  return AN_ROWS.filter(function(r) {
    if (anTags.estado.length    && anTags.estado.indexOf(r.Estado) >= 0)          return false;
    if (anTags.municipio.length && anTags.municipio.indexOf(r.Municipio) >= 0)    return false;
    if (anTags.cp.length        && anTags.cp.indexOf(r.CP) >= 0)                  return false;
    if (anTags.tipo.length      && anTags.tipo.indexOf(r.Tipo) >= 0)              return false;
    if (anTags.marca.length     && anTags.marca.indexOf(r.Marca_Submarca) >= 0)   return false;
    if (anTags.modelo.length    && anTags.modelo.indexOf(String(r.Modelo)) >= 0)  return false;
    return true;
  });
}

function anGetKey(r) {
  return anGrupos.map(function(g) { return r[AN_CAMPO[g]] || "\u2014"; }).join(" \u203a ");
}

function anAgrupar(rows) {
  var map = {};
  rows.forEach(function(r) {
    var k = anGetKey(r);
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

function anProm(arr, col) {
  var v = arr.map(function(r) { return r[col]; })
             .filter(function(v) { return v != null && !isNaN(v) && v > 0; });
  return v.length ? v.reduce(function(a, b) { return a + b; }, 0) / v.length : NaN;
}

function ratioChip(v) {
  if (isNaN(v)) return "<span class=\"chip\">\u2014</span>";
  var cls = v < 0.98 ? "c-green" : v <= 1.02 ? "c-yellow" : "c-red";
  return "<span class=\"chip " + cls + "\">" + v.toFixed(2) + "</span>";
}

function cuotaChip(v, min, max) {
  if (isNaN(v)) return "<span class=\"chip\">\u2014</span>";
  var t   = max === min ? 0.5 : (v - min) / (max - min);
  var cls = t < 0.33 ? "c-green" : t < 0.66 ? "c-yellow" : "c-red";
  return "<span class=\"chip " + cls + "\">" + v.toFixed(3) + "%</span>";
}

function anRender() {
  var out = document.getElementById("an-output");
  if (!out) return;

  var rows   = anFiltrar();
  var groups = anAgrupar(rows);
  var gkeys  = Object.keys(groups);

  var nreg = document.getElementById("an-nreg");
  var ngru = document.getElementById("an-ngru");
  if (nreg) nreg.textContent = rows.length.toLocaleString("es-MX");
  if (ngru) ngru.textContent = gkeys.length;

  if (gkeys.length === 0) {
    out.innerHTML = "<div class=\"an-empty\">Sin datos con los filtros seleccionados</div>";
    var rmed  = document.getElementById("an-rmed");
    var rcaro = document.getElementById("an-rcaro");
    if (rmed)  rmed.textContent  = "\u2014";
    if (rcaro) rcaro.textContent = "\u2014";
    return;
  }

  if      (anTipo === "competitividad") anRenderComp(rows, groups, gkeys);
  else if (anTipo === "cuota")          anRenderCuota(rows, groups, gkeys);
  else if (anTipo === "boxplot")        anRenderBoxplot(rows, groups, gkeys);
  else if (anTipo === "graficas")       anRenderGraficas(rows, groups, gkeys);
  else if (anTipo === "vehiculos")      anRenderVehiculos(rows);
  else if (anTipo === "mapa")           anRenderMapa(rows);
}

var anSortCol = -1;
var anSortAsc = true;

function anSortBy(col) {
  if (anSortCol === col) { anSortAsc = !anSortAsc; }
  else { anSortCol = col; anSortAsc = true; }
  anRender();
}

function sortIcon(col) {
  if (anSortCol !== col) return " <span style='color:#ccc;font-size:10px'>&#9650;&#9660;</span>";
  return anSortAsc
    ? " <span style='color:#2563EB;font-size:10px'>&#9650;</span>"
    : " <span style='color:#2563EB;font-size:10px'>&#9660;</span>";
}

// ═══════════════════════════════════════════════════════
// COMPETITIVIDAD
// ═══════════════════════════════════════════════════════
function anRenderComp(rows, groups, gkeys) {
  var colsMkt = anDesc === "sin" ? AN_FILTROS.cols_mkt_sd : AN_FILTROS.cols_mkt_cd;
  var refCol  = anDesc === "sin" ? "prima_allianz"        : "prima_allianz_desc";

  var data = gkeys.map(function(k) {
    var g    = groups[k];
    var ref  = anProm(g, refCol);
    var mkts = colsMkt.map(function(c) { return anProm(g, c); });
    var valid = mkts.filter(function(v) { return !isNaN(v); });
    var minVal = valid.length ? Math.min.apply(null, valid) : NaN;
    var minIdx = -1, minSoFar = Infinity;
    mkts.forEach(function(v, i) { if (!isNaN(v) && v < minSoFar) { minSoFar = v; minIdx = i; } });
    var ratio = (!isNaN(ref) && !isNaN(minVal) && minVal > 0) ? ref / minVal : NaN;
    return { k: k, n: g.length, ref: ref, minVal: minVal,
             minAseg: (minIdx >= 0) ? AN_LABELS[colsMkt[minIdx]] : "\u2014",
             ratio: ratio, posNum: NaN };
  });

  var _allColsForPos    = anDesc === "sin" ? AN_FILTROS.cols_sd : AN_FILTROS.cols_cd;
  var _allianzColForPos = anDesc === "sin" ? "prima_allianz" : "prima_allianz_desc";
  data.forEach(function(d) {
    var g = groups[d.k];
    var allianzProm = anProm(g, _allianzColForPos);
    if (!isNaN(allianzProm)) {
      var menores = _allColsForPos.filter(function(c) { return c !== _allianzColForPos; })
        .filter(function(c) {
          var v = anProm(g, c);
          return !isNaN(v) && v < allianzProm - 1e-8;
        }).length;
      d.posNum = menores + 1;
    } else {
      d.posNum = NaN;
    }
  });

  if (anSortCol >= 0) {
    data.sort(function(a, b) {
      var va, vb;
      if      (anSortCol === 0) { va = a.k;      vb = b.k; }
      else if (anSortCol === 1) { va = a.n;       vb = b.n; }
      else if (anSortCol === 2) { va = a.ref;     vb = b.ref; }
      else if (anSortCol === 3) { va = a.minVal;  vb = b.minVal; }
      else if (anSortCol === 4) { va = a.minAseg; vb = b.minAseg; }
      else if (anSortCol === 5) { va = a.ratio;   vb = b.ratio; }
      else if (anSortCol === 6) { va = a.posNum;  vb = b.posNum; }
      var naA = (va == null || (typeof va === "number" && isNaN(va)));
      var naB = (vb == null || (typeof vb === "number" && isNaN(vb)));
      if (naA && naB) return 0; if (naA) return 1; if (naB) return -1;
      var cmp = (typeof va === "string") ? va.localeCompare(vb) : va - vb;
      return anSortAsc ? cmp : -cmp;
    });
  } else {
    data.sort(function(a, b) {
      var na = isNaN(a.ratio), nb = isNaN(b.ratio);
      if (na && nb) return 0; if (na) return 1; if (nb) return -1;
      return b.ratio - a.ratio;
    });
  }

  var ratios  = data.map(function(d) { return d.ratio; }).filter(function(v) { return !isNaN(v); })
                    .sort(function(a, b) { return a - b; });
  var median  = ratios.length ? ratios[Math.floor(ratios.length / 2)] : NaN;
  var pctCaro = ratios.length
    ? ratios.filter(function(v) { return v > 1.02; }).length / ratios.length * 100 : NaN;

  var rmed  = document.getElementById("an-rmed");
  var rcaro = document.getElementById("an-rcaro");
  if (rmed)  rmed.textContent  = isNaN(median)  ? "\u2014" : median.toFixed(2);
  if (rcaro) rcaro.textContent = isNaN(pctCaro) ? "\u2014" : pctCaro.toFixed(0) + "%";

  var grpLabel  = anGrupos.map(function(g) {
    return AN_FILTROS.grupos_labels[AN_FILTROS.grupos_disponibles.indexOf(g)];
  }).join(" \u203a ");
  var descLabel = anDesc === "sin" ? "Sin descuento" : "Con descuento";

  var th = function(idx, txt, leftCls) {
    var cls = leftCls ? " class=\"left\"" : "";
    return "<th" + cls + " style='cursor:pointer;user-select:none' onclick='anSortBy(" + idx + ")'>"
           + txt + sortIcon(idx) + "</th>";
  };

  var anOut2 = document.getElementById("an-output");
  anOut2.innerHTML = "";
  anOut2.appendChild(anDescCard(
    "<strong>Ratio = Allianz / compa&ntilde;&iacute;a m&aacute;s barata</strong> — " +
    "Valor 1.00: Allianz es la m&aacute;s barata. Valor 1.10: Allianz es 10&nbsp;% m&aacute;s cara. " +
    "La columna <em>Pos. Allianz</em> indica su posici&oacute;n en el ranking (1 = m&aacute;s barata, 5 = m&aacute;s cara). Verde: competitivo. Rojo: sobreprecio significativo."
  ));
  var html = "<div class=\"an-card\">" +
    "<div class=\"an-card-header\">Competitividad \u2014 " + descLabel +
    " &nbsp;\u00b7&nbsp; Ratio = Allianz / m\u00e1s barata</div>" +
    "<div class=\"an-card-body\"><table class=\"an-table\"><thead><tr>" +
    th(0, grpLabel, true) + th(1,"N",false) + th(2,"Allianz $",false) +
    th(3,"M\u00e1s barata $",false) + th(4,"Aseg.",false) + th(5,"Ratio",false) +
    th(6,"Pos. Allianz",false) +
    "</tr></thead><tbody>";

  var allColsComp    = anDesc === "sin" ? AN_FILTROS.cols_sd : AN_FILTROS.cols_cd;
  var allianzColComp = anDesc === "sin" ? "prima_allianz" : "prima_allianz_desc";
  var posTotal = allColsComp.length;

  data.forEach(function(d) {
    var g = groups[d.k];
    var allianzProm = anProm(g, allianzColComp);
    var posNum = NaN;
    if (!isNaN(allianzProm)) {
      var menores = allColsComp.filter(function(c) { return c !== allianzColComp; })
        .filter(function(c) {
          var v = anProm(g, c);
          return !isNaN(v) && v < allianzProm - 1e-8;
        }).length;
      posNum = menores + 1;
    }
    d.posNum = posNum;
    var posStr = isNaN(posNum) ? "\u2014" : posNum + " / " + posTotal;
    var posCls = isNaN(posNum) ? "" : posNum === 1 ? "c-green" : posNum === posTotal ? "c-red" : "c-yellow";

    html += "<tr>" +
      "<td class=\"left\">" + d.k + "</td>" +
      "<td>" + d.n + "</td>" +
      "<td>" + (isNaN(d.ref)    ? "\u2014" : "$" + Math.round(d.ref).toLocaleString("es-MX"))    + "</td>" +
      "<td>" + (isNaN(d.minVal) ? "\u2014" : "$" + Math.round(d.minVal).toLocaleString("es-MX")) + "</td>" +
      "<td>" + d.minAseg + "</td>" +
      "<td>" + ratioChip(d.ratio) + "</td>" +
      "<td><span class=\"chip " + posCls + "\">" + posStr + "</span></td>" +
      "</tr>";
  });
  html += "</tbody></table></div></div>";
  anOut2.innerHTML += html;
}

// ═══════════════════════════════════════════════════════
// CUOTA
// ═══════════════════════════════════════════════════════
function anRenderCuota(rows, groups, gkeys) {
  var cols   = anDesc === "sin" ? AN_FILTROS.cols_sd : AN_FILTROS.cols_cd;
  var labels = cols.map(function(c) { return AN_LABELS[c] || c; });

  var data = gkeys.map(function(k) {
    var g = groups[k];
    var cuotas = cols.map(function(c) {
      var v = g.map(function(r) {
        var prima = Number(r[c]);
        var va    = Number(r["Valor Asegurado"]);
        return (!isNaN(prima) && r[c] != null && prima > 0 && !isNaN(va) && va > 0)
          ? prima / va * 100 : null;
      }).filter(function(v) { return v !== null; });
      return v.length ? v.reduce(function(a, b) { return a + b; }, 0) / v.length : NaN;
    });
    var allianzColTmp = anDesc === "sin" ? "prima_allianz" : "prima_allianz_desc";
    var allianzIdxTmp = cols.indexOf(allianzColTmp);
    var posNumTmp = NaN;
    if (allianzIdxTmp >= 0 && !isNaN(cuotas[allianzIdxTmp])) {
      var ranked2 = cuotas.filter(function(v){ return !isNaN(v); })
                          .slice().sort(function(a,b){ return a-b; });
      posNumTmp = ranked2.indexOf(cuotas[allianzIdxTmp]) + 1;
    }
    return { k: k, n: g.length, cuotas: cuotas, posNum: posNumTmp };
  });

  if (anSortCol >= 0) {
    data.sort(function(a, b) {
      var va, vb;
      if      (anSortCol === 0) { va = a.k; vb = b.k; }
      else if (anSortCol === 1) { va = a.n; vb = b.n; }
      else if (anSortCol < cols.length + 2) { var ci = anSortCol - 2; va = a.cuotas[ci]; vb = b.cuotas[ci]; }
      else { va = a.posNum; vb = b.posNum; }
      var naA = (va == null || (typeof va === "number" && isNaN(va)));
      var naB = (vb == null || (typeof vb === "number" && isNaN(vb)));
      if (naA && naB) return 0; if (naA) return 1; if (naB) return -1;
      var cmp = (typeof va === "string") ? va.localeCompare(vb) : va - vb;
      return anSortAsc ? cmp : -cmp;
    });
  }

  var all = data.reduce(function(acc, d) {
    return acc.concat(d.cuotas.filter(function(v) { return !isNaN(v); }));
  }, []).sort(function(a, b) { return a - b; });
  var median = all.length ? all[Math.floor(all.length / 2)] : NaN;

  var rmed  = document.getElementById("an-rmed");
  var rcaro = document.getElementById("an-rcaro");
  if (rmed)  rmed.textContent  = isNaN(median) ? "\u2014" : median.toFixed(3) + "%";
  if (rcaro) rcaro.textContent = "\u2014";

  var grpLabel  = anGrupos.map(function(g) {
    return AN_FILTROS.grupos_labels[AN_FILTROS.grupos_disponibles.indexOf(g)];
  }).join(" \u203a ");
  var descLabel = anDesc === "sin" ? "Sin descuento" : "Con descuento";

  var th = function(idx, txt, leftCls) {
    var cls = leftCls ? " class=\"left\"" : "";
    return "<th" + cls + " style='cursor:pointer;user-select:none' onclick='anSortBy(" + idx + ")'>"
           + txt + sortIcon(idx) + "</th>";
  };

  var anOut3 = document.getElementById("an-output");
  anOut3.innerHTML = "";
  anOut3.appendChild(anDescCard(
    "<strong>Cuota = Prima / Valor Asegurado &times; 100</strong> — Normaliza por el valor del veh&iacute;culo, " +
    "permitiendo comparar entre segmentos de precio distinto. Una cuota menor no significa necesariamente " +
    "prima m&aacute;s baja; refleja la eficiencia relativa. &Uacute;til para detectar si alguna aseguradora " +
    "tiene un modelo de precios m&aacute;s proporcional al valor del bien asegurado."
  ));
  var html = "<div class=\"an-card\">" +
    "<div class=\"an-card-header\">Cuota (Prima/VA %) \u2014 " + descLabel + "</div>" +
    "<div class=\"an-card-body\"><table class=\"an-table\"><thead><tr>" +
    th(0, grpLabel, true) + th(1, "N", false);
  labels.forEach(function(l, i) { html += th(i + 2, l, false); });
  html += "</tr></thead><tbody>";

  data.forEach(function(d) {
    html += "<tr><td class=\"left\">" + d.k + "</td><td>" + d.n + "</td>";
    var rowVals = d.cuotas.filter(function(v) { return !isNaN(v); });
    var rowMin  = rowVals.length ? Math.min.apply(null, rowVals) : NaN;
    var rowMax  = rowVals.length ? Math.max.apply(null, rowVals) : NaN;
    d.cuotas.forEach(function(v) {
      html += "<td>" + cuotaChip(v, rowMin, rowMax) + "</td>";
    });
    html += "</tr>";
  });
  html += "</tbody></table></div></div>";
  anOut3.innerHTML += html;
}

// ═══════════════════════════════════════════════════════
// GRÁFICAS DE BARRAS / LÍNEAS
// ═══════════════════════════════════════════════════════
function anRenderGraficas(rows, groups, gkeys) {
  var cols      = anDesc === "sin" ? AN_FILTROS.cols_sd : AN_FILTROS.cols_cd;
  var refCol    = anDesc === "sin" ? "prima_allianz"    : "prima_allianz_desc";
  var descLabel = anDesc === "sin" ? "Sin descuento"    : "Con descuento";
  var grpLabel  = anGrupos.map(function(g) {
    return AN_FILTROS.grupos_labels[AN_FILTROS.grupos_disponibles.indexOf(g)];
  }).join(" \u203a ");

  // ── Calcular valores según métrica ─────────────────────────────────────────
  var data = gkeys.map(function(k) {
    var g = groups[k];
    var vals = {};
    if (anGrafMetrica === "prima") {
      cols.forEach(function(c) { vals[c] = anProm(g, c); });
    } else {
      // Cuota: prima / valor asegurado * 100
      cols.forEach(function(c) {
        var v = g.map(function(r) {
          var prima = Number(r[c]);
          var va    = Number(r["Valor Asegurado"]);
          return (!isNaN(prima) && prima > 0 && !isNaN(va) && va > 0)
            ? prima / va * 100 : null;
        }).filter(function(x){ return x !== null; });
        vals[c] = v.length ? v.reduce(function(a,b){return a+b;},0)/v.length : NaN;
      });
    }
    return { k: k, n: g.length, vals: vals };
  });

  // Ordenar por columna de referencia descendente
  data.sort(function(a, b) {
    var va = a.vals[refCol], vb = b.vals[refCol];
    var naA = isNaN(va), naB = isNaN(vb);
    if (naA && naB) return 0; if (naA) return 1; if (naB) return -1;
    return vb - va;
  });

  window._anGrafData = data;
  window._anGrafCols = cols;

  var n_groups = data.length;
  var n_cols   = cols.length;

  // ── Dimensiones SVG ────────────────────────────────────────────────────────
  var anMain = document.querySelector(".an-main");
  var baseW  = anMain ? (anMain.clientWidth - 48) : 900;
  var W      = Math.max(baseW, n_groups * n_cols * 20 + 200);
  var H      = 440;
  var PAD    = { top: 50, right: 24, bottom: 60, left: 88 };
  var plotW  = W - PAD.left - PAD.right;
  var plotH  = H - PAD.top  - PAD.bottom;

  // Escala Y
  var allVals = [];
  data.forEach(function(d) {
    cols.forEach(function(c) { if (!isNaN(d.vals[c])) allVals.push(d.vals[c]); });
  });
  var yMax   = allVals.length ? Math.max.apply(null, allVals) * 1.15 : 1;
  var yScale = function(v) { return PAD.top + plotH - (v / yMax) * plotH; };

  // Formato según métrica
  var fmtVal = anGrafMetrica === "prima"
    ? function(v) { return isNaN(v) ? "\u2014" : "$" + Math.round(v).toLocaleString("es-MX"); }
    : function(v) { return isNaN(v) ? "\u2014" : v.toFixed(3) + "%"; };
  var fmtAxis = anGrafMetrica === "prima"
    ? function(v) { return "$" + Math.round(v).toLocaleString("es-MX"); }
    : function(v) { return v.toFixed(2) + "%"; };

  // Layout
  var groupW = plotW / n_groups;
  var barPad = groupW * 0.10;
  var barsW  = groupW - barPad * 2;
  var barW   = barsW / n_cols;

  var labelFontSize = Math.max(7, Math.min(13, groupW / 7));
  var charsPerLabel = Math.max(3, Math.floor(groupW / (labelFontSize * 0.60)));

  // Y más alto por grupo (para posicionar tooltip)
  var groupTops = data.map(function(d) {
    var minY = PAD.top + plotH;
    cols.forEach(function(c) {
      var val = d.vals[c];
      if (!isNaN(val) && val > 0) {
        var y = yScale(val);
        if (y < minY) minY = y;
      }
    });
    return minY;
  });
  window._anGrafTops = groupTops;

  // ── Construir SVG ──────────────────────────────────────────────────────────
  var svg = "";

  // Leyenda
  var legItemW = 125;
  var legTotal = cols.length * legItemW;
  var legStart = PAD.left + Math.max(0, (plotW - legTotal) / 2);
  cols.forEach(function(c, i) {
    var col   = AN_COLORS[c] || "#888";
    var label = AN_LABELS[c] || c;
    var x     = legStart + i * legItemW;
    if (anGrafTipo === "lineas") {
      // Línea + dot para leyenda de líneas
      svg += "<line x1='" + x + "' y1='21' x2='" + (x+18) + "' y2='21' stroke='" + col +
             "' stroke-width='2'/>";
      svg += "<circle cx='" + (x+9) + "' cy='21' r='3' fill='" + col + "'/>";
    } else {
      svg += "<rect x='" + x + "' y='16' width='12' height='10' fill='" + col + "' rx='2'/>";
    }
    svg += "<text x='" + (x+22) + "' y='25' font-size='10' fill='#444'>" + label + "</text>";
  });

  // Grid Y
  for (var ti = 0; ti <= 5; ti++) {
    var yv = yMax * ti / 5;
    var yp = yScale(yv);
    svg += "<line x1='" + PAD.left + "' y1='" + yp +
           "' x2='" + (PAD.left + plotW) + "' y2='" + yp +
           "' stroke='#eee' stroke-width='1'/>";
    svg += "<text x='" + (PAD.left - 6) + "' y='" + (yp + 4) +
           "' text-anchor='end' font-size='9' fill='#888'>" + fmtAxis(yv) + "</text>";
  }

  // Ejes
  svg += "<line x1='" + PAD.left + "' y1='" + PAD.top +
         "' x2='" + PAD.left + "' y2='" + (PAD.top + plotH) +
         "' stroke='#bbb' stroke-width='1'/>";
  svg += "<line x1='" + PAD.left + "' y1='" + (PAD.top + plotH) +
         "' x2='" + (PAD.left + plotW) + "' y2='" + (PAD.top + plotH) +
         "' stroke='#bbb' stroke-width='1'/>";

  // Highlights (bajo todo lo demás)
  data.forEach(function(d, gi) {
    var xGroup = PAD.left + gi * groupW;
    svg += "<rect id='an-hl-" + gi + "'" +
           " x='" + (xGroup + 1) + "' y='" + PAD.top +
           "' width='" + (groupW - 2) + "' height='" + plotH +
           "' fill='#2563EB' fill-opacity='0' rx='2' pointer-events='none'/>";
  });

  if (anGrafTipo === "barras") {
    // ── BARRAS ──────────────────────────────────────────────────────────────
    data.forEach(function(d, gi) {
      var xGroup = PAD.left + gi * groupW;
      if (gi > 0) {
        svg += "<line x1='" + xGroup + "' y1='" + PAD.top +
               "' x2='" + xGroup + "' y2='" + (PAD.top + plotH) +
               "' stroke='#f0f0f0' stroke-width='1'/>";
      }
      cols.forEach(function(c, ci) {
        var val = d.vals[c];
        if (isNaN(val) || val <= 0) return;
        var x   = xGroup + barPad + ci * barW;
        var y   = yScale(val);
        var bh  = PAD.top + plotH - y;
        var col = AN_COLORS[c] || "#888";
        svg += "<rect x='" + x + "' y='" + y +
               "' width='" + (barW * 0.82) + "' height='" + bh +
               "' fill='" + col + "' fill-opacity='0.85' rx='2' pointer-events='none'/>";
      });
    });

  } else {
    // ── LÍNEAS ───────────────────────────────────────────────────────────────
    // Separadores de grupo (guías verticales)
    data.forEach(function(d, gi) {
      if (gi > 0) {
        var xGroup = PAD.left + gi * groupW;
        svg += "<line x1='" + xGroup + "' y1='" + PAD.top +
               "' x2='" + xGroup + "' y2='" + (PAD.top + plotH) +
               "' stroke='#f0f0f0' stroke-width='1'/>";
      }
    });

    // Una polyline + dots por compañía
    cols.forEach(function(c, ci) {
      var col    = AN_COLORS[c] || "#888";
      var points = [];
      var dots   = [];
      data.forEach(function(d, gi) {
        var val = d.vals[c];
        if (isNaN(val) || val <= 0) return;
        var xc = PAD.left + gi * groupW + groupW / 2;
        var yp = yScale(val);
        points.push(xc + "," + yp);
        dots.push({ x: xc, y: yp, val: val });
      });
      if (points.length > 1) {
        svg += "<polyline points='" + points.join(" ") + "' fill='none' stroke='" + col +
               "' stroke-width='2.2' stroke-opacity='0.85' pointer-events='none'/>";
      }
      // Área rellena debajo de la línea (muy transparente)
      if (points.length > 1) {
        var fillPts = points.join(" ");
        var lastX   = dots[dots.length-1].x;
        var firstX  = dots[0].x;
        var base    = PAD.top + plotH;
        svg += "<polygon points='" + fillPts + " " + lastX + "," + base +
               " " + firstX + "," + base + "' fill='" + col +
               "' fill-opacity='0.06' pointer-events='none'/>";
      }
      // Dots con valor encima
      dots.forEach(function(pt) {
        svg += "<circle cx='" + pt.x + "' cy='" + pt.y + "' r='4' fill='" + col +
               "' fill-opacity='0.9' stroke='white' stroke-width='1.5' pointer-events='none'/>";
      });
    });
  }

  // Overlays invisibles + etiquetas X (encima de todo)
  data.forEach(function(d, gi) {
    var xGroup = PAD.left + gi * groupW;
    var xc     = xGroup + groupW / 2;
    var label  = d.k.length > charsPerLabel
      ? d.k.substring(0, charsPerLabel - 1) + "\u2026"
      : d.k;
    svg += "<text x='" + xc + "' y='" + (PAD.top + plotH + 18) +
           "' text-anchor='middle' font-size='" + labelFontSize +
           "' fill='#444' font-weight='500' pointer-events='none'>" + label + "</text>";
    // Overlay invisible
    svg += "<rect id='an-ov-" + gi + "'" +
           " x='" + xGroup + "' y='" + PAD.top +
           "' width='" + groupW + "' height='" + plotH +
           "' fill='transparent' data-gi='" + gi + "'/>";
  });

  // ── Tabla ─────────────────────────────────────────────────────────────────
  var tableHtml = "<table class='an-table'><thead><tr>" +
    "<th class='left'>" + grpLabel + "</th><th>N</th>";
  cols.forEach(function(c) {
    tableHtml += "<th style='color:" + (AN_COLORS[c] || "#333") + "'>" +
                 (AN_LABELS[c] || c) + "</th>";
  });
  tableHtml += "</tr></thead><tbody>";

  data.forEach(function(d) {
    tableHtml += "<tr><td class='left'>" + d.k + "</td><td>" + d.n + "</td>";
    var rowVals = cols.map(function(c) { return d.vals[c]; })
                     .filter(function(v) { return !isNaN(v); });
    var rowMin  = rowVals.length ? Math.min.apply(null, rowVals) : NaN;
    var rowMax  = rowVals.length ? Math.max.apply(null, rowVals) : NaN;
    cols.forEach(function(c) {
      var v         = d.vals[c];
      var txt       = fmtVal(v);
      var isAllianz = (c === refCol);
      var isMin     = (!isNaN(v) && !isNaN(rowMin) && Math.abs(v - rowMin) < 1e-6);
      var isMax     = (!isNaN(v) && !isNaN(rowMax) && Math.abs(v - rowMax) < 1e-6);
      var style;
      if      (isAllianz) style = " style='font-weight:700;color:#003A8F'";
      else if (isMin)     style = " style='font-weight:700;color:#166534;background:#dcfce7'";
      else if (isMax)     style = " style='font-weight:700;color:#991b1b;background:#fee2e2'";
      else                style = "";
      tableHtml += "<td" + style + ">" + txt + "</td>";
    });
    tableHtml += "</tr>";
  });
  tableHtml += "</tbody></table>";

  // ── Montar DOM ────────────────────────────────────────────────────────────
  var anOut  = document.getElementById("an-output");
  var cardEl = document.createElement("div");
  cardEl.className = "an-card";

  // Header
  var hdrEl = document.createElement("div");
  hdrEl.className   = "an-card-header";
  hdrEl.textContent = (anGrafMetrica === "prima" ? "Prima promedio" : "Cuota (Prima/VA %)") +
                      " por " + grpLabel + " \u2014 " + descLabel;
  cardEl.appendChild(hdrEl);

  // Barra de controles
  var ctrl = document.createElement("div");
  ctrl.style.cssText =
    "display:flex;gap:10px;align-items:center;flex-wrap:wrap;" +
    "padding:10px 16px;background:#f8faff;border-bottom:1px solid #e8ecf8;";
  ctrl.innerHTML =
    "<span style='font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px'>Tipo</span>" +
    "<div class='cob-tabs' id='an-graf-tipo'>" +
      "<div class='cob-tab " + (anGrafTipo==="barras"?"active":"") +
        "' onclick=\"anSetGrafTipo('barras')\">Barras</div>" +
      "<div class='cob-tab " + (anGrafTipo==="lineas"?"active":"") +
        "' onclick=\"anSetGrafTipo('lineas')\">L\u00edneas</div>" +
    "</div>" +
    "<div style='width:1px;height:20px;background:#ddd;margin:0 2px'></div>" +
    "<span style='font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px'>M\u00e9trica</span>" +
    "<div class='cob-tabs' id='an-graf-metrica'>" +
      "<div class='cob-tab " + (anGrafMetrica==="prima"?"active":"") +
        "' onclick=\"anSetGrafMetrica('prima')\">Prima promedio</div>" +
      "<div class='cob-tab " + (anGrafMetrica==="cuota"?"active":"") +
        "' onclick=\"anSetGrafMetrica('cuota')\">Cuota (Prima/VA)</div>" +
    "</div>";
  cardEl.appendChild(ctrl);

  // SVG
  var svgCont = document.createElement("div");
  svgCont.style.cssText =
    "overflow-x:auto;background:#fafbff;padding:8px 0;border-bottom:1px solid #e8ecf8;";
  svgCont.innerHTML =
    "<svg id='an-graf-svg' width='" + W + "' height='" + H +
    "' style='display:block;min-width:" + W + "px'>" + svg + "</svg>";
  cardEl.appendChild(svgCont);

  // Tabla
  var tblCont = document.createElement("div");
  tblCont.className = "an-card-body";
  tblCont.innerHTML = tableHtml;
  cardEl.appendChild(tblCont);

  anOut.innerHTML = "";
  anOut.appendChild(cardEl);

  // ── Tooltip flotante ──────────────────────────────────────────────────────
  var tooltip = document.getElementById("an-bar-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "an-bar-tooltip";
    tooltip.style.cssText =
      "position:fixed;background:#1a1a2e;color:white;padding:9px 13px;" +
      "border-radius:8px;font-size:12px;pointer-events:none;z-index:9000;" +
      "display:none;box-shadow:0 4px 16px rgba(0,0,0,0.35);" +
      "line-height:1.75;min-width:170px;";
    document.body.appendChild(tooltip);
  }

  var svgEl = document.getElementById("an-graf-svg");
  if (svgEl) {
    svgEl.querySelectorAll("rect[data-gi]").forEach(function(rect) {
      var gi = parseInt(rect.getAttribute("data-gi"));

      rect.addEventListener("mouseenter", function() {
        var d       = window._anGrafData[gi];
        var tipCols = window._anGrafCols;

        var tip = "<strong style='display:block;margin-bottom:5px;padding-bottom:4px;" +
                  "border-bottom:1px solid #3a3a5e;font-size:11px;color:#c7d2fe'>" +
                  d.k + "</strong>";
        tipCols.forEach(function(c) {
          var v   = d.vals[c];
          var txt = fmtVal(v);
          var col = AN_COLORS[c] || "#888";
          tip += "<div style='display:flex;align-items:center;gap:7px'>" +
                 "<span style='width:10px;height:10px;background:" + col +
                 ";border-radius:2px;flex-shrink:0;display:inline-block'></span>" +
                 (AN_LABELS[c] || c) + ":&nbsp;<strong>" + txt + "</strong></div>";
        });

        tooltip.innerHTML = tip;
        tooltip.style.visibility = "hidden";
        tooltip.style.display    = "block";

        var svgRect      = svgEl.getBoundingClientRect();
        var groupCenterX = PAD.left + gi * groupW + groupW / 2;
        var groupTopY    = window._anGrafTops[gi];
        var screenX      = svgRect.left + groupCenterX;
        var screenY      = svgRect.top  + groupTopY;

        var ttW = tooltip.offsetWidth;
        var ttH = tooltip.offsetHeight;
        var tx  = screenX - ttW / 2;
        var ty  = screenY - ttH - 10;

        if (tx < 8)                           tx = 8;
        if (tx + ttW > window.innerWidth - 8) tx = window.innerWidth - ttW - 8;
        if (ty < 8)                           ty = screenY + 12;

        tooltip.style.left       = tx + "px";
        tooltip.style.top        = ty + "px";
        tooltip.style.visibility = "visible";

        var hl = document.getElementById("an-hl-" + gi);
        if (hl) hl.setAttribute("fill-opacity", "0.05");
      });

      rect.addEventListener("mouseleave", function() {
        tooltip.style.display = "none";
        var hl = document.getElementById("an-hl-" + gi);
        if (hl) hl.setAttribute("fill-opacity", "0");
      });
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  var allRef = data.map(function(d) { return d.vals[refCol]; })
                   .filter(function(v) { return !isNaN(v); })
                   .sort(function(a,b){ return a-b; });
  var med   = allRef.length ? allRef[Math.floor(allRef.length/2)] : NaN;
  var rmed  = document.getElementById("an-rmed");
  var rcaro = document.getElementById("an-rcaro");
  if (rmed)  rmed.textContent  = isNaN(med) ? "\u2014" : fmtVal(med);
  if (rcaro) rcaro.textContent = "\u2014";
}




// ═══════════════════════════════════════════════════════
// ANÁLISIS POR VEHÍCULO
// ═══════════════════════════════════════════════════════
function anRenderVehiculos(rows) {
  var anOut     = document.getElementById("an-output");
  var cols      = anDesc === "sin" ? AN_FILTROS.cols_sd    : AN_FILTROS.cols_cd;
  var refCol    = anDesc === "sin" ? "prima_allianz"       : "prima_allianz_desc";
  var mktCols   = anDesc === "sin" ? AN_FILTROS.cols_mkt_sd: AN_FILTROS.cols_mkt_cd;
  var descLabel = anDesc === "sin" ? "Sin descuento"       : "Con descuento";

  // Descripción
  anOut.innerHTML = "";
  anOut.appendChild(anDescCard(
    "Analiza si cada aseguradora cobra <strong>relativamente distinto</strong> seg\u00fan el veh\u00edculo, " +
    "eliminando el efecto geogr\u00e1fico. El <strong>factor relativo</strong> normaliza dentro de cada CP: " +
    "1.00 = precio igual al promedio de esa compa\u00f1\u00eda, &lt;1 = relativamente barato, &gt;1 = relativamente caro. " +
    "El <strong>CV</strong> mide cu\u00e1nto diferencia cada compa\u00f1\u00eda sus precios entre veh\u00edculos."
  ));

  // Clave de vehículo
  function vehKey(r) {
    return ((r.Marca_Submarca || "") + " " + String(r.Modelo || "")).trim();
  }

  // Agrupar por vehículo
  var vehGroups = {};
  rows.forEach(function(r) {
    var k = vehKey(r); if (!k) return;
    if (!vehGroups[k]) vehGroups[k] = [];
    vehGroups[k].push(r);
  });
  var vehiculos = Object.keys(vehGroups).sort();

  if (!vehiculos.length) {
    anOut.innerHTML += "<div class='an-empty'>Sin datos. Verifica que el df tiene columnas Marca_Submarca y Modelo.</div>";
    return;
  }

  // ── Prima promedio ─────────────────────────────────────────────────────────
  var primAvg = {};
  vehiculos.forEach(function(veh) {
    primAvg[veh] = {};
    cols.forEach(function(c) { primAvg[veh][c] = anProm(vehGroups[veh], c); });
  });

  // ── Factor relativo (normalizado por CP) ───────────────────────────────────
  var cpGroups = {};
  rows.forEach(function(r) {
    var k = String(r.CP || "");
    if (!cpGroups[k]) cpGroups[k] = [];
    cpGroups[k].push(r);
  });
  var factorLists = {}; // {veh: {col: [factores]}}
  Object.keys(cpGroups).forEach(function(cp) {
    var g = cpGroups[cp];
    cols.forEach(function(c) {
      var vals = g.map(function(r){ return Number(r[c]); }).filter(function(v){ return !isNaN(v)&&v>0; });
      var mean = vals.length ? vals.reduce(function(a,b){return a+b;},0)/vals.length : NaN;
      if (isNaN(mean)||mean<=0) return;
      g.forEach(function(r) {
        var v = Number(r[c]); if (isNaN(v)||v<=0) return;
        var veh = vehKey(r);
        if (!factorLists[veh]) factorLists[veh] = {};
        if (!factorLists[veh][c]) factorLists[veh][c] = [];
        factorLists[veh][c].push(v/mean);
      });
    });
  });
  var factorAvg = {};
  vehiculos.forEach(function(veh) {
    factorAvg[veh] = {};
    cols.forEach(function(c) {
      var arr = (factorLists[veh]&&factorLists[veh][c]) || [];
      factorAvg[veh][c] = arr.length ? arr.reduce(function(a,b){return a+b;},0)/arr.length : NaN;
    });
  });
  // CV por compañía
  var cvByCol = {};
  cols.forEach(function(c) {
    var fs = vehiculos.map(function(v){ return factorAvg[v][c]; }).filter(function(v){ return !isNaN(v); });
    if (!fs.length) { cvByCol[c] = NaN; return; }
    var m = fs.reduce(function(a,b){return a+b;},0)/fs.length;
    var std = Math.sqrt(fs.reduce(function(s,v){ return s+(v-m)*(v-m); },0)/fs.length);
    cvByCol[c] = m>0 ? std/m*100 : NaN;
  });

  // ── Ratio vs mercado ───────────────────────────────────────────────────────
  var ratioAvg = {};
  vehiculos.forEach(function(veh) {
    ratioAvg[veh] = {};
    var g = vehGroups[veh];
    cols.forEach(function(c) {
      var rs = g.map(function(r) {
        var minV = Infinity;
        cols.forEach(function(c2){ var v2=Number(r[c2]); if(!isNaN(v2)&&v2>0&&v2<minV) minV=v2; });
        var v = Number(r[c]);
        return (!isNaN(v)&&v>0&&minV<Infinity) ? v/minV : NaN;
      }).filter(function(v){ return !isNaN(v); });
      ratioAvg[veh][c] = rs.length ? rs.reduce(function(a,b){return a+b;},0)/rs.length : NaN;
    });
  });

  // ── Factor por Estado (Allianz) ────────────────────────────────────────────
  var estGroups = {};
  rows.forEach(function(r) {
    var k = r.Estado||""; if (!k) return;
    if (!estGroups[k]) estGroups[k] = [];
    estGroups[k].push(r);
  });
  var estados = Object.keys(estGroups).sort();
  var geoFactor = {};
  estados.forEach(function(est) {
    geoFactor[est] = {};
    var gE = estGroups[est];
    var vehInState = {};
    gE.forEach(function(r){ var v=vehKey(r); if(!vehInState[v]) vehInState[v]=[]; vehInState[v].push(r); });
    var mean = anProm(gE, refCol);
    if (isNaN(mean)||mean<=0) return;
    vehiculos.forEach(function(veh) {
      var v = anProm(vehInState[veh]||[], refCol);
      geoFactor[est][veh] = (!isNaN(v)&&mean>0) ? v/mean : NaN;
    });
  });

  // ── Helpers de color ───────────────────────────────────────────────────────
  function factorBg(v) {
    if (!v||isNaN(v)) return "#e8e8e8";
    var t=v-1.0, i=Math.min(1,Math.abs(t)/0.12);
    if (t<0) return "rgb("+Math.round(219-i*120)+","+Math.round(234-i*60)+","+Math.round(254-i*18)+")";
    return "rgb("+Math.round(254-i*10)+","+Math.round(226-i*186)+","+Math.round(226-i*186)+")";
  }
  function factorFg(v) { return (!v||isNaN(v))?"#999":Math.abs(v-1.0)>0.08?"white":"#1a1a2e"; }
  function ratioBg(v) {
    if (!v||isNaN(v)) return "#e8e8e8";
    if (v<=1.01) return "#dcfce7";
    if (v<=1.05) return "rgb("+Math.round(220+(v-1.01)/0.04*34)+",249,196)";
    if (v<=1.10) return "rgb(254,"+Math.round(249-(v-1.05)/0.05*199)+",0)";
    return "#fee2e2";
  }
  function ratioFg(v) { return (!v||isNaN(v))?"#999":v<=1.01?"#14532d":v>1.15?"#991b1b":"#713f12"; }

  // ── Helper card ───────────────────────────────────────────────────────────
  function mkCard(title, bodyEl) {
    var card = document.createElement("div");
    card.className = "an-card";
    card.style.marginBottom = "16px";
    var h = document.createElement("div");
    h.className = "an-card-header";
    h.textContent = title;
    card.appendChild(h);
    card.appendChild(bodyEl);
    anOut.appendChild(card);
  }

  // ── Header de tabla ───────────────────────────────────────────────────────
  function mkHead() {
    var h = "<tr><th class='left'>Veh\u00edculo</th>";
    cols.forEach(function(c) {
      h += "<th><span style='display:inline-block;width:8px;height:8px;background:"+(AN_COLORS[c]||"#888")+
           ";border-radius:50%;margin-right:4px;vertical-align:middle'></span>"+(AN_LABELS[c]||c)+"</th>";
    });
    return h+"</tr>";
  }

  // ══ SECCIÓN 1: Factor relativo ════════════════════════════════════════════
  var tbl1 = document.createElement("table"); tbl1.className="an-table";
  tbl1.innerHTML = "<thead>"+mkHead()+"</thead>";
  var tb1 = document.createElement("tbody");

  vehiculos.forEach(function(veh) {
    var row = document.createElement("tr");
    var td0 = document.createElement("td"); td0.className="left"; td0.style.fontWeight="500";
    td0.textContent = veh; row.appendChild(td0);
    cols.forEach(function(c) {
      var v = factorAvg[veh][c];
      var td = document.createElement("td");
      td.style.cssText = "background:"+factorBg(v)+";color:"+factorFg(v)+";font-weight:600";
      td.textContent = isNaN(v)?"\u2014":v.toFixed(3);
      row.appendChild(td);
    });
    tb1.appendChild(row);
  });

  // Fila CV
  var cvRow = document.createElement("tr"); cvRow.style.borderTop="2px solid #ddd";
  var cvTd0 = document.createElement("td"); cvTd0.className="left";
  cvTd0.style.cssText="font-size:10px;color:#888;font-weight:700";
  cvTd0.textContent="CV entre veh\u00edculos"; cvRow.appendChild(cvTd0);
  cols.forEach(function(c) {
    var td = document.createElement("td");
    td.style.cssText="font-size:10px;font-weight:600;color:#555";
    var v = cvByCol[c];
    td.textContent = isNaN(v)?"\u2014":v.toFixed(1)+"%";
    if (!isNaN(v)&&v>8) td.style.color="#991b1b";
    cvRow.appendChild(td);
  });
  tb1.appendChild(cvRow);
  tbl1.appendChild(tb1);

  var b1 = document.createElement("div"); b1.className="an-card-body"; b1.appendChild(tbl1);
  mkCard("Factor relativo por veh\u00edculo \u2014 geograf\u00eda eliminada (CV = diferenciaci\u00f3n entre veh\u00edculos, rojo > 8%)", b1);

  // ══ SECCIÓN 2: Ratio vs mercado ═══════════════════════════════════════════
  var tbl2 = document.createElement("table"); tbl2.className="an-table";
  tbl2.innerHTML = "<thead>"+mkHead()+"</thead>";
  var tb2 = document.createElement("tbody");
  vehiculos.forEach(function(veh) {
    var row = document.createElement("tr");
    var td0 = document.createElement("td"); td0.className="left"; td0.style.fontWeight="500";
    td0.textContent=veh; row.appendChild(td0);
    cols.forEach(function(c) {
      var v = ratioAvg[veh][c];
      var td = document.createElement("td");
      td.style.cssText="background:"+ratioBg(v)+";color:"+ratioFg(v)+";font-weight:600";
      td.textContent = isNaN(v)?"\u2014":v.toFixed(3);
      row.appendChild(td);
    });
    tb2.appendChild(row);
  });
  tbl2.appendChild(tb2);
  var b2=document.createElement("div"); b2.className="an-card-body"; b2.appendChild(tbl2);
  mkCard("Ratio vs compa\u00f1\u00eda m\u00e1s barata por veh\u00edculo (1.000 = m\u00e1s barata, verde; >1.05 = caro, rojo)", b2);

  // ══ SECCIÓN 3: Posición competitiva Allianz ══════════════════════════════
  var sorted3 = vehiculos.slice().sort(function(a,b){
    return (ratioAvg[a][refCol]||Infinity)-(ratioAvg[b][refCol]||Infinity);
  });
  var anMainEl = document.querySelector(".an-main");
  var W = anMainEl ? (anMainEl.clientWidth-48) : 600;
  var H = 36+sorted3.length*54;
  var PAD = {left:14,right:230,top:24,bottom:12};
  var plotW = W-PAD.left-PAD.right;
  var maxR = 0;
  sorted3.forEach(function(v){ var r=ratioAvg[v][refCol]; if(!isNaN(r)&&r>maxR) maxR=r; });
  maxR = maxR*1.12||1.5;

  var svg="";
  var x1=PAD.left+(1.0/maxR)*plotW;
  svg+="<line x1='"+x1+"' y1='"+PAD.top+"' x2='"+x1+"' y2='"+(H-PAD.bottom)+
       "' stroke='#22c55e' stroke-width='1.5' stroke-dasharray='4,3'/>";
  svg+="<text x='"+x1+"' y='"+(PAD.top-6)+"' text-anchor='middle' font-size='9' fill='#166534'>1.00</text>";

  sorted3.forEach(function(veh,i) {
    var ratio=ratioAvg[veh][refCol];
    var y=PAD.top+i*54;
    var bw=isNaN(ratio)?2:Math.max(2,(ratio/maxR)*plotW);
    svg+="<rect x='"+PAD.left+"' y='"+(y+3)+"' width='"+bw+"' height='36' fill='"+ratioBg(ratio)+"' rx='3'/>";
    var pStr=isNaN(primAvg[veh][refCol])?"—":"$"+Math.round(primAvg[veh][refCol]).toLocaleString("es-MX");
    var pos=1;
    cols.forEach(function(c){ if(c!==refCol&&!isNaN(ratioAvg[veh][c])&&ratioAvg[veh][c]<(ratioAvg[veh][refCol]||Infinity)-0.0005) pos++; });
    var short=veh.length>30?veh.substring(0,28)+"\u2026":veh;
    svg+="<text x='"+(PAD.left+bw+8)+"' y='"+(y+16)+"' font-size='12' fill='#1a1a2e' font-weight='500'>"+short+"</text>";
    svg+="<text x='"+(PAD.left+bw+8)+"' y='"+(y+30)+"' font-size='11' fill='"+ratioFg(ratio)+"' font-weight='700'>"+
         "ratio "+(isNaN(ratio)?"\u2014":ratio.toFixed(3))+" \u00b7 "+pStr+" \u00b7 pos "+pos+"/"+cols.length+"</text>";
  });

  var svgDiv=document.createElement("div"); svgDiv.style.cssText="padding:12px;overflow-x:auto";
  svgDiv.innerHTML="<svg width='"+W+"' height='"+H+"' style='display:block;min-width:"+W+"px'>"+svg+"</svg>";
  mkCard("Posici\u00f3n competitiva de Allianz por veh\u00edculo \u2014 "+descLabel, svgDiv);

  // ══ SECCIÓN 4: Ranking por vehículo ══════════════════════════════════════
  var grid=document.createElement("div");
  grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;padding:14px";
  var medals=["\uD83E\uDD47","\uD83E\uDD48","\uD83E\uDD49","\u2464","\u2465"];

  vehiculos.forEach(function(veh) {
    var sortedC=cols.slice().sort(function(a,b){ return (primAvg[veh][a]||Infinity)-(primAvg[veh][b]||Infinity); });
    var best=primAvg[veh][sortedC[0]];
    var card=document.createElement("div");
    card.style.cssText="border:1px solid #e8ecf8;border-radius:8px;overflow:hidden";
    var ti=document.createElement("div");
    ti.style.cssText="background:#1a1a2e;color:white;padding:7px 12px;font-size:11px;font-weight:600;line-height:1.4";
    ti.textContent=veh; card.appendChild(ti);
    sortedC.forEach(function(c,i) {
      var p=primAvg[veh][c];
      var diff=(!isNaN(p)&&!isNaN(best)&&i>0)?p-best:null;
      var row=document.createElement("div");
      row.style.cssText="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid #f0f0f0";
      row.innerHTML="<span style='font-size:13px;flex-shrink:0'>"+(medals[i]||"\u00b7")+"</span>"+
        "<span style='width:9px;height:9px;background:"+(AN_COLORS[c]||"#888")+";border-radius:50%;flex-shrink:0;display:inline-block'></span>"+
        "<span style='font-size:11px;flex:1;color:#444;font-weight:500'>"+(AN_LABELS[c]||c)+"</span>"+
        "<span style='font-size:11px;font-weight:700;color:#1a1a2e'>"+(isNaN(p)?"—":"$"+Math.round(p).toLocaleString("es-MX"))+"</span>"+
        (diff!==null?"<span style='font-size:9px;color:#888;min-width:48px;text-align:right'>+"+Math.round(diff).toLocaleString("es-MX")+"</span>":"<span style='min-width:48px'></span>");
      card.appendChild(row);
    });
    grid.appendChild(card);
  });
  var b4=document.createElement("div"); b4.appendChild(grid);
  mkCard("Ranking de compa\u00f1\u00edas por veh\u00edculo \u2014 "+descLabel, b4);

  // ══ SECCIÓN 5: Factor por Estado (Allianz) ════════════════════════════════
  var tbl5=document.createElement("table"); tbl5.className="an-table";
  var gh="<tr><th class='left'>Estado</th>";
  vehiculos.forEach(function(veh){ var sh=veh.length>16?veh.substring(0,14)+"\u2026":veh; gh+="<th style='font-size:10px' title='"+veh+"'>"+sh+"</th>"; });
  gh+="<th>Rango</th></tr>";
  tbl5.innerHTML="<thead>"+gh+"</thead>";
  var tb5=document.createElement("tbody");

  estados.forEach(function(est) {
    var vals=vehiculos.map(function(v){ return geoFactor[est][v]; });
    var valid=vals.filter(function(v){ return !isNaN(v); });
    var rango=valid.length>1?Math.max.apply(null,valid)-Math.min.apply(null,valid):NaN;
    var rBg=isNaN(rango)?"#f5f5f5":rango>0.15?"#fee2e2":rango>0.08?"#fef9c3":"#f0fdf4";
    var row=document.createElement("tr");
    var td0=document.createElement("td"); td0.className="left"; td0.style.fontSize="11px";
    td0.textContent=est; row.appendChild(td0);
    vals.forEach(function(v) {
      var td=document.createElement("td");
      td.style.cssText="background:"+factorBg(v)+";color:"+factorFg(v)+";font-weight:600";
      td.textContent=isNaN(v)?"\u2014":v.toFixed(3);
      row.appendChild(td);
    });
    var tdR=document.createElement("td");
    tdR.style.cssText="background:"+rBg+";font-weight:700;font-size:11px";
    tdR.textContent=isNaN(rango)?"\u2014":rango.toFixed(3);
    row.appendChild(tdR);
    tb5.appendChild(row);
  });
  tbl5.appendChild(tb5);
  var b5=document.createElement("div"); b5.className="an-card-body"; b5.appendChild(tbl5);
  mkCard("Factor relativo de Allianz por Estado \u00d7 veh\u00edculo \u2014 "+descLabel+" (Rango: dispersi\u00f3n geogr\u00e1fica)", b5);

  // Stats
  var rmed=document.getElementById("an-rmed");
  var rcaro=document.getElementById("an-rcaro");
  if (rmed)  rmed.textContent = vehiculos.length+" veh\u00edculos";
  if (rcaro) rcaro.textContent = sorted3.length&&!isNaN(ratioAvg[sorted3[0]][refCol])
    ? ratioAvg[sorted3[0]][refCol].toFixed(3) : "\u2014";
}



// ═══════════════════════════════════════════════════════
// BOXPLOT
// ═══════════════════════════════════════════════════════
function bpQuantiles(arr) {
  var s = arr.slice().sort(function(a, b){ return a - b; });
  var n = s.length;
  var q = function(p) {
    var i = p * (n - 1);
    var lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi ? s[lo] : s[lo] + (i - lo) * (s[hi] - s[lo]);
  };
  var q1 = q(0.25), med = q(0.5), q3 = q(0.75);
  var iqr = q3 - q1;
  var wlo = Math.max(s[0],   q1 - 1.5 * iqr);
  var whi = Math.min(s[n-1], q3 + 1.5 * iqr);
  var outliers = s.filter(function(v){ return v < wlo || v > whi; });
  return { q1: q1, med: med, q3: q3, wlo: wlo, whi: whi, outliers: outliers };
}

function bpBuildSvg(series, yMin, yMax, W, H, PAD, plotW, plotH, xSlot, bw, X_POS, titulo) {
  var yScale = function(v) {
    return PAD.top + plotH - (v - yMin) / (yMax - yMin) * plotH;
  };
  var svg = "";

  for (var ti = 0; ti <= 6; ti++) {
    var yv = yMin + (yMax - yMin) * ti / 6;
    var yp = yScale(yv);
    svg += "<line x1='" + PAD.left + "' y1='" + yp + "' x2='" + (PAD.left + plotW) +
           "' y2='" + yp + "' stroke='#eee' stroke-width='1'/>";
    svg += "<text x='" + (PAD.left - 6) + "' y='" + (yp + 4) +
           "' text-anchor='end' font-size='10' fill='#888'>$" +
           Math.round(yv).toLocaleString("es-MX") + "</text>";
  }
  svg += "<line x1='" + PAD.left + "' y1='" + PAD.top + "' x2='" + PAD.left +
         "' y2='" + (PAD.top + plotH) + "' stroke='#ccc' stroke-width='1'/>";
  svg += "<line x1='" + PAD.left + "' y1='" + (PAD.top + plotH) + "' x2='" +
         (PAD.left + plotW) + "' y2='" + (PAD.top + plotH) + "' stroke='#ccc' stroke-width='1'/>";

  var xSep = PAD.left + (X_POS[1] - 0.4) * xSlot;
  svg += "<line x1='" + xSep + "' y1='" + PAD.top + "' x2='" + xSep +
         "' y2='" + (PAD.top + plotH) + "' stroke='#bbb' stroke-width='1' stroke-dasharray='5,4'/>";

  series.forEach(function(s, si) {
    if (!s.vals.length) return;
    var xc  = PAD.left + X_POS[si] * xSlot + xSlot * 0.5;
    var col = s.key === "mercado" ? "#cccccc" : (AN_COLORS[s.key] || "#888");
    var q   = bpQuantiles(s.vals);
    var y1  = yScale(q.q1), y3 = yScale(q.q3);
    var ym  = yScale(q.med);
    var yw  = yScale(q.wlo), yW = yScale(q.whi);

    svg += "<line x1='" + xc + "' y1='" + Math.min(y1,y3) + "' x2='" + xc +
           "' y2='" + yW + "' stroke='" + col + "' stroke-width='2'/>";
    svg += "<line x1='" + xc + "' y1='" + Math.max(y1,y3) + "' x2='" + xc +
           "' y2='" + yw + "' stroke='" + col + "' stroke-width='2'/>";
    svg += "<line x1='" + (xc-bw*0.3) + "' y1='" + yW + "' x2='" + (xc+bw*0.3) +
           "' y2='" + yW + "' stroke='" + col + "' stroke-width='2'/>";
    svg += "<line x1='" + (xc-bw*0.3) + "' y1='" + yw + "' x2='" + (xc+bw*0.3) +
           "' y2='" + yw + "' stroke='" + col + "' stroke-width='2'/>";
    svg += "<rect x='" + (xc-bw/2) + "' y='" + Math.min(y1,y3) +
           "' width='" + bw + "' height='" + Math.abs(y1-y3) +
           "' fill='" + col + "' fill-opacity='0.78' rx='3'/>";
    svg += "<line x1='" + (xc-bw/2) + "' y1='" + ym + "' x2='" + (xc+bw/2) +
           "' y2='" + ym + "' stroke='white' stroke-width='2.5'/>";
    q.outliers.forEach(function(ov) {
      svg += "<circle cx='" + xc + "' cy='" + yScale(ov) + "' r='2.5' fill='" +
             col + "' fill-opacity='0.35'/>";
    });
    svg += "<text x='" + xc + "' y='" + (ym - 7) +
           "' text-anchor='middle' font-size='10' font-weight='bold' fill='white'" +
           " paint-order='stroke' stroke='#333' stroke-width='3'>$" +
           Math.round(q.med).toLocaleString("es-MX") + "</text>";
    svg += "<text x='" + xc + "' y='" + (PAD.top + plotH + 18) +
           "' text-anchor='middle' font-size='11' fill='#444'>" + s.label + "</text>";
    svg += "<text x='" + xc + "' y='" + (PAD.top + plotH + 34) +
           "' text-anchor='middle' font-size='9' fill='#bbb'>n=" + s.vals.length + "</text>";
  });

  svg = "<text x='" + (W/2) + "' y='24' text-anchor='middle' font-size='13'" +
        " font-weight='bold' fill='#003A8F'>" + titulo + "</text>" + svg;
  return svg;
}

function bpBuildCard(svgStr, svgId, W, H, esTotalCard) {
  var card = document.createElement("div");
  card.style.cssText = esTotalCard
    ? "background:white;border:2px solid #2563EB;border-radius:10px;overflow:hidden;width:100%;position:relative;"
    : "background:white;border:1px solid #e8ecf8;border-radius:10px;overflow:hidden;width:100%;position:relative;";

  if (esTotalCard) {
    var hdr = document.createElement("div");
    hdr.style.cssText =
      "background:#2563EB;color:white;font-size:12px;font-weight:700;" +
      "padding:6px 14px;letter-spacing:.3px;";
    hdr.textContent = "Total \u2014 todos los grupos combinados";
    card.appendChild(hdr);
  }

  var btn = document.createElement("button");
  btn.textContent = "\u26F6 Expandir";
  btn.style.cssText =
    "position:absolute;top:8px;right:8px;z-index:10;" +
    "background:#f0f4ff;border:1px solid #c7d7f7;border-radius:6px;" +
    "padding:4px 10px;font-size:11px;color:#2563EB;cursor:pointer;" +
    "font-weight:600;letter-spacing:.3px;";
  btn.addEventListener("click", (function(id) {
    return function() { bpExpandir(id); };
  })(svgId));

  var tmp = document.createElement("div");
  tmp.innerHTML =
    "<svg id='" + svgId + "' width='100%' viewBox='0 0 " + W + " " + H +
    "' style='display:block'>" + svgStr + "</svg>";

  card.appendChild(btn);
  card.appendChild(tmp.firstChild);
  return card;
}

function bpCalcSeries(rowsArr, COMPANIAS, mktCols, refCol) {
  return COMPANIAS.map(function(c) {
    var vals;
    if (c.key === "mercado") {
      vals = [];
      mktCols.forEach(function(mc) {
        rowsArr.forEach(function(r) {
          var v = Number(r[mc]);
          if (!isNaN(v) && r[mc] != null && v > 0) vals.push(v);
        });
      });
    } else {
      vals = rowsArr.map(function(r) { return Number(r[c.key]); })
                    .filter(function(v) { return !isNaN(v) && v > 0; });
    }
    return { label: c.label, key: c.key, vals: vals };
  });
}

function anRenderBoxplot(rows, groups, gkeys) {
  var refCol    = anDesc === "sin" ? "prima_allianz"        : "prima_allianz_desc";
  var mktCols   = anDesc === "sin" ? AN_FILTROS.cols_mkt_sd : AN_FILTROS.cols_mkt_cd;
  var descLabel = anDesc === "sin" ? "Sin descuento"        : "Con descuento";

  gkeys = gkeys.slice().sort(function(a, b) {
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });

  var COMPANIAS = [{ key: refCol, label: "Allianz" }, { key: "mercado", label: "Mercado" }]
    .concat(mktCols.map(function(c) { return { key: c, label: AN_LABELS[c] || c }; }));

  var anMain = document.querySelector(".an-main");
  var W      = anMain ? (anMain.clientWidth - 48) : 900;
  var H      = Math.round(W * 0.42);
  var PAD    = { top: 40, right: 24, bottom: 64, left: 80 };
  var plotW  = W - PAD.left - PAD.right;
  var plotH  = H - PAD.top  - PAD.bottom;

  var X_POS = [0, 1.7, 3.1, 4.1, 5.1, 6.1];
  var X_MAX = X_POS[X_POS.length - 1] + 1;
  var xSlot = plotW / X_MAX;
  var bw    = xSlot * 0.52;

  var wrapper = document.createElement("div");
  wrapper.style.cssText = "display:flex;flex-direction:column;gap:20px;padding:16px";

  // Boxplot TOTAL arriba
  var seriesTot  = bpCalcSeries(rows, COMPANIAS, mktCols, refCol);
  var allValsTot = [];
  seriesTot.forEach(function(s) { allValsTot = allValsTot.concat(s.vals); });
  if (allValsTot.length) {
    var yMinT = Math.min.apply(null, allValsTot);
    var yMaxT = Math.max.apply(null, allValsTot);
    var yPadT = (yMaxT - yMinT) * 0.1;
    yMinT -= yPadT; yMaxT += yPadT;
    var svgTot = bpBuildSvg(seriesTot, yMinT, yMaxT, W, H, PAD, plotW, plotH, xSlot, bw, X_POS,
                            "Total \u2014 " + rows.length.toLocaleString("es-MX") + " registros");
    wrapper.appendChild(bpBuildCard(svgTot, "bp-svg-TOTAL", W, H, true));
  }

  // Un boxplot por grupo
  gkeys.forEach(function(k) {
    var g      = groups[k];
    var series = bpCalcSeries(g, COMPANIAS, mktCols, refCol);
    var allVals = [];
    series.forEach(function(s) { allVals = allVals.concat(s.vals); });
    if (!allVals.length) return;
    var yMin = Math.min.apply(null, allVals);
    var yMax = Math.max.apply(null, allVals);
    var yPad = (yMax - yMin) * 0.1;
    yMin -= yPad; yMax += yPad;
    var svgStr = bpBuildSvg(series, yMin, yMax, W, H, PAD, plotW, plotH, xSlot, bw, X_POS, k);
    var svgId  = "bp-svg-" + k.replace(/[^a-zA-Z0-9]/g, "_");
    wrapper.appendChild(bpBuildCard(svgStr, svgId, W, H, false));
  });

  var anOut  = document.getElementById("an-output");
  anOut.innerHTML = "";
  anOut.appendChild(anDescCard(
    "Muestra la <strong>distribuci&oacute;n completa</strong> de primas, no solo el promedio. " +
    "La caja cubre el rango intercuart&iacute;lico (Q1&ndash;Q3), la l&iacute;nea blanca es la mediana, " +
    "los bigotes llegan hasta 1.5&times;IQR y los puntos son outliers. " +
    "<strong>Mercado</strong> (gris) combina todas las cotizaciones de la competencia. " +
    "El boxplot <em>Total</em> resume todos los grupos filtrados en conjunto."
  ));
  var cardEl = document.createElement("div");
  cardEl.className = "an-card";
  var hdrEl = document.createElement("div");
  hdrEl.className   = "an-card-header";
  hdrEl.textContent = "Boxplot \u2014 " + descLabel;
  cardEl.appendChild(hdrEl);
  cardEl.appendChild(wrapper);
  anOut.appendChild(cardEl);

  // Stats
  var allMeds = [];
  gkeys.forEach(function(k) {
    var vals = groups[k].map(function(r){ return Number(r[refCol]); })
                        .filter(function(v){ return !isNaN(v) && v > 0; });
    if (vals.length) allMeds.push(bpQuantiles(vals).med);
  });
  allMeds.sort(function(a,b){ return a-b; });
  var globalMed = allMeds.length ? allMeds[Math.floor(allMeds.length/2)] : NaN;
  var rmed  = document.getElementById("an-rmed");
  var rcaro = document.getElementById("an-rcaro");
  if (rmed)  rmed.textContent  = isNaN(globalMed) ? "\u2014" : "$" + Math.round(globalMed).toLocaleString("es-MX");
  if (rcaro) rcaro.textContent = "\u2014";
}

// ═══════════════════════════════════════════════════════
// MODAL EXPANDIR
// ═══════════════════════════════════════════════════════
function bpCerrarModal() {
  var modal = document.getElementById("bp-modal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

function bpExpandir(svgId) {
  var svgEl = document.getElementById(svgId);
  if (!svgEl) return;

  var modal = document.getElementById("bp-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "bp-modal";
    modal.style.cssText =
      "position:fixed;inset:0;background:white;z-index:9999;display:flex;flex-direction:column;";
    modal.addEventListener("click", function(e) {
      if (e.target === modal) bpCerrarModal();
    });

    var toolbar = document.createElement("div");
    toolbar.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;" +
      "padding:8px 16px;background:#1a1a2e;flex-shrink:0;";

    var titulo = document.createElement("span");
    titulo.id = "bp-modal-titulo";
    titulo.style.cssText = "color:white;font-size:13px;font-weight:600;";
    toolbar.appendChild(titulo);

    var btnCerrar = document.createElement("button");
    btnCerrar.textContent = "\u00d7 Cerrar";
    btnCerrar.addEventListener("click", bpCerrarModal);
    btnCerrar.style.cssText =
      "background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;" +
      "padding:5px 14px;font-size:12px;color:#991b1b;cursor:pointer;font-weight:600;";
    toolbar.appendChild(btnCerrar);

    var svgCont = document.createElement("div");
    svgCont.id = "bp-modal-svg";
    svgCont.style.cssText =
      "flex:1;overflow:auto;padding:24px;display:flex;" +
      "align-items:center;justify-content:center;background:white;";

    modal.appendChild(toolbar);
    modal.appendChild(svgCont);
    document.body.appendChild(modal);
  }

  var tituloEl = svgEl.querySelector("text");
  var t = document.getElementById("bp-modal-titulo");
  if (t) t.textContent = tituloEl ? tituloEl.textContent : "";

  var svgClone = svgEl.cloneNode(true);
  svgClone.removeAttribute("id");
  svgClone.style.width     = "100%";
  svgClone.style.height    = "100%";
  svgClone.style.maxHeight = "calc(100vh - 56px)";

  var cont = document.getElementById("bp-modal-svg");
  cont.innerHTML = "";
  cont.appendChild(svgClone);

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") bpCerrarModal();
});



function anSetMapMetrica(m) {
  anMapMetrica = m;
  document.querySelectorAll("#an-map-metrica .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active",
      (i===0 && m==="prima") || (i===1 && m==="ratio") || (i===2 && m==="cuota"));
  });
  anRender();
}

// ── Helpers de mapa ──────────────────────────────────────────────────────────
function anSetMapLevel(l) {
  anMapLevel = l;
  document.querySelectorAll("#an-map-level .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active",
      (i===0 && l==="estado") || (i===1 && l==="municipio") || (i===2 && l==="cp"));
  });
  anRender();
}

function anSetMapCpMode(m) {
  anMapCpMode = m;
  document.querySelectorAll("#an-map-cp-mode .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active", (i===0 && m==="puntos") || (i===1 && m==="poligonos"));
  });
  // Guardar posición antes de que anRender destruya el mapa
  if (_anLeafletMap) {
    _anLeafletMap._anSavedCenter = _anLeafletMap.getCenter();
    _anLeafletMap._anSavedZoom   = _anLeafletMap.getZoom();
  }
  anRender();
}

function anToggleContorno(type) {
  anMapContornos[type] = !anMapContornos[type];
  var btn = document.getElementById("an-cnt-" + type);
  if (btn) btn.classList.toggle("active", anMapContornos[type]);
  if (_anMapContourUpdate) _anMapContourUpdate(type, anMapContornos[type]);
}

function anSetContornoScope(scope) {
  anMapContornoScope = scope;
  document.querySelectorAll("#an-map-cnt-scope .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active",
      (i===0 && scope==="muestra") || (i===1 && scope==="todos"));
  });
  // Refrescar todas las capas de contorno activas con el nuevo scope
  if (_anMapContourUpdate) {
    Object.keys(anMapContornos).forEach(function(type) {
      if (anMapContornos[type]) _anMapContourUpdate(type, true);
    });
  }
}

function anSetMapCompany(c) {
  anMapCompany = c;
  document.querySelectorAll("#an-map-company .cob-tab").forEach(function(b) {
    b.classList.toggle("active", b.dataset.co === c);
  });
  anRender();
}

function anSetMapTodasMode(m) {
  anMapTodasMode = m;
  document.querySelectorAll("#an-map-todas-mode .cob-tab").forEach(function(b, i) {
    b.classList.toggle("active", (i===0 && m==="min") || (i===1 && m==="max"));
  });
  anRender();
}

function anSetMapPalette(p) {
  anMapPalette = p;
  document.querySelectorAll("#an-map-palette .cob-tab").forEach(function(b) {
    b.classList.toggle("active", b.dataset.pal === p);
  });
  anRender();
}

function _normStr(s) {
  if (!s) return "";
  return s.toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().trim();
}

function _centroid(feat) {
  try {
    var geom = feat.geometry;
    var ring = geom.type === "MultiPolygon"
      ? geom.coordinates[0][0]
      : geom.coordinates[0];
    if (!ring || !ring.length) return null;
    var lat = 0, lng = 0, n = ring.length;
    ring.forEach(function(c){ lng += c[0]; lat += c[1]; });
    return [lat / n, lng / n];
  } catch(e) { return null; }
}

// Normaliza nombres de estado para matching robusto entre df y GeoJSON
function _normEstado(s) {
  var n = _normStr(s);
  if (n === "ESTADO DE MEXICO" || n === "EDOMEX" || n === "EDO MEX" || n === "EDO. DE MEX.") return "MEXICO";
  if (n === "CIUDAD DE MEXICO" || n === "CDMX"  || n === "D.F."    || n === "DF")            return "CIUDAD DE MEXICO";
  if (n.indexOf("COAHUILA") >= 0)    return "COAHUILA";
  if (n.indexOf("MICHOACAN") >= 0)   return "MICHOACAN";
  if (n.indexOf("VERACRUZ") >= 0)    return "VERACRUZ";
  return n;
}

// Normaliza nombres de estado para evitar variantes ("ESTADO DE MEXICO" → "MEXICO")
function _normEstado(s) {
  var n = _normStr(s || "");
  if (n === "ESTADO DE MEXICO" || n === "ESTADO DE MEX" || n === "EDO DE MEXICO" ||
      n === "EDO MEX" || n === "EDOMEX") return "MEXICO";
  if (n === "COAHUILA DE ZARAGOZA") return "COAHUILA";
  if (n === "MICHOACAN DE OCAMPO")  return "MICHOACAN";
  if (n === "VERACRUZ DE IGNACIO DE LA LLAVE" ||
      n === "VERACRUZ IGNACIO DE LA LLAVE")   return "VERACRUZ";
  if (n === "CIUDAD DE MEXICO" || n === "CDMX" ||
      n === "DISTRITO FEDERAL" || n === "DF")  return "CIUDAD DE MEXICO";
  return n;
}

function _calcMapVal(g, refCol, mktCols) {
  if (anMapMetrica === "prima") {
    return anProm(g, refCol);
  } else if (anMapMetrica === "ratio") {
    var ref  = anProm(g, refCol);
    var mkts = mktCols.map(function(c){ return anProm(g, c); })
                      .filter(function(v){ return !isNaN(v); });
    var minM = mkts.length ? Math.min.apply(null, mkts) : NaN;
    return (!isNaN(ref) && !isNaN(minM) && minM > 0) ? ref / minM : NaN;
  } else {
    var v = g.map(function(r){
      var p = Number(r[refCol]), va = Number(r["Valor Asegurado"]);
      return (!isNaN(p) && p > 0 && !isNaN(va) && va > 0) ? p / va * 100 : null;
    }).filter(function(x){ return x !== null; });
    return v.length ? v.reduce(function(a,b){return a+b;},0)/v.length : NaN;
  }
}

// ═══════════════════════════════════════════════════════
// MAPA COROPLÉTICO
// ═══════════════════════════════════════════════════════
function anRenderMapa(rows) {
  var anOut = document.getElementById("an-output");

  var _savedCenter = _anLeafletMap ? (_anLeafletMap._anSavedCenter || _anLeafletMap.getCenter()) : null;
  var _savedZoom   = _anLeafletMap ? (_anLeafletMap._anSavedZoom   || _anLeafletMap.getZoom())   : null;
  if (_anLeafletMap) { _anLeafletMap.remove(); _anLeafletMap = null; }
  _anMapContourUpdate = null; _anMapContourLayers = {};

  var descLabel = anDesc === "sin" ? "Sin descuento" : "Con descuento";
  var level     = anMapLevel;
  var allCols   = anDesc === "sin" ? AN_FILTROS.cols_sd : AN_FILTROS.cols_cd;

  // Columna activa según compañía seleccionada
  function getCompanyCol(base) {
    return "prima_" + base + (anDesc === "sin" ? "" : "_desc");
  }
  var activeCol = anMapCompany !== "todas" ? getCompanyCol(anMapCompany) : null;

  // GeoJSON según nivel
  var gj = null;
  if      (level === "cp"        && typeof AN_CP_GJ  !== "undefined" && AN_CP_GJ)  gj = AN_CP_GJ;
  else if (level === "municipio" && typeof AN_MUN_GJ !== "undefined" && AN_MUN_GJ) gj = AN_MUN_GJ;
  else if (typeof AN_EST_GJ !== "undefined" && AN_EST_GJ)  { gj = AN_EST_GJ; }
  else if (typeof AN_MUN_GJ !== "undefined" && AN_MUN_GJ)  { gj = AN_MUN_GJ; }

  if (!gj || typeof L === "undefined") {
    var msg = typeof L === "undefined" ? "Leaflet no disponible." : "GeoJSON no disponible para nivel <strong>" + level + "</strong>.";
    anOut.innerHTML = "<div class='an-card'><div class='an-card-header'>Mapa</div><div class='an-empty'>" + msg + "</div></div>";
    return;
  }

  // ── Agregar por geografía ──────────────────────────────────────────────────
  var geoMap = {};
  rows.forEach(function(r) {
    var k;
    if      (level === "cp")        k = String(r.CP||"").padStart ? String(r.CP||"").padStart(5,"0") : String(r.CP||"");
    else if (level === "municipio") k = _normEstado(r.Estado) + "|||" + _normStr(r.Municipio);
    else                            k = _normEstado(r.Estado);
    if (!k || k === "|||") return;
    if (!geoMap[k]) geoMap[k] = [];
    geoMap[k].push(r);
  });

  // ── Calcular valores ───────────────────────────────────────────────────────
  var valueMap   = {};   // k → valor numérico
  var companyMap = {};   // k → columna ganadora (solo modo "todas")

  Object.keys(geoMap).forEach(function(k) {
    var g = geoMap[k];
    if (anMapCompany !== "todas") {
      if (anMapMetrica === "prima") {
        valueMap[k] = anProm(g, activeCol);
      } else if (anMapMetrica === "ratio") {
        var ref    = anProm(g, activeCol);
        var mktC2  = allCols.filter(function(c){ return c !== activeCol; });
        var mkts2  = mktC2.map(function(c){ return anProm(g,c); }).filter(function(v){ return !isNaN(v); });
        var minM2  = mkts2.length ? Math.min.apply(null, mkts2) : NaN;
        valueMap[k] = (!isNaN(ref) && !isNaN(minM2) && minM2 > 0) ? ref / minM2 : NaN;
      } else {
        var vq = g.map(function(r){
          var p=Number(r[activeCol]),va=Number(r["Valor Asegurado"]);
          return (!isNaN(p)&&p>0&&!isNaN(va)&&va>0)?p/va*100:null;
        }).filter(function(x){return x!==null;});
        valueMap[k] = vq.length ? vq.reduce(function(a,b){return a+b;},0)/vq.length : NaN;
      }
    } else {
      // Modo "Todas": buscar compañía con valor mín/máx según métrica activa
      var best = null, bestVal = null;
      allCols.forEach(function(c) {
        var v;
        if (anMapMetrica === "cuota") {
          var vq2 = g.map(function(r) {
            var p = Number(r[c]), va = Number(r["Valor Asegurado"]);
            return (!isNaN(p) && p > 0 && !isNaN(va) && va > 0) ? p / va * 100 : null;
          }).filter(function(x){ return x !== null; });
          v = vq2.length ? vq2.reduce(function(a,b){return a+b;},0)/vq2.length : NaN;
        } else {
          v = anProm(g, c);
        }
        if (!isNaN(v) && v > 0) {
          if (best === null ||
              (anMapTodasMode === "min" && v < bestVal) ||
              (anMapTodasMode === "max" && v > bestVal)) {
            best = c; bestVal = v;
          }
        }
      });
      valueMap[k]   = bestVal;
      companyMap[k] = best;
    }
  });

  // Sets para contornos
  var _sampleEstados    = new Set(rows.map(function(r){ return _normEstado(r.Estado||""); }));
  var _sampleMunicipios = new Set(rows.map(function(r){ return _normEstado(r.Estado||"")+"|||"+_normStr(r.Municipio||""); }));
  var _sampleCPs        = new Set(rows.map(function(r){ return String(r.CP||"").padStart?String(r.CP||"").padStart(5,"0"):String(r.CP||""); }));

  function getKey(props) {
    if (level === "cp")        return String(props.cp || "");
    if (level === "municipio") return _normStr(props._nom_estado_norm||props._nom_estado||"")+"|||"+_normStr(props._nombre_norm||props._nombre||"");
    return _normStr(props._nom_estado_norm || props._nom_estado || "");
  }

  // ── Rango ──────────────────────────────────────────────────────────────────
  var vals    = Object.values(valueMap).filter(function(v){ return !isNaN(v) && v > 0; });
  var vmin    = vals.length ? Math.min.apply(null, vals) : 0;
  var vmax    = vals.length ? Math.max.apply(null, vals) : 1;
  var vsorted = vals.slice().sort(function(a,b){return a-b;});
  var vmed    = vsorted.length ? vsorted[Math.floor(vsorted.length/2)] : NaN;

  // ── Formato ────────────────────────────────────────────────────────────────
  var fmtV = anMapMetrica === "ratio"
    ? function(v){ return (v===undefined||isNaN(v))?"Sin datos":v.toFixed(3); }
    : anMapMetrica === "cuota"
    ? function(v){ return (v===undefined||isNaN(v))?"Sin datos":v.toFixed(3)+"%"; }
    : function(v){ return (v===undefined||isNaN(v))?"Sin datos":"$"+Math.round(v).toLocaleString("es-MX"); };

  // ── Color ──────────────────────────────────────────────────────────────────
  function getColor(v, k) {
    if (v === undefined || isNaN(v)) return "#e0e0e0";
    if (anMapCompany === "todas") {
      var co = companyMap[k];
      return co ? (AN_COLORS[co] || "#888") : "#e0e0e0";
    }
    if (anMapMetrica === "ratio") {
      if (v < 0.93) return "#14532d"; if (v < 0.96) return "#166534";
      if (v < 0.98) return "#22c55e"; if (v < 1.00) return "#86efac";
      if (v < 1.02) return "#fef08a"; if (v < 1.05) return "#fb923c";
      if (v < 1.10) return "#ef4444"; return "#991b1b";
    }
    var t   = Math.max(0, Math.min(1, (v - vmin) / (vmax - vmin || 1)));
    var pal = AN_COMPANY_PALETTES[anMapCompany] || AN_COMPANY_PALETTES["allianz"];
    return pal[Math.round(t * (pal.length - 1))];
  }

  // ── DOM ────────────────────────────────────────────────────────────────────
  anOut.innerHTML = "";
  var card = document.createElement("div");
  card.className = "an-card";

  var isTodas = (anMapCompany === "todas");
  var coLabel = isTodas
    ? "Todas — " + (anMapTodasMode === "min" ? "M\u00e1s barata" : "M\u00e1s cara")
    : (AN_COMPANY_LABELS_SHORT[anMapCompany] || anMapCompany);
  var metLabel = !isTodas && anMapMetrica === "ratio" ? " — Ratio vs Mkt"
               : !isTodas && anMapMetrica === "cuota" ? " — Cuota (Prima/VA)"
               : " — Prima promedio";

  var hdr = document.createElement("div");
  hdr.className   = "an-card-header";
  hdr.textContent = "Mapa — " + coLabel + metLabel + " — " + descLabel;
  card.appendChild(hdr);

  // ── Barra de controles ─────────────────────────────────────────────────────
  var cpModeHtml = level === "cp"
    ? "<div style='width:1px;height:20px;background:#ddd;margin:0 2px'></div>" +
      "<span style='font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px'>Vista CP</span>" +
      "<div class='cob-tabs' id='an-map-cp-mode'>" +
        "<div class='cob-tab " + (anMapCpMode==="puntos"   ?"active":"") + "' onclick=\"anSetMapCpMode('puntos')\">Puntos</div>" +
        "<div class='cob-tab " + (anMapCpMode==="poligonos"?"active":"") + "' onclick=\"anSetMapCpMode('poligonos')\">Pol\u00edgonos</div>" +
      "</div>"
    : "";

  // Botones de compañía con dot de color
  var companies = ["allianz","chubb","gnp","hdi","qualitas"];
  var compHtml =
    "<div style='width:1px;height:20px;background:#ddd;margin:0 2px'></div>" +
    "<span style='font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px'>Compa\u00f1\u00eda</span>" +
    "<div class='cob-tabs' id='an-map-company'>";
  companies.forEach(function(co) {
    var dotCol = AN_COLORS[getCompanyCol(co)] || "#888";
    compHtml +=
      "<div class='cob-tab " + (anMapCompany===co?"active":"") +
      "' data-co='" + co + "' onclick=\"anSetMapCompany('" + co + "')\">" +
      "<span style='display:inline-block;width:8px;height:8px;background:" + dotCol +
      ";border-radius:50%;margin-right:4px;vertical-align:middle'></span>" +
      AN_COMPANY_LABELS_SHORT[co] + "</div>";
  });
  compHtml +=
    "<div class='cob-tab " + (anMapCompany==="todas"?"active":"") +
    "' data-co='todas' onclick=\"anSetMapCompany('todas')\">Todas</div>" +
    "</div>";

  // Sub-opción "Todas": Mínimo/Máximo
  var todasHtml = isTodas
    ? "<div class='cob-tabs' id='an-map-todas-mode'>" +
        "<div class='cob-tab " + (anMapTodasMode==="min"?"active":"") + "' onclick=\"anSetMapTodasMode('min')\">M\u00e1s barata</div>" +
        "<div class='cob-tab " + (anMapTodasMode==="max"?"active":"") + "' onclick=\"anSetMapTodasMode('max')\">M\u00e1s cara</div>" +
      "</div>"
    : "";

  // Métrica (solo cuando no es "Todas")
  var metHtml =
    "<div style='width:1px;height:20px;background:#ddd;margin:0 2px'></div>" +
      "<span style='font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px'>M\u00e9trica</span>" +
      "<div class='cob-tabs' id='an-map-metrica'>" +
        "<div class='cob-tab " + (anMapMetrica==="prima"?"active":"") + "' onclick=\"anSetMapMetrica('prima')\">Prima</div>" +
        "<div class='cob-tab " + (anMapMetrica==="ratio"?"active":"") + "' onclick=\"anSetMapMetrica('ratio')\">Ratio vs Mkt</div>" +
        "<div class='cob-tab " + (anMapMetrica==="cuota"?"active":"") + "' onclick=\"anSetMapMetrica('cuota')\">Cuota</div>" +
      "</div>";

  var cntHtml =
    "<div style='width:1px;height:20px;background:#ddd;margin:0 2px'></div>" +
    "<span style='font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px'>Contornos</span>" +
    "<div class='cob-tabs'>" +
      "<div class='cob-tab " + (anMapContornos.estado    ?"active":"") + "' id='an-cnt-estado'    onclick=\"anToggleContorno('estado')\">Estados</div>" +
      "<div class='cob-tab " + (anMapContornos.municipio ?"active":"") + "' id='an-cnt-municipio' onclick=\"anToggleContorno('municipio')\">Municipios</div>" +
      "<div class='cob-tab " + (anMapContornos.cp        ?"active":"") + "' id='an-cnt-cp'        onclick=\"anToggleContorno('cp')\">CPs</div>" +
    "</div>" +
    "<div class='cob-tabs' id='an-map-cnt-scope'>" +
      "<div class='cob-tab " + (anMapContornoScope==="muestra"?"active":"") + "' onclick=\"anSetContornoScope('muestra')\">Solo muestra</div>" +
      "<div class='cob-tab " + (anMapContornoScope==="todos"  ?"active":"") + "' onclick=\"anSetContornoScope('todos')\">Todos</div>" +
    "</div>";

  var ctrl = document.createElement("div");
  ctrl.style.cssText =
    "display:flex;gap:8px;align-items:center;flex-wrap:wrap;" +
    "padding:10px 16px;background:#f8faff;border-bottom:1px solid #e8ecf8;";
  ctrl.innerHTML =
    "<span style='font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.5px'>Nivel</span>" +
    "<div class='cob-tabs' id='an-map-level'>" +
      "<div class='cob-tab " + (anMapLevel==="estado"   ?"active":"") + "' onclick=\"anSetMapLevel('estado')\">Estado</div>" +
      "<div class='cob-tab " + (anMapLevel==="municipio"?"active":"") + "' onclick=\"anSetMapLevel('municipio')\">Municipio</div>" +
      "<div class='cob-tab " + (anMapLevel==="cp"       ?"active":"") + "' onclick=\"anSetMapLevel('cp')\">CP</div>" +
    "</div>" +
    cpModeHtml + compHtml + todasHtml + metHtml + cntHtml +
    "<div style='margin-left:auto;font-size:10px;color:#aaa'>" + vals.length + " zonas con datos</div>";
  card.appendChild(ctrl);

  var mapDiv = document.createElement("div");
  mapDiv.id = "an-mapa-leaflet";
  mapDiv.style.cssText = "height:560px;width:100%;";
  card.appendChild(mapDiv);
  anOut.appendChild(card);

  // ── Leaflet ────────────────────────────────────────────────────────────────
  setTimeout(function() {
    var initCenter = _savedCenter || [23.5, -102.5];
    var initZoom   = (_savedZoom !== null && _savedZoom !== undefined) ? _savedZoom : 5;

    _anLeafletMap = L.map("an-mapa-leaflet", {
      center: initCenter, zoom: initZoom,
      zoomControl: true, attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom:18 }).addTo(_anLeafletMap);

    // Info box
    var info = L.control({ position: "topright" });
    info.onAdd = function() {
      this._div = L.DomUtil.create("div");
      this._div.style.cssText =
        "background:white;padding:9px 13px;border-radius:7px;box-shadow:0 2px 10px rgba(0,0,0,.18);" +
        "font-family:'Segoe UI',sans-serif;font-size:12px;min-width:160px;display:none;";
      return this._div;
    };
    info.update = function(props, v, k) {
      if (!props) { this._div.style.display = "none"; return; }
      this._div.style.display = "block";
      var name   = props._nombre || props.cp || props._nom_estado || "\u2014";
      var estado = (level !== "estado") ? (props._nom_estado || "") : "";

      // Encabezado: nombre de zona
      var html = "<strong style=\'display:block;font-size:11px;color:#1a1a2e;margin-bottom:2px\'>" + name + "</strong>";
      if (estado) html += "<div style=\'font-size:10px;color:#888;margin-bottom:4px\'>" + estado + "</div>";

      // Modo Todas: resaltar ganadora
      if (isTodas && k) {
        var co   = companyMap[k];
        var coLb = co ? (AN_LABELS[co] || co) : "\u2014";
        var dotW = "<span style=\'display:inline-block;width:9px;height:9px;background:" +
                   getColor(v, k) + ";border-radius:50%;vertical-align:middle;margin-right:5px\'></span>";
        html += "<div style=\'font-size:12px;font-weight:700;margin-bottom:4px;padding-bottom:4px;" +
                "border-bottom:1px solid #e0e0e0\'>" + dotW + coLb + " &mdash; " + fmtV(v) + "</div>";
      }

      // Tabla de todas las aseguradoras (Allianz/activa primero)
      var allRows = geoMap[k];
      if (allRows && allRows.length) {
        var _ref2 = activeCol || (anDesc === "sin" ? "prima_allianz" : "prima_allianz_desc");
        var ordCols = [_ref2].concat(allCols.filter(function(c){ return c !== _ref2; }));
        ordCols.forEach(function(c) {
          // Calcular valor según métrica activa
          var avg;
          if (anMapMetrica === "cuota") {
            var cq = allRows.map(function(r) {
              var p=Number(r[c]), va=Number(r["Valor Asegurado"]);
              return (!isNaN(p)&&p>0&&!isNaN(va)&&va>0) ? p/va*100 : null;
            }).filter(function(x){ return x!==null; });
            avg = cq.length ? cq.reduce(function(a,b){return a+b;},0)/cq.length : NaN;
          } else if (anMapMetrica === "ratio" && !isTodas) {
            // ratio de esta compañía vs min del resto
            var others = allCols.filter(function(x){ return x !== c; });
            var refV   = anProm(allRows, c);
            var othVs  = others.map(function(x){ return anProm(allRows,x); }).filter(function(x){return !isNaN(x);});
            var minOth = othVs.length ? Math.min.apply(null, othVs) : NaN;
            avg = (!isNaN(refV)&&!isNaN(minOth)&&minOth>0) ? refV/minOth : NaN;
          } else {
            avg = anProm(allRows, c);
          }
          var isRef  = (c === _ref2);
          var colDot = "<span style=\'display:inline-block;width:7px;height:7px;background:" +
                       (AN_COLORS[c]||"#888") + ";border-radius:50%;margin-right:5px;vertical-align:middle\'></span>";
          var valStr;
          if (isNaN(avg)) {
            valStr = "\u2014";
          } else if (anMapMetrica === "cuota") {
            valStr = avg.toFixed(3)+"%";
          } else if (anMapMetrica === "ratio") {
            valStr = avg.toFixed(3);
          } else {
            valStr = "$"+Math.round(avg).toLocaleString("es-MX");
          }
          html += "<div style=\'display:flex;justify-content:space-between;align-items:center;" +
                  "padding:2px 0;border-top:1px solid #f3f3f3;" +
                  (isRef?"font-weight:700;color:#003A8F;":"color:#444;")+"font-size:11px\'>" +
                  "<span>"+colDot+(AN_LABELS[c]||c)+"</span>" +
                  "<span style=\'margin-left:12px\'>"+valStr+"</span></div>";
        });
      }
      this._div.innerHTML = html;
    };
    info.addTo(_anLeafletMap);

    // Leyenda
    var legend = L.control({ position: "bottomright" });
    legend.onAdd = function() {
      var d = L.DomUtil.create("div");
      d.style.cssText =
        "background:white;padding:10px 14px;border-radius:7px;box-shadow:0 2px 10px rgba(0,0,0,.18);" +
        "font-family:'Segoe UI',sans-serif;font-size:11px;min-width:150px;";
      if (isTodas) {
        d.innerHTML = "<div style='font-weight:700;margin-bottom:6px;color:#1a1a2e'>" +
          (anMapTodasMode==="min"?"M\u00e1s barata":"M\u00e1s cara") + " por zona</div>";
        allCols.forEach(function(c) {
          var col  = AN_COLORS[c] || "#888";
          var lbl  = AN_LABELS[c] || c;
          d.innerHTML += "<div style='display:flex;align-items:center;gap:6px;margin:3px 0'>" +
            "<span style='width:14px;height:14px;background:" + col + ";display:inline-block;border-radius:3px;flex-shrink:0'></span>" +
            "<span style='color:#444'>" + lbl + "</span></div>";
        });
      } else if (anMapMetrica === "ratio") {
        d.innerHTML = "<div style='font-weight:700;margin-bottom:6px;color:#1a1a2e'>Ratio</div>";
        [["< 0.93","#14532d"],["0.93\u20130.96","#166534"],["0.96\u20130.98","#22c55e"],
         ["0.98\u20131.00","#86efac"],["1.00\u20131.02","#fef08a"],["1.02\u20131.05","#fb923c"],
         ["1.05\u20131.10","#ef4444"],["> 1.10","#991b1b"]
        ].forEach(function(s){
          d.innerHTML += "<div style='display:flex;align-items:center;gap:6px;margin:2px 0'>" +
            "<span style='width:14px;height:10px;background:" + s[1] + ";display:inline-block;border-radius:2px;flex-shrink:0'></span>" +
            "<span style='color:#555'>" + s[0] + "</span></div>";
        });
      } else {
        var pal  = AN_COMPANY_PALETTES[anMapCompany] || AN_COMPANY_PALETTES["allianz"];
        var title = anMapMetrica === "cuota" ? "Cuota %" : "Prima $";
        d.innerHTML = "<div style='font-weight:700;margin-bottom:6px;color:#1a1a2e'>" + title + "</div>" +
          "<div style='height:10px;width:100%;background:linear-gradient(to right," + pal.join(",") + ");border-radius:3px;margin-bottom:4px'></div>" +
          "<div style='display:flex;justify-content:space-between;color:#888;font-size:10px'><span>" + fmtV(vmin) + "</span><span>" + fmtV(vmax) + "</span></div>" +
          "<div style='margin-top:5px;font-size:10px;color:#888'>Mediana: " + fmtV(vmed) + "</div>";
      }
      d.innerHTML += "<div style='margin-top:6px;font-size:9px;color:#bbb;display:flex;align-items:center;gap:4px'>" +
        "<span style='width:10px;height:7px;background:#e0e0e0;display:inline-block;border-radius:1px'></span>Sin datos</div>";
      return d;
    };
    legend.addTo(_anLeafletMap);

    // ── Estilos polígono ──────────────────────────────────────────────────────
    function polyStyle(feat) {
      var k = getKey(feat.properties);
      var v = valueMap[k];
      return {
        fillColor:   getColor(v, k),
        fillOpacity: (v === undefined || isNaN(v)) ? 0.22 : 0.82,
        color:       "#ffffff",
        weight:      level === "municipio" ? 0.5 : level === "estado" ? 1 : 0.3,
        opacity:     0.8,
      };
    }

    // ── Capa de datos ─────────────────────────────────────────────────────────
    if (level === "cp" && anMapCpMode === "puntos") {
      gj.features.forEach(function(feat) {
        var k   = getKey(feat.properties);
        var v   = valueMap[k];
        var ctr = _centroid(feat);
        if (!ctr) return;
        var fc  = getColor(v, k);
        var circle = L.circleMarker(ctr, {
          radius: 9, fillColor: fc,
          fillOpacity: (v===undefined||isNaN(v)) ? 0.3 : 0.88, color: "white", weight: 1.5,
        });
        circle.on({
          mouseover: function(e) {
            e.target.setStyle({ radius:14, weight:2.5, fillOpacity:1 });
            info.update(feat.properties, v, k);
          },
          mouseout: function(e) {
            e.target.setStyle({ radius:9, weight:1.5, fillOpacity:(v===undefined||isNaN(v))?0.3:0.88 });
            info.update(null, null, null);
          },
        });
        circle.addTo(_anLeafletMap);
      });
    } else {
      L.geoJSON(gj, {
        style: polyStyle,
        onEachFeature: function(feat, layer) {
          var k = getKey(feat.properties);
          var v = valueMap[k];
          layer.on({
            mouseover: function(e) {
              e.target.setStyle({ fillColor:getColor(v,k), fillOpacity:0.95, color:"#1a1a2e", weight:2.5 });
              info.update(feat.properties, v, k);
            },
            mouseout: function(e) {
              e.target.setStyle(polyStyle(feat));
              info.update(null, null, null);
            },
          });
        },
      }).addTo(_anLeafletMap);
    }

    // ── Contornos ─────────────────────────────────────────────────────────────
    _anMapContourUpdate = function(type, active) {
      if (_anMapContourLayers[type]) {
        _anLeafletMap.removeLayer(_anMapContourLayers[type]);
        _anMapContourLayers[type] = null;
      }
      if (!active || !_anLeafletMap) return;
      var cntGj;
      if (type === "estado") {
        cntGj = (typeof AN_EST_GJ !== "undefined" && AN_EST_GJ) ? AN_EST_GJ : null;
      } else if (type === "municipio") {
        if (anMapContornoScope === "todos" && typeof AN_MUN_ALL_GJ !== "undefined" && AN_MUN_ALL_GJ)
          cntGj = AN_MUN_ALL_GJ;
        else
          cntGj = (typeof AN_MUN_GJ !== "undefined" && AN_MUN_GJ) ? AN_MUN_GJ : null;
      } else {
        if (anMapContornoScope === "todos" && typeof AN_CP_ALL_GJ !== "undefined" && AN_CP_ALL_GJ)
          cntGj = AN_CP_ALL_GJ;
        else
          cntGj = (typeof AN_CP_GJ !== "undefined" && AN_CP_GJ) ? AN_CP_GJ : null;
      }
      if (!cntGj) return;
      var wt       = type === "estado" ? 1.8 : type === "municipio" ? 0.8 : 0.35;
      var sampleSt = type === "cp" ? _sampleCPs : type === "municipio" ? _sampleMunicipios : _sampleEstados;
      function getCntKey(props) {
        if (type === "cp")        return String(props.cp || "");
        if (type === "municipio") return _normStr(props._nom_estado_norm||props._nom_estado||"")+"|||"+
                                         _normStr(props._nombre_norm    ||props._nombre    ||"");
        return _normStr(props._nom_estado_norm || props._nom_estado || "");
      }
      _anMapContourLayers[type] = L.geoJSON(cntGj, {
        interactive: false,
        style: function(feat) {
          var inSample = anMapContornoScope === "todos" || sampleSt.has(getCntKey(feat.properties));
          return {
            fillOpacity: 0,
            color:     inSample ? "#111111" : "#cccccc",
            weight:    inSample ? wt : wt * 0.5,
            opacity:   inSample ? 0.80 : 0.35,
            dashArray: inSample ? null : "3,5",
          };
        },
      }).addTo(_anLeafletMap);
      _anMapContourLayers[type].bringToFront();
    };
    Object.keys(anMapContornos).forEach(function(type) {
      if (anMapContornos[type]) _anMapContourUpdate(type, true);
    });

    _anLeafletMap.invalidateSize();
  }, 60);

  // Stats
  var rmed  = document.getElementById("an-rmed");
  var rcaro = document.getElementById("an-rcaro");
  if (rmed)  rmed.textContent  = isNaN(vmed) ? "\u2014" : fmtV(vmed);
  if (rcaro) rcaro.textContent = vals.length + " zonas";
}