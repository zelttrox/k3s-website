const POD_COLUMNS = ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']

function renderPods(pods, terminal) {
    if (!pods.length) {
        terminal.innerHTML = '<span class="pods-empty">Aucun pod en cours d\'exécution.</span>'
        return
    }

    // Compute column widths so the output aligns like a real terminal
    const rows = pods.map(p => [p.name, p.ready, p.status, String(p.restarts), p.age])
    const widths = POD_COLUMNS.map((col, i) =>
        Math.max(col.length, ...rows.map(r => r[i].length)))

    const pad = (cells, statusClass) => cells
        .map((cell, i) => {
            const text = cell.padEnd(widths[i] + 3)
            if (statusClass && i === 2) {
                return `<span class="pods-status ${statusClass}">${cell}</span>${' '.repeat(widths[i] + 3 - cell.length)}`
            }
            return text
        })
        .join('')

    const header = `<span class="pods-row pods-head">${pad(POD_COLUMNS)}</span>`
    const body = rows.map(r => {
        const status = r[2].toLowerCase()
        const cls = status === 'running' || status === 'succeeded' ? 'ok'
            : status === 'pending' ? 'warn' : 'err'
        return `<span class="pods-row">${pad(r, cls)}</span>`
    }).join('')

    terminal.innerHTML = `<span class="pods-cmd">$ kubectl get pods</span>${header}${body}`
}

async function loadPods() {
    const terminal = document.getElementById('pods-terminal')
    const btn = document.getElementById('pods-refresh')
    if (!terminal) return

    if (btn) btn.disabled = true
    terminal.classList.add('loading')
    try {
        const res = await fetch('/api/pods')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        renderPods(await res.json(), terminal)
    } catch (err) {
        console.error('[Pods] Failed to load pods', err)
        terminal.innerHTML = '<span class="pods-empty">Impossible de charger les pods.</span>'
    } finally {
        terminal.classList.remove('loading')
        if (btn) btn.disabled = false
    }
}

const refreshBtn = document.getElementById('pods-refresh')
if (refreshBtn) refreshBtn.addEventListener('click', loadPods)

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPods)
} else {
    loadPods()
}
