import { api, unwrap } from "@/api/client";
import { loadScript } from "@/utils/loadScript";
import { Capacitor } from "@capacitor/core";
import { Checkout } from "capacitor-razorpay";

export type PayResult =
  | { kind: "PAID"; bookingId: string; refCode?: string }
  | { kind: "NOT_REQUIRED" }
  | { kind: "DISMISSED" };

export async function payForBooking(opts: {
  bookingId: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
  onConfirming?: () => void;
}): Promise<PayResult> {
  // Always create the order fresh on Pay click, so the amount includes food.
  const order = await unwrap<any>(
    api.post("/payments/order", { booking_id: opts.bookingId }),
  );

  if (order?.status === "NOT_REQUIRED") return { kind: "NOT_REQUIRED" };

  // ── Native app: use the Razorpay Android/iOS SDK (avoids WebView restrictions) ──
  if (Capacitor.isNativePlatform()) {
    let r: any = null;
    try {
      const result: any = await Checkout.open({
        key: order.key_id,
        amount: String(order.amount_paise),
        // capacitor-razorpay types only declare {key,amount}; cast to pass full options
        ...({
          order_id: order.order_id,
          currency: order.currency || "INR",
          name: "Vyhbz Cinemas",
          description: opts.description,
          prefill: opts.prefill,
          theme: { color: "#7B1E3D" },
        } as any),
      });
      // result.response contains { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      r = result?.response ?? result;
      opts.onConfirming?.();
      const verified = await unwrap<any>(
        api.post("/payments/verify", {
          booking_id: opts.bookingId,
          razorpay_order_id: r.razorpay_order_id,
          razorpay_payment_id: r.razorpay_payment_id,
          razorpay_signature: r.razorpay_signature,
        }),
      );
      return { kind: "PAID", bookingId: opts.bookingId, refCode: verified?.ref_code };
    } catch (e: any) {
      // Checkout.open() throws when user cancels or payment fails
      console.error("[Razorpay] native payment error", JSON.stringify(e));
      if (e?.code === "PAYMENT_CANCELLED" || e?.message?.toLowerCase().includes("cancel")) {
        return { kind: "DISMISSED" };
      }
      if (r?.razorpay_payment_id) {
        throw { ...e, paymentId: r.razorpay_payment_id, afterPayment: true };
      }
      throw { code: "PAYMENT_FAILED", message: e?.message || "Payment failed.", paymentError: e };
    }
  }

  // ── Web: existing checkout.js path, unchanged ──
  const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!ok) throw { code: "GATEWAY_LOAD", message: "Could not load payment gateway." };

  return new Promise<PayResult>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id,            // from backend, not env
      order_id: order.order_id,
      amount: order.amount_paise,
      currency: order.currency || "INR",
      name: "Vyhbz Cinemas",
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: "#7B1E3D" },
      handler: async (r: any) => {
        opts.onConfirming?.();
        try {
          const verified = await unwrap<any>(
            api.post("/payments/verify", {
              booking_id: opts.bookingId,
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            }),
          );
          resolve({ kind: "PAID", bookingId: opts.bookingId, refCode: verified?.ref_code });
        } catch (e: any) {
          // money may be taken, so keep the payment id for support
          reject({ ...e, paymentId: r.razorpay_payment_id, afterPayment: true });
        }
      },
      modal: {
        backdropclose: false,
        escape: false,
        handleback: true,
        ondismiss: () => resolve({ kind: "DISMISSED" }),
      },
    });
    rzp.on("payment.failed", (r: any) => {
      console.error("[Razorpay] payment.failed", JSON.stringify({
        code: r?.error?.code,
        reason: r?.error?.reason,
        step: r?.error?.step,
        description: r?.error?.description,
        metadata: r?.error?.metadata,
      }));
      reject({ code: "PAYMENT_FAILED", message: r?.error?.description || "Payment failed." });
    });
    rzp.open();
  });
}