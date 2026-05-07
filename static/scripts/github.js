const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function levelFor(count) {
    if (count === 0) return 0
    if (count <= 2) return 1
    if (count <= 4) return 2
    if (count <= 7) return 3
    return 4
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function renderMonths(weeks, container) {
    container.style.gridTemplateColumns = `repeat(${weeks.length}, var(--gh-cell))`
    let lastMonth = -1
    weeks.forEach((week, weekIdx) => {
        const firstDay = week.contributionDays[0]
        if (!firstDay) return
        const month = new Date(firstDay.date).getUTCMonth()
        if (month !== lastMonth) {
            const span = document.createElement('span')
            span.textContent = MONTH_NAMES[month]
            span.style.gridColumn = `${weekIdx + 1} / span 4`
            container.appendChild(span)
            lastMonth = month
        }
    })
}

function renderGrid(weeks, grid, tooltip) {
    grid.style.gridTemplateColumns = `repeat(${weeks.length}, var(--gh-cell))`
    weeks.forEach((week, weekIdx) => {
        week.contributionDays.forEach(day => {
            const cell = document.createElement('div')
            cell.className = `github-cell level-${levelFor(day.contributionCount)}`
            cell.style.gridColumn = weekIdx + 1
            cell.style.gridRow = day.weekday + 1
            cell.dataset.date = day.date
            cell.dataset.count = day.contributionCount
            grid.appendChild(cell)
        })
    })

    grid.addEventListener('mouseover', e => {
        const cell = e.target.closest('.github-cell')
        if (!cell || !cell.dataset.date) return
        const count = Number(cell.dataset.count)
        const word = count === 1 ? 'contribution' : 'contributions'
        const text = count === 0
            ? `Aucune contribution le ${formatDate(cell.dataset.date)}`
            : `${count} ${word} le ${formatDate(cell.dataset.date)}`
        tooltip.textContent = text
        tooltip.classList.add('visible')
        const rect = cell.getBoundingClientRect()
        tooltip.style.left = `${rect.left + rect.width / 2}px`
        tooltip.style.top = `${rect.top - 6}px`
    })
    grid.addEventListener('mouseout', e => {
        if (!e.relatedTarget || !grid.contains(e.relatedTarget)) {
            tooltip.classList.remove('visible')
        }
    })
}

async function loadGithubContributions() {
    const grid = document.getElementById('github-grid')
    const months = document.getElementById('github-months')
    const totalEl = document.getElementById('github-total')
    const tooltip = document.getElementById('github-tooltip')
    if (!grid || !months || !totalEl || !tooltip) return

    try {
        const res = await fetch('/api/github')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const calendar = data.user.contributionsCollection.contributionCalendar
        const weeks = calendar.weeks

        totalEl.textContent = `${calendar.totalContributions.toLocaleString('fr-FR')} contributions cette année`
        renderMonths(weeks, months)
        renderGrid(weeks, grid, tooltip)
    } catch (err) {
        console.error('[Github] Failed to load contributions', err)
        totalEl.textContent = 'Impossible de charger les contributions'
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGithubContributions)
} else {
    loadGithubContributions()
}
