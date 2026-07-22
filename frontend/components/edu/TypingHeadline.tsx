"use client";

import { useEffect, useRef } from "react";

const WORDS = ["possibilities", "opportunities", "extreme abilities"] as const;
const TYPE_DELAY = 70;
const DELETE_DELAY = 42;
const WORD_PAUSE = 1250;
const NEXT_WORD_PAUSE = 400;

export function TypingHeadline() {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const textNode = textRef.current;
    if (!textNode || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout>;
    let wordIndex = 0;
    let characterIndex = 0;
    let deleting = false;

    const advance = () => {
      const word = WORDS[wordIndex];

      if (!deleting) {
        characterIndex += 1;
        textNode.textContent = word.slice(0, characterIndex);

        if (characterIndex === word.length) {
          deleting = true;
          timer = setTimeout(advance, WORD_PAUSE);
        } else {
          timer = setTimeout(advance, TYPE_DELAY);
        }
        return;
      }

      characterIndex -= 1;
      textNode.textContent = word.slice(0, characterIndex);

      if (characterIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % WORDS.length;
        timer = setTimeout(advance, NEXT_WORD_PAUSE);
      } else {
        timer = setTimeout(advance, DELETE_DELAY);
      }
    };

    textNode.textContent = "";
    timer = setTimeout(advance, NEXT_WORD_PAUSE);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <span className="sr-only">Your future has a world of possibilities.</span>
      <span className="typing-headline" aria-hidden="true">
        <span className="typing-headline-sizer">extreme abilities|</span>
        <span className="typing-headline-live">
          <span ref={textRef}>possibilities</span>
          <span className="typing-cursor">|</span>
        </span>
      </span>
    </>
  );
}
