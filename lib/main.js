'use babel';

import Pyboard from './board/pyboard';
import Pymakr from './pymakr';
import PanelView from './views/panel-view';
import { CompositeDisposable } from 'atom';
import Config from './config.js'
import SettingsWrapper from './wrappers/settings-wrapper';

export default {
  config: Config.settings(),

  activate(state) {
    var _this = this
    console.log("Activating plugin")
    this.settings = new SettingsWrapper(function(settings){
      _this.pyboard = new Pyboard(settings)
      console.log("Creating view")
      _this.view = new PanelView(_this.pyboard,settings,state.viewState)

      console.log("Adding panel...")
      _this.view.addPanel()

      console.log("Building view")
      _this.view.build()

      console.log("Creating pymakr")
      _this.pymakr = new Pymakr(state.viewState,_this.pyboard,_this.view,settings)

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
