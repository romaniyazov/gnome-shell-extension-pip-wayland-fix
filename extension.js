/*
 * GNOME Shell Extension: PiP Wayland Fix
 * Based on PiP on top by Rafostar
 */

import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class PipOnTop extends Extension
{
  enable()
  {
    this._lastWorkspace = null;
    this._windowAddedId = 0;
    this._windowRemovedId = 0;
    this._windowCreatedId = 0;

    this.settings = this.getSettings();
    this._settingsChangedId = this.settings.connect(
      'changed', this._onSettingsChanged.bind(this));

    this._windowCreatedId = global.display.connect(
      'window-created', this._onWindowCreated.bind(this));

    this._switchWorkspaceId = global.window_manager.connect_after(
      'switch-workspace', this._onSwitchWorkspace.bind(this));
    this._onSwitchWorkspace();
  }

  disable()
  {
    this.settings.disconnect(this._settingsChangedId);
    this.settings = null;

    global.display.disconnect(this._windowCreatedId);
    global.window_manager.disconnect(this._switchWorkspaceId);

    if (this._lastWorkspace) {
      this._lastWorkspace.disconnect(this._windowAddedId);
      this._lastWorkspace.disconnect(this._windowRemovedId);
    }

    this._lastWorkspace = null;
    this._settingsChangedId = 0;
    this._switchWorkspaceId = 0;
    this._windowAddedId = 0;
    this._windowRemovedId = 0;
    this._windowCreatedId = 0;

    let actors = global.get_window_actors();
    if (actors) {
      for (let actor of actors) {
        let window = actor.meta_window;
        if (!window) continue;

        if (window._isPipAble) {
          if (window.above)
            window.unmake_above();
          if (window.on_all_workspaces)
            window.unstick();
        }

        this._onWindowRemoved(null, window);
      }
    }
  }

  _onSettingsChanged(settings, key)
  {
    switch (key) {
      case 'stick':
        /* Updates already present windows */
        this._onSwitchWorkspace();
        break;
      default:
        break;
    }
  }

  _onSwitchWorkspace()
  {
    let workspace = global.workspace_manager.get_active_workspace();
    let wsWindows = global.display.get_tab_list(Meta.TabList.NORMAL, workspace);

    if (this._lastWorkspace) {
      this._lastWorkspace.disconnect(this._windowAddedId);
      this._lastWorkspace.disconnect(this._windowRemovedId);
    }

    this._lastWorkspace = workspace;
    this._windowAddedId = this._lastWorkspace.connect(
      'window-added', this._onWindowAdded.bind(this));
    this._windowRemovedId = this._lastWorkspace.connect(
      'window-removed', this._onWindowRemoved.bind(this));

    /* Update state on already present windows */
    if (wsWindows) {
      for (let window of wsWindows)
        this._onWindowAdded(workspace, window);
    }
  }

  _onWindowCreated(display, window)
  {
    if (!window._notifyPipTitleId) {
      window._notifyPipTitleId = window.connect_after(
        'notify::title', this._checkTitle.bind(this));
    }

    let actor = window.get_compositor_private();
    if (actor && !window._notifyPipFirstFrameId) {
      window._notifyPipFirstFrameId = actor.connect(
        'first-frame', () => {
          if (window._isPipAble)
            this._moveToBottomRight(window);
        });
    }

    this._checkTitle(window);
  }

  _onWindowAdded(workspace, window)
  {
    this._onWindowCreated(global.display, window);
  }

  _onWindowRemoved(workspace, window)
  {
    if (window._notifyPipTitleId) {
      window.disconnect(window._notifyPipTitleId);
      window._notifyPipTitleId = null;
    }
    if (window._notifyPipFirstFrameId) {
      let actor = window.get_compositor_private();
      if (actor)
        actor.disconnect(window._notifyPipFirstFrameId);
      window._notifyPipFirstFrameId = null;
    }
    if (window._isPipAble)
      window._isPipAble = null;
  }

  _moveToBottomRight(window)
  {
    let monitorIndex = window.get_monitor();
    if (monitorIndex < 0)
      monitorIndex = global.display.get_primary_monitor();

    let monitor = global.display.get_monitor_geometry(monitorIndex);
    if (!monitor)
      return;

    let rect = window.get_frame_rect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        this._moveToBottomRight(window);
        return GLib.SOURCE_REMOVE;
      });
      return;
    }

    let padding = 20;
    let x = monitor.x + monitor.width - rect.width - padding;
    let y = monitor.y + monitor.height - rect.height - padding;

    window.move_resize_frame(true, x, y, rect.width, rect.height);
  }

  _checkTitle(window)
  {
    if (!window.title)
      return;

    /* Check both translated and untranslated string for
     * users that prefer running applications in English */
    let isPipWin = (window.title == 'Picture-in-Picture'
      || window.title == _('Picture-in-Picture')
      || window.title == 'Picture in picture'
      || window.title == 'Picture-in-picture'
      || window.title.endsWith(' - PiP')
      /* Telegram support */
      || window.title == 'TelegramDesktop'
      /* Yandex.Browser support YouTube */
      || window.title.endsWith(' - YouTube'));

    if (isPipWin || window._isPipAble) {
      let un = (isPipWin) ? '' : 'un';

      if (isPipWin && !window._isPipAble)
        this._moveToBottomRight(window);

      window._isPipAble = true;
      window[`${un}make_above`]();

      /* Change stick if enabled or unstick PipAble windows */
      un = (isPipWin && this.settings.get_boolean('stick')) ? '' : 'un';
      window[`${un}stick`]();
    }
  }
}
