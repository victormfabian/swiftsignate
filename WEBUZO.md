# Webuzo Deployment Notes

## Database

Create a MySQL database and user in Webuzo, then set either:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=swift_signate
MYSQL_USER=swift_signate_user
MYSQL_PASSWORD=change_me
```

Or:

```env
DATABASE_URL=mysql://swift_signate_user:change_me@127.0.0.1:3306/swift_signate
```

When one of those MySQL configurations is present, the app uses MySQL automatically.
If no MySQL configuration is present, it falls back to the local SQLite files in `data/`.

## App Process

Use Webuzo Application Manager for the Node app.

Suggested commands:

```bash
npm install
npm run build
npm run start -- --port 30000
```

If Webuzo already injects the selected port into the `PORT` environment variable, plain `npm run start` is also fine.

## Add The App In Webuzo

Use these values in Application Manager:

- `Application type`: `NodeJS`
- `Deployment Environment`: `Production`
- `Port`: `30000`
- `Start Command`: `npm run start -- --port 30000`
- `Application Path`: the folder containing `package.json`

Before creating the app, connect to the server and run:

```bash
npm install
npm run build
```

## GitHub To Webuzo Deployment

There are two workable flows for this project.

### Option A: Webuzo Pulls From GitHub

1. Push this project to GitHub.
2. In Webuzo, open `Server Utilities > Git Version Control`.
3. Clone the GitHub repository on the server.
4. Edit `.deploy.json` and replace the placeholder `DEPLOYPATH` with your real app path.
5. Deploy the repository from Webuzo into the same folder used by Application Manager.
6. Run `npm install` and `npm run build` in that deployed folder.
7. Start or restart the app from Application Manager.

The repo already includes `.deploy.json` for this flow.

### Option B: GitHub Pushes To Webuzo Over SSH

This repo includes:

- `.github/workflows/deploy-webuzo.yml`
- `scripts/webuzo-deploy.sh`

That workflow connects to your Webuzo server over SSH, updates the repo, installs dependencies, and builds the app.

#### GitHub secrets to add

- `WEBUZO_SSH_HOST`
- `WEBUZO_SSH_PORT`
- `WEBUZO_SSH_USER`
- `WEBUZO_SSH_PRIVATE_KEY`
- `WEBUZO_APP_PATH`

#### First-time server setup for Option B

1. SSH into the server.
2. Clone your GitHub repo into the final app folder.
3. Add the MySQL environment variables on the server or in Application Manager.
4. Run:

```bash
chmod +x scripts/webuzo-deploy.sh
npm install
npm run build
```

5. Create the Node app in Application Manager, pointing to that same folder.

After that, every push to `main` can trigger the GitHub workflow and rebuild the server copy.

## Push This Project To GitHub

If this folder is not already a git repository, run:

```bash
git init
git add .
git commit -m "Initial Swift Signate commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Important Routes

- `/auth`
- `/dashboard/book`
- `/dashboard/track`
- `/admin/signin`
- `/admin`

## Notes

- Admin seed login on first boot:
  - `admin@swiftsignate.com`
  - `Swift@2026`
- The app auto-creates tables for auth, shipments, payment requests, customer updates, and editable site content.
- Direct-transfer proof uploads are stored as data URLs in the database in the current implementation. For production scale, move those files to object storage and store only file URLs.
- `.deploy.json` ships with a placeholder path. Update it before using Webuzo Git deployment.
- `scripts/webuzo-deploy.sh` supports an optional `WEBUZO_RESTART_COMMAND` environment variable if you want restart automation after build.
