#!/usr/bin/env bash
IS_RUNNING=0
pgrep -x Atom >/dev/null && IS_RUNNING=1

if [ $IS_RUNNING == 1 ]; then
  echo "Detected changes. Restarting Atom..."
  killall Atom
else
  echo "Detected changes. Opening Atom..."
fi

atom ~/.atom

exit
