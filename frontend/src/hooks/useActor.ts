import { backend, createActor } from '../backend';
import { useMemo } from 'react';

export const useActor = () => {
    const actor = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const canisterId = params.get('id');
        if (canisterId) {
            console.log('Using custom canister ID:', canisterId);
            return createActor(canisterId);
        }
        return backend;
    }, []);

    return {
        actor,
        isFetching: false
    };
};
