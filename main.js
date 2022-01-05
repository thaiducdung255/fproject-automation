const {
   Capabilities, Builder,
} = require('selenium-webdriver');

const chromedriver = require('chromedriver');
const chrome = require('selenium-webdriver/chrome');

const {
   login, getUnconfirmedIssues, resolveIssues, getAndVerifyResolvedIssues,
} = require('./helper');

const { isFproject, isResoveMode } = require('./config');

if (process.platform.slice(0, 3) === 'win') {
   chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());
}

let driver;

process.on('uncaughtException', async (err) => {
   console.log(`Server exited with error: ${err.toString()}\n${err.stack}`);
   driver && await driver.quit();
   process.exit(1);
});

process.on('SIGINT', async () => {
   console.log('Server stopped');
   process.exit(1);
});

const caps = Capabilities.chrome();
const options = new chrome.Options(caps);
options.addArguments('headless');

driver = new Builder()
   .forBrowser('chrome')
   .setChromeOptions(options)
   .build();

async function init() {
   const page = isFproject ? 'https://fproject.fpt.vn' : 'https://redmine.org/login';

   if (isResoveMode) {
      console.log(`loading page: ${page}`);
      await driver.get(page);

      await login(driver);

      const unconfirmedIssues = await getUnconfirmedIssues(driver, page);
      await resolveIssues(driver, unconfirmedIssues);
      console.log('Resolved all unconfirmed issues');
      await driver.quit();
   } else {
      await getAndVerifyResolvedIssues(page);
      console.log('Verified all resolved issues');
   }
}

init();
