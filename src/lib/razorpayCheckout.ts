import { api, unwrap } from "@/api/client";
import { loadScript } from "@/utils/loadScript";

export type PayResult =
  | { kind: "PAID"; bookingId: string }
  | { kind: "NOT_REQUIRED" }
  | { kind: "DISMISSED" };

export async function payForBooking(opts: {
  bookingId: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
}): Promise<PayResult> {
  // Always create the order fresh on Pay click, so the amount includes food.
  const order = await unwrap<any>(
    api.post("/payments/order", { booking_id: opts.bookingId }),
  );

  if (order?.status === "NOT_REQUIRED") return { kind: "NOT_REQUIRED" };

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
        try {
          await unwrap<any>(
            api.post("/payments/verify", {
              booking_id: opts.bookingId,
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            }),
          );
          resolve({ kind: "PAID", bookingId: opts.bookingId });
        } catch (e: any) {
          // money may be taken, so keep the payment id for support
          reject({ ...e, paymentId: r.razorpay_payment_id, afterPayment: true });
        }
      },
      modal: { ondismiss: () => resolve({ kind: "DISMISSED" }) },
    });
    rzp.on("payment.failed", (r: any) =>
      reject({ code: "PAYMENT_FAILED", message: r?.error?.description || "Payment failed." }),
    );
    rzp.open();
  });
}