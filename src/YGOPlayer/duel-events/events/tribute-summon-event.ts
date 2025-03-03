// if origin && zoen
// new Move card
// on complete -> start 
import * as THREE from 'three';
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "../../../YGOCore";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { getGameZone } from "../../scripts/ygo-utils";
import { MoveCardEventHandler } from "./move-card-event";
import { CallbackTransition } from '../utils/callback';
import { WaitForSeconds } from '../utils/wait-for-seconds';

interface TributeSummonHandlerProps extends DuelEventHandlerProps {
    event: YGODuelEvents.TributeSummon
}

export class TributeSummonHandler extends YGOCommandHandler {
    private command: YGOCommandHandler | undefined;
    private sendToGyCommands: YGOCommandHandler[] = [];

    constructor(private props: TributeSummonHandlerProps) {
        super("tribute_summon_event");
    }

    public start(): void {
        this.sendTributesCommand()
    }

    private sendTributesCommand() {
        const { event } = this.props;
        let completed = 0;

        const onCompleted = () => {
            if (++completed < event.tributes.length) return;

            const sequence = new YGOTaskSequence(
                new WaitForSeconds(0.25),
                new CallbackTransition(() => {
                    this.sendToGyCommands = [];
                    this.startMoveCommand();
                })
            );
            this.props.startTask(sequence);
        }

        this.sendToGyCommands = event.tributes.map((tribute, index) => {
            const command = new MoveCardEventHandler({
                ...this.props,
                startCommandDelay: index * 0.2,
                event: {
                    id: tribute.id,
                    originZone: tribute.zone,
                    player: event.player,
                    zone: YGOGameUtils.createZone("GY", tribute.owner),
                    type: "Move Card"
                },
                onCompleted
            });

            command.start();

            return command;
        });

        if (this.sendToGyCommands.length === 0) onCompleted();
    }

    private startMoveCommand() {
        const { event } = this.props;

        this.command = new MoveCardEventHandler({
            ...this.props,
            event: {
                id: event.id,
                originZone: event.originZone!,
                zone: event.zone,
                player: event.player,
                type: "Move Card"
            },
            onCompleted: () => {
                this.props.onCompleted();
            }
        });

        this.command.start();
    }

    public finish(): void {
        this.sendToGyCommands.forEach(cmd => cmd.finish());
        this.command?.finish();
    }
}