const http = require('http');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AGENT_ID = 'agent_011CZtDJYddYVd45qgZhu6Ge';
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
        if (!sessions[from]) {
          const sessRes = await callAPI('POST', '/v1/sessions', { agent_id: AGENT_ID });
          sessions[from] = sessRes.id;
        }

        const sessionId = sessions[from];
        const turnPath = '/v1/sessions/' + sessionId + '/turns';
        const turn = await callAPI('POST', turnPath, {
          messages: [{ role: 'user', content: message }],
          stream: false
        });

        const reply = (turn.response && turn.response.content && turn.response.content[0] && turn.response.content[0].text) || "Sorry, I couldn't process that.";
        const twiml = '<?xml version="1.0"?><Response><Message>' + reply + '</Message></Response>';
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml);
      } catch (e) {
        console.error(e);
        res.writeHead(500);
        res.end('Error');
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
        'anthropic-beta': 'agents-2025-04-15'
      }
    };
    const r = https.request(options, function(res) {
      let d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve(JSON.parse(d)); });
    });
    r.on('error', reject);
    r.write(payload);
    r.end();
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Running on ' + PORT); });
