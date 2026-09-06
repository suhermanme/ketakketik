// ============================================================================
// KetakKetik — Curated English Word List for Typing Practice
// ============================================================================
// Common, everyday English words organized by length for bias selection.
// No external dependencies — embedded as a constant array.
// Words are deduplicated and grouped by their actual length below.

// ─────────────────────────────────────────────────────────────────────────────
// Word list by length (1–12 letters)
// ─────────────────────────────────────────────────────────────────────────────

const WORD_GROUPS: Record<number, string[]> = {
  1: ['a', 'i'],
  2: ['an', 'as', 'at', 'be', 'by', 'do', 'he', 'if', 'in', 'is', 'it',
      'me', 'my', 'no', 'on', 'or', 'so', 'to', 'up', 'we'],
  3: [
    'age', 'all', 'and', 'any', 'are', 'bad', 'bag', 'bat', 'big', 'bit',
    'box', 'but', 'can', 'cap', 'cat', 'day', 'did', 'dig', 'dog', 'dry',
    'ear', 'eat', 'end', 'eye', 'fan', 'far', 'fat', 'few', 'fit', 'fix',
    'fly', 'for', 'fun', 'get', 'god', 'got', 'had', 'has', 'hat', 'her',
    'his', 'hit', 'how', 'hub', 'ice', 'ink', 'its', 'job', 'key', 'kid',
    'leg', 'let', 'lid', 'map', 'may', 'men', 'mid', 'mix', 'net', 'new',
    'nod', 'not', 'now', 'off', 'old', 'one', 'our', 'out', 'pan', 'pen',
    'pin', 'put', 'red', 'run', 'set', 'she', 'sit', 'sky', 'son', 'sun',
    'tap', 'tax', 'tea', 'the', 'top', 'toy', 'try', 'use', 'van', 'war',
    'way', 'wet', 'win', 'yes', 'yet', 'you',
  ],
  4: [
    'able', 'ache', 'acid', 'act', 'aged', 'air', 'all', 'also', 'amid',
    'away', 'back', 'bade', 'bake', 'ball', 'band', 'bank', 'bare', 'bark',
    'base', 'bass', 'bath', 'bear', 'beat', 'bed', 'been', 'bell', 'best',
    'bias', 'big', 'bill', 'bind', 'bird', 'bite', 'blue', 'boat', 'body',
    'bold', 'bomb', 'bond', 'bone', 'book', 'boot', 'bore', 'born', 'boss',
    'both', 'bowl', 'busy', 'cage', 'cake', 'call', 'came', 'camp', 'card',
    'care', 'cart', 'case', 'cat', 'cold', 'come', 'cook', 'copy', 'cord',
    'core', 'corn', 'cost', 'cure', 'curl', 'dark', 'data', 'dawn', 'dead',
    'deaf', 'deal', 'dear', 'deep', 'dell', 'deny', 'dial', 'did', 'die',
    'died', 'dies', 'dirt', 'disc', 'dock', 'does', 'done', 'door', 'dose',
    'down', 'drag', 'draw', 'drew', 'drop', 'dual', 'due', 'dusk', 'each',
    'earn', 'ease', 'east', 'easy', 'eat', 'edge', 'else', 'end', 'evil',
    'face', 'fact', 'fair', 'fall', 'farm', 'fast', 'fear', 'feat', 'feed',
    'feel', 'felt', 'file', 'fill', 'film', 'find', 'fine', 'fire', 'fish',
    'five', 'flag', 'flat', 'fled', 'flew', 'flip', 'flow', 'fogy', 'fold',
    'fond', 'food', 'fool', 'foot', 'for', 'fort', 'foul', 'four',
    'free', 'from', 'full', 'fund', 'furl', 'gave', 'gear', 'get', 'girl',
    'give', 'glad', 'glow', 'golf', 'gone', 'good', 'got', 'gown',
    'grab', 'gray', 'grew', 'grid', 'grip', 'grow', 'hand', 'hard', 'has',
    'have', 'hate', 'head', 'heap', 'hear', 'heat', 'held', 'help', 'her',
    'here', 'hero', 'high', 'hill', 'hint', 'his', 'hit', 'hold', 'home',
    'hope', 'host', 'hot', 'hour', 'how', 'huge', 'hung', 'hunt', 'hurt',
    'idea', 'idle', 'inch', 'into', 'iron', 'isle', 'item',
  ],
  5: [
    'about', 'above', 'across', 'after', 'again', 'agent', 'ahead',
    'allow', 'along', 'among', 'anger', 'angry', 'apple', 'area',
    'argue', 'around', 'author', 'away', 'basic', 'basis', 'beach',
    'bear', 'before', 'begin', 'below', 'better', 'beyond', 'black',
    'blood', 'board', 'bought', 'bound', 'brain', 'bring', 'broad',
    'brown', 'build', 'built', 'burn', 'burst', 'buy', 'carry',
    'cause', 'chain', 'change', 'check', 'child', 'class', 'clean',
    'clear', 'close', 'coach', 'could', 'count', 'cover', 'craft',
    'cross', 'crown', 'curve', 'cycle', 'dance', 'daily', 'death',
    'demon', 'desert', 'direct', 'dirt', 'dive', 'doctor', 'door',
    'double', 'dream', 'dress', 'drink', 'drive', 'early', 'earth',
    'edge', 'eight', 'either', 'eleven', 'empty', 'engine', 'equal',
    'event', 'expect', 'family', 'famous', 'father', 'fault', 'field',
    'fight', 'final', 'first', 'flag', 'floor', 'force', 'form',
    'found', 'front', 'garden', 'general', 'girl', 'given', 'glow',
    'govern', 'green', 'grew', 'ground', 'group', 'grow', 'guess',
    'guide', 'hand', 'hard', 'heart', 'heavy', 'help', 'here',
    'hero', 'high', 'hill', 'home', 'honey', 'horse', 'hotel',
    'house', 'human', 'image', 'imply', 'include', 'indeed',
    'involve', 'island', 'issue', 'joint', 'judge', 'keep', 'known',
    'large', 'later', 'laugh', 'learn', 'least', 'left', 'letter',
    'light', 'little', 'live', 'long', 'look', 'lose', 'lost', 'love',
    'major', 'many', 'market', 'master', 'matter', 'mean', 'meet',
    'memory', 'might', 'minor', 'mirror', 'model', 'modern', 'money',
    'month', 'more', 'motor', 'mount', 'move', 'music', 'nature',
    'never', 'night', 'order', 'other', 'ought', 'outer', 'owner',
    'page', 'paint', 'paper', 'part', 'path', 'peace', 'phone',
    'pick', 'place', 'plan', 'plant', 'point', 'power', 'press',
    'price', 'print', 'problem', 'produce', 'proof', 'public', 'pupil',
    'queen', 'quick', 'radio', 'range', 'ready', 'reason', 'record',
    'right', 'river', 'round', 'rule', 'safe', 'same', 'save', 'school',
    'screen', 'search', 'season', 'sense', 'serve', 'seven', 'shall',
    'shape', 'share', 'sheep', 'shift', 'shirt', 'show', 'side', 'sight',
    'sign', 'silent', 'silver', 'since', 'skill', 'sleep', 'slow',
    'small', 'smart', 'snow', 'some', 'song', 'soon', 'sort', 'sound',
    'space', 'speak', 'spend', 'spell', 'stand', 'start', 'stay',
    'still', 'stock', 'stone', 'stop', 'store', 'story', 'study',
    'sudden', 'super', 'table', 'task', 'teach', 'term', 'test', 'than',
    'that', 'the', 'then', 'there', 'these', 'they', 'thing', 'think',
    'those', 'three', 'through', 'throw', 'time', 'title', 'today',
    'together', 'tone', 'trade', 'train', 'travel', 'trust', 'truth',
    'under', 'unity', 'until', 'upper', 'value', 'voice', 'waste',
    'water', 'watch', 'wave', 'white', 'whole', 'woman', 'wonder',
    'world', 'wrote', 'write', 'young', 'zebra',
  ],
};

export const WORDS = [...new Set(Object.values(WORD_GROUPS).flat())];
export const WORDS_BY_LENGTH: Record<number, string[]> = {};
for (const word of WORDS) {
  (WORDS_BY_LENGTH[word.length] ??= []).push(word);
}
