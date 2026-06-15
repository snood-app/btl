const storeKey = "btl-giro-visite-updates-v1";

const els = {
  search: document.querySelector("#searchInput"),
  province: document.querySelector("#provinceFilter"),
  zone: document.querySelector("#zoneFilter"),
  cycle: document.querySelector("#cycleFilter"),
  priority: document.querySelector("#priorityFilter"),
  list: document.querySelector("#list"),
  visibleCount: document.querySelector("#visibleCount"),
  dueCount: document.querySelector("#dueCount"),
  visitedCount: document.querySelector("#visitedCount"),
  topLimit: document.querySelector("#topLimitFilter"),
  overdueList: document.querySelector("#overdueList"),
  newClient: document.querySelector("#newClientBtn"),
  reportDate: document.querySelector("#reportDateField"),
  baseLocation: document.querySelector("#baseLocationField"),
  dailyKm: document.querySelector("#dailyKmField"),
  periodType: document.querySelector("#periodTypeField"),
  periodReport: document.querySelector("#periodReportBtn"),
  dailyReport: document.querySelector("#dailyReportBtn"),
  dailyReportList: document.querySelector("#dailyReportList"),
  backupBtn: document.querySelector("#backupBtn"),
  restoreBtn: document.querySelector("#restoreBtn"),
  restoreFile: document.querySelector("#restoreFileInput"),
  exportBtn: document.querySelector("#exportBtn"),
  dialog: document.querySelector("#detailDialog"),
  detailMeta: document.querySelector("#detailMeta"),
  detailName: document.querySelector("#detailName"),
  detailOrg: document.querySelector("#detailOrg"),
  callLink: document.querySelector("#callLink"),
  mapsLink: document.querySelector("#mapsLink"),
  visitToday: document.querySelector("#visitTodayBtn"),
  calendarDate: document.querySelector("#calendarDateField"),
  calendarTime: document.querySelector("#calendarTimeField"),
  calendarBtn: document.querySelector("#calendarBtn"),
  entryTime: document.querySelector("#entryTimeField"),
  exitTime: document.querySelector("#exitTimeField"),
  entryNow: document.querySelector("#entryNowBtn"),
  exitNow: document.querySelector("#exitNowBtn"),
  editName: document.querySelector("#editNameField"),
  editOrg: document.querySelector("#editOrgField"),
  editPhone: document.querySelector("#editPhoneField"),
  editEmail: document.querySelector("#editEmailField"),
  editAddress: document.querySelector("#editAddressField"),
  editCity: document.querySelector("#editCityField"),
  status: document.querySelector("#statusField"),
  cadence: document.querySelector("#cadenceField"),
  lastVisit: document.querySelector("#lastVisitField"),
  followUp: document.querySelector("#followUpField"),
  yourPriority: document.querySelector("#yourPriorityField"),
  outcome: document.querySelector("#outcomeField"),
  nextAction: document.querySelector("#nextActionField"),
  notes: document.querySelector("#notesField"),
  activityType: document.querySelector("#activityTypeField"),
  activityText: document.querySelector("#activityTextField"),
  addActivity: document.querySelector("#addActivityBtn"),
  activityList: document.querySelector("#activityList"),
  deleteContact: document.querySelector("#deleteContactBtn"),
};

let contacts = [];
let updates = loadUpdates();
let activeId = null;
let dailyMeta = loadDailyMeta();

function loadUpdates() {
  try {
    return JSON.parse(localStorage.getItem(storeKey) || "{}");
  } catch {
    return {};
  }
}

function saveUpdates() {
  localStorage.setItem(storeKey, JSON.stringify(updates));
}

function loadDailyMeta() {
  try {
    return JSON.parse(localStorage.getItem("btl-giro-visite-daily-meta-v1") || "{}");
  } catch {
    return {};
  }
}

function saveDailyMeta() {
  localStorage.setItem("btl-giro-visite-daily-meta-v1", JSON.stringify(dailyMeta));
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + Number(days || 21));
  return date.toISOString().slice(0, 10);
}

