import { Injectable, signal, computed } from '@angular/core';

export type NotifType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  type: NotifType;
  time: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  readonly notifications = signal<AppNotification[]>([]);

  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  push(message: string, type: NotifType = 'info') {
    const notif: AppNotification = {
      id: Date.now().toString(),
      message,
      type,
      time: new Date(),
      read: false,
    };
    this.notifications.update(prev => [notif, ...prev].slice(0, 20));
  }

  markAllRead() {
    this.notifications.update(prev => prev.map(n => ({ ...n, read: true })));
  }

  clear() {
    this.notifications.set([]);
  }
}
