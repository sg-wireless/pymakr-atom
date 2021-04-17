## [2.1.10] - 17.04.2021
### Fixed
* update bindings to match new atom version

## [2.1.9] - 15.01.2021
### Fixed
* confirmation dialog issue

## [2.1.8] - 30.11.2020
### Added
* Add support for Cypress Semiconductor used in PyGo cradle

## [2.1.7] - 28.10.2020
### Fixed
* confirmation dialog issue

## [2.1.6] - 14.10.2020
### Fixed
* update bindings to match new atom version

## [2.1.5] - 20.05.2020
### Fixed
* Invisible close icon

## [2.1.4] - 20.05.2020
### Fixed
* xterm related problem
* Invisible Pybytes label in Pybytes button
* .css file not found being printed on console


## [2.1.3] - 18.05.2020
### Added
* Binaries for the new upcoming Atom update (1.47).
* Pybytes Panel, where you can find the best features of Pybytes.
### Fixed
* Pymakr can't find some devices tabs (mostly with PyJTAG boards), which causes unexpected tabs behaviour (closing, opening, closing all, opening all, tabs sync).


## [2.1.2] - 06.3.2020
### Added
* Terminal auto focus.
### Changed
* Space between sidebar items.
* Pycom logo.
* Pymakr colors (minor changes), better matching with Atom's color.
* Terminal left padding.
### Fixed
* Buggy artifact behind the terminal with a light theme selected.
* Connection tab hover color.
* Active connection tab is now draggable.
* Placeholder background color now matches the terminal color.
* Dropdown alignment.


## [2.1.1] - 19.2.2020
### Fixed
- Pymakr doesn't require to have git installed anymore.


## [2.1.0] - 18.2.2020
### Added
* Connection tabs are now fluid and responsive.
* Tooltip on hovering over a connection tab.
### Changed
* Minimum font size from 14 to 10.
### Fixed
* Error after downloading files from device in some cases.
* 'open on start' bug.
* Problem on connecting to device via Telnet.
* Connection state inconsistency.
### Removed
* Horizontal scroll from connection tabs bar.
* Terminal left padding, fixing selection alignment.


## [2.0.1] - 13.2.2020
### Added
* The connection tabs are now scrollable.
### Changed
* Changing the font size no longer requires restarting Atom.
* Improved terminal responsiveness.
* Improved themes compatibility.
### Fixed
* Circle from toggle connection button going out of the switch.


## [2.0.0]
* Improved UI: The interface has been completely rearranged, providing an objective, clear and beautiful layout.
* Multiple device connections: Now it’s possible to connect to multiple devices simultaneously, with one independent terminal for each one.
* Dynamic workspace: The current project is now selected on Pymakr (projects dropdown) and not on the Atom file-tree.  
* Font size customizable: Now it’s possible to change the terminal font size.
* Theme support: Now Pymakr supports current Atom's theme, matching with its color scheme.

## 1.5.6 - User experience improvements
* Now Pymakr shows a post-install notification if it failed to load Serialport library, asking the user to reload Atom.

## 1.5.5 - Compatibility update
* Updated supported Atom versions (>=1.41.0)

## 1.5.4 - Compatibility update
* Binaries removed for older Atom versions, significantly reducing package size (50%).

## 1.5.3 - Hotfix
* Updated post-install script

## 1.5.2 - Compatibility update
* Updated supported Atom versions

## 1.5.0 - Compatibility update
* Implemented new solution for multi platform compatibility.

## 1.4.18 - Hotfix
* Added @serialport/bindings to package.json to prevent issues on some installs (issue #143)

## 1.4.17 - Hotfix
* Added @serialport/bindings to package.json to prevent issues on some installs (issue #134)

## 1.4.16 - Hotfix
* Linux precompile error for Atom 1.40 and 1.41-beta
* Improved serialport lib repair code to fix issue #134

## 1.4.15 - Compatibility update
* Flagged compatible with Atom 1.40 and 1.41-beta
* Improved serialport lib repair code, lower chance of serialport compile issues

## 1.4.14 - Compatibility update
* Flagged compatible with Atom 1.38 and 1.39-beta

## 1.4.13 - Compatibility update
* Flagged compatible with Atom 1.36
* Removed feedback popup

## 1.4.12 - Hotfixes
* Hotfix for issue #115 (nullpointer after 3 retries of upload)
* Hotfix for upload memory usage and nullpointer during upload (by @josverl in vscode pull request)

## 1.4.11 - Bugfixes
* Solved error when upload button is pressed while loading (issue #112)
* Better feedback in terminal about autoconnect
* Added popup window to ask users for feedback about Pymakr 2.0
* Added setting for autoconnect comports, expanded default to support some boards on windows
* Better feedback when incorrectly setting sync_folder

## 1.4.10 - Bugfixes
* Small fixes for upload feature
* Auto Connect enabled by default
* Fixed small reference error when address is not configured (issue #111)
* Improved help text

## 1.4.9 - Fast upload
* Experimental 'fast upload' feature, using bigger chunks and zlib compression. Only for latest firmware
* Added feature for force-uploading single file only. Put under 'more' button for now (or `ctrl-shift-s`)
* Fixed terminal-freeze bug that happened after uploading when reboot-after-upload was disabled

## 1.4.8 - Stability improvements
* Fixed bug where terminal would freeze when not auto-rebooting after upload
* Flagged compatible with atom 1.34.x

## 1.4.7 - Stability improvements
* Added a warning when safe boot fails before upload or download
* Flagged compatible with atom 1.33.x

## 1.4.6 - Stability improvements
* Removed dependancy grouping from precompiled serialport lib (issue #106)
* Added symlink support for files in upload feature
* When code is selected, only selection is used when clicking 'run'
* Added shortcut to run current cursor line / selection (ctrl-shift-enter)
* Improved hash-check after upload for memory usage, added error handling when memory runs out
* Safe-boot before retrying to upload a file that failed due to memory error.

## 1.4.5 - Updates
* Tagged atom v1.32 compatible
* Added automation and update detection scripts for easier rebuilds

## 1.4.4 - Bugfix for windows
* Fixed an issue on windows where serialport lib fails to install.

## 1.4.3 - Bugfixes
* Flagged compatible with atom 1.31
* Fixed failing upload issues
* Removed hash-check after upload for >500kb files (too slow)
* Added DNS lookup for address [@ldecicco]
* Added basic py_ignore setting for ignoring specific files for upload
* Added common issue with linux permissions to readme file

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
