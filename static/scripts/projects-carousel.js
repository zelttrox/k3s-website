/* Projects carousel + spotlight glow cards.
   - Each card receives --x / --y (cursor position in card-local coords) and
     --xp (cursor X as a fraction of viewport, used for the green→teal hue shift)
     so the CSS spotlight gradient follows the pointer.
   - Carousel slides full pages (3 cards visible on desktop, 1 on mobile). */
(function () {
    // Spotlight tracking — runs on any page that has .glow-card elements
    const cards = Array.from(document.querySelectorAll('.glow-card'));
    if (cards.length > 0) {
        window.addEventListener('pointermove', (e) => {
            const xp = (e.clientX / window.innerWidth).toFixed(2);
            cards.forEach(card => {
                const r = card.getBoundingClientRect();
                const x = e.clientX - r.left;
                const y = e.clientY - r.top;
                if (x < -120 || y < -120 || x > r.width + 120 || y > r.height + 120) return;
                card.style.setProperty('--x', x.toFixed(0));
                card.style.setProperty('--y', y.toFixed(0));
                card.style.setProperty('--xp', xp);
            });
        });
    }

    // Carousel (only if the carousel scaffolding is present)
    const track = document.getElementById('projects-track');
    const prevBtn = document.querySelector('.projects-prev');
    const nextBtn = document.querySelector('.projects-next');
    const dotsContainer = document.querySelector('.projects-dots');
    if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

    const slots = Array.from(track.children);

    // Carousel
    function visiblePerPage() {
        return window.innerWidth <= 768 ? 1 : 3;
    }
    function totalPages() {
        return Math.max(1, Math.ceil(slots.length / visiblePerPage()));
    }
    let page = 0;

    function renderDots() {
        dotsContainer.innerHTML = '';
        const pages = totalPages();
        for (let i = 0; i < pages; i++) {
            const d = document.createElement('button');
            d.className = 'projects-dot' + (i === page ? ' active' : '');
            d.setAttribute('aria-label', `Page ${i + 1}`);
            d.addEventListener('click', () => { page = i; update(); });
            dotsContainer.appendChild(d);
        }
    }

    function update() {
        const pages = totalPages();
        if (page > pages - 1) page = pages - 1;
        if (page < 0) page = 0;
        track.style.transform = `translateX(-${page * 100}%)`;
        prevBtn.disabled = page === 0;
        nextBtn.disabled = page === pages - 1;
        renderDots();
    }

    prevBtn.addEventListener('click', () => { page--; update(); });
    nextBtn.addEventListener('click', () => { page++; update(); });
    window.addEventListener('resize', update);
    update();
})();
