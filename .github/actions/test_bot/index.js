const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');

// try {
//   const nameToGreet = core.getInput('who-to-greet');
//   console.log(`Hello ${nameToGreet}!`);
//   const time = (new Date()).toTimeString();
//   core.setOutput("time", time);
//   const payload = JSON.stringify(github.context.payload, undefined, 2);
//   console.log(`The event payload: ${payload}`);
// } catch (error) {
//   core.setFailed(error.message);
// }

const commands = [
  {name: 'hello', regex: new RegExp('^\/hello.*$')},
];

let command = commands.find((x) => { return x.regex.test('/hello') });

async function run() {
  const token = core.getInput('token');
  const octokit = github.getOctokit(token);
  const payload = github.context.payload;

  console.log(payload);

  let myOutput = '';
  let myError = '';

  const options = {};

  options.listeners = {
    stdout: (data) => {
      myOutput += data.toString();
    },
    stderr: (data) => {
      myError += data.toString();
    }
  };

  const { data: files } = await octokit.pulls.listFiles({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.number,
  });

  console.log(files);

  let changed = files.filter((x) => { 
    return x.status == 'added' 
  }).map((x) => { 
    return x.filename 
  });

  await exec.exec('flake8', changed, options);

  core.setFailed('FAILED');

  octokit.issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    body: `This PR is ok....`,
  });
}

run();
