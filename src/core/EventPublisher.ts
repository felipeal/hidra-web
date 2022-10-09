import { EventCallback, UnsubscribeCallback } from "./utils/EventUtils";

export abstract class EventPublisher {

  private eventSubscriptions: Record<string, EventCallback[]> = {};

  // Returns unsubscribe callback
  public subscribeToEvent(event: string, callback: EventCallback): UnsubscribeCallback {
    this.eventSubscriptions[event] = this.eventSubscriptions[event] ?? [];
    this.eventSubscriptions[event].push(callback);
    return () => this.eventSubscriptions[event] = this.eventSubscriptions[event].filter((f) => f !== callback);
  }

  protected publishEvent(event: string, value: unknown): void {
    if (this.isPublishQueueOn) {
      this.publishQueue[event] = (): void => this.eventSubscriptions[event]?.forEach(callback => callback(value));
    } else {
      this.eventSubscriptions[event]?.forEach(callback => callback(value));
    }
  }

  //////////////////////////////////////////////////
  // Publish Queue
  //////////////////////////////////////////////////

  private isPublishQueueOn = false;
  private publishQueue: Record<string, () => void> = {};

  public beginPublishQueue(): void {
    this.isPublishQueueOn = true;
  }

  public firePublishQueue(): void {
    Object.values(this.publishQueue).forEach(publish => publish());
    this.publishQueue = {};
    this.isPublishQueueOn = false;
  }

}
