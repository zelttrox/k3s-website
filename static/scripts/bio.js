(() => {
    const el = document.querySelector('.bio-text');
    if (!el) return;

    const fullText = el.dataset.text || '';
    el.textContent = '';
    el.classList.add('typing');

    const start = () => {
        let i = 0;
        const speed = 18;
        const tick = () => {
            if (i < fullText.length) {
                el.textContent = fullText.slice(0, i + 1);
                i++;
                const ch = fullText[i - 1];
                const delay = ch === '.' || ch === '!' || ch === '?' ? speed * 8 :
                              ch === ',' ? speed * 4 :
                              ch === '\n' ? speed * 6 : speed;
                setTimeout(tick, delay);
            } else {
                el.classList.remove('typing');
                el.classList.add('typed');
            }
        };
        tick();
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                start();
                obs.disconnect();
            }
        });
    }, { threshold: 0.3 });

    observer.observe(el);
})();
