const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const io = require('@actions/io');

function formatFileDetails(data) {
  let rows = data.map((x) => {
    return `${x.code} | ${x.line_number} | ${x.column_number} | ${x.text}`;
  });

  const header = `Code | Line Number | Column Number | Text`;
  const spacer = `---- | ----------- | ------------- | ----`;

  return `${header}\n${spacer}\n${rows.join("\n")}`;
}

function formatFlake8(data) {
  return Object.keys(data).map((x) => {
    let fileDetails = formatFileDetails(data[x]);

    return `<details>\n<summary>${x} (${data[x].length})</summary>\n\n${fileDetails}\n</details>\n`; 
  }).join('\n');
}

async function run() {
  let exitCode = 0;

  const token = core.getInput('token');
  const octokit = github.getOctokit(token);
  const payload = github.context.payload;

  const flake8_args = ['--format=json'];

  let {data: files} = await octokit.pulls.listFiles({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.number,
  });

  console.log(files);
  
  files = files.filter((x) => {
    return x.status === 'added';
  }).map((x) => {
    return x.filename;
  });

  console.log(`Found ${files.length} changed files`);

  console.log(`Flake8 args ${flake8_args}`);

  let outputTxt = '';

  const options = {
    listeners: {
      stdout: (data) => {
        outputTxt += data.toString();
      },
    }
  };

  try {
    await exec.exec('flake8', flake8_args.concat(files), options);
  } catch (error) {
    console.log(`Flake8 error: ${error.message}`);

    exitCode = 1;
  }

  console.log(`Output ${outputTxt}`);

  if (exitCode === 1) {
    console.log(`${outputTxt}`);
    core.setFailed(formatFlake8(JSON.parse(outputTxt)));
  }
}

run();
