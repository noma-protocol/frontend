#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <start-commit> [weeks]"
  exit 1
fi

START_COMMIT=$1
WEEKS=${2:-3}
SHIFT_SEC=$(( WEEKS * 7 * 24 * 60 * 60 ))

NEW_NAME="0xsufi"
NEW_EMAIL="0xsufi@noma.money"

echo
echo "ℹ️  Shifting commits from ${START_COMMIT}..HEAD back by ${WEEKS} week(s) (${SHIFT_SEC}s)"
echo "   Overwriting author/committer to ${NEW_NAME} <${NEW_EMAIL}>"

# Go back to the simpler approach with filter-branch
git filter-branch -f \
  --env-filter "
    # shift by exactly $WEEKS weeks in seconds
    shift_secs=$SHIFT_SEC

    # —— AUTHOR date shift ——
    # split GIT_AUTHOR_DATE (\"@<unix_ts> <tz>\") into \$1 and \$2
    set -- \$GIT_AUTHOR_DATE
    orig_ts=\${1#@}       # strip leading \"@\"
    orig_tz=\$2
    new_ts=\$((orig_ts - shift_secs))
    export GIT_AUTHOR_DATE=\"\$new_ts \$orig_tz\"

    # —— COMMITTER date shift ——
    set -- \$GIT_COMMITTER_DATE
    orig_ts=\${1#@}
    orig_tz=\$2
    new_ts=\$((orig_ts - shift_secs))
    export GIT_COMMITTER_DATE=\"\$new_ts \$orig_tz\"

    # —— override author/committer identity ——
    export GIT_AUTHOR_NAME=\"$NEW_NAME\"
    export GIT_AUTHOR_EMAIL=\"$NEW_EMAIL\"
    export GIT_COMMITTER_NAME=\"\$GIT_AUTHOR_NAME\"
    export GIT_COMMITTER_EMAIL=\"\$GIT_AUTHOR_EMAIL\"
  " \
  "${START_COMMIT}..HEAD"

echo
echo "✅  Done. Preview with:"
echo "    git log --format=fuller ${START_COMMIT}..HEAD"
echo "👉  When you’re ready, force-push:"
echo "    git push --force --tags"
