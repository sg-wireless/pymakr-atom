'use babel';

export default class Config {
  static constants(){
    return {
      safeboot_version: 1160001, // 1.16.0.b1 is the first version to have safeboot.
      logging_level: 3, // 0=silly,1=verbose,2=info, 3 = warning, 4 = error. anything higher than 5 = off. see logger.js
      error_messages: {
        "EHOSTDOWN": "Host down",
        "EHOSTUNREACH": "Host unreachable",
        "ECONNREFUSED": "Connection refused",
        "ECONNRESET":" Connection was reset",
        "EPIPE": "Broken pipe",
        "MemoryError": "Not enough memory available on the board."
      },
      term_rows: {default: 11,max: 25, min: 1},
      help_text: "Pymakr Atom Package Help. Functions:\r\n"
              +  "- Disconnect        : Disconnects from the board\r\n"
              +  "- Global settings   : Opens the installation-wide settings file\r\n"
              +  "- Project Settings  : Opens project specific settings that overwrite global settings\r\n"
              +  "- Run               : Runs currently open file to the board\r\n"
              +  "- Sync              : Synchronizes the complete project to the board, using the sync folder settings\r\n"
              +  "- List serial ports : Lists all available serial ports and copies the first one to the clipboard\r\n"
              +  "- Get board version : Displays firmware version of the connected board\r\n"
              +  "- Get WiFi SSID     : Gets the SSID of the boards wifi accesspoint\r\n"
              +  "\r\n"
              +  "Settings (name : default : description):\r\n"
              +  "- address                 : 192.168.4.1         : IP address or comport for your device\r\n"
              +  "- username                : micro               : Boards username, only for telnet\r\n"
              +  "- password                : python              : Boards password, only for telnet\r\n"
              +  "- sync_folder             : <empty>             : Folder to synchronize. Empty to sync projects main folder\r\n"
              +  "- sync_file_types         : py,txt,log,json,xml : Type of files to be synchronized\r\n"
              +  "- ctrl_c_on_connect       : false               : If true, executes a ctrl-c on connect to stop running programs\r\n"
              +  "- open_on_start           : true                : Weather to open the terminal and connect to the board when starting vsc\r\n"
              +  "- safe_boot_before_upload : true                : Safe-boots the board before uploading code, to prevent running out of RAM while uploading.\r\n"
              +  "- reboot_after_upload     : true                : Reboots the board after each upload.\r\n"

              +  "Any of these can be used inside the Project config to override the global config\r\n"
              +  "\r\n"
              +  "For more information, check github.com/pycom/pymakr-atom or docs.pycom.io\r\n"
    }
  }
  static settings(){
    return {
      address: {
          type: 'string',
          default: '192.168.4.1',
          title: 'Device address',
          description: 'Either connect through USB serial using a comport, or an IP address for a telnet connection. Username and password are not needed for serial connections.',
          order: 1
      },
      auto_connect: {
          type: 'boolean',
          default: false,
          title: 'Autoconnect on USB',
          description: 'Ignores any \'device address\' setting and automatically connects to the top item in the serialport list',
          order: 2
      },
      username: {
          type: 'string',
          default: 'micro',
          title: 'User name',
          order: 3
      },
      password: {
          type: 'string',
          default: 'python',
          title: 'Password',
          order: 4
      },
      sync_folder: {
          type: 'string',
          default: "",
          title: 'Sync Folder',
          description: 'This folder will be uploaded to the pyboard when using the sync button. Leave empty to sync the complete project. (only allows folders within the project). Use a path relative to the project you opened in atom, without leading or trailing slash',
          order: 5
      },
      sync_all_file_types: {
          type: 'boolean',
          default: false,
          title: 'Upload all file types',
          description: 'If enabled, all files will be uploaded no matter the file type. The list of file types below will be ignored',
          order: 6
      },
      sync_file_types: {
          type: 'array',
          items: {
            type: 'string'
          },
          default: ['py','txt','log','json','xml','html','js','css','mpy','pem','cet','crt','key'],
          title: 'Upload file types',
          description: 'All types of files that will be uploaded to the board, seperated by comma. All other filetypes will be ignored during an upload (or download) action',
          order: 7
      },
      py_ignore: {
          title: 'Pyignore list',
          description: 'Comma separated list of files and folders to ignore when uploading (no wildcard or regular expressions supported)',
          type: 'array',
          items: {
            type: 'string'
          },
          default: [],
          order: 7
      },
      ctrl_c_on_connect: {
          type: 'boolean',
          default: false,
          title: 'Ctrl-c on connect',
          description: 'Stops all running programs when connecting to the board',
          order: 8
      },
      open_on_start: {
          type: 'boolean',
          default: true,
          title: 'Open on start',
          description: 'Automatically open the pymakr console and connect to the board after starting Atom',
          order: 9
      },
      safe_boot_on_upload: {
          type: 'boolean',
          default: false,
          title: 'Safe-boot before upload',
          description: '[Only works with firmware v1.16.0.b1 and up.] Safe boots the board before uploading to prevent running out of memory while uploading. Especially useful on older boards with less memory, but adds about 2 seconds to the upload procedure',
          order: 10
      },
      reboot_after_upload: {
          type: 'boolean',
          default: true,
          title: 'Reboot after upload',
          description: 'Reboots your pycom board after any upload or download action',
          order: 11
      }
    }
  }
}
