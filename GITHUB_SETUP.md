# GitHub SSH Setup

An SSH key was generated for this project. To enable `git push`:

## 1. Add the key to GitHub

The public key has been copied to your clipboard. If not, run:
```bash
cat ~/.ssh/id_ed25519_ebadat.pub
```

Then:
1. Go to https://github.com/settings/keys
2. Click "New SSH key"
3. Title: `EbadatApp` (or any name)
4. Paste the key (Cmd+V)
5. Click "Add SSH key"

## 2. Push

```bash
git push -u origin main
```

If you get "Repository not found", you may need to fork `afghandev/ebadat` and push to your fork:
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/ebadat.git
git push -u origin main
```
