// Shared wiring for the classic lead forms (offer landings, service
// landings, /contact): intercept native submit, POST the fields as JSON to
// /api/lead (→ Airtable), and swap the button to a success state in place.
//
// The audit questionnaire does NOT use this — its state machine posts to the
// same endpoint itself, fire-and-forget, because its next step (the Calendly
// booking) must never wait on the write.
export function wireLeadForm(form, meta) {
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';

    const data = Object.fromEntries(new FormData(form).entries());
    delete data['form-name']; // legacy Netlify Forms key, meaningless now

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...meta, ...data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      button.textContent = 'Sent. We will be in touch.';
    } catch (err) {
      console.error('Lead POST failed', err);
      button.disabled = false;
      button.textContent = label;
      form.querySelector('[data-lead-error]')?.removeAttribute('hidden');
    }
  });
}
