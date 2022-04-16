export type EventCallback = ((value: unknown) => void);

export type UnsubscribeCallback = () => void;

export function buildUnsubscribeCallback(callbacks: UnsubscribeCallback[]): UnsubscribeCallback {
  return () => callbacks.forEach(callback => callback());
}
