import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
// TODO: Configure blob storage for ICP deployment
// import MixinStorage "blob-storage/Mixin";
// import Storage "blob-storage/Storage";

persistent actor Backend {
  // TODO: Re-enable blob storage once configured
  // let storage = Storage.new();
  // include MixinStorage(storage);

  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  // Stable storage for upgrade persistence
  var stable_tiles : [(Text, TileMetadata)] = [];
  var stable_objects : [(Text, ObjectMetadata)] = [];
  var stable_tile_sets : [(Text, TileSet)] = [];
  var stable_prefabs : [(Text, Prefab)] = [];
  var stable_maps : [(Text, MapData)] = [];
  var stable_tile_images : [(Text, Blob)] = [];
  var stable_object_images : [(Text, Blob)] = [];
  var stable_playable_characters : [(Text, PlayableCharacter)] = [];
  var stable_character_sprite_sheets : [(Text, Blob)] = [];
  var stable_sprite_sheets : [(Text, SpriteSheet)] = [];

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
    width : Nat;
    height : Nat;
    tile_instances : [TileInstance];
    object_instances : [ObjectInstance];
    spawn_points : [SpawnPoint];
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

  // Playable Character Types
  type CharacterStats = {
    health : ?Nat;
    speed : ?Nat;
    strength : ?Nat;
    mana : ?Nat;
    overshield : ?Nat;
  };

  type Direction = {
    #up;
    #down;
    #left;
    #right;
  };

  type Animation = {
    name : Text;              // e.g., "walk_down", "attack_left"
    action_type : Text;       // e.g., "walk", "attack", "jump"
    direction : ?Direction;   // Optional direction
    frame_start : Nat;        // Starting frame index in sheet
    frame_count : Nat;        // Number of frames for this animation
    frame_rate : ?Nat;        // Optional FPS for animation
  };

  type SpriteSheet = {
    id : Text;                // Unique sheet ID
    name : Text;              // User-friendly name
    description : Text;       // Optional description
    tags : [Text];            // Searchable tags
    blob_id : Text;           // Reference to uploaded image
    frame_width : Nat;
    frame_height : Nat;
    total_frames : Nat;       // Total frames in the sheet
    animations : [Animation]; // Multiple animations defined on this sheet
    created_at : Int;
    updated_at : Int;
  };

  type PlayableCharacter = {
    id : Text;
    name : Text;
    description : Text;
    tags : [Text];
    stats : CharacterStats;
    sprite_sheets : [SpriteSheet];
    created_at : Int;
    updated_at : Int;
  };

  type SpawnPoint = {
    id : Text;
    name : Text;
    x : Nat;
    y : Nat;
    character_id : Text;
  };


  transient var tiles : OrderedMap.Map<Text, TileMetadata> = textMap.empty<TileMetadata>();
  transient var objects : OrderedMap.Map<Text, ObjectMetadata> = textMap.empty<ObjectMetadata>();
  transient var tile_sets : OrderedMap.Map<Text, TileSet> = textMap.empty<TileSet>();
  transient var prefabs : OrderedMap.Map<Text, Prefab> = textMap.empty<Prefab>();
  transient var maps : OrderedMap.Map<Text, MapData> = textMap.empty<MapData>();
  transient var playable_characters : OrderedMap.Map<Text, PlayableCharacter> = textMap.empty<PlayableCharacter>();
  transient var character_sprite_sheets : OrderedMap.Map<Text, Blob> = textMap.empty<Blob>();
  transient var sprite_sheets : OrderedMap.Map<Text, SpriteSheet> = textMap.empty<SpriteSheet>();


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
  // Image Storage
  transient var tile_images : OrderedMap.Map<Text, Blob> = textMap.empty<Blob>();
  transient var object_images : OrderedMap.Map<Text, Blob> = textMap.empty<Blob>();

  // Image Methods
  public func uploadTileImage(id : Text, data : Blob) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(tiles, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Tile not found"; fix_attempted = false }) };
      case (?_) {
        tile_images := textMap.put(tile_images, id, data);
        #ok(id);
      };
    };
  };

  public query func getTileImage(id : Text) : async ?Blob {
    textMap.get(tile_images, id);
  };

  public func uploadObjectImage(id : Text, data : Blob) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(objects, id)) {
      case (null) { #err({ code = "NOT_FOUND"; message = "Object not found"; fix_attempted = false }) };
      case (?_) {
        object_images := textMap.put(object_images, id, data);
        #ok(id);
      };
    };
  };

  public query func getObjectImage(id : Text) : async ?Blob {
    textMap.get(object_images, id);
  };

  // Playable Character CRUD Operations
  public func createPlayableCharacter(character : PlayableCharacter) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(playable_characters, character.id)) {
      case (?_) {
        #err({ code = "409"; message = "Character already exists"; fix_attempted = false })
      };
      case null {
        playable_characters := textMap.put(playable_characters, character.id, character);
        #ok(character.id)
      };
    };
  };

  public query func getPlayableCharacter(id : Text) : async {
    #ok : PlayableCharacter;
    #err : ValidationError;
  } {
    switch (textMap.get(playable_characters, id)) {
      case (?character) { #ok(character) };
      case null { #err({ code = "404"; message = "Character not found"; fix_attempted = false }) };
    };
  };

  public query func listPlayableCharacters() : async [PlayableCharacter] {
    Iter.toArray(textMap.vals(playable_characters))
  };

  public func updatePlayableCharacter(id : Text, character : PlayableCharacter) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(playable_characters, id)) {
      case null { #err({ code = "404"; message = "Character not found"; fix_attempted = false }) };
      case (?_) {
        playable_characters := textMap.put(playable_characters, id, character);
        #ok(id)
      };
    };
  };

  public func deletePlayableCharacter(id : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(playable_characters, id)) {
      case null { #err({ code = "404"; message = "Character not found"; fix_attempted = false }) };
      case (?_) {
        playable_characters := textMap.delete(playable_characters, id);
        #ok(id)
      };
    };
  };

  // Character Sprite Sheet Management
  public func uploadCharacterSpriteSheet(blob_id : Text, data : Blob) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    character_sprite_sheets := textMap.put(character_sprite_sheets, blob_id, data);
    #ok(blob_id)
  };

  public query func getCharacterSpriteSheet(blob_id : Text) : async ?Blob {
    textMap.get(character_sprite_sheets, blob_id)
  };

  // Sprite Sheet CRUD Operations
  public func createSpriteSheet(sheet : SpriteSheet) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(sprite_sheets, sheet.id)) {
      case (?_) {
        #err({ code = "409"; message = "Sprite sheet already exists"; fix_attempted = false })
      };
      case null {
        sprite_sheets := textMap.put(sprite_sheets, sheet.id, sheet);
        #ok(sheet.id)
      };
    };
  };

  public query func getSpriteSheet(id : Text) : async {
    #ok : SpriteSheet;
    #err : ValidationError;
  } {
    switch (textMap.get(sprite_sheets, id)) {
      case (?sheet) { #ok(sheet) };
      case null { #err({ code = "404"; message = "Sprite sheet not found"; fix_attempted = false }) };
    };
  };

  public query func listSpriteSheets() : async [SpriteSheet] {
    Iter.toArray(textMap.vals(sprite_sheets))
  };

  public func updateSpriteSheet(id : Text, sheet : SpriteSheet) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(sprite_sheets, id)) {
      case null { #err({ code = "404"; message = "Sprite sheet not found"; fix_attempted = false }) };
      case (?_) {
        sprite_sheets := textMap.put(sprite_sheets, id, sheet);
        #ok(id)
      };
    };
  };

  public func deleteSpriteSheet(id : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(sprite_sheets, id)) {
      case null { #err({ code = "404"; message = "Sprite sheet not found"; fix_attempted = false }) };
      case (?_) {
        sprite_sheets := textMap.delete(sprite_sheets, id);
        #ok(id)
      };
    };
  };

  // Animation Management within Sprite Sheets
  public func addAnimationToSheet(sheet_id : Text, animation : Animation) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(sprite_sheets, sheet_id)) {
      case null { #err({ code = "404"; message = "Sprite sheet not found"; fix_attempted = false }) };
      case (?sheet) {
        // Check if animation name already exists
        let existingAnimation = Array.find<Animation>(sheet.animations, func(a) { a.name == animation.name });
        switch (existingAnimation) {
          case (?_) {
            #err({ code = "409"; message = "Animation with this name already exists"; fix_attempted = false })
          };
          case null {
            let updatedAnimations = Array.append<Animation>(sheet.animations, [animation]);
            let updatedSheet = {
              id = sheet.id;
              name = sheet.name;
              blob_id = sheet.blob_id;
              frame_width = sheet.frame_width;
              frame_height = sheet.frame_height;
              total_frames = sheet.total_frames;
              animations = updatedAnimations;
              created_at = sheet.created_at;
              updated_at = sheet.updated_at;
            };
            sprite_sheets := textMap.put(sprite_sheets, sheet_id, updatedSheet);
            #ok(sheet_id)
          };
        };
      };
    };
  };

  public func removeAnimationFromSheet(sheet_id : Text, animation_name : Text) : async {
    #ok : Text;
    #err : ValidationError;
  } {
    switch (textMap.get(sprite_sheets, sheet_id)) {
      case null { #err({ code = "404"; message = "Sprite sheet not found"; fix_attempted = false }) };
      case (?sheet) {
        let updatedAnimations = Array.filter<Animation>(sheet.animations, func(a) { a.name != animation_name });
        let updatedSheet = {
          id = sheet.id;
          name = sheet.name;
          blob_id = sheet.blob_id;
          frame_width = sheet.frame_width;
          frame_height = sheet.frame_height;
          total_frames = sheet.total_frames;
          animations = updatedAnimations;
          created_at = sheet.created_at;
          updated_at = sheet.updated_at;
        };
        sprite_sheets := textMap.put(sprite_sheets, sheet_id, updatedSheet);
        #ok(sheet_id)
      };
    };
  };


  // System upgrade hooks for stable memory persistence
  system func preupgrade() {
    // Save all data to stable variables before upgrade
    stable_tiles := Iter.toArray(textMap.entries(tiles));
    stable_objects := Iter.toArray(textMap.entries(objects));
    stable_tile_sets := Iter.toArray(textMap.entries(tile_sets));
    stable_prefabs := Iter.toArray(textMap.entries(prefabs));
    stable_maps := Iter.toArray(textMap.entries(maps));
    stable_tile_images := Iter.toArray(textMap.entries(tile_images));
    stable_object_images := Iter.toArray(textMap.entries(object_images));
    stable_playable_characters := Iter.toArray(textMap.entries(playable_characters));
    stable_character_sprite_sheets := Iter.toArray(textMap.entries(character_sprite_sheets));
    stable_sprite_sheets := Iter.toArray(textMap.entries(sprite_sheets));
  };

  system func postupgrade() {
    // Restore all data from stable variables after upgrade
    tiles := textMap.fromIter<TileMetadata>(stable_tiles.vals());
    objects := textMap.fromIter<ObjectMetadata>(stable_objects.vals());
    tile_sets := textMap.fromIter<TileSet>(stable_tile_sets.vals());
    prefabs := textMap.fromIter<Prefab>(stable_prefabs.vals());
    maps := textMap.fromIter<MapData>(stable_maps.vals());
    tile_images := textMap.fromIter<Blob>(stable_tile_images.vals());
    object_images := textMap.fromIter<Blob>(stable_object_images.vals());
    playable_characters := textMap.fromIter<PlayableCharacter>(stable_playable_characters.vals());
    character_sprite_sheets := textMap.fromIter<Blob>(stable_character_sprite_sheets.vals());
    sprite_sheets := textMap.fromIter<SpriteSheet>(stable_sprite_sheets.vals());

    // Clear stable variables to free memory (optional but recommended)
    stable_tiles := [];
    stable_objects := [];
    stable_tile_sets := [];
    stable_prefabs := [];
    stable_maps := [];
    stable_tile_images := [];
    stable_object_images := [];
    stable_playable_characters := [];
    stable_character_sprite_sheets := [];
    stable_sprite_sheets := [];
  };
};
