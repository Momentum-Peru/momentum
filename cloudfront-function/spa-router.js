// CloudFront Function — asociar al behavior Default (*) (Viewer Request)
// Maneja SPA routing para tecmeing (/) y momentum-rrhh (/rrhh/)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // momentum-rrhh: /rrhh/* sin extensión → /rrhh/index.html
  if (uri.startsWith('/rrhh/')) {
    if (!uri.match(/\.[a-zA-Z0-9]{2,10}$/)) {
      request.uri = '/rrhh/index.html';
    }
    return request;
  }

  // /rrhh sin slash final → redirigir para que Angular cargue correctamente
  if (uri === '/rrhh') {
    request.uri = '/rrhh/index.html';
    return request;
  }

  // tecmeing: /* sin extensión → /index.html
  if (!uri.match(/\.[a-zA-Z0-9]{2,10}$/)) {
    request.uri = '/index.html';
  }

  return request;
}
