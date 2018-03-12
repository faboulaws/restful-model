require('isomorphic-fetch');
const qs = require('querystring');

module.exports = function ({method, url, query, payload, headers}, next) {
  let qry = Object.values(query).length > 0 ? `?${qs.stringify(query)}` : '';
  const options = {method, headers};
  if (payload) {
    const body = Object.values(payload).length > 0 ? JSON.stringify(payload) : '';
    if (body) {
      options.body = body;
    }
  }
  fetch(`${url}${qry}`, options).then(next);
};