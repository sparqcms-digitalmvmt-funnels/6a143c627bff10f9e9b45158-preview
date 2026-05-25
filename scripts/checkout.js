

// Chnage the maxLength attribute for the CVV input field based on the credit card type
document.addEventListener('DOMContentLoaded', async () => {
  const cardTypes = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
  };

  function getCardType(number) {
    for (const type in cardTypes) {
      if (cardTypes[type].test(number)) {
        return type;
      }
    }
    return null;
  }

  const cardNumberInput = document.querySelector('[data-card-number]');
  const cvvInput = document.querySelector('[data-card-cvv]');

  if (!cardNumberInput || !cvvInput) {
    return;
  }

  cardNumberInput.addEventListener("beforeinput", (e) => {
    if (typeof e.data === "string" && /\D/.test(e.data)) {
      e.preventDefault();
    }
  });
  cardNumberInput.addEventListener("input", () => {
    const cardType = getCardType(cardNumberInput.value.replace(/s+/g, ""));
    const newMaxLength = cardType === "amex" ? 4 : 3;
    cvvInput.maxLength = newMaxLength;
    if (cvvInput.value.length > newMaxLength) {
      cvvInput.value = cvvInput.value.slice(0, newMaxLength);
    }
  });
  cvvInput.addEventListener("input", () => {
    const maxLength = cvvInput.maxLength || 4;
    const digits = String(cvvInput.value || "")
      .replace(/\D+/g, "")
      .slice(0, maxLength);
    if (digits !== cvvInput.value) cvvInput.value = digits;
  });
});

const KLAVIYO_PUBLIC_API_KEY = 'XdCWtk';

const EMAIL_OVERSIGHT_VALIDATE_URL = 'https://app-cms-api-proxy-staging-001.azurewebsites.net/integration/email-oversight/validate-public';


const CHECKOUT_NEXT_PAGE_SLUG = "upsell";

function getNextPageSlugForRedirect() {
  const normalize = (value) => {
    if (!value) return "";
    return value.startsWith("/6a143c627bff10f9e9b45158-preview") ? value : (value.startsWith("/") ? "/6a143c627bff10f9e9b45158-preview" + value : "/6a143c627bff10f9e9b45158-preview/" + value);
  };

  try {
    if (typeof nextPageSlug !== "undefined" && nextPageSlug) {
      return normalize(nextPageSlug);
    }
  } catch (e) {}

  if (CHECKOUT_NEXT_PAGE_SLUG) {
    return normalize(CHECKOUT_NEXT_PAGE_SLUG);
  }

  return "/";
}

let isTest = sessionStorage.getItem("test");

if (isTest === null) {
  isTest = true;
  sessionStorage.setItem("test", String(isTest));
} else {
  isTest = isTest === "true";
}

const removeKlarnaParamsFromUrl = (urlValue) => {
  const sourceUrl = urlValue || window.location.href;
  const url = new URL(sourceUrl, window.location.origin);
  url.searchParams.delete("payment_intent");
  url.searchParams.delete("payment_intent_client_secret");
  url.searchParams.delete("redirect_status");
  return url.toString();
};
sessionStorage.setItem("checkoutUrl", removeKlarnaParamsFromUrl(window.location.href));

const STRIPE_EXPRESS_CONFIG = {stripeKey: '', accountId: '', wallets: {"enabled":false,"enableApplePay":false,"enableGooglePay":false,"enableKlarna":false}};
const PAYMENT_METHODS_IDS = {"creditCard":1,"googlePay":3,"applePay":4,"paypal":6,"klarna":12};
const hasAccountId = !!STRIPE_EXPRESS_CONFIG.accountId;
const isKlarnaEnabled = Boolean(
  STRIPE_EXPRESS_CONFIG?.wallets?.enabled &&
  STRIPE_EXPRESS_CONFIG?.wallets?.enableKlarna
);
sessionStorage.setItem("isKlarnaEnabled", JSON.stringify(isKlarnaEnabled));
const HAS_FOLLOWING_UPSELLS = true;

// Select non-VIP campaign for checkout
const getVrioCampaignInfoBasedOnPaymentMethod = (isVipUpsell) => {
    const vrioCampaigns = [{"_id":"696a4531a531c62359271f0b","integration":[{"_id":"685435949a3a8c5ffb4854ef","workspace":"develop","platform":"vrio","description":"dev, team api","fields":{"publicApiKey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6ImFkbWluIiwib3JnYW5pemF0aW9uIjoibXZtdHNhbmRib3gudnJpbyIsImlkIjoiNTQxNzM0MWMtOTI3ZS00YTc5LTk5MTQtMzcxM2IyM2RlMTNlIiwiaWF0IjoxNzUwMDk4ODg1LCJhdWQiOiJ1cm46dnJpbzphcGk6dXNlciIsImlzcyI6InVybjp2cmlvOmFwaTphdXRoZW50aWNhdG9yIiwic3ViIjoidXJuOnZyaW86YXBpOjE4In0.z4qwr2v87T3wq73w1nT8aSASKIMVLnL0HX1E-2tavrs"},"status":"active","createdAt":1750335264215,"updatedAt":1750349204667,"__v":0,"category":"CRM","id":"685435949a3a8c5ffb4854ef"}],"externalId":"39","name":"Vi-Shift - Network - (1)","currency":"USD","countries":[223,38],"metadata":{"campaign_id":39,"campaign_name":"","payment_type_id":1,"campaign_active":true,"campaign_prepaid":true,"campaign_payment_method_required":true,"campaign_group_transactions":true,"campaign_global_js":"","campaign_global_seo_title":"","campaign_global_seo_keywords":"","campaign_global_seo_description":"","date_created":"2026-01-16 14:32:16","created_by":0,"date_modified":"2026-01-16 14:32:16","modified_by":0,"campaign_notes":"","offers":[],"shipping_profiles":[],"campaignId":"39","externalId":39,"description":"","payment_methods":["amex","discover","visa","master"],"alternative_payments":[],"countries":[{"iso_numeric":840,"calling_code":"1","id":223,"name":"United States of America","iso_2":"US","iso_3":"USA"},{"iso_numeric":124,"calling_code":"1","id":38,"name":"Canada","iso_2":"CA","iso_3":"CAN"}]},"funnels":[],"createdAt":1768339039473,"updatedAt":1768573936154,"packages":[],"status":"active","platform":"vrio","__v":0,"id":"696a4531a531c62359271f0b"}];

    const vrioIntegration = vrioCampaigns.find(({ integration }) =>
      integration.find((int) => int.platform === 'vrio'),
    )?.integration.find((int) => int.platform === 'vrio');
    if (!vrioIntegration) {
      console.log('CRM Integration not available in funnel campaign.');
      throw new Error('CRM Integration not available in funnel campaign.');
    }

    // If this is a VIP page (recurring billing), try to find a VIP campaign
    // const campaignBasedOnBillingModel = vrioCampaigns.find((campaign) => {
    //   if (!campaign.name) {
    //     return false;
    //   }
    //   const isVipCampaign = campaign.name.toUpperCase().includes('VIP');
    //   if (isVipUpsell) {
    //     return isVipCampaign;
    //   }
    //   return !isVipCampaign;
    // });
    const campaignBasedOnBillingModel = vrioCampaigns[0];

    if (!campaignBasedOnBillingModel) {
      throw new Error(`No ${isVipUpsell ? 'VIP' : 'non-VIP'} campaign found in funnel.`);
    }

    const auditedVrioCampaignId = (() => window.VRIO?.campaignId)();
    const vrioCampaignId = auditedVrioCampaignId ?? campaignBasedOnBillingModel.externalId;
    const countries = campaignBasedOnBillingModel.metadata.countries;
    const integrationId = vrioIntegration?._id.toString();
    const currency = (campaignBasedOnBillingModel.currency || "USD").toLowerCase();

    return {
      vrioCampaignId,
      countries,
      integrationId,
      currency,
    };
  };


const campaignInfo = getVrioCampaignInfoBasedOnPaymentMethod();
const CAMPAIGN_ID = campaignInfo.vrioCampaignId;
const INTEGRATION_ID = campaignInfo.integrationId;
const CURRENCY = "USD";

const CURRENCY_LOCALE_MAP = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AUD: 'en-AU',
};
const LOCALE = getLocaleFromCurrency(CURRENCY);

function getLocaleFromCurrency(currencyCode) {
  const code = (currencyCode || '').toUpperCase();
  if (code && CURRENCY_LOCALE_MAP[code]) return CURRENCY_LOCALE_MAP[code];
  return navigator.language || 'en-US';
};

function formatPrice(amount, suffix = '') {
  const formatted = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted}${suffix}`;
};


const i18n = {
  "iso2": "US",
  "phoneInitialCountry": "us",
  "dateFormat": "MM/DD/YYYY",
  "fallbackCountry": {
    "iso_numeric": 840,
    "calling_code": "1",
    "id": 223,
    "name": "United States of America",
    "iso_2": "US",
    "iso_3": "USA"
  },
  "pricingText": {
    "off": "OFF",
    "free": "FREE",
    "freeShipping": "Free Shipping",
    "perUnit": "/ea",
    "selectedProduct": "Selected Product"
  },
  "validation": {
    "expirationDateRequired": "* Expiration date is required",
    "expirationDateInvalid": "* Invalid or expired date",
    "cardNumberRequired": "* Enter a valid card number",
    "cardNumberInvalid": "* Invalid card number",
    "cardCvvRequired": "* Card CVV is required",
    "cardCvvMinLength": "* Card CVV must have at least 3 digits",
    "emailRequired": "* Please enter the e-mail address",
    "emailInvalid": "* Email is invalid",
    "firstNameRequired": "* First name is required",
    "lastNameRequired": "* Last name is required",
    "invalidCharacter": "* Contains an invalid character",
    "shippingAddressRequired": "* Shipping address is required",
    "cityRequired": "* City is required",
    "countryRequired": "* Country is required",
    "stateRequired": "* State/Province is required",
    "zipRequired": "* ZIP/Postcode is required",
    "zipInvalid": "* Invalid ZIP/Postcode code",
    "phoneInvalid": "* Please enter a valid phone number",
    "maxLength255": "* Maximum 255 characters",
    "billingAddressRequired": "* Billing address is required",
    "billingCityRequired": "* Billing city is required",
    "billingZipRequired": "* Billing ZIP/Postcode code is required"
  },
  "errors": {
    "walletVerificationFailed": "This payment needs additional verification. Please try a different payment method.",
    "walletOrderFailed": "Something went wrong creating your order, please try again",
    "unexpectedError": "An unexpected error occurred. Please try again.",
    "paymentDeclined": "Your payment could not be processed. Please try a different payment method.",
    "systemErrorOffer": "There was a problem with this offer. Please contact support or try again later.",
    "systemErrorGeneric": "Something went wrong processing your order. Please try again or contact support if the problem persists.",
    "klarnaNotAvailableRecurring": "Klarna is not available for recurring products.",
    "klarnaSubscriptionsNotSupported": "Subscriptions are not supported with Klarna",
    "klarnaOrderFailed": "Something went wrong creating the order, please try again",
    "klarnaProcessingFailed": "Something went wrong processing your order, please try again",
    "klarnaPaymentNotCompleted": "Klarna payment was not completed",
    "klarnaPaymentNotCompletedRedirect": "Klarna payment was not completed. Redirecting to checkout...",
    "klarnaCompletionFailed": "Something went wrong completing your Klarna payment.",
    "orderAlreadyCompleteRedirect": "Order is already complete. Redirecting to the next page...",
    "unexpectedErrorRedirect": "An unexpected error occurred. Redirecting to checkout...",
    "orderNotFoundRedirect": "Order not found. Redirecting to checkout...",
    "orderNotFound": "Order not found. Please try again.",
    "orderCanceled": "Order canceled",
    "creditCardOrderFailed": "Something went wrong, please try again",
    "upsellOrderFailed": "Something went wrong adding offers, please try again",
    "countryNotAvailableNamed": "The country {name} is not available, please choose another.",
    "countryNotAvailable": "This country is not available, please choose another."
  },
  "labels": {
    "noStatesAvailable": "No States or Provinces Available for this Country",
    "selectState": "Select state",
    "phoneSearchPlaceholder": "Search",
    "processing": "Processing...",
    "close": "Close",
    "cvvModalTitle": "Where is my security code?",
    "cvvCardBack": "Back of card",
    "cvvCardFront": "Front of card",
    "cvvThreeDigitLabel": "3-digit CVV number",
    "cvvFourDigitLabel": "4-digit CVV number",
    "cvvBackDescription": "The 3-digit security code (CVV) is printed on the back of your card, to the right of the signature strip.",
    "cvvFrontDescription": "American Express cards have a 4-digit code on the front."
  }
};

// Validation patterns (RegExp – cannot be serialised as JSON)
i18n.validationPatterns = {
  zipCodeRegex: /^(?:\d{5}(?:-\d{4})?|[A-Za-z]\d[A-Za-z](?:[ -]?\d[A-Za-z]\d)?|\d{4}|[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[ABD-HJLN-UW-Z]{2})$/,
  nameRegex: /\b([A-ZÀ-ÿ][-,a-zÀ-ÿ. ']+[ ]*)+$/i,
};

function formatDateByConvention(year, month, day) {
  return `${month}/${day}/${year}`;
}


const getShippingProfiles = async () => {
  try {
    const response = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/campaigns/${CAMPAIGN_ID}?with=shipping_profiles`,
      {
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`
        }
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to load shipping profiles (${response.status})`);
    }
    const campaign = await response.json();
    return campaign?.shipping_profiles || [];
  } catch (e) {
    if (isTest) console.error("getShippingProfiles failed", e);
    return [];
  }
};

let shippingProfiles = [];

const resolveShippingProfile = (productEl) => {
  const profileId = productEl
    ? +productEl.getAttribute("data-shipping-profile-id")
    : undefined;
  const profile = shippingProfiles.find(
    (p) => p.shipping_profile_id === profileId
  );
  if (!profile) return null;
  const price =
    profile.shipping_profile_configs?.[0]?.shipping_profile_config_price;
  return {
    id: String(profile.shipping_profile_id),
    displayName: (profile.shipping_profile_name || "").replace(/\s*\(?(?:[\$£][\d,.]+|[\d,.]+\s*[€])\)?\s*$/, "").trim(),
    amount: Math.round(parseFloat(price || "0") * 100)
  };
};

const DEFAULT_OFFER_ID = '99';
const getVrioOfferInfoByProductId = (productId) =>
  ((productId) => {
    const vrioOffers = [{"id":99,"offerTypeId":1,"name":"Vi-Shift - Network","items":[{"name":"1x EXTRA Vi-Shift Glasses","id":232,"quantity":1,"price":19.99,"shippable":false},{"name":"1x Flexible Glasses","id":224,"quantity":1,"price":29.99,"shippable":false},{"name":"1x USB 3.0 Quick Charger","id":59,"quantity":1,"price":0,"shippable":false},{"name":"2x Vi-Shift Glasses","id":225,"quantity":1,"price":53.98,"shippable":false},{"name":"3 Year Extended Warranty","id":230,"quantity":1,"price":10,"shippable":false},{"name":"3x Vi-Shift Glasses","id":226,"quantity":1,"price":71.97,"shippable":false},{"name":"4x Vi-Shift Glasses","id":227,"quantity":1,"price":83.96,"shippable":false},{"name":"5x Vi-Shift Glasses","id":228,"quantity":1,"price":89.95,"shippable":false},{"name":"Flexible Glasses","id":223,"quantity":1,"price":0,"shippable":true},{"name":"Journey Package Protection","id":231,"quantity":1,"price":3.5,"shippable":false},{"name":"USB 3.0 Quick Charger","id":36,"quantity":1,"price":0,"shippable":true},{"name":"Vi-Shift Glasses - Expedited Shipping","id":233,"quantity":1,"price":9.99,"shippable":false},{"name":"Vi-Shift Protective Case Upgrade","id":229,"quantity":1,"price":9.95,"shippable":false}]},{"id":100,"offerTypeId":2,"name":"Vi-Shift - VIP","items":[{"name":"VIP Customer Benefits","id":34,"quantity":1,"price":9.95,"shippable":false}]}];
    const recurringOfferTypeIds = [2, '2'];
    let matchedOffer = null;
    let isRecurringOffer = false;

    // prefer recurring offer match, fallback to first non-recurring match
    for (const offer of vrioOffers) {
      if (offer.items.some((item) => String(item.id) === String(productId))) {
        if (recurringOfferTypeIds.includes(offer.offerTypeId)) {
          matchedOffer = offer;
          isRecurringOffer = true;
          break;
        }
        if (!matchedOffer) matchedOffer = offer;
      }
    }

    return {
      offerId: matchedOffer?.id,
      isRecurringOffer,
    };
  })(productId);
const getVrioOfferIdByProductId = (productId) =>
  getVrioOfferInfoByProductId(productId)?.offerId;
sessionStorage.setItem("integrationId", INTEGRATION_ID);

