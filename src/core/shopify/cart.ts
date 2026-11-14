// Cart service. Framework-free: the host passes how to read and write the cart id.
// Mirrors the Hydrogen cart handler methods the ported routes call.
import type {Storefront} from './storefront';

export type CartLineInput = {merchandiseId: string; quantity?: number; sellingPlanId?: string | null; attributes?: {key: string; value: string}[]};
export type CartLineUpdateInput = {id: string; quantity?: number; merchandiseId?: string; sellingPlanId?: string | null; attributes?: {key: string; value: string}[]};
export type CartUserError = {code?: string | null; field?: string[] | null; message: string};
export type CartWarning = {code: string; message: string; target?: string};
export type CartResult<C> = {cart: C; userErrors?: CartUserError[]; errors?: CartUserError[]; warnings?: CartWarning[]};

export type CartIdStore = {
  get(): string | undefined;
  /** Returns the headers (Set-Cookie) that persist the id. */
  set(id: string): Headers;
};

// Forms send extra fields (e.g. selectedVariant for optimistic UI); the API rejects unknown ones.
function cleanLine<T extends Record<string, unknown>>(line: T) {
  const {merchandiseId, quantity, sellingPlanId, attributes, id, parent} = line as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries({id, merchandiseId, quantity: quantity === undefined ? undefined : Number(quantity), sellingPlanId, attributes, parent}).filter(([, v]) => v !== undefined && v !== null),
  );
}

const USER_ERRORS = `userErrors { code field message }`;
const WARNINGS = `warnings { code message target }`;

function mutation(name: string, args: string, call: string, fragment: string) {
  return `#graphql
    mutation ${name}(${args}, $numCartLines: Int = 100, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      ${call} {
        cart { ...CartApiQuery }
        ${USER_ERRORS}
        ${WARNINGS}
      }
    }
    ${fragment}`;
}

