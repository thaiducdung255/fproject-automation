const { By, until, Key } = require('selenium-webdriver');
const { writeFileSync, readFileSync } = require('fs');
const axios = require('axios');

const {
   username,
   password,
   spentTime,
   gitCommitUrl,
   gitCommitProjects,
   excludedIssues,
   verifyTask,
   apiKey,
} = require('./config');

const { usernames } = verifyTask;

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
   await driver.get(`${page}/issues?assigned_to_id=${userId}`);
   await driver.wait(until.elementLocated(By.id('content')), 10000);
   return driver.findElements(By.className('hascontextmenu status-2'));
}

async function getAndVerifyResolvedIssues(page) {
   const getIssuesUrl = `${page}/issues.json?key=${apiKey}&limit=500&status_id=5&author_id=me`;
   const getIssuesResp = await axios.get(getIssuesUrl);

   const issues = getIssuesResp?.data?.issues.filter(
      (issue) => !excludedIssues.includes(issue.id) && usernames.includes(issue.assigned_to.name),
   );

   issues.forEach(async (issue, index) => {
      const updateIssueUrl = `${page}/issues/${issue.id}.json?key=${apiKey}`;
      await axios.put(updateIssueUrl, { issue: { status_id: 6 } });
      console.log(`Verified issue ${index + 1}/${issues.length}: ${issue.id}`);
   });
}

async function logTime(
   driver,
   estimatedTime,
   issueUrl,
   currentDate = 1,
   currentMonth = new Date().getMonth() + 1,
   currentYear = new Date().getFullYear(),
) {
   await driver.get(`${issueUrl}/time_entries/new`);
   await driver.wait(until.elementLocated(By.id('content')), 10000);

   const currentMonthStr = String(currentMonth).length === 1 ? '0'.concat(currentMonth) : String(currentMonth);
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
   let currentMonth = new Date().getMonth() + 1;
   let currentYear = new Date().getFullYear();

   try {
      const ddMMyyyy = readFileSync('./last-log-time').toString();

      if (ddMMyyyy) {
         const [dd, mm, yyyy] = ddMMyyyy.split('/');
         currentDate = Number(dd);
         currentMonth = Number(mm);
         currentYear = Number(yyyy);

         if (Number.isNaN(currentDate)) {
            currentDate = 1;
         }

         if (Number.isNaN(currentMonth)) {
            currentMonth = new Date().getMonth() + 1;
         }

         if (Number.isNaN(currentYear)) {
            currentYear = new Date().getFullYear();
         }
      }
   } catch (err) {
      console.log({ err });
   }

   const issuesObj = [];

   for (let i = 0; i < unconfirmedIssues.length; i += 1) {
      // gather data for resove issue
      const issue = unconfirmedIssues[i];
      const subject = await issue.findElement(By.className('subject'));
      const issueName = await subject.getText();
      const estimatedTime = await issue.findElement(By.className('estimated_hours')).getText();
      const issueUrl = await subject.findElement(By.tagName('a')).getAttribute('href');
      const issueId = issueUrl.split('/').slice(-1)[0];

      // eslint-disable-next-line no-continue
      if (excludedIssues.includes(issueId)) continue;
      issuesObj.push({ estimatedTime, issueUrl, issueName });
   }

   const totalIssues = issuesObj.length;
   let index = 0;

   while (totalIssues > 0) {
      const { issueUrl, estimatedTime, issueName } = issuesObj.pop();
      // log time for issue
      while (true) {
         const isSuccess = await logTime(
            driver,
            estimatedTime,
            issueUrl,
            currentDate,
            currentMonth,
            currentYear,
         );

         if (isSuccess) {
            index += 1;
            break;
         }

         currentDate += 1;

         if (currentDate >= 28) {
            currentDate = 1;

            if (currentMonth) {
               currentMonth = 1;
               currentYear += 1;
            } else {
               currentMonth += 1;
            }
         }
      }

      // update status, percent, git url
      await driver.get(`${issueUrl}/edit`);
      await driver.wait(until.elementLocated(By.id('issue_notes')), 10000);
      const randomProjectId = ~~(Math.random() * (gitCommitProjects.length - 1));
      const randomProject = gitCommitProjects[randomProjectId];
      const commitUrl = gitCommitUrl.replace('<USER>', username.toLocaleLowerCase()).replace('<PROJECT>', randomProject).replace('<ID>', randomCommitID());
      await driver.findElement(By.id('issue_notes')).sendKeys(commitUrl);
      await driver.findElement(By.id('issue_done_ratio')).sendKeys('100%');
      await driver.findElement(By.id('issue_status_id')).sendKeys('RESOLVED');
      await driver.findElement(By.xpath('//*[@id="issue-form"]/input[6]')).click();
      console.log(`[${index}/${totalIssues}] Resolved issue ${issueName} - ${issueUrl}`);
   }

   writeFileSync('./last-log-time', String(currentDate).concat('/', currentMonth, '/', currentYear));
}

module.exports = {
   login,
   getUnconfirmedIssues,
   resolveIssues,
   randomCommitID,
   getAndVerifyResolvedIssues,
};
