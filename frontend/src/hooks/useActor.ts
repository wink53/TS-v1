import { backend } from '../backend';

export const useActor = () => {
    return {
        actor: backend,
        isFetching: false // Mock backend is always ready
    };
};
