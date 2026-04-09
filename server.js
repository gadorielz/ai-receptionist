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
            environment_id: ENVIRONMENT_ID,
            title: 'WhatsApp session'
          });
          console.log('Session response:', JSON.stringify(sessRes));
          sessionId = sessRes.id;
          sessions[from] = sessionId;
        }

        // Send event using correct format from docs
        await callAPI('POST', '/v1/sessions/' + sessionId + '/events', {
          events: [
            {
              type: 'user.message',
              content: [{ type: 'text', text: message }]
            }
          ]
        });

        // Poll for response
        await new Promise(function(r) { setTimeout(r, 3000); });
        const eventsRes = await callAPI('GET', '/v1/sessions/' + sessionId + '/events', null);
        console.log('Events list:', JSON.stringify(eventsRes));

        let reply = "I received your message. One moment...";
        if (eventsRes && eventsRes.events) {
          const agentMsgs = eventsRes.events.filter(function(e) { return e.type === 'agent.message'; });
          if (agentMsgs.length > 0) {
            const last = agentMsgs[agentMsgs.length - 1];
            if (last.content && last.content.length > 0) {
              reply = last.content.filter(function(c) { return c.type === 'text'; }).map(function(c) { return c.text; }).join('');
            }
          }
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
    const payload = data ? JSON.stringify(data) : null;
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
    if (payload) r.write(payload);
    r.end();
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Running on ' + PORT); });
