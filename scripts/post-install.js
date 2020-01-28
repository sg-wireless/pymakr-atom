const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');

const dir = __dirname.replace('/scripts', '').replace('\\scripts', '');
const bindings_target = `${dir}/node_modules/@serialport/bindings/build/release`;
const bindings_target_capital = `${dir}/node_modules/@serialport/bindings/build/Release`;


function copyFileSync(source, target) {
  let targetFile = target;

  // if target is a directory a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, target) {
  let files = [];

  // check if folder needs to be created or integrated
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
  return true;
}

function postInstall() {
  try {
    rimraf.sync(bindings_target);
    rimraf.sync(bindings_target_capital);
    console.log(
      `\nCleaned the '${bindings_target}' \nfolder to prevent including native modules in the default location and breaking cross-platform portability.`,
    );
    console.log(
      'Copy all /native_modules into the /node_modules for cross platform packaging',
    );
    copyFolderRecursiveSync(
      `${dir}/native_modules/@serialport`,
      `${dir}/node_modules`,
    );
    console.log('Success.');
  } catch (error) {
    console.log("Failed to copy bindings file, pymakr won't work");
    console.log(error);
  }
}

postInstall();
