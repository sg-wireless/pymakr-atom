The serialport library has to be re-build against the version of electron of the latest atom (folder /precompiles)

- Get the version of the latest atom version
  - run 'process.versions.electron' in the atom dev console
- In 'index.js' change the 'electron_version' variable to this version
- Run rebuild.js. This will:
  - Remove node_modules
  - Run 'apm install' again
    - this will trigger index.js to be run, that will rebuild serialport using electron-rebuild
  - Find the bindings.node file from node_modules/@serialport/bindings/build/Release/bindings.node
  - Copy that bindings.node file to 'precompiles/serialport-<os>'

To recompile for all OS systems, we'll have to run the above script on those operating systems: linux, osx, win32 and win64

More documentation on electron rebuild:
- https://github.com/electron/electron-rebuild
