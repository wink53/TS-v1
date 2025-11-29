# Tile Smith Backend Data Layer

## Overview
Tile Smith is a tile-based game asset management system that provides validation, storage, and management of game tiles, objects, tile sets, prefabs, and maps. The backend serves as the core data layer with strict validation rules for PNG assets.

## Core Data Types

### Asset Metadata Types
- **TileMetadata**: Contains tile information including name, description, tags, and blob reference
- **ObjectMetadata**: Contains object information with multiple state references, anchors, footprints, and event hooks
- **ObjectState**: Represents different visual states of an object
- **EventHook**: Defines event triggers and associated actions
- **EventAction**: Specifies actions to execute when events occur

### Collection Types
- **TileSet**: Groups related tiles together with metadata
- **Prefab**: Pre-configured object instances with default states and properties
- **MapData**: Contains map layout with tile and object instances
- **TileInstance**: Positioned tile reference within a map
- **ObjectInstance**: Positioned object reference within a map with current state

### Utility Types
- **Anchor**: Defines positioning reference points
- **Footprint**: Defines collision boundaries
- **CollisionTile**: Represents collision detection areas
- **ValidationError**: Error structure with code, message, and fix attempt status

## Data Storage

### Persistent Collections
The backend maintains five primary collections:
- **tiles**: Stores all tile metadata indexed by tile ID
- **objects**: Stores all object metadata indexed by object ID  
- **tile_sets**: Stores tile set definitions indexed by set ID
- **prefabs**: Stores prefab configurations indexed by prefab ID
- **maps**: Stores map data indexed by map ID

### Asset Storage
PNG image files are stored in blob storage with references maintained in metadata via `blob_id` for tiles and `blob_refs` mapping for objects with multiple states.

## Validation Rules

### Tile Validation
- Must be PNG format with exact 32×32 pixel dimensions
- Alpha transparency must be preserved
- Rejects images with white, grey, or checkerboard backgrounds
- Attempts safe background correction and centering when possible
- Validation must pass before metadata storage

### Object Validation  
- All state images must have identical dimensions, anchors, and transparency
- Dimensions must be multiples of 32 pixels
- Applies same background correction as tiles
- All state images must validate before metadata commitment

## Backend Operations

### CRUD Operations
Each collection supports standard operations:
- **Create**: Validates assets and creates new entries
- **Get**: Retrieves individual entries by ID
- **List**: Returns all entries in a collection
- **Update**: Modifies existing metadata (assets remain immutable)

### Validation Enforcement
- All create operations must pass validation before storage
- Failed validation returns ValidationError with specific error codes
- Validation errors include attempted fix information
- No partial storage - either complete success or complete failure

## Error Handling
All validation failures return structured ValidationError objects containing error code, descriptive message, and boolean indicating if automatic fix was attempted.
