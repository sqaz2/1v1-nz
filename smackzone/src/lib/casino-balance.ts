export type CasinoBalance = {
  playerId: string;
  worldId: string;
  currency: number;
  casinoData: { raffleTickets: number };
};

type SaveOptions = {
  read: (playerId: string) => CasinoBalance;
  isAcknowledged: (balance: CasinoBalance) => boolean;
  acknowledge: (balance: CasinoBalance) => void;
  active: () => boolean;
  onError: (error: unknown) => void;
  write?: (balance: CasinoBalance, timeoutMs: number) => Promise<void>;
  timeoutMs?: number;
};

/** The deadline includes reading the response, not just receiving its headers. */
export async function postCasinoBalance(
  balance: CasinoBalance,
  timeoutMs = 15000,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Casino balance save timed out.'));
    }, Math.max(1, timeoutMs));
  });
  try {
    await Promise.race([
      (async () => {
        const response = await fetcher('/api/casino/currency', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'starmuff' },
          body: JSON.stringify(balance),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Balance save failed: ' + response.status);
        // A successful response is acknowledged only after its body arrives.
        await response.text();
      })(),
      deadline,
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Serialize bets and payouts. Never let an older request land after a newer one. */
export function createCasinoBalanceSaver(options: SaveOptions) {
  let pending: Promise<boolean> | null = null;
  const write = options.write || postCasinoBalance;
  return {
    save(playerId: string): Promise<boolean> {
      if (!options.active()) return Promise.resolve(false);
      if (pending) return pending;
      const expiresAt = Date.now() + (options.timeoutMs ?? 15000);
      pending = (async () => {
        try {
          while (options.active()) {
            const balance = options.read(playerId);
            if (!Number.isFinite(balance.currency) || balance.currency < 0 ||
                !Number.isFinite(balance.casinoData.raffleTickets) || balance.casinoData.raffleTickets < 0) {
              throw new Error('The casino balance is invalid.');
            }
            if (options.isAcknowledged(balance)) return true;
            const remaining = expiresAt - Date.now();
            if (remaining <= 0) throw new Error('Casino balance save timed out.');
            await write(balance, remaining);
            options.acknowledge(balance);
            // Read again: a payout or raffle ticket may have arrived while saving.
          }
          return false;
        } catch (error) {
          options.onError(error);
          return false;
        }
      })().finally(() => { pending = null; });
      return pending;
    },
  };
}

export function casinoRoundCanExit(gameState: string, isModeSpinning: boolean): boolean {
  return !isModeSpinning && ['menu', 'casino_lobby', 'gameover'].includes(gameState);
}
