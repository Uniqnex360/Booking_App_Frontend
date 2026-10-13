import { Capacitor } from "@capacitor/core";
import { getApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { api } from "@/api/client";

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export async function showSystemNotification(
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    const enabled = localStorage.getItem("vyhbz_booking_notifications_enabled");
    if (enabled === "false") return;
  } catch {}

  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") {
      return;
    }

    const reg = await getSwRegistration();
    if (reg && "showNotification" in reg) {
      await reg.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: { link: link || "/profile?tab=orders" },
      });
      return;
    }

    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
    });
    if (link) {
      n.onclick = () => {
        window.focus();
        window.location.href = link;
      };
    }
  } catch {
    // Ignore if blocked by browser policy
  }
}

let isNativeListenerAttached = false;
let lastRegisteredToken: string | null = null;
let isRegistering = false;

export async function registerDevicePushNotifications(): Promise<void> {
  if (typeof window === "undefined" || isRegistering) return;
  isRegistering = true;

  try {
    // 1. Native Android / iOS via Capacitor PushNotifications plugin (if present)
    if (Capacitor.isNativePlatform()) {
      try {
        const plugins = (window as any).Capacitor?.Plugins;
        const PushNotifications = plugins?.PushNotifications;
        if (PushNotifications) {
          const perm = await PushNotifications.requestPermissions();
          if (perm?.receive === "granted") {
            if (!isNativeListenerAttached) {
              isNativeListenerAttached = true;
              PushNotifications.addListener("registration", (token: { value: string }) => {
                if (token?.value && token.value !== lastRegisteredToken) {
                  lastRegisteredToken = token.value;
                  api
                    .post("/notifications/devices", {
                      fcm_token: token.value,
                      platform: Capacitor.getPlatform(),
                    })
                    .catch(() => {});
                }
              });
            }
            await PushNotifications.register();
          }
        }
      } catch {}
      return;
    }

    // 2. React Web App (Browser Notifications + Optional Firebase Web Push FCM)
    if (!("Notification" in window)) return;

    try {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return;

      const reg = await getSwRegistration();
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      const supported = await isSupported().catch(() => false);
      if (!supported) return;

      const messaging = getMessaging(getApp());
      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: reg || undefined,
      });
      if (fcmToken && fcmToken !== lastRegisteredToken) {
        lastRegisteredToken = fcmToken;
        await api
          .post("/notifications/devices", {
            fcm_token: fcmToken,
            platform: "web",
          })
          .catch(() => {});
      }

      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || payload.data?.title;
        const body = payload.notification?.body || payload.data?.body;
        const link = payload.data?.link;
        if (title) {
          showSystemNotification(title, body || "", link);
        }
      });
    } catch {
      // Gracefully fall back to SSE stream if VAPID or browser FCM is unavailable
    }
  } finally {
    isRegistering = false;
  }
}

