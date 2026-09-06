# KetakKetik — Adaptive Learning Engine

> Historical design specification. Some planned behavior differs from the implemented app. See the [current development guide](../../docs/DEVELOPMENT.md) and source for current behavior.

## Algorithm Design Document

### Overview

The Adaptive Learning Engine is a **stateless deterministic algorithm** that identifies a user's weakest keys and generates procedurally customized training strings. It runs both in-browser and in Electron with zero internal state mutation.

---

## 1. Mathematical Formulation

### 1.1 Weighted Weakness Score

For each key `k`, compute:

```
weaknessScore(k) = w_error * errorRate(k)
                 + w_latency * latencyDeviation(k)
                 + w_recency * recencyWeight(k)
                 + w_volatility * volatility(k)
```

Where weights sum to 1.0:

| Component | Weight | Formula |
|-----------|--------|---------|
| Error Rate | 0.45 | `errorCount / totalPresses` |
| Latency Deviation | 0.30 | `(avgDownstroke + avgUpstroke) / 2 - globalMeanLatency) / globalMeanLatency` |
| Recency Factor | 0.15 | `recentErrorRate * 2.0` (last 5 sessions) |
| Volatility | 0.10 | `stdDev(per-session accuracy) / mean(per-session accuracy)` |

### 1.2 Recency Weighting

Keys with errors in the last 5 sessions receive a **2× multiplier** on their recency component:

```
recencyWeight(k) = recentErrorRate(k) * (1.0 + 1.0 * hasRecentErrors(k))
```

Where `hasRecentErrors(k)` = 1 if the key had ≥1 error in last 5 sessions, else 0.

### 1.3 Volatility (Coefficient of Variation)

```
volatility(k) = σ(per-session accuracy for key k) / μ(per-session accuracy for key k)
```

Higher volatility = less consistent performance = higher weakness indicator.

### 1.4 Normalization

Scores are normalized to [0, 1] using min-max scaling across all keys:

```
normalizedScore(k) = (rawScore(k) - minScore) / (maxScore - minScore)
```

---

## 2. Training String Generation

### 2.1 Frequency Proportionality

The top 3 weakest keys are included at frequency proportional to their weakness score:

```
frequency(k) = weaknessScore(k) / Σ(weaknessScore for top 3)
```

### 2.2 Contextual Expansion

For each weak key `w`, generate bigrams and trigrams:

```
bigrams(w) = {w + chr(i) for i in alphabet} ∪ {chr(i) + w for i in alphabet}
trigrams(w) = {bigram + chr(j) for bigram in bigrams(w), j in alphabet} ∪ {chr(j) + bigram for j in alphabet}
```

### 2.3 Constraints

1. **No key > 80th percentile frequency** for strongest keys
2. **Max 3 consecutive identical keys**
3. **Natural English distribution** for the remaining 40% of characters
4. **Deterministic output** via seeded PRNG

### 2.4 Seeded PRNG

Uses a mulberry-like seeded PRNG (no external deps):

```
seed = hash(profileID + dateISO)
state = seed
next() { state = (state * 1103515245 + 12345) % 2^31; return state }
random() = next() / 2^31
```

---

## 3. Progress Delta Calculation

Compares current weak keys to previous session's weak keys:

```
improvedKeys   = currentWeakKeys ∩ previousStrongKeys
worsenedKeys   = previousWeakKeys ∩ currentStrongKeys
overallTrend   = f(improvedKeys, worsenedKeys)
```

---

## 4. Algorithm Flow

```
┌──────────────┐     ┌───────────────┐     ┌───────────────┐
│  KeyMatrix   │────▶│  Compute      │────▶│  Normalize    │
│  LatencyLog  │     │  Raw Scores   │     │  Scores       │
│  Sessions    │────▶│               │     │               │
└──────────────┘     └───────────────┘     └───────┎──────┘
                                                       │
                                                       ▼
┌──────────────┐     ┌───────────────┐     ┌───────────────┐
│ Training     │◀────│  Generate     │◀────│  Select Top 3 │
│ String       │     │  Strings      │     │  Weak Keys    │
└──────────────┘     └───────────────┘     └───────────────┘
                                                       │
                                                       ▼
┌──────────────┐     ┌───────────────┐     ┌───────────────┐
│ Session      │◀────│  Calculate    │◀────│  Compare to   │
│ Config       │     │  Progress     │     │  Previous     │
└──────────────┘     └───────────────┘     └───────────────┘
                                                       │
                                                       ▼
                                              ┌───────────────┐
                                              │  Return       │
                                              │  TrainingSession │
                                              └───────────────┘
```

