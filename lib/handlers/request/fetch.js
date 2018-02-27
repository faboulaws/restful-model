require('isomorphic-fetch');
const qs = require('querystring');


function payloadRequest(method, url, payload = {}, query = {}, headers = {}) {
  const body = Object.values(payload).length > 0 ? JSON.stringify(payload) : '';
  let qry = Object.values(query).length > 0 ? `?${qs.stringify(query)}` : '';
  const options = {method, headers};
  if (body) {
    options.body = body;
  }
  return fetch(`${url}${qry}`, options)
      .then(response => response.json())
      .then((body) => {
        return {body};
      });
}

const request = {};

request.get = (url, query = {}, headers = {}) => {
  let qry = Object.values(query).length > 0 ? `?${qs.stringify(query)}` : '';
  return fetch(`${url}${qry}`, {method: 'GET', headers})
      .then(response => {
        return response.json()})
      .then((body) => {
        return {body};
      });
};

request.post = payloadRequest.bind(null, 'POST');
request.put = payloadRequest.bind(null, 'PUT');
request.delete = payloadRequest.bind(null, 'DELETE');

module.exports = request;