function daysBetween(dateString) {
  if (!dateString) return "";
  const start = new Date(`${dateString}T00:00:00`);
  const now = new Date(`${todayString()}T00:00:00`);
  return Math.floor((now - start) / 86400000);
}

function getState(contact) {
  const saved = updates[contact.id] || {};
  return {
    deleted: Boolean(saved.deleted),
    name: saved.name || contact.name,
    org: saved.org || contact.org,
    phone: saved.phone || contact.phone,
    email: saved.email || contact.email,
    address: saved.address || contact.address,
    city: saved.city || contact.city,
    status: saved.status || contact.defaultStatus || "Attivo",
    cadence: saved.cadence || "21",
    lastVisit: saved.lastVisit || "",
    followUp: saved.followUp || "",
    yourPriority: saved.yourPriority || "",
    outcome: saved.outcome || "",
    nextAction: saved.nextAction || "",
    notes: saved.notes || "",
    entryTime: saved.entryTime || "",
    exitTime: saved.exitTime || "",
    visitDate: saved.visitDate || "",
    activities: Array.isArray(saved.activities) ? saved.activities : [],
    touchedAt: saved.touchedAt || "",
  };
}

function cycleState(contact) {
  const state = getState(contact);
  if (state.deleted) return "Escluso";
  if (["Non target", "Chiuso", "Non trovato"].includes(state.status)) return "Escluso";
  if (state.followUp) {
    if (state.followUp <= todayString()) return "Da visitare";
    const days = daysBetween(todayString()) - daysBetween(state.followUp);
    return days <= 7 ? "In scadenza" : "Non ancora";
  }
  if (!state.lastVisit) return "Mai visitato";
  const next = addDays(state.lastVisit, state.cadence);
  if (next < todayString()) return "Scaduto";
  if (next === todayString()) return "Da visitare";
  const diff = daysBetween(todayString()) - daysBetween(next);
  return diff <= 7 ? "In scadenza" : "Non ancora";
}

function nextVisit(contact) {
  const state = getState(contact);
  if (state.deleted) return "";
  if (["Non target", "Chiuso", "Non trovato"].includes(state.status)) return "";
  if (state.followUp) return state.followUp;
  if (!state.lastVisit) return todayString();
  return addDays(state.lastVisit, state.cadence);
}

function overdueDays(contact) {
  const next = nextVisit(contact);
  if (!next) return 0;
  const days = daysBetween(next);
  return days > 0 ? days : 0;
}

function phoneHref(phone) {
  const first = (phone || "").split("|")[0].replace(/[^\d+]/g, "");
  return first ? `tel:${first}` : "#";
}

function chipClass(label) {
  if (label === "Da visitare" || label === "Mai visitato") return "due";
  if (label === "In scadenza") return "warn";
  if (label === "Scaduto") return "danger";
  if (label === "Escluso") return "off";
  return "";
}

