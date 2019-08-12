'use babel';

import { CompositeDisposable } from 'atom';
import Config from './config.js'

export default {
  config: Config.settings(),

  activate(state) {
    var _this = this
    this.prepareSerialPort(function(error){
      if(error){
          var err_mess = "There was an error with your serialport module, Pymakr will likely not work properly. Please try to install again or report an issue on our github (see developer console for details)"
          atom.notifications.addError(err_mess)
          console.log(err_mess)
          console.log(error)
      }

      var Pymakr = require('./pymakr');
      var PanelView = require('./main/panel-view');
      var Pyboard = require('./board/pyboard');
      var SettingsWrapper = require('./main/settings-wrapper');

      _this.buildStatusBarOnConsume = false
      console.log("Activating plugin")
      _this.settings = new SettingsWrapper(function(settings){

        _this.pyboard = new Pyboard(settings)

        console.log("Creating view")
        _this.view = new PanelView(_this.pyboard,settings,state.viewState)


        console.log("Creating pymakr")
        _this.pymakr = new Pymakr(state.viewState,_this.pyboard,_this.view,settings)

        console.log("Adding panel...")
        _this.pymakr.addPanel()

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        _this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        _this.subscriptions.add(atom.commands.add('atom-workspace', {
          'pymakr:sync': () => _this.pymakr.sync(),
          'pymakr:upload': () => _this.pymakr.upload(),
          'pymakr:uploadFile': () => _this.pymakr.uploadFile(),
          'pymakr:toggleREPL': () => _this.pymakr.toggleVisibility(),
          'pymakr:connect': () => _this.pymakr.connect(),
          'pymakr:run': () => _this.pymakr.run(),
          'pymakr:runselection': () => _this.pymakr.runselection(),
          'pymakr:help': () => _this.pymakr.writeHelpText(),
          'pymakr:clearTerminal': () => _this.pymakr.clearTerminal(),
          'pymakr:disconnect': () => _this.pymakr.disconnect()
        }));
      })
    })
  },

  prepareSerialPort(cb){
    try {
      require("serialport");
      cb()
    }catch(e){
      console.log("Error while loading serialport lib. Trying to fix it...")
      var exec = require('child_process').exec
      var command = 'node '+ __dirname+'/../scripts/install.js no_rebuild'
      console.log(command)
      exec(command,function(error, stdout, stderr){
        console.log(error,stdout,stderr)
          try {
              require("serialport");
              cb()
          }catch(e){
              cb(e)
          }
      });
    }
  },


  deactivate() {
    this.subscriptions.dispose();
    this.pymakr.destroy();
  },

  serialize() {

    var ser =  {
      viewState: null,
      feedbackPopupSeen: null
    };
    if(this.pymakr){
      ser.viewState = this.pymakr.serialize(),
      ser.feedbackPopupSeen = this.pymakr.view.feedback_popup_seen
    }
    return ser
  },

}
