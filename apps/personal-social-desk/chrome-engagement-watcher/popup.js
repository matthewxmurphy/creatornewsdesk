document.querySelector('#plan').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const status = document.querySelector('#status');
  button.disabled = true;
  status.textContent = 'Planning older posts…';
  try {
    const result = await chrome.runtime.sendMessage({ type: 'cph-plan-personal-archive' });
    if (!result?.ok) throw new Error(result?.error || 'Social Desk did not respond.');
    status.textContent = `${result.planned} proposed posts · ${result.created} added · Needs review. Nothing scheduled on Facebook.`;
    document.querySelector('#review').href = result.url;
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
