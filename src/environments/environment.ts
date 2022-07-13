// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  DEFAULT_TIMEOUT: 6000*10,
  apiUrl: 'https://www.epaperweekly.net',
  stripeApiUrl: 'https://epaperweekly-gw.herokuapp.com/stripe.php',
  newsApiUrl: 'https://epaperweekly-gw.herokuapp.com/news-api.php',
  newsAylienApiUrl: 'https://www.epaperweekly.net/news-api-full.php',
  webHoseApiUrl: 'https://epaperweekly-gw.herokuapp.com/news-api.php',
  quotesApiUrl: 'https://epaperweekly-gw.herokuapp.com/quotes.php',
  payPalTokenApiUrl: 'https://epaperweekly-gw.herokuapp.com/paypal-token.php',
  payPalApiUrl: 'https://epaperweekly-gw.herokuapp.com/paypal.php',
  stripePubKey: 'pk_live_CRHTYbBe9YxvIYOyt2pUfm0m',
  twilio:{
    accountSID: 'AC65c231dbfff16ac7c902155e1cf9b719',
    authToken: 'c68ce4c5c5895cd125a46da5d731461b'
  },
  firebase: {
    apiKey: 'AIzaSyBY6CzFrbSfo1eODrzXQ626atLyfSaLHBY',
    authDomain: 'epaperweekly-cc7ed.firebaseapp.com',
    databaseURL: 'https://epaperweekly-cc7ed.firebaseio.com',
    projectId: 'epaperweekly-cc7ed',
    storageBucket: 'epaperweekly-cc7ed.appspot.com',
    messagingSenderId: "538548774414",
    appId: "1:538548774414:web:263c4e428d6c3510b87e5f",
    measurementId: "G-72VMT2YFD9"
  }
};
