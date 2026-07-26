import { MERCH_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePost, usePut, useDelete } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

export interface MerchMetric {
  label: string;
  value: string;
  descriptor: string;
  gradient: string;
}

export interface MerchItem {
  id: number;
  title: string;
  detail: string;
  date: string;
  time: string;
  price: string;
  image: string;
}

export interface MerchListResponse {
  metrics: MerchMetric[];
  items: MerchItem[];
}

export interface CreateMerchPayload {
  title: string;
  detail: string;
  date: string;
  time: string;
  price: string;
  image?: string;
}

export type UpdateMerchPayload = Partial<CreateMerchPayload>;

export interface MerchInventoryItem {
  id: number;
  title: string;
  stock: number;
  reserved: number;
}

export interface PriceValidation {
  valid: boolean;
  errors: Record<string, string>;
}

const CURRENCY = 'USD';
const CURRENCY_SYMBOL = '$';

export function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${num.toFixed(2)}`;
}

export function parsePrice(value: string): number {
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned);
}

export function validateMerchPayload(payload: CreateMerchPayload): PriceValidation {
  const errors: Record<string, string> = {};

  if (!payload.title || !payload.title.trim()) {
    errors.title = 'Title is required';
  } else if (payload.title.length > 200) {
    errors.title = 'Title must be 200 characters or fewer';
  }

  if (!payload.detail || !payload.detail.trim()) {
    errors.detail = 'Description is required';
  } else if (payload.detail.length > 2000) {
    errors.detail = 'Description must be 2000 characters or fewer';
  }

  if (!payload.price || !payload.price.toString().trim()) {
    errors.price = 'Price is required';
  } else {
    const priceNum = parsePrice(payload.price.toString());
    if (isNaN(priceNum)) {
      errors.price = 'Price must be a valid number';
    } else if (priceNum < 0) {
      errors.price = 'Price cannot be negative';
    } else if (priceNum > 999999.99) {
      errors.price = 'Price exceeds maximum allowed value';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function updateStock(
  items: MerchInventoryItem[],
  id: number,
  change: number,
): MerchInventoryItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, stock: Math.max(0, item.stock + change) }
      : item,
  );
}

export function reserveStock(
  items: MerchInventoryItem[],
  id: number,
  quantity: number,
): { items: MerchInventoryItem[]; success: boolean } {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return { items, success: false };

  const item = items[idx];
  const available = item.stock - item.reserved;
  if (available < quantity) return { items, success: false };

  const updated = [...items];
  updated[idx] = { ...item, reserved: item.reserved + quantity };
  return { items: updated, success: true };
}

const MERCH_QUERY_KEY = ["merches"];

const useMerchService = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const useGetMerches = () =>
    useGet<MerchListResponse>(MERCH_QUERY_KEY, MERCH_ENDPOINTS.LIST);

  const useCreateMerch = () =>
    usePost<MerchItem, CreateMerchPayload>(MERCH_ENDPOINTS.CREATE, {
      onSuccess: () => handleSuccess("Merch item created!"),
      onError: (error) => handleError(error.message || "Failed to create merch."),
      invalidateQueries: [MERCH_QUERY_KEY],
    });

  const useUpdateMerch = (id: number) =>
    usePut<MerchItem, UpdateMerchPayload>(MERCH_ENDPOINTS.UPDATE(id), {
      onSuccess: () => handleSuccess("Merch item updated!"),
      onError: (error) => handleError(error.message || "Failed to update merch."),
      invalidateQueries: [MERCH_QUERY_KEY],
    });

  const useDeleteMerch = (id: number) =>
    useDelete<void>(MERCH_ENDPOINTS.DELETE(id), {
      onSuccess: () => handleSuccess("Merch item deleted."),
      onError: (error) => handleError(error.message || "Failed to delete merch."),
      invalidateQueries: [MERCH_QUERY_KEY],
    });

  return { useGetMerches, useCreateMerch, useUpdateMerch, useDeleteMerch };
};

export default useMerchService;
