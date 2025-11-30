import { backend, createActor } from '../backend';
import { useMemo } from 'react';

const STORAGE_KEY = 'icp_backend_canister_id';

export const useActor = () => {
    const actor = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('id');

        if (urlId) {
            console.log('Found canister ID in URL:', urlId);
            localStorage.setItem(STORAGE_KEY, urlId);
            return createActor(urlId);
        }

        const storedId = localStorage.getItem(STORAGE_KEY);
        if (storedId) {
            console.log('Found canister ID in Storage:', storedId);
            return createActor(storedId);
        }

        console.log('Using default backend actor');
        return backend;
    }, []);

    return {
        actor,
        isFetching: false
    };
};

export const getStoredCanisterId = () => localStorage.getItem(STORAGE_KEY);
export const setStoredCanisterId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    window.location.reload(); // Reload to re-initialize actor
};
