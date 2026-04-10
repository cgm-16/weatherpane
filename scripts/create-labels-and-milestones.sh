#!/usr/bin/env bash
set -euo pipefail

# Requires:
# - GitHub CLI: gh
# - Authenticated session: gh auth status
#
# Usage:
#   ./scripts/create-labels-and-milestones.sh
#
# Optional:
#   export GH_REPO="owner/repo"

REPO_ARG=()
if [[ -n "${GH_REPO:-}" ]]; then
  REPO_ARG=(--repo "$GH_REPO")
fi

resolve_repo() {
  if [[ -n "${GH_REPO:-}" ]]; then
    printf '%s' "$GH_REPO"
  else
    gh repo view --json owner,name -q '.owner.login + "/" + .name'
  fi
}

REPO="$(resolve_repo)"

echo "Creating labels..."
jq -c '.[]' config/labels.json | while read -r label; do
  name=$(echo "$label" | jq -r '.name')
  color=$(echo "$label" | jq -r '.color')
  description=$(echo "$label" | jq -r '.description')

  if gh label list "${REPO_ARG[@]}" --limit 200 --json name | jq -e --arg name "$name" '.[] | select(.name == $name)' >/dev/null; then
    echo "Updating label: $name"
    gh label edit "$name" "${REPO_ARG[@]}" --color "$color" --description "$description"
  else
    echo "Creating label: $name"
    gh label create "$name" "${REPO_ARG[@]}" --color "$color" --description "$description"
  fi
done

echo "Creating milestones..."
existing_titles=$(gh api "repos/$REPO/milestones?state=all" --paginate | jq -r '.[].title')

jq -c '.[]' config/milestones.json | while read -r milestone; do
  title=$(echo "$milestone" | jq -r '.title')
  description=$(echo "$milestone" | jq -r '.description')

  if echo "$existing_titles" | grep -Fxq "$title"; then
    echo "Skipping existing milestone: $title"
  else
    echo "Creating milestone: $title"
    gh api "repos/$REPO/milestones" \
      --method POST \
      -f title="$title" \
      -f description="$description" >/dev/null
  fi
done

echo "Done."
