import { statusToneClasses, type StatusTone } from "@/lib/status";

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusToneClasses[tone]}`}
    >
      {label}
    </span>
  );
}