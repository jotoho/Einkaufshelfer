// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

const DEFAULT_DURATION = 5_000;

export const showToast = async (
  notificationText: string,
  duration: number = DEFAULT_DURATION,
): Promise<HTMLElement> => {
  document.querySelector("#toast")?.remove?.();
  const newToast = document.createElement("div");
  newToast.id = "toast";
  newToast.innerText = notificationText;
  document.children[0].appendChild(newToast);
  if (!Number.isFinite(duration) || duration < 0) {
    duration = DEFAULT_DURATION;
  }
  setTimeout(() => newToast.remove(), duration);
  return newToast;
};
