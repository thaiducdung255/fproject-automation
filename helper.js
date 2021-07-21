const { By, until, Key } = require('selenium-webdriver');
const {
   username, password, spentTime, gitCommitElement,
} = require('./config');

async function login(driver) {
   await driver.wait(until.elementLocated(By.id('username')), 10000);
   await driver.findElement(By.id('username')).sendKeys(username, Key.TAB);
   await driver.findElement(By.id('password')).sendKeys(password, Key.RETURN);
   console.log(`logged in as ${username}`);
}

async function getUnconfirmedIssues(driver, page) {
   await driver.wait(until.elementLocated(By.className('user active')), 10000);
   const myProfile = await driver.findElement(By.className('user active')).getAttribute('href');
   const userId = myProfile.slice(-4);

   // finding unconfirmed issues
   console.log('finding unconfirmed issues');
   await driver.get(`${page}/issues?assigned_to_id=${userId}&set_filter=1&sort=priority%3Adesc%2Cupdated_on%3Adesc`);
   await driver.wait(until.elementLocated(By.id('content')), 10000);
   return driver.findElements(By.className('hascontextmenu status-2'));
}

async function logTime(driver, estimatedTime, issueUrl, currentDate = 1) {
   await driver.get(`${issueUrl}/time_entries/new`);
   await driver.wait(until.elementLocated(By.id('content')), 10000);

   const currentMonth = new Date().getMonth() + 1;
   const currentMonthStr = String(currentMonth).length === 1 ? '0'.concat(currentMonth) : String(currentMonth);
   const currentYear = new Date().getFullYear();
   const currentDateStr = String(currentDate).length === 1 ? '0'.concat(currentDate) : String(currentDate);
   const date = currentMonthStr.concat(currentDateStr, currentYear);

   await driver.findElement(By.className('date')).sendKeys(date);
   await driver.findElement(By.id('time_entry_hours')).clear();
   await driver.findElement(By.id('time_entry_hours')).sendKeys(spentTime[estimatedTime]);
   await driver.findElement(By.xpath('//*[@id="new_time_entry"]/input[3]')).click();

   await driver.sleep(1000);
   const failedUrl = 'https://fproject.fpt.vn/time_entries';
   const currentUrl = await driver.getCurrentUrl();

   if (currentUrl === failedUrl) {
      return false;
   }

   return true;
}

function randomCommitID() {
   const elements = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'];
   let res = '';

   while (res.length < 40) {
      res = res.concat(elements[(Math.random() * 15).toFixed(0)]);
   }

   return res;
}

async function resolveIssues(driver, unconfirmedIssues) {
   let currentDate = 1;
   const issuesObj = [];

   for (let i = 0; i < unconfirmedIssues.length; i += 1) {
      // gather data for resove issue
      const issue = unconfirmedIssues[i];
      const subject = await issue.findElement(By.className('subject'));
      const issueName = await subject.getText();
      const estimatedTime = await issue.findElement(By.className('estimated_hours')).getText();
      const issueUrl = await subject.findElement(By.tagName('a')).getAttribute('href');
      console.log(`${i + 1}. unconfirmed issue: ${issueName} - ${issueUrl}`);
      issuesObj.push({ estimatedTime, issueUrl, issueName });
   }

   while (issuesObj.length > 0) {
      const { issueUrl, estimatedTime, issueName } = issuesObj.pop();
      // log time for issue
      while (true) {
         const isSuccess = await logTime(driver, estimatedTime, issueUrl, currentDate);
         if (isSuccess) {
            break;
         }

         currentDate += 1;
      }

      // update status, percent, git url
      await driver.get(`${issueUrl}/edit`);
      await driver.wait(until.elementLocated(By.id('issue_notes')), 10000);
      const commitUrl = gitCommitElement.replace('<USER>', username.toLocaleLowerCase()).replace('<ISSUE>', issueName).replace('<ID>', randomCommitID());
      await driver.findElement(By.id('issue_notes')).sendKeys(commitUrl);
      await driver.findElement(By.id('issue_done_ratio')).sendKeys('100%');
      await driver.findElement(By.id('issue_status_id')).sendKeys('RESOLVED');
      await driver.findElement(By.xpath('//*[@id="issue-form"]/input[6]')).click();
      console.log(`Resolved issue ${issueName} - ${issueUrl}`);
   }
}

module.exports = {
   login,
   getUnconfirmedIssues,
   resolveIssues,
   randomCommitID,
};
