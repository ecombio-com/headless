// Ported from ($locale).cart.tsx by scripts/split-route.mjs.
import {CartForm, type CartQueryDataReturn} from '~/compat/hydrogen.server';
import {data, type HeadersFunction} from '~/compat/router';
import type {Route} from '~/server/route-types';
import {getStorefrontConfig} from '~/lib/storefront-config';


export const meta: Route.MetaFunction = () => [
  {title: 'Cart'},
  {name: 'robots', content: 'noindex, nofollow'},
];

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;

  // A cart that does not exist yet is created by this action: it gets tagged with its storefront below.
  const hadCart = Boolean(await cart.getCartId());

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const formGiftCardCode = inputs.giftCardCode;

      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      result = await cart.addGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes as string[];
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  // Tag new carts with their storefront so the order shows which brand it came from.
  if (!hadCart && result?.cart?.id) {
    try {
      const {slug} = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID);
      const tagged = await cart.updateAttributes([{key: 'storefront', value: slug}], {
        cartId: result.cart.id,
      });
      if (tagged?.cart) result = {...result, cart: tagged.cart};
    } catch (error) {
      console.error('Could not tag cart with storefront', error);
    }
  }
  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  return await cart.get();
}
