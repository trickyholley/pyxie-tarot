// SPDX-License-Identifier: AGPL-3.0-or-later
const DB_BROWSER = "db-browser";
const LOGIN = "login";
const USERS = "users";

export default {
  DB_BROWSER,
  DB_LOGIN: `${DB_BROWSER}/${LOGIN}`,
  DB_USERS: `${DB_BROWSER}/${USERS}`,
  LOGIN,
  USERS,
};
