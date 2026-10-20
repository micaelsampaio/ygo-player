import { ComponentType, Dispatch, ReactNode, SetStateAction, useEffect, useLayoutEffect, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import type { YGODuelUIEvents } from "../core/YGODuelUIEvents";
import type { UiActionState, UiGameConfig, UiMenuState, YGOUiCloseMenuEvent, YGOUiMenuEvent, YGOUiMenuVisibilityEvent } from "./ui-types";
import { ACTIONS } from "./actions";
import { DuelLogMenu } from "./menus/duel-log/duel-log";
import { MENUS } from "./menus";
import { TimeLine } from "./menus/timeline";
import { BottomRightActions } from "./menus/bottom-right-actions";
import { PlayerHUD } from "./components/player-hud/PlayerHUD";
import { TurnBanner } from "./components/player-hud/TurnBanner";
import { WaitingBanner } from "./components/player-hud/WaitingBanner";
import { PhaseBanner } from "./components/player-hud/PhaseBanner";
import { PresenceReporter } from "./components/player-hud/PresenceReporter";
import { CardLongPressEffect } from "./components/card-long-press-effect/CardLongPressEffect";
import { useDeviceResolutionInfo } from "../scripts/use-device-resolution-info";
import { LeftMenuPanel } from "./menus/menu-panel/LeftMenuPanel";
import { AssistedOptionsPanel } from "./menus/assisted-options-panel";
import { ChainLinkBadges } from "./components/chain-links/ChainLinkBadges";
import { FirstDuelTips } from "./components/first-duel-tips/FirstDuelTips";
import { PuzzleHUD } from "./puzzle/PuzzleHUD";
import { DuelPerspectiveContext } from "./duel-perspective";

export type { UiActionState, UiGameConfig, UiMenuState } from "./ui-types";

/** An action/menu component as the controller renders it: its props come from
 * the event's `data` (spread) plus the controller's own, so they can't be
 * checked here. */
type DynamicUiComponent = ComponentType<Record<string, unknown>>;

/** The component registered for `type`, if any (same lookup as a plain index). */
function componentFor(registry: Record<string, ComponentType<never>>, type: string): DynamicUiComponent | undefined {
    return (registry as Record<string, ComponentType<never> | undefined>)[type] as DynamicUiComponent | undefined;
}

/** How a menu event changes the open menus. */
export type UiMenusChange =
    | { kind: "set"; menu: YGOUiMenuEvent }
    | { kind: "toggle"; menu: YGOUiMenuEvent }
    | ({ kind: "visibility" } & YGOUiMenuVisibilityEvent)
    | ({ kind: "close" } & YGOUiCloseMenuEvent);

/** The open menus after `change`; returns `menus` itself when nothing applies. */
export function nextMenus(menus: UiMenuState[], change: UiMenusChange): UiMenuState[] {
    switch (change.kind) {
        case "set": {
            const { group, type, data } = change.menu;
            return [...menus.filter(m => m.group !== group), { group, type, data, visible: true }];
        }
        case "toggle": {
            const { group, type, data } = change.menu;
            if (menus.some(m => m.type === type)) {
                return menus.filter(m => m.type !== type);
            }
            return [...menus.filter(m => m.group !== group), { group, type, data, visible: true }];
        }
        case "visibility": {
            const { group, type, visibility } = change;
            if (group) {
                return menus.map(menu => menu.group === group ? { ...menu, visible: visibility } : menu);
            }
            if (type) {
                return menus.map(menu => menu.type === type ? { ...menu, visible: visibility } : menu);
            }
            return menus;
        }
        case "close": {
            if (change.group) return menus.filter(m => m.group !== change.group);
            if (change.type) return menus.filter(m => m.type !== change.type);
            return menus;
        }
    }
}

const NO_ACTION: UiActionState = { type: "", data: null };

export interface UiControllerState {
    setAction: Dispatch<SetStateAction<UiActionState>>;
    setMenus: Dispatch<SetStateAction<UiMenuState[]>>;
    setGameConfig: Dispatch<SetStateAction<UiGameConfig>>;
}

/**
 * Wires the duel's UI events to the controller's state. Returns the cleanup
 * that removes every handler it added, so a remount for the same duel does
 * not stack them.
 */
/**
 * Both players' HUDs: this client's side, then the other. By localSide and
 * otherSide, not playerIndex: a spectator's playerIndex is -1, which has no field.
 */
export function PlayerHUDs({ duel, visible }: { duel: YGODuel; visible: boolean }) {
    return <>
        <PlayerHUD duel={duel} player={duel.perspective.localSide} visible={visible} />
        <PlayerHUD duel={duel} player={duel.perspective.otherSide} visible={visible} />
    </>;
}

export function bindUiControllerEvents(duel: Pick<YGODuel, "events" | "actionManager">, ui: UiControllerState): () => void {
    const offs: (() => void)[] = [];
    const on = <K extends keyof YGODuelUIEvents>(event: K, listener: YGODuelUIEvents[K]) => {
        duel.events.on(event, listener);
        offs.push(() => duel.events.off(event, listener));
    };
    const clearAction = () => {
        ui.setAction(prev => prev.type ? NO_ACTION : prev);
        duel.actionManager.clearAction();
    };
    const changeMenus = (change: UiMenusChange) => ui.setMenus(menus => nextMenus(menus, change));

    on("set-ui-action", ({ type, data }) => ui.setAction({ type, data }));
    on("clear-ui-action", clearAction);
    on("set-ui-menu", (menu) => {
        clearAction();
        changeMenus({ kind: "set", menu });
    });
    on("toggle-ui-menu", (menu) => {
        clearAction();
        changeMenus({ kind: "toggle", menu });
    });
    on("set-ui-menu-visibility", (change) => changeMenus({ kind: "visibility", ...change }));
    on("close-ui-menu", ({ group, type }) => {
        clearAction();
        changeMenus({ kind: "close", group, type });
    });
    on("update-game-ui-config", (config) => ui.setGameConfig(prev => ({ ...prev, ...config })));
    on("enable-game-actions", () => ui.setGameConfig(prev => ({ ...prev, actions: true })));
    on("disable-game-actions", () => ui.setGameConfig(prev => ({ ...prev, actions: false })));

    return () => offs.forEach(off => off());
}

/**
 * Re-renders `children` on every "render-ui" (sent per command). Only the
 * panels that read duel state while rendering and have no subscription of
 * their own sit inside one; the timeline and the duel log subscribe to what
 * they show, so a command no longer re-renders the whole tree.
 */
function RenderUiRefresh({ duel, children }: { duel: YGODuel, children: () => ReactNode }) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const refresh = () => setTick(tick => tick + 1);
        duel.events.on("render-ui", refresh);
        return () => duel.events.off("render-ui", refresh);
    }, [duel]);
    return <>{children()}</>;
}

