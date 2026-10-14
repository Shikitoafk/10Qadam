# Vocabulary sources and reproducible import

The imported catalogue is `src/data/cefr-words.json`: 7,579 unique headwords with English definitions. It is separate from rated-game banks and original sentence prompts. The study adapter preserves existing definitions/translations by headword and adds ten curated-only entries (7,589 total). It does not fabricate missing Kazakh/Russian translations.

## Sources

- The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies; copyright Tono Laboratory, TUFS. Download: https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv. Research/commercial use is permitted without charge with attribution. Upstream terms are preserved in `public/licenses/CEFR-J-NOTICE.md`.
- Octanove Vocabulary Profile C1/C2 Version 1.0, Octanove Labs. C1 subset only. Download: https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/octanove-vocabulary-profile-c1c2-1.0.csv. CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/.
- WordNet 3.0. Copyright 2006 by Princeton University. All rights reserved. Download: https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz. Full licence/disclaimer is in `public/licenses/WORDNET-LICENSE.txt`.

The adapted catalogue arrangement is CC BY-SA 4.0, retaining underlying source notices. Application code and separately curated content are not relicensed by that notice. The app links to `/vocabulary-sources.html`, licence files and a downloadable catalogue. No affiliation or endorsement is claimed.

## Reproduce

1. Download the files above into ignored `.cache/vocabulary` as `cefrj.csv`, `octanove.csv`, `WordNet-3.0.tar.gz`. Download upstream https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/README.md as `CEFR-README.md`.
2. Extract only `WordNet-3.0/LICENSE` and `WordNet-3.0/dict/{index,data}.{noun,verb,adj,adv}` into the same cache directory. The archive is data: do not execute its installation scripts.
3. Run `node scripts/vocabulary-import.mjs`. It validates CSV headers, parses quoted fields, expands spelling alternatives, matches POS to the first indexed WordNet sense, deduplicates by lowest supported source level and generates the compact JSON plus provenance metadata. It fails if fewer than 5,000 entries survive. Missing meanings are omitted, not invented. Exclusion details stay in the ignored cache.
4. Compare input SHA-256 checksums and counts with `src/data/cefr-metadata.json`. Changing upstream contents should receive a fresh quality/licence review; don't silently publish an update based only on the original URL.
5. Run `npm test` and `npm run build`. Vite also emits `/data/cefr-vocabulary.json` and `/data/cefr-metadata.json` for downloading the exact adaptation.

Initial imported counts: A1 926, A2 1,225, B1 2,120, B2 2,424, C1 884. Study totals including retained curated-only entries: A1 926, A2 1,225, B1 2,121, B2 2,425, C1 892. Import date: 2026-10-14.

## Limitations

Headword bands are not independent assessment of each WordNet sense. Source assignments may differ from other CEFR learning lists. Alternative British/American spellings are separate entries. Only existing validated-by-project RU/KZ translations are retained; new entries show English definitions as an explicit fallback. The previous source banks for ranked A1/A2 matches are unchanged, so all clients in a match still receive server-owned challenges.
