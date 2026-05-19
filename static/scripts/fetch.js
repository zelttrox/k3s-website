async function StartResume() {
    const response = await fetch('/api/cv/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { sessionId } = await response.json();
    window.location.href = `/cv/${sessionId}/`;
}

document.querySelectorAll('#resume-button').forEach(btn =>
    btn.addEventListener('click', StartResume));
