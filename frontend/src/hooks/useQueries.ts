import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  TileMetadata,
  ObjectMetadata,
  TileSet,
  Prefab,
  MapData,
} from '../backend';

// Helper to unwrap Candid optional type ([] | [T]) to T | null
function unwrap<T>(val: [] | [T] | undefined | null): T | null {
  if (!val) return null;
  if (Array.isArray(val)) {
    return val[0] ?? null;
  }
  return null;
}

// Tiles
export function useListTiles() {
  const { actor, isFetching } = useActor();

  return useQuery<TileMetadata[]>({
    queryKey: ['tiles'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTile(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<TileMetadata | null>({
    queryKey: ['tile', id],
    queryFn: async (): Promise<TileMetadata | null> => {
      if (!actor) return null;
      const result = await actor.getTile(id);
      return unwrap<TileMetadata>(result);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateTile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metadata: TileMetadata) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.createTile(metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
    },
  });
}

export function useUpdateTile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, metadata }: { id: string; metadata: TileMetadata }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateTileMetadata(id, metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
    },
  });
}

// Objects
export function useListObjects() {
  const { actor, isFetching } = useActor();

  return useQuery<ObjectMetadata[]>({
    queryKey: ['objects'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listObjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetObject(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<ObjectMetadata | null>({
    queryKey: ['object', id],
    queryFn: async (): Promise<ObjectMetadata | null> => {
      if (!actor) return null;
      const result = await actor.getObject(id);
      return unwrap<ObjectMetadata>(result);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateObject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metadata: ObjectMetadata) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.createObject(metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
    },
  });
}

export function useUpdateObject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, metadata }: { id: string; metadata: ObjectMetadata }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateObjectMetadata(id, metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
    },
  });
}

// Tile Sets
export function useListTileSets() {
  const { actor, isFetching } = useActor();

  return useQuery<TileSet[]>({
    queryKey: ['tileSets'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTileSets();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTileSet(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<TileSet | null>({
    queryKey: ['tileSet', id],
    queryFn: async (): Promise<TileSet | null> => {
      if (!actor) return null;
      const result = await actor.getTileSet(id);
      return unwrap<TileSet>(result);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateTileSet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileSet: TileSet) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.createTileSet(tileSet);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tileSets'] });
    },
  });
}

export function useUpdateTileSet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tileSet }: { id: string; tileSet: TileSet }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateTileSet(id, tileSet);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tileSets'] });
    },
  });
}

// Prefabs
export function useListPrefabs() {
  const { actor, isFetching } = useActor();

  return useQuery<Prefab[]>({
    queryKey: ['prefabs'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPrefabs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPrefab(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Prefab | null>({
    queryKey: ['prefab', id],
    queryFn: async (): Promise<Prefab | null> => {
      if (!actor) return null;
      const result = await actor.getPrefab(id);
      return unwrap<Prefab>(result);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreatePrefab() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefab: Prefab) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.createPrefab(prefab);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefabs'] });
    },
  });
}

export function useUpdatePrefab() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prefab }: { id: string; prefab: Prefab }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updatePrefab(id, prefab);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefabs'] });
    },
  });
}

// Maps
export function useListMaps() {
  const { actor, isFetching } = useActor();

  return useQuery<MapData[]>({
    queryKey: ['maps'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMaps();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMap(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<MapData | null>({
    queryKey: ['map', id],
    queryFn: async (): Promise<MapData | null> => {
      if (!actor) return null;
      const result = await actor.getMap(id);
      return unwrap<MapData>(result);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateMap() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapData: MapData) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.createMap(mapData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });
}

export function useUpdateMap() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, mapData }: { id: string; mapData: MapData }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateMap(id, mapData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });
}

// Delete hooks
export function useDeleteTile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.deleteTile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
    },
  });
}

export function useDeleteObject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.deleteObject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
    },
  });
}

export function useDeleteTileSet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.deleteTileSet(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tileSets'] });
    },
  });
}

export function useDeletePrefab() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.deletePrefab(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefabs'] });
    },
  });
}

export function useDeleteMap() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.deleteMap(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });
}
