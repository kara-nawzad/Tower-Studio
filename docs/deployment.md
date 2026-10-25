# Deployment Guide

Tower Studio is a **100% static web application**. There is no server-side runtime, database, or secret environment variable to provision in production.

---

## 1. GitHub Pages (Default Production Setup)

This repository is deployed on **GitHub Pages** at:

- **Live URL:** [http://karanawzad.tech/Tower-Studio/](http://karanawzad.tech/Tower-Studio/)

### How It Works

1. `index.html` resides at the repository root (`/`) and loads `./src/styles/main.css` and `./src/js/app.js` using relative paths, making it work identically at root `/` or under a subpath like `/Tower-Studio/`.
2. GitHub Pages is configured to serve from the **`main` branch** and **`/ (root)` folder**.
3. Every commit merged into `main` automatically triggers a GitHub Pages deployment.

### Verifying or Updating GitHub Pages Settings

1. Open **Settings → Pages** on GitHub.
2. Under **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `/ (root)`
3. Click **Save** if changed. GitHub publishes updates within 1–2 minutes.

---

## 2. Static Hosting Platforms (Netlify, Vercel, Cloudflare Pages, S3/Nginx)

If you want to deploy a clean static artifact folder (`dist/`) containing only runtime files (`index.html`, `src/`, and `assets/`):

| Setting                        | Value           |
| ------------------------------ | --------------- |
| **Node.js Version**            | `20` or `22`    |
| **Install Command**            | `npm ci`        |
| **Build Command**              | `npm run build` |
| **Output / Publish Directory** | `dist`          |
| **Environment Variables**      | _None required_ |

Running `npm run build` validates JavaScript syntax, verifies every relative asset link in `index.html`, and outputs a self-contained `dist/` folder ready for any static CDN or web server.

---

## 3. Post-Deployment Checklist

After deploying to any host, verify:

- [ ] The 3D site loads and the `ASSEMBLING TELECOM SITE…` overlay disappears cleanly.
- [ ] All five master steps (`Site`, `Open cabinet`, `Power`, `Aim & Connect`, `Go on air`) switch without browser console errors.
- [ ] Google Fonts and Three.js `r128` load over HTTPS (`cdnjs.cloudflare.com` and `fonts.googleapis.com`).
- [ ] Desktop (`≥ 1100 px`) and mobile (`390–430 px`) viewports display the drawer without horizontal scrolling.
