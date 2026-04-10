# Search and location resolution

## Hard rules
- Search source is local preprocessed Korea catalog
- Instant filtering on every keystroke
- URL query is authoritative on `/search?q=...`
- Replace history while typing
- Push history only on explicit navigation
- Unsupported selections do not become active location

## Resolution strategy
- manual override table first
- provider geocoding second
- override table must be easy to extend
