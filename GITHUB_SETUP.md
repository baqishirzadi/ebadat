# GitHub SSH Setup

An SSH key was generated for this project. To enable `git push`:

## 1. Add the key to GitHub

Run this command and copy the **entire single line** (from `ssh-ed25519` to `ebadat-github`):

```bash
cat ~/.ssh/id_ed25519_github.pub
```

Your public key:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO82WXYpSlDvNmKFrVFcShtZVcf+m4xvSOBJ+MBZ1xUO ebadat-github
```

Then:
1. Go to https://github.com/settings/ssh/new
2. Title: `EbadatApp` (or any name)
3. Paste the key - one line only, no extra spaces or newlines
4. Click "Add SSH key"

**Important**: Use the public key (`.pub` file), NOT the private key. The public key starts with `ssh-ed25519`.

## 2. Push

```bash
git push -u origin main
```

If you get "Repository not found", you may need to fork `afghandev/ebadat` and push to your fork:
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/ebadat.git
git push -u origin main
```
