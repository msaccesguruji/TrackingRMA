/**
 * Example Google Apps Script function for calling a deployed
 * Next.js square-login endpoint and reading cookies from the response.
 */
function fetchSquareCookies() {
  var endpoint = 'https://YOUR_VERCEL_URL/api/square-login';
  var payload = {
    email: 'your-email@example.com',
    password: 'your-password',
    langCode: 'en-us',
    // Optional: raw Cookie header string if you want to seed browser cookies before login
    initialCookies: ''
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var status = response.getResponseCode();
    var body = response.getContentText();
    var json = JSON.parse(body);

    Logger.log('Status: %s', status);
    Logger.log('Response: %s', body);

    if (status !== 200 || !json.success) {
      throw new Error(json.error || 'Login request failed');
    }

    var cookies = json.cookies || [];
    cookies.forEach(function(cookie) {
      Logger.log('Cookie %s=%s (domain=%s; path=%s)', cookie.name, cookie.value, cookie.domain, cookie.path);
    });

    return cookies;
  } catch (error) {
    Logger.log('Square login error: %s', error.message || error);
    throw error;
  }
}
