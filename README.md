# PiP Wayland Fix

GNOME Shell extension that fixes Firefox Picture-in-Picture on Wayland:
- Keeps PiP window always on top (even on Wayland)
- Positions PiP window in bottom-right corner (instead of top-left)

Based on [PiP on top](https://github.com/Rafostar/gnome-shell-extension-pip-on-top) by Rafostar.

Compatible with Firefox, but may work with other browsers too.

## Installation from source code

Run below in terminal one by one:
```sh
mkdir -p ~/.local/share/gnome-shell/extensions
cd ~/.local/share/gnome-shell/extensions
git clone "https://github.com/romaniyazov/pip-wayland-fix.git" "pip-wayland-fix@romaniyazov.github.com"
cd pip-wayland-fix@romaniyazov.github.com
glib-compile-schemas ./schemas/
```

After all is done: logout, login back (or reboot) and enable newly installed extension. Enjoy!
