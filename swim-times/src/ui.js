import { DAYS, SHORT_DAYS, Domain } from './domain.js';

export const UI = {
    /**
     * Render the weekly grid
     * @param {HTMLElement} container 
     * @param {Object} schedule 
     * @param {Object} stats 
     * @param {Function} onSlotClick 
     */
    renderGrid: (container, schedule, stats, onSlotClick) => {
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'schedule-grid';

        // Header Row (Days)
        // First cell empty (Time column)
        const emptyHeader = document.createElement('div');
        emptyHeader.className = 'grid-header empty';
        grid.appendChild(emptyHeader);

        // Display indices (0-7) present in the schedule, in render order.
        // 0 = Sunday-first, 7 = Sunday-last; a plain numeric sort handles both.
        const dayIndices = Object.keys(schedule).map(Number).sort((a, b) => a - b);

        // Size the grid to the actual number of day columns (varies as days open/close),
        // so the layout never wraps regardless of how many days are configured.
        grid.style.gridTemplateColumns = `60px repeat(${dayIndices.length}, 1fr)`;

        dayIndices.forEach(dayIdx => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'grid-header';
            dayHeader.textContent = SHORT_DAYS[dayIdx % 7]; // 7 -> Sunday
            grid.appendChild(dayHeader);
        });

        // Generate all Unique Time Strings across all days
        const allTimes = new Set();
        Object.values(schedule).forEach(slots => slots.forEach(t => allTimes.add(t)));
        const sortedTimes = Array.from(allTimes).sort();

        sortedTimes.forEach(time => {
            // Time Label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = time;
            grid.appendChild(timeLabel);

            // Day Columns
            dayIndices.forEach(dayIdx => {
                const slots = schedule[dayIdx];
                const weekday = dayIdx % 7; // 7 -> Sunday; storage/stats always key on weekday 0-6
                const cell = document.createElement('div');
                cell.className = 'grid-cell';

                // Check if day has this time
                if (slots.includes(time)) {
                    const key = `${weekday}-${time}`;
                    const stat = stats[key];

                    cell.dataset.day = weekday;
                    cell.dataset.time = time;

                    if (stat && stat.count > 0) {
                        const avg = stat.sum / stat.count;
                        cell.textContent = avg.toFixed(1);
                        cell.style.backgroundColor = getHeatmapColor(avg);
                        cell.title = `Avg: ${avg.toFixed(1)} (${stat.count} reports)`;
                    } else {
                        cell.classList.add('empty-data');
                    }

                    cell.addEventListener('click', () => onSlotClick(weekday, time));
                } else {
                    cell.classList.add('unavailable');
                }

                grid.appendChild(cell);
            });
        });

        container.appendChild(grid);
    },

    renderModal: (dayIdx, time, history, onSave, onDelete) => {
        // Remove existing modal to clear listeners
        const existingModal = document.getElementById('rating-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'rating-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);

        modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close-x">&times;</button>
        <h3>Rate Occupancy</h3>
        <p>${DAYS[dayIdx]} at ${time}</p>
        <div class="rating-buttons">
            <button data-val="1">1 (Empty)</button>
            <button data-val="2">2</button>
            <button data-val="3">3</button>
            <button data-val="4">4</button>
            <button data-val="5">5 (Full)</button>
        </div>
        
        <div class="history-section">
            <h4>History</h4>
            <div class="history-list">
            ${history.length === 0 ? '<p>No ratings yet.</p>' : history.map(r => `
                <div class="history-item">
                <span>${new Date(r.timestamp).toLocaleDateString()} ${new Date(r.timestamp).toLocaleTimeString()} - <strong>${r.rating}</strong></span>
                <button class="delete-btn" data-id="${r.id || ''}">x</button>
                </div>
            `).join('')}
            </div>
        </div>
      </div>
    `;

        modal.style.display = 'flex';

        // Rating buttons
        const btnContainer = modal.querySelector('.rating-buttons');
        btnContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const val = parseInt(e.target.dataset.val);
                console.log('[UI] Rating clicked:', val);
                onSave(val);

                // Visual feedback
                btnContainer.innerHTML = `<div class="saved-message">Saved!</div>`;

                // Delay close
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 600);
            }
        });

        // Delete delegation
        const historyList = modal.querySelector('.history-list');
        if (historyList) {
            historyList.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) {
                    const id = e.target.dataset.id;
                    if (id) {
                        onDelete(id);
                        modal.style.display = 'none'; // Close to refresh state
                    }
                }
            });
        }

        // Close 'X' button
        modal.querySelector('.modal-close-x').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    },

    renderStats: (container, stats) => {
        container.innerHTML = '';

        // Current Day Index (0-6)
        const currentDayIdx = new Date().getDay();
        const currentDayName = DAYS[currentDayIdx];

        // Convert stats to array
        const entries = Object.entries(stats).map(([key, val]) => {
            const avg = val.sum / val.count;
            return { key, avg, count: val.count };
        });

        // Filter for meaningful stats (at least 1 report) AND belong to current day
        const validEntries = entries.filter(e => {
            const [d, t] = e.key.split('-');
            return e.count >= 1 && parseInt(d) === currentDayIdx;
        });

        // Sort by Avg
        validEntries.sort((a, b) => a.avg - b.avg);

        const best = validEntries.length > 0 ? validEntries[0] : null;
        const worst = validEntries.length > 0 ? validEntries[validEntries.length - 1] : null; // Highest avg

        // Create Cards
        const createCard = (title, value, sub) => {
            const div = document.createElement('div');
            div.className = 'stat-card';
            div.innerHTML = `<h3>${title}</h3><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div>`;
            return div;
        };

        const formatKey = (key) => {
            const [d, t] = key.split('-');
            // Only show time since we know it's today
            return `${t}`;
        };

        if (best) {
            container.appendChild(createCard(`Quiet Time (${currentDayName})`, formatKey(best.key), `Average Occupancy: ${best.avg.toFixed(1)}`));
        } else {
            container.appendChild(createCard(`Quiet Time (${currentDayName})`, '-', 'No data yet'));
        }

        if (worst) {
            container.appendChild(createCard(`Busy Time (${currentDayName})`, formatKey(worst.key), `Average Occupancy: ${worst.avg.toFixed(1)}`));
        } else {
            container.appendChild(createCard(`Busy Time (${currentDayName})`, '-', 'No data yet'));
        }

        // Overall Average for Today
        if (validEntries.length > 0) {
            const totalSum = validEntries.reduce((acc, curr) => acc + (curr.avg * curr.count), 0);
            const totalCount = validEntries.reduce((acc, curr) => acc + curr.count, 0);
            const output = (totalSum / totalCount).toFixed(1);
            container.appendChild(createCard(`Average Occupancy (${currentDayName})`, output, `${totalCount} reports`));
        } else {
            // Fallback if no data for today, maybe show nothing or empty card?
            // Let's show empty for consistency
            container.appendChild(createCard(`Average Occupancy (${currentDayName})`, '-', 'No data yet'));
        }
    }
};

function getHeatmapColor(value) {
    // 1 (Low) -> Green/Blue, 5 (High) -> Red
    // Simple HSL
    // 1 -> 180 (Cyan) ? No, typically Green is low.
    // Let's use user's theme.
    // 1: #00ffaa (Greenish Cyan)
    // 3: #ffff00 (Yellow)
    // 5: #ff0055 (Pink/Red)

    if (value <= 1.5) return 'rgba(0, 255, 170, 0.4)';
    if (value <= 2.5) return 'rgba(100, 255, 0, 0.4)';
    if (value <= 3.5) return 'rgba(255, 255, 0, 0.4)';
    if (value <= 4.5) return 'rgba(255, 120, 0, 0.4)';
    return 'rgba(255, 0, 85, 0.4)';
}

