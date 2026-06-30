import { useEffect, useState, useCallback } from 'react'
import * as db from './db'

// Reactive read of a collection.
export function useCollection(name) {
  const [rows, setRows] = useState(() => db.list(name))
  useEffect(() => {
    setRows(db.list(name))
    return db.subscribe(name, (v) => setRows(v ? [...v] : []))
  }, [name])
  return rows
}

export function useDb(name) {
  const rows = useCollection(name)
  const insert = useCallback((r) => db.insert(name, r), [name])
  const update = useCallback((id, p) => db.update(name, id, p), [name])
  const remove = useCallback((id) => db.remove(name, id), [name])
  return { rows, insert, update, remove }
}
