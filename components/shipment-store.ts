"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getShipmentSteps,
  normalizeTrackingNumber,
  type PartnerAccount,
  previewAirWaybill,
  previewTrackingNumber,
  type BookingInput,
  type ContactRequest,
  type ContactRequestInput,
  type CustomerUpdate,
  type PaymentRequest,
  type Shipment,
  type ShipmentStatus,
  type ShipmentStoreState,
  type TransferRequestInput
} from "@/lib/shipment-model";

const emptyStore: ShipmentStoreState = {
  shipments: [],
  paymentRequests: [],
  customerUpdates: [],
  contactRequests: [],
  partnerAccounts: [],
  nextSequence: 100001
};

type StoreResponse = ShipmentStoreState & {
  ok: boolean;
};

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

export {
  getShipmentSteps,
  previewAirWaybill,
  previewTrackingNumber
};
export type {
  BookingInput,
  ContactRequest,
  ContactRequestInput,
  CustomerUpdate,
  PaymentRequest,
  PartnerAccount,
  Shipment,
  ShipmentStatus,
  TransferRequestInput
};

export function useShipmentStore() {
  const [store, setStore] = useState<ShipmentStoreState>(emptyStore);
  const [loading, setLoading] = useState(true);

  const refreshStore = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/operations/store", {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        setStore(emptyStore);
        return;
      }

      const result = await readJson<StoreResponse>(response);
      setStore({
        shipments: result.shipments ?? [],
        paymentRequests: result.paymentRequests ?? [],
        customerUpdates: result.customerUpdates ?? [],
        contactRequests: result.contactRequests ?? [],
        partnerAccounts: result.partnerAccounts ?? [],
        nextSequence: result.nextSequence ?? 100001
      });
    } catch {
      setStore(emptyStore);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStore();
  }, [refreshStore]);

  const bookShipment = useCallback(
    async (input: BookingInput) => {
      const response = await fetch("/api/operations/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const result = await readJson<{ ok: boolean; shipment: Shipment }>(response);

      if (!response.ok || !result.ok) {
        throw new Error("Could not create shipment.");
      }

      await refreshStore();
      return result.shipment;
    },
    [refreshStore]
  );

  const submitTransferRequest = useCallback(
    async (input: TransferRequestInput) => {
      const response = await fetch("/api/operations/transfer-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const result = await readJson<{ ok: boolean; paymentRequest: PaymentRequest }>(response);

      if (!response.ok || !result.ok) {
        throw new Error("Could not submit shipment request.");
      }

      await refreshStore();
      return result.paymentRequest;
    },
    [refreshStore]
  );

  const submitContactRequest = useCallback(async (input: ContactRequestInput) => {
    const response = await fetch("/api/contact-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const result = await readJson<{ ok: boolean; contactRequest: ContactRequest }>(response);

    if (!response.ok || !result.ok) {
      throw new Error("Could not submit contact request.");
    }

    return result.contactRequest;
  }, []);

  const lookupShipment = useCallback(async (reference: string) => {
    const normalizedReference = normalizeTrackingNumber(reference);

    if (!normalizedReference) {
      return null;
    }

    const response = await fetch(`/api/operations/shipment/${encodeURIComponent(normalizedReference)}`, {
      method: "GET",
      cache: "no-store"
    });

    if (response.status === 404) {
      return null;
    }

    const result = await readJson<{ ok: boolean; shipment: Shipment }>(response);

    if (!response.ok || !result.ok) {
      throw new Error("Could not fetch shipment.");
    }

    return result.shipment;
  }, []);

  const approvePaymentRequest = useCallback(
    async (requestId: string) => {
      const response = await fetch(`/api/operations/payment-request/${encodeURIComponent(requestId)}/approve`, {
        method: "POST"
      });

      if (response.status === 404) {
        return null;
      }

      const result = await readJson<{ ok: boolean; shipment: Shipment }>(response);
      if (!response.ok || !result.ok) {
        throw new Error("Could not approve payment request.");
      }

      await refreshStore();
      return result.shipment;
    },
    [refreshStore]
  );

  const sendPaymentRequestQuote = useCallback(
    async (requestId: string) => {
      const response = await fetch(`/api/operations/payment-request/${encodeURIComponent(requestId)}/send-quote`, {
        method: "POST"
      });

      const result = await readJson<{ ok: boolean; warning?: string }>(response);

      if (!response.ok) {
        throw new Error("Could not send shipment quote.");
      }

      await refreshStore();
      return result.warning;
    },
    [refreshStore]
  );

  const rejectPaymentRequest = useCallback(
    async (requestId: string, reason = "Payment could not be confirmed. Please contact support.") => {
      const response = await fetch(`/api/operations/payment-request/${encodeURIComponent(requestId)}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error("Could not reject payment request.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  const updateShipmentStatus = useCallback(
    async (ref: string, status: ShipmentStatus) => {
      const response = await fetch(`/api/operations/shipment/${encodeURIComponent(ref)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error("Could not update shipment status.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  const updateShipmentRecord = useCallback(
    async (ref: string, updates: Partial<Shipment>) => {
      const response = await fetch(`/api/operations/shipment/${encodeURIComponent(ref)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error("Could not update shipment.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  const updatePaymentRequest = useCallback(
    async (requestId: string, updates: Partial<PaymentRequest>) => {
      const response = await fetch(`/api/operations/payment-request/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error("Could not update payment request.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  const submitPaymentProof = useCallback(
    async (
      requestId: string,
      input: {
        paymentProofName: string;
        paymentProofType: string;
        paymentProofDataUrl: string;
      }
    ) => {
      const response = await fetch(`/api/operations/payment-request/${encodeURIComponent(requestId)}/submit-proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error("Could not submit payment proof.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  const saveRequestCustomerDetails = useCallback(
    async (
      requestId: string,
      input: {
        customerPhone: string;
        sender: NonNullable<PaymentRequest["details"]>["sender"];
        receiver: NonNullable<PaymentRequest["details"]>["receiver"];
      }
    ) => {
      const response = await fetch(`/api/operations/payment-request/${encodeURIComponent(requestId)}/customer-details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error("Could not save customer request details.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  const approvePartnerAccount = useCallback(
    async (partnerId: string) => {
      const response = await fetch(`/api/auth/partners/${encodeURIComponent(partnerId)}/approve`, {
        method: "POST"
      });

      const result = await readJson<{ ok: boolean; warning?: string }>(response);

      if (!response.ok) {
        throw new Error("Could not approve partner account.");
      }

      await refreshStore();
      return result.warning;
    },
    [refreshStore]
  );

  const updateContactRequest = useCallback(
    async (requestId: string, updates: Partial<ContactRequest>) => {
      const response = await fetch(`/api/operations/contact-request/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error("Could not update contact request.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  const markCustomerUpdateRead = useCallback(
    async (updateId: string) => {
      const response = await fetch(`/api/operations/customer-update/${encodeURIComponent(updateId)}/read`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Could not update customer notification.");
      }

      await refreshStore();
    },
    [refreshStore]
  );

  return {
    shipments: store.shipments,
    paymentRequests: store.paymentRequests,
    customerUpdates: store.customerUpdates,
    contactRequests: store.contactRequests,
    partnerAccounts: store.partnerAccounts,
    nextSequence: store.nextSequence,
    loading,
    refreshStore,
    bookShipment,
    submitTransferRequest,
    submitPaymentProof,
    saveRequestCustomerDetails,
    submitContactRequest,
    approvePaymentRequest,
    sendPaymentRequestQuote,
    approvePartnerAccount,
    rejectPaymentRequest,
    updateShipmentStatus,
    updateShipmentRecord,
    updatePaymentRequest,
    updateContactRequest,
    lookupShipment,
    markCustomerUpdateRead
  };
}
