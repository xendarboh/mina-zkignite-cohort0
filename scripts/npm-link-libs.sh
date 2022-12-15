#!/usr/bin/env bash
apps="contracts oracle-test ui"
root=$(readlink -f $(dirname $0))/..

cd ${root}/lib/
libs=$(ls)

for lib in ${libs}
do
  echo "npm link ${lib}"
  cd ${root}/lib/${lib}
  npm link

  for app in ${apps}
  do
    cd ${root}/${app}
    npm link ${lib}
  done
done
