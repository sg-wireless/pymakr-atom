'use babel';

import Pyboard from './board/pyboard';
import Pymakr from './pymakr';
import { CompositeDisposable } from 'atom';
import Config from './config.js'
import SettingsWrapper from './settings-wrapper';

export default {
  config: Config.settings(),

  activate(state) {
    this.settings = new SettingsWrapper()
    this.pyboard = new Pyboard(this.settings)
    this.pymakr = new Pymakr(state.viewState,this.pyboard,this.settings)

    this.pymakr.addPanel()

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'pymakr:sync': () => this.pymakr.sync(),
      'pymakr:toggleREPL': () => this.pymakr.toggleVisibility(),
      'pymakr:connect': () => this.pymakr.connect(),
      'pymakr:run': () => this.pymakr.run(),
      'pymakr:help': () => this.pymakr.writeHelpText()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.pymakr.destroy();
  },

  serialize() {
    return {
      viewState: this.pymakr.serialize()
    };
  },

}
