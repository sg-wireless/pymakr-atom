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
      var PanelView = require("./views/panel-view");
      var SettingsWrapper = require("./wrappers/settings-wrapper");

      _this.buildStatusBarOnConsume = false;
      console.log("Activating plugin");
      _this.settings = new SettingsWrapper(function(settings) {
        console.log("Creating view");
        _this.view = new PanelView(settings, state.viewState);

        console.log("Adding panel...");
        _this.view.addPanel();

        console.log("Building view");
        _this.view.build();

        console.log("Creating pymakr");
        _this.pymakr = new Pymakr(state.viewState, _this.view, settings);

        _this.buildStatusBar();

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

  buildStatusBar() {
    var _this = this;
    var div = $("<div></div>").addClass("pymakr-status-bar");
    var img = $("<img>")
      .addClass("pymakr-logo")
      .attr("src", this.pymakr.api.getPackagePath() + "/styles/assets/logo.png")
      .width("17px");
    div.append(img);
    div.html(div.html() + " Pymakr");

    div.click(function() {
      _this.pymakr.toggleVisibility();
    });

    if (this.statusBar) this.statusBar.addRightTile({ item: div, priority: 1 });
    else this.buildStatusBarOnConsume = true;
  },

  prepareSerialPort(cb) {
    try {
      require("serialport");
      cb();
    } catch (e) {
      console.log("Error while loading serialport library");
      console.log(e)
    }
  },

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;
    if (this.buildStatusBarOnConsume) {
      this.buildStatusBar();
    }
  },

  deactivate() {
    this.subscriptions.dispose();
    this.pymakr.destroy();
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
