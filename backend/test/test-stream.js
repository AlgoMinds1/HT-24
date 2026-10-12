async function run() {
  const response = await fetch('http://localhost:8000/api/verify?stream=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'text', text: 'Drinking warm lemon water and baking soda alkalizes blood pH and cures cancer' })
  });

  console.log('HTTP Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let eventCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        eventCount++;
        const ev = JSON.parse(line.slice(6));
        console.log(`[Event ${eventCount}] [${ev.agent}] ${ev.eventType} (${ev.status}) -> ${ev.message || ''}`);
        if (ev.eventType === 'verification_completed') {
          console.log('\n🎉 Final Determination:', ev.data?.verdict);
          console.log('Confidence Score:', ev.data?.confidence?.score, `(${ev.data?.confidence?.rating})`);
          console.log('Retrieved Evidence count:', ev.data?.evidence?.length);
          console.log('Action Risk:', ev.data?.action_risk?.risk_level);
        }
      }
    }
  }
  console.log('\nStream completed cleanly. Total real events received:', eventCount);
}

run().catch(console.error);