const getPrices = () => {
  return [{"name":"1x EXTRA Vi-Shift Glasses","id":232,"quantity":1,"price":19.99,"shippable":false,"fullPrice":19.99,"finalPrice":19.99,"productName":"1x EXTRA Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"1x Flexible Glasses","id":224,"quantity":1,"price":29.99,"shippable":false,"fullPrice":29.99,"finalPrice":29.99,"productName":"1x Flexible Glasses","discountAmount":0,"discountPercentage":0},{"name":"1x USB 3.0 Quick Charger","id":59,"quantity":1,"price":0,"shippable":false,"fullPrice":0,"finalPrice":0,"productName":"1x USB 3.0 Quick Charger","discountAmount":0,"discountPercentage":0},{"name":"2x Vi-Shift Glasses","id":225,"quantity":1,"price":53.98,"shippable":false,"fullPrice":53.98,"finalPrice":53.98,"productName":"2x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"3 Year Extended Warranty","id":230,"quantity":1,"price":10,"shippable":false,"fullPrice":10,"finalPrice":10,"productName":"3 Year Extended Warranty","discountAmount":0,"discountPercentage":0},{"name":"3x Vi-Shift Glasses","id":226,"quantity":1,"price":71.97,"shippable":false,"fullPrice":71.97,"finalPrice":71.97,"productName":"3x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"4x Vi-Shift Glasses","id":227,"quantity":1,"price":83.96,"shippable":false,"fullPrice":83.96,"finalPrice":83.96,"productName":"4x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"5x Vi-Shift Glasses","id":228,"quantity":1,"price":89.95,"shippable":false,"fullPrice":89.95,"finalPrice":89.95,"productName":"5x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"Journey Package Protection","id":231,"quantity":1,"price":3.5,"shippable":false,"fullPrice":3.5,"finalPrice":3.5,"productName":"Journey Package Protection","discountAmount":0,"discountPercentage":0},{"name":"Vi-Shift Glasses - Expedited Shipping","id":233,"quantity":1,"price":9.99,"shippable":false,"fullPrice":9.99,"finalPrice":9.99,"productName":"Vi-Shift Glasses - Expedited Shipping","discountAmount":0,"discountPercentage":0},{"name":"Vi-Shift Protective Case Upgrade","id":229,"quantity":1,"price":9.95,"shippable":false,"fullPrice":9.95,"finalPrice":9.95,"productName":"Vi-Shift Protective Case Upgrade","discountAmount":0,"discountPercentage":0},{"name":"VIP Customer Benefits","id":34,"quantity":1,"price":9.95,"shippable":false,"fullPrice":9.95,"finalPrice":9.95,"productName":"VIP Customer Benefits","discountAmount":0,"discountPercentage":0}]
};

const SUPPORTED_ADDRESS_COUNTRIES = [{"name":"United States of America","iso_2":"US"},{"name":"Canada","iso_2":"CA"},{"name":"United Kingdom","iso_2":"GB"},{"name":"Australia","iso_2":"AU"},{"name":"Germany","iso_2":"DE"},{"name":"France","iso_2":"FR"},{"name":"Spain","iso_2":"ES"},{"name":"Italy","iso_2":"IT"}];

const getCountries = () => {
  // Campaign countries are the source of truth
  // Only show countries the campaign is configured for, restricted to the supported set
  // Falls back to the full supported list when campaign has no country configuration
  const rawCampaignCountries = Array.isArray(campaignInfo.countries) && campaignInfo.countries.length > 0
    ? campaignInfo.countries
    : null;
  if (!rawCampaignCountries) return SUPPORTED_ADDRESS_COUNTRIES;
  const campaignFiltered = rawCampaignCountries
    .map((c) => ({
      ...c,
      iso_2: String(c?.iso_2 || c?.code || c?.iso2 || "").toUpperCase(),
      name: c?.name || c?.countryName || "",
    }))
    .filter((c) => c.iso_2 && SUPPORTED_ADDRESS_COUNTRIES.some((s) => s.iso_2 === c.iso_2))
    .map((c) => {
      // Prefer the canonical name from SUPPORTED_ADDRESS_COUNTRIES if campaign entry lacks one
      const canonical = SUPPORTED_ADDRESS_COUNTRIES.find((s) => s.iso_2 === c.iso_2);
      return { ...c, name: c.name || canonical?.name || c.iso_2 };
    });
  return campaignFiltered.length ? campaignFiltered : SUPPORTED_ADDRESS_COUNTRIES;
};

const countries = getCountries();

const getProductElement = (productId) => {
  const productElement = document.querySelector(`[data-product-id="${productId}"]`);
  if (productElement) {
    return productElement;
  } else {
    throw new Error(`Product element with ID ${productId} not found.`);
  }
};

const getBindedShippableProductAndQuantity = (productElement) => {
  if (productElement && productElement.dataset.shippableProductId) {
    const shippableId = Number(productElement.dataset.shippableProductId);
    let quantity = 1;
    if (!isNaN(productElement.dataset.productQuantity)) {
      quantity = Number(productElement.dataset.productQuantity);
    } else if (!isNaN(Number(productElement.value))) {
      quantity = Number(productElement.value);
    }
    return { product: shippables.find((s) => s.id === shippableId), quantity };
  }
  return null;
};

const productCustomData = {};
sessionStorage.removeItem("productCustomData");
const saveProductCustomData = (productElement) => {
  productCustomData[productElement.dataset.productId] = {
    customProductName: productElement.dataset.customProductName,
    customSummaryRow: productElement.dataset.customSummaryRow,
    customIsGift: productElement.dataset.customIsGift,
  };
}

const shippables = [{"id":223,"name":"Flexible Glasses"},{"id":36,"name":"USB 3.0 Quick Charger"}];

const variants = [[], [], []];
shippables.forEach((product) => {
  product.name.split("-").forEach((variant, i) => {
    variants[i].push(variant.trim());
  });
});

const shippableMap = new Map(shippables.map((s) => [s.name, s]));

const prices = getPrices();

window.__stripeExpress = window.__stripeExpress || null;

// Address mode (computed once DOM is ready)
// "checkbox" - toggle billing validation based on checkbox
// "separate" - validate both (no checkbox, both billing and shipping fields exist)
// "single" - only one set of fields exists (use for billing and shipping)
let addressMode = "single";

function calculateAddressMode() {
  const billingFieldSelectors = [
    "[data-billing-line-1]",
    "[data-billing-city]",
    "[data-billing-zip-code]",
    "[data-billing-first-name]",
    "[data-billing-last-name]",
    "[data-billing-select-countries]",
    "[data-billing-select-states]"
  ];
  const hasBillingFields = billingFieldSelectors.some((sel) =>
    document.querySelector(sel)
  );
  const billShipCheckboxExists = !!document.getElementById("billShipSame");

  if (billShipCheckboxExists) {
    addressMode = "checkbox";
  } else if (hasBillingFields) {
    addressMode = "separate";
  } else {
    addressMode = "single";
  }
}

function isSameAddress() {
  if (addressMode === "single") return true;
  if (addressMode === "separate") return false;
  const checkbox = document.getElementById("billShipSame");
  return checkbox ? checkbox.checked : true;
}

function isKlarnaSelected() {
  const selectedPaymentMethod = document.querySelector('input[name="paymentOption"]:checked');
  return isKlarnaEnabled && selectedPaymentMethod?.value === "klarna";
}

function isRecurringProductById(productId) {
  const offerInfo = getVrioOfferInfoByProductId(Number(productId));
  return Boolean(offerInfo?.isRecurringOffer);
}

function calculateTotalAmount() {
  let total = 0;
  const shouldSkipRecurring = isKlarnaSelected();

  if (selectedProduct) {
    if (shouldSkipRecurring && isRecurringProductById(selectedProduct.id)) {
      return 0;
    }
    total += Math.max(
      0,
      Number(selectedProduct.price || selectedProduct.finalPrice || 0) *
        (selectedProduct.quantity || 1)
    );

    const selectedProductElement = getProductElement(selectedProduct.id);
    let { product: bindedProduct, quantity: bindedQty } =
      getBindedShippableProductAndQuantity(selectedProductElement) ?? {};
    if (bindedProduct) {
      const bindedPrice = prices.find((p) => p.id === bindedProduct.id);
      if (bindedPrice) {
        const productPrice = Math.max(
          0,
          Number(bindedPrice.price || bindedPrice.finalPrice || 0) *
            (bindedPrice.quantity || 1)
        );
        total += isNaN(productPrice) ? 0 : productPrice;
      }
    }
  }

  getVariantsToShip().forEach((variant) => {
    if (shouldSkipRecurring && isRecurringProductById(variant.id)) {
      return;
    }
    const variantPrice = prices.find((p) => p.id === variant.id);
    if (variantPrice) {
      const productPrice = Math.max(
        0,
        Number(variantPrice.price || variantPrice.finalPrice || 0) *
          (variantPrice.quantity || 1)
      );
      total += isNaN(productPrice) ? 0 : productPrice;
    }
  });

  const upsells = getInPurchaseUpsells();
  upsells.forEach((upsell) => {
    if (shouldSkipRecurring && isRecurringProductById(upsell.item_id)) {
      return;
    }
    const upsellProduct = prices.find(
      (p) => String(p.id) === String(upsell.item_id)
    );
    if (upsellProduct) {
      const upsellPrice = Math.max(
        0,
        Number(upsellProduct.price || upsellProduct.finalPrice || 0) *
          (upsellProduct.quantity || 1)
      );
      total += upsellPrice * (upsell.order_offer_quantity || 1);
    }

    const upsellProductElement = getProductElement(upsell.item_id);
    let { product: upsellBinded } =
      getBindedShippableProductAndQuantity(upsellProductElement) ?? {};
    if (upsellBinded) {
      const upsellBindedPrice = prices.find((p) => p.id === upsellBinded.id);
      if (upsellBindedPrice) {
        const productPrice = Math.max(
          0,
          Number(upsellBindedPrice.price || upsellBindedPrice.finalPrice || 0) *
            (upsellBindedPrice.quantity || 1)
        );
        total += isNaN(productPrice) ? 0 : productPrice;
      }
    }
  });

  return Math.round(total * 100);
}

function updateStripeElementsAmount(amount) {
  const newAmount = amount ?? calculateTotalAmount();
  const stripeState = window.__stripeExpress;
  if (!stripeState?.elements || !stripeState?.stripe) return;

  try {
    stripeState.elements.update({
      amount: newAmount,
      currency: String(CURRENCY || "usd").toLowerCase()
    });
  } catch (e) {
    const stripe = stripeState.stripe;
    
    stripeState.elements = stripe.elements({
      mode: "payment",
      amount: newAmount,
      currency: String(CURRENCY || "usd").toLowerCase(),
      setupFutureUsage: "off_session",
      captureMethod: "manual",
      payment_method_types: ["card"]
    });

    try {
      if (stripeState.express && typeof stripeState.express.unmount === "function") {
        stripeState.express.unmount();
        stripeState.express = null;
        initVrioWallets();
      }
    } catch (error) {
      console.error("Error unmounting Stripe express", error);
    }
  }
}

const splitName = (fullName) => {
  const parts = (fullName || "").trim().split(/\s+/);
  return {
    first: parts[0] || "",
    last: parts.slice(1).join(" ") || ""
  };
};

async function createOrderViaWallet(confirmationToken, paymentMethodId) {
  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData);

  showError("", true);

  if (isTest && window.location.hostname === "localhost")
    console.log("Creating wallet order", data);

  showPreloader(true);

  const billing = confirmationToken?.payment_method_preview?.billing_details;
  const shipping = confirmationToken?.shipping;

  const shipName = splitName(shipping?.name);
  const billName = splitName(billing?.name);

  const email = data.email || billing?.email;
  const phone = data.phone || shipping?.phone || billing?.phone;

  const shippingProfileId =
      +document
        .querySelector(`[data-product-id="${selectedProduct.id}"]`)
        ?.getAttribute("data-shipping-profile-id") || undefined;

  const orderData = {
    pageId: "DYEJeuRZY6KESPfRmfWmSdlhkVb65wSVEYs9xhR_3FD2WUkvy_jSuRmnzjUs8_-u",
    action: "process",
    campaign_id: CAMPAIGN_ID,
    connection_id: 1,
    email: email,
    phone: phone,
    ship_fname: shipName.first,
    ship_lname: shipName.last,
    ship_address1: shipping?.address?.line1,
    ship_address2: shipping?.address?.line2,
    ship_city: shipping?.address?.city,
    ship_state: shipping?.address?.state || undefined,
    ship_zipcode: shipping?.address?.postal_code,
    ship_country: shipping?.address?.country,
    bill_fname: billName.first,
    bill_lname: billName.last,
    bill_address1: billing?.address?.line1,
    bill_address2: billing?.address?.line2,
    bill_city: billing?.address?.city,
    bill_state: billing?.address?.state || undefined,
    bill_zipcode: billing?.address?.postal_code,
    bill_country: billing?.address?.country,
    offers: [
      {
        offer_id: getVrioOfferIdByProductId(selectedProduct.id) ?? DEFAULT_OFFER_ID,
        order_offer_quantity: 1,
        item_id: Number(selectedProduct.id),
        mainOffer: true
      }
    ],
    shipping_profile_id: shippingProfileId,
    ...getDataFromSessionStorage(),
    ip_address: await getClientIP(),
    payment_method_id: paymentMethodId,
    
    ...(() => {
    function getQueryParamsCaseInsensitive() {
      const params = new URLSearchParams(window.location.search);
      const normalized = {};

      params.forEach((value, key) => {
        normalized[key.toLowerCase()] = value;
      });

      return normalized;
    }
    const params = getQueryParamsCaseInsensitive();

    const offerId = params['oid'] || params['offer_id'] || params['c1'];
    const c2 = params['c2'];
    const txid = params['_ef_transaction_id'] || EF.getTransactionId(offerId);
    const affId = params['affid'] || params['aff_id'];
    const sub1 = params['sub1'] || params['aff_sub'],
      sub2 = params['sub2'] || params['aff_sub2'],
      sub3 = params['sub3'] || params['aff_sub3'],
      sub4 = params['sub4'] || params['aff_sub4'],
      sub5 = params['sub5'] || params['aff_sub5'];
    const utmCampaign = params['utm_campaign'];
    const utmSource = params['utm_source'];
    const cardBinMapMidRec = sessionStorage.getItem('bin_map_mid_rec');
    const experimentsAndVariantsIds = sessionStorage.getItem('convert_experiment_ids');
    const isMobileDevice = 
      (navigator.userAgentData && navigator.userAgentData.mobile) ??
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const deviceType = isMobileDevice ? 'mobile' : 'desktop';


    return {
      tracking1: affId,

      tracking2: offerId,

      tracking3: c2,

      tracking4: txid,

      tracking5: sub1,

      tracking6: sub2,

      tracking7: sub3,

      tracking8: sub4,

      tracking9: sub5,

      tracking10: utmCampaign,

      tracking11: utmSource,

      tracking12: window.location.href,

      // "exp1_id : exp1_var_id, exp2_id : exp2_var_id, ..."
      // (Empty if no A/B testing experiments on the page)
      tracking13: experimentsAndVariantsIds,

      tracking14: cardBinMapMidRec,

      tracking15: deviceType,

      tracking17: window.location.href,
    };
  })()

  };

  const percentDiscount = sessionStorage.getItem("p_dc");
  if (sessionStorage.getItem("p_tenbucksoff") === "yes" && !percentDiscount) {
    orderData.offers[0].discount_code = "FLAT10";
  } else if (percentDiscount) {
    orderData.offers[0].discount_code = `DISCOUNT${percentDiscount}`;
  }

  const selectedProductElement = getProductElement(selectedProduct.id);
  saveProductCustomData(selectedProductElement);
  let { product, quantity } =
    getBindedShippableProductAndQuantity(selectedProductElement) ?? {};
  if (product) {
    orderData.offers.push({
      offer_id: getVrioOfferIdByProductId(product.id) ?? DEFAULT_OFFER_ID,
      item_id: Number(product.id),
      order_offer_quantity: quantity
    });
  }

  getVariantsToShip().forEach((p) => {
    orderData.offers.push({
      offer_id: getVrioOfferIdByProductId(p.id) ?? DEFAULT_OFFER_ID,
      item_id: Number(p.id),
      order_offer_quantity: p.quantity
    });
  });

  getInPurchaseUpsells().forEach((upsell) => {
    const upsellProductElement = getProductElement(upsell.item_id);
    saveProductCustomData(upsellProductElement);
    let { product: bindedProduct, quantity: bindedQty } =
      getBindedShippableProductAndQuantity(upsellProductElement) ?? {};
    if (bindedProduct) {
      orderData.offers.push({
        offer_id: getVrioOfferIdByProductId(bindedProduct.id) ?? DEFAULT_OFFER_ID,
        item_id: Number(bindedProduct.id),
        order_offer_quantity: bindedQty
      });
    }
    orderData.offers.push(upsell);
  });

  const sanitizedOrderData = removeObjectUndefinedProperties(orderData);

  let cartToken = sessionStorage.getItem("cart_token");
  if (!cartToken) {
    cartToken = await createCart(sanitizedOrderData);
    if (cartToken) sessionStorage.setItem("cart_token", cartToken);
  }
  if (cartToken) sanitizedOrderData.cart_token = cartToken;

  sessionStorage.setItem("orderData", JSON.stringify(sanitizedOrderData));

  if (isTest && window.location.hostname === "localhost") {
    console.log("Sending wallet order to VRIO", { sanitizedOrderData });
  }
  try { sessionStorage.removeItem('klaviyo_profile_updated'); } catch(e) {}
  try {
    if (typeof validateAndSendToKlaviyo === "function") {
      const klaviyoPreOrderData = { ...sanitizedOrderData };
      validateAndSendToKlaviyo(
        klaviyoPreOrderData,
        "Order Attempt - Pre-VRIO Submission",
        "order"
      );
    }
  } catch (error) {
    console.error("Error validating and sending to Klaviyo", error);
  }
  MVMT.track("ORDER_SUBMITTED", {
    page: "checkout",
    page_type: "Checkout",
    page_url: window.location.href,
    order_data: sanitizedOrderData,
  });

  try {
    const response = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders`,
      {
        method: "POST",
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`,
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
          ...sanitizedOrderData,
          payment_token: confirmationToken.id
        })
      }
    );

    if (response.status === 403) {
      handlePaymentDecline();
      if (window.MVMT) {
        MVMT.track("ORDER_ERROR", {
          page: "checkout",
          page_type: "Checkout",
          page_url: window.location.href,
          order_data: sanitizedOrderData,
          response: { error: "payment_declined", status: 403 },
        });
      }
      return;
    }

    const result = await response.json();

    if (isTest) console.log("VRIO Wallet Order Response", result);

    const orderIdToFlagAsTest = extractOrderIdFromResponse(result);
    if (
      orderIdToFlagAsTest &&
      confirmationToken &&
      !confirmationToken.livemode
    ) {
      await flagOrderAsTest(orderIdToFlagAsTest);
    }

    if (result && result.response_code === 101) {
      showError(
        i18n.errors.walletVerificationFailed, true
      );
      if (window.MVMT) {
        MVMT.track("ORDER_ERROR", {
          page: "checkout",
          page_type: "Checkout",
          page_url: window.location.href,
          order_data: sanitizedOrderData,
          response: result
        });
      }
      return;
    }

    if (!response.ok || (result && result.error) || !result.order_id) {
      var errorCode = (result && result.error && result.error.code) || null;
      
      if (response.status === 400 && errorCode && ["offer_invalid", "campaign_invalid", "product_invalid"].includes(errorCode)) {
        handleSystemError(errorCode);
        if (window.MVMT) {
          MVMT.track("ORDER_ERROR", {
            page: "checkout",
            page_type: "Checkout",
            page_url: window.location.href,
            order_data: sanitizedOrderData,
            response: result,
          });
        }
        return;
      }

      var msg =
        (result && result.error && result.error.message) ||
        (result && result.message) ||
        i18n.errors.walletOrderFailed;
      msg = humanizeCountryError(msg);

      showError(msg, true);

      if (window.MVMT) {
        MVMT.track("ORDER_ERROR", {
          page: "checkout",
          page_type: "Checkout",
          page_url: window.location.href,
          order_data: sanitizedOrderData,
          response: result,
        });
      }

      return;
    }

    try {
      if (typeof validateAndSendToKlaviyo === "function") {
        const klaviyoPostOrderData = {
          ...sanitizedOrderData,
          vrio_order_id: result.order_id,
          vrio_response_status: 'success',
        };
        await validateAndSendToKlaviyo(
          klaviyoPostOrderData,
          "Order Success - VRIO Confirmation",
          "order"
        );
      }
    } catch (error) {
      console.error("Error validating and sending to Klaviyo", error);
    }
    try {
      if (typeof sendKlaviyoOrderEvents === 'function') {
        await sendKlaviyoOrderEvents(sanitizedOrderData, result, true);
      }
    } catch (error) {
      console.error("Error sending order events to Klaviyo", error);
    }
    MVMT.track("ORDER_SUCCESS", {
      page: "checkout",
      page_type: "Checkout",
      page_url: window.location.href,
      order_data: sanitizedOrderData,
      response: result,
    });

    let orderSummary = sessionStorage.getItem("orderSummary");
    if (!orderSummary) orderSummary = "[]";
    const orderSummaryData = JSON.parse(orderSummary);
    const addressData = { ...data, sanitizedOrderData };
    orderSummaryData.push(result);
    sessionStorage.setItem("orderSummary", JSON.stringify(orderSummaryData));
    sessionStorage.setItem("addressData", JSON.stringify(addressData));
    sessionStorage.setItem("orderData", JSON.stringify(sanitizedOrderData));
    sessionStorage.setItem(
      "productCustomData",
      JSON.stringify(productCustomData)
    );
    sessionStorage.setItem("cms_oid", result.order_id);
    sessionStorage.setItem("orderids", JSON.stringify([result.order_id]));
    sessionStorage.setItem(
      "stripePayment",
      JSON.stringify({ isLive: confirmationToken.livemode })
    );

    const paymentMethodName =
      paymentMethodId === PAYMENT_METHODS_IDS.applePay
        ? "Apple Pay"
        : paymentMethodId === PAYMENT_METHODS_IDS.googlePay
        ? "Google Pay"
        : "Wallet";

    sendTransactionToDataLayer(vrioToTransaction(result), paymentMethodName);

    window.location.href = getNextPageSlugForRedirect();
  } catch (error) {
    console.error(error);
    showError(i18n.errors.unexpectedError, true);
  } finally {
    showPreloader(false);
  }
}

//Creates error element near submit button for system errors
function getOrCreateErrorElement() {
  var el = document.querySelector("[data-general-error]");
  if (el) return el;
  
  var submitBtn = document.querySelector("[data-submit-button]") || document.querySelector("button[type='submit']") || document.querySelector("form button");
  if (submitBtn && submitBtn.parentNode) {
    el = document.createElement("div");
    el.setAttribute("data-general-error", "");
    el.setAttribute("data-testid", "general-error");
    el.style.cssText = "background:#fee2e2;border:1px solid #ef4444;color:#b91c1c;padding:12px 16px;border-radius:6px;margin-bottom:12px;font-size:14px;display:none;";
    submitBtn.parentNode.insertBefore(el, submitBtn);
    return el;
  }
  return null;
}

//Creates payment error element above payment container for Kount/payment declines
function getOrCreatePaymentErrorElement() {
  var el = document.querySelector("[data-payment-error]");
  if (el) return el;
  
  var cardField = document.querySelector("[data-card-number]");
  if (!cardField) return getOrCreateErrorElement();
  
  var paymentContainer = cardField.parentNode;
  for (var i = 0; i < 3 && paymentContainer && paymentContainer.parentNode; i++) {
    paymentContainer = paymentContainer.parentNode;
  }
  
  if (paymentContainer && paymentContainer.parentNode) {
    el = document.createElement("div");
    el.setAttribute("data-payment-error", "");
    el.setAttribute("data-testid", "payment-error");
    el.style.cssText = "background:#fee2e2;border:1px solid #ef4444;color:#b91c1c;padding:12px 16px;border-radius:6px;margin-bottom:12px;font-size:14px;display:none;";
    paymentContainer.parentNode.insertBefore(el, paymentContainer);
    return el;
  }
  
  return getOrCreateErrorElement();
}

//Handles Kount fraud decline by clearing payment fields and showing notice above payment section.
function handlePaymentDecline() {
  const cardNumberEl = document.querySelector("[data-card-number]");
  const expiryEl = document.querySelector("[data-month-year]");
  const cvvEl = document.querySelector("[data-card-cvv]");
  
  if (cardNumberEl) cardNumberEl.value = "";
  if (expiryEl) expiryEl.value = "";
  if (cvvEl) cvvEl.value = "";

  var paymentErrorEl = getOrCreatePaymentErrorElement();
  if (paymentErrorEl) {
    paymentErrorEl.innerText = i18n.errors.paymentDeclined;
    paymentErrorEl.style.display = "block";
    try {
      paymentErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error("Error scrolling to payment error", error);
    }
  }

  var preload = document.querySelector("[data-preloader]");
  if (preload) preload.style.display = "none";
}


//Handles system/configuration errors (HTTP 400, 5xx)
function handleSystemError(errorCode) {
  var errorMsg = (errorCode === "offer_invalid" || errorCode === "campaign_invalid" || errorCode === "product_invalid")
    ? i18n.errors.systemErrorOffer
    : i18n.errors.systemErrorGeneric;

  var generalErrorEl = getOrCreateErrorElement();
  if (generalErrorEl) {
    generalErrorEl.innerText = errorMsg;
    generalErrorEl.style.display = "block";
    try {
      generalErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error("Error scrolling to general error", error);
    }
  }

  var preload = document.querySelector("[data-preloader]");
  if (preload) preload.style.display = "none";
}

function removeSkeleton() {
  const skeleton = document.getElementById("express-skeleton");
  if (skeleton) skeleton.remove();
}

function initVrioWallets() {
  const expressContainer = document.querySelector("#express-checkout-element");
  const config = STRIPE_EXPRESS_CONFIG;
  let stripeState = window.__stripeExpress;

  if (
    !config?.wallets?.enabled ||
    (!config.wallets.enableApplePay && !config.wallets.enableGooglePay) ||
    !expressContainer ||
    typeof window.Stripe !== "function" ||
    !config?.stripeKey
  ) {
    removeSkeleton();
    if (isTest && window.location.hostname === "localhost") {
      console.log(
        "Stripe wallets not enabled or no express container or stripe instance"
      );
    }
    return;
  }

  // If early init failed for any reason, create everything here as a fallback.
  if (!stripeState) stripeState = window.__stripeExpress = {};

  if (!stripeState.stripe) {
    try {
      stripeState.stripe = hasAccountId ? window.Stripe(config.stripeKey, { stripeAccount: config.accountId }) : window.Stripe(config.stripeKey);
    } catch (error) {
      console.error("Error initializing Stripe instance", error);
      removeSkeleton();
      return;
    }
  }

  const stripe = stripeState.stripe;

  const amount = 100;
  const currency = String(CURRENCY || "usd").toLowerCase();

  if (!stripeState.elements) {
    stripeState.elements = stripe.elements({
      mode: "payment",
      amount,
      currency,
      setupFutureUsage: "off_session",
      captureMethod: "manual",
      payment_method_types: ["card"]
    });
  }

  const elements = stripeState.elements;

  if (!stripeState.express) {
    stripeState.express = elements.create("expressCheckout", {
      paymentMethods: {
        applePay: config.wallets.enableApplePay ? "auto" : "never",
        googlePay: config.wallets.enableGooglePay ? "auto" : "never",
        klarna: "never",
        link: "never",
        amazonPay: "never",
        paypal: "never"
      },
      billingAddressRequired: true,
      shippingAddressRequired: true,
      phoneNumberRequired: true,
      emailRequired: true
    });
  }

  const expressElement = stripeState.express;

  expressElement.mount("#express-checkout-element");

  expressElement.on("ready", (event) => {
    removeSkeleton();
    const available = event.availablePaymentMethods;
    if (!available) {
      expressContainer.hidden = true;
      return;
    }

    const hasMethod =
      available.applePay === "available" ||
      available.applePay === true ||
      available.googlePay === "available" ||
      available.googlePay === true;

    expressContainer.hidden = !hasMethod;
  });

  expressElement.on("click", async (event) => {
    // Use the override total if it exists, otherwise use the calculated total
    const total = window.stripeTotalOverride ?? calculateTotalAmount();
    const selectedProductEl = document.querySelector(
      `[data-product-id='${selectedProduct.id}']`
    );
    const resolvedShippingProfile = resolveShippingProfile(selectedProductEl);

    if (resolvedShippingProfile) {
      updateStripeElementsAmount(total + (resolvedShippingProfile.amount || 0));
      event.resolve({
        shippingRates: [resolvedShippingProfile]
      });
    } else {
      updateStripeElementsAmount(total);
      event.resolve();
    }
  });

  expressElement.on("confirm", async () => {
    const errorEl = document.querySelector("[data-general-error]");
    if (errorEl) {
      errorEl.style.display = "none";
      errorEl.innerText = "";
    }

    try {
      const submit = await elements.submit();
      if (submit && submit.error) {
        showError(submit.error.message, true);
        return;
      }

      const confirmation = await stripe.createConfirmationToken({ elements });
      if (confirmation && confirmation.error) {
        showError(confirmation.error.message, true);
        return;
      }

      const confirmationToken = confirmation.confirmationToken;
      const walletType =
        confirmationToken?.payment_method_preview?.card?.wallet?.type;

      let methodId = PAYMENT_METHODS_IDS.googlePay;
      if (walletType === "apple_pay") methodId = PAYMENT_METHODS_IDS.applePay;
      if (walletType === "google_pay") methodId = PAYMENT_METHODS_IDS.googlePay;

      await createOrderViaWallet(confirmationToken, methodId);
    } catch (err) {
      showError(String(err?.message || err), true);
    }
  });

  window.__vrioStripeExpressElement = expressElement;
}

let selectedProduct = prices.find(p => p.id === Number(document.querySelector('[data-product-card]')?.getAttribute('data-product-id'))) || prices[0];


let selectedProductEl = document.querySelector(
  `[data-product-id="${selectedProduct.id}"]`
);
const variantSelect = document.querySelector("[data-variant-selector]");

const variantsBox = document.querySelector("[data-variants-box]");

if (selectedProductEl) {
  selectedProductEl.classList.add("product-card-active");
  if (variantsBox) {
    variantsBox.innerHTML = "";
    for (let i = 0; i < Number(selectedProduct.quantity); i += 1) {
      variantsBox.appendChild(variantSelect.cloneNode(true));
    }
  }
}

let formEl, generalError;

const removeQuantityFromName = (name) => name.replace(/^\d+x\s*/i, "");

async function getClientIP() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("Error fetching IP:", error);
    return "0.0.0.0";
  }
}

function getDataFromSessionStorage() {
  return {
    session_id:
      MVMT.getSessionId() || localStorage.getItem("mvmt_session_id") || "",
  };
}

function removeObjectUndefinedProperties(obj) {
  for (const key in obj) {
    if (obj[key] === undefined || obj[key] === null || obj[key] === "")
      delete obj[key];
  }
  return obj;
}

const getCardType = (cardNumber) => {
  const cardNumberString = cardNumber.toString().replace(/s/g, "");

  // Visa: Starts with 4
  if (/^4/.test(cardNumberString)) return 2;

  // Mastercard: Starts with 51-55 or 2221-2720
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cardNumberString))
    return 1;

  // American Express: Starts with 34 or 37
  if (/^3[47]/.test(cardNumberString)) return 4;

  // Discover: Starts with 6011, 622126-622925, 644-649, 65
  if (/^(6011|622(12[6-9]|1[3-9]|[2-8]|9[0-1][0-9]|92[0-5])|64[4-9]|65)/.test(
      cardNumberString
    )
  )
    return 3;
};


(function() {
  try {
    var klaviyoLifecyclePayload = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8),
      timestamp: Date.now(),
      location: "builder-events/checkout/vrio-checkout-js-generator.ts" + ':KlaviyoLifecycle:initialized',
      message: 'Klaviyo lifecycle: initialized',
      runId: 'initial',
      hypothesisId: 'KlaviyoLifecycle',
      data: {
        pageName: "checkout",
        pageType: "Checkout",
        klaviyoConfigured: true,
        emailOversightConfigured: typeof EMAIL_OVERSIGHT_VALIDATE_URL !== 'undefined' && !!EMAIL_OVERSIGHT_VALIDATE_URL,
        klaviyoKeyPrefix: typeof KLAVIYO_PUBLIC_API_KEY === 'string' && KLAVIYO_PUBLIC_API_KEY.length >= 8 ? KLAVIYO_PUBLIC_API_KEY.slice(0, 8) : null,
      },
    };
    if (isKlaviyoDebugEnabled() && typeof console !== 'undefined' && console.log) {
      console.log('[Klaviyo lifecycle] initialized ' + JSON.stringify(klaviyoLifecyclePayload.data));
    }
    try {
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('klaviyo_first_page') && typeof window !== 'undefined' && window.location)
        sessionStorage.setItem('klaviyo_first_page', window.location.href);
    } catch (e) {}
  } catch (e) {}
})();

function isKlaviyoDebugEnabled() {
  var debugEnabled = false;
  try {
    debugEnabled = !!(typeof window !== 'undefined' && window.__KLAVIYO_DEBUG__ === true);
    if (!debugEnabled) {
      debugEnabled = !!(isTest && typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost');
    }
  } catch (e) {}
  return debugEnabled;
}

function logKlaviyoTrace(step, data) {
  if (!isKlaviyoDebugEnabled()) return;
  try {
    var payload = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8),
      timestamp: Date.now(),
      location: "builder-events/checkout/vrio-checkout-js-generator.ts" + ':KlaviyoTrace',
      message: '[Klaviyo trace] ' + step,
      runId: 'initial',
      hypothesisId: 'KlaviyoTrace',
      data: data || {},
    };
    if (typeof console !== 'undefined' && console.log) {
      console.log('[Klaviyo trace] ' + step + ' ' + JSON.stringify(data || {}));
    }
  } catch (e) {}
}

