import React, { useContext, useEffect, useState } from "react";
import { useActor } from "@xstate/react";
import {
  Routes,
  Route,
  HashRouter,
  Navigate,
  useSearchParams,
  createSearchParams,
} from "react-router-dom";

import * as AuthProvider from "features/auth/lib/Provider";

import { Splash } from "features/auth/components/Splash";
import { Auth } from "features/auth/Auth";
import { Forbidden } from "features/auth/components/Forbidden";
import { useImagePreloader } from "features/auth/useImagePreloader";
import { LandExpansion } from "features/game/expansion/LandExpansion";
import { CONFIG } from "lib/config";
import { Community } from "features/community/Community";
import { Retreat } from "features/retreat/Retreat";
import { Builder } from "features/builder/Builder";
import { wallet } from "lib/blockchain/wallet";

/**
 * FarmID must always be passed to the /retreat/:id route.
 * The problem is that when deep-linking to goblin trader, the FarmID will not be present.
 * This reacter-router helper component will compute correct route and navigate to retreat.
 */
const TraderDeeplinkHandler: React.FC<{ farmId?: number }> = ({ farmId }) => {
  const [params] = useSearchParams();

  if (!farmId) return null;

  return (
    <Navigate to={`/retreat/${farmId}?${createSearchParams(params)}`} replace />
  );
};

/**
 * Entry point for game which reflects the user session state
 * Controls flow of authorised and unauthorised games
 */
export const Navigation: React.FC = () => {
  const { authService } = useContext(AuthProvider.Context);
  const [authState, send] = useActor(authService);
  const provider = authState.context.user.web3?.provider;
  const [showGame, setShowGame] = useState(false);
  useImagePreloader();

  /**
   * Listen to web3 account/chain changes
   * TODO: move into a hook
   */
  useEffect(() => {
    if (provider) {
      if (provider.on) {
        provider.on("chainChanged", () => {
          send("CHAIN_CHANGED");
        });
        provider.on("accountsChanged", function (accounts: string[]) {
          // Metamask Mobile accidentally triggers this on route changes
          const didChange = accounts[0] !== wallet.myAccount;
          if (didChange) {
            send("ACCOUNT_CHANGED");
          }
        });
      } else if (provider.givenProvider) {
        provider.givenProvider.on("chainChanged", () => {
          send("CHAIN_CHANGED");
        });
        provider.givenProvider.on("accountsChanged", function () {
          send("ACCOUNT_CHANGED");
        });
      }
    }
  }, [provider]);

  useEffect(() => {
    const _showGame =
      authState.matches({ connected: "authorised" }) ||
      authState.matches("visiting");

    // TODO: look into this further
    // This is to prevent a modal clash when the authmachine switches
    // to the game machine.
    setTimeout(() => setShowGame(_showGame), 20);
  }, [authState, authState.value]);

  return (
    <>
      <Auth />
      {showGame ? (
        <HashRouter>
          <Routes>
            <Route path="/" element={<LandExpansion />} />
            {/* Forbid entry to Goblin Village when in Visiting State show Forbidden screen */}
            {!authState.matches("visiting") && (
              <Route
                path="/goblins"
                element={
                  <Splash>
                    <Forbidden />
                  </Splash>
                }
              />
            )}

            <Route path="/visit/*" element={<LandExpansion key="visit" />} />
            <Route path="/land/:id/*" element={<LandExpansion key="land" />} />
            <Route path="/land" element={<LandExpansion key="guest-land" />} />
            <Route path="/retreat">
              <Route
                index
                element={
                  <TraderDeeplinkHandler
                    farmId={authState.context.user.farmId}
                  />
                }
              />
              <Route path=":id" element={<Retreat key="retreat" />} />
            </Route>

            {CONFIG.NETWORK === "mumbai" && (
              <Route path="/builder" element={<Builder key="builder" />} />
            )}

            <Route
              path="/community-garden/:id"
              element={<Community key="community" />}
            />
          </Routes>
        </HashRouter>
      ) : (
        <Splash />
      )}
    </>
  );
};
