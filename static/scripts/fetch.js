async function StartResume() {
    const response = await fetch('/api/cv/start', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
    });
    if (!response.ok) {throw new Error(`HTTP ${response.status}`)};
    const data = await response.json();
    return data;
}

document.addEventListener('DOMContentLoaded', () => {
    const resumeButton = document.getElementById('resume-button');
    resumeButton.addEventListener('click', StartResume);
  })