function logKlaviyoLifecycle(step, data) {
  if (isKlaviyoDebugEnabled() && typeof console !== 'undefined' && console.log) {
    console.log('[Klaviyo lifecycle] ' + step + ' ' + JSON.stringify(data || {}));
  }
}

function getAttributionForKlaviyo() {
  var q = (typeof window !== 'undefined' && window.location && window.location.search) ? window.location.search : '';
  if (typeof window !== 'undefined' && window.location && window.location.hash && window.location.hash.indexOf('?') >= 0) {
    q = q || ('?' + window.location.hash.split('?')[1]);
  }
  var params = new URLSearchParams(q);
  var firstPage = null;
  try {
    firstPage = sessionStorage.getItem('klaviyo_first_page');
    if (!firstPage && typeof window !== 'undefined' && window.location) {
      firstPage = window.location.href;
      sessionStorage.setItem('klaviyo_first_page', firstPage);
    }
  } catch (e) {}
  var o = {};
  if (params.get('utm_source')) o.utm_source = params.get('utm_source');
  if (params.get('utm_medium')) o.utm_medium = params.get('utm_medium');
  if (params.get('utm_campaign')) o.utm_campaign = params.get('utm_campaign');
  if (params.get('utm_content')) o.utm_content = params.get('utm_content');
  if (params.get('utm_term')) o.utm_term = params.get('utm_term');
  if (typeof document !== 'undefined' && document.referrer) o.referrer = document.referrer;
  if (firstPage) o.first_page = firstPage;
  return o;
}


function getKlaviyoPaymentMethod(paymentMethodId, cardTypeId) {
  const pmId = Number(paymentMethodId);
  if (pmId === 1) {
    const cardMap = { 1: 'Mastercard', 2: 'Visa', 3: 'Discover', 4: 'American Express', 5: 'Digital Wallet', 6: 'ACH', 7: 'SEPA' };
    return cardMap[Number(cardTypeId)] || 'Credit Card';
  }
  const pmMap = { 3: 'Google Pay', 4: 'Apple Pay', 6: 'PayPal', 12: 'Klarna' };
  return pmMap[pmId] || '';
}

function getDialCodeFromItiDom(telEl) {
  try {
    if (!telEl) return null;
    var itiWrapper = telEl.closest && telEl.closest(".iti");
    var selectedEl = itiWrapper && itiWrapper.querySelector && itiWrapper.querySelector(".iti__selected-country-primary");
    var selectedText = selectedEl && selectedEl.textContent ? String(selectedEl.textContent).trim() : "";
    var dialMatch = selectedText ? selectedText.match(/\+(\d+)/) : null;
    return (dialMatch && dialMatch[1]) ? dialMatch[1] : null;
  } catch (e) { return null; }
}

const KLAVIYO_API_REVISION = '2026-01-15';

// eventData             — customer contact info (email, name, phone, address) used for profile update AND email validation
// eventName             — Klaviyo metric name for single-event calls; ignored when batchItems is set (names come from each item)
// source                — event source label sent with the event
// eventPropertiesToSend — explicit event properties to send; when null, built from eventData automatically
// batchItems            — array of { name, properties } for bulk-create; when set, fires one /client/event-bulk-create instead of /client/events
//
// Profile update + subscription fire on every call UNLESS klaviyo_profile_updated is set in sessionStorage (meaning
// a prior call already succeeded). Call sessionStorage.removeItem('klaviyo_profile_updated') before the first event
// of a new submit attempt to ensure it always fires regardless of prior success.
async function sendKlaviyoEvent(eventData, eventName, source, eventPropertiesToSend, batchItems) {
  if (!KLAVIYO_PUBLIC_API_KEY || !eventData || !eventData.email) return;

  var sendData = { eventName: eventName, source: source, emailHint: (eventData.email || '').replace(/(.?).*@(.*)/, '$1***@$2') };
  logKlaviyoTrace('send', sendData);

  var attributionProps = getAttributionForKlaviyo();

  const attributes = {
    email: eventData.email,
  };

  const firstName = eventData.firstName || eventData.first_name || eventData.ship_fname || eventData.bill_fname;
  const lastName = eventData.lastName || eventData.last_name || eventData.ship_lname || eventData.bill_lname;

  if (firstName) attributes.first_name = firstName;
  if (lastName) attributes.last_name = lastName;
  var phoneE164 = null;
  var phoneSource = null;
  var countryIso = null;
  try {
    var telEl = document.querySelector("[data-telephone]");
    if (telEl) {
      var iti = null;
      try {
        if (typeof window !== "undefined" && window.intlTelInputGlobals && typeof window.intlTelInputGlobals.getInstance === "function") {
          iti = window.intlTelInputGlobals.getInstance(telEl);
        }
      } catch (e) {}
      if (iti && typeof iti.getNumber === "function") {
        phoneE164 = iti.getNumber();
        if (phoneE164) phoneSource = 'intlTelInput';
      }
      if (!countryIso && iti && typeof iti.getSelectedCountryData === "function") {
        var cData = iti.getSelectedCountryData();
        if (cData && cData.iso2) {
          countryIso = String(cData.iso2).toUpperCase();
        }
      }
    }
  } catch (e) {}
  if (!phoneE164) {
    var rawPhone = eventData.phone || eventData.phone_number;
    var dialCodeFromDom = getDialCodeFromItiDom(telEl);
    if (rawPhone) {
      var p = String(rawPhone).trim();
      if (p) {
        var digits = p.replace(/\D/g, "");
        if (dialCodeFromDom && digits) {
          var nationalDigits = digits.indexOf(dialCodeFromDom) === 0 ? digits.slice(dialCodeFromDom.length) : digits;
          if (nationalDigits && nationalDigits.length >= 7) {
            phoneE164 = "+" + dialCodeFromDom + nationalDigits;
            phoneSource = 'eventData';
          }
        }
        if (!phoneE164) {
          if (!countryIso) {
            countryIso = (eventData.ship_country || eventData.bill_country || eventData.shippingCountry || eventData.billingCountry || "").toUpperCase();
          }
          if (digits.length === 10 && digits[0] !== "0") {
             phoneE164 = (countryIso === "CA" || countryIso === "US") ? "+1" + digits : "+" + digits;
          } else if (digits.length === 11 && digits[0] === "1") {
            phoneE164 = "+" + digits;
          } else if (p.charAt(0) === "+") {
            phoneE164 = p.replace(/\s/g, "");
          } else if (digits.length >= 10) {
            phoneE164 = "+" + digits;
          }
          if (phoneE164) phoneSource = 'eventData';
        }
      }
    }
  }
  if (phoneE164) {
    var digitsOnly = phoneE164.replace(/\D/g, "");
    var validE164 = digitsOnly.length >= 7 && digitsOnly.length <= 15 && /^[1-9]/.test(digitsOnly);
    if (validE164) {
      phoneE164 = "+" + digitsOnly;
      logKlaviyoLifecycle('phone_resolved', { hasPhone: true, source: phoneSource, e164Redacted: phoneE164.length >= 4 ? '***' + phoneE164.slice(-4) : '***' });
    } else {
      logKlaviyoLifecycle('phone_skipped', { reason: 'not_e164' });
      phoneE164 = null;
    }
  } else if (eventData.phone || eventData.phone_number) {
    logKlaviyoLifecycle('phone_skipped', { reason: 'invalid' });
  } else {
    logKlaviyoLifecycle('phone_resolved', { hasPhone: false, source: null });
  }
  if (phoneE164) attributes.phone_number = phoneE164;

  const address1 = eventData.ship_address1 || eventData.bill_address1 || eventData.shippingAddress1 || eventData.billingAddress1;
  const city = eventData.ship_city || eventData.bill_city || eventData.shippingCity || eventData.billingCity;
  const region = eventData.ship_state || eventData.bill_state || eventData.shippingState || eventData.billingState;
  const zip = eventData.ship_zipcode || eventData.bill_zipcode || eventData.shippingZip || eventData.billingZip;
  const country = eventData.ship_country || eventData.bill_country || eventData.shippingCountry || eventData.billingCountry;
  if (address1 || city || region || zip || country || eventData.ip_address) {
    attributes.location = {};
    if (address1) attributes.location.address1 = address1;
    if (city) attributes.location.city = city;
    if (region) attributes.location.region = region;
    if (zip) attributes.location.zip = zip;
    if (country) attributes.location.country = country;
    if (eventData.ip_address) attributes.location.ip = eventData.ip_address;
  }

  const propertiesForKlaviyo = { ...eventData };
  [
    'creditCardNumber',
    'CVV',
    'expirationDate',
    'card_number',
    'card_cvv',
    'card_exp_month',
    'card_exp_year',
    'phone',
    'phone_number',
  ].forEach((key) => {
    if (key in propertiesForKlaviyo) {
      delete propertiesForKlaviyo[key];
    }
  });

  const klaviyoProfileData = {
    data: {
      type: 'profile',
      attributes: {
        ...attributes,
        properties: {
          ...propertiesForKlaviyo,
          ...attributionProps,
          klaviyo_event_name: eventName,
          source,
          page: "checkout",
          page_type: "Checkout",
          vrio_campaign_id: CAMPAIGN_ID,
        },
      },
    },
  };

  var profileOk = false;


  let aosSent = false;
  try { aosSent = !!sessionStorage.getItem('klaviyo_aos_sent'); } catch(e) {}

  var profileAlreadySent = false;
  try { profileAlreadySent = !!sessionStorage.getItem('klaviyo_profile_updated'); } catch(e) {}

  var hasLocation = !!(address1 || city || region || zip || country || eventData.ip_address);

  var profilePromise = Promise.resolve();
  var subscriptionPromise = Promise.resolve();

  if (!profileAlreadySent) {
    logKlaviyoLifecycle('profile_send_start', { eventName: eventName, hasPhone: !!phoneE164, hasLocation: hasLocation });
    profilePromise = fetch(`https://a.klaviyo.com/client/profiles?company_id=${KLAVIYO_PUBLIC_API_KEY}`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.api+json',
        revision: KLAVIYO_API_REVISION,
        'content-type': 'application/vnd.api+json',
      },
      body: JSON.stringify(klaviyoProfileData),
      keepalive: true,
    }).then(function(res) {
      profileOk = res.ok;
      logKlaviyoLifecycle('profile_send_done', { status: res.ok ? 'ok' : 'fail', statusCode: res.status });
      if (!res.ok) {
        logKlaviyoTrace('failed', { eventName: eventName, status: res.status });
        if (isTest && window.location.hostname === "localhost") {
          res.text().then(function(t) { console.warn(`Klaviyo profile update failed for event '${eventName}':`, res.status, t); });
        }
      } else {
        logKlaviyoTrace('sent', { eventName: eventName });
        try { sessionStorage.setItem('klaviyo_profile_updated', '1'); } catch(e) {}
        if (isTest && window.location.hostname === "localhost") {
          res.json().then(function(j) { console.log('Klaviyo profile updated for event \'' + eventName + '\':', JSON.stringify(j)); });
        }
        if (!aosSent) {
          try {
            const aosUa = navigator.userAgent || '';
            const aosOs = /Android/i.test(aosUa) ? 'Android'
              : /iPhone|iPad|iPod/i.test(aosUa) ? 'iOS'
              : /Windows/i.test(aosUa) ? 'Windows'
              : /Mac/i.test(aosUa) ? 'MacOS'
              : /Linux/i.test(aosUa) ? 'Linux' : 'Unknown';
            const aosBrowser = /Edg\//i.test(aosUa) ? 'Edge'
              : /OPR\//i.test(aosUa) ? 'Opera'
              : /Chrome/i.test(aosUa) ? 'Chrome'
              : /Firefox/i.test(aosUa) ? 'Firefox'
              : /Safari/i.test(aosUa) ? 'Safari'
              : 'Unknown';
            const aosFirstPage = sessionStorage.getItem('klaviyo_first_page') || window.location.href;
            const aosSearchParams = (function() { try { return new URL(aosFirstPage).searchParams; } catch(e2) { return new URLSearchParams(window.location.search); } })();
            fetch(`https://a.klaviyo.com/client/events?company_id=${KLAVIYO_PUBLIC_API_KEY}`, {
              method: 'POST',
              headers: { accept: 'application/vnd.api+json', revision: KLAVIYO_API_REVISION, 'content-type': 'application/vnd.api+json' },
              body: JSON.stringify({
                data: {
                  type: 'event',
                  attributes: {
                    metric: { data: { type: 'metric', attributes: { name: 'Active on Site' } } },
                    profile: { data: { type: 'profile', attributes: { email: eventData.email } } },
                    properties: {
                      referrer: document.referrer || '',
                      uid: sessionStorage.getItem('uid') || aosSearchParams.get('uid') || '',
                      oid: sessionStorage.getItem('oid') || aosSearchParams.get('oid') || '',
                      sub5: sessionStorage.getItem('sub5') || aosSearchParams.get('sub5') || '',
                      C1: sessionStorage.getItem('C1') || sessionStorage.getItem('c1') || aosSearchParams.get('C1') || aosSearchParams.get('c1') || '',
                      affid: sessionStorage.getItem('affid') || aosSearchParams.get('affid') || '',
                      os: aosOs,
                      browser: aosBrowser,
                      initial_page_path: (function() { try { return new URL(aosFirstPage).pathname; } catch(e2) { return window.location.pathname; } })(),
                      page: window.location.href,
                    },
                    time: new Date().toISOString(),
                    unique_id: 'Active on Site_' + eventData.email + '_' + Date.now(),
                  },
                },
              }),
              keepalive: true,
            }).then(function(res) {
              if (res.ok) {
                try { sessionStorage.setItem('klaviyo_aos_sent', '1'); } catch(e) {}
                logKlaviyoLifecycle('active_on_site_sent', { email: (eventData.email || '').replace(/(.?).*@(.*)/, '$1***@$2') });
              } else {
                logKlaviyoTrace('failed', { eventName: 'Active on Site', status: res.status });
              }
            }).catch(function(e) {
              if (typeof console !== 'undefined' && console.error) console.error('Error sending Active on Site event', e);
            });
          } catch(e) {
            if (typeof console !== 'undefined' && console.error) console.error('Error sending Active on Site event', e);
          }
        }
      }
      return res;
    }).catch(function(err) {
      logKlaviyoLifecycle('profile_send_done', { status: 'fail' });
      logKlaviyoTrace('error', { eventName: eventName, error: String(err && err.message) });
      if (isTest && window.location.hostname === "localhost") {
        if (typeof console !== 'undefined' && console.error) console.error(`Klaviyo error for event '${eventName}':`, err);
      }
    });


  logKlaviyoLifecycle('subscription_skipped', { reason: 'no_list_id' });
  var subscriptionPromise = Promise.resolve();

  } else {
    profileOk = true; // already succeeded this submit attempt, allow event tracking
  }

  await Promise.allSettled([profilePromise, subscriptionPromise]);

  if (profileOk) {
    try {
      if (batchItems) {
        const payloads = batchItems.map((item, index) => {
          return {
            type: 'event',
            attributes: {
              metric: { data: { type: 'metric', attributes: { name: item.name } } },
              properties: { ...item.properties },
              time: new Date().toISOString(),
              unique_id: item.name + '_' + (eventData.email || '') + '_' + Date.now() + '_' + index,
            },
          };
        });
        const bulkRes = await fetch(`https://a.klaviyo.com/client/event-bulk-create?company_id=${KLAVIYO_PUBLIC_API_KEY}`, {
          method: 'POST',
          headers: { accept: 'application/vnd.api+json', revision: KLAVIYO_API_REVISION, 'content-type': 'application/vnd.api+json' },
          body: JSON.stringify({
            data: {
              type: 'event-bulk-create',
              attributes: {
                profile: { data: { type: 'profile', attributes: { email: eventData.email } } },
                events: { data: payloads },
              },
            },
          }),
          keepalive: true,
        });
        if (!bulkRes.ok && typeof console !== 'undefined' && console.warn) {
          console.warn('[Klaviyo] bulk event create failed', bulkRes.status);
        }
      } else {
        const eventPayload = {
          type: 'event',
          attributes: {
            metric: { data: { type: 'metric', attributes: { name: eventName } } },
            profile: { data: { type: 'profile', attributes: { email: eventData.email } } },
            properties: eventPropertiesToSend
              ? Object.assign({}, eventPropertiesToSend)
              : Object.assign({}, propertiesForKlaviyo, attributionProps, {
                  source: source,
                  page: "checkout",
                  page_type: "Checkout",
                  vrio_campaign_id: CAMPAIGN_ID,
                  klaviyo_event_name: eventName,
                }),
            time: new Date().toISOString(),
            unique_id: eventName + '_' + (eventData.email || '') + '_' + Date.now(),
          },
        };
        const eventRes = await fetch(`https://a.klaviyo.com/client/events?company_id=${KLAVIYO_PUBLIC_API_KEY}`, {
          method: 'POST',
          headers: { accept: 'application/vnd.api+json', revision: KLAVIYO_API_REVISION, 'content-type': 'application/vnd.api+json' },
          body: JSON.stringify({ data: eventPayload }),
          keepalive: true,
        });
        if (!eventRes.ok && typeof console !== 'undefined' && console.warn) {
          console.warn('[Klaviyo] event track failed', eventRes.status);
        }
      }
    } catch (e) {}
  }
}

async function validateAndSendToKlaviyo(eventData, eventName, source, eventPropertiesToSend, batchItems) {
  try {
    if (!eventData || !eventData.email || typeof EMAIL_OVERSIGHT_VALIDATE_URL === 'undefined' || !EMAIL_OVERSIGHT_VALIDATE_URL) {
      logKlaviyoTrace('EO skip (no URL or email), sending to Klaviyo', { eventName: eventName, source: source });
      await sendKlaviyoEvent(eventData, eventName, source, eventPropertiesToSend, batchItems);
      return;
    }

    logKlaviyoTrace('EO validate', { eventName: eventName, source: source, emailHint: (eventData.email || '').replace(/(.?).*@(.*)/, '$1***@$2') });

    const payload = {
      email: eventData.email,
      source,
    };

    const response = await fetch(EMAIL_OVERSIGHT_VALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!response.ok) {
      logKlaviyoTrace('EO request failed, fallback to Klaviyo', { eventName: eventName, status: response.status });
      await sendKlaviyoEvent(eventData, eventName, source, eventPropertiesToSend, batchItems);
      return;
    }

    const result = await response.json();

    if (result && result.valid === false) {
      logKlaviyoTrace('EO invalid, skipping Klaviyo', { eventName: eventName, reason: result.reason });
      return;
    }

    logKlaviyoTrace('EO valid, sending to Klaviyo', { eventName: eventName });
    await sendKlaviyoEvent(eventData, eventName, source, eventPropertiesToSend, batchItems);
  } catch (error) {
    logKlaviyoTrace('EO error, fallback to Klaviyo', { eventName: eventName, error: String(error && error.message) });
    await sendKlaviyoEvent(eventData, eventName, source, eventPropertiesToSend, batchItems);
  }
}

async function sendKlaviyoOrderEvents(sanitizedOrderData, result, includePlacedOrder) {
  if (typeof validateAndSendToKlaviyo !== 'function') return;
  if (!result || !result.order) return;
  const kCart = result.order.cart || null;
  const offers = (kCart && kCart.offers) || result.order.order_offers || [];
  const kIsCartItem = !!(kCart && kCart.offers);
  const kOrderId = result.order_id || result.order.order_id || '';
  const kIsTest = (result.order.is_test != null ? result.order.is_test : sanitizedOrderData.is_test) ? 1 : 0;
  const kCardTypeId = (result.order.customer_card && result.order.customer_card.card_type_id) || sanitizedOrderData.card_type_id;
  const kPaymentMethod = getKlaviyoPaymentMethod(sanitizedOrderData.payment_method_id, kCardTypeId);
  const kShipping = kCart ? kCart.total_shipping : '';
  const kTax = kCart ? kCart.total_tax : '';
  const kShippingMethod = kCart?.order?.shipping_profile_id || sanitizedOrderData.shipping_profile_id || '';
  const kExperiment = sessionStorage.getItem('convert_experiment_ids') || '';

  const orderedItems = [];
  const batchItems = [];

  for (let i = 0; i < offers.length; i++) {
    const item = offers[i];
    const kOrderOffer = kIsCartItem
      ? ((result.order.order_offers || []).find(oo => (oo.order_offer_items || [])[0] && oo.order_offer_items[0].item_id == item.item_id) || {})
      : item;
    const kOrderOfferItem = (kOrderOffer.order_offer_items || [])[0] || {};
    const kItemId = item.item_id || kOrderOfferItem.item_id || '';
    if (document.querySelector('[data-shippable-product-id="' + kItemId + '"]')) continue;

    const kProductEl = kItemId ? document.querySelector('[data-product-id="' + kItemId + '"]') : null;
    const kPriceEntry = (typeof prices !== 'undefined' && prices) ? prices.find(p => p.id === +kItemId) : null;

    const kItemName = (kPriceEntry && kPriceEntry.productName) || kOrderOfferItem.item_name || '';
    const kSku = kOrderOfferItem.item_sku || kItemName;
    const kOfferName = item.offer_name || item.offer_title || (typeof offerName !== 'undefined' ? offerName : '');
    const kQty = item.order_offer_quantity || 1;
    const kPackageQty = (kProductEl && Number(kProductEl.dataset.productQuantity)) || 1;
    const kSalePrice = Number(item.total || item.order_offer_price) || '';
    const kSubtotal = Number(item.subtotal || kSalePrice) || '';
    const kRegPrice = (kPriceEntry && kPriceEntry.fullPrice) || kSalePrice;
    const kIndividualPrice = (kQty > 0 && kPackageQty > 0) ? kSalePrice / (kQty * kPackageQty) : kSalePrice;
    const kDiscountCode = item.discount_code || '';

    const orderedProps = {
      name: kItemName, SKU: kSku, ProductName: kItemName,
      Quantity: kQty, packageQuantity: kPackageQty,
      individualPrice: kIndividualPrice, ItemPrice: kSalePrice, subtotal: kSubtotal,
      RowTotal: kSalePrice, total: kSalePrice, '$value': kSalePrice, regprice: kRegPrice,
      DiscountCode: kDiscountCode, PaymentMethod: kPaymentMethod,
      OrderId: kOrderId, isTestOrder: kIsTest,
      shippingMethod: kShippingMethod, shippingAmount: kShipping,
      tax: kTax,
      offer: kOfferName, page_type: "Checkout",
      hostName: window.location.hostname, pagePath: window.location.pathname,
      step: "Checkout", group: "front-end",
      ProductURL: window.location.href, experiment: kExperiment,
    };
    orderedItems.push(orderedProps);
    batchItems.push({ name: 'Ordered "' + kItemName + '"', properties: orderedProps });
  }

  if (batchItems.length > 0) {
    await validateAndSendToKlaviyo(sanitizedOrderData, null, 'order', null, batchItems);
  }

  if (includePlacedOrder) {
    const kTotal = kCart?.total || (result.order.order_offers || []).reduce((sum, oo) => sum + Number(oo.order_offer_price || 0), 0);
    const kSubtotal = kCart?.subtotal || kTotal;
    const kOfferNames = typeof offerName !== 'undefined' ? offerName : [...new Set(orderedItems.map(o => o.offer).filter(Boolean))].join(', ');

    await validateAndSendToKlaviyo(sanitizedOrderData, 'Placed Order for "$' + Number(kTotal).toFixed(2) + '"', 'order', {
      OrderId: kOrderId,
      isTestOrder: kIsTest,
      PaymentMethod: kPaymentMethod,
      subtotal: kSubtotal,
      shippingAmount: kShipping,
      shippingMethod: kShippingMethod,
      tax: kTax,
      total: kTotal, '$value': kTotal,
      DiscountCode: (kCart && kCart.order && kCart.order.discount_code) || sanitizedOrderData.discount_code || '',
      offer: kOfferNames, page_type: "Checkout", step: "Checkout",
      hostName: window.location.hostname, pagePath: window.location.pathname, from: 'klaviyo_lib', experiment: kExperiment,
      BillingAddress: JSON.stringify({
        FirstName: sanitizedOrderData.bill_fname || (kCart && kCart.bill_fname) || '', LastName: sanitizedOrderData.bill_lname || (kCart && kCart.bill_lname) || '',
        Address1: sanitizedOrderData.bill_address1 || (kCart && kCart.bill_address1) || '', Address2: sanitizedOrderData.bill_address2 || (kCart && kCart.bill_address2) || '',
        City: sanitizedOrderData.bill_city || (kCart && kCart.bill_city) || '',
        Region: sanitizedOrderData.bill_state || (kCart && kCart.bill_state) || '',
        RegionCode: (kCart && kCart.bill_state) || sanitizedOrderData.bill_state || '',
        PostalCode: sanitizedOrderData.bill_zipcode || (kCart && kCart.bill_zipcode) || '',
        CountryCode: sanitizedOrderData.bill_country || (kCart && kCart.bill_country) || '', Country: sanitizedOrderData.bill_country || (kCart && kCart.bill_country) || '',
        PhoneNumber: sanitizedOrderData.phone || '', EmailAddress: sanitizedOrderData.email || '',
      }),
      ShippingAddress: JSON.stringify({
        FirstName: sanitizedOrderData.ship_fname || (kCart && kCart.ship_fname) || '', LastName: sanitizedOrderData.ship_lname || (kCart && kCart.ship_lname) || '',
        Address1: sanitizedOrderData.ship_address1 || (kCart && kCart.ship_address1) || '', Address2: sanitizedOrderData.ship_address2 || (kCart && kCart.ship_address2) || '',
        City: sanitizedOrderData.ship_city || (kCart && kCart.ship_city) || '',
        Region: sanitizedOrderData.ship_state || (kCart && kCart.ship_state) || '',
        RegionCode: (kCart && kCart.ship_state) || sanitizedOrderData.ship_state || '',
        PostalCode: sanitizedOrderData.ship_zipcode || (kCart && kCart.ship_zipcode) || '',
        CountryCode: sanitizedOrderData.ship_country || (kCart && kCart.ship_country) || '', Country: sanitizedOrderData.ship_country || (kCart && kCart.ship_country) || '',
        PhoneNumber: sanitizedOrderData.phone || '', EmailAddress: sanitizedOrderData.email || '',
      }),
      Items: JSON.stringify(orderedItems.map(({ name, SKU, ProductName, Quantity, packageQuantity, ItemPrice, individualPrice, RowTotal, regprice, group, ProductURL }) => ({
        group, Quantity, ProductName, SKU, name, ItemPrice, individualPrice, RowTotal, packageQuantity, regprice, ProductURL,
      }))),
    }, null);
  }
}


