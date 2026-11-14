// The wire format between cart forms and the cart action. Framework-free.
export const CART_ACTIONS = {
  AttributesUpdateInput: 'AttributesUpdateInput',
  BuyerIdentityUpdate: 'BuyerIdentityUpdate',
  Create: 'Create',
  DiscountCodesUpdate: 'DiscountCodesUpdate',
  GiftCardCodesAdd: 'GiftCardCodesAdd',
  GiftCardCodesRemove: 'GiftCardCodesRemove',
  GiftCardCodesUpdate: 'GiftCardCodesUpdate',
  LinesAdd: 'LinesAdd',
  LinesRemove: 'LinesRemove',
  LinesUpdate: 'LinesUpdate',
  NoteUpdate: 'NoteUpdate',
  SelectedDeliveryOptionsUpdate: 'SelectedDeliveryOptionsUpdate',
  MetafieldsSet: 'MetafieldsSet',
  MetafieldDelete: 'MetafieldDelete',
  DeliveryAddressesAdd: 'DeliveryAddressesAdd',
  DeliveryAddressesUpdate: 'DeliveryAddressesUpdate',
  DeliveryAddressesRemove: 'DeliveryAddressesRemove',
} as const;

export type CartActionName = (typeof CART_ACTIONS)[keyof typeof CART_ACTIONS];

export const CART_FORM_INPUT_NAME = 'cartFormInput';

/** Reads {action, inputs} from a cart form post. Extra form fields join the inputs. */
export function getCartFormInput(formData: FormData): {action: CartActionName | undefined; inputs: Record<string, any>} {
  const data: Record<string, unknown> = {};
  let parsed: {action?: CartActionName; inputs?: Record<string, unknown>} = {};
  for (const [key, value] of formData.entries()) {
    if (key === CART_FORM_INPUT_NAME && typeof value === 'string') {
      try {
        parsed = JSON.parse(value) as typeof parsed;
      } catch {
        parsed = {};
      }
    } else {
      data[key] = value;
    }
  }
  return {action: parsed.action, inputs: {...data, ...(parsed.inputs ?? {})}};
}
