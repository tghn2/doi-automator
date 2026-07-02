const DEFAULT_DEPOSIT_URL = 'https://doi.crossref.org/servlet/deposit';
const TEST_DEPOSIT_URL = 'https://test.crossref.org/servlet/deposit';

function getDepositUrl() {
  const testFlag = String(process.env.CROSSREF_TEST || '').toLowerCase();
  return testFlag === 'true' || testFlag === '1' || testFlag === 'yes' ? TEST_DEPOSIT_URL : DEFAULT_DEPOSIT_URL;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const loginId = process.env.CROSSREF_USERNAME;
  const loginPasswd = process.env.CROSSREF_PASSWORD;

  if (!loginId || !loginPasswd) {
    return json(500, {
      error: 'Missing Crossref credentials. Set CROSSREF_USERNAME and CROSSREF_PASSWORD in the deployment environment.',
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const xml = typeof payload.xml === 'string' ? payload.xml.trim() : '';
  const filename = typeof payload.filename === 'string' && payload.filename.trim() ? payload.filename.trim() : 'crossref-deposit.xml';

  if (!xml) {
    return json(400, { error: 'Missing XML content.' });
  }

  const form = new FormData();
  form.append('operation', 'doMDUpload');
  form.append('login_id', loginId);
  form.append('login_passwd', loginPasswd);
  form.append('fname', new Blob([xml], { type: 'application/xml;charset=utf-8' }), filename);

  const response = await fetch(getDepositUrl(), {
    method: 'POST',
    body: form,
  });

  const responseText = await response.text();
  const contentType = response.headers.get('content-type') || '';

  let parsedResponse = responseText;
  if (contentType.includes('application/json')) {
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = responseText;
    }
  }

  return json(response.status, {
    ok: response.ok,
    status: response.status,
    message: response.ok ? 'Crossref accepted the submission request.' : 'Crossref rejected the submission request.',
    response: parsedResponse,
  });
}
