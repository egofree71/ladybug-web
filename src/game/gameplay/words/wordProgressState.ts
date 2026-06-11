import { COLLECTIBLE_COLOR, type CollectibleColor, type LetterKind } from '../collectibles/collectibleTypes';

export const WORD_COMPLETION_KIND = {
  none: 'none',
  special: 'special',
  extra: 'extra',
} as const;

export type WordCompletionKind = (typeof WORD_COMPLETION_KIND)[keyof typeof WORD_COMPLETION_KIND];

export interface LetterWordProgressResult {
  readonly changed: boolean;
  readonly completedWord: WordCompletionKind;
}

/**
 * Tracks SPECIAL and EXTRA letter progress.
 *
 * Red letters can progress SPECIAL, yellow letters can progress EXTRA, and blue
 * letters are score-only. This mirrors the rule split in the Godot remake.
 */
export class WordProgressState {
  public static readonly specialWordLetters: readonly LetterKind[] = ['S', 'P', 'E', 'C', 'I', 'A', 'L'];
  public static readonly extraWordLetters: readonly LetterKind[] = ['E', 'X', 'T', 'R', 'A'];

  private readonly specialLetters = new Set<LetterKind>();
  private readonly extraLetters = new Set<LetterKind>();

  public reset(): void {
    this.specialLetters.clear();
    this.extraLetters.clear();
  }

  public resetSpecial(): void {
    this.specialLetters.clear();
  }

  public resetExtra(): void {
    this.extraLetters.clear();
  }

  public isSpecialLetterActive(letter: LetterKind): boolean {
    return this.specialLetters.has(letter);
  }

  public isExtraLetterActive(letter: LetterKind): boolean {
    return this.extraLetters.has(letter);
  }

  public tryApplyLetter(letter: LetterKind | undefined, color: CollectibleColor): LetterWordProgressResult {
    if (letter === undefined) {
      return noChange();
    }

    if (color === COLLECTIBLE_COLOR.red) {
      return this.tryApplySpecialLetter(letter);
    }

    if (color === COLLECTIBLE_COLOR.yellow) {
      return this.tryApplyExtraLetter(letter);
    }

    return noChange();
  }

  private tryApplySpecialLetter(letter: LetterKind): LetterWordProgressResult {
    if (!WordProgressState.specialWordLetters.includes(letter) || this.specialLetters.has(letter)) {
      return noChange();
    }

    this.specialLetters.add(letter);
    return progressed(this.isSpecialComplete() ? WORD_COMPLETION_KIND.special : WORD_COMPLETION_KIND.none);
  }

  private tryApplyExtraLetter(letter: LetterKind): LetterWordProgressResult {
    if (!WordProgressState.extraWordLetters.includes(letter) || this.extraLetters.has(letter)) {
      return noChange();
    }

    this.extraLetters.add(letter);
    return progressed(this.isExtraComplete() ? WORD_COMPLETION_KIND.extra : WORD_COMPLETION_KIND.none);
  }

  private isSpecialComplete(): boolean {
    return WordProgressState.specialWordLetters.every((letter) => this.specialLetters.has(letter));
  }

  private isExtraComplete(): boolean {
    return WordProgressState.extraWordLetters.every((letter) => this.extraLetters.has(letter));
  }
}

function noChange(): LetterWordProgressResult {
  return {
    changed: false,
    completedWord: WORD_COMPLETION_KIND.none,
  };
}

function progressed(completedWord: WordCompletionKind): LetterWordProgressResult {
  return {
    changed: true,
    completedWord,
  };
}
