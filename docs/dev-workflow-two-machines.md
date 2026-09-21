# Dev workflow: switching between machines

How to work on this repo from both a Mac and a Windows PC without losing work or fighting merge conflicts. GitHub is the source of truth; each machine has its own clone.

## One-time setup per machine

### Install
- **Mac**: `brew install git gh` (or install Xcode Command Line Tools)
- **Windows**: `winget install --id Git.Git -e --source winget` then `winget install --id GitHub.cli`
- **Linux**: `sudo apt install git gh`

Close and reopen your shell after install so PATH refreshes.

### Configure identity (same on every machine)
```
git config --global user.name "Katie Toepp"
git config --global user.email "katietoepp@gmail.com"
git config --global init.defaultBranch main
```

### Line endings
- **Windows**: `git config --global core.autocrlf true`
- **Mac/Linux**: `git config --global core.autocrlf input`

### Authenticate to GitHub
```
gh auth login
```
Pick: GitHub.com → HTTPS → Yes (authenticate git) → Login with a web browser.

### Clone the repo
```
# Mac
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/ktoepp/know-your-vote-kentucky.git

# Windows
mkdir C:\Users\Toepps\Projects; cd C:\Users\Toepps\Projects
git clone https://github.com/ktoepp/know-your-vote-kentucky.git
```

## Daily rhythm

### Start of every session (on either machine)
```
git fetch --all
git checkout main
git pull
```

If you're continuing a feature branch:
```
git checkout <branch-name>
git pull
```

### End of every session — before you close the laptop
```
git status                       # see what changed
git add -A
git commit -m "WIP: <what you did>"
git push
```

**If you forget to push**, that machine holds work the other machine can't see. Fix by returning to the first machine, pushing, then pulling on the second.

## Feature branches

Never commit directly to `main`. For new work:
```
git checkout main
git pull
git checkout -b feature/<short-description>
# ... make changes, commit, push ...
git push -u origin feature/<short-description>
```

Open a PR on GitHub when ready. Delete the branch after merge:
```
git checkout main
git pull
git branch -d feature/<short-description>
```

## Things that don't sync via git

These have to be recreated on each machine:
- **`.env` files** (gitignored — contains API keys and secrets). Copy manually or store in a password manager.
- **`node_modules/`** — rebuild with `npm install` on each machine.
- **Editor state** — use VS Code Settings Sync to keep extensions/settings aligned.
- **Local databases / caches** — anything in `.gitignore` stays local.

## Toolchain alignment

Both machines should run the same versions. Check the repo root for:
- `.nvmrc` — Node version (`nvm use` picks it up)
- `.python-version` — Python version (pyenv)
- `package.json` engines field

If you install a new dependency on one machine, commit `package.json` + `package-lock.json` so the other machine picks it up on the next `npm install`.

## Troubleshooting

**"Your branch is behind"** on pull → someone (you, from the other machine, or a Claude Code web session) pushed. Just `git pull`.

**Merge conflict on pull** → the same file was edited on both sides. Open the conflicted files, resolve the `<<<<<<<` markers, then `git add <file>` and `git commit`.

**"Working tree not clean"** and you need to switch → `git stash -u` before checkout, `git stash pop` after.

**Pushed to the wrong branch** → don't force-push `main`. Create a new branch from your commit and revert `main`. Ask for help if unsure.

## Claude Code web sessions

Claude Code on the web can push to a branch (usually `claude/*`). Treat those pushes exactly like a push from your other machine: `git fetch && git checkout <branch>` to pick up the work locally. Never rebase or force-push a branch a web session is actively using.
