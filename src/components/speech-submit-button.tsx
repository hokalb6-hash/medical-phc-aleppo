"use client";

import clsx from "clsx";
import { speakActionComplete, speakClinicSaved } from "@/lib/speech";

type SpeechKind = "action" | "clinic";

type SpeechSubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  speech: SpeechKind;
};

export function SpeechSubmitButton({
  speech,
  className,
  onClick,
  type = "submit",
  ...props
}: SpeechSubmitButtonProps) {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (speech === "clinic") {
      speakClinicSaved();
    } else {
      speakActionComplete();
    }
    onClick?.(event);
  }

  return (
    <button
      type={type}
      className={clsx(className)}
      onClick={handleClick}
      {...props}
    />
  );
}
