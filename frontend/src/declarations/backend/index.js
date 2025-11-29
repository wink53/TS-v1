import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./backend.did.js";

export const canisterId = "2zbce-xyaaa-aaaam-aepbq-cai";

export const createActor = (canisterId, options = {}) => {
    const agent = options.agent || new HttpAgent({
        host: "https://ic0.app",
        ...options.agentOptions
    });

    if (options.agent && options.agentOptions) {
        console.warn(
            "Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent."
        );
    }

    // Fetch root key for certificate validation during development
    // Only fetch root key if we're running locally (localhost)
    const isLocal = window.location.host.includes("localhost") || window.location.host.includes("127.0.0.1");
    if (isLocal) {
        agent.fetchRootKey().catch((err) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running"
            );
            console.error(err);
        });
    }

    return Actor.createActor(idlFactory, {
        agent,
        canisterId,
        ...options.actorOptions,
    });
};

export const backend = createActor(canisterId);
