import { useEffect, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import { ACTIONS } from "./actions";
import { DuelLogMenu } from "./menus/duel-log/duel-log";
import { MENUS } from "./menus";
import { TimeLine } from "./menus/timeline";
import { BottomRightActions } from "./menus/bottom-right-actions";
import { PlayerHUD } from "./components/player-hud/PlayerHUD";
import { CardLongPressEffect } from "./components/card-long-press-effect/CardLongPressEffect";
import { RotateYourPhoneModal } from "./menus/rotate-your-phone";
import { useDeviceResolutionInfo } from "../scripts/use-device-resolution-info";
import { LeftMenuPanel } from "./menus/menu-panel/LeftMenuPanel";
import { YGOStatic } from "../core/YGOStatic";

export interface UiGameConfig {
    actions: boolean
    startReplay: boolean
}

export function YGOUiController({ duel }: { duel: YGODuel }) {
    const [_, setRender] = useState<number>(-1)
    const [gameConfig, setGameConfig] = useState<UiGameConfig>({ actions: true, startReplay: false, })
    const [action, setAction] = useState<{ type: string, data: any }>({ type: "", data: null })
    const [menus, setMenus] = useState<{ group: string, visible: boolean, type: string, data: any }[]>([])
    const { isMobile, isPortrait } = useDeviceResolutionInfo()

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

        duel.events.on("set-ui-action", ({ type, data }: any) => {
            setAction({ type, data });
        });

        duel.events.on("clear-ui-action", () => {
            clearAction();
        });

        duel.events.on("set-ui-menu", ({ group, type, data }: any) => {
            clearAction();
            setMenus((currentMenus) => {
                const menus = currentMenus.filter(m => m.group !== group);
                menus.push({ group, type, data, visible: true });
                return menus;
            });
        });

        duel.events.on("toggle-ui-menu", ({ group, type, data }: any) => {
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

        duel.events.on("set-ui-menu-visibility", ({ group, type, visibility }: any) => {

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

        duel.events.on("close-ui-menu", ({ group, type }: { group: string, type: string }) => {
            clearAction();

            if (group) {
                setMenus((currentMenus) => currentMenus.filter(m => m.group !== group));
            } else if (type) {
                setMenus((currentMenus) => currentMenus.filter(m => m.type !== type));
            }
        });

        duel.events.on("update-game-ui-config", (key: string, value: any) => {
            setGameConfig(prev => ({ ...prev, [key]: value }));
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

    const Action = (ACTIONS as any)[action.type] as any;

    if (!duel) return null;

    return <>
        <DuelLogMenu duel={duel} menus={menus} />
        <TimeLine duel={duel} />
        <BottomRightActions duel={duel} />
        <PlayerHUD duel={duel} player={YGOStatic.playerIndex} />
        <PlayerHUD duel={duel} player={YGOStatic.otherPlayerIndex} />
        <CardLongPressEffect duel={duel} />
        <RotateYourPhoneModal isPortrait={isPortrait} isMobile={isMobile} />
        <LeftMenuPanel duel={duel} />

        {
            menus.map(menu => {
                const Menu = (MENUS as any)[menu.type] as any;
                if (!Menu) return null;
                return <Menu
                    config={gameConfig}
                    key={menu.type}
                    hasAction={!!Action}
                    isMobile={isMobile}
                    isPortrait={isPortrait}
                    {...menu.data}
                    duel={duel}
                    visible />
            })
        }

        {Action && gameConfig.actions && <Action
            config={gameConfig}
            type={action.type}
            isMobile={isMobile}
            isPortrait={isPortrait}
            {...action.data}
            duel={duel}
            clearAction={clearAction} />}
    </>
}