# KetakKetik adaptive engine

The engine provides deterministic training generation, per-key weakness scoring, and progress metadata. The current app imports `engine/src` through the `@ketakketik/engine` alias.

## Usage from the app

```ts
import { AdaptiveEngine } from '@ketakketik/engine';

const engine = new AdaptiveEngine({
  profileId: 'user-123',
  sessionLength: 175,
  weakKeyCount: 3,
});

const session = engine.generateSession({}, [], [], {}, 0);
console.log(session.trainingString); // Space-separated whole English words
console.log(session.weakKeys);
console.log(session.sessionConfig);
console.log(session.progressDelta);

// Another deterministic variation for this profile/date.
const next = engine.generateSession({}, [], [], {}, 1);
```

Arguments are the current key matrix, recent sessions, previous weak keys, previous key matrix, and optional lesson index. Empty performance inputs generate general word practice. The main UI currently supplies empty inputs, so it does not yet personalize practice from saved results.

## Generation and scoring

Words come from `src/wordList.ts`. Generation favors words containing supplied weak keys and preserves complete words while fitting the configured character length, including spaces. Seeds depend on profile ID, UTC date, and lesson index. Use the same date and inputs when testing reproducibility.

Scores combine error rate (45%), latency deviation (30%), recent errors (15%), and volatility (10%). The output also includes target/accuracy metadata and progress comparisons. Some metadata and configuration fields predate word-based generation and are not enforced by the word selector; see the source for exact behavior.

`withConfig()` returns a new engine instance and `getConfig()` returns a configuration copy. Finger drills and custom-file loading are implemented separately in `app/utils`.

## Tests and build status

From the project root:

```sh
npm test -- engine/tests/engine.test.ts
npm run typecheck
npm run build
```

The root install supports these commands. The standalone engine package's build script references `rollup.config.mts`, which is not present; do not treat its published entry paths as ready-to-use build artifacts. The main application does not require that standalone build.

See the [project development guide](../docs/DEVELOPMENT.md) and [build instructions](../docs/BUILDING.md). The [original algorithm design](docs/algorithm-design.md) is historical and describes earlier character-based generation.
