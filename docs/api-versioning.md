# API versioning (P3-BE-2)

## Current surface

- All HTTP JSON APIs live under `/api/v1/...`.
- Breaking changes must not ship silently into existing clients.

## Policy

1. **Additive changes** (new optional fields, new endpoints, new enum values that old clients ignore) ship in the current version without a new prefix.
2. **Breaking changes** (removing fields, changing types, incompatible semantics) require a new major version path, e.g. `/api/v2/...`, or an explicit opt-in mechanism agreed with consumers.
3. When `/api/v2` exists, `/api/v1` remains available for at least six months after the v2 stable release unless a shorter window is documented per endpoint.

## Client negotiation

- Prefer **URL versioning** (`/api/v2`) for simplicity and cacheability.
- Optional: send `Accept: application/vnd.vibehub.v2+json` for clients that need content negotiation; the server should document which resources honor it.

## OpenAPI

- Maintain one OpenAPI document per major version (e.g. `openapi-v1.json`, future `openapi-v2.json`).
- Regenerate TypeScript types from the spec that matches the client major version.

## MCP / tools

- MCP HTTP tools should pin to the same major version as the REST API they wrap, or declare a separate tool namespace when v2 diverges.
