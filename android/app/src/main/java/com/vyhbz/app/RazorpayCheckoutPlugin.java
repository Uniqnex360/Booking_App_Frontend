package com.vyhbz.app;

import android.content.Intent;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.razorpay.Checkout;
import com.razorpay.CheckoutActivity;
import com.razorpay.ExternalWalletListener;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import org.json.JSONObject;

@CapacitorPlugin(name = "Checkout")
public class RazorpayCheckoutPlugin extends Plugin {
    private static final String TAG = "RazorpayCheckout";

    @PluginMethod
    public void open(PluginCall call) {
        call.setKeepAlive(true);
        try {
            JSObject jsObject = call.getData();
            Intent intent = new Intent(getActivity(), CheckoutActivity.class);
            intent.putExtra("OPTIONS", jsObject.toString());
            intent.putExtra("FRAMEWORK", "capacitor");
            startActivityForResult(call, intent, "handleOnActivityResult");
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch Razorpay CheckoutActivity: " + e.getMessage(), e);
            call.reject("Failed to open Razorpay: " + e.getMessage(), "LAUNCH_ERROR");
        }
    }

    @ActivityCallback
    private void handleOnActivityResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            Log.e(TAG, "No PluginCall available in handleOnActivityResult");
            return;
        }

        try {
            Checkout.handleActivityResult(
                getActivity(),
                Checkout.RZP_REQUEST_CODE,
                result.getResultCode(),
                result.getData(),
                new PaymentResultWithDataListener() {
                    @Override
                    public void onPaymentSuccess(String razorpayPaymentId, PaymentData paymentData) {
                        try {
                            JSObject jsObject = new JSObject();
                            if (paymentData != null && paymentData.getData() != null) {
                                jsObject.put("response", paymentData.getData());
                            } else {
                                JSObject fallback = new JSObject();
                                fallback.put("razorpay_payment_id", razorpayPaymentId);
                                jsObject.put("response", fallback);
                            }
                            Log.d(TAG, "Payment success: " + jsObject.toString());
                            call.resolve(jsObject);
                        } catch (Exception e) {
                            Log.e(TAG, "Error formatting success response", e);
                            call.reject("Payment completed but response parsing failed: " + e.getMessage());
                        }
                    }

                    @Override
                    public void onPaymentError(int code, String response, PaymentData paymentData) {
                        try {
                            String errorDescription = (response != null && !response.isEmpty()) ? response : "Payment failed";
                            JSObject errData = new JSObject();
                            errData.put("code", code);

                            if (paymentData != null && paymentData.getData() != null) {
                                JSONObject rawData = paymentData.getData();
                                if (rawData.has("error")) {
                                    try {
                                        JSONObject errObj = rawData.getJSONObject("error");
                                        errorDescription = errObj.optString("description", errorDescription);
                                        errData.put("error", errObj);
                                    } catch (Exception ignored) {
                                    }
                                }
                            }
                            errData.put("description", errorDescription);
                            Log.w(TAG, "Payment error code: " + code + ", response: " + errorDescription);

                            // Code 0 is PAYMENT_CANCELED by user
                            if (code == Checkout.PAYMENT_CANCELED || (errorDescription != null && errorDescription.toLowerCase().contains("cancel"))) {
                                call.reject(errorDescription, "PAYMENT_CANCELLED", errData);
                            } else {
                                call.reject(errorDescription, String.valueOf(code), errData);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error in onPaymentError handler", e);
                            call.reject("Payment failed or was cancelled", String.valueOf(code));
                        }
                    }
                },
                new ExternalWalletListener() {
                    @Override
                    public void onExternalWalletSelected(String s, PaymentData paymentData) {
                        Log.d(TAG, "External wallet selected: " + s);
                        call.reject("External wallet selected: " + s, "EXTERNAL_WALLET");
                    }
                }
            );
        } catch (Exception e) {
            Log.e(TAG, "Error handling activity result in Razorpay", e);
            call.reject("Payment error: " + e.getMessage(), "HANDLE_RESULT_ERROR");
        }
    }
}

