/**
 * Standalone policy-vs-policy duel simulator — no browser, no server, no
 * network. Drives two BotPolicy implementations against each other
 * directly on a real YGOCore instance, applying their returned commands
 * through the exact same exec path the real server uses
 * (YGOGameServerExecCommand -> `ygo.exec(new JSONCommand(cmd))`).
 *
 * ts-node doesn't work cleanly in this monorepo (its "type":"module"
 * package.json fights ts-node's CJS/ESM interop). Compile with plain tsc
 * against the committed tsconfig, then run with plain node, with
 * NODE_PATH pointing at the monorepo root node_modules:
 *
 *   cd src/YGOPlayer/network/bot/__scripts__
 *   ../../../../../../node_modules/.bin/tsc -p tsconfig.duel-sim.json
 *   echo '{"type":"commonjs"}' > dist/package.json   # one-time per dist/ — ygo-player's own
 *                                                     # package.json is "type":"module", which
 *                                                     # would otherwise make node try to load
 *                                                     # the compiled CJS output as ESM and fail
 *   NODE_PATH=../../../../../../node_modules node dist/ygo-player/src/YGOPlayer/network/bot/__scripts__/duel-sim.js rule-based rule-based
 *
 * (tsc's output path is nested under dist/ygo-player/... because it also compiles ygo-core's
 * source — pulled in via the ygo-core path mapping below — and mirrors the common ancestor path.)
 *
 * Usage: node duel-sim.js <modelForPlayer0> <modelForPlayer1>
 * Model names must be registered in policy-registry.ts (currently
 * "rule-based" and "data-informed-v1"). Decks are shuffled, so each
 * process invocation plays a different game — run it many times (and
 * swap which model is player0/player1) to get an aggregate win rate
 * rather than judging policies off one game.
 */
import { YGOCore, JSONCommand, YGODuelPhase, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import { BotLegalityTracker } from "../legality";
import { getPolicyFactory } from "../policy-registry";
import YUBEL_DECK from "../../../../../../ygo-core/__tests__/decks/YUBEL.json";

const MAX_TURNS = 50;

function advancePhaseOrEndTurn(ygo: YGOCore): void {
  const phase = ygo.state.phase;
  const turn = ygo.state.turn;

  const currentIndex = YGO_DUEL_PHASE_ORDER.indexOf(phase);
  let nextIndex = currentIndex + 1;

  if (turn === 1 && phase === YGODuelPhase.Main1) {
    nextIndex += 2;
  }

  const nextPhase = YGO_DUEL_PHASE_ORDER[nextIndex];

  if (nextPhase) {
    ygo.exec(new JSONCommand({ type: "DuelPhaseCommand", data: { phase: nextPhase } }));
    return;
  }

  ygo.exec(new JSONCommand({ type: "DuelTurnCommand", data: {} }));
  ygo.exec(new JSONCommand({ type: "DuelPhaseCommand", data: { phase: YGODuelPhase.Draw } }));
}

function run() {
  const [modelP0, modelP1] = process.argv.slice(2);
  if (!modelP0 || !modelP1) {
    console.error("Usage: node dist/duel-sim.js <modelForPlayer0> <modelForPlayer1>");
    process.exit(1);
  }

  const ygo = new YGOCore({
    players: [
      { name: "p0", mainDeck: YUBEL_DECK.mainDeck as any, extraDeck: YUBEL_DECK.extraDeck as any },
      { name: "p1", mainDeck: YUBEL_DECK.mainDeck as any, extraDeck: YUBEL_DECK.extraDeck as any },
    ],
    options: { shuffleDecks: true },
  });
  ygo.start();

  const legalities = [new BotLegalityTracker(ygo, 0), new BotLegalityTracker(ygo, 1)];
  const policies = [
    getPolicyFactory(modelP0)({ ygo, playerIndex: 0, legality: legalities[0] }),
    getPolicyFactory(modelP1)({ ygo, playerIndex: 1, legality: legalities[1] }),
  ];
  const tally = [
    { summons: 0, attacks: 0, holds: 0 },
    { summons: 0, attacks: 0, holds: 0 },
  ];

  let winner: number | "draw" = "draw";
  let safety = 0;
  const SAFETY_CAP = 20000; // hard stop on any decision-loop bug, independent of turn count

  while (ygo.state.turn <= MAX_TURNS && safety < SAFETY_CAP) {
    safety++;
    const active = ygo.state.turnPlayer;
    legalities[active].sync();

    const commands = policies[active].decideNextAction();

    if (!commands || commands.length === 0) {
      tally[active].holds++;
      advancePhaseOrEndTurn(ygo);
    } else {
      const kind = commands[0].type;
      if (kind === "NormalSummonCommand" || kind === "TributeSummonCommand") tally[active].summons++;
      if (kind === "AttackCommand" || kind === "AttackDirectlyCommand") tally[active].attacks++;
      for (const command of commands) {
        ygo.exec(new JSONCommand({ type: command.type, data: command.data }));
      }
    }

    const lp0 = ygo.getField(0).lp;
    const lp1 = ygo.getField(1).lp;
    if (lp0 <= 0 || lp1 <= 0) {
      winner = lp0 <= 0 && lp1 <= 0 ? "draw" : lp0 <= 0 ? 1 : 0;
      break;
    }
  }

  const lp0 = ygo.getField(0).lp;
  const lp1 = ygo.getField(1).lp;

  console.log("=== DUEL RESULT ===");
  console.log(`player0 (${modelP0}): LP=${lp0}  summons=${tally[0].summons} attacks=${tally[0].attacks} holds=${tally[0].holds}`);
  console.log(`player1 (${modelP1}): LP=${lp1}  summons=${tally[1].summons} attacks=${tally[1].attacks} holds=${tally[1].holds}`);
  console.log(`turns=${ygo.state.turn}  decisionSteps=${safety}`);
  console.log(
    winner === "draw"
      ? (safety >= SAFETY_CAP || ygo.state.turn > MAX_TURNS ? "RESULT: draw/timeout" : "RESULT: draw")
      : `RESULT: player${winner} (${winner === 0 ? modelP0 : modelP1}) wins`,
  );
}

run();
