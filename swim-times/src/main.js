import './style.css'
import { Storage } from './storage.js'
import { Domain } from './domain.js'
import { UI } from './ui.js'

document.querySelector('#app').innerHTML = `
  <div class="container">
    <header>
      <h1>SwimTimes 🏊</h1>
      <p>Pool Occupancy & Best Times</p>
    </header>
    
    <div id="quick-actions">
      <button id="track-now">Track right now</button>
      <div class="data-actions">
        <button id="export-data" class="btn-secondary">Export data</button>
        <button id="import-data" class="btn-secondary">Import data</button>
        <input type="file" id="import-file" accept="application/json" hidden>
      </div>
      <div id="data-status"></div>
    </div>

    <div id="stats-container"></div>
    <div id="schedule-container"></div>
  </div>
`

const scheduleContainer = document.getElementById('schedule-container');
const statsContainer = document.getElementById('stats-container');

// Populated by init() once the config has been fetched.
let appConfig = null;
let scheduleStructure = {};
let slotDuration = 30;

async function refresh() {
  const records = await Storage.getRecords();
  const stats = Domain.calculateStats(records, appConfig);
  UI.renderStats(statsContainer, stats);
  UI.renderGrid(scheduleContainer, scheduleStructure, stats, (day, time) => {
    // Get history for this slot
    const slotRecords = Domain.filterRecordsBySlot(records, day, time, appConfig);

    // On Click Slot
    UI.renderModal(day, time, slotRecords, async (rating) => {
      await Storage.addRecord(rating, day, time);
      refresh();
    }, async (id) => {
      await Storage.removeRecord(id);
      refresh();
    });
  });
}

document.getElementById('track-now').addEventListener('click', () => {
  const now = new Date();
  const day = now.getDay();
  const h = now.getHours();
  // Round down to the configured slot boundary so the slot exists in the grid.
  const m = Math.floor(now.getMinutes() / slotDuration) * slotDuration;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  UI.renderModal(day, time, [], async (rating) => {
    await Storage.addRecord(rating, day, time);
    refresh();
  }, () => { });
});

// --- Export / import ---
const statusEl = document.getElementById('data-status');
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', isError);
}

document.getElementById('export-data').addEventListener('click', async () => {
  const records = await Storage.getRecords();
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `swim_times_export_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus(`Exported ${records.length} record${records.length === 1 ? '' : 's'}.`);
});

const importInput = document.getElementById('import-file');
document.getElementById('import-data').addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const records = JSON.parse(await file.text());
    if (!Array.isArray(records)) throw new Error('file is not a JSON array of records');
    const result = await Storage.importRecords(records);
    showStatus(`Imported ${result.imported} record${result.imported === 1 ? '' : 's'}` +
      `${result.skipped ? `, ${result.skipped} skipped` : ''} (${result.total} total).`);
    await refresh();
  } catch (err) {
    showStatus(`Import failed: ${err.message}`, true);
  } finally {
    importInput.value = ''; // allow re-selecting the same file
  }
});

async function init() {
  appConfig = await Storage.getConfig();
  scheduleStructure = Domain.getScheduleStructure(appConfig);
  slotDuration = appConfig?.slotDurationMinutes || 30;
  await refresh();
}

init();