function getVariantsToShip() {
  const variantSelect = document.querySelectorAll("[data-variant-selector]");
  const itemsToShip = Array.from(variantSelect).map((select) => {
    const variantSelects = Array.from(
      select.querySelectorAll("[data-variant]")
    );
    const variantSelected = variantSelects
      .map((variant) => variant.value)
      .filter(Boolean);
    return variants[0][0] + " - " + variantSelected.join(" - ");
  });
  
  const itemQuantities = new Map();
  itemsToShip.forEach((itemName) => {
    const shippableItem = shippableMap.get(itemName);
    if (shippableItem) {
      if (itemQuantities.has(shippableItem.id)) {
        itemQuantities.get(shippableItem.id).quantity += 1;
      } else {
        itemQuantities.set(shippableItem.id, {
          ...shippableItem,
          quantity: 1
        });
      }
    }
  });
  
  return Array.from(itemQuantities.values());
}

function getInPurchaseUpsells() {
  const allProducts = Array.from(
    document.querySelectorAll("[data-product-id]")
  ).filter((product) => !("productCard" in product.dataset));

  const upsells = allProducts
    .map((product) => {
    const clickBumpSelect = product.closest("[data-cb-select]");
      if (clickBumpSelect) {
        const option = product.closest("[data-cb-option]");
        const isActiveOption =
          !!option && option.classList.contains("cb-option-active");
        if (!isActiveOption) return;

        const upsellRoot = clickBumpSelect.closest("[data-upsell]");
        if (!upsellRoot) return;
        const upsellToggle = upsellRoot.querySelector(
          "input[type='checkbox']"
        );
        if (upsellToggle && !upsellToggle.checked) return;

        return {
          offer_id:
            getVrioOfferIdByProductId(product.dataset.productId) ??
            DEFAULT_OFFER_ID,
          item_id: Number(product.dataset.productId),
          order_offer_quantity:
            Number(product.getAttribute("data-non-shippable-quantity") || product.getAttribute("data-product-quantity")) || 1
        };
      }
      const isInput = product.tagName.toLowerCase() === "input";
      const input = product.querySelector("input");    
      const isBundledInActiveCard =
        product.hasAttribute('data-bundled-upsell') &&
        !!product.closest(".product-card-active");
      if (isBundledInActiveCard || (isInput && Number(product.value) > 0) || (input && input.checked)) {
        const offer = {
          offer_id:
            getVrioOfferIdByProductId(product.dataset.productId) ?? DEFAULT_OFFER_ID,
          item_id: Number(product.dataset.productId),
          order_offer_quantity: Number(product.value) || 1,
        }
        if (product.dataset.customIsGift && sessionStorage.getItem("p_freegift") === "y") {
          offer.order_offer_price = "0";
        }
        return offer;
      }
    })
    .filter(Boolean);

    const byId = new Map();
    upsells.forEach((u) => {
      const key = String(u.item_id);
      const prev = byId.get(key);
      if (
        !prev ||
        Number(u.order_offer_quantity || 0) >
        Number(prev.order_offer_quantity || 0)
      ) {
        byId.set(key, u);
      }
    });

  return Array.from(byId.values());
};


async function createOrderViaPaypal(isExpress = false) {
  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData);

  if (isTest && window.location.hostname === "localhost")
    console.log("Creating order", data);

  showPreloader(true);

  const {
    firstName,
    lastName,
    email,
    phone,
    shippingAddress1,
    shippingAddress2,
    shippingCity,
    shippingState,
    shippingCountry,
    shippingZip,
    billingAddress1,
    billingAddress2,
    billingCity,
    billingState,
    billingCountry,
    billingZip,
    billingFirstName,
    billingLastName
  } = data;

  const shippingStateEl = document.querySelector("[data-select-states]");
  const billingStateEl = document.querySelector("[data-billing-select-states]");
  const normalizedShipState = (shippingStateEl && shippingStateEl.dataset && shippingStateEl.dataset.hasStates === "true")
    ? shippingState
    : undefined;
  const normalizedBillState = (billingStateEl && billingStateEl.dataset && billingStateEl.dataset.hasStates === "true")
    ? billingState
    : undefined;
  const shippingProfileId = +document.querySelector(`[data-product-id="${selectedProduct.id}"]`)?.getAttribute('data-shipping-profile-id') || undefined;
  const sameAddress = isSameAddress();
  const orderData = {
    pageId: "DYEJeuRZY6KESPfRmfWmSdlhkVb65wSVEYs9xhR_3FD2WUkvy_jSuRmnzjUs8_-u",
    action: "process",
    campaign_id: CAMPAIGN_ID,
    connection_id: 1, // VRIO URL ending /connection
    email: email,
    phone: phone,
    ship_fname: firstName,
    ship_lname: lastName,
    ship_address1: shippingAddress1,
    ship_address2: shippingAddress2,
    ship_city: shippingCity,
    ship_state: normalizedShipState,
    ship_zipcode: shippingZip,
    ship_country: shippingCountry,
    bill_fname: billingFirstName || firstName,
    bill_lname: billingLastName || lastName,
    bill_address1: billingAddress1 || shippingAddress1,
    bill_address2: billingAddress2,
    bill_city: billingCity || shippingCity,
    bill_state: normalizedBillState || normalizedShipState,
    bill_zipcode: billingZip || shippingZip,
    bill_country: billingCountry || shippingCountry,
    same_address: sameAddress,
    payment_method_id: "6",

    offers: [
      {
        offer_id: getVrioOfferIdByProductId(selectedProduct.id) ?? DEFAULT_OFFER_ID,
        order_offer_quantity: 1,
        item_id: Number(selectedProduct.id),
        mainOffer: true
      },
    ],
    shipping_profile_id: shippingProfileId,
    ...getDataFromSessionStorage(),
    ip_address: await getClientIP(),
    ...(() => {
    function getQueryParamsCaseInsensitive() {
      const params = new URLSearchParams(window.location.search);
      const normalized = {};

      params.forEach((value, key) => {
        normalized[key.toLowerCase()] = value;
      });

      return normalized;
    }
    const params = getQueryParamsCaseInsensitive();

    const offerId = params['oid'] || params['offer_id'] || params['c1'];
    const c2 = params['c2'];
    const txid = params['_ef_transaction_id'] || EF.getTransactionId(offerId);
    const affId = params['affid'] || params['aff_id'];
    const sub1 = params['sub1'] || params['aff_sub'],
      sub2 = params['sub2'] || params['aff_sub2'],
      sub3 = params['sub3'] || params['aff_sub3'],
      sub4 = params['sub4'] || params['aff_sub4'],
      sub5 = params['sub5'] || params['aff_sub5'];
    const utmCampaign = params['utm_campaign'];
    const utmSource = params['utm_source'];
    const cardBinMapMidRec = sessionStorage.getItem('bin_map_mid_rec');
    const experimentsAndVariantsIds = sessionStorage.getItem('convert_experiment_ids');
    const isMobileDevice = 
      (navigator.userAgentData && navigator.userAgentData.mobile) ??
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const deviceType = isMobileDevice ? 'mobile' : 'desktop';


    return {
      tracking1: affId,

      tracking2: offerId,

      tracking3: c2,

      tracking4: txid,

      tracking5: sub1,

      tracking6: sub2,

      tracking7: sub3,

      tracking8: sub4,

      tracking9: sub5,

      tracking10: utmCampaign,

      tracking11: utmSource,

      tracking12: window.location.href,

      // "exp1_id : exp1_var_id, exp2_id : exp2_var_id, ..."
      // (Empty if no A/B testing experiments on the page)
      tracking13: experimentsAndVariantsIds,

      tracking14: cardBinMapMidRec,

      tracking15: deviceType,

      tracking17: window.location.href,
    };
  })()

  };

  const percentDiscount = sessionStorage.getItem("p_dc");
  if (sessionStorage.getItem("p_tenbucksoff") === "yes" && !percentDiscount) {
    orderData.offers[0].discount_code = "FLAT10";
  } else if (percentDiscount) {
    orderData.offers[0].discount_code = `DISCOUNT${percentDiscount}`;
  }

  const selectedProductElement = getProductElement(selectedProduct.id);
  saveProductCustomData(selectedProductElement);
  let { product, quantity } = getBindedShippableProductAndQuantity(selectedProductElement) ?? {};
  if (product) {
    orderData.offers.push({
      offer_id: getVrioOfferIdByProductId(product.id) ?? DEFAULT_OFFER_ID,
      item_id: Number(product.id),
      order_offer_quantity: quantity,
    });
  }
 
  getVariantsToShip().forEach((product) => {
    orderData.offers.push({
      offer_id: getVrioOfferIdByProductId(product.id) ?? DEFAULT_OFFER_ID,
      item_id: Number(product.id),
      order_offer_quantity: product.quantity,
    });
  });

  getInPurchaseUpsells().forEach((upsell) => {
    const upsellProductElement = getProductElement(upsell.item_id);
    saveProductCustomData(upsellProductElement);
    let { product, quantity } = getBindedShippableProductAndQuantity(upsellProductElement) ?? {};
    if (product) {
       orderData.offers.push({
        offer_id: getVrioOfferIdByProductId(product.id) ?? DEFAULT_OFFER_ID,
        item_id: Number(product.id),
        order_offer_quantity: quantity,
      });
    }
    orderData.offers.push(upsell);
  });

  if (sameAddress) {
    orderData.bill_address1 = shippingAddress1;
    orderData.bill_address2 = shippingAddress2;
    orderData.bill_city = shippingCity;
    orderData.bill_state = normalizedShipState;
    orderData.bill_zipcode = shippingZip;
    orderData.bill_country = shippingCountry;

    data.billingAddress1 = shippingAddress1;
    data.billingAddress2 = shippingAddress2;
    data.billingCity = shippingCity;
    data.billingCountry = shippingCountry;
    data.billingZip = shippingZip;
    data.billingState = shippingState;
  }

  const sanitizedOrderData = removeObjectUndefinedProperties(orderData);
  if (isExpress) {
    delete sanitizedOrderData.ship_fname
    delete sanitizedOrderData.ship_lname
    delete sanitizedOrderData.ship_address1
    delete sanitizedOrderData.ship_city
    delete sanitizedOrderData.ship_state
    delete sanitizedOrderData.ship_zipcode
    delete sanitizedOrderData.ship_country
    delete sanitizedOrderData.bill_fname
    delete sanitizedOrderData.bill_lname
    delete sanitizedOrderData.bill_address1
    delete sanitizedOrderData.bill_city
    delete sanitizedOrderData.bill_state
    delete sanitizedOrderData.bill_zipcode
    delete sanitizedOrderData.bill_country
  }
  sessionStorage.setItem("orderData", JSON.stringify(sanitizedOrderData));

  if (isTest && window.location.hostname === "localhost") {
    console.log("Sending order to VRIO", { sanitizedOrderData });
  }
  try { sessionStorage.removeItem('klaviyo_profile_updated'); } catch(e) {}
  try {
    if (typeof validateAndSendToKlaviyo === "function") {
      const klaviyoPreOrderData = { ...sanitizedOrderData };
      validateAndSendToKlaviyo(
        klaviyoPreOrderData,
        "Order Attempt - Pre-VRIO Submission",
        "order"
      );
    }
  } catch (error) {
    console.error("Error validating and sending to Klaviyo", error);
  }
  MVMT.track("ORDER_SUBMITTED", {
    page: "checkout",
    page_type: "Checkout",
    page_url: window.location.href,
    order_data: sanitizedOrderData,
  });

  let cartToken = await createCart(sanitizedOrderData);

  if (cartToken) {
    sessionStorage.setItem("cart_token", cartToken);
    let redirectUrl;
    if (cartToken) {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        redirectUrl = "https://app-cms-api-proxy-prod-001.azurewebsites.net/checkout";
      } else {
        redirectUrl = window.location.href;
      }
      let paymentTokenResponse = await fetch(
        `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/carts/${cartToken}/payment_tokens`,
        {
          method: "POST",
          headers: {
            authorization: `appkey ${INTEGRATION_ID}`,
            "Content-Type": "application/json",
            "connection": "keep-alive",
            "keep-alive": "utf-8"
          },
          body: JSON.stringify({ "redirect_url": redirectUrl, "payment_method_id": 6 })
        });
      orderData.redirect_url = redirectUrl;
      orderData.payment_token = paymentTokenResponse?.payment_token_id;
      orderData.cart_token = cartToken;
      const responseDataPaypal = await paymentTokenResponse.json();
      sessionStorage.setItem(
        "payment_token_id",
        responseDataPaypal.payment_token_id,
      );

      window.location.href = responseDataPaypal.post_data;
    }
  }
}

async function createOrderViaKlarna() {
  if (!isKlarnaEnabled) {
    showError("Klarna is not available");
    return;
  }

  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData);

  if (isTest && window.location.hostname === "localhost")
    console.log("Creating order (Klarna)", data);

  showPreloader(true);

  const {
    firstName,
    lastName,
    email,
    phone,
    shippingAddress1,
    shippingAddress2,
    shippingCity,
    shippingState,
    shippingCountry,
    shippingZip,
    billingAddress1,
    billingAddress2,
    billingCity,
    billingState,
    billingCountry,
    billingZip,
    billingFirstName,
    billingLastName
  } = data;

  const shippingStateEl = document.querySelector("[data-select-states]");
  const billingStateEl = document.querySelector("[data-billing-select-states]");
  const normalizedShipState =
    shippingStateEl &&
    shippingStateEl.dataset &&
    shippingStateEl.dataset.hasStates === "true"
      ? shippingState
      : undefined;
  const normalizedBillState =
    billingStateEl &&
    billingStateEl.dataset &&
    billingStateEl.dataset.hasStates === "true"
      ? billingState
      : undefined;
  const shippingProfileId =
    +document
      .querySelector(`[data-product-id="${selectedProduct.id}"]`)
      ?.getAttribute("data-shipping-profile-id") || undefined;

  const sameAddress = isSameAddress();

  const orderData = {
    pageId: "DYEJeuRZY6KESPfRmfWmSdlhkVb65wSVEYs9xhR_3FD2WUkvy_jSuRmnzjUs8_-u",
    campaign_id: CAMPAIGN_ID,
    connection_id: 1,
    email: email,
    phone: phone,
    ship_fname: firstName,
    ship_lname: lastName,
    ship_address1: shippingAddress1,
    ship_address2: shippingAddress2,
    ship_city: shippingCity,
    ship_state: normalizedShipState,
    ship_zipcode: shippingZip,
    ship_country: shippingCountry,
    bill_fname: billingFirstName || firstName,
    bill_lname: billingLastName || lastName,
    bill_address1: billingAddress1 || shippingAddress1,
    bill_address2: billingAddress2,
    bill_city: billingCity || shippingCity,
    bill_state: normalizedBillState || normalizedShipState,
    bill_zipcode: billingZip || shippingZip,
    bill_country: billingCountry || shippingCountry,
    same_address: sameAddress,
    payment_method_id: PAYMENT_METHODS_IDS.klarna,
    
    offers: [],
    shipping_profile_id: shippingProfileId,
    ...getDataFromSessionStorage(),
    ip_address: await getClientIP(),
    ...(() => {
    function getQueryParamsCaseInsensitive() {
      const params = new URLSearchParams(window.location.search);
      const normalized = {};

      params.forEach((value, key) => {
        normalized[key.toLowerCase()] = value;
      });

      return normalized;
    }
    const params = getQueryParamsCaseInsensitive();

    const offerId = params['oid'] || params['offer_id'] || params['c1'];
    const c2 = params['c2'];
    const txid = params['_ef_transaction_id'] || EF.getTransactionId(offerId);
    const affId = params['affid'] || params['aff_id'];
    const sub1 = params['sub1'] || params['aff_sub'],
      sub2 = params['sub2'] || params['aff_sub2'],
      sub3 = params['sub3'] || params['aff_sub3'],
      sub4 = params['sub4'] || params['aff_sub4'],
      sub5 = params['sub5'] || params['aff_sub5'];
    const utmCampaign = params['utm_campaign'];
    const utmSource = params['utm_source'];
    const cardBinMapMidRec = sessionStorage.getItem('bin_map_mid_rec');
    const experimentsAndVariantsIds = sessionStorage.getItem('convert_experiment_ids');
    const isMobileDevice = 
      (navigator.userAgentData && navigator.userAgentData.mobile) ??
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const deviceType = isMobileDevice ? 'mobile' : 'desktop';


    return {
      tracking1: affId,

      tracking2: offerId,

      tracking3: c2,

      tracking4: txid,

      tracking5: sub1,

      tracking6: sub2,

      tracking7: sub3,

      tracking8: sub4,

      tracking9: sub5,

      tracking10: utmCampaign,

      tracking11: utmSource,

      tracking12: window.location.href,

      // "exp1_id : exp1_var_id, exp2_id : exp2_var_id, ..."
      // (Empty if no A/B testing experiments on the page)
      tracking13: experimentsAndVariantsIds,

      tracking14: cardBinMapMidRec,

      tracking15: deviceType,

      tracking17: window.location.href,
    };
  })()

  };

  const selectedProductOfferData = getVrioOfferInfoByProductId(selectedProduct.id);
  if (!selectedProductOfferData?.isRecurringOffer) {
    orderData.offers.push({
      offer_id:
        selectedProductOfferData?.offerId ?? DEFAULT_OFFER_ID,
      order_offer_quantity: 1,
      item_id: Number(selectedProduct.id),
      mainOffer: true
    });
  }

  const percentDiscount = sessionStorage.getItem("p_dc");
  if (
    orderData.offers.length > 0 &&
    sessionStorage.getItem("p_tenbucksoff") === "yes" &&
    !percentDiscount
  ) {
    orderData.offers[0].discount_code = "FLAT10";
  } else if (orderData.offers.length > 0 && percentDiscount) {
    orderData.offers[0].discount_code = `DISCOUNT${percentDiscount}`;
  }

  const selectedProductElement = getProductElement(selectedProduct.id);
  saveProductCustomData(selectedProductElement);
  let { product, quantity } =
    getBindedShippableProductAndQuantity(selectedProductElement) ?? {};
  if (product) {
    const bindedOfferData = getVrioOfferInfoByProductId(product.id);
    if (!bindedOfferData?.isRecurringOffer) {
      orderData.offers.push({
        offer_id: bindedOfferData?.offerId ?? DEFAULT_OFFER_ID,
        item_id: Number(product.id),
        order_offer_quantity: quantity
      });
    }
  }

  getVariantsToShip().forEach((product) => {
    const variantOfferData = getVrioOfferInfoByProductId(product.id);
    if (!variantOfferData?.isRecurringOffer) {
      orderData.offers.push({
        offer_id: variantOfferData?.offerId ?? DEFAULT_OFFER_ID,
        item_id: Number(product.id),
        order_offer_quantity: product.quantity
      });
    }
  });

  getInPurchaseUpsells().forEach((upsell) => {
    const upsellOfferData = getVrioOfferInfoByProductId(upsell.item_id);
    if (upsellOfferData?.isRecurringOffer) {
      return;
    }
    const upsellProductElement = getProductElement(upsell.item_id);
    saveProductCustomData(upsellProductElement);
    let { product, quantity } =
      getBindedShippableProductAndQuantity(upsellProductElement) ?? {};
    if (product) {
      const upsellBindedOfferData = getVrioOfferInfoByProductId(product.id);
      if (!upsellBindedOfferData?.isRecurringOffer) {
        orderData.offers.push({
          offer_id: upsellBindedOfferData?.offerId ?? DEFAULT_OFFER_ID,
          item_id: Number(product.id),
          order_offer_quantity: quantity
        });
      }
    }
    orderData.offers.push(upsell);
  });

  if (orderData.offers.length === 0) {
    showPreloader(false);
    showError(i18n.errors.klarnaNotAvailableRecurring);
    return;
  }

  if (sameAddress) {
    orderData.bill_address1 = shippingAddress1;
    orderData.bill_address2 = shippingAddress2;
    orderData.bill_city = shippingCity;
    orderData.bill_state = normalizedShipState;
    orderData.bill_zipcode = shippingZip;
    orderData.bill_country = shippingCountry;

    data.billingAddress1 = shippingAddress1;
    data.billingAddress2 = shippingAddress2;
    data.billingCity = shippingCity;
    data.billingCountry = shippingCountry;
    data.billingZip = shippingZip;
    data.billingState = shippingState;
  }

  const sanitizedOrderData = removeObjectUndefinedProperties(orderData);

  if (isTest && window.location.hostname === "localhost") {
    console.log("Sending Klarna order to VRIO", { sanitizedOrderData });
  }

  try { sessionStorage.removeItem('klaviyo_profile_updated'); } catch(e) {}
  try {
    if (typeof validateAndSendToKlaviyo === "function") {
      const klaviyoPreOrderData = { ...sanitizedOrderData };
      validateAndSendToKlaviyo(
        klaviyoPreOrderData,
        "Order Attempt - Pre-VRIO Submission",
        "order"
      );
    }
  } catch (error) {
    console.error("Error validating and sending to Klaviyo", error);
  }

  MVMT.track("ORDER_SUBMITTED", {
    page: "checkout",
    page_type: "Checkout",
    page_url: window.location.href,
    order_data: sanitizedOrderData
  });

  try {
    const createResponse = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders`,
      {
        method: "POST",
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`,
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(sanitizedOrderData)
      }
    );

    const createResult = await createResponse.json();

    if (isTest && window.location.hostname === "localhost") {
      console.log("Klarna create order response:", createResult);
    }

    if (!createResponse.ok || !createResult.order_id) {
      const errorCode = (createResult && createResult.error && createResult.error.code) || null;
      if (
        createResponse.status === 400 &&
        errorCode &&
        ["offer_invalid", "campaign_invalid", "product_invalid"].includes(errorCode)
      ) {
        handleSystemError(errorCode);
        if (window.MVMT) {
          MVMT.track("ORDER_ERROR", {
            page: "checkout",
            page_type: "Checkout",
            page_url: window.location.href,
            order_data: sanitizedOrderData,
            response: createResult
          });
        }
        return;
      }

      showPreloader(false);
      let msg =
        (createResult && createResult.error && createResult.error.message) ||
        (createResult && createResult.message) ||
        i18n.errors.klarnaOrderFailed;
      msg = humanizeCountryError(msg);
      showError(msg);
      if (window.MVMT) {
        MVMT.track("ORDER_ERROR", {
          page: "checkout",
          page_type: "Checkout",
          page_url: window.location.href,
          order_data: sanitizedOrderData,
          response: createResult
        });
      }
      return;
    }

    const orderId = createResult.order_id;

    const addressData = { ...data, sanitizedOrderData };
    sessionStorage.setItem("orderData", JSON.stringify(sanitizedOrderData));
    sessionStorage.setItem("addressData", JSON.stringify(addressData));
    sessionStorage.setItem(
      "productCustomData",
      JSON.stringify(productCustomData)
    );
    sessionStorage.setItem("cms_oid", orderId);
    sessionStorage.setItem("orderids", JSON.stringify([orderId]));

    if (HAS_FOLLOWING_UPSELLS) {
      window.location.href = getNextPageSlugForRedirect();
      return;
    }

    try {
      await processAndRedirectToKlarna(
        orderId,
        removeKlarnaParamsFromUrl(),
      );
    } catch (processError) {
      showPreloader(false);
      const msg = humanizeCountryError(processError.message);
      showError(msg);
      if (window.MVMT) {
        MVMT.track("ORDER_ERROR", {
          page: "checkout",
          page_type: "Checkout",
          page_url: window.location.href,
          order_data: sanitizedOrderData,
          error: processError.message
        });
      }
    }
  } catch (error) {
    console.error("Klarna order error:", error);
    showPreloader(false);
    showError(i18n.errors.unexpectedError);
    if (window.MVMT) {
      MVMT.track("ORDER_ERROR", {
        page: "checkout",
        page_type: "Checkout",
        page_url: window.location.href,
        order_data: sanitizedOrderData,
        error: error.message || error,
      });
    }
  }
}

