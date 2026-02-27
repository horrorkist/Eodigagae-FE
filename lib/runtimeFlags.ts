const rawMapPersistFlag = process.env.NEXT_PUBLIC_MAP_PERSIST_GLOBAL;

export const isGlobalMapPersistEnabled = rawMapPersistFlag !== "0";
