async function StartResume() {
    // Open the new tab synchronously to avoid the popup blocker (the click
    // gesture is still active here; if we waited for fetch() to resolve first,
    // browsers would treat window.open as a non-user-initiated popup).
    const tab = window.open('about:blank', '_blank');
    try {
        const response = await fetch('/api/cv/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { sessionId, redirect } = await response.json();
        // When the pod limit is reached the server sends us to the classic PDF.
        const target = redirect || `/cv/${sessionId}/`;
        if (tab) tab.location.href = target;
        else window.open(target, '_blank');
    } catch (err) {
        if (tab) tab.close();
        throw err;
    }
}

document.querySelectorAll('.resume-trigger').forEach(btn =>
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const originalBg = btn.style.background;
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        btn.style.background = '#888';
        setTimeout(() => {
            btn.disabled = false;
            btn.style.pointerEvents = '';
            btn.style.background = originalBg;
        }, 5000);
        StartResume();
    }));