async function createOrderViaCreditCard() {
  const formData = new FormData(formEl);
  const data = Object.fromEntries(formData);

  let cartToken = sessionStorage.getItem('cart_token');

  if (isTest && window.location.hostname === "localhost")
    console.log("Creating order", data);

  showPreloader(true);

  const {
    firstName,
    lastName,
    email,
    phone,
    shippingAddress1,
    shippingAddress2,
    shippingCity,
    shippingState,
    shippingCountry,
    shippingZip,
    billingAddress1,
    billingAddress2,
    billingCity,
    billingState,
    billingCountry,
    billingZip,
    billingFirstName,
    billingLastName,
    creditCardNumber,
    expirationDate,
    CVV,
  } = data;

  
  const shippingStateEl = document.querySelector("[data-select-states]");
  const billingStateEl = document.querySelector("[data-billing-select-states]");
  const normalizedShipState = (shippingStateEl && shippingStateEl.dataset && shippingStateEl.dataset.hasStates === "true")
    ? shippingState
    : undefined;
  const normalizedBillState = (billingStateEl && billingStateEl.dataset && billingStateEl.dataset.hasStates === "true")
    ? billingState
    : undefined;
  const [exp_month, exp_year] = expirationDate.split("/");
  const sameAddress = isSameAddress();
  const shippingProfileId = +document.querySelector(`[data-product-id="${selectedProduct.id}"]`)?.getAttribute('data-shipping-profile-id') || undefined;

  let orderTotal = Math.max(0, Number(selectedProduct.price) * selectedProduct.quantity);

  const orderData = {
    pageId: "DYEJeuRZY6KESPfRmfWmSdlhkVb65wSVEYs9xhR_3FD2WUkvy_jSuRmnzjUs8_-u",
    action: "process",
    campaign_id: CAMPAIGN_ID,
    connection_id: 1, // VRIO URL ending /connection

    email: email,
    phone: phone,

    ship_fname: firstName,
    ship_lname: lastName,
    ship_address1: shippingAddress1,
    ship_address2: shippingAddress2,
    ship_city: shippingCity,
    ship_state: normalizedShipState,
    ship_zipcode: shippingZip,
    ship_country: shippingCountry,

    bill_fname: billingFirstName || firstName,
    bill_lname: billingLastName || lastName,
    bill_address1: billingAddress1 || shippingAddress1,
    bill_address2: billingAddress2,
    bill_city: billingCity || shippingCity,
    bill_state: normalizedBillState || normalizedShipState,
    bill_zipcode: billingZip || shippingZip,
    bill_country: billingCountry || shippingCountry,

    same_address: sameAddress,

    payment_method_id: 1,
    card_type_id: getCardType(creditCardNumber),
    card_number: creditCardNumber,
    card_exp_month: exp_month,
    card_exp_year: exp_year,
    card_cvv: CVV,

    cart_token: cartToken,

    offers: [
      {
        offer_id: getVrioOfferIdByProductId(selectedProduct.id) ?? DEFAULT_OFFER_ID,
        order_offer_quantity: 1,
        item_id: Number(selectedProduct.id),
        mainOffer: true
      },
    ],
    shipping_profile_id: shippingProfileId,
    ...getDataFromSessionStorage(),
    ip_address: await getClientIP(),
    ...(() => {
    function getQueryParamsCaseInsensitive() {
      const params = new URLSearchParams(window.location.search);
      const normalized = {};

      params.forEach((value, key) => {
        normalized[key.toLowerCase()] = value;
      });

      return normalized;
    }
    const params = getQueryParamsCaseInsensitive();

    const offerId = params['oid'] || params['offer_id'] || params['c1'];
    const c2 = params['c2'];
    const txid = params['_ef_transaction_id'] || EF.getTransactionId(offerId);
    const affId = params['affid'] || params['aff_id'];
    const sub1 = params['sub1'] || params['aff_sub'],
      sub2 = params['sub2'] || params['aff_sub2'],
      sub3 = params['sub3'] || params['aff_sub3'],
      sub4 = params['sub4'] || params['aff_sub4'],
      sub5 = params['sub5'] || params['aff_sub5'];
    const utmCampaign = params['utm_campaign'];
    const utmSource = params['utm_source'];
    const cardBinMapMidRec = sessionStorage.getItem('bin_map_mid_rec');
    const experimentsAndVariantsIds = sessionStorage.getItem('convert_experiment_ids');
    const isMobileDevice = 
      (navigator.userAgentData && navigator.userAgentData.mobile) ??
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const deviceType = isMobileDevice ? 'mobile' : 'desktop';


    return {
      tracking1: affId,

      tracking2: offerId,

      tracking3: c2,

      tracking4: txid,

      tracking5: sub1,

      tracking6: sub2,

      tracking7: sub3,

      tracking8: sub4,

      tracking9: sub5,

      tracking10: utmCampaign,

      tracking11: utmSource,

      tracking12: window.location.href,

      // "exp1_id : exp1_var_id, exp2_id : exp2_var_id, ..."
      // (Empty if no A/B testing experiments on the page)
      tracking13: experimentsAndVariantsIds,

      tracking14: cardBinMapMidRec,

      tracking15: deviceType,

      tracking17: window.location.href,
    };
  })()

  };

  const percentDiscount = sessionStorage.getItem("p_dc");
  if (sessionStorage.getItem("p_tenbucksoff") === "yes" && !percentDiscount) {
    orderData.offers[0].discount_code = "FLAT10";
  } else if (percentDiscount) {
    orderData.offers[0].discount_code = `DISCOUNT${percentDiscount}`;
  }

  const selectedProductElement = getProductElement(selectedProduct.id);
  saveProductCustomData(selectedProductElement);
  let { product, quantity } = getBindedShippableProductAndQuantity(selectedProductElement) ?? {};
  if (product) {
    const productFromPrices = prices.find( x => String(x.id) === String(product.id) );
    const productPrice = productFromPrices 
      ? Math.max(0, Number(productFromPrices.price) * productFromPrices.quantity)
      : 0;
    orderTotal += isNaN(productPrice) ? 0 : productPrice;
    orderData.offers.push({
      offer_id: getVrioOfferIdByProductId(product.id) ?? DEFAULT_OFFER_ID,
      item_id: Number(product.id),
      order_offer_quantity: quantity,
    });
  }

  getVariantsToShip().forEach((product) => {
    const productFromPrices = prices.find( x => String(x.id) === String(product.id) );
    const productPrice = productFromPrices 
      ? Math.max(0, Number(productFromPrices.price) * productFromPrices.quantity)
      : 0;
    orderTotal += isNaN(productPrice) ? 0 : productPrice;
    orderData.offers.push({
      offer_id: getVrioOfferIdByProductId(product.id) ?? DEFAULT_OFFER_ID,
      item_id: Number(product.id),
      order_offer_quantity: product.quantity,
    });
  });

  getInPurchaseUpsells().forEach((upsell) => {
    const upsellProductElement = getProductElement(upsell.item_id);
    saveProductCustomData(upsellProductElement);
    let { product, quantity } = getBindedShippableProductAndQuantity(upsellProductElement) ?? {};
    const productFromPrices = prices.find( x => String(x.id) === String(upsellProductElement?.dataset?.shippableProductId) );
    const productPrice = productFromPrices 
      ? Math.max(0, Number(productFromPrices.price) * productFromPrices.quantity)
      : 0;
    orderTotal += isNaN(productPrice) ? 0 : productPrice;
    if (product) {
       orderData.offers.push({
        offer_id: getVrioOfferIdByProductId(product.id) ?? DEFAULT_OFFER_ID,
        item_id: Number(product.id),
        order_offer_quantity: quantity,
      });
    }
    orderData.offers.push(upsell);
  });


  if (sameAddress) {
    orderData.bill_address1 = shippingAddress1;
    orderData.bill_address2 = shippingAddress2;
    orderData.bill_city = shippingCity;
    orderData.bill_state = normalizedShipState;
    orderData.bill_zipcode = shippingZip;
    orderData.bill_country = shippingCountry;

    data.billingAddress1 = shippingAddress1;
    data.billingAddress2 = shippingAddress2;
    data.billingCity = shippingCity;
    data.billingCountry = shippingCountry;
    data.billingZip = shippingZip;
    data.billingState = shippingState;
  }


  const sanitizedOrderData = removeObjectUndefinedProperties({
    ...orderData,
    custom: {
      kount_session_id: (typeof kountSessionIdForSticky !== 'undefined' && kountSessionIdForSticky) ? kountSessionIdForSticky : localStorage.getItem('kount_session_id'),
      orderTotal  
    }
  });

  if (cartToken) {
    sanitizedOrderData.cart_token = cartToken;
  } else {
    cartToken = await createCart(sanitizedOrderData);
    if (cartToken) {
      sanitizedOrderData.cart_token = cartToken;
      sessionStorage.setItem('cart_token', cartToken);
    }
  }

  if (isTest && window.location.hostname === "localhost") {
    console.log("Sending order to VRIO", { sanitizedOrderData });
  }
  MVMT.track("ORDER_SUBMITTED", {
    page: "checkout",
    page_type: "Checkout",
    page_url: window.location.href,
    order_data: sanitizedOrderData,
  });

  try {
    const response = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders`,
      {
        method: "POST",
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(sanitizedOrderData),
      }
    );

    if (response.status === 403) {
      handlePaymentDecline();
      if (window.MVMT) {
        MVMT.track("ORDER_ERROR", {
          page: "checkout",
          page_type: "Checkout",
          page_url: window.location.href,
          order_data: sanitizedOrderData,
          response: { error: "payment_declined", status: 403 },
        });
      }
      return;
    }

    const result = await response.json();

    if (isTest) console.log("VRIO Order Response", result);

    if (!response.ok || (result && result.error)) {
        var errorCode = (result && result.error && result.error.code) || null;
        
        if (response.status === 400 && errorCode && ["offer_invalid", "campaign_invalid", "product_invalid"].includes(errorCode)) {
          handleSystemError(errorCode);
          if (window.MVMT) {
            MVMT.track("ORDER_ERROR", {
              page: "checkout",
              page_type: "Checkout",
              page_url: window.location.href,
              order_data: sanitizedOrderData,
              response: result,
            });
          }
          return;
        }

        var msg = (result && result.error && result.error.message) || (result && result.message) || i18n.errors.creditCardOrderFailed;
        msg = humanizeCountryError(msg);
        showError(msg);

        if (window.MVMT) {
          MVMT.track("ORDER_ERROR", {
            page: "checkout",
            page_type: "Checkout",
            page_url: window.location.href,
            order_data: sanitizedOrderData,
            response: result,
          });
        }
        return;
      }

    MVMT.track("ORDER_SUCCESS", {
      page: "checkout",
      page_type: "Checkout",
      page_url: window.location.href,
      order_data: sanitizedOrderData,
      response: result,
    });

    try {
      if (typeof validateAndSendToKlaviyo === "function") {
        const klaviyoPostOrderData = {
          ...sanitizedOrderData,
          vrio_order_id: result.order_id,
          vrio_response_status: 'success',
        };
        await validateAndSendToKlaviyo(
          klaviyoPostOrderData,
          "Order Success - VRIO Confirmation",
          "order"
        );
      }
    } catch (error) {
      console.error("Error validating and sending to Klaviyo", error);
    }
    try {
      if (typeof sendKlaviyoOrderEvents === 'function') {
        await sendKlaviyoOrderEvents(sanitizedOrderData, result, true);
      }
    } catch (error) {
      console.error("Error sending order events to Klaviyo", error);
    }

    let orderSummary = sessionStorage.getItem("orderSummary");
    if (!orderSummary) {
      orderSummary = "[]";
    }
    const orderSummaryData = JSON.parse(orderSummary);
    const {creditCardNumber, CVV, expirationDate, ...addressData} = { ...data, sanitizedOrderData };

    orderSummaryData.push(result);
    sessionStorage.setItem("orderSummary", JSON.stringify(orderSummaryData));
    sessionStorage.setItem('addressData', JSON.stringify(addressData));
    sessionStorage.setItem('orderData', JSON.stringify(sanitizedOrderData));
    sessionStorage.setItem("productCustomData", JSON.stringify(productCustomData));
    sessionStorage.setItem('cms_oid', result.order_id);
    sessionStorage.setItem('orderids', JSON.stringify([result.order_id]));
    sendTransactionToDataLayer(vrioToTransaction(result), data.paymentOption);

    window.location.href = getNextPageSlugForRedirect();

  } catch (error) {
    console.error(error);
    showError(i18n.errors.unexpectedError);
  } finally {
    showPreloader(false);
  }
}
const vrioToTransaction = (orderResult) => {
  return {
    orderId: orderResult.order_id.toString(),
    customerId: orderResult.customer_id || orderResult.customerId,
    subtotal: orderResult.order.cart?.subtotal,
    tax: orderResult.order.cart?.total_tax,
    shippingAmount: orderResult.order.cart?.total_shipping,
    shippingMethod: orderResult.order.cart?.order.shipping_profile_id,
    total: orderResult.order.cart?.total,
    grandTotal: orderResult.order.cart?.total,
    isTestOrder: orderResult.order.is_test,
    line_items: orderResult.order.cart.offers.map((item) => {
      return {
        product_id: item.item_id,
        productName: item.item_name,
        quantity: item.order_offer_quantity,
        discount: item.discount,
        discountCode: item.discount_code,
        price: Number(item.total)
      }
    }),
    discountAmount: Number(orderResult.order.cart?.total_discount) || 0,
    couponCode: orderResult.order.cart?.order.discount_code || '',
  }
};
const sendTransactionToDataLayer = (response, paymentOption) => {
  const details = Array.isArray(response) ? response.at(-1) : response;
  const customerId = details.customerId || details.customer_id;
  const address = JSON.parse(sessionStorage.getItem('addressData'));
  sessionStorage.setItem('customerId', customerId);
  const transaction = {
    event: 'transaction',
    offer: offerName,
    customer_id: details.customerId.toString(),
    page: {
      type: "Checkout",
      isReload: performance.getEntriesByType('navigation')[0].type === 'reload',
      isExclude: false,
    },
    order: {
      id: details.orderId.toString(),
      subtotal: parseFloat(details.subtotal),
      tax: parseFloat(details.tax),
      shippingAmount: parseFloat(details.shippingAmount),
      shippingMethod: details.shippingMethod,
      paymentMethod: paymentOption,
      total: parseFloat(details.total),
      grandTotal: parseFloat(details.grandTotal),
      count: 1,
      step: "Checkout",
      isTestOrder: isTest || details.isTestOrder,
      product: details.line_items
        .reduce((acc, curr) => {
          if (acc.find((item) => item.product_id === curr.product_id)) {
            curr.quantity += acc.find(
              (item) => item.product_id === curr.product_id
            ).quantity;
          }
          return [...acc, curr];
        }, [])
        .map((item) => {
          const p = prices.find((p) => p.id === +item.product_id);
          let qty = 1;
          const productEl = document.querySelector(
            `[data-product-id="${item.product_id}"]`
          );
          if (productEl) qty = Number(productEl.dataset.productQuantity) || 1;
          if (p) {
            return {
              type: offerName,
              name: p.productName,
              price: item.price,
              regprice: p.fullPrice,
              individualPrice: item.price / (qty * item.quantity),
              quantity: item.quantity,
              packageQuantity: qty,
              group: "front-end",
            };
          }
          const variant = shippables.find((s) => s.id === +item.product_id);
          if (variant) {
            return {
              type: offerName,
              name: variant.name,
              price: 0.00,
              regprice: 0.00,
              individualPrice: 0.00,
              quantity: item.quantity,
              packageQuantity: 1,
              group: "front-end",
            };
          }
        }),
    },
    customer: {
      billingInfo: {
        address1: address.billingAddress1 ?? address.bill_address1,
        address2: address.billingAddress2 ?? address.bill_address2,
        city: address.billingCity ?? address.bill_city,
        country: address.billingCountry ?? address.bill_country,
        state: address.billingState ?? address.bill_state,
        postalCode: address.billingZip ?? address.bill_zipcode,
      },
      shippingInfo: {
        firstName: address.firstName ?? address.ship_fname,
        lastName: address.lastName ?? address.ship_lname,
        address1: address.shippingAddress1 ?? address.ship_address1,
        address2: address.shippingAddress2 ?? address.ship_address2,
        city: address.shippingCity ?? address.ship_city,
        countryCode: address.shippingCountry ?? address.ship_country,
        state: address.shippingState ?? address.ship_state,
        postalCode: address.shippingZip ?? address.ship_zipcode,
        emailAddress: address.email,
        phoneNumber: address.phone,
      },
    },
  };
  if (Number(details.discountAmount) > 0) {
    transaction.order.couponCode = details.couponCode;
  } else {
    transaction.order.couponCode = '';
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(transaction);
};

async function sendLead() {
  const formData = new FormData(formEl);
  const orderData = {
    connection_id: 1, // VRIO URL ending /connection
    campaignId: CAMPAIGN_ID,
    first_name: formData.get("firstName"),
    last_name: formData.get("lastName"),
    email: formData.get("email"),
    offers: [
      {
        offer_id: DEFAULT_OFFER_ID,
        order_offer_quantity: 1,
      },
    ],
  };

  const sanitizedOrderData = removeObjectUndefinedProperties(orderData);

  if (isTest && window.location.hostname === "localhost") {
    console.log("Sending Lead/Partial to VRIO", { sanitizedOrderData });
  }
  MVMT.track("LEAD_SUBMITTED", {
    page: "checkout",
    page_type: "Checkout",
    page_url: window.location.href,
    order_data: sanitizedOrderData,
  });
  try { sessionStorage.removeItem('klaviyo_profile_updated'); } catch(e) {}
  try {
    if (typeof validateAndSendToKlaviyo === "function") {
      const klaviyoLeadData = {
        ...sanitizedOrderData,
        firstName: sanitizedOrderData.first_name,
        lastName: sanitizedOrderData.last_name,
      };
      validateAndSendToKlaviyo(
        klaviyoLeadData,
        "Lead Submitted - VRIO Prospect",
        "lead"
      );
    }
  } catch (error) {
    console.error("Error validating and sending to Klaviyo", error);
  }
  await fetch(`https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/customers`, {
      method: "POST",
      headers: {
        authorization: `appkey ${INTEGRATION_ID}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(sanitizedOrderData),
      keepalive: false,
  });

  await createCart(sanitizedOrderData);
}

const fieldsAttributes = {
  "[data-email]": { name: "email" },
  "[data-first-name]": { name: "firstName" },
  "[data-last-name]": { name: "lastName" },
  "[data-billing-first-name]": { name: "billingFirstName" },
  "[data-billing-last-name]": { name: "billingLastName" },
  "[data-telephone]": { name: "phone" },
  "[data-line-1]": { name: "shippingAddress1" },
  "[data-line-2]": { name: "shippingAddress2" },
  "[data-city]": { name: "shippingCity" },
  "[data-select-countries]": { name: "shippingCountry" },
  "[data-select-states]": { name: "shippingState" },
  "[data-zip-code]": { name: "shippingZip" },
  "[data-billing-line-1]": { name: "billingAddress1" },
  "[data-billing-line-2]": { name: "billingAddress2" },
  "[data-billing-city]": { name: "billingCity" },
  "[data-billing-select-countries]": { name: "billingCountry" },
  "[data-billing-select-states]": { name: "billingState" },
  "[data-billing-zip-code]": { name: "billingZip" },
  "[data-month-year]": { name: "expirationDate" },
  "[data-card-number]": { name: "creditCardNumber" },
  "[data-card-cvv]": { name: "CVV" },
  "[data-phone]": { name: "phone" },
  "[data-submit-button]": { name: "submit_button" },
  "[data-full-name]": { name: "full_name" },
};
// countriesState has 23k+ rows, so we cache the result to avoid multiple heavy requests
let countriesStatesCache = null;

const getStates = async (countryIso2Code) => {
  const iso2 = String(countryIso2Code || '').toUpperCase();
  try {
    if (!countriesStatesCache) {
      const res = await fetch('/6a143c627bff10f9e9b45158-preview/scripts/countriesData/countriesStates.json', { cache: 'no-store' });
      const list = await res.json();
      countriesStatesCache = Array.isArray(list) ? list : [];
    }
    const found = countriesStatesCache.find(
      (c) => String(c.code || c.iso_2 || c.iso2 || '').toUpperCase() === iso2
    );
    const states = (found && Array.isArray(found.states)) ? found.states : [];
    return states.map(s => ({ iso2: s.iso2 || s.code || s.iso_2 || s.abbr || '', name: s.name || s.label || '' }));
  } catch (error) {
    console.error("Error getting states", error);
    return [];
  }
};

// Converts a SELECT element to a text INPUT in-place, copying all attributes.
// Returns the new INPUT element.
const convertStateToInput = (el) => {
  if (!el || el.tagName !== "SELECT") return el;
  var inputEl = document.createElement("input");
  inputEl.type = "text";
  Array.prototype.forEach.call(el.attributes, function(attr) {
    inputEl.setAttribute(attr.name, attr.value);
  });
  inputEl.value = "";
  inputEl.disabled = false;
  if (el.parentNode) el.parentNode.replaceChild(inputEl, el);
  return inputEl;
};

// Converts a text INPUT back to a SELECT in-place, copying attributes (except input-specific ones).
// Returns the new SELECT element.
const convertStateToSelect = (el) => {
  if (!el || el.tagName !== "INPUT") return el;
  var selectEl = document.createElement("select");
  Array.prototype.forEach.call(el.attributes, function(attr) {
    if (attr.name !== "type" && attr.name !== "value" && attr.name !== "placeholder") {
      selectEl.setAttribute(attr.name, attr.value);
    }
  });
  if (el.parentNode) el.parentNode.replaceChild(selectEl, el);
  return selectEl;
};

// populateStates accepts a CSS selector string so it always queries the live DOM element,
// which may be swapped between SELECT and INPUT as the country changes
// US and CA use a SELECT dropdown (known state codes); all other countries use a text INPUT
// so customers can type freely or let Google autocomplete fill the field
const populateStates = async (stateSelector, countryIso2Code) => {
  var stateEl = document.querySelector(stateSelector);
  if (!stateEl) return;

  const iso2 = String(countryIso2Code || '').toUpperCase();
  const useDropdown = iso2 === 'US' || iso2 === 'CA';
  const states = await getStates(iso2);

  if (!useDropdown) {
    // Non-US/CA: use a plain text input for free-form entry
    // Keep hasStates="true" so the value is still validated as required and included in the order payload
    stateEl = convertStateToInput(stateEl);
    stateEl.value = "";
    try { stateEl.dataset.hasStates = "true"; } catch (error) {
      console.error("Error setting dataset hasStates to true", error);
    }
    return;
  }

  if (!states || states.length === 0) {
    // US/CA but state data unavailable (fetch failure / unexpected shape): keep a SELECT
    // with a disabled placeholder rather than switching to a free-form INPUT
    stateEl = convertStateToSelect(stateEl);
    stateEl.disabled = true;
    stateEl.innerHTML = "";
    const unavailableOption = document.createElement("option");
    unavailableOption.disabled = true;
    unavailableOption.selected = true;
    unavailableOption.value = "";
    unavailableOption.innerText = i18n.labels.selectState;
    stateEl.appendChild(unavailableOption);
    return;
  }

  // US or CA with states: ensure it's a SELECT and populate it
  stateEl = convertStateToSelect(stateEl);
  stateEl.disabled = true;
  stateEl.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.disabled = true;
  defaultOption.selected = true;
  defaultOption.value = "";
  defaultOption.innerText = i18n.labels.selectState;
  stateEl.appendChild(defaultOption);
  try { stateEl.dataset.hasStates = 'true'; } catch (error) {
    console.error("Error setting dataset hasStates to true", error);
  }
  stateEl.disabled = false;

  states.forEach((state) => {
    const option = document.createElement("option");
    option.value = state.iso2 || '';
    option.innerText = state.name;
    stateEl.appendChild(option);
  });
};

const populateCountries = (countryEl) => {
  countryEl.innerHTML = "";
  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.iso_2;
    option.innerText = country.name;
    countryEl.appendChild(option);
  });

  try {
    const stripeState = window.__stripeExpress;
    const allowedShippingCountries = countries
      .map((c) => String(c.iso_2 || "").toUpperCase())
      .filter(Boolean);

    if (
      stripeState?.express &&
      typeof stripeState.express.update === "function"
      && allowedShippingCountries.length > 0
    ) {
      stripeState.express.update({ allowedShippingCountries });
    }
  } catch (error) {
    if (isTest) console.error(error);
  }
};


