const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const io = require('@actions/io');

async function run() {
  let exitCode = 0;

  const token = core.getInput('token');
  const octokit = github.getOctokit(token);
  const payload = github.context.payload;

  const flake8_args = ['--format=json', '--output=flake8_output.json'];

  let {data: files} = await octokit.pulls.listFiles({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.number,
  });
  
  files = files.filter((x) => {
    return x.status === 'added';
  }).map((x) => {
    return x.filename;
  });

  console.log(`Found {files.length()} changed files`);

  console.log(`Flake8 args {flake8_args}`);

  let outputTxt = '';

  const options = {
    stdout: (data) => {
      outputTxt += data.toString();
    },
  };

  try {
    await exec.exec('flake8', flake8_args.concat(files), options);
  } catch (error) {
    console.log(`Flake8 error: {error.message}`);

    exitCode = 1;
  }

  if (exitCode === 1) {
    core.setFailed(outputTxt);
  }
}

run();
