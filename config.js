require('dotenv/config');

module.exports = {
   isResolveMode: process.env.IS_RESOLVE_MODE === 'true',
   isFproject: process.env.IS_FPROJECT === 'true',
   username: process.env.USERNAME || 'username',
   password: process.env.PASSWORD || 'password',
   gitCommitUrl: process.env.GIT_COMMIT_URL || 'git commit url',
   gitCommitProjects: (process.env.GIT_COMMIT_PROJECTS || '').split(','),
   excludedIssues: (process.env.EXCLUDED_ISSUES || '').split(','),
   apiKey: process.env.API_KEY || 'no api key',
   spentTime: {
      '4.00': '3',
      '8.00': '6',
   },
   verifyTask: {
      usernames: (process.env.VERIFY_TASK_USERNAMES || '').split(','),
   },
};
