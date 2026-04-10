# GitHub workflow with GitLab Flow semantics

## Hard rules
- Everyone starts from main and targets main
- Release stabilization happens on `release/*`
- Fix in main first, then port to release branch if needed
- Do not rebase pushed shared branches
- Release from tags

## PR requirements
- issue linked
- checks green
- spec alignment confirmed
- screenshots attached for UI changes
