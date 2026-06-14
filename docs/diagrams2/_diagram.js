/** Ортогональная маршрутизация SVG-стрелок без пересечений (Manhattan routing). */
function orthH(x1, y1, x2, y2, bendX) {
  const bx = bendX ?? Math.round((x1 + x2) / 2);
  return `M ${x1} ${y1} H ${bx} V ${y2} H ${x2}`;
}

function orthV(x1, y1, x2, y2, bendY) {
  const by = bendY ?? Math.round((y1 + y2) / 2);
  return `M ${x1} ${y1} V ${by} H ${x2} V ${y2}`;
}

function spineRoute(actorX, actorY, spineX, targetX, targetY) {
  return `M ${actorX} ${actorY} H ${spineX} V ${targetY} H ${targetX}`;
}

function addMarkerDefs(svg, id, color) {
  const defs = svg.querySelector("defs") || document.createElementNS("http://www.w3.org/2000/svg", "defs");
  if (!svg.querySelector("defs")) svg.prepend(defs);
  if (svg.querySelector(`#${id}`)) return;
  const m = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  m.setAttribute("id", id);
  m.setAttribute("viewBox", "0 0 10 10");
  m.setAttribute("refX", "9");
  m.setAttribute("refY", "5");
  m.setAttribute("markerWidth", "6");
  m.setAttribute("markerHeight", "6");
  m.setAttribute("orient", "auto");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M0,0 L10,5 L0,10 z");
  p.setAttribute("fill", color);
  m.appendChild(p);
  defs.appendChild(m);
}

function drawAssoc(svg, d, { dashed = false, color = "#7a8a90", marker = "arr", arrow = true } = {}) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "1.2");
  path.setAttribute("opacity", "0.65");
  if (dashed) path.setAttribute("stroke-dasharray", "5 4");
  if (arrow) path.setAttribute("marker-end", `url(#${marker})`);
  path.classList.add("assoc-line");
  svg.appendChild(path);
  return path;
}

function bindHighlight(groups, lines, infoEl, data) {
  const reset = () => {
    groups.forEach((g) => g.classList.remove("dim", "active"));
    lines.forEach((l) => l.classList.remove("dim", "highlight"));
    if (infoEl) infoEl.classList.remove("open");
  };

  groups.forEach((g) => {
    g.addEventListener("click", () => {
      const key = g.dataset.key;
      const item = data[key];
      if (!item) return;
      const cat = item.cat;
      reset();
      g.classList.add("active");
      groups.forEach((o) => {
        if (o !== g && o.dataset.cat && o.dataset.cat !== cat) o.classList.add("dim");
      });
      lines.forEach((l) => l.classList.add("dim"));
      if (infoEl) {
        infoEl.innerHTML = `<h3>${item.id} · ${item.name}</h3><p>${item.desc}</p><p class="mono" style="margin-top:8px;font-size:12px;color:var(--ink-3)">${item.file || ""}</p>`;
        infoEl.classList.add("open");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".diagram-svg") && !e.target.closest(".info-panel")) reset();
  });
}

function initTabs(root = document) {
  const tabs = root.querySelectorAll(".tab");
  const panels = root.querySelectorAll(".tab-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      panels.forEach((p) => p.classList.toggle("active", p.id === id));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => initTabs());
