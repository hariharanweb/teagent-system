# teagent

A study companion for kids reading Hindi/Kannada textbook chapters: photographed pages become line-by-line English translations, a glossary, a lesson plan, and a spoken Narration.

## Language

### Chapters

**Chapter**:
One textbook lesson made of up to 15 photographed Pages; it lives only in the user's browser and their saved chapter file.
_Avoid_: Lesson, document

**Page**:
One photographed textbook page and the Translation lines extracted from it.
_Avoid_: Image, upload

**Section**:
A visually distinct part of a Page — the title, a boxed panel, or the body text — that its Translation lines are grouped under.
_Avoid_: Block, region

**Translation line**:
One sentence of original-language text with its word-by-word gloss and its English meaning.
_Avoid_: Row, sentence

### Narration

**Narration**:
The spoken reading of a Chapter's original-language text in a teacher's voice, made of one Page narration per Page.
_Avoid_: Audio, TTS, read-aloud

**Page narration**:
The Narration of a single Page; Pages are narrated independently, so adding Pages narrates only the new ones.

**Narration file**:
The downloadable MP3 of a Narration that also carries its Word timings, so it can be reopened later without generating it again.
_Avoid_: Audio file, recording

**Word timing**:
When a word starts and ends in a Narration — exact at the edges of each Translation line, estimated for words inside it.
_Avoid_: Timestamp, cue

**Page fingerprint**:
An identifier of a Page's exact original text, used to tell whether a Page narration still matches that Page.
