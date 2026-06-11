"use client";

import { speakSignOutGoodbye } from "@/lib/speech";

type SignOutFormProps = {
  action: () => void | Promise<void>;
};

export function SignOutForm({ action }: SignOutFormProps) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        onClick={() => speakSignOutGoodbye()}
      >
        تسجيل خروج
      </button>
    </form>
  );
} 
           