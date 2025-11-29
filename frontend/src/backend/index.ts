// Backend type definitions
export interface TileMetadata {
    id: string;
    name: string;
    description: string;
    tags: string[];
    blob_id: string;
    created_at: bigint;
    updated_at: bigint;
}

export interface ObjectState {
    name: string;
    blob_id: string;
    width: number;
    height: number;
}

export interface EventAction {
    action_type: string;
    parameters: string[];
}

export interface EventHook {
    event_type: string;
    actions: EventAction[];
}

export interface Anchor {
    x: bigint;
    y: bigint;
}

export interface CollisionTile {
    x: bigint;
    y: bigint;
    solid: boolean;
}

export interface Footprint {
    width: number;
    height: number;
    collision_tiles: CollisionTile[];
}

export interface ObjectMetadata {
    id: string;
    name: string;
    description: string;
    tags: string[];
    states: ObjectState[];
    anchors: Anchor[];
    footprints: Footprint[];
    event_hooks: EventHook[];
    created_at: bigint;
    updated_at: bigint;
}

export interface TileSet {
    id: string;
    name: string;
    description: string;
    tile_ids: string[];
    created_at: bigint;
    updated_at: bigint;
}

export interface Prefab {
    id: string;
    name: string;
    description: string;
    object_id: string;
    default_state: string;
    position: Anchor;
    created_at: bigint;
    updated_at: bigint;
}

export interface TileInstance {
    tile_id: string;
    position: Anchor;
}

export interface ObjectInstance {
    object_id: string;
    state: string;
    position: Anchor;
}

export interface MapData {
    id: string;
    name: string;
    description: string;
    tile_instances: TileInstance[];
    object_instances: ObjectInstance[];
    created_at: bigint;
    updated_at: bigint;
}

export interface ValidationError {
    code: string;
    message: string;
    fix_attempted: boolean;
}

export type Result<T> = { ok: T } | { err: ValidationError };

// Mock backend actor for development - returns null instead of undefined for React Query compatibility
export const backend = {
    listTiles: async (): Promise<TileMetadata[]> => [],
    getTile: async (id: string): Promise<TileMetadata | null> => null,
    createTile: async (metadata: TileMetadata): Promise<Result<string>> => ({ ok: metadata.id }),
    updateTileMetadata: async (id: string, metadata: TileMetadata): Promise<Result<string>> => ({ ok: id }),

    listObjects: async (): Promise<ObjectMetadata[]> => [],
    getObject: async (id: string): Promise<ObjectMetadata | null> => null,
    createObject: async (metadata: ObjectMetadata): Promise<Result<string>> => ({ ok: metadata.id }),
    updateObjectMetadata: async (id: string, metadata: ObjectMetadata): Promise<Result<string>> => ({ ok: id }),

    listTileSets: async (): Promise<TileSet[]> => [],
    getTileSet: async (id: string): Promise<TileSet | null> => null,
    createTileSet: async (tileSet: TileSet): Promise<Result<string>> => ({ ok: tileSet.id }),
    updateTileSet: async (id: string, tileSet: TileSet): Promise<Result<string>> => ({ ok: id }),

    listPrefabs: async (): Promise<Prefab[]> => [],
    getPrefab: async (id: string): Promise<Prefab | null> => null,
    createPrefab: async (prefab: Prefab): Promise<Result<string>> => ({ ok: prefab.id }),
    updatePrefab: async (id: string, prefab: Prefab): Promise<Result<string>> => ({ ok: id }),

    listMaps: async (): Promise<MapData[]> => [],
    getMap: async (id: string): Promise<MapData | null> => null,
    createMap: async (mapData: MapData): Promise<Result<string>> => ({ ok: mapData.id }),
    updateMap: async (id: string, mapData: MapData): Promise<Result<string>> => ({ ok: id }),
};
