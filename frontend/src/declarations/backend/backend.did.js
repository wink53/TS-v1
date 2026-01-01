export const idlFactory = ({ IDL }) => {
    const TileMetadata = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'tags': IDL.Vec(IDL.Text),
        'blob_id': IDL.Text,
        'is_solid': IDL.Bool,
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const ObjectState = IDL.Record({
        'name': IDL.Text,
        'blob_id': IDL.Text,
        'width': IDL.Nat,
        'height': IDL.Nat,
    });
    const Anchor = IDL.Record({ 'x': IDL.Int, 'y': IDL.Int });
    const CollisionTile = IDL.Record({
        'x': IDL.Int,
        'y': IDL.Int,
        'solid': IDL.Bool,
    });
    const Footprint = IDL.Record({
        'width': IDL.Nat,
        'height': IDL.Nat,
        'collision_tiles': IDL.Vec(CollisionTile),
    });
    const EventAction = IDL.Record({
        'action_type': IDL.Text,
        'parameters': IDL.Vec(IDL.Text),
    });
    const EventHook = IDL.Record({
        'event_type': IDL.Text,
        'actions': IDL.Vec(EventAction),
    });
    const ObjectMetadata = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'tags': IDL.Vec(IDL.Text),
        'states': IDL.Vec(ObjectState),
        'anchors': IDL.Vec(Anchor),
        'footprints': IDL.Vec(Footprint),
        'event_hooks': IDL.Vec(EventHook),
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const TileSet = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'tile_ids': IDL.Vec(IDL.Text),
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const Prefab = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'object_id': IDL.Text,
        'default_state': IDL.Text,
        'position': Anchor,
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const TileInstance = IDL.Record({
        'tile_id': IDL.Text,
        'position': Anchor,
    });
    const ObjectInstance = IDL.Record({
        'object_id': IDL.Text,
        'state': IDL.Text,
        'position': Anchor,
    });
    const SpawnPoint = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'character_id': IDL.Text,
        'x': IDL.Nat,
        'y': IDL.Nat,
    });
    const NpcInstance = IDL.Record({
        'id': IDL.Text,
        'preset_id': IDL.Text,
        'name': IDL.Text,
        'x': IDL.Int,
        'y': IDL.Int,
    });
    const MapData = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'width': IDL.Nat,
        'height': IDL.Nat,
        'tile_instances': IDL.Vec(TileInstance),
        'object_instances': IDL.Vec(ObjectInstance),
        'spawn_points': IDL.Vec(SpawnPoint),
        'npc_instances': IDL.Opt(IDL.Vec(NpcInstance)),
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const ValidationError = IDL.Record({
        'code': IDL.Text,
        'message': IDL.Text,
        'fix_attempted': IDL.Bool,
    });
    const CharacterStats = IDL.Record({
        'health': IDL.Opt(IDL.Nat),
        'speed': IDL.Opt(IDL.Nat),
        'strength': IDL.Opt(IDL.Nat),
        'mana': IDL.Opt(IDL.Nat),
        'overshield': IDL.Opt(IDL.Nat),
    });
    const AnimationState = IDL.Variant({
        'idle': IDL.Null,
        'walk': IDL.Null,
        'run': IDL.Null,
        'attack': IDL.Null,
    });
    const Direction = IDL.Variant({
        'up': IDL.Null,
        'down': IDL.Null,
        'left': IDL.Null,
        'right': IDL.Null,
    });
    const Animation = IDL.Record({
        'name': IDL.Text,
        'action_type': IDL.Text,
        'direction': IDL.Opt(Direction),
        'start_x': IDL.Nat,
        'start_y': IDL.Nat,
        'frame_start': IDL.Nat,
        'frame_count': IDL.Nat,
        'frame_rate': IDL.Opt(IDL.Nat),
    });
    const Hitbox = IDL.Record({
        'offset_x': IDL.Nat,
        'offset_y': IDL.Nat,
        'width': IDL.Nat,
        'height': IDL.Nat,
    });
    const SpriteSheet = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'tags': IDL.Vec(IDL.Text),
        'blob_id': IDL.Text,
        'frame_width': IDL.Nat,
        'frame_height': IDL.Nat,
        'total_frames': IDL.Nat,
        'animations': IDL.Vec(Animation),
        'hitbox': IDL.Opt(Hitbox),
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const PlayableCharacter = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'tags': IDL.Vec(IDL.Text),
        'stats': CharacterStats,
        'sprite_sheets': IDL.Vec(SpriteSheet),
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const Result = IDL.Variant({ 'ok': IDL.Text, 'err': ValidationError });
    return IDL.Service({
        'createMap': IDL.Func([MapData], [Result], []),
        'createObject': IDL.Func([ObjectMetadata], [Result], []),
        'createPrefab': IDL.Func([Prefab], [Result], []),
        'createTile': IDL.Func([TileMetadata], [Result], []),
        'createTileSet': IDL.Func([TileSet], [Result], []),
        'deleteMap': IDL.Func([IDL.Text], [Result], []),
        'deleteObject': IDL.Func([IDL.Text], [Result], []),
        'deletePrefab': IDL.Func([IDL.Text], [Result], []),
        'deleteTile': IDL.Func([IDL.Text], [Result], []),
        'deleteTileSet': IDL.Func([IDL.Text], [Result], []),
        'getMap': IDL.Func([IDL.Text], [IDL.Opt(MapData)], ['query']),
        'getObject': IDL.Func([IDL.Text], [IDL.Opt(ObjectMetadata)], ['query']),
        'getPrefab': IDL.Func([IDL.Text], [IDL.Opt(Prefab)], ['query']),
        'getTile': IDL.Func([IDL.Text], [IDL.Opt(TileMetadata)], ['query']),
        'getTileSet': IDL.Func([IDL.Text], [IDL.Opt(TileSet)], ['query']),
        'listMaps': IDL.Func([], [IDL.Vec(MapData)], ['query']),
        'listObjects': IDL.Func([], [IDL.Vec(ObjectMetadata)], ['query']),
        'listPrefabs': IDL.Func([], [IDL.Vec(Prefab)], ['query']),
        'listTileSets': IDL.Func([], [IDL.Vec(TileSet)], ['query']),
        'listTiles': IDL.Func([], [IDL.Vec(TileMetadata)], ['query']),
        'updateMap': IDL.Func([IDL.Text, MapData], [Result], []),
        'updateObjectMetadata': IDL.Func(
            [IDL.Text, ObjectMetadata],
            [Result],
            [],
        ),
        'updatePrefab': IDL.Func([IDL.Text, Prefab], [Result], []),
        'updateTileMetadata': IDL.Func([IDL.Text, TileMetadata], [Result], []),
        'updateTileSet': IDL.Func([IDL.Text, TileSet], [Result], []),
        'uploadTileImage': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [Result], []),
        'getTileImage': IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Nat8))], ['query']),
        'uploadObjectImage': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [Result], []),
        'getObjectImage': IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Nat8))], ['query']),
        'listPlayableCharacters': IDL.Func([], [IDL.Vec(PlayableCharacter)], ['query']),
        'getPlayableCharacter': IDL.Func([IDL.Text], [IDL.Variant({ 'ok': PlayableCharacter, 'err': ValidationError })], ['query']),
        'createPlayableCharacter': IDL.Func([PlayableCharacter], [Result], []),
        'updatePlayableCharacter': IDL.Func([IDL.Text, PlayableCharacter], [Result], []),
        'deletePlayableCharacter': IDL.Func([IDL.Text], [Result], []),
        'uploadCharacterSpriteSheet': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [Result], []),
        'getCharacterSpriteSheet': IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Nat8))], ['query']),
        'createSpriteSheet': IDL.Func([SpriteSheet], [Result], []),
        'getSpriteSheet': IDL.Func([IDL.Text], [IDL.Variant({ 'ok': SpriteSheet, 'err': ValidationError })], ['query']),
        'listSpriteSheets': IDL.Func([], [IDL.Vec(SpriteSheet)], ['query']),
        'updateSpriteSheet': IDL.Func([IDL.Text, SpriteSheet], [Result], []),
        'deleteSpriteSheet': IDL.Func([IDL.Text], [Result], []),
        'addAnimationToSheet': IDL.Func([IDL.Text, Animation], [Result], []),
        'removeAnimationFromSheet': IDL.Func([IDL.Text, IDL.Text], [Result], []),
        'seedTestData': IDL.Func([], [Result], []),
        'clearAllData': IDL.Func([], [Result], []),
    });
};
export const init = ({ IDL }) => { return []; };
