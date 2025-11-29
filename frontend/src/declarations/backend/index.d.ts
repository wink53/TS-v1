import { ActorSubclass } from "@dfinity/agent";
import { _SERVICE } from "./backend.did";

export const canisterId: string;
export const createActor: (canisterId: string, options?: any) => ActorSubclass<_SERVICE>;
export const backend: ActorSubclass<_SERVICE>;
