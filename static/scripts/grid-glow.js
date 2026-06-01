/* Cursor "flashlight" — tracks the mouse over the hero section and exposes
   its position as CSS vars (--x/--y) used by the .intro glow + grid mask. */
(function () {
    const hero = document.querySelector(".intro");
    if (!hero) return;

    hero.addEventListener("mousemove", (e) => {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty("--x", (e.clientX - rect.left) + "px");
        hero.style.setProperty("--y", (e.clientY - rect.top) + "px");
    });
})();
