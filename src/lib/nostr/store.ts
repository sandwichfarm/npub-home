import { EventStore } from 'applesauce-core/event-store';
import { RelayPool } from 'applesauce-relay';

export const eventStore = new EventStore();
export const pool = new RelayPool();
