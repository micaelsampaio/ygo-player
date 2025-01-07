import { YGOCore } from "./YGOCore";
export declare class YGOReplayUtils {
    static createReplayData(ygo: YGOCore): {
        players: {
            name: string;
            deck: number[];
            mainDeckOrder: number[];
            extraDeck: number[];
        }[];
        commands: {
            type: string;
            data: unknown;
        }[];
        endField: any;
    };
    private static getMonsterCardInfo;
}
