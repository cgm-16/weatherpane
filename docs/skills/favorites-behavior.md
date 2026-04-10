# Favorites behavior

## Hard rules
- Max favorites: 6
- Manual ordering is the source of truth
- Drag handle only for pointer/touch
- Accessible fallback is `위로` / `아래로`
- Reorder and nickname editing exist only in 편집/정렬 mode
- Nickname max length: 20
- Commit nickname on blur / Enter / 완료
- Removing a favorite does not unset active location
- Undo restores exact previous position and nickname
- Only latest removal is undoable
- Undo timeout: 5s

## Card states
- no snapshot + loading -> skeleton
- no snapshot + failed -> inline card error + retry, not navigable
- snapshot + refresh failed -> keep stale card, still navigable
