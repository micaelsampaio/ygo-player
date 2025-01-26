import { useEffect, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import { ACTIONS } from "./actions";
import { DuelLogMenu } from "./menus/duel-log";
import { MENUS } from "./menus";
import { TimeLine } from "./menus/timeline";

export interface UiGameConfig {
    actions: boolean
}

export function YGOUiController({ duel }: { duel: YGODuel }) {
    const [_, setRender] = useState<number>(-1);
    const [gameConfig, setGameConfig] = useState<UiGameConfig>({ actions: true });
    const [action, setAction] = useState<{ type: string, data: any }>({ type: "", data: null });
    const [menus, setMenus] = useState<{ key: string, type: string, data: any }[]>([]);

    console.log(menus.map(m => m.key));

    const clearAction = () => {
        setAction({ type: '', data: null });
    };

    useEffect(() => {
        const clearAction = () => {
            setAction({ type: "", data: null });
        }

        duel.events.on("set-ui-action", ({ type, data }: any) => {
            setAction({ type, data });
        });

        duel.events.on("clear-ui-action", () => {
            clearAction();
        });

        duel.events.on("set-ui-menu", ({ key, type, data }: any) => {
            clearAction();
            setMenus((currentMenus) => {
                const menus = currentMenus.filter(m => m.type !== type);
                menus.push({ key, type, data });
                return menus;
            });
        });

        duel.events.on("toggle-ui-menu", ({ key, type, data }: any) => {
            clearAction();

            setMenus((currentMenus) => {
                const currentMenu = currentMenus.find(m => m.type === type);

                if (currentMenu) {
                    return currentMenus.filter(m => m.type !== type)
                }

                const menus = currentMenus.filter(m => m.key !== key);
                menus.push({ key, type, data });
                return menus;
            });
        });

        duel.events.on("close-ui-menu", ({ key, type }: { key: string, type: string }) => {
            clearAction();
            
            if (key) {
                setMenus((currentMenus) => currentMenus.filter(m => m.key !== key));
            } else if (type) {
                setMenus((currentMenus) => currentMenus.filter(m => m.type !== type));
            }
        });

        duel.events.on("set-selected-card", (data: any) => {
            setMenus(currentMenus => {
                const type = "selected-card-menu";
                if (!data.card) {
                    return currentMenus.filter(m => m.key !== type);
                } else {
                    const currentMenu = currentMenus.find(m => m.type === type);

                    if (currentMenu) {
                        currentMenu.data = data;
                        return [...currentMenus];
                    }

                    return [...currentMenus, { key: type, type: "selected-card-menu", data }];
                }
            });
        })

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
        <DuelLogMenu duel={duel} />
        <TimeLine duel={duel} />

        {
            menus.map(menu => {
                const Menu = (MENUS as any)[menu.type] as any;
                console.log(menu.key, Menu);
                return <Menu config={gameConfig} key={menu.type} duel={duel} {...menu.data} visible />
            })
        }
        {Action && gameConfig.actions && <Action config={gameConfig} type={action.type} {...action.data} duel={duel} clearAction={clearAction} />}
    </>
}