# TrackingRMA

A minimal webpage for tracking packages. The page queries a Google Apps Script endpoint to retrieve a PDF containing the tracking information.

## Pushing to GitHub

Use the provided `push_to_github.sh` script to create a new GitHub repository and push the current code. The script expects a personal access token stored in the `GITHUB_TOKEN` environment variable.

### Example

```bash
export GITHUB_TOKEN=your_personal_access_token
./push_to_github.sh <github-username> <repository-name>
```

This will create the repository on GitHub and push the `main` branch.
