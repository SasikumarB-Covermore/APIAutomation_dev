// apiClient.js
import {
  defaultHeaders,
  baseURL
} from "../config/config";

async function createSession(request, CampaignID) {
  const reponse = await request.post(`${baseURL}/Quotes/Quote`, {
    params: {
      extrainfo: 'excessest',
      includeAllAddon: 'true'
    },
    headers: defaultHeaders,
    data: { campaignID: CampaignID },
  })
  return reponse
}

var timeStamp = dTimeStamp();
function dTimeStamp() {
  var dt = new Date();
  return dt.toISOString();
}

//Test3 Old Header
// async function getSignature() {
//   return b64_hmac_sha1("secretKey", "AtomMBApiKey".concat(timeStamp));
// }
// async function b64_hmac_sha1(k, d, _p, _z) {
//   if (!_p) { _p = '='; } if (!_z) { _z = 8; } function _f(t, b, c, d) { if (t < 20) { return (b & c) | ((~b) & d); } if (t < 40) { return b ^ c ^ d; } if (t < 60) { return (b & c) | (b & d) | (c & d); } return b ^ c ^ d; } function _k(t) { return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514; } function _s(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF), m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xFFFF); } function _r(n, c) { return (n << c) | (n >>> (32 - c)); } function _c(x, l) { x[l >> 5] |= 0x80 << (24 - l % 32); x[((l + 64 >> 9) << 4) + 15] = l; var w = [80], a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776; for (var i = 0; i < x.length; i += 16) { var o = a, p = b, q = c, r = d, s = e; for (var j = 0; j < 80; j++) { if (j < 16) { w[j] = x[i + j]; } else { w[j] = _r(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1); } var t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j))); e = d; d = c; c = _r(b, 30); b = a; a = t; } a = _s(a, o); b = _s(b, p); c = _s(c, q); d = _s(d, r); e = _s(e, s); } return [a, b, c, d, e]; } function _b(s) { var b = [], m = (1 << _z) - 1; for (var i = 0; i < s.length * _z; i += _z) { b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _z - i % 32); } return b; } function _h(k, d) { var b = _b(k); if (b.length > 16) { b = _c(b, k.length * _z); } var p = [16], o = [16]; for (var i = 0; i < 16; i++) { p[i] = b[i] ^ 0x36363636; o[i] = b[i] ^ 0x5C5C5C5C; } var h = _c(p.concat(_b(d)), 512 + d.length * _z); return _c(o.concat(h), 512 + 160); } function _n(b) { var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", s = ''; for (var i = 0; i < b.length * 4; i += 3) { var r = (((b[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((b[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((b[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF); for (var j = 0; j < 4; j++) { if (i * 8 + j * 6 > b.length * 32) { s += _p; } else { s += t.charAt((r >> 6 * (3 - j)) & 0x3F); } } } return s; } function _x(k, d) { return _n(_h(k, d)); } return _x(k, d);
// }

// const xTimeStamp = timeStamp;
// const xSignature = getSignature();

//Test3 Header
async function getSignature() {
  return b64_hmac_sha1("56b047b14343412189c00Bd2cE34eD7B", "711b3dc1331b443b81429ec7350443aa".concat(timeStamp));
}
async function b64_hmac_sha1(k, d, _p, _z) {
  if (!_p) { _p = '='; } if (!_z) { _z = 8; } function _f(t, b, c, d) { if (t < 20) { return (b & c) | ((~b) & d); } if (t < 40) { return b ^ c ^ d; } if (t < 60) { return (b & c) | (b & d) | (c & d); } return b ^ c ^ d; } function _k(t) { return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514; } function _s(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF), m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xFFFF); } function _r(n, c) { return (n << c) | (n >>> (32 - c)); } function _c(x, l) { x[l >> 5] |= 0x80 << (24 - l % 32); x[((l + 64 >> 9) << 4) + 15] = l; var w = [80], a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776; for (var i = 0; i < x.length; i += 16) { var o = a, p = b, q = c, r = d, s = e; for (var j = 0; j < 80; j++) { if (j < 16) { w[j] = x[i + j]; } else { w[j] = _r(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1); } var t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j))); e = d; d = c; c = _r(b, 30); b = a; a = t; } a = _s(a, o); b = _s(b, p); c = _s(c, q); d = _s(d, r); e = _s(e, s); } return [a, b, c, d, e]; } function _b(s) { var b = [], m = (1 << _z) - 1; for (var i = 0; i < s.length * _z; i += _z) { b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _z - i % 32); } return b; } function _h(k, d) { var b = _b(k); if (b.length > 16) { b = _c(b, k.length * _z); } var p = [16], o = [16]; for (var i = 0; i < 16; i++) { p[i] = b[i] ^ 0x36363636; o[i] = b[i] ^ 0x5C5C5C5C; } var h = _c(p.concat(_b(d)), 512 + d.length * _z); return _c(o.concat(h), 512 + 160); } function _n(b) { var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", s = ''; for (var i = 0; i < b.length * 4; i += 3) { var r = (((b[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((b[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((b[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF); for (var j = 0; j < 4; j++) { if (i * 8 + j * 6 > b.length * 32) { s += _p; } else { s += t.charAt((r >> 6 * (3 - j)) & 0x3F); } } } return s; } function _x(k, d) { return _n(_h(k, d)); } return _x(k, d);
}

