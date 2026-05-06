export const requestNotifPermission = async (): Promise<boolean> => {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
};

export const notify = (title: string, body?: string, tag?: string) => {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, { body, tag, icon: "/favicon.ico", badge: "/favicon.ico" });
  } catch { /* noop */ }
};
