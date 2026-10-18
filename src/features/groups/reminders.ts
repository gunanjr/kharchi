import * as Notifications from 'expo-notifications';

/** Local reminder ("Ask Ravi for ₹450") N days from now. Returns false if notification permission is missing. */
export async function scheduleReminder(name: string, amountText: string, inDays: number): Promise<boolean> {
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title: `Settle up with ${name}`, body: `${name} still owes you ${amountText}. A gentle nudge?` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(60, inDays * 86400) },
    });
    return true;
  } catch {
    return false;
  }
}
