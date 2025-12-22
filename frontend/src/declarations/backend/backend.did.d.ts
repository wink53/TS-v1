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
    'width': bigint,
    'height': bigint,
    'tile_instances': Array<TileInstance>,
    'object_instances': Array<ObjectInstance>,
    'spawn_points': Array<SpawnPoint>,
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
export interface CharacterStats {
    'health': [] | [bigint],
    'speed': [] | [bigint],
    'strength': [] | [bigint],
    'mana': [] | [bigint],
    'overshield': [] | [bigint],
}
export type AnimationState = { 'idle': null } |
{ 'walk': null } |
{ 'run': null } |
{ 'attack': null };
export type Direction = { 'up': null } |
{ 'down': null } |
{ 'left': null } |
{ 'right': null };
export interface Animation {
    'name': string,
    'action_type': string,
    'direction': [] | [Direction],
    'start_x': bigint,
    'start_y': bigint,
    'frame_start': bigint,
    'frame_count': bigint,
    'frame_rate': [] | [bigint],
}
export interface SpriteSheet {
    'id': string,
    'name': string,
    'description': string,
    'tags': Array<string>,
    'blob_id': string,
    'frame_width': bigint,
    'frame_height': bigint,
    'total_frames': bigint,
    'animations': Array<Animation>,
    'created_at': bigint,
    'updated_at': bigint,
}
export interface PlayableCharacter {
    'id': string,
    'name': string,
    'description': string,
    'tags': Array<string>,
    'stats': CharacterStats,
    'sprite_sheets': Array<SpriteSheet>,
    'created_at': bigint,
    'updated_at': bigint,
}
export interface SpawnPoint {
    'id': string,
    'name': string,
    'character_id': string,
    'x': bigint,
    'y': bigint,
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
    'deleteMap': ActorMethod<[string], Result>,
    'deleteObject': ActorMethod<[string], Result>,
    'deletePrefab': ActorMethod<[string], Result>,
    'deleteTile': ActorMethod<[string], Result>,
    'deleteTileSet': ActorMethod<[string], Result>,
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
    'updateObject': ActorMethod<[string, ObjectMetadata], Result>,
    'updatePrefab': ActorMethod<[string, Prefab], Result>,
    'updateTile': ActorMethod<[string, TileMetadata], Result>,
    'updateTileSet': ActorMethod<[string, TileSet], Result>,
    'uploadTileImage': ActorMethod<[string, Uint8Array | number[]], Result>,
    'getTileImage': ActorMethod<[string], [] | [Uint8Array | number[]]>,
    'uploadObjectImage': ActorMethod<[string, Uint8Array | number[]], Result>,
    'getObjectImage': ActorMethod<[string], [] | [Uint8Array | number[]]>,
    'listPlayableCharacters': ActorMethod<[], Array<PlayableCharacter>>,
    'getPlayableCharacter': ActorMethod<[string], [] | [PlayableCharacter]>,
    'createPlayableCharacter': ActorMethod<[PlayableCharacter], Result>,
    'updatePlayableCharacter': ActorMethod<[string, PlayableCharacter], Result>,
    'deletePlayableCharacter': ActorMethod<[string], Result>,
    'uploadCharacterSpriteSheet': ActorMethod<[string, Uint8Array | number[]], Result>,
    'getCharacterSpriteSheet': ActorMethod<[string], [] | [Uint8Array | number[]]>,
    'createSpriteSheet': ActorMethod<[SpriteSheet], Result>,
    'getSpriteSheet': ActorMethod<[string], { 'ok': SpriteSheet } | { 'err': ValidationError }>,
    'listSpriteSheets': ActorMethod<[], Array<SpriteSheet>>,
    'updateSpriteSheet': ActorMethod<[string, SpriteSheet], Result>,
    'deleteSpriteSheet': ActorMethod<[string], Result>,
    'addAnimationToSheet': ActorMethod<[string, Animation], Result>,
    'removeAnimationFromSheet': ActorMethod<[string, string], Result>,
}
