# Deploying Regolith Rising to Hostinger

These steps upload the game to the **root of your domain** (`https://mistyrose-eland-246079.hostingersite.com/`).

## 1. Build

```bash
npm ci
npm test
npm run build
```

The finished site is in `dist/`. It includes:

- `index.html`, `assets/`, `icons/`, `manifest.webmanifest`, `sw.js`: the game
- `.htaccess`: HTTPS redirect and caching rules
- `api/`: the optional cloud-save API (PHP)

> `.htaccess` is a hidden file. Make sure it gets uploaded. In the hPanel File Manager it shows up normally. In FileZilla, turn on *Server → Force showing hidden files*.

## 2. Upload with the hPanel File Manager (easiest)

1. Zip the **contents** of `dist/` (not the folder itself), with `.htaccess` included. On Windows, use the built-in `tar`. Avoid PowerShell's `Compress-Archive`: its zips use `\` in paths, and Linux servers extract those as broken file names.
   ```bash
   cd dist; tar -a -cf ../regolith-rising.zip * .htaccess; cd ..
   ```
2. hPanel → **Websites** → your site → **File Manager** → open `public_html`.
3. If there is an old `index.html` or a `default.php` placeholder, delete it.
4. **Upload** `regolith-rising.zip`, right-click it → **Extract** into `public_html`, then delete the zip.
5. Check that `public_html/index.html` and `public_html/api/save.php` exist (not `public_html/dist/...`).

## 3. Turn on HTTPS

hPanel → **Security → SSL**. Make sure the certificate is *Active*. A PWA and its offline mode only work over HTTPS. `.htaccess` already redirects http→https.

## 4. Cloud save (optional, already works)

With no configuration, the API stores accounts in an SQLite file at `public_html/api/data/regolith.sqlite`, which is created automatically. `api/data/.htaccess` blocks web access to it.

- Check that hPanel → **Advanced → PHP Configuration** uses **PHP 8.1 or newer**, with `pdo_sqlite` enabled (it is on by default).
- **Prefer MySQL?** Create a database in hPanel → **Databases → MySQL Databases**. Copy `api/config.example.php` to `api/config.local.php` *on the server* and fill in the name, user and password. The tables are created on first use.

**Test it:** open `https://mistyrose-eland-246079.hostingersite.com/api/save.php` in a browser. You should see `{"error":"Not logged in"}`. That means PHP and the database work. Then make an account in the game (☁ Account & cloud save).

## 5. Check the deployment

- Open the site on your phone: the menu loads, and Chrome offers *Install app / Add to Home screen*.
- Play one turn, turn on airplane mode, reload: the game still loads (offline).
- Switch to Arabic: the layout mirrors right-to-left.

## Updating later

Run `npm run build` again and re-upload the contents of `dist/`, overwriting the old files. **Do not delete `api/data/`**: it holds the accounts. Players get the new version automatically on their next visit (the service worker auto-updates).

## Android later (Capacitor)

The build uses relative paths (`base: './'`), so it can be wrapped as is:

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Regolith Rising" com.astraquest.regolith --web-dir dist
npx cap add android
npx cap sync
```

In the app, cloud save needs an absolute API URL. Change `API` in `src/ui/cloud.ts` to `https://mistyrose-eland-246079.hostingersite.com/api/`, and allow that origin with CORS headers in `api/db.php`.
