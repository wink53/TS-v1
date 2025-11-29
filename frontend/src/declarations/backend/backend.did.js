export const idlFactory = ({ IDL }) => {
    const TileMetadata = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'tags': IDL.Vec(IDL.Text),
        'blob_id': IDL.Text,
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
    const MapData = IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'tile_instances': IDL.Vec(TileInstance),
        'object_instances': IDL.Vec(ObjectInstance),
        'created_at': IDL.Int,
        'updated_at': IDL.Int,
    });
    const ValidationError = IDL.Record({
        'code': IDL.Text,
        'message': IDL.Text,
        'fix_attempted': IDL.Bool,
    });
    const Result = IDL.Variant({ 'ok': IDL.Text, 'err': ValidationError });
    return IDL.Service({
        'createMap': IDL.Func([MapData], [Result], []),
        'createObject': IDL.Func([ObjectMetadata], [Result], []),
        'createPrefab': IDL.Func([Prefab], [Result], []),
        'createTile': IDL.Func([TileMetadata], [Result], []),
        'createTileSet': IDL.Func([TileSet], [Result], []),
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
    });
};
export const init = ({ IDL }) => { return []; };
