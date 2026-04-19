# vibehub-verify

Minimal CLI for verifying VibeHub ledger bundles offline.

## Usage

```bash
node ./bin/vibehub-verify.js --bundle ./ledger.json
node ./bin/vibehub-verify.js --bundle ./ledger.json --check-anchor
```

The CLI verifies:

- payload hash integrity
- previous-signature chain integrity
- Ed25519 signatures against the bundle public key

`--check-anchor` only validates that anchored entries carry anchor metadata. It does
not contact third-party providers in this MVP package.
