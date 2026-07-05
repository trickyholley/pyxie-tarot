# Pyxie Tarot 🌸🎴

Pyxie Tarot is your personal diary companion to tarot readings!

## Development

There is a [Makefile](Makefile) that has a list of helpful commands for development.

### .env 🔐
You need a `backend/.env` with a couple values to set up the database schema and run the API. Copy the example env file:
```bash
cp backend/.env.example backend/.env
```
Generate the `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
The `DATABASE_URL` will point to a PostgreSQL database you created, e.g.:
```bash
sudo -u postgres psql -c "CREATE DATABASE pyxie_tarot OWNER pyxie;"
```

### Other setup 🔧
Set up the database:
```bash
make db-restore
```
Install dependencies:
```bash
make install
```
### Run the app 🚀
Start the development servers:
```bash
make dev
```


You should now be able to see the actual application at http://localhost:5173/!

Note there's also a minimal-UI DB browser at http://localhost:5173/db-browser. Use the admin included in the database seed to log in:
- **Email:** `admin@pyxie-tarot.live`
- **Password:** `pyxie-tarot`

> **⚠️ These are development-only credentials. Do not use them in production.**

## Contributing

By submitting a pull request, you agree that your contributions will be
licensed under the GNU General Public License v3.0 or later.

## License

Pyxie Tarot is licensed under the GNU General Public License v3.0 or later (GPL-3.0-or-later).

Copyright (C) 2026 Patrick Holley

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

See the [LICENSE](LICENSE) file for the full license text.
