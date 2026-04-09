const http = require('http');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
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
          const sessRes = await callAPI('POST', '/v1/agents/' + AGENT_ID + '/sessions', {});
          console.log('Session response:', JSON.stringify(sessRes));
          sessionId = sessRes.session_id || sessRes.id;
          sessions[from] = sessionId;
        }

        const turnPath = '/v1/agents/' + AGENT_ID + '/sessions/' + sessionId + '/messages';
        const turn = await callAPI('POST', turnPath, {
          message: message
        });

        console.log('Turn response:', JSON.stringify(turn));

        let reply = "Sorry, I couldn't process that.";
        if (turn && turn.message) {
          reply = turn.message;
        } else if (turn && turn.content && turn.content.length > 0) {
          reply = turn.content[0].text;
        } else if (turn && turn.response) {
          reply = turn.response;
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
        'anthropic-beta': 'interop-2025-03-01'
      }
    };
    const r = https.request(options, function(response) {
      let d = '';
      response.on('data', function(c) { d += c; });
      response.on('end', function() {
        console.log('API raw response:', d);
        try {
          resolve(JSON.parse(d));
        } catch(e) {
          reject(e);
        }
      });
    });
    r.on('error', reject);
    r.write(payload);
    r.end();
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() { console.log('Running on ' + PORT); });
