"use client";

import { speakDeleteWarning } from "@/lib/speech";

type DeleteConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  idFieldName: string;
  entityId: string;
  entityName: string;
  confirmMessage: string;
};

export function DeleteConfirmForm({
  action,
  idFieldName,
  entityId,
  entityName,
  confirmMessage,
}: DeleteConfirmFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const message = confirmMessage.replace("{name}", entityName);
        if (!confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name={idFieldName} value={entityId} />
      <button
        type="submit"
        className="btn-danger"
        onClick={() => speakDeleteWarning()}
      >
        حذف
      </button>
    </form>
  );
}
