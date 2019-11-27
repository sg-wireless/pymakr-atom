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
    const foundTags = [];
    for (let i = 0; i <= tags.length && foundTags.length < count; i++) {
      const electronVersion = await resolveElectronVersion(tags[i]);
      if (
        electronVersion &&
        !foundTags.find(item => item.electronVersion === electronVersion)
      )
        foundTags.push({ version: tags[i], electronVersion });
    }

    console.log("");
    foundTags.forEach(item => {
      console.log(
        `Selected Atom ${item.version} (electron v${item.electronVersion})`
      );
    });
    const filteredFoundTags = foundTags.filter(
      item =>
        !unsupportedElectronVersions.some(
          version => version === item.electronVersion
        )
    );
    if (filteredFoundTags.length != foundTags.length) {
      console.log(
        `\nRemoved ${foundTags.length -
          filteredFoundTags.length} unsupported electron version (${unsupportedElectronVersions.join(
          ", "
        )})`
      );
    }
    const versions = filteredFoundTags.map(item => item.electronVersion);
    core.info(`\nElectron Versions: ${versions} \n`);
    core.setOutput("versions", versions);
  } catch (error) {
    core.setFailed(error.message);
  }
};

getAtomTagsElectron();
