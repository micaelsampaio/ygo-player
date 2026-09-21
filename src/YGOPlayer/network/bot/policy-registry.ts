import { BotStrategy } from "./bot-strategy";
import { ExecutorRegistry } from "./executors/index";
import { BotPolicyFactory } from "./bot-policy";

/**
 * name -> BotPolicyFactory lookup, mirroring ExecutorRegistry's pattern.
 * "rule-based" is today's (only) behavior. A future ML-backed policy (or
 * anything else) registers here under its own name — BotController and
 * editor()'s wiring never need to change again to add one.
 */
const registry = new Map<string, BotPolicyFactory>([
  [
    "rule-based",
    ({ ygo, playerIndex, legality }) =>
      new BotStrategy(ygo, playerIndex, legality, new ExecutorRegistry()),
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