---

## 5. Pseudocode

```
FUNCTION computeWeaknessScores(keyMatrix, latencyLog, recentSessions):
    globalMeanLatency = mean of all keys' average latencies
    
    FOR EACH key in keyMatrix:
        // Error rate component (0-1)
        errorRate = keyMatrix[key].errorCount / keyMatrix[key].totalPresses
        
        // Latency deviation component
        avgLatency = (keyMatrix[key].avgDownstrokeMs + keyMatrix[key].avgUpstrokeMs) / 2
        latencyDeviation = abs(avgLatency - globalMeanLatency) / globalMeanLatency
        
        // Recency component
        recentErrors = count errors in last 5 sessions for this key
        recentTotal = count total presses in last 5 sessions for this key
        recentErrorRate = recentErrors / recentTotal
        recencyWeight = recentErrorRate * 2.0  // 2x if has recent errors
        
        // Volatility component
        sessionAccuracies = get per-session accuracy for this key from recentSessions
        volatility = stdDev(sessionAccuracies) / mean(sessionAccuracies)
        
        // Weighted sum
        rawScore = (0.45 * errorRate) + (0.30 * latencyDeviation) +
                   (0.15 * recencyWeight) + (0.10 * volatility)
        
        scores[key] = rawScore
    
    // Normalize to [0, 1]
    minScore = min(scores)
    maxScore = max(scores)
    range = maxScore - minScore
    
    FOR EACH key:
        if range > 0:
            normalizedScores[key] = (scores[key] - minScore) / range
        else:
            normalizedScores[key] = 0
    
    RETURN normalizedScores

FUNCTION generateTrainingString(normalizedScores, weakKeys, userConfig):
    seed = hash(userConfig.profileID + currentDateString)
    prng = new SeededPRNG(seed)
    
    // Calculate target frequencies for weak keys
    totalScore = sum(weakKey.score for weakKey in weakKeys)
    weakKeyProportion = 0.60  // 60% of string focused on weak keys
    
    string = []
    remainingLength = userConfig.sessionLength
    
    // Phase 1: Place weak keys proportionally
    FOR EACH weakKey in weakKeys:
        count = round(remainingLength * weakKeyProportion * weakKey.score / totalScore)
        append weakKey.key repeated 'count' times to string
        
    // Phase 2: Add contextual bigrams/trigrams
    bigrams = generateBigrams(weakKeys)
    trigrams = generateTrigrams(weakKeys)
    
    contextualProportion = 0.40  // 40% of remaining
    contextualCount = round(remainingLength * contextualProportion)
    
    FOR i from 0 to contextualCount:
        if prng.random() < 0.3:
            append random trigram from trigrams
        else:
            append random bigram from bigrams
        
        // Enforce no > 3 consecutive same key
        enforceMaxConsecutive(string, 3)
    
    // Phase 3: Fill remaining with English-like distribution
    englishChars = "etaoinshrdclfmtguypbakwvqjxz"
    fillCount = remainingLength - length(string)
    
    FOR i from 0 to fillCount:
        charIndex = prng.random() % length(englishChars)
        append englishChars[charIndex] to string
        enforceMaxConsecutive(string, 3)
    
    RETURN join(string)

FUNCTION calculateProgressDelta(currentWeakKeys, previousWeakKeys):
    improved = currentWeakKeys ∩ keys that were strong before
    worsened = previousWeakKeys ∩ keys that are strong now
    
    IF improved.length > worsened.length:
        trend = "improving"
    ELSE IF worsened.length > improved.length:
        trend = "declining"
    ELSE:
        trend = "stagnant"
    
    RETURN {improved, worsened, trend}
```

---

## 6. Edge Case Handling

| Edge Case | Handling |
|-----------|----------|
| Zero presses on a key | errorRate = 0, latency = 0, volatility = 0 |
| All keys at 100% accuracy | Use latency as primary differentiator |
| Single session data | Skip recency/volatility, use raw error rate |
| All keys have same score | Fall back to alphabetical order |
| Fewer than 3 keys with data | Return available keys only |

---

## 7. Performance Targets

- **Computation time**: < 5ms for 45+ keys
- **Memory**: O(n) where n = number of keys
- **No allocations** in hot path beyond result objects

---

## 8. Determinism Guarantees

1. Same inputs → same outputs (seeded PRNG based on profileID + date)
2. No floating-point nondeterminism (consistent math operations order)
3. No dependency on current time except for date in seed
4. No dependency on locale or environment