export function YGOUiController({ duel }: { duel: YGODuel }) {
    const { isMobileLayout, isPortrait } = useDeviceResolutionInfo()
    const [gameConfig, setGameConfig] = useState<UiGameConfig>({ actions: true, startReplay: false, })
    const [action, setAction] = useState<UiActionState>(NO_ACTION)
    const [menus, setMenus] = useState<UiMenuState[]>([])
    const [showFloatingMenus, setShowFloatingMenus] = useState(isMobileLayout ? false : true);

    const clearAction = () => {
        setAction(prev => {
            if (prev.type) {
                return NO_ACTION;
            }
            return prev;
        });
    };

    useEffect(() => bindUiControllerEvents(duel, { setAction, setMenus, setGameConfig }), [duel]);

    useLayoutEffect(() => {
        if (duel) {
            duel.core.setIsMobileLayout(isMobileLayout);
        }
        if (!isMobileLayout) {
            setShowFloatingMenus(true);
        }
    }, [duel, isMobileLayout])

    const Action = componentFor(ACTIONS, action.type);

    if (!duel) return null;

    return <DuelPerspectiveContext.Provider value={duel.perspective}>
        <DuelLogMenu duel={duel} menus={menus} />
        <TimeLine duel={duel} />
        {/* Reads duel.fieldStats while rendering; it can appear after mount. */}
        <RenderUiRefresh duel={duel}>{() => <BottomRightActions duel={duel} showMenus={showFloatingMenus} toggleMenus={() => setShowFloatingMenus(value => !value)} />}</RenderUiRefresh>
        <RenderUiRefresh duel={duel}>{() => <PlayerHUDs duel={duel} visible={showFloatingMenus} />}</RenderUiRefresh>
        <TurnBanner duel={duel} />
        <WaitingBanner duel={duel} />
        <PhaseBanner duel={duel} />
        <PresenceReporter duel={duel} />
        <CardLongPressEffect duel={duel} />
        {/* <RotateYourPhoneModal isPortrait={isPortrait} isMobile={isMobile} /> */}
        <RenderUiRefresh duel={duel}>{() => <LeftMenuPanel duel={duel} isMobileLayout={isMobileLayout} showMenus={showFloatingMenus} />}</RenderUiRefresh>
        <ChainLinkBadges duel={duel} />
        <RenderUiRefresh duel={duel}>{() => <AssistedOptionsPanel duel={duel} isMobileLayout={isMobileLayout} />}</RenderUiRefresh>
        <FirstDuelTips duel={duel} />
        <PuzzleHUD duel={duel} />

        <RenderUiRefresh duel={duel}>{() => <>
            {
                menus.map(menu => {
                    const Menu = componentFor(MENUS, menu.type);
                    if (!Menu) return null;
                    return <Menu
                        config={gameConfig}
                        key={menu.type}
                        hasAction={!!Action}
                        isMobile={isMobileLayout}
                        isPortrait={isPortrait}
                        {...menu.data}
                        duel={duel}
                        visible />
                })
            }

            {Action && gameConfig.actions && <Action
                config={gameConfig}
                type={action.type}
                isMobile={isMobileLayout}
                isPortrait={isPortrait}
                {...action.data}
                duel={duel}
                clearAction={clearAction} />}
        </>}</RenderUiRefresh>
    </DuelPerspectiveContext.Provider>
}
