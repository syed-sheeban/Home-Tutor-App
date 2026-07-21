import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import RazorpayCheckout from "react-native-razorpay";

import api from "./api";

const paymentApi = {
  createOrder: async (bookingId) => {
    const response = await api.post("/payments/create-order", { bookingId });
    return response.data;
  },

  verify: async (payload) => {
    const response = await api.post("/payments/verify", payload);
    return response.data;
  },

  markFailed: async (razorpayOrderId, reason) => {
    const response = await api.post("/payments/failed", {
      razorpay_order_id: razorpayOrderId,
      reason,
    });
    return response.data;
  },

  history: async (params = {}) => {
    const response = await api.get("/payments/history", { params });
    return response.data;
  },

  receipt: async (paymentId) => {
    const response = await api.get(`/payments/${paymentId}/receipt`, {
      responseType: "text",
      transformResponse: [(data) => data],
    });
    return response.data;
  },
};

export const walletApi = {
  get: async () => {
    const response = await api.get("/wallet");
    return response.data;
  },

  transactions: async (params = {}) => {
    const response = await api.get("/wallet/transactions", { params });
    return response.data;
  },

  withdraw: async (payload) => {
    const response = await api.post("/wallet/withdraw", payload);
    return response.data;
  },

  withdrawals: async (params = {}) => {
    const response = await api.get("/wallet/withdrawals", { params });
    return response.data;
  },
};

export const adminPaymentApi = {
  dashboard: async (params = {}) => {
    const response = await api.get("/admin/payments/dashboard", { params });
    return response.data;
  },

  payments: async (params = {}) => {
    const response = await api.get("/admin/payments", { params });
    return response.data;
  },

  withdrawals: async (params = {}) => {
    const response = await api.get("/admin/withdrawals", { params });
    return response.data;
  },

  walletTransactions: async (params = {}) => {
    const response = await api.get("/admin/wallet-transactions", { params });
    return response.data;
  },

  approveWithdrawal: async (id, adminRemarks = "") => {
    const response = await api.put(`/admin/withdraw/${id}/approve`, {
      adminRemarks,
    });
    return response.data;
  },

  rejectWithdrawal: async (id, adminRemarks = "") => {
    const response = await api.put(`/admin/withdraw/${id}/reject`, {
      adminRemarks,
    });
    return response.data;
  },
};

const getCheckoutErrorMessage = (error) =>
  error?.description ||
  error?.error?.description ||
  error?.message ||
  "The payment could not be completed.";

export async function startNativeCheckout(bookingId) {
  const checkout = await paymentApi.createOrder(bookingId);

  try {
    const response = await RazorpayCheckout.open({
      key: checkout.keyId,
      amount: checkout.order.amount,
      currency: checkout.order.currency,
      name: "HomeTutor",
      description: `${checkout.booking.subject} with ${checkout.booking.tutorName || "your tutor"}`,
      order_id: checkout.order.id,
      prefill: {
        name: checkout.prefill?.name || "",
        email: checkout.prefill?.email || "",
      },
      notes: {
        bookingId: String(bookingId),
        receiptNumber: checkout.payment.receiptNumber,
      },
      theme: { color: "#0f766e" },
    });

    return paymentApi.verify({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    });
  } catch (error) {
    const reason = getCheckoutErrorMessage(error);
    try {
      await paymentApi.markFailed(checkout.order.id, reason);
    } catch {
      // The webhook remains the source of truth if this best-effort call fails.
    }

    const checkoutError = new Error(reason);
    checkoutError.isCancelled =
      Number(error?.code) === 0 ||
      /cancel|dismiss|closed/i.test(reason);
    throw checkoutError;
  }
}

export async function sharePaymentReceipt(paymentId, receiptNumber) {
  const html = await paymentApi.receipt(paymentId);
  const result = await Print.printToFileAsync({ html: String(html) });
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("Receipt sharing is unavailable on this device.");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: `Share receipt ${receiptNumber || ""}`.trim(),
    UTI: "com.adobe.pdf",
  });

  return result.uri;
}

export { paymentApi };
export default paymentApi;
