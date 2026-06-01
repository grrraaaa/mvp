import { describe, expect, it } from "vitest";
import { collectLipBindings } from "./glbCharacter";

describe("collectLipBindings", () => {
  it("collects all lip-related morph targets per mesh", () => {
    const meshes = [
      {
        morphTargetDictionary: {
          JawOpen: 0,
          mouthSmile: 1,
          browInnerUp: 2,
        },
      },
      {
        morphTargetDictionary: {
          viseme_aa: 0,
        },
      },
    ];

    const bindings = collectLipBindings(meshes);
    expect(bindings).toHaveLength(3);
    expect(bindings.map((b) => b.key).sort()).toEqual([
      "JawOpen",
      "mouthSmile",
      "viseme_aa",
    ]);
  });
});
