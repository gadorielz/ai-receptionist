const http = require('http');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const conversations = {};

const SYSTEM_PROMPT = `You are a warm and friendly AI receptionist for a business on WhatsApp. You automatically detect whether the customer is writing in English or Saudi Arabic dialect and respond naturally in the same language.

Your core responsibilities:
- Answer questions about services, pricing, and business hours clearly and helpfully
- Book appointments by collecting: full name, preferred service, and desired date/time
- Confirm booking details back to the customer before finalizing
- Handle follow-up questions about existing bookings

Tone: warm, welcoming, and conversational. In Arabic use natural Saudi dialect. Keep responses concise and WhatsApp-appropriate.`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', async function() {
      const params = new URLSearchParams(body);
      const from = params.get('From');
      const message = params.get('Body');

      if (!conversations[from]) conversations[from] = [];
      conversations[from].push({ role: 'user', content: message });

      try {
        const result = await callAPI({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: conversations[from]
        });

        const reply = result.content[0].text;
        conversations[from].push({ role: 'assistant', content: reply });

        const twiml = '<?xml version="1.0"?><Response><Message>' + reply + '</Message></Response>';
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml);
      } catch (e) {
        console.error('Error:', e);
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end('<?xml version="1.0"?><Response><Message>Sorry, something went wrong.</Message></Response>');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function callAPI(data) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };
    const r = https.request(options, function(response) {
      let d = '';
      response.on('data', function(c) { d += c; });
      response.on('end', function() {
        console.log('API response:', d);
        try { resolve(JSON.parse(d)); }
        catch(e) { reject(e); }
      });
    });
    r.on('error', reject);
    r.write(payload);
    r.end();
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Running on ' + PORT); });
