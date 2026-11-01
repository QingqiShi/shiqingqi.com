#!/bin/sh
# Vercel runs this as `ignoreCommand`. Exit 0 skips the build. Other exit codes
# start the build, so a step that fails starts the build.

main=master
pkg=$(node -p 'require("./package.json").name' 2>/dev/null)

build() {
  echo "vercel-ignore-build: building ${pkg:-this app}: $1"
  exit 1
}

root=$(git rev-parse --show-toplevel 2>/dev/null) || build "no git checkout"
[ -n "$pkg" ] || build "no package name in $(pwd)/package.json"
head=$(git rev-parse HEAD) || build "no HEAD commit"
src=$(git remote | head -n 1)
if [ -z "$src" ] && [ -n "$VERCEL_GIT_REPO_OWNER" ]; then
  src="https://github.com/$VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG.git"
fi
[ -n "$src" ] || build "no git remote"
export GIT_TERMINAL_PROMPT=0

if [ "$VERCEL_ENV" = production ]; then
  base=$VERCEL_GIT_PREVIOUS_SHA
  [ -n "$base" ] || build "no previous production deployment"
  label="the last production deployment"
  refs=$head
  has_base() { git merge-base --is-ancestor "$base" "$head" 2>/dev/null; }
else
  label="its merge base with $main"
  refs="$head +refs/heads/$main:refs/vercel-ignore/$main"
  git fetch -q --no-tags --depth=50 "$src" "+refs/heads/$main:refs/vercel-ignore/$main" ||
    build "cannot fetch $main"
  has_base() { base=$(git merge-base "$head" "refs/vercel-ignore/$main" 2>/dev/null); }
fi

# Vercel clones only approximately 10 commits. Get more history until it has the base.
for deepen in --deepen=50 --deepen=500 --unshallow; do
  has_base && break
  [ "$(git rev-parse --is-shallow-repository)" = true ] || break
  git fetch -q --no-tags "$deepen" "$src" $refs || build "cannot fetch history"
done
has_base || build "$label ($base) is not in the history of $head"

version=$(node -p "require('$root/package.json').devDependencies.turbo.replace(/^\D+/, '')") ||
  build "cannot read the turbo version"
TURBO_TELEMETRY_DISABLED=1 npx --yes "turbo@$version" query affected --cwd "$root" \
  --base="$base" --head="$head" --packages "$pkg" --exit-code >/dev/null
case $? in
  0)
    echo "vercel-ignore-build: skipping $pkg: no change reaches it since $label ($base)"
    exit 0
    ;;
  1) build "changed since $label ($base)" ;;
  *) build "turbo query affected failed" ;;
esac
