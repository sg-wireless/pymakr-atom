const vtools = require('./functions-versions.js');

vtools.getCurrentVersions((atom_version, electron_version) => {
  console.log(`Atom current: ${atom_version}`);
  console.log(`Electron current: ${electron_version}`);
  vtools.loadLatest((atom_latest_version) => {
    console.log(`Atom Latest: ${atom_latest_version}`);
    if (vtools.versionBiggerThen(atom_latest_version, atom_version)) {
      console.log(`New version ${atom_latest_version} available! Download link:`);
      console.log(vtools.getDownloadUrl(atom_latest_version));
    }
  });
});
