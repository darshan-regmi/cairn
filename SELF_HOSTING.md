# Self-hosting Cairn

Cairn can run entirely on your own machine or server. In this mode everything —
accounts, sessions and every project, task and comment — lives in a PostgreSQL
database that you run. No external service is contacted, and no account with us
is needed.

This guide covers a single-container setup with Docker Compose: the app plus its
database, on one host.

## Prerequisites

- **Docker Engine 24+** with the **Compose v2** plugin (`docker compose version`).
- **~2 GB RAM and ~2 GB free disk** for the app and its database.
- **A domain name** if you want HTTPS (recommended for anything reachable from
  the internet). A local install can use `localhost`.

You do not need Node.js, npm, or a database server on the host — everything runs
in containers.

## Quick start

1. Create a directory and download the two files you need:

   ```bash
   mkdir cairn && cd cairn
   # place docker-compose.selfhost.yml and .env.selfhost.example here
   ```

2. Create your `.env` from the template:

   ```bash
   cp .env.selfhost.example .env
   ```

3. Fill in the blanks in `.env`. At minimum:

   ```bash
   # The image you pulled:
   CAIRN_IMAGE="ghcr.io/your-org/cairn:latest"

   # A database password you choose:
   POSTGRES_PASSWORD="$(openssl rand -base64 24)"

   # The secret that signs sessions and links (32+ characters):
   SESSION_SECRET="$(openssl rand -base64 48)"

   # The address people will actually visit:
   APP_URL="http://localhost:3000"
   ```

   The app refuses to start if `SESSION_SECRET` is missing or shorter than 32
   characters, and Compose refuses to start if a password is blank — that is
   deliberate, so a misconfigured install fails loudly instead of running
   insecurely.

4. Start it:

   ```bash
   docker compose -f docker-compose.selfhost.yml up -d
   ```

   The first boot creates the database, applies the schema, then starts the app.
   Watch it come up with:

   ```bash
   docker compose -f docker-compose.selfhost.yml logs -f app
   ```

5. Open `APP_URL` in a browser. Because no accounts exist yet, you are sent to
   the **first-run setup** page.

## First-run admin setup

The first visitor to a fresh install can create one account on `/setup`. That
account is confirmed immediately and signed in. Once any account exists the page
redirects to the login screen, so it cannot be used to take over a running
install.

Cairn has no separate "admin" role: the first account can do everything a normal
account can — create projects, invite supervisors, and manage its own data.

If you want to close public registration after you have made your accounts, set

```bash
ALLOW_SIGNUP="false"
```

Invitations to specific projects still work while registration is closed.

## Configuration reference

Every value lives in `.env` next to `docker-compose.selfhost.yml`.

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `CAIRN_IMAGE` | yes | — | The image to run, e.g. `ghcr.io/your-org/cairn:latest`. |
| `APP_PORT` | no | `3000` | Host port the app is published on. |
| `POSTGRES_USER` | no | `cairn` | Database user created in the `db` container. |
| `POSTGRES_PASSWORD` | yes | — | Database password. Choose your own. |
| `POSTGRES_DB` | no | `cairn` | Database name. |
| `SESSION_SECRET` | yes | — | Signs session cookies and verification/reset links. **32+ characters.** Changing it signs everyone out and invalidates outstanding links. |
| `APP_URL` | yes | `http://localhost:3000` | The public URL of the install, used to build verification and reset links. Must be the address people actually visit. |
| `ALLOW_SIGNUP` | no | `true` | `"false"` closes public registration. |
| `SMTP_HOST` | no | — | Mail server host. Set together with `SMTP_FROM` to turn email on. |
| `SMTP_PORT` | no | `587` | `587` for STARTTLS, `465` for implicit TLS. |
| `SMTP_SECURE` | no | `false` | `"true"` when the port speaks TLS immediately (usually 465). |
| `SMTP_USER` | no | — | SMTP username, if the server needs one. |
| `SMTP_PASS` | no | — | SMTP password. |
| `SMTP_FROM` | no | — | The `From:` address on outgoing mail, e.g. `Cairn <cairn@example.com>`. |

`APP_URL` matters: if it does not match the address people use, email links will
point somewhere they cannot reach.

### Email is optional

