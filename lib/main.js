'use babel';

import Pyboard from './board/pyboard';
import PymakrView from './pymakr-view';
import { CompositeDisposable } from 'atom';
import Config from './config.js'
import SW from './settings-wrapper';

export default {
  config: Config.settings(),

  activate(state) {
    this.settings = new SW()
    this.pyboard = new Pyboard(this.settings)
    this.view = new PymakrView(state.viewState,this.pyboard,this.settings)
    this.view.addPanel()

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'pymakr:sync': () => this.view.sync(),
      'pymakr:toggleREPL': () => this.view.toggleVisibility(),
      'pymakr:connect': () => this.view.connect(),
      'pymakr:run': () => this.view.run()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.view.destroy();
  },

  serialize() {
    return {
      viewState: this.view.serialize()
    };
  },

}
