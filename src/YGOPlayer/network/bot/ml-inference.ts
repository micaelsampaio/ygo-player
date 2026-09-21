/**
 * Lazily-loaded ONNX inference for the "ml-v1" bot policy. `onnxruntime-web`
 * ships a ~27MB wasm runtime — this module is only ever reached via a
 * dynamic `import()` from ml-policy code paths, never imported statically,
 * so that runtime never lands in the main bundle for players who don't
 * pick the trained bot behavior.
 *
 * Model: ygo-analyser/model_training/train_target_selection.py, trained on
 * 419 real replay-derived decisions (68.5% 5-fold CV accuracy vs. ~54%
 * baseline). Input tensor name "X", shape [1, 13]; outputs "label"
 * (int64 0/1) and "probabilities" ([1,2] float32) — confirmed via
 * `onnxruntime.InferenceSession.get_inputs()/get_outputs()` against the
 * exported .onnx file, not guessed.
 */
const sessions = new Map<string, Promise<any>>();

async function getSession(modelUrl: string) {
  let sessionPromise = sessions.get(modelUrl);
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web");
      const response = await fetch(modelUrl);
      const buffer = await response.arrayBuffer();
      return ort.InferenceSession.create(new Uint8Array(buffer));
    })();
    sessions.set(modelUrl, sessionPromise);
  }
  return sessionPromise;
}

/**
 * Feature order (must match train_target_selection.py's FEATURE_NAMES
 * exactly): [attacker_atk, attacker_def, attacker_level, targets_max_atk,
 * targets_min_atk, targets_mean_atk, targets_max_def, target_count, turn,
 * lp_attacker, lp_defender, hand_attacker, hand_defender]
 *
 * Returns true if the model predicts "attack the highest-ATK available
 * target", false for "not the highest" (i.e. pick the lowest, matching
 * the binary label train_target_selection.py trained on).
 */
export async function predictHighestAtk(modelUrl: string, features: number[]): Promise<boolean> {
  const ort = await import("onnxruntime-web");
  const session = await getSession(modelUrl);
  const tensor = new ort.Tensor("float32", Float32Array.from(features), [1, features.length]);
  const results = await session.run({ X: tensor });
  const label = results.label.data[0];
  return Number(label) === 1;
}
