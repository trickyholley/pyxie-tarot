// SPDX-License-Identifier: AGPL-3.0-or-later

/** Generic offset-paginated response shape, mirroring the backend's `schemas.pagination.Page`. */
export interface Page<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}
