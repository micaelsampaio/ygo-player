import { BotStrategy } from "./bot-strategy";
import { ExecutorRegistry } from "./executors/index";
import { BotPolicyFactory } from "./bot-policy";

/**
 * name -> BotPolicyFactory lookup, mirroring ExecutorRegistry's pattern.
 * "rule-based" is the original behavior (always kill the biggest safe
 * threat available). "data-informed-v1" is the first policy actually
 * informed by mining the real replay corpus (see
 * ygo-replay-parser/corpus-findings.md, "Battle behavior (inferred)"):
 * real target selection among available kills is close to a coin flip
 * (471 weakest / 460 strongest / 229 tied, of 1,160 rankable kills) —
 * no consistent bias toward the biggest threat — so this variant picks
 * randomly among safe kills instead of deterministically favoring the
 * highest-ATK one. (An earlier attempt targeted even-trade tolerance
 * instead — abandoned once verification showed "even trades" aren't a
 * reachable code path in this engine's battle math at all; see
 * bot-strategy.ts's class doc.) A future ML-backed policy (or anything
 * else) registers here the same way — BotController and editor()'s
 * wiring never need to change again to add one.
 */
const registry = new Map<string, BotPolicyFactory>([
  [
    "rule-based",
    ({ ygo, playerIndex, legality }) =>
      new BotStrategy(ygo, playerIndex, legality, new ExecutorRegistry()),
  ],
  [
    "data-informed-v1",
    ({ ygo, playerIndex, legality }) =>
      new BotStrategy(ygo, playerIndex, legality, new ExecutorRegistry(), { targetSelection: "random" }),
  ],
]);

export const DEFAULT_BOT_MODEL = "rule-based";

export function getPolicyFactory(model: string = DEFAULT_BOT_MODEL): BotPolicyFactory {
  const factory = registry.get(model);
  if (!factory) {
    throw new Error(`Unknown bot model "${model}". Registered models: ${[...registry.keys()].join(", ")}`);
  }
  return factory;
}
