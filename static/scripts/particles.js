const canvas = document.getElementById('background');
const ctx = canvas.getContext('2d');

let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
});

/* ── Mouse tracking ── */
const mouse = { x: -9999, y: -9999 };
const REPEL_RADIUS = 180;   // how far the cursor pushes particles
const REPEL_STRENGTH = 1.8; // how hard the push is

window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
});

/* ── Scroll parallax ── */
let scrollOffset = 0;
let targetScrollOffset = 0;
const PARALLAX_FACTOR = 0.3;
const SCROLL_SMOOTHING = 0.08;
window.addEventListener('scroll', () => {
    targetScrollOffset = window.scrollY * PARALLAX_FACTOR;
}, { passive: true });

function viewY(y) {
    return ((y - scrollOffset) % H + H) % H;
}

/* ── Config ── */
const PARTICLE_COUNT = 50;
const BASE_COLOR = { r: 31, g: 145, b: 95 };

function rand(min, max) { return Math.random() * (max - min) + min; }

class Particle {
    constructor() { this.reset(true); }

    reset(init = false) {
        this.x = rand(0, W);
        this.y = rand(0, H);
        this.setTarget();

        this.speed = rand(0.15, 0.45);

        this.radius = rand(0.8, 2.8);
        this.glowRadius = this.radius * rand(6, 12);

        this.alpha = rand(0.15, 0.55);
        this.alphaDir = Math.random() < 0.5 ? 1 : -1;
        this.alphaSpeed = rand(0.001, 0.004);
        this.alphaMin = rand(0.05, 0.18);
        this.alphaMax = rand(0.35, 0.62);

        this.sizePhase = rand(0, Math.PI * 2);
        this.sizeSpeed = rand(0.003, 0.008);
        this.sizeAmp = rand(0.2, 0.8);

        /* Repulsion velocity — separate from wander velocity */
        this.rx = 0;
        this.ry = 0;

        if (init) this.alpha = rand(this.alphaMin, this.alphaMax);
    }

    setTarget() {
        this.tx = rand(0, W);
        this.ty = rand(0, H);
        const dx = this.tx - (this.x || 0);
        const dy = this.ty - (this.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = dx / dist;
        this.vy = dy / dist;
    }

    update() {
        /* ── Cursor repulsion ── */
        const mdx = this.x - mouse.x;
        const mdy = viewY(this.y) - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mdist < REPEL_RADIUS && mdist > 0) {
            /* Force falls off with distance — strongest at center */
            const force = (1 - mdist / REPEL_RADIUS) * REPEL_STRENGTH;
            this.rx += (mdx / mdist) * force;
            this.ry += (mdy / mdist) * force;
        }

        /* Repulsion velocity decays smoothly back to zero */
        this.rx *= 0.88;
        this.ry *= 0.88;

        /* ── Wander toward target ── */
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            this.setTarget();
        } else {
            this.x += this.vx * this.speed;
            this.y += this.vy * this.speed;
        }

        /* Apply repulsion on top of wander */
        this.x += this.rx;
        this.y += this.ry;

        /* ── Breathe alpha ── */
        this.alpha += this.alphaDir * this.alphaSpeed;
        if (this.alpha >= this.alphaMax) { this.alpha = this.alphaMax; this.alphaDir = -1; }
        if (this.alpha <= this.alphaMin) { this.alpha = this.alphaMin; this.alphaDir = 1; }

        /* ── Pulse size ── */
        this.sizePhase += this.sizeSpeed;
    }

    draw() {
        const r = BASE_COLOR.r;
        const g = BASE_COLOR.g;
        const b = BASE_COLOR.b;
        const pulseR = this.radius + Math.sin(this.sizePhase) * this.sizeAmp;
        const dy = viewY(this.y);

        /* Boost glow slightly when being repelled */
        const repelMag = Math.sqrt(this.rx * this.rx + this.ry * this.ry);
        const boost = Math.min(repelMag * 0.08, 0.15);

        /* Outer glow */
        const glowGrad = ctx.createRadialGradient(this.x, dy, 0, this.x, dy, this.glowRadius);
        glowGrad.addColorStop(0, `rgba(${r},${g},${b},${(this.alpha * (0.16 + boost)).toFixed(3)})`);
        glowGrad.addColorStop(0.4, `rgba(${r},${g},${b},${(this.alpha * 0.05).toFixed(3)})`);
        glowGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.arc(this.x, dy, this.glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        /* Core dot */
        const coreGrad = ctx.createRadialGradient(this.x, dy, 0, this.x, dy, pulseR * 2.2);
        coreGrad.addColorStop(0, `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 20)},${Math.min(255, b + 35)},${((this.alpha + boost) * 0.7).toFixed(3)})`);
        coreGrad.addColorStop(0.5, `rgba(${r},${g},${b},${(this.alpha * 0.45).toFixed(3)})`);
        coreGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.arc(this.x, dy, pulseR * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();
    }
}

/* ── Connection lines ── */
function drawConnections(particles) {
    const MAX_DIST = 130;
    for (let i = 0; i < particles.length; i++) {
        const ay = viewY(particles[i].y);
        for (let j = i + 1; j < particles.length; j++) {
            const by = viewY(particles[j].y);
            const dx = particles[i].x - particles[j].x;
            const dy = ay - by;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MAX_DIST) {
                const opacity = (1 - dist / MAX_DIST) * 0.18;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, ay);
                ctx.lineTo(particles[j].x, by);
                ctx.strokeStyle = `rgba(31, 145, 95, ${opacity.toFixed(3)})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }
        }
    }
}

/* ── Init ── */
const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

/* ── Loop ── */
function animate() {
    scrollOffset += (targetScrollOffset - scrollOffset) * SCROLL_SMOOTHING;

    ctx.clearRect(0, 0, W, H);

    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.85);
    vignette.addColorStop(0, 'rgba(238,242,239,0)');
    vignette.addColorStop(1, 'rgba(210,225,217,0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    drawConnections(particles);
    particles.forEach(p => { p.update(); p.draw(); });

    requestAnimationFrame(animate);
}

animate();