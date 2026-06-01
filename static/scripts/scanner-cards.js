/* Scanner card stream — horizontal infinite carousel. When a card crosses the
   central scanner line, its image transitions into glitchy ASCII text via
   clip-path, with a scramble animation on first contact. Particle backdrop
   is rendered on a 2D canvas (no Three.js dependency). */
(function () {
    const section = document.querySelector('.scanner-section');
    const track = document.getElementById('scanner-track');
    const canvas = document.querySelector('.scanner-particles');
    if (!section || !track || !canvas) return;

    const CARD_IMAGES = ['images/card_front.png', 'images/card_back.png'];
    const REPEAT = 8;
    const CARD_W = 400;
    const CARD_GAP = 60;
    const SCROLL_SPEED = 80;
    const ASCII_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[]<>;:,._-+=!@#$%^&*|\\/\"'`~?";
    const asciiW = Math.floor(CARD_W / 6.5);
    const asciiH = Math.floor(250 / 13);

    function generateCode(w, h) {
        const rows = [];
        for (let i = 0; i < h; i++) {
            let line = '';
            for (let j = 0; j < w; j++) {
                line += ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
            }
            rows.push(line);
        }
        return rows.join('\n');
    }

    const cards = [];
    for (let i = 0; i < CARD_IMAGES.length * REPEAT; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'scanner-card';

        const imgLayer = document.createElement('div');
        imgLayer.className = 'card-image';
        imgLayer.style.backgroundImage = `url('${CARD_IMAGES[i % CARD_IMAGES.length]}')`;

        const asciiLayer = document.createElement('div');
        asciiLayer.className = 'card-ascii';
        const pre = document.createElement('pre');
        const baseAscii = generateCode(asciiW, asciiH);
        pre.textContent = baseAscii;
        asciiLayer.appendChild(pre);

        wrapper.appendChild(imgLayer);
        wrapper.appendChild(asciiLayer);
        track.appendChild(wrapper);

        cards.push({ wrapper, imgLayer, asciiLayer, pre, baseAscii, scanned: false, scrambling: false });
    }

    function resize() {
        canvas.width = section.clientWidth;
        canvas.height = section.clientHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');

    function newBgParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: Math.random() * 0.9 + 0.3,
            r: Math.random() * 1.2 + 0.3,
            alpha: Math.random() * 0.5 + 0.2,
        };
    }
    const bg = [];
    for (let i = 0; i < 80; i++) bg.push(newBgParticle());

    function newScanParticle() {
        const cx = canvas.width / 2;
        return {
            x: cx + (Math.random() - 0.5) * 4,
            y: Math.random() * canvas.height,
            vx: Math.random() * 0.8 + 0.2,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 0.7 + 0.4,
            alpha: Math.random() * 0.4 + 0.6,
            life: 1,
            decay: Math.random() * 0.02 + 0.005,
        };
    }
    const scan = [];

    function scramble(card) {
        if (card.scrambling) return;
        card.scrambling = true;
        let i = 0;
        const max = 10;
        const id = setInterval(() => {
            card.pre.textContent = generateCode(asciiW, asciiH);
            i++;
            if (i >= max) {
                clearInterval(id);
                card.pre.textContent = card.baseAscii;
                card.scrambling = false;
            }
        }, 30);
    }

    let pos = 0;
    let last = performance.now();

    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        pos -= SCROLL_SPEED * dt;
        track.style.transform = `translateY(-50%) translateX(${pos}px)`;

        const sectionRect = section.getBoundingClientRect();

        // Seamless loop: recycle leftmost card to end of track when it scrolls off
        const firstRect = cards[0].wrapper.getBoundingClientRect();
        if (firstRect.right < sectionRect.left) {
            const card = cards.shift();
            cards.push(card);
            track.appendChild(card.wrapper);
            pos += CARD_W + CARD_GAP;
            track.style.transform = `translateY(-50%) translateX(${pos}px)`;
        }
        const scannerX = canvas.width / 2;
        const half = 4;
        const sL = scannerX - half;
        const sR = scannerX + half;
        let scanning = false;

        cards.forEach(card => {
            const r = card.wrapper.getBoundingClientRect();
            const lL = r.left - sectionRect.left;
            const lR = r.right - sectionRect.left;
            if (lL < sR && lR > sL) {
                scanning = true;
                if (!card.scanned) {
                    card.scanned = true;
                    scramble(card);
                }
                const w = r.width;
                const iL = Math.max(sL - lL, 0);
                const iR = Math.min(sR - lL, w);
                card.imgLayer.style.setProperty('--clip-right', `${(iL / w) * 100}%`);
                card.asciiLayer.style.setProperty('--clip-left', `${(iR / w) * 100}%`);
            } else {
                card.scanned = false;
                if (lR < sL) {
                    card.imgLayer.style.setProperty('--clip-right', '100%');
                    card.asciiLayer.style.setProperty('--clip-left', '100%');
                } else {
                    card.imgLayer.style.setProperty('--clip-right', '0%');
                    card.asciiLayer.style.setProperty('--clip-left', '0%');
                }
            }
        });
        section.classList.toggle('scanning', scanning);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bg.forEach(p => {
            p.x += p.vx;
            if (p.x > canvas.width + 5) p.x = -5;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        const target = scanning ? 240 : 50;
        while (scan.length < target) scan.push(newScanParticle());
        if (scan.length > target) scan.length = target;
        scan.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0 || p.x > canvas.width) Object.assign(p, newScanParticle());
            ctx.globalAlpha = p.alpha * p.life;
            ctx.fillStyle = 'rgba(160,255,208,1)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
