/** Accept JSON and completed Responses SSE envelopes without selecting an
 * empty response.created event ahead of the actual answer. */
export function parseModelResponse(raw: string): any {
  try { return JSON.parse(raw); } catch { /* May be SSE. */ }
  let completed: any;
  let text = '';
  for (const frame of raw.split(/\r?\n\r?\n/)) {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart()).join('\n');
    if (!data || data === '[DONE]') continue;
    let event: any;
    try { event = JSON.parse(data); } catch { continue; }
    if (event.type === 'error' || event.type === 'response.failed') {
      return { error: event.error ?? event.response?.error ?? { message: 'Model response failed' } };
    }
    if (event.type === 'response.completed') completed = event.response;
    else if (event.type === 'response.output_text.delta') text += event.delta ?? '';
    else if (!event.type && (event.output || event.output_text || event.choices)) completed = event;
  }
  return completed ?? (text ? { output_text: text } : null);
}
