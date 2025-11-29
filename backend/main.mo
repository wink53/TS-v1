import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
// TODO: Configure blob storage for ICP deployment
// import MixinStorage "blob-storage/Mixin";
// import Storage "blob-storage/Storage";

persistent actor Backend {
  // TODO: Re-enable blob storage once configured
  // let storage = Storage.new();
  // include MixinStorage(storage);

  transient let textMap = OrderedMap.Make<Text>(Text.compare);

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

  type TileSet = {
    id : Text;
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

  transient var tiles : OrderedMap.Map<Text, TileMetadata> = textMap.empty<TileMetadata>();
  transient var objects : OrderedMap.Map<Text, ObjectMetadata> = textMap.empty<ObjectMetadata>();
  transient var tile_sets : OrderedMap.Map<Text, TileSet> = textMap.empty<TileSet>();
  transient var prefabs : OrderedMap.Map<Text, Prefab> = textMap.empty<Prefab>();
  transient var maps : OrderedMap.Map<Text, MapData> = textMap.empty<MapData>();

  public func createTile(metadata : TileMetadata) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    tiles := textMap.put(tiles, metadata.id, metadata);
    #ok(metadata.id);
  };

  public query func getTile(id : Text) : async ?TileMetadata {
    textMap.get(tiles, id);
  };

  public query func listTiles() : async [TileMetadata] {
    Iter.toArray(textMap.vals(tiles));
  };

  public func updateTileMetadata(id : Text, metadata : TileMetadata) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(tiles, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Tile not found"; fix_attempted = false }) };
      case (?_) {
        tiles := textMap.put(tiles, id, metadata);
        #ok(id);
      };
    };
  };

  public func createObject(metadata : ObjectMetadata) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    objects := textMap.put(objects, metadata.id, metadata);
    #ok(metadata.id);
  };

  public query func getObject(id : Text) : async ?ObjectMetadata {
    textMap.get(objects, id);
  };

  public query func listObjects() : async [ObjectMetadata] {
    Iter.toArray(textMap.vals(objects));
  };

  public func updateObjectMetadata(id : Text, metadata : ObjectMetadata) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(objects, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Object not found"; fix_attempted = false }) };
      case (?_) {
        objects := textMap.put(objects, id, metadata);
        #ok(id);
      };
    };
  };

  public func createTileSet(tile_set : TileSet) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    tile_sets := textMap.put(tile_sets, tile_set.id, tile_set);
    #ok(tile_set.id);
  };

  public query func getTileSet(id : Text) : async ?TileSet {
    textMap.get(tile_sets, id);
  };

  public query func listTileSets() : async [TileSet] {
    Iter.toArray(textMap.vals(tile_sets));
  };

  public func updateTileSet(id : Text, tile_set : TileSet) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(tile_sets, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Tile set not found"; fix_attempted = false }) };
      case (?_) {
        tile_sets := textMap.put(tile_sets, id, tile_set);
        #ok(id);
      };
    };
  };

  public func createPrefab(prefab : Prefab) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    prefabs := textMap.put(prefabs, prefab.id, prefab);
    #ok(prefab.id);
  };

  public query func getPrefab(id : Text) : async ?Prefab {
    textMap.get(prefabs, id);
  };

  public query func listPrefabs() : async [Prefab] {
    Iter.toArray(textMap.vals(prefabs));
  };

  public func updatePrefab(id : Text, prefab : Prefab) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(prefabs, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Prefab not found"; fix_attempted = false }) };
      case (?_) {
        prefabs := textMap.put(prefabs, id, prefab);
        #ok(id);
      };
    };
  };

  public func createMap(map_data : MapData) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    maps := textMap.put(maps, map_data.id, map_data);
    #ok(map_data.id);
  };

  public query func getMap(id : Text) : async ?MapData {
    textMap.get(maps, id);
  };

  public query func listMaps() : async [MapData] {
    Iter.toArray(textMap.vals(maps));
  };

  public func updateMap(id : Text, map_data : MapData) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(maps, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Map not found"; fix_attempted = false }) };
      case (?_) {
        maps := textMap.put(maps, id, map_data);
        #ok(id);
      };
    };
  };

  // Delete methods
  public func deleteTile(id : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(tiles, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Tile not found"; fix_attempted = false }) };
      case (?_) {
        tiles := textMap.delete(tiles, id);
        #ok(id);
      };
    };
  };

  public func deleteObject(id : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(objects, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Object not found"; fix_attempted = false }) };
      case (?_) {
        objects := textMap.delete(objects, id);
        #ok(id);
      };
    };
  };

  public func deleteTileSet(id : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(tile_sets, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Tile set not found"; fix_attempted = false }) };
      case (?_) {
        tile_sets := textMap.delete(tile_sets, id);
        #ok(id);
      };
    };
  };

  public func deletePrefab(id : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(prefabs, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Prefab not found"; fix_attempted = false }) };
      case (?_) {
        prefabs := textMap.delete(prefabs, id);
        #ok(id);
      };
    };
  };

  public func deleteMap(id : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(maps, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Map not found"; fix_attempted = false }) };
      case (?_) {
        maps := textMap.delete(maps, id);
        #ok(id);
      };
    };
  };
};