const xTimeStamp = timeStamp;
const xSignature = getSignature();


//Preprod Header
// async function getSignature() {
//   return b64_hmac_sha1("56b047b14343412189c00Bd2cE34eD7B", "711b3dc1331b443b81429ec7350443aa".concat(timeStamp));
// }
// async function b64_hmac_sha1(k, d, _p, _z) {
//   if (!_p) { _p = '='; } if (!_z) { _z = 8; } function _f(t, b, c, d) { if (t < 20) { return (b & c) | ((~b) & d); } if (t < 40) { return b ^ c ^ d; } if (t < 60) { return (b & c) | (b & d) | (c & d); } return b ^ c ^ d; } function _k(t) { return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514; } function _s(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF), m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xFFFF); } function _r(n, c) { return (n << c) | (n >>> (32 - c)); } function _c(x, l) { x[l >> 5] |= 0x80 << (24 - l % 32); x[((l + 64 >> 9) << 4) + 15] = l; var w = [80], a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776; for (var i = 0; i < x.length; i += 16) { var o = a, p = b, q = c, r = d, s = e; for (var j = 0; j < 80; j++) { if (j < 16) { w[j] = x[i + j]; } else { w[j] = _r(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1); } var t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j))); e = d; d = c; c = _r(b, 30); b = a; a = t; } a = _s(a, o); b = _s(b, p); c = _s(c, q); d = _s(d, r); e = _s(e, s); } return [a, b, c, d, e]; } function _b(s) { var b = [], m = (1 << _z) - 1; for (var i = 0; i < s.length * _z; i += _z) { b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _z - i % 32); } return b; } function _h(k, d) { var b = _b(k); if (b.length > 16) { b = _c(b, k.length * _z); } var p = [16], o = [16]; for (var i = 0; i < 16; i++) { p[i] = b[i] ^ 0x36363636; o[i] = b[i] ^ 0x5C5C5C5C; } var h = _c(p.concat(_b(d)), 512 + d.length * _z); return _c(o.concat(h), 512 + 160); } function _n(b) { var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", s = ''; for (var i = 0; i < b.length * 4; i += 3) { var r = (((b[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((b[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((b[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF); for (var j = 0; j < 4; j++) { if (i * 8 + j * 6 > b.length * 32) { s += _p; } else { s += t.charAt((r >> 6 * (3 - j)) & 0x3F); } } } return s; } function _x(k, d) { return _n(_h(k, d)); } return _x(k, d);
// }

// const xTimeStamp = timeStamp;
// const xSignature = getSignature();

function makeCorrelationId(text, length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return text + result;
}

