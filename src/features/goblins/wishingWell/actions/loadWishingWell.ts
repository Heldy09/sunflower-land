import { getPairBalance } from "lib/blockchain/Pair";
import { sflBalanceOf } from "lib/blockchain/Token";
import { wallet } from "lib/blockchain/wallet";
import {
  canCollectFromWell,
  getLockedPeriod,
  getWellBalance,
  lastCollectedFromWell,
} from "lib/blockchain/WishingWell";
import { CONFIG } from "lib/config";
import { secondsToString } from "lib/utils/time";

const wishingWellAddress = CONFIG.WISHING_WELL_CONTRACT;

export type WishingWellTokens = {
  myTokensInWell: string;
  totalTokensInWell: string;
  canCollect: boolean;
  lpTokens: string;
  lockedTime?: string;
  lockedPeriod: number;
};

/**
 * Load Blockchain data for the wishing well
 */
export async function loadWishingWell(): Promise<WishingWellTokens> {
  const tokensInWellPromise = getWellBalance(
    wallet.web3Provider,
    wallet.myAccount
  );
  const canCollectPromise = canCollectFromWell(
    wallet.web3Provider,
    wallet.myAccount
  );
  const lastCollectedPromise = lastCollectedFromWell(
    wallet.web3Provider,
    wallet.myAccount
  );
  const lockedPeriodPromise = getLockedPeriod(
    wallet.web3Provider,
    wallet.myAccount
  );
  const lpTokensPromise = getPairBalance(wallet.web3Provider, wallet.myAccount);
  const totalTokensInWellPromise = sflBalanceOf(
    wallet.web3Provider,
    wallet.myAccount,
    wishingWellAddress as string
  );

  const [
    myTokensInWell,
    canCollect,
    lpTokens,
    lastCollected,
    totalTokensInWell,
    lockedPeriod,
  ] = await Promise.all([
    tokensInWellPromise,
    canCollectPromise,
    lpTokensPromise,
    lastCollectedPromise,
    totalTokensInWellPromise,
    lockedPeriodPromise,
  ]);

  let lockedTime;
  const secondsSinceLock = new Date().getTime() / 1000 - lastCollected;

  if (secondsSinceLock <= lockedPeriod) {
    const remaining = lockedPeriod - secondsSinceLock;
    lockedTime = secondsToString(remaining, { length: "full" });
  }

  return {
    myTokensInWell,
    totalTokensInWell,
    canCollect,
    lpTokens,
    lockedTime,
    lockedPeriod,
  };
}
