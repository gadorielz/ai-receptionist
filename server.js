const http = require('http');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const ENVIRONMENT_ID = process.env.ENVIRONMENT_ID;
const sessions = {};

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

      try {
        let sessionId = sessions[from];

        if (!sessionId) {
          const sessRes = await callAPI('POST', '/v1/sessions', {
            agent: AGENT_ID,
            environment_id: ENVIRONMENT_ID
          });
          console.log('Session response:', JSON.stringify(sessRes));
          sessionId = sessRes.id;
          sessions[from] = sessionId;
        }

        const eventRes = await callAPI('POST', '/v1/sessions/' + sessionId + '/events', {
          type: 'user',
          content: message
        });

        console.log('Event response:', JSON.stringify(eventRes));

        let reply = "Sorry, I couldn't process that.";
        if (eventRes && eventRes.content && typeof eventRes.content === 'string') {
          reply = eventRes.content;
        } else if (eventRes && Array.isArray(eventRes.content) && eventRes.content.length > 0) {
          reply = eventRes.content[0].text;
        } else if (eventRes && eventRes.message) {
          reply = eventRes.message;
        } else if (eventRes && eventRes.text) {
          reply = eventRes.text;
        }

        const twiml = '<?xml version="1.0"?><Response><Message>' + reply + '</Message></Response>';
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml);
      } catch (e) {
        console.error('Error:', e);
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end('<?xml version="1.0"?><Response><Message>Error: ' + e.message + '</Message></Response>');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function callAPI(method, path, data) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'api.anthropic.com',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'managed-agents-2026-04-01'
      }
    };
    const r = https.request(options, function(response) {
      let d = '';
      response.on('data', function(c) { d += c; });
      response.on('end', function() {
        console.log('API raw response:', d);
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
