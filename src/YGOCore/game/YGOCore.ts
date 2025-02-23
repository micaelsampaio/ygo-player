import { JSONCommand } from "../commands/JSONCommand";
import { StartHandCommand } from "../commands/StartHandCommand";
import { Command } from "../types/commands";
import { PlayerField, YGOCoreEvents, YGOPhase, YGOProps } from "../types/types";
import { EventBus } from "../utils/event-bus";
import { YGODuelLog } from "./YGODuelLog";
import { YGOGameState } from "./YGOGameState";
import { YGOReplayUtils } from "./YGOReplayUtils";
import { YGOUtils } from "./YGOUtils";

export class YGOCore {
    // private
    private commandId: number;
    // public
    public currentPlayer: number;
    public phase: YGOPhase;
    public props: YGOProps;
    public state: YGOGameState;
    public commands: Command[];
    public commandIndex: number = -1;
    public duelLog: YGODuelLog;
    public events: EventBus<YGOCoreEvents>;

    constructor(props: YGOProps) {
        this.props = props;
        this.state = new YGOGameState(props);
        this.duelLog = new YGODuelLog();
        this.events = new EventBus<YGOCoreEvents>();
        this.commands = this.createYGOCommands(props.commands);
        this.commandId = 0;
        /// game
        this.currentPlayer = 0;
        this.phase = YGOPhase.DrawPhase;
        // events
        this.duelLog.events.on("new-log", data => this.events.dispatch("new-log", data));
        this.duelLog.events.on("update-logs", data => this.events.dispatch("update-logs", data));
    }

    start() {
        const { draw: cardsToDrawInStart = 5 } = this.props.options || {};

        if (this.commands.length === 0) {
            this.props.players.forEach((_, player) => {
                this.exec(new StartHandCommand({
                    player,
                    numberOfCards: cardsToDrawInStart
                }));
            });
        }
    }

    setCurrentPlayer(player: number) {
        if (player < 0 || player > 1) throw new Error(`invalid player ${player}`);

        this.currentPlayer = player;
        this.events.dispatch("set-player", { player });
    }

    exec(command: Command): Command {
        if (this.hasNextCommand()) {
            this.commands.splice(this.commandIndex + 1, this.commands.length - this.commandIndex);
        }
        this.commandIndex = this.commands.length;
        this.commands.push(command);
        command.init(this);
        this.events.dispatch("command-created", { command });
        command.exec();
        this.events.dispatch("command-executed", { command });
        return command;
    }

    peek(): Command | null {
        return this.commands.length > 0 ? this.commands[this.commands.length - 1] : null;
    }

    redo(): Command | null {
        if (!this.hasNextCommand()) return null;
        this.commandIndex++;
        const cmdToRedo = this.commands[this.commandIndex];
        cmdToRedo.exec();
        this.duelLog.onLogsUpdated();
        this.events.dispatch("command-redo", { command: cmdToRedo });

        return cmdToRedo;
    }

    undo(): Command | null {
        if (!this.hasPrevCommand()) return null;

        const cmdToUndo = this.commands[this.commandIndex];
        this.duelLog.removeCommand(cmdToUndo);
        cmdToUndo.undo();
        this.commandIndex--;
        this.duelLog.onLogsUpdated();
        this.events.dispatch("command-undo", { command: cmdToUndo });

        return cmdToUndo;
    }

    goToCommand(command: Command): boolean {

        const commandIndex = this.commands.findIndex(c => c === command);

        if (commandIndex === -1) return false;

        if (commandIndex === this.commandIndex) return true;

        if (commandIndex > this.commandIndex) {
            while (this.commandIndex !== commandIndex && this.hasNextCommand()) {
                this.redo();
            }
            return true;
        } else {
            while (this.commandIndex !== commandIndex && this.hasPrevCommand()) {
                this.undo();
            }
            return true;
        }
    }

    hasNextCommand() {
        return this.commands.length - 1 > this.commandIndex;
    }

    hasPrevCommand() {
        return this.commandIndex >= 0;
    }

    getNextCommandId() {
        return ++this.commandId;
    }

    getReplayData() {

        while (this.hasNextCommand()) {
            this.redo();
        }

        return YGOReplayUtils.createReplayData(this);
    }

    getField(player: number): PlayerField {
        return this.state.fields[player];
    }

    private createYGOCommands(commands?: any[]) {
        this.duelLog.enabled = false;

        if (Array.isArray(commands)) {
            const loadedCommands = commands.map(cmd => {
                const command = new JSONCommand(cmd);
                command.init(this);
                command.exec();
                return command;
            });

            // if true will not undo all the commands passed on constructor
            // Can be undefined so validate if !== true
            if (this.props.options?.execCommands !== true) {
                for (let i = loadedCommands.length - 1; i >= 0; --i) {
                    loadedCommands[i].undo();
                }
            }

            this.duelLog.enabled = true;
            return loadedCommands;
        }

        this.duelLog.enabled = true;

        return [];
    }

    getCurrentStateProps() {
        return YGOUtils.getYGOCoreStateProps(this);
    }
}