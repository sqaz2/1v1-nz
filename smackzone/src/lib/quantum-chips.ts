export type QuantumChipSave = { version: 1; chips: number };
export interface CasinoWallet {
  load(): Promise<QuantumChipSave>;
  save(state: QuantumChipSave): Promise<void>;
  description: string;
  returnLabel: string;
}

export const STARTER_CHIPS = 6000;
export const MAX_CHIPS = 1_000_000_000;
export const QUANTUM_CHIPS_KEY = 'starmuff.quantum-chips.v1';

// A missing wallet is a new visit; damaged existing data must not become a grant.
export function quantumChipSave(value: unknown): QuantumChipSave {
  if (value == null) return { version: 1, chips: STARTER_CHIPS };
  const state = value as Partial<QuantumChipSave>;
  if (state.version !== 1 || !Number.isSafeInteger(state.chips) || state.chips! < 0 || state.chips! > MAX_CHIPS) {
    throw new Error('Quantum Chip balance is invalid.');
  }
  return { version: 1, chips: state.chips! };
}

/** 1v1's existing games have no account requirement. Keep this arcade purse
 * explicitly browser-local, and never import an old pilot ID or ship balance. */
export function localCasinoWallet(storage: Pick<Storage, 'getItem' | 'setItem'>): CasinoWallet {
  let acknowledged: string | null | undefined;
  return {
    description: 'Quantum Chips · saved in this browser · free game points',
    returnLabel: 'Return to 1v1',
    async load() {
      const raw = storage.getItem(QUANTUM_CHIPS_KEY);
      const state = quantumChipSave(raw === null ? null : JSON.parse(raw));
      acknowledged = raw;
      return state;
    },
    async save(value) {
      const state = quantumChipSave(value);
      if (acknowledged === undefined || storage.getItem(QUANTUM_CHIPS_KEY) !== acknowledged) {
        throw new Error('Casino changed in another tab. Reload before playing again.');
      }
      const raw = JSON.stringify(state);
      storage.setItem(QUANTUM_CHIPS_KEY, raw);
      acknowledged = raw;
    },
  };
}
