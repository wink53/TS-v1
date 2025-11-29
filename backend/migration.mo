import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import List "mo:base/List";

module {
  type TileMetadata = {
    id : Text;
    name : Text;
    description : Text;
    tags : [Text];
    blob_id : Text;
    created_at : Int;
    updated_at : Int;
  };

  type ObjectMetadata = {
    id : Text;
    name : Text;
    description : Text;
    tags : [Text];
    states : [ObjectState];
    anchors : [Anchor];
    footprints : [Footprint];
    event_hooks : [EventHook];
    created_at : Int;
    updated_at : Int;
  };

  type ObjectState = {
    name : Text;
    blob_id : Text;
    width : Nat;
    height : Nat;
  };

  type EventHook = {
    event_type : Text;
    actions : [EventAction];
  };

  type EventAction = {
    action_type : Text;
    parameters : [Text];
  };

  type OldTileSet = {
    id : Text;
    name : Text;
    description : Text;
    tile_ids : [Text];
    created_at : Int;
    updated_at : Int;
  };

  type TileSet = {
    set_id : Text;
    name : Text;
    description : Text;
    tile_ids : [Text];
    created_at : Int;
    updated_at : Int;
  };

  type Prefab = {
    id : Text;
    name : Text;
    description : Text;
    object_id : Text;
    default_state : Text;
    position : Anchor;
    created_at : Int;
    updated_at : Int;
  };

  type MapData = {
    id : Text;
    name : Text;
    description : Text;
    tile_instances : [TileInstance];
    object_instances : [ObjectInstance];
    created_at : Int;
    updated_at : Int;
  };

  type TileInstance = {
    tile_id : Text;
    position : Anchor;
  };

  type ObjectInstance = {
    object_id : Text;
    state : Text;
    position : Anchor;
  };

  type Anchor = {
    x : Int;
    y : Int;
  };

  type Footprint = {
    width : Nat;
    height : Nat;
    collision_tiles : [CollisionTile];
  };

  type CollisionTile = {
    x : Int;
    y : Int;
    solid : Bool;
  };

  type ValidationError = {
    code : Text;
    message : Text;
    fix_attempted : Bool;
  };

  type OldActor = {
    tiles : OrderedMap.Map<Text, TileMetadata>;
    objects : OrderedMap.Map<Text, ObjectMetadata>;
    tile_sets : OrderedMap.Map<Text, OldTileSet>;
    prefabs : OrderedMap.Map<Text, Prefab>;
    maps : OrderedMap.Map<Text, MapData>;
  };

  type NewActor = {
    tiles : OrderedMap.Map<Text, TileMetadata>;
    objects : OrderedMap.Map<Text, ObjectMetadata>;
    tile_sets : OrderedMap.Map<Text, TileSet>;
    prefabs : OrderedMap.Map<Text, Prefab>;
    maps : OrderedMap.Map<Text, MapData>;
  };

  public func run(old : OldActor) : NewActor {
    let textMap = OrderedMap.Make<Text>(Text.compare);

    let tile_sets = textMap.map<OldTileSet, TileSet>(
      old.tile_sets,
      func(_id, oldTileSet) {
        {
          set_id = oldTileSet.id;
          name = oldTileSet.name;
          description = oldTileSet.description;
          tile_ids = oldTileSet.tile_ids;
          created_at = oldTileSet.created_at;
          updated_at = oldTileSet.updated_at;
        };
      },
    );

    {
      tiles = old.tiles;
      objects = old.objects;
      tile_sets;
      prefabs = old.prefabs;
      maps = old.maps;
    };
  };
};
