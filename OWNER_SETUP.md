# Owner Login

The owner dashboard login is configured with environment variables, not a database user table.

For local development, set these values in `.env.local`.

```env
JWT_SECRET=replace_with_a_long_random_secret
OWNER_USERNAME=admin
OWNER_PASSWORD=change_me
```

Local credentials created for this workspace:

```text
Username: admin
Password: 123456
```

For Vercel, add the same keys in Project Settings > Environment Variables.

Change `OWNER_PASSWORD` before using the site in production.
