const puppeteer = require('puppeteer');
const request = require('request-promise-native');
const poll = require('promise-poller').default;

const siteDetails = {
  sitekey: '6LeTnxkTAAAAAN9QEuDZRpn90WwKk_R1TRW_g-JC',
  pageurl: 'https://old.reddit.com/login'
}

const getUsername = require('./get-username');
const getPassword = require('./get-password');
const apiKey = require('./api-key');

const chromeOptions = {
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:false, 
  slowMo:10,
  defaultViewport: null
};

(async function main() {
  const browser = await puppeteer.launch(chromeOptions);

  const page = await browser.newPage();

  await page.goto('https://old.reddit.com/login');

  const requestId = await initiateCaptchaRequest(apiKey);

  await page.type('#user_reg', getUsername());

  const password = getPassword();
  await page.type('#passwd_reg', password);
  await page.type('#passwd2_reg', password);

  const response = await pollForRequestResults(apiKey, requestId);
  
  await page.evaluate(`document.getElementById("g-recaptcha-response").innerHTML="${response}";`);

  page.click('#register-form button[type=submit]');
})()

async function initiateCaptchaRequest(apiKey) {
  const formData = {
    method: 'userrecaptcha',
    googlekey: siteDetails.sitekey,
    key: apiKey,
    pageurl: siteDetails.pageurl,
    json: 1
  };
  const response = await request.post('http://2captcha.com/in.php', {form: formData});
  return JSON.parse(response).request;
}

async function pollForRequestResults(key, id, retries = 30, interval = 1500, delay = 15000) {
  await timeout(delay);
  return poll({
    taskFn: requestCaptchaResults(key, id),
    interval,
    retries
  });
}

function requestCaptchaResults(apiKey, requestId) {
  const url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
  return async function() {
    return new Promise(async function(resolve, reject){
      const rawResponse = await request.get(url);
      const resp = JSON.parse(rawResponse);
      if (resp.status === 0) return reject(resp.request);
      resolve(resp.request);
    });
  }
}

const timeout = millis => new Promise(resolve => setTimeout(resolve, millis))
