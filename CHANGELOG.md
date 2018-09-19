## 1.4.2 - Bugfixes
* Run button now works for preview files (one click on file instead of double)
* Bindings issue fixed for serialport lib
* Added warning when board is connected in another atom window

## 1.4.1 - Bugfixes
* Symlink folders no longer ignored when uploading
* Comport prioritising fixed
* Fixed hash comparison in upload feature
* Small bugfixes, code synchronization with VSCode

## 1.4.0 - Upload feature improvements
* Support for uploading (and downloading) binary files like images and mpy files
* Added auto-connect feature
* Added settings option to allow upload of all file types
* Upload stability improvements and hash file checks, retries and remembering half-succeeded uploads
* Fixed small layout bugs in button display

## 1.3.4 - Bugfixes
* atom 1.28.0 support

## 1.3.3 - Bugfixes
* atom 1.27.2 support

## 1.3.2 - Bugfixes
* atom 1.27.1 support

## 1.3.1 - Bugfixes
* Small bugfix in error handling of the upload feature
* Added reboot_after_upload instructions to help feature
* Synchronize codestyle and API with the VSCode plugin

## 1.3.0 - Upload refactor
* Complete rebuild of the upload and download code that fixes multiple bugs.
* Bugfix in in project config
* Support for Atom v1.26.1 and v1.27.0
* Added manufacturer info to serialport list
* Fix for windows32 serialport issue
* More reliable install script

## 1.2.12 - atom v1.26 Compatibility
* Updated package.json to support latest atom beta version

## 1.2.11 - atom v1.25 Compatibility
* win32 and linux serialport-lib precompiles fixed for atom v1.25

## 1.2.10 - atom v1.25 Compatibility
* win64 and OSX serialport-lib precompiles fixed for atom v1.25

## 1.2.9 - Bugfix
* Atom v1.24.1 support
* Improved ctrl-c before upload to stop running code

## 1.2.8 - Automatic soft-boot option and bugfixes
* Added feature that automatically soft boots before uploading (off by default)
* Changed 'reconnect' button to 'disconnect'
* Added shortkey for disconnect
* Bugfix: allow file to run when extension is uppercase (.PY)
* Bugfix: detect project settings when opening a folder from an empty window

## 1.2.7 - Hotfix copy from terminal
* Fix for not being able to copy output from terminal

## 1.2.6 - Hotfix
* Fix for problems with LESS file path and missing bindings file

## 1.2.5 - hotfix
* Fix for manditory lowercase packagename in latest Atom

## 1.2.3 - atom v1.24.0 support
* v1.24.0 support

## 1.2.2 - bugfixes
* Fixed upload issue on windows machines
* Added check for available space on boards before uploading

## 1.2.1 - versioning update
* atom v1.23.0 compatibility added
* Bugfix for paste in terminal on mac (cmd-v instead of ctrl-v)

## 1.2.0 - Download feature, multi project support
* Splits 'sync' into 'download' and 'upload'
* Adds detection for selected project in the tree-view
* Better stability for upload

## 1.1.5 - Hotfix
* Compatibility until 1.22.0 tested
* Small bugfixes sync feature

## 1.1.4 - Bugfixes
* Serialport installation fix for linux
* Bugfix in sync code, caused in 1.1.3
* Sync support for old wipy 1.0

## 1.1.3 - Bugfixes
* Support for atom 1.20.1
* Small bugfixes in sync
* Fixed 'name undefined' error during run
* Disappearing connect/sync/run buttons fixed

## 1.1.1 - Win64 bugfix
* Serialport library improved for 64 bit
* Small bugfix in communication protocol

## 1.1.0 - Shared codebase with VSCode plugin
* Big refactor to get a shared base code with the VSCode plugin
* Added 'open_on_start' config
* Fixes issues with serialport lib for newer versions of atom
* Bugfix in the run feature on linux.
* More relaxed keep-alive protocol on telnet (ping has to fail twice before connection break)

## 1.0.3 - Serialport fix for atom 1.17
* Fixes issues with serialport lib on windows32 and problems in newer atom versions 1.17.2 and 1.18

## 1.0.2 - Bugfixes
* Added timeout and reconnect logic on serial connection (useful for pysense/pytrack sleep)
* Pysense/pytrack serialport detection
* Bugfix related to project settings not refreshing (issue #23)
* Ignoring hidden and empty subfolders during synchronize

## 1.0.1 - Bugfixes
* Multiple typo's and small bugfixes
* Added an option to get the wifi AP SSID from the board
* UI updates including pycom logo
* Increased maximum lines in terminal to 5000

## 1.0.0 - Stable release
* Added project specific settings
* Added serial port detection (in sub-navigation under the 'more' button)
* Multiple bug fixes for synchronization over serial
* Terminal height now resizable by dragging the top edge
* Fixed 'failed to connect' bug when reconnecting on telnet

## 0.9.4 - Stability improvements
* Include precompiled serialport libs for mac and linux
* Improved error handling and stability on sync
* Running files is now possible for unsaved files
* Bugfixes for pasting multiple lines and cmd-c/cmd-v commands.
* Fixed connection issue when using telnet to a device access point

## 0.9.3 - First round of bugfixes
* Improved sync stability and speed over serial
* Solved disappearing line in terminal (github issue 3)
* Other small bugfixes
* Logger class for easier debugging

## 0.9.2 - First Release
* Connection over serial and telnet using REPL
* Sync feature
* Run feature
* Close / open terminal
