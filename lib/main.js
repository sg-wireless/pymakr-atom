'use babel';

import Pyboard from './board/pyboard';
import Pymakr from './pymakr';
import PanelView from './main/panel-view';
import { CompositeDisposable } from 'atom';
import Config from './config.js'
import SettingsWrapper from './main/settings-wrapper';

export default {
  config: Config.settings(),

  activate(state) {
    var _this = this
    this.settings = new SettingsWrapper(function(settings){
      _this.pyboard = new Pyboard(settings)
      _this.view = new PanelView(_this.pyboard,settings)
      _this.pymakr = new Pymakr(state.viewState,_this.pyboard,_this.view,settings)

      _this.pymakr.addPanel()

      // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
      _this.subscriptions = new CompositeDisposable();

      // Register command that toggles this view
      _this.subscriptions.add(atom.commands.add('atom-workspace', {
        'pymakr:sync': () => _this.pymakr.sync(),
        'pymakr:upload': () => _this.pymakr.upload(),
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
      viewState: null
    };
    if(this.pymakr){
      ser.viewState = this.pymakr.serialize()
    }
    return ser
  },

}
