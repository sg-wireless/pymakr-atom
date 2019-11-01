#!/usr/bin/env bash
# Atom Elektron Version Checker v1.0

ATOM_FOLDER="${PWD}/atom"

if [ -d ${ATOM_FOLDER} ]; then
  echo "Atom repository found. Performing a pull..."
  cd atom
  git checkout master
  git pull
else
  echo "${ATOM_FOLDER} repository not found"
  git clone https://github.com/atom/atom.git atom
  cd atom
fi

echo ""
echo "Found significant branches:"
echo ""

declare -a ARRAY=(0)
declare -a BRANCHES=(0)

for BRANCH in $(git branch -a | grep remotes/origin/*); do
  TREATED_BRANCH_NAME="$(cut -d'/' -f3 <<<"$BRANCH")"
  WITHOUT_REMOTE_ORIGIN=${TREATED_BRANCH_NAME%remotes/origin/*}
  BRANCHES+=("${WITHOUT_REMOTE_ORIGIN}")
done

LATEST_VERSION_BRANCH_NAME=""
LATEST_VERSION_NUMBER=""

for BRANCH in "${BRANCHES[@]}"; do
  if [[ ${BRANCH:0:1} =~ ^[0-9]+$ ]]; then
    echo "${BRANCH}"
    VERSION=${BRANCH:0:4}
    if [[ "$VERSION" =~ ^[0-9]*[.][0-9]*$ ]]; then
      LATEST_VERSION_BRANCH_NAME="${BRANCH}"
      LATEST_VERSION_NUMBER="${VERSION}"
    fi
  fi
done

echo ""
echo "Latest version: ${LATEST_VERSION_NUMBER} (probably)"
LATEST_VERSION_BRANCH_NAME="remotes/origin/${LATEST_VERSION_BRANCH_NAME}"
echo "Checking out the branch ${LATEST_VERSION_BRANCH_NAME}"

git checkout ${LATEST_VERSION_BRANCH_NAME}

grep ".*: .*" package.json | grep -iw electronVersion | cut -d: -f2

OUTPUT=$(grep ".*: .*" package.json | grep -iw electronVersion | cut -d: -f2)
ELECTRON_VERSION="${OUTPUT//[!0-9.]/}"

echo "Upcoming Atom version will come with Electron@${ELECTRON_VERSION}"
cd ..

PYMAKR_FOLDER="${PWD}/pymakr"

if [ -d ${PYMAKR_FOLDER} ]; then
  echo "Pymakr repository found. Performing a pull..."
  cd pymakr
  git checkout master
  git pull
else
  echo "Pymakr repository not found"
  git clone https://github.com/pycom/pymakr-atom.git pymakr
  cd pymakr
fi

{
  ELECTRON_VERSION_LINE=$(grep "var electron_version" scripts/install.js | grep -iw 'var electron_version' | cut -d: -f2)
  CURRENT_ELECTRON_VERSION="${ELECTRON_VERSION_LINE//[!0-9.]/}"
} || {
  CURRENT_ELECTRON_VERSION="ERROR"
}

echo ""

if [ "$CURRENT_ELECTRON_VERSION" == "$ELECTRON_VERSION" ]; then
  RESULT="Pymakr's Elektron is synchronized with Atom ${LATEST_VERSION_NUMBER}!"
else
  RESULT="Pymakr's Elektron is NOT synchronized with Atom ${LATEST_VERSION_NUMBER}!"
fi

echo ""
echo "Elektron versions:"
echo "Pymakr: ${CURRENT_ELECTRON_VERSION}"
echo "Atom: ${ELECTRON_VERSION}"
echo ""
echo ${RESULT}


# Sending the response to a slack bot
if [ "$1" == "bot" ]; then
  BOT_ENDPOINT='####' # put the endpoint here
  PAYLOAD="{\"text\":\"${RESULT}\"}"
  curl --silent --output -X POST -H 'Content-type: application/json' --data "$PAYLOAD" ${BOT_ENDPOINT}
fi

exit
