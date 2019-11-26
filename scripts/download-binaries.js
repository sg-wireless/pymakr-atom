const gitTags = require("git-tags");
const axios = require("axios");
const shell = require("node-powershell");

let ps = new shell({
  executionPolicy: "Bypass",
  noProfile: true
});
const fetchElectronVersion = async tag => {
  try {
    const response = await axios.get(
      `https://raw.githubusercontent.com/atom/atom/${tag}/package.json`
    );
    console.log(response.data.electronVersion);
    return response.data.electronVersion;
  } catch {
    return "";
  }
};

const getBinaries = async (count = 3) => {
  console.log("Fetching tags...");

  gitTags.get("atom", async (err, tags) => {
    if (err) throw err;
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
  });
};



getBinaries(3);
