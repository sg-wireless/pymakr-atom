#  Pymakr Atom Package

Pymakr enables you to communicate to your Pycom board using the build in command line REPL. Run a single file to your board, sync your entire project or directly type and execute commands.

- Works with Mac OSX, Linux and windows.
- Connects to any Pycom board: WiPy, WiPy2.0, LoPy and any newer board.
- Works best with firmware 1.6.11.b1 and higher. Earlier firmware might have unexpected behaviour when synchronizing files over serial.


More info and documentation can be found on https://docs.pycom.io/

## Usage

The commandline will open by default after the package is installed. Use the 'settings' button on the right to setup the board. After changing the settings, press the 'connect' button to connect using the new settings.

At any time, use the 'close' button on the far right to close the commandline. The connection to the devices will always be closed when the terminal closes. Resetting a connection is done by clicking the 'Reconnect' button.

Useful keymaps:

- `ctrl-opt/alt-c`: (Re)connect
- `ctrl-opt/alt-t`: Toggle terminal
- `ctrl-opt/alt-s`: Synchronize project
- `ctrl-opt/alt-r`: Run current file

## Settings

To connect to your board, use the 'settings' button on the right top of the terminal to go to the plugin settings. You can also use cmd-, (ctrl-, on windows and linux) and navigate to the Pymakr package settings.

Fill in the correct IP address or comport for your device. If you changed your username and password to something else than 'micro' and 'python', please update them accordingly if you connect over IP. Username and password are not required when using serial.

If you want to synchronize a subfolder of your project instead of the entire project, enter the name of the subfolder in the 'sync folder' field (for more info, see the Sync chapter below)

## REPL

Using the REPL is easy and works the same way as your commandline based telnet or serial connection to your board. Type any micro-python command, use tab to auto-complete, arrow keys to go back in history and any of the following commands:
- `CTRL-B`: Enter friendly REPL
- `CTRL-C`: Stop any running code
- `CTRL-D`: Soft reset
- `CTRL-E`: Paste mode

Ctrl-C and Ctrl-V (or cmd-c/cmd-v on mac) can also be used to copy and paste in the console.

## Run

The 'run' button on the right top of the commandline will run the code from the currently open file to the connected board. Any print output or exceptions from this code will appear in the commandline

## Sync (download / upload)

The `upload` button will synchronize all files in your project to the board. Make sure you have a `main.py` and `boot.py` file in your project if you want to make sure your board will run properly. After uploading, the board will be reset. it might take a few seconds to reconnect if you are using a telnet connection.

If you want to upload only a certain folder in your project, use the 'Sync folder' field in the settings and add the folder name.

By default, only the following file types are synchronized: py, txt, log, json and xml. This can be changed using the 'Sync file types' field in the settings.

The upload limit is set to 350kb. If your sync folder contains more than that, the terminal will refuse to sync.

The `download` button does the opposite: it reads the files from the board and will download it to your project (or subfolder in case you changed the 'sync folder' setting). Before it overwrites your local files, a confirmation box will be shown. This box will also give the option to download only new files instead of overwriting existing ones.

The download feature also uses the 'sync file types' and 'sync folder' settings to determine which files will be downloaded and to which folder they are saved.

## Manual install

To manually install the plugin, follow these steps
- Delete any existing installation of the plugin
- Download the code from github
- Override all files in the `~/.atom/packages/pymakr` folder
- If you haven't installed Pymakr before, place the files in any folder and run `apm link`
- Run the commands `apm install` (or `npm install` if apm is not available) from package folder
- Restart atom

## Common issues

### Failed to load package: Cannot find module 'serialport'
In some cases this is caused by the atom package manager (apm) using python 3.x, while node-gyp (used for compiling the serialport lib) needs python 2.x. To confirm this, `apm --version` can be run to check which python version apm is using.

Solution: Tell the package manager to use python 2 instead. Running the following command switches apm to 2.7:

`echo "python=/usr/bin/python2.7" >> ~/.atom/.apmrc`

Now reinstall Pymakr or run `apm install` from the Pymakr package located in `~/.atom/packages/pymakr`

## 'Could not locate the bindings file'
If the installation of the serialport library failed, it reverts back to the precompiled version that is included in the plugin. This is compiled for the latest versions of atom and loses compatibility with older versions.

Solution: upgrade to the latest Atom (1.19.0 or higher) or install the previous version of the plugin (```apm install pymakr@1.0.3```)

### Synchronizing a project results in 'Failed to allocate memory' error
Synchronizing takes a bit of memory, so this error can occur when code running on the board already is taking a substantial amount of memory.

Solution: Run the board in [safe mode](https://docs.pycom.io/pycom_esp32/pycom_esp32/toolsandfeatures.html#boot-modes-and-safe-boot) when synchronizing

### Any error where the traceback contains `\.atom\packages\Pymakr\` with a capital P
This happened after Pymakr renamed to pymakr (lowercase) starting at version 1.2.5, but Atom remembers the old folder name inside the packages folder.

Solution:
- Uninstall Pymakr
- Remove folder: `~/.atom/.apm/Pymkr`
- Empty folder: `~/.config/Atom/Cache`
- Reinstall pymakr

### Cannot connect to Pycom board via REPL

In the case of a board that has already has code uploaded to it and is running a loop/non-exiting script, the board may not boot into a REPL.

Solution: If the board is currently running code, you will need to exit the current script before proceeding:

1. Ensure your board is connected to your computer
2. Press the reset button on the device
3. Press ctrl-c on within the Pymakr console to exit the current script/program

The REPL should then appear with the '>>>' prompt and you will be able to run/sync your code.

### Cannot connect to Pycom on Linux

If you're a linux user and can't connect to your board, there might be a permission issue to access the serial port.

Solution:
Run the following command
`sudo usermod -a -G dialout $USER`


### Any error where the traceback contains `\.atom\packages\Pymakr\` with a capital P
This happened after Pymakr renamed to pymakr (lowercase) starting at version 1.2.5, but Atom remembers the old folder name inside the packages folder.

Solution:
- Uninstall Pymakr
- Remove folder: `~/.atom/.apm/Pymkr`
- Empty folder: `~/.config/Atom/Cache`
- Reinstall pymakr
