const https = require('https');
const { exec } = require('child_process');

// params
const url = 'https://api.github.com/repos/atom/atom/releases/latest';
const download_url_tmp = 'https://github.com/atom/atom/releases/download/v'; // add: <version>/<filename>
const path_latest = '';// "/atom/atom/releases/latest"
const request = require('request');

const filenames = {
  win32: 'atom-windows.zip', win64: 'atom-x64-windows.zip', darwin: 'atom-mac.zip', linux: 'atom.x86_64.rpm', aix: 'atom.x86_64.rpm',
};

module.exports = {
  getCurrentVersions(cb) {
    exec('atom --version', (error, stdout, stderr) => {
      const atom_version = stdout.substring(stdout.indexOf(':') + 2, stdout.indexOf('Electron') - 1);
      const electron_version = stdout.substring(stdout.indexOf('Electron') + 10, stdout.indexOf('Chrome') - 1);
      cb(atom_version, electron_version);
    });
  },

  getDownloadUrl(version) {
    const filename = this.getDownloadFileName();
    return `${download_url_tmp + version}/${filename}`;
  },

  loadLatest(cb) {
    getContent(url + path_latest, (data) => {
      const json_data = JSON.parse(data);
      if (json_data) {
        const version = json_data.name;
        cb(version);
      } else {
        cb();
      }
    });
  },

  getDownloadFileName() {
    let plf = process.platform;
    if (plf == 'win32' && process.arch != 'ia32') {
      plf = 'win64';
    }
    return filenames[plf];
  },
  versionBiggerThen(a, b) {
    let i; let
      diff;
    const regExStrip0 = /(\.0+)+$/;
    const segmentsA = a.replace(regExStrip0, '').split('.');
    const segmentsB = b.replace(regExStrip0, '').split('.');
    const l = Math.min(segmentsA.length, segmentsB.length);

    for (i = 0; i < l; i++) {
      diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
      if (diff) {
        return diff;
      }
    }
    return segmentsA.length - segmentsB.length;
  },
};
function getContent(url, cb) {
  const headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const options = {
    url,
    method: 'GET',
    headers,
  };

  request(options, (error, res, body) => {
    const data = '';
    cb(body);
  });
}
