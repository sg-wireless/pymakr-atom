'use babel';

const $ = require('jquery');
const fs = require('fs');

const rootElement =
  '<div class="pybytes" style="height: 100%; width: 300px; z-index: 11" id="pybytes-root"></div>';

export default class Pybytes {
  constructor(api) {
    this.token = '';
    this.isLoadingLogin = false;
    this.view = $(rootElement).html();
    this.panel = null;
    this.api = api;
    this.staySignedIn = false;
    this.loginButton = $('#pybytes-login-button');
    this.loginEmailInput = $('#pybytes-login-email');
    this.loginPasswordInput = $('#pybytes-login-password');
    this.loginPath = `${this.api.getPackageSrcPath()}/views/pybytes-panel.html`;
    this.homePath = `${this.api.getPackageSrcPath()}/views/pybytes-panel-home.html`;
    this.init();
  }

  init(){
      const absolutePath = this.api.getPackagePath();
      const pybytesLogo = $('.pybytes-logo');
      pybytesLogo
        .html('<img class="pybytes-logo alt="PyBytes Logo3"/>')
        .attr(
          'src',
          `${absolutePath}/styles/assets/pybytes-logo.png`,
        );
  }

  render() {
    let HTML = null;

    const plainHtml = fs.readFileSync(
      this.token ? this.homePath : this.loginPath,
    );
    if ($('#pybytes-root').length) {
      HTML = $('#pybytes-root').html(plainHtml.toString());
    } else HTML = $(rootElement).html(plainHtml.toString());
    this.view = HTML;
    this.bindingEventsHome();
    return HTML;
  }

  bindingEventsLogin() {
    this.loginButton = $('#pybytes-login-button');
    this.loginEmailInput = $('#pybytes-login-email');

    this.loginEmailInput.keydown(event => {
      if (event.key === 'Tab') {
        this.loginPasswordInput.focus();
      } else if (event.key === 'Enter') {
        this.login();
      }
    });

    this.loginPasswordInput = $('#pybytes-login-password');

    this.loginPasswordInput.keydown(event => {
      if (event.key === 'Tab') {
        this.loginEmailInput.focus();
      } else if (event.key === 'Enter') {
        this.login();
      }
    });

    this.loginButton.on('click', async () => {
      this.login();
    });
    this.loginButton.keydown(event => {
      if (event.key === 'Enter') {
        this.login();
      }
    });
    this.closeButton = $('#pybytes-close');
    this.closeButton.on('click', async () => {
      this.closePanel();
    });

    this.stayLabel = $('#pybytes-login-stay-label');
    this.stayCb = $('#pybytes-login-stay-cb');
    this.stayLabel.on('click', () => {
      this.staySignedIn = !this.staySignedIn;
      this.stayCb.prop('checked', this.staySignedIn);
    });
    this.stayCb.on('click', () => {
      this.staySignedIn = !this.staySignedIn;
      this.stayCb.prop('checked', this.staySignedIn);
    });
  }

  async login() {
    if (!this.isLoadingLogin) {
      await this.loginRequest(
        this.loginEmailInput.val(),
        this.loginPasswordInput.val(),
      );
    }
  }

  bindingEventsHome() {
    this.homeLogoutLink = $('#pybytes-home-logout-link');
    this.homeLogoutLink.on('click', async () => {
      this.token = null;
      localStorage.removeItem('session');
      this.render();
      this.bindingEventsLogin();
    });
    this.closeButton = $('#pybytes-close');
    this.closeButton.on('click', async () => {
      this.closePanel();
    });
    $('#token').text(`Token: ${this.token}`);
  }

  togglePanel() {
    // eslint-disable-next-line no-undef
    if (atom.workspace.getRightPanels().length === 0) {
      if (!this.token) {
        const session = localStorage.getItem('session');
        if (session) {
          const sessionObj = JSON.parse(session);
          const { token } = sessionObj;
          this.token = token;
        }
      }
      const view = this.render();
      // eslint-disable-next-line no-undef
      const panel = atom.workspace.addRightPanel({ item: view });
      this.pybytesPanel = panel;
      this.bindingEventsLogin();
      this.bindingEventsHome();
      this.init();
    } else {
      this.pybytesPanel.destroy();
    }
  }

  closePanel() {
    if (this.pybytesPanel) this.pybytesPanel.destroy();
  }

  clearLoginInputs() {
    this.loginEmailInput.val('');
    this.loginPasswordInput.val('');
  }

  clearErrors() {
    $('#pybytes-login-email-error').text('');
    $('#pybytes-login-password-error').text('');
  }

  async loginRequest(email, password) {
    this.clearErrors();
    if (!email || !password) {
      if (!email)
        $('#pybytes-login-email-error').text('Fill in your e-mail');
      if (!password)
        $('#pybytes-login-password-error').text(
          'Fill in your password',
        );
    } else {
      this.isLoadingLogin = true;
      this.loginButton.toggleClass('disabled');

      setTimeout(() => {
        this.loginButton.toggleClass('disabled');
        this.isLoadingLogin = false;
        const token = 'EUSAEASJEASLK';
        this.token = token;
        this.render();
        if (this.staySignedIn) {
          localStorage.setItem('session', JSON.stringify({ token }));
        }
      }, 1500);
    }
  }
}