export function createCart<C extends {id: string} = any>({
  storefront,
  fragment,
  cartId,
}: {
  storefront: Storefront;
  /** The CartApiQuery fragment (and the fragments it uses). */
  fragment: string;
  cartId: CartIdStore;
}) {
  async function run(name: string, args: string, call: string, variables: Record<string, unknown>, key: string) {
    const data = (await storefront.mutate(mutation(name, args, call, fragment), {variables})) as Record<string, any>;
    const payload = data?.[key] ?? {};
    const userErrors = (payload.userErrors ?? []) as CartUserError[];
    return {cart: payload.cart as C, userErrors, errors: userErrors, warnings: (payload.warnings ?? []) as CartWarning[]};
  }

  async function create(input: Record<string, unknown>) {
    return run('CartCreate', '$input: CartInput!', 'cartCreate(input: $input)', {input}, 'cartCreate');
  }

  async function withCart<T>(
    ifMissing: () => Promise<CartResult<C>>,
    fn: (id: string) => Promise<CartResult<C>>,
  ) {
    const id = cartId.get();
    return id ? fn(id) : ifMissing();
  }

  return {
    getCartId: async () => cartId.get(),
    setCartId: (id: string) => cartId.set(id),

    async get(): Promise<C | null> {
      const id = cartId.get();
      if (!id) return null;
      const data = (await storefront.query(
        `#graphql
        query CartQuery($cartId: ID!, $numCartLines: Int = 100, $country: CountryCode, $language: LanguageCode)
        @inContext(country: $country, language: $language) {
          cart(id: $cartId) { ...CartApiQuery }
        }
        ${fragment}`,
        {variables: {cartId: id}, cache: storefront.CacheNone()},
      )) as {cart: C | null};
      return data?.cart ?? null;
    },

    create,

    addLines: (input: CartLineInput[]) => {
      const lines = input.map(cleanLine);
      return withCart(
        () => create({lines}),
        (id) => run('CartLinesAdd', '$cartId: ID!, $lines: [CartLineInput!]!', 'cartLinesAdd(cartId: $cartId, lines: $lines)', {cartId: id, lines}, 'cartLinesAdd'),
      );
    },

    updateLines: (input: CartLineUpdateInput[]) => {
      const lines = input.map(cleanLine);
      return withCart(
        () => Promise.reject(new Error('No cart')),
        (id) => run('CartLinesUpdate', '$cartId: ID!, $lines: [CartLineUpdateInput!]!', 'cartLinesUpdate(cartId: $cartId, lines: $lines)', {cartId: id, lines}, 'cartLinesUpdate'),
      );
    },

    removeLines: (lineIds: string[]) =>
      withCart(
        () => Promise.reject(new Error('No cart')),
        (id) => run('CartLinesRemove', '$cartId: ID!, $lineIds: [ID!]!', 'cartLinesRemove(cartId: $cartId, lineIds: $lineIds)', {cartId: id, lineIds}, 'cartLinesRemove'),
      ),

    updateDiscountCodes: (discountCodes: string[]) =>
      withCart(
        () => create({discountCodes}),
        (id) => run('CartDiscountCodesUpdate', '$cartId: ID!, $discountCodes: [String!]', 'cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes)', {cartId: id, discountCodes}, 'cartDiscountCodesUpdate'),
      ),

    addGiftCardCodes: (giftCardCodes: string[]) =>
      withCart(
        () => create({giftCardCodes}),
        (id) => run('CartGiftCardCodesUpdate', '$cartId: ID!, $giftCardCodes: [String!]!', 'cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes)', {cartId: id, giftCardCodes}, 'cartGiftCardCodesUpdate'),
      ),

    removeGiftCardCodes: (appliedGiftCardIds: string[]) =>
      withCart(
        () => Promise.reject(new Error('No cart')),
        (id) => run('CartGiftCardCodesRemove', '$cartId: ID!, $appliedGiftCardIds: [ID!]!', 'cartGiftCardCodesRemove(cartId: $cartId, appliedGiftCardIds: $appliedGiftCardIds)', {cartId: id, appliedGiftCardIds}, 'cartGiftCardCodesRemove'),
      ),

    updateBuyerIdentity: (buyerIdentity: Record<string, unknown>) =>
      withCart(
        () => create({buyerIdentity}),
        (id) => run('CartBuyerIdentityUpdate', '$cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!', 'cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity)', {cartId: id, buyerIdentity}, 'cartBuyerIdentityUpdate'),
      ),

    updateAttributes: (attributes: {key: string; value: string}[], opts: {cartId?: string} = {}) => {
      const id = opts.cartId ?? cartId.get();
      if (!id) return create({attributes});
      return run('CartAttributesUpdate', '$cartId: ID!, $attributes: [AttributeInput!]!', 'cartAttributesUpdate(cartId: $cartId, attributes: $attributes)', {cartId: id, attributes}, 'cartAttributesUpdate');
    },

    replaceDeliveryAddresses: (addresses: unknown[]) =>
      withCart(
        () => create({delivery: {addresses}}),
        (id) => run('CartDeliveryAddressesReplace', '$cartId: ID!, $addresses: [CartSelectableAddressInput!]!', 'cartDeliveryAddressesReplace(cartId: $cartId, addresses: $addresses)', {cartId: id, addresses}, 'cartDeliveryAddressesReplace'),
      ),

    updateSelectedDeliveryOption: (selectedDeliveryOptions: {deliveryGroupId: string; deliveryOptionHandle: string}[]) =>
      withCart(
        () => Promise.reject(new Error('No cart')),
        (id) => run('CartSelectedDeliveryOptionsUpdate', '$cartId: ID!, $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!', 'cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions)', {cartId: id, selectedDeliveryOptions}, 'cartSelectedDeliveryOptionsUpdate'),
      ),

    updateNote: (note: string) =>
      withCart(
        () => create({note}),
        (id) => run('CartNoteUpdate', '$cartId: ID!, $note: String!', 'cartNoteUpdate(cartId: $cartId, note: $note)', {cartId: id, note}, 'cartNoteUpdate'),
      ),
  };
}

export type CartService = ReturnType<typeof createCart>;