function populateFilters() {
  els.province.replaceChildren(new Option("Tutte le province", ""));
  els.zone.replaceChildren(new Option("Tutte le zone", ""));
  const provinces = [...new Set(contacts.map((c) => c.province).filter(Boolean))].sort();
  const zones = [...new Set(contacts.map((c) => c.zone).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
  for (const province of provinces) {
    els.province.append(new Option(province, province));
  }
  for (const zone of zones) {
    els.zone.append(new Option(zone, zone));
  }
}

function filteredContacts() {
  const q = els.search.value.trim().toLowerCase();
  return contacts.filter((contact) => {
    const state = getState(contact);
    const cycle = cycleState(contact);
    const haystack = [state.name, state.org, state.city, contact.zone, contact.type, state.phone].join(" ").toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (els.province.value && contact.province !== els.province.value) return false;
    if (els.zone.value && contact.zone !== els.zone.value) return false;
    if (els.cycle.value && cycle !== els.cycle.value) return false;
    if (!els.cycle.value && state.deleted) return false;
    const priority = state.yourPriority || contact.priority;
    if (els.priority.value && priority !== els.priority.value) return false;
    return true;
  }).sort((a, b) => {
    const zone = String(a.zone).localeCompare(String(b.zone), "it");
    if (zone) return zone;
    const city = String(a.city).localeCompare(String(b.city), "it");
    if (city) return city;
    const statusWeight = { "Scaduto": 1, "Da visitare": 2, "Mai visitato": 3, "In scadenza": 4, "Non ancora": 5, "Escluso": 9 };
    const byStatus = (statusWeight[cycleState(a)] || 8) - (statusWeight[cycleState(b)] || 8);
    if (byStatus) return byStatus;
    return String(a.name).localeCompare(String(b.name), "it");
  });
}

function renderList() {
  const visible = filteredContacts();
  els.visibleCount.textContent = visible.length;
  els.dueCount.textContent = contacts.filter((c) => ["Da visitare", "Scaduto", "Mai visitato"].includes(cycleState(c))).length;
  els.visitedCount.textContent = Object.values(updates).filter((u) => u.lastVisit).length;
  renderOverdue();
  renderDailyReport();
  els.list.replaceChildren();

  const fragment = document.createDocumentFragment();
  for (const contact of visible.slice(0, 250)) {
    const state = getState(contact);
    const cycle = cycleState(contact);
    const row = document.createElement("button");
    row.className = "row";
    row.type = "button";
    row.addEventListener("click", () => openDetail(contact.id));
    row.innerHTML = `
      <div class="rowTop">
        <div>
          <h3>${escapeHtml(state.name)}</h3>
          <p>${escapeHtml(state.org || contact.type || "")}</p>
        </div>
      </div>
      <div class="chips">
        <span class="chip">${escapeHtml(contact.province || "-")}</span>
        <span class="chip">${escapeHtml(state.city || "-")}</span>
        <span class="chip ${chipClass(cycle)}">${escapeHtml(cycle)}</span>
        <span class="chip">${escapeHtml(state.yourPriority || contact.priority || "-")}</span>
      </div>
      <p>${escapeHtml(contact.zone || "")}</p>
      <p>Prossima: ${escapeHtml(nextVisit(contact) || "-")}</p>
    `;
    fragment.append(row);
  }
  els.list.append(fragment);
}

function renderOverdue() {
  const limit = Number(els.topLimit.value || 10);
  const items = contacts
    .filter((contact) => {
      const state = getState(contact);
      return !state.deleted && !["Non target", "Chiuso", "Non trovato"].includes(state.status) && overdueDays(contact) > 0;
    })
    .sort((a, b) => overdueDays(b) - overdueDays(a))
    .slice(0, limit);
  els.overdueList.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nessun contatto fuori frequenza.";
    els.overdueList.append(empty);
    return;
  }
  for (const contact of items) {
    const state = getState(contact);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "overdueItem";
    button.addEventListener("click", () => openDetail(contact.id));
    button.innerHTML = `
      <strong>${escapeHtml(state.name)}</strong>
      <span>${overdueDays(contact)} giorni fuori frequenza · ${escapeHtml(contact.province)} · ${escapeHtml(state.city)}</span>
    `;
    els.overdueList.append(button);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function openDetail(id) {
  activeId = id;
  const contact = contacts.find((item) => item.id === id);
  const state = getState(contact);
  els.detailMeta.textContent = `${contact.province} - ${state.city} - ${contact.type}`;
  els.detailName.textContent = state.name;
  els.detailOrg.textContent = state.org || state.address || "";
  els.callLink.href = phoneHref(state.phone);
  els.callLink.toggleAttribute("aria-disabled", !state.phone);
  els.mapsLink.href = contact.maps || "#";
  els.calendarDate.value = state.followUp || nextVisit(contact) || todayString();
  els.calendarTime.value = els.calendarTime.value || "09:00";
  els.entryTime.value = state.entryTime;
  els.exitTime.value = state.exitTime;
  els.editName.value = state.name;
  els.editOrg.value = state.org;
  els.editPhone.value = state.phone;
  els.editEmail.value = state.email;
  els.editAddress.value = state.address;
  els.editCity.value = state.city;
  els.status.value = state.status;
  els.cadence.value = state.cadence;
  els.lastVisit.value = state.lastVisit;
  els.followUp.value = state.followUp;
  els.yourPriority.value = state.yourPriority;
  els.outcome.value = state.outcome;
  els.nextAction.value = state.nextAction;
  els.notes.value = state.notes;
  els.activityType.value = "Visita";
  els.activityText.value = "";
  renderActivities(state.activities);
  els.deleteContact.textContent = state.deleted ? "Ripristina nel giro" : "Nascondi dal giro";
  els.dialog.showModal();
}

function renderActivities(activities = []) {
  els.activityList.replaceChildren();
  if (!activities.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nessuna attivita registrata.";
    els.activityList.append(empty);
    return;
  }
  for (const activity of [...activities].reverse().slice(0, 20)) {
    const item = document.createElement("div");
    item.className = "activityItem";
    item.innerHTML = `
      <strong>${escapeHtml(activity.date)} · ${escapeHtml(activity.type)}</strong>
      <p>${escapeHtml(activity.text)}</p>
    `;
    els.activityList.append(item);
  }
}

function updateActive(patch) {
  if (!activeId) return;
  updates[activeId] = {
    ...getState(contacts.find((item) => item.id === activeId)),
    ...patch,
    touchedAt: new Date().toISOString(),
  };
  saveUpdates();
  renderList();
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function renderDailyReport() {
  const today = els.reportDate.value || todayString();
  const visited = contacts
    .filter((contact) => {
      const state = getState(contact);
      return state.lastVisit === today || state.visitDate === today;
    })
    .sort((a, b) => String(getState(a).entryTime || "99:99").localeCompare(String(getState(b).entryTime || "99:99")));
  els.dailyReportList.replaceChildren();
  if (!visited.length) {
    const empty = document.createElement("p");
    empty.textContent = "Nessuna visita registrata oggi.";
    els.dailyReportList.append(empty);
    return;
  }
  for (const contact of visited) {
    const state = getState(contact);
    const item = document.createElement("button");
    item.type = "button";
    item.className = "overdueItem";
    item.addEventListener("click", () => openDetail(contact.id));
    item.innerHTML = `
      <strong>${escapeHtml(state.name)}</strong>
      <span>${escapeHtml(state.city)} · ingresso ${escapeHtml(state.entryTime || "-")} · uscita ${escapeHtml(state.exitTime || "-")}</span>
    `;
    els.dailyReportList.append(item);
  }
}

function addNewClient() {
  const id = `N${Date.now()}`;
  const newContact = {
    id,
    name: "Nuovo cliente",
    org: "",
    type: "Da classificare",
    priority: "Da valutare",
    province: "",
    city: "",
    zone: "Da geolocalizzare",
    phone: "",
    email: "",
    address: "",
    cap: "",
    maps: "",
    defaultStatus: "Attivo",
    isNew: true,
  };
  contacts.unshift(newContact);
  updates[id] = {
    ...getState(newContact),
    isNew: true,
    status: "Da verificare",
    touchedAt: new Date().toISOString(),
  };
  saveUpdates();
  populateFilters();
  renderList();
  openDetail(id);
}

function calendarDateTime(date, time) {
  const cleanTime = (time || "09:00").replace(":", "") + "00";
  return `${date.replaceAll("-", "")}T${cleanTime}`;
}

function icsEscape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function createCalendarEvent() {
  if (!activeId) return;
  const contact = contacts.find((item) => item.id === activeId);
  const state = getState(contact);
  const date = els.calendarDate.value || state.followUp || nextVisit(contact) || todayString();
  const time = els.calendarTime.value || "09:00";
  const start = calendarDateTime(date, time);
  const endDate = new Date(`${date}T${time || "09:00"}`);
  endDate.setMinutes(endDate.getMinutes() + 45);
  const end = `${endDate.toISOString().slice(0, 10).replaceAll("-", "")}T${endDate.toTimeString().slice(0, 8).replaceAll(":", "")}`;
  const title = `Visita ${state.name}`;
  const description = [
    state.org,
    contact.type,
    state.phone,
    state.notes,
    contact.maps,
  ].filter(Boolean).join("\\n");
  const location = [state.address, state.city, contact.province, "Italia"].filter(Boolean).join(", ");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BTL Giro Visite//IT",
    "BEGIN:VEVENT",
    `UID:${activeId}-${date}-${Date.now()}@btl-giro-visite`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(title)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  updateActive({ followUp: date, nextAction: state.nextAction || "Appuntamento fissato" });
  els.followUp.value = date;
  download(`appuntamento_${activeId}_${date}.ics`, ics, "text/calendar;charset=utf-8");
}

function exportUpdates() {
  const rows = [[
    "ID", "Data export", "Stato record", "Cadenza giorni", "Data ultima visita",
    "Follow-up speciale", "Priorita tua", "Esito ultima visita", "Prossima azione", "Note rapide",
    "Nascosto", "Nome corretto", "Organizzazione corretta", "Telefono corretto", "Email corretta",
    "Indirizzo corretto", "Comune corretto", "Nuovo cliente", "Ora ingresso", "Ora uscita", "Data visita"
  ]];
  for (const [id, state] of Object.entries(updates)) {
    rows.push([
      id,
      new Date().toISOString(),
      state.status || "",
      state.cadence || "",
      state.lastVisit || "",
      state.followUp || "",
      state.yourPriority || "",
      state.outcome || "",
      state.nextAction || "",
      state.notes || "",
      state.deleted ? "Si" : "",
      state.name || "",
      state.org || "",
      state.phone || "",
      state.email || "",
      state.address || "",
      state.city || "",
      state.isNew ? "Si" : "",
      state.entryTime || "",
      state.exitTime || "",
      state.visitDate || "",
    ]);
  }
  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
  download(`aggiornamenti_giro_visite_${todayString()}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");

  const activityRows = [[
    "ID", "Data export", "Data attivita", "Tipo attivita", "Testo attivita"
  ]];
  for (const [id, state] of Object.entries(updates)) {
    for (const activity of state.activities || []) {
      activityRows.push([
        id,
        new Date().toISOString(),
        activity.date || "",
        activity.type || "",
        activity.text || "",
      ]);
    }
  }
  const activityCsv = activityRows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
  download(`attivita_giro_visite_${todayString()}.csv`, `\uFEFF${activityCsv}`, "text/csv;charset=utf-8");
}

function exportDailyReport() {
  const today = els.reportDate.value || todayString();
  const rows = [[
    "Data", "Partenza", "Km totali", "ID", "Cliente", "Organizzazione", "Comune", "Provincia", "Ora ingresso", "Ora uscita", "Esito", "Note"
  ]];
  for (const contact of contacts) {
    const state = getState(contact);
    if (state.lastVisit === today || state.visitDate === today) {
      rows.push([
        today,
        els.baseLocation.value || "Licata",
        els.dailyKm.value || "",
        contact.id,
        state.name,
        state.org,
        state.city,
        contact.province,
        state.entryTime,
        state.exitTime,
        state.outcome,
        state.notes,
      ]);
    }
  }
  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
  download(`report_giornaliero_${today}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

function dateRangeForPeriod(anchorDate, type) {
  const date = new Date(`${anchorDate}T00:00:00`);
  let start;
  let end;
  if (type === "month") {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  } else {
    const day = date.getDay() || 7;
    start = new Date(date);
    start.setDate(date.getDate() - day + 1);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }
  return [start, end];
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function eachDate(start, end) {
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function visitsForDate(date) {
  return contacts.filter((contact) => {
    const state = getState(contact);
    return state.lastVisit === date || state.visitDate === date;
  });
}

function exportPeriodReport() {
  const anchor = els.reportDate.value || todayString();
  const type = els.periodType.value || "week";
  const [start, end] = dateRangeForPeriod(anchor, type);
  const dates = eachDate(start, end);
  const summaryRows = [["Data", "Partenza", "Km", "Numero visite", "Clienti visitati"]];
  let totalKm = 0;
  let totalVisits = 0;
  for (const date of dates) {
    const meta = dailyMeta[date] || {};
    const visits = visitsForDate(date);
    const km = Number(meta.km || 0);
    totalKm += km;
    totalVisits += visits.length;
    summaryRows.push([
      date,
      meta.baseLocation || "",
      meta.km || "",
      visits.length,
      visits.map((contact) => getState(contact).name).join(" | "),
    ]);
  }
  summaryRows.push(["TOTALE", "", totalKm || "", totalVisits, ""]);

  const detailRows = [["Data", "ID", "Cliente", "Organizzazione", "Comune", "Provincia", "Ora ingresso", "Ora uscita", "Esito", "Note"]];
  for (const date of dates) {
    for (const contact of visitsForDate(date)) {
      const state = getState(contact);
      detailRows.push([
        date,
        contact.id,
        state.name,
        state.org,
        state.city,
        contact.province,
        state.entryTime,
        state.exitTime,
        state.outcome,
        state.notes,
      ]);
    }
  }
  const rows = [
    ["Periodo", type === "month" ? "Mese" : "Settimana", `${isoDate(start)} / ${isoDate(end)}`],
    [],
    ...summaryRows,
    [],
    ...detailRows,
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
  download(`rimborsi_${type}_${isoDate(start)}_${isoDate(end)}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

function backupAll() {
  const payload = {
    app: "giro-visite-btl",
    version: 1,
    createdAt: new Date().toISOString(),
    storeKey,
    settings: {
      reportDate: els.reportDate.value || todayString(),
      baseLocation: els.baseLocation.value || "Licata",
      dailyKm: els.dailyKm.value || "",
    },
    dailyMeta,
    updates,
  };
  download(`backup_giro_visite_${todayString()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

function restoreBackupFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      if (payload.app !== "giro-visite-btl" || !payload.updates || typeof payload.updates !== "object") {
        alert("Backup non valido.");
        return;
      }
      updates = payload.updates;
      saveUpdates();
      if (payload.settings) {
        localStorage.setItem("btl-giro-visite-settings-v1", JSON.stringify(payload.settings));
      }
      if (payload.dailyMeta) {
        dailyMeta = payload.dailyMeta;
        saveDailyMeta();
      }
      applyLocalNewClients();
      renderList();
      if (activeId) {
        openDetail(activeId);
      }
      alert("Backup ripristinato.");
    } catch {
      alert("Non riesco a leggere questo backup.");
    }
  };
  reader.readAsText(file);
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

for (const element of [els.search, els.province, els.zone, els.cycle, els.priority, els.topLimit]) {
  element.addEventListener("input", renderList);
}

for (const [element, key] of [
  [els.editName, "name"],
  [els.editOrg, "org"],
  [els.editPhone, "phone"],
  [els.editEmail, "email"],
  [els.editAddress, "address"],
  [els.editCity, "city"],
  [els.status, "status"],
  [els.cadence, "cadence"],
  [els.lastVisit, "lastVisit"],
  [els.followUp, "followUp"],
  [els.yourPriority, "yourPriority"],
  [els.outcome, "outcome"],
  [els.nextAction, "nextAction"],
  [els.notes, "notes"],
  [els.entryTime, "entryTime"],
  [els.exitTime, "exitTime"],
]) {
  element.addEventListener("input", () => updateActive({ [key]: element.value }));
}

els.deleteContact.addEventListener("click", () => {
  if (!activeId) return;
  const contact = contacts.find((item) => item.id === activeId);
  const state = getState(contact);
  const deleted = !state.deleted;
  updateActive({
    deleted,
    status: deleted ? "Non target" : "Attivo",
    outcome: deleted ? "Dati errati" : state.outcome,
  });
  els.status.value = deleted ? "Non target" : "Attivo";
  els.deleteContact.textContent = deleted ? "Ripristina nel giro" : "Nascondi dal giro";
});

els.addActivity.addEventListener("click", () => {
  if (!activeId) return;
  const text = els.activityText.value.trim();
  if (!text) return;
  const contact = contacts.find((item) => item.id === activeId);
  const state = getState(contact);
  const activity = {
    date: new Date().toISOString(),
    type: els.activityType.value || "Nota",
    text,
  };
  const activities = [...state.activities, activity];
  updateActive({ activities, notes: state.notes });
  els.activityText.value = "";
  renderActivities(activities);
});

els.visitToday.addEventListener("click", () => {
  const today = todayString();
  els.lastVisit.value = today;
  els.outcome.value = els.outcome.value || "Visitato";
  updateActive({ lastVisit: today, visitDate: today, outcome: els.outcome.value || "Visitato" });
});

els.calendarBtn.addEventListener("click", createCalendarEvent);
els.entryNow.addEventListener("click", () => {
  els.entryTime.value = currentTime();
  updateActive({ entryTime: els.entryTime.value, visitDate: todayString() });
});
els.exitNow.addEventListener("click", () => {
  els.exitTime.value = currentTime();
  updateActive({ exitTime: els.exitTime.value, visitDate: todayString() });
});

els.exportBtn.addEventListener("click", exportUpdates);
els.dailyReport.addEventListener("click", exportDailyReport);
els.periodReport.addEventListener("click", exportPeriodReport);
els.newClient.addEventListener("click", addNewClient);
els.backupBtn.addEventListener("click", backupAll);
els.restoreBtn.addEventListener("click", () => els.restoreFile.click());
els.restoreFile.addEventListener("change", () => {
  const file = els.restoreFile.files && els.restoreFile.files[0];
  if (file) restoreBackupFile(file);
  els.restoreFile.value = "";
});

function boot(payload) {
  contacts = payload.records;
  loadSettings();
  applyLocalNewClients();
  populateFilters();
  renderList();
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("btl-giro-visite-settings-v1") || "{}");
    els.reportDate.value = settings.reportDate || todayString();
    if (settings.baseLocation) els.baseLocation.value = settings.baseLocation;
    if (settings.dailyKm) els.dailyKm.value = settings.dailyKm;
    applyDailyMetaToFields();
  } catch {
    els.reportDate.value = todayString();
  }
}

function saveSettings() {
  const date = els.reportDate.value || todayString();
  dailyMeta[date] = {
    baseLocation: els.baseLocation.value || "Licata",
    km: els.dailyKm.value || "",
  };
  saveDailyMeta();
  localStorage.setItem("btl-giro-visite-settings-v1", JSON.stringify({
    reportDate: date,
    baseLocation: els.baseLocation.value || "Licata",
    dailyKm: els.dailyKm.value || "",
  }));
}

function applyDailyMetaToFields() {
  const date = els.reportDate.value || todayString();
  const meta = dailyMeta[date] || {};
  els.baseLocation.value = meta.baseLocation || "Licata";
  els.dailyKm.value = meta.km || "";
}

function applyLocalNewClients() {
  const existing = new Set(contacts.map((contact) => String(contact.id)));
  for (const [id, state] of Object.entries(updates)) {
    if (!state.isNew || existing.has(String(id))) continue;
    contacts.unshift({
      id,
      name: state.name || "Nuovo cliente",
      org: state.org || "",
      type: "Da classificare",
      priority: state.yourPriority || "Da valutare",
      province: "",
      city: state.city || "",
      zone: "Da geolocalizzare",
      phone: state.phone || "",
      email: state.email || "",
      address: state.address || "",
      cap: "",
      maps: "",
      defaultStatus: state.status || "Attivo",
      isNew: true,
    });
  }
}

els.baseLocation.addEventListener("input", saveSettings);
els.dailyKm.addEventListener("input", saveSettings);
els.reportDate.addEventListener("input", () => {
  applyDailyMetaToFields();
  saveSettings();
  renderDailyReport();
});

if (window.BTL_CONTACTS) {
  boot(window.BTL_CONTACTS);
} else {
  fetch("contacts.json")
    .then((res) => res.json())
    .then(boot)
    .catch(() => {
      els.list.innerHTML = "<p>Archivio contatti non trovato.</p>";
    });
}
