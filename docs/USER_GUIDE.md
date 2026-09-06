# User guide

[Back to README](../README.md)

## Start typing

1. Choose a mode beneath the theme buttons in the sticky header.
2. In Lessons, select a drill; in Custom text, load a file.
3. Click the training text and type the highlighted character. The timer starts with the first character press.
4. Continue through the spaces and characters until completion.

The virtual keyboard shows pressed keys in blue and mistakes in red. Amber keys indicate the selected lesson's target keys. Space is part of the drill. Modifier shortcuts and auto-repeated keydown events are ignored by the typing handler. A wrong character registers an error without advancing the cursor; Backspace moves back through an unfinished session.

Text is matched without case sensitivity: uppercase and lowercase forms of a letter are accepted interchangeably. Shift accuracy is therefore not trained. Completion stops the session; choose a restart or new lesson to continue.

## Modes

### Practice

Practice generates whole English words separated by spaces. These are word lists, not grammatical sentences or passages. The default target is 175 characters, including spaces. New lesson generates another variation; Restart session repeats the current text with fresh metrics.

The underlying engine can select words containing weak keys when supplied with performance data. The current UI passes empty performance history, so it does not yet adapt future lessons to your accumulated results.

### Lessons

There are 60 paired-key drills plus four combined-row drills. The paired-key progression follows this order:

| Pair | Intended movement |
| --- | --- |
| F / J | Index fingers |
| D / K | Middle fingers |
| S / L | Ring fingers |
| A / ; | Little fingers |
| G / H | Index-finger home-row reaches |
| R / U | Index fingers, upper row |
| E / I | Middle fingers, upper row |
| W / O | Ring fingers, upper row |
| Q / P | Little fingers, upper row |
| T / Y | Index-finger upper-row reaches |
| V / M | Index fingers, lower row |
| C / , | Middle fingers, lower row |
| X / . | Ring fingers, lower row |
| Z / ' | Little fingers |
| B / N | Index-finger lower-row reaches |

Each pair has four stages:

1. Single keys, such as `f f f j j j`.
2. Repeated pairs, such as `ff jj ff jj`.
3. Alternation, such as `fj jf fjf jfj ffj jjf`.
4. Mixed groups of two to five characters.

Combined home-row, upper-row, lower-row, and all-row drills use groups of two to seven characters. Spaces train thumb use. Coverage refers to the displayed simplified keyboard; number keys, Shift combinations, and the complete physical keyboard are not included.

Choose any drill from the selector. After completing a drill, **Next lesson** advances to the next one. Advancement is manual and has no accuracy threshold or locked levels. No Next lesson button is shown after the last drill. Selected lesson and progress are not saved across reloads.

### Custom text

Select **Custom text**, then **Load text file**. Choose a `.txt` file encoded as UTF-8.

- Maximum file size: 1 MB (1,048,576 bytes).
- Maximum normalized text length: 20,000 JavaScript string characters.
- Blank files, detected binary/control content, invalid replacement characters, and unsupported extensions are rejected with an inline error.
- A leading byte-order mark is removed. Line breaks, tabs, and repeated whitespace become single spaces; outer whitespace is trimmed.
- Punctuation and letter case remain visible. Matching is still case-insensitive.
- Reading happens locally through the file API. The app does not upload the file.

The filename is displayed after a successful load. A failed load leaves the previous valid text in place. Restart session repeats the loaded text; Load text file lets you replace it. Reloading the application clears the custom text.

Use ordinary keyboard-typeable text. The current typing model is not designed for emoji, composed grapheme clusters, or IME composition.

## Session controls

Desktop controls are at the top of the right-hand Session panel. Compact controls are available below the training area on smaller screens.

| Control | Result |
| --- | --- |
| Restart session | Clears metrics and graph; keeps the current text |
| New lesson | Generates a new Practice variation or another drill in the selected lesson |
| Next lesson | Advances after completing a Lessons drill |
| Load text file | Opens the file picker in Custom text mode |
| Mode/lesson selector | Changes the training source and resets the current session |

Restarting or changing text discards the current result. Completion plays a short rising chime and shows confetti for approximately three seconds. Mistakes use a separate descending cue. Reduced-motion preferences suppress confetti.

## WPM and metrics

WPM uses five characters per word. Current WPM is calculated from cursor progress over elapsed time; the first second is clamped to avoid a very large opening spike. It is a session-average rate, not a rolling last-five-seconds measurement. Average WPM currently uses the same calculation.

The graph records roughly one sample per second and updates between keystrokes, so pauses lower the displayed rate. It retains the completed session until reset. Peak WPM records the highest rate reached on a correct keypress.

Accuracy is correct keystrokes divided by correct plus incorrect keystrokes. Retyping after Backspace counts as additional keystrokes, while cursor progress tracks the current text position. The progress bar uses cursor position divided by the actual lesson length. Duration is elapsed time since the first character press.

## Audio and themes

Choose Clicky, Tactile, or Linear to change the ordinary keyboard sound. Volume controls keystrokes, mistakes, and completion sounds together. Zero volume mutes all of them. Browser audio initializes through typing; click the training area and press a character if it is silent. Audio preferences currently reset on reload.

The sun selects Light, the moon selects Dark, and the system button follows the operating-system color preference. Theme choice persists locally; System mode responds to subsequent OS changes.

## Profiles and local data

Use the profile dropdown to create, select, or delete a local profile. At least one profile is retained. Profiles and the active selection are stored through local storage when updated. A freshly generated default profile may not be saved until a profile operation occurs.

Storage keys are `ketakketik-profiles`, `ketakketik-active-profile`, and `ketakketik-theme-mode`. Storage belongs to the browser origin or Electron user-data context. Changing browser ports, switching between browser and desktop, or clearing site data can produce a different local profile set. Older branding's storage is not automatically migrated.

A separate IndexedDB persistence layer exists in the source, but it is not connected to the current session hook. Do not expect historical results, cloud backup, or adaptive progression to survive a reload.
