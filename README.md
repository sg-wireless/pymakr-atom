#  package

Pymakr enables you to communicate to your Pycom board using the build in command line REPL. Run a single file to your board, sync your entire project or directly type and execute commands.

- Works with Mac OSX, Linux and windows
- Connects to any Pycom board: WiPy, WiPy2.0, LoPy and any newer board
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

Ctrl-C and Ctrl-V can also be used to copy and paste in the console (also on mac).

## Run

The 'run' button on the right top of the commandline will run the code in the currently open file to the connected board. Any print output or exceptions from this code will appear in the commandline

## Sync

The 'sync' button will synchronize all files in your project to the board. Make sure you have a `main.py` and `boot.py` file in your project if you want to make sure your board will run properly. After synchronizing, the board will be reset. it might take a few seconds to reconnect if you are using a telnet connection.

If you want to sync only a certain folder in your project, use the 'Sync folder' field in the settings and add the folder name.

The sync limit is set to 350kb. If you sync folder contains more than that, the terminal will refuse to sync.