Without any `SMTP_*` values Cairn still works, but it cannot send mail. In that
case:

- Verification and password-reset links are written to the app log instead:

  ```bash
  docker compose -f docker-compose.selfhost.yml logs app | grep cairn
  ```

- New accounts count as confirmed, since nobody could open a verification link.

Set `SMTP_HOST` and `SMTP_FROM` to switch real email on. Nothing else in Cairn
depends on a mail server.

### Where your data lives

Everything is in PostgreSQL, in a single set of tables: `User`, `Project`,
`ProjectMember`, `Milestone`, `Task`, `Meeting`, `MeetingTask`, `Question`,
`Review`, `Evidence`, `Deliverable`, `Comment` and `Invite`. The app holds no
data anywhere else, and nothing is copied off your machine.

Two named Docker volumes hold the state:

- `db-data` — the PostgreSQL data directory. This is your entire instance.
- `app-data` — reserved for stored files. Nothing writes to it today; keep it so
  a future upgrade does not lose anything.

## Backup and restore

### Database

Dump the database to a file on the host:

```bash
docker compose -f docker-compose.selfhost.yml exec -T db \
  pg_dump -U cairn -d cairn --clean --if-exists > cairn-backup.sql
```

Restore into a running stack (this replaces the current contents):

```bash
docker compose -f docker-compose.selfhost.yml exec -T db \
  psql -U cairn -d cairn < cairn.sql
```

Keep `POSTGRES_USER`/`POSTGRES_DB` in mind if you changed them.

### File volume

Nothing writes to the file volume today, but back it up anyway so a restore is
never lossy:

```bash
docker run --rm -v cairn_app-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/cairn-app-data.tar.gz -C /data .
```

The volume name is prefixed with the Compose project name (`cairn` by default).

Take a database dump as well — the two together are a complete backup. Keep
copies off the host.

## Upgrading

```bash
docker compose -f docker-compose.selfhost.yml pull
docker compose -f docker-compose.selfhost.yml up -d
```

The container applies any new database migrations on startup, before serving
traffic, so a fresh image brings the schema up to date by itself. Take a backup
first if the release notes mention schema changes.

To pin a specific version, set `CAIRN_IMAGE` to a version tag rather than
`latest`, e.g. `ghcr.io/your-org/cairn:0.2.0`.

## Putting it behind HTTPS

Run the app on a private port and let a reverse proxy terminate TLS. With the
Compose file, set `APP_PORT="127.0.0.1:3000"` so the app is only reachable from
the host, and set `APP_URL="https://cairn.example.com"`.

### Caddy

Caddy obtains and renews certificates for you:

```caddyfile
cairn.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name cairn.example.com;

    ssl_certificate     /etc/letsencrypt/live/cairn.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cairn.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name cairn.example.com;
    return 301 https://$host$request_uri;
}
```

Whichever proxy you use, `APP_URL` must be the `https://` name so the links in
verification and reset emails work.

## Troubleshooting

**The app container exits immediately at startup.**
It logs the reason. The usual cause is a missing or too-short `SESSION_SECRET`,
or a missing `DATABASE_URL`/`POSTGRES_PASSWORD`. Check:

```bash
docker compose -f docker-compose.selfhost.yml logs app
```

**The app is "unhealthy" or the page never loads.**
The database may not be ready. Confirm it is up, then restart the app:

```bash
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml restart app
```

**I cannot sign in after upgrading.**
Sessions survive upgrades, but they end if `SESSION_SECRET` changes. Log in
again.

**Nobody received a verification or password-reset email.**
No `SMTP_*` values are configured, so links are printed to the log instead. Grab
them with:

```bash
docker compose -f docker-compose.selfhost.yml logs app | grep cairn
```

Or configure SMTP and restart.

**I forgot the first account's password.**
Request a reset. With SMTP unconfigured, the reset link is in the app log. With
SMTP configured and the mailbox unreachable, you can generate a new password
directly against the database (this is advanced; take a backup first).

**Port 3000 is already in use.**
Set `APP_PORT` to a free port, or bind it to localhost behind a reverse proxy.

**Start over completely.**
This deletes all data. Removing the volume is destructive and cannot be undone:

```bash
docker compose -f docker-compose.selfhost.yml down
docker volume rm cairn_db-data cairn_app-data
```
