import { useEffect, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import { ACTIONS } from "./actions";
import { DuelLogMenu } from "./menus/duel-log";
import { Graveyard } from "./menus/graveyard";
import { ExtraDeck } from "./menus/extra-deck";
import { XyzMonsterMaterialsMenu } from "./menus/xyz-monster-materials";
import { MENUS } from "./menus";
import { TimeLine } from "./menus/timeline";

export function YGOUiController({ duel }: { duel: YGODuel }) {
    // TODO

    const [_, setRender] = useState<number>(-1);
    const [action, setAction] = useState<{ type: string, data: any }>({ type: "", data: null });
    const [menus, setMenus] = useState<{ key: string, type: string, data: any }[]>([]);
    const clearAction = () => {
        console.log("XX CLEAR ACTION");
        setAction({ type: '', data: null });
    };

    console.log("XX ACTION: ", action);
    console.log("XX MENU: ", action);

    useEffect(() => {
        // TODO

        const clearAction = () => {
            console.log("XX CLEAR ACTION");
            setAction({ type: "", data: null });
        }

        duel.events.on("set-ui-action", ({ type, data }: any) => {
            console.log("XX SET ACTION", type);
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

        duel.events.on("close-ui-menu", ({ key }: { key: string }) => {
            clearAction();
            setMenus((currentMenus) => currentMenus.filter(m => m.key !== key));
        });

        duel.events.on("render-ui", () => {
            setRender(performance.now())
        });

        // // duel.events.on("on-card-hand-click", (data: any) => {
        // //     // TODO
        // //     console.log("REACT CLICK ", data);
        // //     setAction({ type: "CARD_HAND_MENU", data });
        // // });

        // duel.events.on("clear-actions", () => {
        //     setAction({ type: "", data: null });
        // });

        // //duel.events.on
    }, []);

    const Action = (ACTIONS as any)[action.type] as any;

    console.log(action.data);
    if (!duel) return null;
    console.log("Action::", action);
    console.log("MENUS::", menus);
    return <>
        <DuelLogMenu duel={duel} />
        <TimeLine duel={duel} />

        {
            menus.map(menu => {
                const Menu = (MENUS as any)[menu.type] as any;
                return <Menu key={menu.type} duel={duel} {...menu.data} />
            })
        }
        {Action && <Action type={action.type} {...action.data} duel={duel} clearAction={clearAction} />}
    </>
}