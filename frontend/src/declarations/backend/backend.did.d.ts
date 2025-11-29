import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface Anchor { 'x': bigint, 'y': bigint }
export interface CollisionTile {
    'x': bigint,
    'y': bigint,
    'solid': boolean,
}
export interface EventAction {
    'action_type': string,
    'parameters': Array<string>,
}
export interface EventHook {
    'event_type': string,
    'actions': Array<EventAction>,
}
export interface Footprint {
    'width': bigint,
    'height': bigint,
    'collision_tiles': Array<CollisionTile>,
}
export interface MapData {
    'id': string,
    'name': string,
    'description': string,
    'tile_instances': Array<TileInstance>,
    'object_instances': Array<ObjectInstance>,
    'created_at': bigint,
    'updated_at': bigint,
}
export interface ObjectInstance {
    'object_id': string,
    'state': string,
    'position': Anchor,
}
export interface ObjectMetadata {
    'id': string,
    'name': string,
    'description': string,
    'tags': Array<string>,
    'states': Array<ObjectState>,
    'anchors': Array<Anchor>,
    'footprints': Array<Footprint>,
    'event_hooks': Array<EventHook>,
    'created_at': bigint,
    'updated_at': bigint,
}
export interface ObjectState {
    'name': string,
    'blob_id': string,
    'width': bigint,
    'height': bigint,
}
export interface Prefab {
    'id': string,
    'name': string,
    'description': string,
    'object_id': string,
    'default_state': string,
    'position': Anchor,
    'created_at': bigint,
    'updated_at': bigint,
}
export type Result = { 'ok': string } |
{ 'err': ValidationError };
export interface TileInstance { 'tile_id': string, 'position': Anchor }
export interface TileMetadata {
    'id': string,
    'name': string,
    'description': string,
    'tags': Array<string>,
    'blob_id': string,
    'created_at': bigint,
    'updated_at': bigint,
}
export interface TileSet {
    'id': string,
    'name': string,
    'description': string,
    'tile_ids': Array<string>,
    'created_at': bigint,
    'updated_at': bigint,
}
export interface ValidationError {
    'code': string,
    'message': string,
    'fix_attempted': boolean,
}
export interface _SERVICE {
    'createMap': ActorMethod<[MapData], Result>,
    'createObject': ActorMethod<[ObjectMetadata], Result>,
    'createPrefab': ActorMethod<[Prefab], Result>,
    'createTile': ActorMethod<[TileMetadata], Result>,
    'createTileSet': ActorMethod<[TileSet], Result>,
    'getMap': ActorMethod<[string], [] | [MapData]>,
    'getObject': ActorMethod<[string], [] | [ObjectMetadata]>,
    'getPrefab': ActorMethod<[string], [] | [Prefab]>,
    'getTile': ActorMethod<[string], [] | [TileMetadata]>,
    'getTileSet': ActorMethod<[string], [] | [TileSet]>,
    'listMaps': ActorMethod<[], Array<MapData>>,
    'listObjects': ActorMethod<[], Array<ObjectMetadata>>,
    'listPrefabs': ActorMethod<[], Array<Prefab>>,
    'listTileSets': ActorMethod<[], Array<TileSet>>,
    'listTiles': ActorMethod<[], Array<TileMetadata>>,
    'updateMap': ActorMethod<[string, MapData], Result>,
    'updateObjectMetadata': ActorMethod<[string, ObjectMetadata], Result>,
    'updatePrefab': ActorMethod<[string, Prefab], Result>,
    'updateTileMetadata': ActorMethod<[string, TileMetadata], Result>,
    'updateTileSet': ActorMethod<[string, TileSet], Result>,
}
