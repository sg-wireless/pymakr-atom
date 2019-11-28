const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const gitToken = core.getInput("git-token") || process.env.GITHUB_TOKEN;
const octokit = new github.GitHub(gitToken);

const repo = {
  owner: "atom",
  repo: "atom"
};

const unsupportedElectronVersions = ["3.1.10"];

/**
 * Resolves Electron runtime target for given
 * Atom git tag
 *
 * @param {string} tag - VSCode Git Tag
 * @returns {*} Object with tag and runtime_version
 */
const resolveElectronVersion = async tag => {
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

/**
 * Fetches three different electron versions from Atom Git Tags
 *
 * @param {number} count - maximum number of versions to return
 * @returns {string[]} Array containing master and 3 of the latest tags
 */
const getAtomTagsElectron = async (count = 3) => {
  try {
    console.log("Fetching tags...");
    const tags = (
      await octokit.repos.listTags({
        ...repo,
        per_page: 50
      })
    ).data.map(item => item.name);
    const atomNightlyTag = tags[0];
    const atomCurrentTag = "master";
    const atomNightlyElectron = await resolveElectronVersion(atomNightlyTag);
    const atomCurrentElectron = await resolveElectronVersion(atomCurrentTag);
    const electronVersions = [];
    electronVersions.push(atomCurrentElectron);
    if (atomCurrentElectron != atomNightlyElectron)
      electronVersions.push(atomNightlyElectron);
    const filteredFoundTags = electronVersions.filter(
      item =>
        !unsupportedElectronVersions.some(
          version => version === item
        )
    );
    if (filteredFoundTags.length != electronVersions.length) {
      console.log(
        `\nRemoved ${foundTags.length -
          filteredFoundTags.length} unsupported electron version (${unsupportedElectronVersions.join(
          ", "
        )})`
      );
    }
    core.info(`\nElectron Versions: ${filteredFoundTags} \n`);
    core.setOutput("versions", filteredFoundTags);
  } catch (error) {
    core.setFailed(error.message);
  }
};

getAtomTagsElectron();
