export type EventCallback = ((value: unknown) => void);

export type UnsubscribeCallback = () => void;

export function combineUnsubscribeCallbacks(unsubscribeCallbacks: UnsubscribeCallback[]): UnsubscribeCallback {
  return () => unsubscribeCallbacks.forEach(callback => callback());
}
