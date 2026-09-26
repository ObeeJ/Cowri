import { ShellIcon } from "~/components/icons";

/**
 * The same low-opacity Cowri mark the footer already uses, scaled up and
 * pinned to the viewport so every screen — marketing and signed-in alike —
 * reads as one paper surface instead of a flat, empty background.
 */
export function BackgroundMark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden"
    >
      <ShellIcon
        size={900}
        className="absolute -right-56 -top-56 text-ink opacity-[0.035]"
      />
      <ShellIcon
        size={520}
        className="absolute -bottom-32 -left-32 text-ink opacity-[0.03]"
      />
    </div>
  );
}
