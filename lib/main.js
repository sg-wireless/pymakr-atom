"use babel";

import { CompositeDisposable } from "atom";
import Config from "./config.js";

export default {
  config: Config.settings(),

  activate(state) {
    var _this = this;
    this.prepareSerialPort(function(error) {
      if (error) {
        var err_mess =
          "There was an error with your serialport module, Pymakr will likely not work properly. Please try to install again or report an issue on our github (see developer console for details)";
        atom.notifications.addError(err_mess);
        console.log(err_mess);
        console.log(error);
      }

      var Pymakr = require("./pymakr");
      var PanelView = require("./main/panel-view");
      var Pyboard = require("./board/pyboard");
      var SettingsWrapper = require("./main/settings-wrapper");

      _this.buildStatusBarOnConsume = false;
      _this.settings = new SettingsWrapper(function(settings) {
        _this.pyboard = new Pyboard(settings);

        _this.view = new PanelView(_this.pyboard, settings, state.viewState);

        _this.pymakr = new Pymakr(
          state.viewState,
          _this.pyboard,
          _this.view,
          settings
        );

        _this.pymakr.addPanel();

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        _this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        _this.subscriptions.add(
          atom.commands.add("atom-workspace", {
            "pymakr:sync": () => _this.pymakr.sync(),
            "pymakr:upload": () => _this.pymakr.upload(),
            "pymakr:uploadFile": () => _this.pymakr.uploadFile(),
            "pymakr:toggleREPL": () => _this.pymakr.toggleVisibility(),
            "pymakr:connect": () => _this.pymakr.connect(),
            "pymakr:run": () => _this.pymakr.run(),
            "pymakr:runselection": () => _this.pymakr.runselection(),
            "pymakr:help": () => _this.pymakr.writeHelpText(),
            "pymakr:clearTerminal": () => _this.pymakr.clearTerminal(),
            "pymakr:disconnect": () => _this.pymakr.disconnect()
          })
        );
      });
    });
  },

  prepareSerialPort(cb) {
    try {
      require("serialport");
      cb();
    } catch (e) {
      console.log("Error while loading serialport library");
      // console.log(e);
      // FIXME: install.js has been removed, the below just treid to re-copy
      // var exec = require('child_process').exec
      // var cmd = 'npx electron-rebuild --force --version '+ process.versions['electron'];
      // exec(cmd,function(error, stdout, stderr){
      //         try {
      //             require("serialport");
      //             cb()
      //         }catch(e){
      //             cb(e)
      //         }
      //     });

      // FIXME: install.js has been removed, the below just tried to re-copy
      // exec('node '+ __dirname+'/scripts/install.js no_rebuild',function(error, stdout, stderr){
      //         try {
      //             require("serialport");
      //             cb()
      //         }catch(e){
      //             cb(e)
      //         }
      //     });
    }
  },

  deactivate() {
    this.subscriptions.dispose();
    this.pymakr.destroy();
  },

  copyBindingFile(cb) {
    var _this = this;
    var exec = require("child_process").exec;
    var dir = __dirname.replace("/lib", "").replace("\\lib", "");
    var bindings_target =
      dir + "/node_modules/@serialport/bindings/build/Release/bindings.node";
    var bindings_source = dir + "/precompiles/serialport-<os>/bindings.node";
    var precompiles = {
      win32: "win",
      darwin: "osx",
      linux: "linux",
      aix: "linux"
    };
    if (process.platform in precompiles) {
      // always returns win32 on windows, even on 64bit
      var os = precompiles[process.platform];
      var is_windows = os == "win";
      if (os == "win" && process.arch == "ia32") {
        os = "win32";
      }
      bindings_source = bindings_source.replace("<os>", os);
      _this.copyFile(bindings_source, bindings_target, function(error) {
        exec(
          "ln -s  " +
            dir +
            "/node_modules/@serialport/bindings " +
            dir +
            "/node_modules/serialport/bindings",
          function(err, stdout, stderr) {
            cb(error);
          }
        );
      });
    } else {
      cb();
    }
  },

  copyFile(source, target, cb) {
    var exec = require("child_process").exec;
    var fs = require("fs");
    function done(err) {
      if (!cbCalled) {
        cb(err);
        cbCalled = true;
      }
    }

    if (fs.existsSync(source)) {
      var cbCalled = false;

      var rd = fs.createReadStream(source);
      rd.on("error", function(err) {
        done(err);
      });
      var wr = fs.createWriteStream(target);
      wr.on("error", function(err) {
        done(err);
      });
      wr.on("close", function(ex) {
        console.log("Copy completed");
        done();
      });
      rd.pipe(wr);
    } else {
      done(new Error("File " + source + " doesn't exist"));
    }
  },

  serialize() {
    var ser = {
      viewState: null,
      feedbackPopupSeen: null
    };
    if (this.pymakr) {
      (ser.viewState = this.pymakr.serialize()),
        (ser.feedbackPopupSeen = this.pymakr.view.feedback_popup_seen);
    }
    return ser;
  }
};
