#!/bin/bash

# Script to create a new GitHub repository and push the current code to it.
# Usage: ./push_to_github.sh <github-username> <repo-name>
# Requires the environment variable GITHUB_TOKEN to be set with a personal access token.

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <github-username> <repo-name>"
  exit 1
fi

USERNAME="$1"
REPO_NAME="$2"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN environment variable is not set."
  exit 1
fi

# Create the repository on GitHub via REST API
curl -H "Authorization: token $GITHUB_TOKEN" \
     -d '{"name":"'"$REPO_NAME"'"}' \
     https://api.github.com/user/repos

# Add remote and push the current branch
if ! git remote | grep -q origin; then
  git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
else
  git remote set-url origin "https://github.com/$USERNAME/$REPO_NAME.git"
fi

git branch -M main

git push -u origin main

