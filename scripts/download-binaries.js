const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const gitToken = core.getInput("git-token") || process.env.GITHUB_TOKEN;
const octokit = new github.GitHub(gitToken);
const shell = require("node-powershell");

const repo = {
  owner: "atom",
  repo: "atom"
};

let ps = new shell({
  executionPolicy: "Bypass",
  noProfile: true
});
const fetchElectronVersion = async tag => {
  try {
    // Fetch package.json file (contains electron target)
    const response = await axios.get(
      `https://raw.githubusercontent.com/atom/atom/${tag}/package.json`
    );
    const version = response.data.electronVersion.toString();
    core.info(`Atom ${tag} uses Electron v${version}`);
    return version;
  } catch (e) {
    throw e;
  }
};

const getBinaries = async (count = 3) => {
  console.log("Fetching tags...");
  const tags = (
    await octokit.repos.listTags({
      ...repo,
      per_page: 50
    })
  ).data.map(item => item.name);
  const foundTags = [];
  for (let i = 0; i <= tags.length && foundTags.length < count; i++) {
    console.log(tags[i]);
    const electronVersion = await fetchElectronVersion(tags[i]);
    if (
      electronVersion &&
      !foundTags.find(item => item.electronVersion === electronVersion)
    )
      foundTags.push({ version: tags[i], electronVersion });
  }
  console.log("\n");
  foundTags.forEach(item => {
    console.log(`${item.version} uses ${item.electronVersion}`);
  });
  const electronVersions = foundTags.map(item => item.electronVersion);
  console.log("\n");
  console.log(`Downloading binaries for ${electronVersions.join(", ")}`);

  ps.addCommand(
    "/Users/pk/dev/pycom/pymakr-atom/scripts/mp-download-atom.ps1",
    [{ ElectronVersions: electronVersions }]
  );

  // IMPORTANT: ps.dispose() MUST be called for execution to finish.
  ps.invoke()
    .then(output => {
      console.log(output);
      ps.dispose(); // This was missing from your code.
    })
    .catch(err => {
      console.log(err);
      ps.dispose();
    });
};

getBinaries(3);
