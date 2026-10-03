import { ComponentType, useEffect, useLayoutEffect, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import type { UiGameConfig } from "../core/YGODuelUIEvents";
import { ACTIONS } from "./actions";
import { DuelLogMenu } from "./menus/duel-log/duel-log";
import { MENUS } from "./menus";
import { TimeLine } from "./menus/timeline";
import { BottomRightActions } from "./menus/bottom-right-actions";
import { PlayerHUD } from "./components/player-hud/PlayerHUD";
import { TurnBanner } from "./components/player-hud/TurnBanner";
import { CardLongPressEffect } from "./components/card-long-press-effect/CardLongPressEffect";
import { useDeviceResolutionInfo } from "../scripts/use-device-resolution-info";
import { LeftMenuPanel } from "./menus/menu-panel/LeftMenuPanel";
import { AssistedOptionsPanel } from "./menus/assisted-options-panel";
import { ChainLinkBadges } from "./components/chain-links/ChainLinkBadges";
import { FirstDuelTips } from "./components/first-duel-tips/FirstDuelTips";
import { PuzzleHUD } from "./puzzle/PuzzleHUD";
import { DuelPerspectiveContext } from "./duel-perspective";

export type { UiGameConfig } from "../core/YGODuelUIEvents";

/** An action/menu component as the controller renders it: its props come from
 * the event's `data` (spread) plus the controller's own, so they can't be
 * checked here. */
type DynamicUiComponent = ComponentType<Record<string, unknown>>;

/** The component registered for `type`, if any (same lookup as a plain index). */
function componentFor(registry: Record<string, ComponentType<never>>, type: string): DynamicUiComponent | undefined {
    return (registry as Record<string, ComponentType<never> | undefined>)[type] as DynamicUiComponent | undefined;
}

export function YGOUiController({ duel }: { duel: YGODuel }) {
    const { isMobileLayout, isPortrait } = useDeviceResolutionInfo()
    const [_, setRender] = useState<number>(-1)
    const [gameConfig, setGameConfig] = useState<UiGameConfig>({ actions: true, startReplay: false, })
    const [action, setAction] = useState<{ type: string, data?: object | null }>({ type: "", data: null })
    const [menus, setMenus] = useState<{ group: string, visible: boolean, type: string, data?: object }[]>([])
    const [showFloatingMenus, setShowFloatingMenus] = useState(isMobileLayout ? false : true);

    const clearAction = () => {
        setAction(prev => {
            if (prev.type) {
                return { type: '', data: null };
            }
            return prev;
        });
    };

    useEffect(() => {
        const clearAction = () => {
            setAction((prevState) => {
                if (prevState.type) {
                    return { type: "", data: null };
                }
                return prevState;
            });
            duel.actionManager.clearAction();
        }

        duel.events.on("set-ui-action", ({ type, data }) => {
            setAction({ type, data });
        });

        duel.events.on("clear-ui-action", () => {
            clearAction();
        });

        duel.events.on("set-ui-menu", ({ group, type, data }) => {
            clearAction();
            setMenus((currentMenus) => {
                const menus = currentMenus.filter(m => m.group !== group);
                menus.push({ group, type, data, visible: true });
                return menus;
            });
        });

        duel.events.on("toggle-ui-menu", ({ group, type, data }) => {
            clearAction();

            setMenus((currentMenus) => {
                const currentMenu = currentMenus.find(m => m.type === type);

                if (currentMenu) {
                    return currentMenus.filter(m => m.type !== type)
                }

                const menus = currentMenus.filter(m => m.group !== group);
                menus.push({ group, type, data, visible: true });
                return menus;
            });
        });

        duel.events.on("set-ui-menu-visibility", ({ group, type, visibility }) => {

            setMenus((currentMenus) => {

                if (group) {
                    return currentMenus.map(menu => {
                        if (menu.group === group) {
                            return { ...menu, visible: visibility }
                        }
                        return menu;
                    })
                }
                if (type) {
                    return currentMenus.map(menu => {
                        if (menu.type === type) {
                            return { ...menu, visible: visibility }
                        }
                        return menu;
                    })
                }

                return { ...menus };
            });
        });

        duel.events.on("close-ui-menu", ({ group, type }) => {
            clearAction();

            if (group) {
                setMenus((currentMenus) => currentMenus.filter(m => m.group !== group));
            } else if (type) {
                setMenus((currentMenus) => currentMenus.filter(m => m.type !== type));
            }
        });

        duel.events.on("update-game-ui-config", (config) => {
            setGameConfig(prev => ({ ...prev, ...config }));
        });

        duel.events.on("render-ui", () => {
            setRender(performance.now())
        });
        duel.events.on("enable-game-actions", () => {
            setGameConfig(currentGameConfig => ({ ...currentGameConfig, actions: true }));
        });
        duel.events.on("disable-game-actions", () => {
            setGameConfig(currentGameConfig => ({ ...currentGameConfig, actions: false }));
        });
    }, []);

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
        <BottomRightActions duel={duel} showMenus={showFloatingMenus} toggleMenus={() => setShowFloatingMenus(value => !value)} />
        <PlayerHUD duel={duel} player={duel.perspective.playerIndex} visible={showFloatingMenus} />
        <PlayerHUD duel={duel} player={duel.perspective.otherPlayerIndex} visible={showFloatingMenus} />
        <TurnBanner duel={duel} />
        <CardLongPressEffect duel={duel} />
        {/* <RotateYourPhoneModal isPortrait={isPortrait} isMobile={isMobile} /> */}
        <LeftMenuPanel duel={duel} isMobileLayout={isMobileLayout} showMenus={showFloatingMenus} />
        <ChainLinkBadges duel={duel} />
        <AssistedOptionsPanel duel={duel} isMobileLayout={isMobileLayout} />
        <FirstDuelTips duel={duel} />
        <PuzzleHUD duel={duel} />

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
    </DuelPerspectiveContext.Provider>
}