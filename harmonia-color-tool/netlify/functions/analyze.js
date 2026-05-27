const SYSTEM_PROMPT = `Sei un'esperta certificata di armocromia con 20 anni di esperienza.
Analizzi il sottotono della pelle, il colore degli occhi e dei capelli per determinare
la stagione armocromica. Le 4 stagioni principali sono Primavera, Estate, Autunno, Inverno,
ognuna con varianti Caldo/Freddo/Chiaro/Profondo/Morbido/Brillante.

Rispondi SOLO in formato JSON con questa struttura esatta:
{
  "stagione": "Nome stagione (es: Autunno Caldo)",
  "sottotono": "Caldo/Freddo/Neutro",
  "descrizione": "Descrizione poetica e precisa della stagione (3-4 frasi)",
  "caratteristiche": ["caratteristica1", "caratteristica2", "caratteristica3"],
  "palette_consigliata": [
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "uso": "come usarlo"}
  ],
  "colori_da_evitare": [
    {"nome": "Nome colore", "hex": "#XXXXXX", "motivo": "perche evitarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "motivo": "perche evitarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "motivo": "perche evitarlo"},
    {"nome": "Nome colore", "hex": "#XXXXXX", "motivo": "perche evitarlo"}
  ],
  "consigli_stile": "Paragrafo con consigli pratici per abbigliamento e makeup",
  "celebrity_riferimento": ["Nome celebrity con la stessa stagione"]
}`;

exports.handler = async function(event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'API key non configurata sul server.' })
    };
  }

  let imageBase64, mimeType;
  try {
    ({ imageBase64, mimeType } = JSON.parse(event.body));
  } catch (e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Richiesta non valida.' }) };
  }

  if (!imageBase64 || !mimeType) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Immagine mancante.' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: 'Analizza questa foto del viso e determina la stagione armocromica. Rispondi SOLO con il JSON richiesto, senza testo aggiuntivo.' }
          ]
        }]
      })
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
