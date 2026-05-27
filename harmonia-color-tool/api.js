const HARMONIA_API_KEY_STORAGE = 'harmonia_api_key';
const PROXY_URL = '/.netlify/functions/analyze';

function getStoredApiKey() { return localStorage.getItem(HARMONIA_API_KEY_STORAGE) || ''; }
function saveApiKey(key) { localStorage.setItem(HARMONIA_API_KEY_STORAGE, key.trim()); }
function clearApiKey() { localStorage.removeItem(HARMONIA_API_KEY_STORAGE); }
function hasApiKey() { return getStoredApiKey().length > 10; }

function extractJsonFromResponse(text) {
  try { return JSON.parse(text.trim()); } catch (_) {}
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {} }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch (_) {} }
  throw new Error('La risposta non e in formato JSON valido');
}

function buildFallbackResult(stagione) {
  return {
    stagione: stagione || 'Stagione non determinata',
    sottotono: 'Neutro',
    descrizione: 'Non e stato possibile generare una descrizione dettagliata.',
    caratteristiche: ['Analisi parziale'],
    palette_consigliata: [
      { nome: 'Turchese',      hex: '#00B4C4', uso: 'Colore base versatile' },
      { nome: 'Verde petrolio',hex: '#1B6B72', uso: 'Perfetto per capi formali' },
      { nome: 'Crema',         hex: '#FDF6EC', uso: 'Neutro elegante' },
      { nome: 'Dorato',        hex: '#C9A84C', uso: 'Accessori e dettagli' },
      { nome: 'Blu notte',     hex: '#1A2B4A', uso: 'Alternativa al nero' },
      { nome: 'Cipria',        hex: '#F2C4B2', uso: 'Look naturale' },
      { nome: 'Sabbia',        hex: '#D4B896', uso: 'Stile casual' },
      { nome: 'Bordeaux',      hex: '#6B2737', uso: 'Sera ed eleganza' }
    ],
    colori_da_evitare: [
      { nome: 'Nero puro',    hex: '#000000', motivo: 'Troppo contrastato' },
      { nome: 'Bianco puro',  hex: '#FFFFFF', motivo: 'Toglie luminosita' },
      { nome: 'Arancio fluo', hex: '#FF6600', motivo: 'Troppo vibrante' },
      { nome: 'Grigio freddo',hex: '#9E9E9E', motivo: 'Spegne il colorito' }
    ],
    consigli_stile: 'Punta su colori che valorizzino il tuo sottotono naturale.',
    celebrity_riferimento: []
  };
}

async function analyzeColorSeason(imageBase64, mimeType) {
  const apiKey = getStoredApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  let response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, apiKey })
    });
  } catch (e) {
    throw new Error('Errore di connessione. Verifica la tua connessione internet e riprova.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const s = response.status;
    if (s === 401) throw new Error('API key non valida. Verifica la chiave nelle impostazioni.');
    if (s === 400) throw new Error("Richiesta non valida. Controlla il formato dell'immagine.");
    if (s === 429) throw new Error('Troppe richieste. Attendi qualche secondo e riprova.');
    if (s === 529 || s === 503) throw new Error('Servizio sovraccarico. Riprova tra qualche istante.');
    throw new Error(`Errore API (${s}). Riprova piu tardi.`);
  }

  const data = await response.json();
  const rawText = data?.content?.[0]?.text || '';
  if (!rawText) throw new Error("Risposta vuota. Riprova con un'altra foto.");

  try {
    const parsed = extractJsonFromResponse(rawText);
    if (!parsed.stagione || !parsed.palette_consigliata) throw new Error('Struttura incompleta');
    return parsed;
  } catch (e) {
    console.warn('Parse fallback:', e.message);
    const m = rawText.match(/stagione["\s:]+([^\n"]+)/i);
    return buildFallbackResult(m?.[1]);
  }
}