async function createQuote(request, payload) {
  const reponse = await request.post(`${baseURL}/Quotes`, {
    params: {
      extrainfo: 'excessest',
      includeAllAddon: 'true'
    },
    //Test3 Old Header
    // headers: {
    //   'X-API-Key': 'AtomMBApiKey',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id': makeCorrelationId('TestGetQuoteCorrelationId', 3)
    // },
    //Test3 Header
    headers: {
      'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
      'X-Timestamp': xTimeStamp,
      'X-Signature': (await xSignature).toString(),
      'Content-Type': 'application/json',
      'X-Correlation-Id': makeCorrelationId('TestGetQuoteCorrelationId', 3)
    },
    //Preprod Header
    // headers: {
    //   'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id': makeCorrelationId('TestGetQuoteCorrelationId', 3)
    // },
    //NewStaging Header
    // headers: {
    //   'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id': makeCorrelationId('TestGetQuoteCorrelationId', 3),
    //   'X-ConsumerApp': 'atom'
    // },
    data: payload,
  });
  return reponse
}

async function createRefineQuote(request, payload) {
  const reponse = await request.post(`${baseURL}/Quotes`, {
    //Test3 Old Header
    // headers: {
    //   'X-API-Key': 'AtomMBApiKey',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id':  makeCorrelationId('TestRefineQuoteCorrelationId', 3)
    // },
    //Test3 Header
    headers: {
      'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
      'X-Timestamp': xTimeStamp,
      'X-Signature': (await xSignature).toString(),
      'Content-Type': 'application/json',
      'X-Correlation-Id': makeCorrelationId('TestRefineQuoteCorrelationId', 3)
    },
    //Preprod Header
    // headers: {
    //   'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id':  makeCorrelationId('TestRefineQuoteCorrelationId', 3)
    // },
    //NewStaging Header
    // headers: {
    //   'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id': makeCorrelationId('TestRefineQuoteCorrelationId', 3),
    //   'X-ConsumerApp': 'atom'
    // },
    data: payload,  // Send the defined payload
  });
  return reponse
}

async function createIssuePolicy(request, payload) {
  const reponse = await request.post(`${baseURL}/Policies`, {
    //Test3 Old Header
    // headers: {
    //   'X-API-Key': 'AtomMBApiKey',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id': makeCorrelationId('TestIssuePolicyCorrelationId', 3)
    // },
    //Test3 Header
    headers: {
      'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
      'X-Timestamp': xTimeStamp,
      'X-Signature': (await xSignature).toString(),
      'Content-Type': 'application/json',
      'X-Correlation-Id': makeCorrelationId('TestIssuePolicyCorrelationId', 3)
    },
    //Preprod Header
    // headers: {
    //   'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id': makeCorrelationId('TestIssuePolicyCorrelationId', 3)
    // },
    //NewStaging Header
    // headers: {
    //   'X-API-Key': '711b3dc1331b443b81429ec7350443aa',
    //   'X-Timestamp': xTimeStamp,
    //   'X-Signature': (await xSignature).toString(),
    //   'Content-Type': 'application/json',
    //   'X-Correlation-Id': makeCorrelationId('TestIssuePolicyCorrelationId', 3),
    //   'X-ConsumerApp': 'atom'
    // },
    data: payload,  // Send the defined payload
  });
  return reponse
}

async function updateTravellers(request, payload) {
  const reponse = await request.post(`${baseURL}/travellers`, {
    headers: defaultHeaders,
    data: payload,  // Send the defined payload
  });
  return reponse
}

async function closeSession(request, payload) {
  const response = await request.post(`${baseURL}/sessions/close`, {
    headers: defaultHeaders,
    data: payload,
  })
  return response
}

async function quoteEmc(request, payload) {
  const response = await request.post(`${baseURL}/quote/emc`, {
    headers: defaultHeaders,
    data: payload,
  });
  return response
}

async function saveEmc(request, EmcPayload, emcHeader) {
  const response = await request.post(`${baseURL}/EMC/SaveEMC`, {
    headers: emcHeader,
    data: EmcPayload,
  });
  return response
}

async function newGetEmc(request, assessmentID, emcHeader) {
  const response = await request.get(`${baseURL}/EMC/${assessmentID}`, {
    headers: emcHeader

  });
  return response
}

async function newQuoteEmc(request, EmcPayload, emcHeader) {
  const response = await request.post(`${baseURL}/quote/emcv3`, {
    headers: emcHeader,
    data: EmcPayload,
  });
  return response
}
module.exports = { createSession, createQuote, createRefineQuote, createIssuePolicy, updateTravellers, closeSession, quoteEmc, saveEmc, newGetEmc, newQuoteEmc, timeStamp }