(function() {
  const _vpSessionKey = 'klaviyo_viewed_pages';

  function isValidEmailForKlaviyo(email) {
    if (!email) return false;
    return /^[^s@]+@[^s@]+.[^s@]+$/.test(String(email).trim());
  }

  function identifyKlaviyoEmail(email, source) {
    if (!isValidEmailForKlaviyo(email)) return false;
    try {
      window.klaviyo = window.klaviyo || [];
      window.klaviyo.push(["identify", { email: String(email).trim() }]);
      logKlaviyoLifecycle("identify_send", {
        source: source || "unknown",
        emailHint: String(email)
          .trim()
          .replace(/(.?).*@(.*)/, "$1***@$2")
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function bindEmailBlurIdentify() {
    var emailEl = document.querySelector("[data-email]");
    if (!emailEl) return;
    if (emailEl.dataset.klaviyoIdentifyBound === "1") return;
    emailEl.dataset.klaviyoIdentifyBound = "1";
    emailEl.addEventListener("blur", function () {
      identifyKlaviyoEmail(emailEl.value, "email_blur");
    });
  }

  function _fireViewedPage() {
    if (typeof KLAVIYO_PUBLIC_API_KEY === 'undefined' || !KLAVIYO_PUBLIC_API_KEY) return;
    bindEmailBlurIdentify();
    try {
      const eventDataRaw = sessionStorage.getItem("addressData");
      if (eventDataRaw) {
        const eventDataParsed = JSON.parse(eventDataRaw);
        if (eventDataParsed && eventDataParsed.email) {
          identifyKlaviyoEmail(
            eventDataParsed.email,
            "viewed_page_session_eventData"
          );
        }
      }
    } catch (e) {}
    try {
      var _vpVisited = [];
      try { _vpVisited = JSON.parse(sessionStorage.getItem(_vpSessionKey) || '[]'); } catch(e) {}
      var _vpPath = window.location.pathname;
      if (_vpVisited.indexOf(_vpPath) !== -1) return;
      _vpVisited.push(_vpPath);
      sessionStorage.setItem(_vpSessionKey, JSON.stringify(_vpVisited));
    } catch(e) {}
    window.klaviyo = window.klaviyo || [];
    window.klaviyo.push(['track', 'Viewed Page', {
      offer: typeof offerName !== 'undefined' ? offerName : '',
      page_type: "Checkout",
      hostName: window.location.hostname,
      pagePath: window.location.pathname,
      url: window.location.href,
    }]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _fireViewedPage);
  } else {
    _fireViewedPage()
  }
})();


document.addEventListener("DOMContentLoaded", async () => {
  
(function ensurePreloaderExists() {
    const existing = document.querySelector('[data-preloader]');
    if (existing) {
        if (!existing.getAttribute('data-testid')) {
            existing.setAttribute('data-testid', 'preloader');
        }
        const spinner = existing.querySelector('.loader');
        if (spinner && !spinner.getAttribute('data-testid')) {
            spinner.setAttribute('data-testid', 'preloader-spinner');
        }
        return;
    }
    const loaderOverlay = document.createElement('div');
    loaderOverlay.setAttribute('data-preloader', '');
    loaderOverlay.setAttribute('data-testid', 'preloader');
    loaderOverlay.innerHTML = `
        <div class="loader" data-testid="preloader-spinner"></div>
        <p>${i18n.labels.processing}</p>
    `;

    const loaderStyles = `
        [data-preloader] {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 8px;
            background: rgba(255, 255, 255, 0.3);
            z-index: 9999;
        }
        [data-preloader] .loader {
            width: 48px;
            height: 48px;
            border-bottom-color: transparent !important;
            border-radius: 50%;
            display: inline-block;
            box-sizing: border-box;
            animation: rotation 1s linear infinite;
            margin-top: 22px;
            border: 5px solid rgb(18, 76, 117);
        }

        @keyframes rotation {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }
    `;
    document.head.insertAdjacentHTML('beforeend', `<style>${loaderStyles}</style>`);
    document.body.appendChild(loaderOverlay);
})();

  try {
    initVrioWallets();
  } catch (error) {
    if (isTest) console.error(error);
  }

  for (const selector in fieldsAttributes) {
    const field = document.querySelector(selector);
    if (field) {
      Object.entries(fieldsAttributes[selector]).forEach(
        ([attribute, value]) => {
          field.setAttribute(attribute, value);
        }
      );
    }
  }
  
  

  
if (typeof validateAndSendToKlaviyo === "function") {
  try {
    var klaviyoDebugEnabled = false;
    try {
      klaviyoDebugEnabled = typeof isKlaviyoDebugEnabled === "function"
        ? isKlaviyoDebugEnabled()
        : !!(typeof window !== "undefined" && window.__KLAVIYO_DEBUG__ === true);
    } catch (e) {}
    var pageReadyPayload = {
      id: "log_" + Date.now() + "_" + Math.random().toString(16).slice(2, 8),
      timestamp: Date.now(),
      location: "builder-events/checkout/vrio-checkout-js-generator.ts" + ":KlaviyoLifecycle:page_ready",
      message: "Klaviyo lifecycle: page ready",
      runId: "initial",
      hypothesisId: "KlaviyoLifecycle",
      data: { pageName: "checkout", pageType: "Checkout" },
    };
    if (klaviyoDebugEnabled && typeof console !== "undefined" && console.log) {
      console.log("[Klaviyo lifecycle] page_ready " + JSON.stringify(pageReadyPayload.data));
    }
  } catch (e) {}
}

  let selectedProductEl = document.querySelector(
    `[data-product-id="${selectedProduct.id}"]`
  );
  const variantSelect = document.querySelector("[data-variant-selector]");

  const variantsBox = document.querySelector("[data-variants-box]");

  if (selectedProductEl) {
    selectedProductEl.classList.add("product-card-active");
    if (variantsBox) {
      variantsBox.innerHTML = "";
      for (let i = 0; i < Number(selectedProduct.quantity); i += 1) {
        variantsBox.appendChild(variantSelect.cloneNode(true));
      }
    }
  }

  returnPaypal();
  
  const allProducts = document.querySelectorAll("[data-product-id]");
  handleFreeShippingParam(allProducts);
  handleFreeGiftParam(allProducts);
  updateStripeElementsAmount();

  getShippingProfiles().then((profiles) => {
    shippingProfiles = profiles || [];
  });

  // Load International Telephone Input CSS
  if (!window.__telInitOnce) {
    window.__telInitOnce = true;
    const telInputEl = document.querySelector("[data-telephone]");
    telInputEl?.addEventListener("keyup", (e) => {
      if (e.target.value?.length <= 15) {
        return;
      }
      e.target.value = e.target.value.substring(0, 15);
    });
    if (telInputEl) {
      (function () {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href =
          "https://cdn.jsdelivr.net/npm/intl-tel-input@24.3.6/build/css/intlTelInput.css";
        document.head.appendChild(link);
        var script = document.createElement("script");
        script.setAttribute("is", "inline");
        script.src =
          "https://cdn.jsdelivr.net/npm/intl-tel-input@24.3.6/build/js/intlTelInput.min.js";
        document.body.appendChild(script);
      })();
      var PHONE_LOCALE_MAP = {"DE":"de-DE","ES":"es-ES","FR":"fr-FR","IT":"it-IT","US":"en-US","GB":"en-GB","AU":"en-AU","CA":"en-CA"};
      var regionNames = null;
      try { regionNames = new Intl.DisplayNames([PHONE_LOCALE_MAP[i18n.iso2] || LOCALE], { type: 'region' }); } catch {}
      var phoneI18n = Object.fromEntries(
        getCountries().map((c) => [
          c.iso_2.toLowerCase(),
          (regionNames ? regionNames.of(c.iso_2) : null) || c.name || c.iso_2,
        ])
      );
      phoneI18n.searchPlaceholder = i18n.labels.phoneSearchPlaceholder;
      var iti = window.intlTelInput(telInputEl, {
        utilsScript:
          "https://cdn.jsdelivr.net/npm/intl-tel-input@24.3.6/build/js/utils.js",
        initialCountry: i18n.phoneInitialCountry,
        strictMode: false,
        onlyCountries: (
          getCountries()
        ).map((c) => c.iso_2.toLowerCase()),
        i18n: phoneI18n,
      });
      document.querySelector(".iti").style = "width:100%;height:45.6px";
    }
  }


  calculateAddressMode();
  let isSameShippingAddress = isSameAddress();

  // Quantity picker functionality
  const quantityPickerAreas = Array.from(
    document.querySelectorAll("[data-quantity-picker-area]")
  );

  const minZero = (value) => (value < 0 ? 0 : value);

  quantityPickerAreas.forEach((quantityPickerArea) => {
    const quantityPickers = Array.from(
      quantityPickerArea.querySelectorAll("[data-quantity-picker]")
    );
    
    const qtyPickerCheckbox = quantityPickerArea.querySelector(
      "input[type='checkbox']"
    );
    
    const qtyPickerInputs =
    quantityPickerArea.querySelectorAll("[data-product-id]");
    
    if (qtyPickerCheckbox) {
      qtyPickerCheckbox.addEventListener("change", (event) => {
        if (!event.target.checked) {
          qtyPickerInputs.forEach((input) => (input.value = 0));
        } else {
          qtyPickerInputs.forEach((input) => (input.value = 1));
        }
      });
    }
    
    quantityPickers.forEach((picker, i) => {
      const pickerInput = picker.querySelector("[data-product-id]");
      const addBtn = picker.querySelector("[data-add]");
      const removeBtn = picker.querySelector("[data-remove]");
      const inputMax = pickerInput.getAttribute("max") ? parseInt(pickerInput.getAttribute("max")) : 3;

      const maximumAmount = document.querySelector(
        "[data-picker-maximum-amount]"
      );
      pickerInput.addEventListener("input", (event) => {
        const { value } = event.target;
        if (Number(value) < 0) {
          pickerInput.value = 0;
        }
        if (Number(value) > inputMax) {
          pickerInput.value = inputMax;
        }
      });

      if (addBtn) {
        addBtn.addEventListener("click", () => {
          if (Number(pickerInput.value) + 1 > inputMax) {
            if (maximumAmount) {
              const maximumText = maximumAmount.querySelector("[data-maximum-amount]");
              if (maximumText) {
                maximumText.innerHTML = inputMax;
              }
              maximumAmount.style.display = "inline";
            }
            return;
          }

          pickerInput.value = minZero(Number(pickerInput.value) + 1);
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          pickerInput.value = minZero(Number(pickerInput.value) - 1);
          if (maximumAmount && maximumAmount.style.display === "inline") {
            maximumAmount.style.display = "none";
          }
          if ([...qtyPickerInputs].every((p) => p.value <= 0)) {
            if (qtyPickerCheckbox) {
              qtyPickerCheckbox.click();
            }
            return;
          }
        });
      }
    });
  });

  function getInputs() {
    if (isSameShippingAddress) {
      return document.querySelectorAll(`
        [data-first-name], 
        [data-last-name], 
        [data-email], 
        [data-telephone],
        [data-card-number],
        [data-month-year],
        [data-card-cvv],
        [data-line-1],
        [data-city],
        [data-select-countries],
        [data-select-states],
        [data-zip-code]
      `);
    }

    return document.querySelectorAll(`
      [data-first-name], 
      [data-last-name], 
      [data-email], 
      [data-telephone],
      [data-card-number],
      [data-month-year],
      [data-card-cvv],
      [data-line-1],
      [data-city],
      [data-select-countries],
      [data-select-states],
      [data-zip-code],
      [data-billing-first-name],
      [data-billing-last-name],
      [data-billing-line-1],
      [data-billing-city],
      [data-billing-select-countries],
      [data-billing-select-states],
      [data-billing-zip-code]
    `);
  }

  formEl = document.querySelector("[data-payment-form]");
  if (formEl) {
    formEl.addEventListener("submit", () => {
      const selectedPaymentMethod = document.querySelector(
        'input[name="paymentOption"]:checked'
      )?.value;

      if (selectedPaymentMethod === "paypal" || selectedPaymentMethod === "klarna") {
        const cardDataSelectors = [
          "[data-month-year]",
          "[data-card-number]",
          "[data-card-cvv]"
        ];
        const selectorsToRemove = new Set(cardDataSelectors);
        cardDataSelectors.forEach((dataSelector) => {
          const fieldName = fieldsAttributes?.[dataSelector]?.name;
          if (fieldName) {
            selectorsToRemove.add(`[name='${fieldName}']`);
          }
        });
        selectorsToRemove.forEach((selector) => {
          try {
            validate.removeField(selector);
          } catch (error) {
            console.error("Error removing field from validation", error);
          }
        });
        cardValidationRegistered = false;
      } else {
        registerCardValidation();
      }
      return false;
    });
  }

  generalError = document.querySelector("[data-general-error]");

  const validate = new JustValidate(formEl, {
    validateBeforeSubmitting: true,
    validateOnBlur: true,
    focusInvalidField: true,
    lockForm: true,
    errorFieldCssClass: "is-invalid",
    errorLabelCssClass: "error-message",
    errorLabelStyle: {
      color: "#ff3860",
      marginTop: "0.25rem",
      marginBottom: "0.25rem",
      fontSize: "0.875rem",
      width: "100%"
    },
  });

  window.validate = validate;

  const originalRevalidateField = validate.revalidateField.bind(validate);
  validate.revalidateField = async (selector) => {
    const aliasMap = {
      "[data-line-1]": "[name='shippingAddress1']",
      "[data-city]": "[name='shippingCity']",
      "[data-zip-code]": "[name='shippingZip']",
      "[data-select-countries]": "[name='shippingCountry']",
      "[data-select-states]": "[name='shippingState']",
      "[data-billing-line-1]": "[name='billingAddress1']",
      "[data-billing-city]": "[name='billingCity']",
      "[data-billing-zip-code]": "[name='billingZip']",
      "[data-billing-select-countries]": "[name='billingCountry']",
      "[data-billing-select-states]": "[name='billingState']",
    };

    const mappedSelector = aliasMap[selector] || selector;

    try {
      return await originalRevalidateField(mappedSelector);
    } catch (e) {
      if (isTest) {
        console.error("JustValidate revalidateField error", { selector, mappedSelector, error: e });
      }
      throw e;
    }
  };

  const ccCardPatterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    master:
      /^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$/,
    maestro: /^(5018|5020|5038|5612|5893|6304|6390|6759|676[1-3]|0604)/,
    amex: /^3[47][0-9]{13}$/,
    diners: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    jcb: /^(?:2131|1800|35d{3})d{11}$/,
    solo: /^(6334|6767)/,
    laser: /^(6304|670[69]|6771)/
  };
  const ccCardStarts = {
    visa: /^4[0-9]/,
    master: /^((5[1-5])|(2[2-7][0-9]))/,
    maestro: /^(5018|5020|5038|5612|5893|6304|6390|6759|676[1-3]|0604)/,
    amex: /^3[47]/,
    discover: /^6(?:011|5[0-9]{2})/,
    jcb: /^(?:21|180|35)/,
    diners: /^3(?:0[0-5]|[68][0-9])/,
    solo: /^(6334|6767)/,
    laser: /^(6304|670[69]|6771)/
  };
  const detectCcCardType = (digits) =>
    Object.keys(ccCardStarts).find((k) => ccCardStarts[k].test(digits)) ||
    "unknown";
  const getCcCardNumberMaxLength = (cardType) => {
    const maxLengths = {
      visa: 16,
      master: 16,
      amex: 15,
      diners: 14,
      discover: 16,
      jcb: 16
    };
    if (!maxLengths.hasOwnProperty(cardType)) {
      return 16;
    }
    return maxLengths[cardType];
  };
  const isValidCcCardNumber = (digits, cardType) => {
    if (!digits) return false;
    if (typeof cardType !== "string") return false;
    const maxLength = getCcCardNumberMaxLength(cardType);
    if (digits.length > maxLength) return false;
    if (ccCardPatterns[cardType]) return ccCardPatterns[cardType].test(digits);
    return Object.values(ccCardPatterns).some((rx) => rx.test(digits));
  };

  let cardValidationRegistered = false;
  const registerCardValidation = () => {
    if (cardValidationRegistered) return;
    validate
      .addField("[name='expirationDate']", [
        {
          rule: "required",
          errorMessage: i18n.validation.expirationDateRequired
        },
        {
          validator: (value) => {
            // Expecting MM/YY
            const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
            if (!regex.test(value)) return false;

            const [month, year] = value.split("/").map(Number);

            // Convert YY → YYYY (20xx)
            const fullYear = 2000 + year;

            const now = new Date();
            const expiry = new Date(fullYear, month); // first day of next month

            return expiry > now;
          },
          errorMessage: i18n.validation.expirationDateInvalid
        }
      ])
      .addField("[name='creditCardNumber']", [
        {
          validator: (value) => {
            const digits = String(value || "")
              .trim()
              .replace(/[s-]/g, "");
            if (!digits) return false;
            const cardType = detectCcCardType(digits);
            return isValidCcCardNumber(digits, cardType);
          },
          errorMessage: i18n.validation.cardNumberInvalid
        }
      ])
      .addField("[name='CVV']", [
        {
          rule: "required",
          errorMessage: i18n.validation.cardCvvRequired
        },
        {
          rule: 'minLength',
          value: 3,
          errorMessage: i18n.validation.cardCvvMinLength,
        }
      ]);
    cardValidationRegistered = true;
  };
  registerCardValidation();

  // Just Validate validation for each field in the form
  validate
    .addField("[name='email']", [
      {
        rule: "required",
        errorMessage: i18n.validation.emailRequired,
      },
      {
        rule: "email",
        errorMessage: i18n.validation.emailInvalid,
      },
      {
        rule: "maxLength",
        value: 255,
        errorMessage: i18n.validation.maxLength255,
      },
    ])
    .addField("[name='firstName']", [
      {
        rule: "required",
        errorMessage: i18n.validation.firstNameRequired,
      },
      {
        rule: "maxLength",
        value: 255,
        errorMessage: i18n.validation.maxLength255,
      },
      {
        rule: "customRegexp",
        value: i18n.validationPatterns.nameRegex,
        errorMessage: i18n.validation.invalidCharacter,
      },
    ])
    .addField("[name='lastName']", [
      {
        rule: "required",
        errorMessage: i18n.validation.lastNameRequired,
      },
      {
        rule: "maxLength",
        value: 255,
        errorMessage: i18n.validation.maxLength255,
      },
      {
        rule: "customRegexp",
        value: i18n.validationPatterns.nameRegex,
        errorMessage: i18n.validation.invalidCharacter,
      },
    ])
    .addField("[name='shippingAddress1']", [
      {
        rule: "required",
        errorMessage: i18n.validation.shippingAddressRequired,
      },
      {
        rule: "maxLength",
        value: 255,
        errorMessage: i18n.validation.maxLength255,
      },
    ])
    .addField("[name='shippingCity']", [
      {
        rule: "required",
        errorMessage: i18n.validation.cityRequired,
      },
      {
        rule: "maxLength",
        value: 255,
        errorMessage: i18n.validation.maxLength255,
      },
    ])
    .addField("[name='shippingCountry']", [
      {
        rule: "required",
        errorMessage: i18n.validation.countryRequired,
      },
    ])
    .addField("[name='shippingZip']", [
      {
        rule: "required",
        errorMessage: i18n.validation.zipRequired,
      },
      {
        rule: "customRegexp",
        value: i18n.validationPatterns.zipCodeRegex,
        errorMessage: i18n.validation.zipInvalid,
      },
    ])
    .onFail((fields) => {
      const fieldsArray = Object.entries(fields);
      for (let i = 0; i < fieldsArray.length; i += 1) {
        const [fieldSelector, data] = fieldsArray[i];
        const field = document.querySelector(fieldSelector);
        data.isValid
          ? field.classList.remove("error")
          : field.classList.add("error");
      }
      const id = setTimeout(() => {
        const firstInvalidField = document.querySelector(".is-invalid");
        firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalidField.focus();
        clearTimeout(id);
      }, 150);
    })
    .onSuccess((events) => {
      if (isTest) console.log(events);
      const paymentOption = document.querySelector(
        'input[name="paymentOption"]:checked'
      )?.value;
      if (paymentOption === "paypal") {
        createOrderViaPaypal();
      } else if (paymentOption === "klarna") {
        createOrderViaKlarna();
      } else {
        createOrderViaCreditCard();
      }
    });
    if (iti) {
      validate.addField("[name='phone']", [
        {
          validator: (value) => {
            if (!value.trim()) return false;
            return i18n.phoneValidator ? i18n.phoneValidator(value, iti) : iti.isValidNumber();
          },
          errorMessage: i18n.validation.phoneInvalid,
        },
      ]);
    }
    const shippingStateEl = document.querySelector("[data-select-states]");
    if (shippingStateEl) {
      validate.addField("[name='shippingState']", [
        {
          validator: () => {
            const el = document.querySelector("[data-select-states]");
            const hasStates = el && el.dataset && el.dataset.hasStates === "true";
            return Boolean(!hasStates || (el && el.value && el.value.trim() !== ""));
          },
          errorMessage: i18n.validation.stateRequired,
        }
      ])
      shippingStateEl.addEventListener('change', () => {
        validate.revalidateField("[name='shippingState']");
      });
    }
    document.querySelectorAll('[data-paypal-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        createOrderViaPaypal(true);
      });
    });

    async function initializeFormValidation() {
      const fields = getInputs();

      let debounceTimer;
      Array.from(fields).forEach(async (field) => {
        const selector = `[name='${field.getAttribute("name")}']`;
        if (field.value) await validate.revalidateField(selector);
        field.addEventListener("input", async () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            await validate.revalidateField(selector);
          }, 500);
        });
        if (field.tagName === "SELECT") {
          field.addEventListener("change", async () => await validate.revalidateField(selector));
        }
        field.addEventListener("blur", async () => await validate.revalidateField(selector));
      });
    }

  const billShipSameCheckbox = document.getElementById("billShipSame");
  if (billShipSameCheckbox) {
    billShipSameCheckbox.addEventListener("change", () => {
      isSameShippingAddress = billShipSameCheckbox.checked;
      modifyFormValidation();
      initializeFormValidation();
    });
  }

  function modifyFormValidation() {
    const billingValidationFields = [
      {
        selector: "[name='billingFirstName']",
        rules: [
          {
            rule: "required",
            errorMessage: i18n.validation.firstNameRequired,
          },
          {
            rule: "maxLength",
            value: 255,
            errorMessage: i18n.validation.maxLength255,
          },
          {
            rule: "customRegexp",
            value: i18n.validationPatterns.nameRegex,
            errorMessage: i18n.validation.invalidCharacter,
          }
        ]
      },
      {
        selector: "[name='billingLastName']",
        rules: [
          {
            rule: "required",
            errorMessage: i18n.validation.lastNameRequired,
          },
          {
            rule: "maxLength",
            value: 255,
            errorMessage: i18n.validation.maxLength255,
          },
          {
            rule: "customRegexp",
            value: i18n.validationPatterns.nameRegex,
            errorMessage: i18n.validation.invalidCharacter,
          }
        ]
      },
      {
        selector: "[name='billingAddress1']",
        rules: [
          { rule: "required", errorMessage: i18n.validation.billingAddressRequired },
        ],
      },
      {
        selector: "[name='billingCity']",
        rules: [
          { rule: "required", errorMessage: i18n.validation.billingCityRequired },
        ],
      },
      {
        selector: "[name='billingCountry']",
        rules: [
            {
              rule: "required",
              errorMessage: i18n.validation.countryRequired,
            }
        ],
      },
      {
        selector: "[name='billingState']",
        rules: [
          {
            validator: () => {
              const el = document.querySelector("[data-billing-select-states]");
              const hasStates = el && el.dataset && el.dataset.hasStates === "true";
              return Boolean(!hasStates || (el && el.value && el.value.trim() !== ""));
            },
            errorMessage: i18n.validation.stateRequired,
          }
        ]
      },
      {
        selector: "[name='billingZip']",
        rules: [
          { rule: "required", errorMessage: i18n.validation.billingZipRequired },
          { rule: "customRegexp", value: i18n.validationPatterns.zipCodeRegex, errorMessage: i18n.validation.zipInvalid },
        ],
      },
    ];

    if (isSameShippingAddress) {
      billingValidationFields.forEach(({ selector }) => {
        if (document.querySelector(selector)) {
          try {
            validate.removeField(selector);
          } catch (error) {
            console.error("Error removing field from validation", error);
          }
        }
      });
    } else {
      billingValidationFields.forEach(({ selector, rules }) => {
        if (document.querySelector(selector)) {
          try {
            validate.addField(selector, rules);
          } catch (error) {
            console.error("Error adding field to validation", error);
          }
        }
      });
    }
  }

  modifyFormValidation();

  const cardInput = document.querySelector("[data-card-number]");
  cardInput.addEventListener("input", (e) => {
    const digits = e.target.value.replace(/[s-]/g, "");
    if (!digits) return;
    const cardType = detectCcCardType(digits);
    const maxLength = getCcCardNumberMaxLength(cardType);
    if (digits.length > maxLength) {
      const digitsOnly = e.target.value.replace(/[s-]/g, "");
      e.target.value = digitsOnly.slice(0, maxLength);
    }
  });
  // Card expirity date validation
  const dateinput = document.querySelector("[data-month-year]");
  dateinput.addEventListener("beforeinput", (e) => {
    const input = e.data;
    if (input && !/[0-9/]/.test(input)) {
      e.preventDefault();
    }
  });

  dateinput.addEventListener("input", (e) => {
    const value = dateinput.value;

    if (e.inputType === "deleteContentBackward") {
      return;
    }

    if (value.length > 1 && value[2] !== "/") {
      dateinput.value = `${value.slice(0, 2)}/` + value.slice(2);
    }

    if (value.length === 1 && value[0] !== "0" && value[0] !== "1") {
      dateinput.value = `0${value[0]}/`;
    }

    if (value[0] === "1" && value.length > 1 && Number(value[1]) > 2) {
      dateinput.value = `01/${value[1]}`;
    }
  });

  const emailEl = document.querySelector("[data-email]");
  const firstNameEl = document.querySelector("[data-first-name]");
  const lastNameEl = document.querySelector("[data-last-name]");
  emailEl.addEventListener("blur", () => {
    if (
      firstNameEl.value != "" &&
      lastNameEl.value != "" &&
      /(?:[a-z0-9+!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i.test(emailEl.value)
    ) {
      // sendLead();
    }
  });


  const productsElements = document.querySelectorAll(
    "[data-products] [data-product-id]:not([data-bundled-upsell])"
  );

  function setClickBumpOptionActive(group, optionToSelect) {
    group.querySelectorAll("[data-cb-option]").forEach((o) => {
      o.classList.toggle("cb-option-active", o === optionToSelect);
    });
    const productEl = optionToSelect.matches("[data-product-id]") ? optionToSelect : optionToSelect.querySelector("[data-product-id]");
    const price = productEl ? prices.find((p) => String(p.id) === String(productEl.dataset?.productId)) : undefined;
    const rawPrice = price?.finalPrice ?? price?.price ?? null;
    if (typeof window.setClickBumpOptionActiveCallback === "function") {
      window.setClickBumpOptionActiveCallback?.(group, optionToSelect, {
        formattedPrice: Number.isFinite(rawPrice) ? formatPrice(rawPrice) : null
      });
    }
  }

  productsElements.forEach((card) => {
    card.addEventListener("click", () => {
      selectedProduct = prices.find(
        (price) => price.id === Number(card.getAttribute("data-product-id"))
      );
      if (isTest) console.log(selectedProduct);

      productsElements.forEach((card) => {
        card.classList.remove("product-card-active");
      });
      card.classList.add("product-card-active");
      if (variantsBox) {
        variantsBox.innerHTML = "";
        const qty = card.getAttribute("data-product-quantity") || selectedProduct.quantity;
        for (let i = 0; i < Number(qty); i += 1) {
          variantsBox.appendChild(variantSelect.cloneNode(true));
        }
      }
      if (typeof window.onProductCardSelected === "function") {
        window.onProductCardSelected(card, selectedProduct);
      }
    });
  });

  document.querySelectorAll("[data-cb-select]").forEach((group) => {
    const options = Array.from(group.querySelectorAll("[data-cb-option]"));
    const activeOption = options.find((o) => o.classList.contains("cb-option-active")) || options[0];
    if (activeOption) setClickBumpOptionActive(group, activeOption);

    const checkbox = group.closest("[data-upsell]")?.querySelector("input[type='checkbox']") ?? null;
    if (checkbox) {
      checkbox.addEventListener("change", () => window.updateSummary?.());
    }

    options.forEach((option) => {
      option.addEventListener("click", () => {
        setClickBumpOptionActive(group, option);
        window.updateSummary?.();
      });
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has("package")) {
    const pkgSize = params.get("package");
    productsElements.forEach((product) => {
      product.style.order = product.dataset.productQuantity
      if (product.dataset.productQuantity == pkgSize) {
        product.style.order = "-1";
          product.classList.add("product-card-active")
          selectedProduct = prices.find(
            (price) => price.id === Number(product.getAttribute("data-product-id"))
          );
      } else {
          product.classList.remove("product-card-active")
      }
    });
  }

  const countryEl = document.querySelector("[data-select-countries]");
  populateCountries(countryEl);
  await populateStates("[data-select-states]", countryEl.value);
  countryEl.addEventListener("change", async (event) => {
    await populateStates("[data-select-states]", event.target.value);
  });

  const billingCountryEl = document.querySelector(
    "[data-billing-select-countries]"
  );
  if (billingCountryEl) {
    populateCountries(billingCountryEl);
    await populateStates("[data-billing-select-states]", billingCountryEl.value);
    billingCountryEl.addEventListener("change", async (event) => {
      await populateStates("[data-billing-select-states]", event.target.value);
    });
  }

const creditDetails = document.getElementById("creditCardDetails");

const hideKlarnaPaymentOption = () => {
  if (isKlarnaEnabled) return;

  const hideElement = (element) => {
    if (!element) return;
    element.style.setProperty("display", "none", "important");
    element.setAttribute("aria-hidden", "true");
  };

  const klarnaInputs = Array.from(
    document.querySelectorAll(
      'input[name="paymentOption"][value="klarna"], div[name="paymentMethod"][value="klarna"] input[type="radio"], [data-payment-method="klarna"] input[type="radio"]'
    )
  );

  klarnaInputs.forEach((input) => {
    if (!input) return;
    if (input.checked) {
      input.checked = false;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    input.disabled = true;
    hideElement(input);
    hideElement(input.closest(".payment-method-header"));
    hideElement(input.closest('div[name="paymentMethod"]'));
  });

  document
    .querySelectorAll('div[name="paymentMethod"][value="klarna"], [data-payment-method="klarna"]')
    .forEach((element) => hideElement(element));
};

hideKlarnaPaymentOption();

  const paymentOptions = document.querySelectorAll(
    'input[name="paymentOption"], div[name="paymentMethod"] input[type="radio"]'
  );
  const hasNonCreditCardPaymentOption = !!document.querySelector(
    'input[name="paymentOption"][value="paypal"], div[name="paymentMethod"][value="paypal"] input[type="radio"], input[name="paymentOption"][value="klarna"], div[name="paymentMethod"][value="klarna"] input[type="radio"]'
  );

let transitionEndHandler = null;

const hideCredit = (area) => {
  if (transitionEndHandler) {
    area.removeEventListener('transitionend', transitionEndHandler);
    transitionEndHandler = null;
  }
  area.style.overflow = 'hidden';
  area.style.maxHeight = '0px';
  area.style.paddingBlock = '0';
  area.setAttribute('aria-hidden', 'true');
  area.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
};

const showCredit = (area) => {
  requestAnimationFrame(() => {
    const extra = 30;
    area.style.maxHeight = area.scrollHeight + extra + 'px';
    area.style.paddingBlock = '1rem';
    area.style.overflow = 'hidden';
    area.setAttribute('aria-hidden', 'false');
    area.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);

    transitionEndHandler = (event) => {
      if (event.target !== area) return;
      area.style.maxHeight = 'none';
      area.style.overflow = 'visible';
      area.removeEventListener('transitionend', transitionEndHandler);
      transitionEndHandler = null;
    };
    area.addEventListener('transitionend', transitionEndHandler);
  });
};

const toggleKlarnaVisibility = () => {
  const isKlarnaPayment = isKlarnaSelected();

  
  const setKlarnaElementVisibility = (element, shouldHide) => {
    if (!element) return;
    if (shouldHide) {
      element.style.setProperty("display", "none", "important");
      element.setAttribute("aria-hidden", "true");
    } else {
      element.style.removeProperty("display");
      element.setAttribute("aria-hidden", "false");
    }
  };
  let hiddenKlarnaTargetsCount = 0;
  document
    .querySelectorAll("[data-hide-on-klarna]")
    .forEach((element) => {
      if (isKlarnaPayment) hiddenKlarnaTargetsCount += 1;
      setKlarnaElementVisibility(element, isKlarnaPayment);
    });
  document
    .querySelectorAll("[data-show-on-klarna]")
    .forEach((element) => setKlarnaElementVisibility(element, !isKlarnaPayment));
  
  document.querySelectorAll("[data-product-id]").forEach((element) => {
    const productId = Number(element.getAttribute("data-product-id"));
    const isRecurringProduct =
      !Number.isNaN(productId) && isRecurringProductById(productId);
    if (!isRecurringProduct) return;
    hiddenKlarnaTargetsCount += 1;
    setKlarnaElementVisibility(element, isKlarnaPayment);
  });



  if (isKlarnaPayment && hiddenKlarnaTargetsCount > 0) {
    showToast(i18n.errors.klarnaSubscriptionsNotSupported);
  }
};

const toggleCreditCardSection = () => {
  if (!creditDetails || !hasNonCreditCardPaymentOption)
    return;
  const selected = document.querySelector('input[name="paymentOption"]:checked');
  if (selected && selected.value === 'creditCard') {
    showCredit(creditDetails);
  } else {
    hideCredit(creditDetails);
  }
};

const getUpsellSelectOptionProductId = (option) => {
    const productEl = option?.matches("[data-product-id]")
      ? option
      : option?.querySelector("[data-product-id]");
    return Number(productEl?.getAttribute("data-product-id"));
  };

const setUpsellSelectVisibility = (upsellRoot, group, isVisible) => {
    if (!group) return;
    if (isVisible) {
      upsellRoot?.style.removeProperty("display");
      group.style.removeProperty("display");
      return;
    }
    upsellRoot?.style.setProperty("display", "none", "important");
    group.style.setProperty("display", "none", "important");
  };

const reconcileUpsellSelectForKlarna = (group, isKlarnaPayment) => {
    const activeOption = group.querySelector(
      "[data-cb-option].cb-option-active"
    );
    const upsellRoot = group.closest("[data-upsell]");
    const options = Array.from(group.querySelectorAll("[data-cb-option]"));
    if (!options.length) return;

    if (!isKlarnaPayment) {
      setUpsellSelectVisibility(upsellRoot, group, true);
      if (!activeOption && options[0]) {
        options[0].click();
      }
      return;
    }

    const fallbackOption = options.find((option) => {
      const productId = getUpsellSelectOptionProductId(option);
      return productId && !isRecurringProductById(productId);
    });

    if (fallbackOption) {
      setUpsellSelectVisibility(upsellRoot, group, true);
      const activeProductId = getUpsellSelectOptionProductId(activeOption);
      if (activeProductId && !isRecurringProductById(activeProductId)) return;
      fallbackOption.click();
    } else {
      setUpsellSelectVisibility(upsellRoot, group, false);
      options.forEach((o) => o.classList.remove("cb-option-active"));
      const checkbox = upsellRoot?.querySelector("input[type='checkbox']");
      if (checkbox?.checked) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }
  };

const unselectRecurringProductsForKlarna = () => {
  const isKlarnaPayment = isKlarnaSelected();

  document.querySelectorAll("[data-cb-select]").forEach((group) =>
        reconcileUpsellSelectForKlarna(group, isKlarnaPayment)
      );

  if (!isKlarnaPayment) return;

  if (selectedProduct && isRecurringProductById(selectedProduct.id)) {
    const fallbackCard = Array.from(productsElements).find((card) => {
      const productId = Number(card.getAttribute("data-product-id"));
      return productId && !isRecurringProductById(productId);
    });
    if (fallbackCard) {
      fallbackCard.click();
    } else {
      selectedProduct = null;
      productsElements.forEach((card) => {
        card.classList.remove("product-card-active");
      });
      if (variantsBox) {
        variantsBox.innerHTML = "";
      }
    }
  }

  const allUpsellProducts = Array.from(
    document.querySelectorAll("[data-product-id]")
  ).filter((product) => !("productCard" in product.dataset));

  allUpsellProducts.forEach((product) => {
    const productId = Number(product.dataset.productId);
    if (!productId || !isRecurringProductById(productId)) return;

    const isInput = product.tagName.toLowerCase() === "input";
    const input = product.querySelector("input");
    const isBundledInActiveCard =
      product.hasAttribute('data-bundled-upsell') &&
      !!product.closest(".product-card-active");
    const selectedByOrderPredicate =
      isBundledInActiveCard ||
      (isInput && Number(product.value) > 0) ||
      (input && input.checked);

    if (!selectedByOrderPredicate) return;

    const targetInput = isInput ? product : input;
    if (!targetInput) return;

    if (targetInput.type === "checkbox" || targetInput.type === "radio") {
      if (targetInput.checked) {
        targetInput.checked = false;
        targetInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else if (targetInput.type === "number" && Number(targetInput.value) > 0) {
      targetInput.value = "0";
      targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
};

const onPaymentMethodChange = () => {
  toggleCreditCardSection();
  toggleKlarnaVisibility();
  unselectRecurringProductsForKlarna();
};

paymentOptions.forEach((radio) => {
  radio.addEventListener("change", onPaymentMethodChange);
});

const upsellControls = document.querySelectorAll(
  "[data-product-id]:not([data-product-card])"
);

onPaymentMethodChange();
await initializeFormValidation();

(function ensureCvvToolTipExists() {
  let cvvToolTipEl = document.querySelector(".cvvTooltip");
  let cvvOverlay = document.getElementById("cvvOverlay");

  (function ensureToolTipExists() {
    if (cvvToolTipEl) return;
    const cvvField = document.querySelector("[data-card-cvv]");
    const toolTipSize =
      parseFloat(window.getComputedStyle(cvvField).height) - 24;
    cvvToolTipEl = document.createElement("div");
    cvvToolTipEl.classList.add("cvvTooltip");
    cvvToolTipEl.setAttribute("data-testid", "button-cvv-tooltip");
    cvvToolTipEl.textContent = "?";
    cvvField.parentNode.style.position = "relative";

    const cvvFieldWrapperCoords = cvvField.parentNode.getBoundingClientRect();
    const cvvFieldCoords = cvvField.getBoundingClientRect();
    const cvvFieldToolTipCoords = {
      top: cvvFieldCoords.top - cvvFieldWrapperCoords.top + 12,
      left: cvvFieldCoords.right - cvvFieldWrapperCoords.right,
    };

    const cvvToolTipStyles = `
    <style>
      .cvvTooltip {
        width: ${toolTipSize}px;
        height: ${toolTipSize}px;
        font-size: ${toolTipSize - 5}px;
        display: flex;
        border: 1px solid;
        border-radius: 99px;
        align-items: center;
        justify-content: center;
        position: absolute;
        right: 22px;
        top: ${cvvFieldToolTipCoords.top}px;
        cursor: pointer;
        opacity: 0.65;
      }
      .cvvTooltip:hover {
        opacity: 1;
      }
    </style>
    `;
    document.head.insertAdjacentHTML("beforeend", cvvToolTipStyles);
    cvvField.parentNode.appendChild(cvvToolTipEl);
  })();

  (function ensureCvvOverlayExists() {
    if (cvvOverlay) return;
    cvvOverlay = document.createElement("div");
    cvvOverlay.id = "cvvOverlay";
    cvvOverlay.className = "cvvOverlay";
    cvvOverlay.setAttribute("role", "dialog");
    cvvOverlay.setAttribute("aria-modal", "true");
    cvvOverlay.role = "dialog";
    cvvOverlay.ariaModal = "true";
    cvvOverlay.setAttribute("data-testid", "modal-cvv");
    const modalStyles = `
    <style>
      .cvvOverlay {
        --color-text-primary: #111827;
        --color-text-secondary: #6b7280;
        --color-background-primary: #ffffff;
        --color-background-secondary: #f3f4f6;
        --color-background-info: #eff6ff;
        --color-border-secondary: #d1d5db;
        --color-border-tertiary: #e5e7eb;
        --border-radius-md: 6px;
        --border-radius-lg: 12px;

        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.42);
        align-items: center;
        justify-content: center;
        z-index: 100;

        * {
          margin: 0;
          padding: 0;
        }

        &.open {
          display: flex;
        }

        .modal {
          background: var(--color-background-primary);
          border-radius: var(--border-radius-lg);
          border: 0.5px solid var(--color-border-tertiary);
          padding: 1.5rem;
          width: 590px;
          position: relative;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 500;
          color: var(--color-text-primary);
          margin: auto;
        }

        .close-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 0.5px solid var(--color-border-secondary);
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 12px;
          right: 12px;
        }

        .close-btn:hover {
          background: var(--color-background-secondary);
        }

        .modal-body p {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-top: .75rem;
        }

        .card-scene {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .card-group {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .card-face-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 0.5rem;
        }

        .card {
          width: 238px;
          height: 146px;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .card img {
          width: 100%;
        }

        .arrow-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .arrow-bottom-line {
          height: 2px;
          background-color: #1DBDE4;
          width: 80px;
          position: absolute;
          bottom: 0px;
          right: 39.7px;
        }

        .card-front .arrow-bottom-line {
          width: 83px;
          right: 36.7px;
        }

        .arrow-line {
          width: 1.5px;
          height: 4px;
          background: #1DBDE4;
        }

        .arrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1DBDE4;
        }

        .arrow-label {
          margin-top: 4px;
          font-size: 11px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .card-group--back .arrow-label,
        .card-group--front .arrow-label {
          white-space: normal;
        }
      }
    </style>
    `;
    cvvOverlay.innerHTML = `
    <div class="modal">
      <button class="close-btn" id="cvvCloseBtn" data-testid="button-modal-cvv-close" aria-label="${i18n.labels.close}">X</button>
      <div class="modal-header">
        <span class="modal-title" id="modalTitle">${i18n.labels.cvvModalTitle}</span>
      </div>
      <div class="card-scene">
        <div class="card-group card-group--back">
          <span class="card-face-label">${i18n.labels.cvvCardBack}</span>
          <div class="card card-back">
            <img src="https://stdigitalmvmtprod001.blob.core.windows.net/assets/develop/back-of-card.webp" alt="" />
            <div class="arrow-bottom-line"></div>
          </div>
          <div class="arrow-wrap">
            <div class="arrow-line"></div>
            <div class="arrow-dot"></div>
            <span class="arrow-label">${i18n.labels.cvvThreeDigitLabel}</span>
          </div>
        </div>
        <div class="card-group card-group--front">
          <span class="card-face-label">${i18n.labels.cvvCardFront}</span>
          <div class="card card-front">
            <img src="https://stdigitalmvmtprod001.blob.core.windows.net/assets/develop/front-of-card.webp" alt="" />
            <div class="arrow-bottom-line"></div>
          </div>
          <div class="arrow-wrap">
            <div class="arrow-line"></div>
            <div class="arrow-dot"></div>
            <span class="arrow-label">${i18n.labels.cvvFourDigitLabel}</span>
          </div>
        </div>
      </div>
      <div class="modal-body">
        <p>${i18n.labels.cvvBackDescription}</p>
        <p>${i18n.labels.cvvFrontDescription}</p>
      </div>
    </div>
    `;
    document.head.insertAdjacentHTML("beforeend", modalStyles);
    document.body.appendChild(cvvOverlay);
  })();

  const cvvOpenBtn = cvvToolTipEl;
  const cvvCloseBtn = document.getElementById("cvvCloseBtn");
  const closeCvvModal = () => cvvOverlay.classList.remove("open");
  const openCvvModal = () => cvvOverlay.classList.add("open");
  cvvOpenBtn.addEventListener("click", openCvvModal);
  cvvCloseBtn.addEventListener("click", closeCvvModal);
  cvvOverlay.addEventListener("click", (e) => {
    if (e.target === cvvOverlay) closeCvvModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCvvModal();
  });
})();

});

async function returnPaypal() {
  const params = getParams();
  const paymentTokenId = params.get("PayerID");
  const token = params.get("token");
  const ba_token = params.get("ba_token");
  const cancel = params.get("cancel");
  const cartToken = sessionStorage.getItem("cart_token");

  if (cancel == 1) {
    showToast(i18n.errors.orderCanceled);
  }

  if (paymentTokenId && token && ba_token && cancel != 1) {
    showPreloader(true);
    const paymentToken = sessionStorage.getItem("payment_token_id");
    let responseCustomer = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/carts/${cartToken}/payment_tokens/${paymentToken}`, {
      headers: {
        authorization: `appkey ${INTEGRATION_ID}`,
        "Content-Type": "application/json",
        "charset": "utf-8"
      }
    });
    const responseDataCustomer = await responseCustomer.json();
    let orderData = JSON.parse(sessionStorage.getItem("orderData"));
    const shippingProfileId = +document.querySelector(`[data-product-id="${selectedProduct.id}"]`)?.getAttribute('data-shipping-profile-id') || undefined;
    const vrioTrackingFields = (() => {
    function getQueryParamsCaseInsensitive() {
      const params = new URLSearchParams(window.location.search);
      const normalized = {};

      params.forEach((value, key) => {
        normalized[key.toLowerCase()] = value;
      });

      return normalized;
    }
    const params = getQueryParamsCaseInsensitive();

    const offerId = params['oid'] || params['offer_id'] || params['c1'];
    const c2 = params['c2'];
    const txid = params['_ef_transaction_id'] || EF.getTransactionId(offerId);
    const affId = params['affid'] || params['aff_id'];
    const sub1 = params['sub1'] || params['aff_sub'],
      sub2 = params['sub2'] || params['aff_sub2'],
      sub3 = params['sub3'] || params['aff_sub3'],
      sub4 = params['sub4'] || params['aff_sub4'],
      sub5 = params['sub5'] || params['aff_sub5'];
    const utmCampaign = params['utm_campaign'];
    const utmSource = params['utm_source'];
    const cardBinMapMidRec = sessionStorage.getItem('bin_map_mid_rec');
    const experimentsAndVariantsIds = sessionStorage.getItem('convert_experiment_ids');
    const isMobileDevice = 
      (navigator.userAgentData && navigator.userAgentData.mobile) ??
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const deviceType = isMobileDevice ? 'mobile' : 'desktop';


    return {
      tracking1: affId,

      tracking2: offerId,

      tracking3: c2,

      tracking4: txid,

      tracking5: sub1,

      tracking6: sub2,

      tracking7: sub3,

      tracking8: sub4,

      tracking9: sub5,

      tracking10: utmCampaign,

      tracking11: utmSource,

      tracking12: window.location.href,

      // "exp1_id : exp1_var_id, exp2_id : exp2_var_id, ..."
      // (Empty if no A/B testing experiments on the page)
      tracking13: experimentsAndVariantsIds,

      tracking14: cardBinMapMidRec,

      tracking15: deviceType,

      tracking17: window.location.href,
    };
  })()
;

    const body = {
        pageId: "DYEJeuRZY6KESPfRmfWmSdlhkVb65wSVEYs9xhR_3FD2WUkvy_jSuRmnzjUs8_-u",
        action: "process",
        campaign_id: CAMPAIGN_ID,
        connection_id: 1,
        email: orderData.email || responseDataCustomer.email,
        phone: orderData.phone || responseDataCustomer.phone,
        ship_fname: orderData.ship_fname || responseDataCustomer.ship_fname,
        ship_lname: orderData.ship_lname || responseDataCustomer.ship_lname,
        ship_address1: orderData.ship_address1 || responseDataCustomer.ship_address1,
        ship_city: orderData.shippingCity  || responseDataCustomer.ship_city,
        ship_state: orderData.ship_state || responseDataCustomer.ship_state,
        ship_zipcode: orderData.ship_zipcode || responseDataCustomer.ship_zipcode,
        ship_country: orderData.ship_country || responseDataCustomer.ship_country,
        bill_fname: orderData.bill_fname || responseDataCustomer.bill_fname,
        bill_lname: orderData.bill_lname  || responseDataCustomer.bill_lname,
        bill_address1: orderData.bill_address1 || responseDataCustomer.bill_address1,
        bill_city: orderData.bill_city || responseDataCustomer.bill_city,
        bill_state: orderData.bill_state || responseDataCustomer.bill_state,
        bill_zipcode: orderData.bill_zipcode || responseDataCustomer.bill_zipcode,
        bill_country: orderData.bill_country || responseDataCustomer.bill_country,
        same_address: true,
        payment_method_id: 6,
        payment_token: responseDataCustomer.payment_token,
        cart_token: cartToken,
        offers: [],
        ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
        tracking1: orderData.tracking1 || vrioTrackingFields.tracking1,

        tracking2: orderData.tracking2 || vrioTrackingFields.tracking2,

        tracking3: orderData.tracking3 || vrioTrackingFields.tracking3,

        tracking4: orderData.tracking4 || vrioTrackingFields.tracking4,

        tracking5: orderData.tracking5 || vrioTrackingFields.tracking5,

        tracking6: orderData.tracking6 || vrioTrackingFields.tracking6,

        tracking7: orderData.tracking7 || vrioTrackingFields.tracking7,

        tracking8: orderData.tracking8 || vrioTrackingFields.tracking8,

        tracking9: orderData.tracking9 || vrioTrackingFields.tracking9,

        tracking10: orderData.tracking10 || vrioTrackingFields.tracking10,

        tracking11: orderData.tracking11 || vrioTrackingFields.tracking11,

        tracking12: orderData.tracking12 || vrioTrackingFields.tracking12,

        // "exp1_id : exp1_var_id, exp2_id : exp2_var_id, ..."
        // (Empty if no A/B testing experiments on the page)
        tracking13: orderData.tracking13 || vrioTrackingFields.tracking13,

        tracking14: orderData.tracking14 || vrioTrackingFields.tracking14,

        tracking15: orderData.tracking15 || vrioTrackingFields.tracking15,

        tracking17: orderData.tracking17 || vrioTrackingFields.tracking17,
      };

    const {
      creditCardNumber,
      CVV,
      expirationDate,
      payment_token,
      session_id,
      status,
      campaign_id,
      offers,
      action,
      connection_id,
      merchant_id,
      payment_method_id,
      ip_address,
      ...addressData} = { ...orderData, ...responseDataCustomer };
    sessionStorage.setItem("addressData", JSON.stringify(addressData));

    orderData.offers.forEach((product) => {
      body.offers.push({
        offer_id: getVrioOfferIdByProductId(product.item_id) ?? DEFAULT_OFFER_ID,
        item_id: Number(product.item_id),
        order_offer_quantity: product.order_offer_quantity,
        ...(product.mainOffer ? { mainOffer: true } : {}),
      });
    });

    orderData = {
      ...responseDataCustomer,
      ...orderData             
    };



  delete orderData.cart_token;

  if (!sessionStorage.getItem("orderData")) {
  sessionStorage.setItem("orderData", JSON.stringify(orderData));
 }


    try {
      const response = await fetch(
        "https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders",
        {
          method: "POST",
          headers: {
            authorization: `appkey ${INTEGRATION_ID}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(body),
        }
      );

      if (response.status === 403) {
        handlePaymentDecline();
        if (window.MVMT) {
          MVMT.track("ORDER_ERROR", {
            page: "checkout",
            page_type: "Checkout",
            page_url: window.location.href,
            order_data: body,
            response: { error: "payment_declined", status: 403 },
          });
        }
        return;
      }

      const result = await response.json();
      if (result.success) {
        try {
          if (typeof sendKlaviyoOrderEvents === 'function') {
            await sendKlaviyoOrderEvents(orderData, result, true);
          }
        } catch (error) {
          console.error("Error sending order events to Klaviyo", error);
        }
        sessionStorage.removeItem('cart');
        sessionStorage.removeItem('cart_token');
        sessionStorage.removeItem('payment_token_id');
        sessionStorage.removeItem('PayerID');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('ba_token');
        sessionStorage.setItem("productCustomData", JSON.stringify(productCustomData));
        sessionStorage.setItem("cms_oid", result.order_id);
        sessionStorage.setItem("orderids", JSON.stringify([result.order_id]));
        sendTransactionToDataLayer(vrioToTransaction(result), 'PayPal');
        window.location.href = getNextPageSlugForRedirect();
      }
      else {
        showPreloader(false);
        console.warn("Order API error:", result);
        return;
      }

    } catch (error) {
      console.error(error);
    }
  }
}

function getParams() {
  let queryString = window.location.search;


  if ((!queryString || queryString === "") && window.location.hash.includes("?")) {
    const hashPart = window.location.hash.split("?")[1]; 
    queryString = "?" + hashPart;
  }

  return new URLSearchParams(queryString);
}

const showError = function(message, walletFallback = false) {
  const el = document.querySelector("[data-general-error]");
  if (el) {
    el.innerText = message;
    el.style.display = "block";
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error("Error scrolling to error", error);
    }
    setTimeout(() => {
      el.style.display = "none";
    }, 6000);
  } else if (walletFallback) {
    const statusEl = document.querySelector("#express-checkout-status");
    if (statusEl) {
      statusEl.innerHTML = `<div style="color:#e74c3c;">${message}</div>`;
    }
  }
}
const showPreloader = function(visible) {
  const el = document.querySelector("[data-preloader]");
  if (el) el.style.display = visible ? "flex" : "none";
}
const humanizeCountryError = function(msg) {
  try {
    const match = /country code\s+([A-Za-z]{2,3})\s+is invalid/i.exec(
      String(msg || "")
    );
    if (match && match[1]) {
      const code = String(match[1]).toUpperCase();
      const list =
        (typeof getCountries === "function"
          ? getCountries()
          : window.countries || []) || [];
      const found = list.find(function (c) {
        const codes = [c.iso_2, c.iso2, c.code, c.iso_3, c.iso3]
          .filter(Boolean)
          .map(function (x) {
            return String(x).toUpperCase();
          });
        return codes.indexOf(code) !== -1;
      });
      if (found && found.name) {
        return i18n.errors.countryNotAvailableNamed.replace("{name}", found.name);
      }
      return i18n.errors.countryNotAvailable;
    }
  } catch (error) {
    console.error("Error humanizing country error", error);
  }
  return msg;
}
const showToast = function(message, bg = "#333") {
  const container =
    document.querySelector("#toast-container") ||
    (() => {
      const div = document.createElement("div");
      div.id = "toast-container";
      div.setAttribute("data-testid", "toast-container");
      div.style.position = "fixed";
      div.style.top = "10px";
      div.style.right = "10px";
      div.style.zIndex = "9999";
      document.body.appendChild(div);
      return div;
    })();

  const toast = document.createElement("div");
  toast.className = "mytoast";
  toast.setAttribute("data-testid", "toast");
  toast.textContent = message;
  toast.style.background = bg;
  toast.style.color = "#fff";
  toast.style.padding = "10px 15px";
  toast.style.marginTop = "5px";
  toast.style.borderRadius = "5px";
  toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}
const checkoutErrorParam = getParams().get("error");
if (checkoutErrorParam) {
  showPreloader(false);
  showError(checkoutErrorParam);
  try {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("error");
    window.history.replaceState({}, document.title, cleanUrl.toString());
  } catch (error) {
    console.error("Error deleting error parameter from URL", error);
  }
}
const createCart = async (sanitizedOrderData) => {
    let cartResponse = await fetch(
    `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/carts`,
    {
      method: 'POST',
      headers: {
        authorization: `appkey ${INTEGRATION_ID}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        offers: sanitizedOrderData.offers,
        campaign_id: CAMPAIGN_ID,
        connection_id: sanitizedOrderData.connection_id,
        pageId: sanitizedOrderData.pageId,
      }),
      keepalive: false,
    }
  );
  if (cartResponse.status === 200) {
    cartResponse = await cartResponse.json();
    sessionStorage.setItem('cart_token', cartResponse.cart_token);
    return cartResponse.cart_token;
  }
};
const flagOrderAsTest = async (orderId) => {
  if (!orderId) return null;
  try {
    const res = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders/${orderId}`,
      {
        method: "PATCH",
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`,
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({ is_test: true })
      }
    );
    return await res.json();
  } catch (_) {
    return null;
  }
}
const extractOrderIdFromResponse = (orderResult) => {
  if (!orderResult) return null;
  if (orderResult.order_id) return orderResult.order_id;
  if (orderResult.error?.transaction?.order_id)
    return orderResult.error.transaction.order_id;
  if (orderResult.error?.transaction?.order?.order_id)
    return orderResult.error.transaction.order.order_id;
  return null;
}
const extractKlarnaLivemode = (gatewayResponseText) => {
  try {
    const gatewayData = JSON.parse(gatewayResponseText);
    const entry = Array.isArray(gatewayData) ? gatewayData[0] : gatewayData;
    if (entry && entry.livemode !== undefined) return entry.livemode;
  } catch (error) {
    console.error("Error extracting Klarna livemode", error);
  }
  return undefined;
}
const processAndRedirectToKlarna = async (orderId, redirectUrl) => {
  if (isTest) console.log("Klarna: processing order", orderId);

  const orderData = JSON.parse(sessionStorage.getItem("orderData") || "null") || {};
  const merchantId = orderData?.merchant_id ?? orderData?.merchantId ?? null;
  const finalRedirectUrl = redirectUrl || window.location.href;

  const processResponse = await fetch(
    `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders/${orderId}/process`,
    {
      method: "POST",
      headers: {
        authorization: `appkey ${INTEGRATION_ID}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        redirect_url: finalRedirectUrl,
        payment_method_id: 12,
        ...(merchantId ? { merchant_id: merchantId } : {})
      })
    }
  );

  const processResult = await processResponse.json();

  if (isTest) console.log("Klarna process response:", processResult);

  if (
    !processResponse.ok ||
    (processResult && processResult.error) ||
    !processResult.post_data
  ) {
    const code = processResult?.error?.code || processResult?.code || null;
    const msg =
      (processResult && processResult.error && processResult.error.message) ||
      (processResult && processResult.message) ||
      i18n.errors.systemErrorGeneric;
    const error = new Error(msg);
    error.code = code;
    if (processResult?.error) {
      error.error = processResult.error;
    }
    throw error;
  }

  const livemode = extractKlarnaLivemode(processResult.gateway_response_text);
  if (livemode !== undefined) {
    sessionStorage.setItem("klarna_livemode", JSON.stringify(livemode));
  }

  window.location.href = processResult.post_data;
}

function handleFreeShippingParam(allProducts) {
  const freeShip = sessionStorage.getItem("p_freeship");
  if (freeShip === "y") {
    if (allProducts.length)
      allProducts.forEach((p) => (p.dataset.shippingProfileId = "3"));

    const shippingElements = document.querySelectorAll(
      "[data-shipping-image-2]",
    );
    if (shippingElements.length) {
      shippingElements.forEach((imgElement) => {
        imgElement.src =
          imgElement.getAttribute("data-shipping-image-2") ||
          "https://stdigitalmvmtstaging001.blob.core.windows.net/assets/develop/free-shipping.webp";
        imgElement.alt = i18n.pricingText.freeShipping;
      });
    }
  }
}

function handleFreeGiftParam(allProducts) {
  const freeGift = sessionStorage.getItem("p_freegift");
  if (freeGift === "y") {
    allProducts.forEach((productElement) => {
      if (productElement.dataset.customIsGift === "true") {
        const freeGiftCopyEl = productElement.querySelector("[data-free-gift-copy]");
        if (freeGiftCopyEl) freeGiftCopyEl.style.display = "block";
        const defaultCopyEl = productElement.querySelector("[data-default-copy]");
        if (defaultCopyEl) defaultCopyEl.style.display = "none";
      }
    });
  }
}
(() => {
  document.addEventListener('DOMContentLoaded', function () {
    const fullPrices = [];
    const fullPriceElements = document.querySelectorAll('[data-holder="product_full_price"]');
    fullPriceElements.forEach((fullPriceElement) => {
      fullPrices.push(getPrice(fullPriceElement.textContent));
    });

    const unitPrices = [];
    const priceElements = document.querySelectorAll('[data-holder-product-id="price-unit"]');
    priceElements.forEach((productPriceEl, index) => {
      unitPrices.push(getPrice(productPriceEl.textContent));
    });

    function getPrice(price) {
      return parseFloat(price.replace(",", ".").replace(/[^0-9.-]+/g, ''));
    }

    let currentProduct;
    const productsElements = document.querySelectorAll('[data-products] [data-product-id]:not([data-bundled-upsell])');
    const activeProduct = document.querySelector('[data-products] .product-card-active');
    if (activeProduct && prices) {
      const foundProduct = prices.find(
        (product) => product.id === Number(activeProduct.dataset.productId),
      );
      const activeProductIndex = Array.from(productsElements).findIndex(
        (element) => element.dataset.productId === activeProduct.dataset.productId,
      );

      currentProduct = {
        quantity:
          Number(productsElements[activeProductIndex].getAttribute('data-product-quantity')) ||
          Number(foundProduct.quantity) ||
          1,
        name: foundProduct.productName || i18n.pricingText.selectedProduct,
        id: foundProduct.id || 0,
        price: unitPrices[activeProductIndex],
      };
    }
    const discountFromUrlParam = parseInt(sessionStorage.getItem('p_dc'));
    const hasTenBucksOff = sessionStorage.getItem('p_tenbucksoff') === 'yes';
    if (discountFromUrlParam || hasTenBucksOff) {
      applyDiscount(discountFromUrlParam, hasTenBucksOff);
    }

    function showDiscountText(discountPercent, container, isTenBucksDiscount = false) {
      let discountSpan = container.querySelector('.discount-percentage');
      if (!discountSpan) {
        discountSpan = document.createElement('span');
        discountSpan.className = 'discount-percentage';
        discountSpan.style = 'white-space: nowrap !important;';
        discountSpan.setAttribute('data-testid', 'discount-percentage');
        container.appendChild(discountSpan);
      }

      discountSpan.textContent = isTenBucksDiscount ? `+ ${formatPrice(10)} ${i18n.pricingText.off}` : `+ ${discountPercent}% ${i18n.pricingText.off}`;
    }

    function updatePriceElement(productPriceEl, price) {
      let newPrice = productPriceEl.textContent.replace(
        /[0-9.,]+/,
        price.toFixed(2),
      );
      if (productPriceEl.textContent.includes(",")) {
        newPrice = newPrice.replace(".", ",");
      }
      productPriceEl.textContent = newPrice;
    }

    function applyDiscount(discountPercent, hasTenBucksOff = false) {
      const isTenBucksDiscount = hasTenBucksOff && !discountPercent;

      priceElements.forEach((productPriceEl, index) => {
        if (isTenBucksDiscount) {
          const qty = parseInt(productsElements[index].getAttribute('data-product-quantity'));
          const price = (unitPrices[index] * qty - 10) / qty;
          unitPrices[index] = price;
          updatePriceElement(productPriceEl, price);
        } else {
          const price = unitPrices[index] - (unitPrices[index] * discountPercent) / 100;
          unitPrices[index] = price;
          updatePriceElement(productPriceEl, price);
        }
      });

      if (currentProduct) {
        if (isTenBucksDiscount) {
          currentProduct.price =
            (currentProduct.price * currentProduct.quantity - 10) / currentProduct.quantity;
        } else {
          currentProduct.price =
            currentProduct.price - (currentProduct.price * discountPercent) / 100;
        }
      }

      const discountContainers = document.querySelectorAll(
        '[data-holder="container-discount-per"]',
      );
      discountContainers.forEach((container) => {
        showDiscountText(discountPercent, container, isTenBucksDiscount);
      });

      const discountPlaceholders = document.querySelectorAll('.percent-off-placeholder');

      Array.from(discountPlaceholders).forEach((discountPlaceholder) => {
        discountPlaceholder.textContent = isTenBucksDiscount
          ? ` + ${formatPrice(10)} ${i18n.pricingText.off}`
          : ` + ${discountPercent}% ${i18n.pricingText.off}`;
      });

      updateSummary();
    }
    window.applyDiscount = applyDiscount;
    window.updateSummary = updateSummary;

    function updateSummary() {
      const summaryList = document.getElementById('summary-list');
      if (!summaryList) {
        console.warn('Summary list element not found');
        return;
      }
      const isKlarnaPaymentSelected = () => {
        const selectedPaymentMethod = document.querySelector(
          'input[name="paymentOption"]:checked',
        );
        return selectedPaymentMethod?.value === 'klarna';
      };
      const isRecurringByProductId = (productId) => {
        if (typeof isRecurringProductById === 'function') {
          return Boolean(isRecurringProductById(Number(productId)));
        }
        return false;
      };

      const shouldSkipRecurring = isKlarnaPaymentSelected();
      let total = 0;
      let subTotal = 0;
      let discount = 0;
      summaryList.innerHTML = '';
      summaryList.style.display = 'flex';
      summaryList.style.flexDirection = 'column';
      summaryList.style.gap = '10px';
      summaryList.style.width = '100%';
      let hasItems = false;
      const currentUnitPrice = Number(currentProduct?.price || 0);

      if (currentProduct) {
        const fullPriceNode = document.querySelector(
          `[data-product-card][data-product-id='${currentProduct.id}'] [data_product_full_price]`,
        );
        const fullPriceElement = fullPriceNode
          ? parseFloat(fullPriceNode.innerHTML.replaceAll(",", ".").replace(/[^0-9.,]+/g, '')) || 0
          : currentUnitPrice;
        hasItems = true;
        if (shouldSkipRecurring && isRecurringByProductId(currentProduct.id)) {
          // Skip recurring main product for Klarna
        } else {
        let quantity = Number(currentProduct.quantity || 1);
        const itemContainer = document.createElement('div');
        itemContainer.style.display = 'flex';
        itemContainer.style.justifyContent = 'space-between';
        itemContainer.style.alignItems = 'center';
        itemContainer.style.width = '100%';
        itemContainer.style.gap = '10px';
        itemContainer.setAttribute('data-testid', 'summary-item');

        const itemDetails = document.createElement('div');
        itemDetails.style.display = 'flex';
        itemDetails.style.gap = '5px';
        itemDetails.style.alignItems = 'center';
        itemDetails.style.flex = '1';
        itemDetails.setAttribute('data-testid', 'summary-name');

        const priceElement = document.createElement('div');
        priceElement.style.fontWeight = 'bold';
        priceElement.style.minWidth = '70px';
        priceElement.style.textAlign = 'right';
        priceElement.setAttribute('data-testid', 'summary-price-unit');
        let customName = ""
        productsElements.forEach((el) => {
          if (el.dataset.productId == currentProduct.id) customName = el.dataset.customProductName;
        })

        itemDetails.innerHTML = `
        <span>${customName || currentProduct.name || i18n.pricingText.selectedProduct}</span>`;

        priceElement.textContent = formatPrice(currentUnitPrice, i18n.pricingText.perUnit);

        itemContainer.appendChild(itemDetails);
        itemContainer.appendChild(priceElement);
        summaryList.appendChild(itemContainer);

        total += currentUnitPrice * quantity;
        subTotal += fullPriceElement;
        discount += fullPriceElement - currentUnitPrice * quantity;
        }
      } else {
        console.log('--> No selected product found');
      }

      const upsellCheckboxes = document.querySelectorAll('[data-upsell]');

      let productIds = [];
      upsellCheckboxes.forEach((upsell) => {
        let productIdElement = upsell.closest('[data-product-id]');
        let checkbox = null;

        const upsellSelect = upsell.querySelector("[data-cb-select]");

        if (upsellSelect) {
          checkbox = upsell.querySelector("input[type='checkbox']");
          const activeOption = upsellSelect.querySelector(
            "[data-cb-option].cb-option-active"
          );
          const activeOptionProduct = activeOption?.matches("[data-product-id]")
            ? activeOption
            : activeOption?.querySelector("[data-product-id]");
          if (activeOptionProduct) {
            productIds.push({
              id: activeOptionProduct.dataset.productId,
              checked: checkbox ? checkbox.checked : true,
              quantity:
                Number(
                  activeOptionProduct.getAttribute("data-non-shippable-quantity") ||
                  activeOptionProduct.getAttribute("data-product-quantity")
                ) || 1
            });
          }
          return;
        } else if (productIdElement) {
          checkbox = upsell.querySelector("input[type='checkbox']");

          productIds.push({
            id: productIdElement.dataset.productId,
            checked: checkbox.checked,
            quantity: 1,
          });
        } else {
          productIdElement = upsell
            .closest('[data-quantity-picker-area]')
            ?.querySelectorAll('[data-product-id]');
          checkbox = upsell
            .closest('[data-quantity-picker-area]')
            ?.querySelector("input[type='checkbox']");
          if (!productIdElement || !checkbox) return;
          productIdElement.forEach((el) => {
            const value = el.value;
            productIds.push({
              id: el.dataset.productId,
              checked: checkbox.checked,
              quantity: Number(value),
            });
          });
        }
      });
      productIds = productIds.filter((item) => item.checked);
      productIds.forEach((productObject) => {
        if (shouldSkipRecurring && isRecurringByProductId(productObject.id)) {
          return;
        }
        const product = prices.find((p) => p.id === Number(productObject.id));
        if (!product) return;
        hasItems = true;
        const productElement = getProductElement(productObject.id);
        const customName =
          productElement.dataset.customProductName ||
          product.productName;

        const itemContainer = document.createElement('div');
        itemContainer.style.display = 'flex';
        itemContainer.style.justifyContent = 'space-between';
        itemContainer.style.alignItems = 'center';
        itemContainer.style.width = '100%';
        itemContainer.style.gap = '10px';
        itemContainer.setAttribute('data-testid', 'summary-item');

        const itemDetails = document.createElement('div');
        itemDetails.style.display = 'flex';
        itemDetails.style.gap = '5px';
        itemDetails.style.alignItems = 'center';
        itemDetails.setAttribute('data-testid', 'summary-name');

        const priceElement = document.createElement('div');
        priceElement.style.fontWeight = 'bold';
        priceElement.setAttribute('data-testid', 'summary-price-unit');
        itemDetails.innerHTML = `
          <div style="flex: 1; display: flex; gap: 5px; align-items: center;">
              ${productObject.quantity > 1 ? `<span>${productObject.quantity}x</span>` : ''}
              <span>${customName.replace(/([\d])x/, '$1')}</span>
          </div>
          `;
        priceElement.style.minWidth = '70px';
        priceElement.style.textAlign = 'right';
        const isGift = productElement.dataset.customIsGift === "true" && sessionStorage.getItem("p_freegift") === "y";
        priceElement.textContent = isGift ? i18n.pricingText.free : formatPrice(product.finalPrice);

        if (productObject.quantity >= 1) {
          itemContainer.appendChild(itemDetails);
          itemContainer.appendChild(priceElement);
          if (summaryList) summaryList.appendChild(itemContainer);
          subTotal += isGift ? 0 : product.finalPrice * productObject.quantity;
        }
      });
      if (!hasItems) {
        const noItemsMessage = document.createElement('div');
        noItemsMessage.textContent = '';
        noItemsMessage.style.textAlign = 'center';
        noItemsMessage.style.width = '100%';
        noItemsMessage.setAttribute('data-testid', 'summary-empty');
        summaryList.appendChild(noItemsMessage);
      }

      const dataSumSubTotal = document.querySelector('[data-summary-subtotal]');
      if (dataSumSubTotal) {
        dataSumSubTotal.textContent = formatPrice(subTotal);
      }

      const finalTotal = subTotal - discount;

      const discountAmountElement = document.querySelector(
        '[data-summary-product-discount-amount]',
      );
      if (discountAmountElement) {
        discountAmountElement.textContent = formatPrice(discount);
      }

      const finalPriceElements = document.querySelectorAll('[data-summary-product-final-price]');
      finalPriceElements.forEach((finalPriceElement) => {
        finalPriceElement.textContent = formatPrice(finalTotal);
      });
    }
    updateSummary();
    setTimeout(() => updateSummary(), 3000);

    Array.from(document.querySelectorAll('[data-add], [data-remove]') || []).forEach((button) => {
      button.addEventListener('click', updateSummary);
    });

    document.addEventListener('change', function (event) {
      if (
        event.target.type === 'checkbox' ||
        (event.target.type === 'number' && event.target.hasAttribute('data-product-id')) ||
        (event.target.type === 'radio' && event.target.name === 'paymentOption')
      ) {
        updateSummary();
      }
    });

    const leadForm = document.getElementById('lead-form');
    productsElements.forEach((card, index) => {
      card.addEventListener('click', (event) => {
        const productId = card.getAttribute('data-product-id');

        if (prices && prices.length > 0) {
          const foundProduct = prices.find((p) => p.id === Number(productId));
          if (foundProduct) {
            currentProduct = {
              quantity:
                Number(card.getAttribute('data-product-quantity')) ||
                Number(foundProduct.quantity) ||
                1,
              name: foundProduct.productName || i18n.pricingText.selectedProduct,
              id: foundProduct.id || 0,
              price: unitPrices[index],
            };

            const cardTextMatch = (card.textContent || '').match(/(\d+)\s*%\s*off/i);
            const discountPct = Number(card.getAttribute('data-product-discount')) || Number(foundProduct.discountPercentage) || (cardTextMatch ? Number(cardTextMatch[1]) : 0);
            if (discountPct) {
              document.querySelectorAll('.mvmt-discount-amount').forEach((el) => {
                if (/^\d+$/.test((el.textContent || '').trim())) {
                  el.textContent = String(discountPct);
                }
              });
              document.querySelectorAll('[data-url-param-timer] span').forEach((el) => {
                if (el.textContent && /\d+%\s*discount/i.test(el.textContent)) {
                  el.textContent = el.textContent.replace(/\d+(?=%\s*discount)/i, String(discountPct));
                }
              });
            }
          }
        }

        updateSummary();
        if (leadForm) {
          leadForm.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      });
    });

    function toggleCreditCardDetails() {
      const selectedPaymentMethod = document.querySelector(
        'input[type="radio"][name="paymentOption"]:checked',
      );

      const element = document.querySelector('#creditCardDetails');
      if (selectedPaymentMethod && selectedPaymentMethod.value === 'creditCard') {
        const elementStyle = element.style;
        elementStyle.paddingBlock = '1rem';
        elementStyle.maxHeight = element.scrollHeight * 1.5 + 'px';
        elementStyle.overflow = 'visible';
        element.querySelectorAll("input, select").forEach(el => (el.disabled = false));
      } else {
        const elementStyle = element.style;
        elementStyle.maxHeight = 0;
        elementStyle.overflow = 'hidden';
        elementStyle.paddingBlock = 0;
        element.querySelectorAll("input, select").forEach(el => (el.disabled = true));
      }
    }

    const paymentMethodDivs = document.querySelectorAll('div[name="paymentMethod"]');
    const detectPaymentMethodType = (container, input) => {
      const combinedSignal = [
        input?.value,
        input?.id,
        input?.name,
        container?.getAttribute("value"),
        container?.getAttribute('data-payment-method'),
        container?.textContent,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/s+/g, "");

      if (combinedSignal.includes('paypal')) return 'paypal';
      if (combinedSignal.includes('klarna')) return 'klarna';
      if (combinedSignal.includes('credit') || combinedSignal.includes('card'))
        return 'creditCard';
      return null;
    };

    paymentMethodDivs.forEach((container) => {
      const paymentInput = container.querySelector(
        'input[type="radio"], input[type="checkbox"], input',
      );
      if (!paymentInput) return;

      const paymentType = detectPaymentMethodType(container, paymentInput);
      if (!paymentType) return;

      paymentInput.name = 'paymentOption';
      paymentInput.id = paymentType;
      paymentInput.value = paymentType;
      paymentInput.checked = paymentType === 'creditCard';
    });
    
    toggleCreditCardDetails();
  });
})();

