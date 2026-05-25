
const KLAVIYO_PUBLIC_API_KEY = 'XdCWtk';

const EMAIL_OVERSIGHT_VALIDATE_URL = 'https://app-cms-api-proxy-staging-001.azurewebsites.net/integration/email-oversight/validate-public';

let isTest = sessionStorage.getItem("test");
if (isTest === null && isTest !== false) {
  isTest = true;
  sessionStorage.setItem("test", isTest);
}


(function() {
  try {
    var klaviyoLifecyclePayload = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8),
      timestamp: Date.now(),
      location: "builder-events/upsell/vrio-upsell-js-generator.ts" + ':KlaviyoLifecycle:initialized',
      message: 'Klaviyo lifecycle: initialized',
      runId: 'initial',
      hypothesisId: 'KlaviyoLifecycle',
      data: {
        pageName: "upsell",
        pageType: "Upsell",
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
      location: "builder-events/upsell/vrio-upsell-js-generator.ts" + ':KlaviyoTrace',
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
          page: "upsell",
          page_type: "Upsell",
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
                  page: "upsell",
                  page_type: "Upsell",
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
      offer: kOfferName, page_type: "Upsell",
      hostName: window.location.hostname, pagePath: window.location.pathname,
      step: "Upsell", group: "upsell",
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
      offer: kOfferNames, page_type: "Upsell", step: "Upsell",
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


// Get offer info from the campaign to determine VIP status
const orderSummary = JSON.parse(sessionStorage.getItem("orderSummary")) || [];

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

;
const isVipUpsell = false;
const { vrioCampaignId, countries, integrationId } = getVrioCampaignInfoBasedOnPaymentMethod(isVipUpsell);
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


const PAYMENT_METHODS_IDS = {"creditCard":1,"googlePay":3,"applePay":4,"paypal":6,"klarna":12};
const CAMPAIGN_ID = vrioCampaignId;
const INTEGRATION_ID = integrationId;
const UPSELL_NEXT_PAGE_SLUG = "thank-you";

function getNextPageSlugForRedirect() {
  const normalize = (value) => {
    if (!value) return "";
    return value.startsWith("/6a143c627bff10f9e9b45158-preview") ? value : (value.startsWith("/") ? "/6a143c627bff10f9e9b45158-preview" + value : "/6a143c627bff10f9e9b45158-preview/" + value);
  };
  if (UPSELL_NEXT_PAGE_SLUG) return normalize(UPSELL_NEXT_PAGE_SLUG);
  return "/";
}
const HAS_FOLLOWING_UPSELLS = false;
const UPSELL_WALLETS_CONFIG = {"enabled":false,"enableApplePay":false,"enableGooglePay":false,"enableKlarna":false};
const isKlarnaSelected = ({ walletsConfig } = {}) => {
  if (walletsConfig && typeof walletsConfig === "object") {
    if (!(walletsConfig.enabled && walletsConfig.enableKlarna)) return false;
  } else {
    try {
      const stored = sessionStorage.getItem("isKlarnaEnabled");
      if (stored !== null && JSON.parse(stored) !== true) return false;
    } catch {}
  }
  try {
    const orderData = JSON.parse(sessionStorage.getItem("orderData"));
    return Number(orderData?.payment_method_id) === 12;
  } catch {
    return false;
  }
};
const isKlarnaPayment = isKlarnaSelected({ walletsConfig: UPSELL_WALLETS_CONFIG });
const removeKlarnaParamsFromUrl = (urlValue) => {
  const sourceUrl = urlValue || window.location.href;
  const url = new URL(sourceUrl, window.location.origin);
  url.searchParams.delete("payment_intent");
  url.searchParams.delete("payment_intent_client_secret");
  url.searchParams.delete("redirect_status");
  return url.toString();
};

const applyKlarnaVisibility = () => {
  
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
  

};

let selectedProduct;
const AUTO_SKIP_SCREEN_ID = "autoskip-screen";

const getOrCreateVipAutoSkipScreen = () => {
  let screen = document.getElementById(AUTO_SKIP_SCREEN_ID);
  if (screen) return screen;

  if (!document.getElementById("autoskip-screen-keyframes")) {
    const style = document.createElement("style");
    style.id = "autoskip-screen-keyframes";
    style.textContent =
      "@keyframes autoskipScreenRotation {0% {transform: rotate(0deg);}100% {transform: rotate(360deg);}}";
    document.head.appendChild(style);
  }

  screen = document.createElement("div");
  screen.id = AUTO_SKIP_SCREEN_ID;
  screen.setAttribute("aria-live", "polite");
  screen.setAttribute("data-testid", "autoskip-screen");
  screen.style.position = "fixed";
  screen.style.inset = "0";
  screen.style.zIndex = "9000";
  screen.style.background = "#ffff";
  screen.style.display = "none";
  screen.style.alignItems = "center";
  screen.style.justifyContent = "center";

  const spinner = document.createElement("div");
  spinner.className = "loader";
  spinner.setAttribute("data-testid", "autoskip-spinner");
  spinner.style.width = "48px";
  spinner.style.height = "48px";
  spinner.style.borderRadius = "50%";
  spinner.style.display = "inline-block";
  spinner.style.boxSizing = "border-box";
  spinner.style.animation = "autoskipScreenRotation 1s linear infinite";
  spinner.style.marginTop = "22px";
  spinner.style.border = "5px solid rgba(18, 76, 117, 1.00)";
  spinner.style.borderBottomColor = "transparent";

  const spacer = document.createElement("span");
  spacer.innerHTML = "<br>";
  spinner.appendChild(spacer);
  screen.appendChild(spinner);
  document.body.appendChild(screen);

  return screen;
};

const getPrices = async function upsellGetPrices(allPrices) {
  const productId = document.querySelector('[data-product-id]').getAttribute('data-product-id');
  selectedProduct = allPrices.find((price) => price.id === Number(productId));

  const currencyClass = document.querySelectorAll('[data-holder="currency"]');
  currencyClass.forEach((el) => {
    el.innerHTML = "$";
  });

  const priceClass = document.querySelectorAll('[data-holder="product_full_price"]');
  priceClass.forEach((el) => {
    el.innerHTML = selectedProduct.finalPrice;
  });

  const discountClass = document.querySelectorAll('[data-holder="product_discount_percentage"]');
  discountClass.forEach((el) => {
    el.innerHTML = selectedProduct.discountPercentage;
  });

  return selectedProduct;
};
const prices = [{"name":"1x EXTRA Vi-Shift Glasses","id":232,"quantity":1,"price":19.99,"shippable":false,"fullPrice":19.99,"finalPrice":19.99,"productName":"1x EXTRA Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"1x Flexible Glasses","id":224,"quantity":1,"price":29.99,"shippable":false,"fullPrice":29.99,"finalPrice":29.99,"productName":"1x Flexible Glasses","discountAmount":0,"discountPercentage":0},{"name":"1x USB 3.0 Quick Charger","id":59,"quantity":1,"price":0,"shippable":false,"fullPrice":20,"finalPrice":20,"productName":"1x USB 3.0 Quick Charger","discountAmount":0,"discountPercentage":0},{"name":"2x Vi-Shift Glasses","id":225,"quantity":1,"price":53.98,"shippable":false,"fullPrice":53.98,"finalPrice":53.98,"productName":"2x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"3 Year Extended Warranty","id":230,"quantity":1,"price":10,"shippable":false,"fullPrice":10,"finalPrice":10,"productName":"3 Year Extended Warranty","discountAmount":0,"discountPercentage":0},{"name":"3x Vi-Shift Glasses","id":226,"quantity":1,"price":71.97,"shippable":false,"fullPrice":71.97,"finalPrice":71.97,"productName":"3x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"4x Vi-Shift Glasses","id":227,"quantity":1,"price":83.96,"shippable":false,"fullPrice":83.96,"finalPrice":83.96,"productName":"4x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"5x Vi-Shift Glasses","id":228,"quantity":1,"price":89.95,"shippable":false,"fullPrice":89.95,"finalPrice":89.95,"productName":"5x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"Journey Package Protection","id":231,"quantity":1,"price":3.5,"shippable":false,"fullPrice":3.5,"finalPrice":3.5,"productName":"Journey Package Protection","discountAmount":0,"discountPercentage":0},{"name":"Vi-Shift Glasses - Expedited Shipping","id":233,"quantity":1,"price":9.99,"shippable":false,"fullPrice":9.99,"finalPrice":9.99,"productName":"Vi-Shift Glasses - Expedited Shipping","discountAmount":0,"discountPercentage":0},{"name":"Vi-Shift Protective Case Upgrade","id":229,"quantity":1,"price":9.95,"shippable":false,"fullPrice":9.95,"finalPrice":9.95,"productName":"Vi-Shift Protective Case Upgrade","discountAmount":0,"discountPercentage":0},{"name":"VIP Customer Benefits","id":34,"quantity":1,"price":9.95,"shippable":false,"fullPrice":9.95,"finalPrice":9.95,"productName":"VIP Customer Benefits","discountAmount":0,"discountPercentage":0}];
const shippables = [{"id":223,"name":"Flexible Glasses"},{"id":36,"name":"USB 3.0 Quick Charger"}];

function removeObjectUndefinedProperties(obj) {
  for (const key in obj) {
    if (obj[key] === undefined || obj[key] === null || obj[key] === "")
      delete obj[key];
  }
  return obj;
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
const getProductElement = (productId) => {
  const productElement = document.querySelector(`[data-product-id="${productId}"]`);
  if (productElement) {
    return productElement;
  } else {
    throw new Error(`Product element with ID ${productId} not found.`);
  }
};;
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
};;
const productCustomData = JSON.parse(sessionStorage.getItem("productCustomData")) || {};
const saveProductCustomData = (productElement) => {
  productCustomData[productElement.dataset.productId] = {
    customProductName: productElement.dataset.customProductName,
    customSummaryRow: productElement.dataset.customSummaryRow,
    customIsGift: productElement.dataset.customIsGift,
  };
}
const getVrioOfferIdByProductId = (productId) => {
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
  };
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

const getUpsellSessionData = () => {
  const orderData = JSON.parse(sessionStorage.getItem("orderData"));
  const lastOrderId = sessionStorage.getItem("cms_oid");
  const addressData = JSON.parse(sessionStorage.getItem("addressData"));
  const offerIdFromOrderData = orderData.offers[0].offer_id;
  return { orderData, lastOrderId, addressData, offerIdFromOrderData };
};

const getUniqueSelectedProductIds = () => {
  const productIds = Array.from(document.querySelectorAll("[data-product-id]:not([data-product-card])"))
    .map((el) => Number(el.getAttribute("data-product-id")))
    .filter((value) => !isNaN(value));
  const selectedProducts = prices.filter((price) =>
    productIds.includes(price.id)
  );
  const productSelectedFromUI = document.querySelector(".product-card-active")?.getAttribute("data-product-id");
  if (productSelectedFromUI) {
    selectedProducts.push(prices.find((price) => price.id === Number(productSelectedFromUI)));
  }
  const uniqueSelectedProductIds = [...new Set(selectedProducts.map((product) => product.id))];
  if (uniqueSelectedProductIds.length === 0) {
    throw new Error("Missing product configuration/binding");
  }
  return uniqueSelectedProductIds;
};

const isRecurringProduct = (productId) => {
  const offerData = getVrioOfferIdByProductId(productId);
  return Boolean(offerData?.isRecurringOffer);
};

function getParams() {
  let queryString = window.location.search;

  if (
    (!queryString || queryString === "") &&
    window.location.hash.includes("?")
  ) {
    const hashPart = window.location.hash.split("?")[1];
    queryString = "?" + hashPart;
  }

  return new URLSearchParams(queryString);
}

function setUpsellButtonsDisabled(isDisabled) {
  const actionButtons = document.querySelectorAll(
    "[data-submit-button], [data-decline-button]"
  );
  actionButtons.forEach((button) => {
    if (isDisabled) {
      button.setAttribute("disabled", "disabled");
      button.style.pointerEvents = "none";
      return;
    }
    button.removeAttribute("disabled");
    button.style.pointerEvents = "";
  });
}

function isOrderAlreadyCompletedError(err) {
  const code = err?.error?.code || err?.code;
  const message = (err?.error?.message || err?.message || "").toLowerCase();
  return (
    code === "order_already_completed" ||
    message.includes("order is already complete")
  );
}

function showErrorAndRedirect(msg, redirectTarget = "checkout") {
  const checkoutUrl = sessionStorage.getItem("checkoutUrl") || "/";
  const nextPageUrl = getNextPageSlugForRedirect();

  let targetUrl = redirectTarget === "nextPage" ? nextPageUrl : checkoutUrl;
  if (redirectTarget !== "nextPage" && targetUrl) {
    try {
      const url = new URL(checkoutUrl);
      url.searchParams.set("error", msg);
      targetUrl = url.toString();
    } catch (error) {
      console.error("Error setting error parameter in URL", error);
    }
  }

  const errorEl = document.querySelector("[data-general-error]");
  const isAutoSkipScreenVisible =
    document.getElementById(AUTO_SKIP_SCREEN_ID)?.style.display === "flex" ?? false;
  if (isAutoSkipScreenVisible || !errorEl) {
    showToast(msg);
  } else {
    errorEl.innerText = msg;
    errorEl.style.display = "block";
  }
  if (targetUrl) {
    setUpsellButtonsDisabled(true);
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 5000);
  }
}

const runDeclineFlow = async ({ isAutoSkip = false } = {}) => {
  if (!isAutoSkip) {
   MVMT.track("CTA_CLICK", {
    page: "upsell",
    page_type: "Upsell",
    page_url: window.location.href
  });
  }

  if (isKlarnaPayment && !HAS_FOLLOWING_UPSELLS && typeof declineKlarnaUpsell === "function") {
    await declineKlarnaUpsell();
    return;
  }

  window.location.href = getNextPageSlugForRedirect();
};


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
async function returnKlarna() {
  const params = getParams();
  const paymentIntent = params.get("payment_intent");
  const orderId = sessionStorage.getItem("cms_oid");

  if (!paymentIntent) return;

  const preload = document.querySelector("[data-preloader]");
  if (preload) preload.style.display = "flex";

  if (!orderId) {
    console.error("Klarna return: no order ID found in sessionStorage");
    if (preload) preload.style.display = "none";
    showErrorAndRedirect(i18n.errors.orderNotFoundRedirect, "checkout");
    return;
  }

  const orderData = JSON.parse(sessionStorage.getItem("orderData") || "null") || {};
  const merchantId = orderData?.merchant_id ?? orderData?.merchantId ?? null;

  try {
    const response = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders/${orderId}/complete`,
      {
        method: "POST",
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`,
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
          transaction_token: paymentIntent,
          ...(merchantId ? { merchant_id: merchantId } : {})
        })
      }
    );

    const result = await response.json();

    if (isTest && window.location.hostname === "localhost") {
      console.log("Klarna complete response:", result);
    }

    let isLive = extractKlarnaLivemode(result.gateway_response_text);
    if (isLive === undefined) {
      const stored = sessionStorage.getItem("klarna_livemode");
      isLive = stored !== null ? JSON.parse(stored) : true;
    }

    const resultOrderId = result.order_id || orderId;

    if (result.success) {
      if (isLive === false) await flagOrderAsTest(resultOrderId);

      sessionStorage.removeItem("cart_token");
      sessionStorage.removeItem("klarna_livemode");
      sessionStorage.setItem("cms_oid", resultOrderId);
      sessionStorage.setItem("orderids", JSON.stringify([resultOrderId]));
      MVMT.track("ORDER_SUCCESS", {
        page: "upsell",
        page_type: "Upsell",
        page_url: window.location.href,
        order_data: orderData,
        response: result,
      });
      try {
        sendTransactionToDataLayer(vrioToTransaction(result), "Klarna");
      } catch (e) {
        console.warn("Klarna: could not send transaction to data layer", e);
      }
      try {
        if (typeof validateAndSendToKlaviyo === "function") {
          const klaviyoPostOrderData = {
            ...orderData,
            vrio_order_id: resultOrderId,
            vrio_response_status: "success",
          };
          await validateAndSendToKlaviyo(
            klaviyoPostOrderData,
            "Order Success - VRIO Confirmation",
            "order"
          );
        }
      } catch (error) {
        console.error("Error sending transaction to data layer", error);
      }
      try {
        if (typeof sendKlaviyoOrderEvents === 'function') {
          await sendKlaviyoOrderEvents(orderData, result, true);
        }
      } catch (error) {
        console.error("Error sending order events to Klaviyo", error);
      }
      const redirectSlug =
        typeof nextPageSlug === "string" && nextPageSlug.length > 0
          ? nextPageSlug.startsWith("/")
            ? nextPageSlug
            : "/" + nextPageSlug
          : "/";
      window.location.href = redirectSlug;
    } else {
      if (!isLive) await flagOrderAsTest(resultOrderId);

      if (isTest) console.error("Klarna complete error:", result);
      const msg =
        (result && result.error && result.error.message) ||
        (result && result.message) ||
        i18n.errors.klarnaCompletionFailed;
      if (window.MVMT) {
        MVMT.track("ORDER_ERROR", {
          page: "upsell",
          page_type: "Upsell",
          page_url: window.location.href,
          order_data: orderData,
          response: result,
        });
      }
      if (preload) preload.style.display = "none";
      if (isOrderAlreadyCompletedError(result)) {
        showErrorAndRedirect(
          msg || i18n.errors.orderAlreadyCompleteRedirect,
          "nextPage"
        );
        return;
      }
      showErrorAndRedirect(msg, "checkout");
    }
  } catch (error) {
    if (isTest) console.error("Klarna complete error:", error);
    const storedLive = sessionStorage.getItem("klarna_livemode");
    if (storedLive !== null && JSON.parse(storedLive) === false) {
      await flagOrderAsTest(orderId);
    }
    if (window.MVMT) {
      MVMT.track("ORDER_ERROR", {
        page: "upsell",
        page_type: "Upsell",
        page_url: window.location.href,
        order_data: orderData,
        error: error.message || error,
      });
    }
    if (preload) preload.style.display = "none";
    if (isOrderAlreadyCompletedError(error)) {
      showErrorAndRedirect(
        error?.message || i18n.errors.orderAlreadyCompleteRedirect,
        "nextPage"
      );
      return;
    }
    showErrorAndRedirect(i18n.errors.unexpectedErrorRedirect, "checkout");
  }
}

const declineKlarnaUpsell = async () => {
  if (!isKlarnaPayment) {
    showErrorAndRedirect(
      "Klarna is not available",
      "checkout"
    );
    return;
  }
  setUpsellButtonsDisabled(true);

  const preload = document.querySelector("[data-preloader]");
    if (preload) preload.style.display = "flex";
  const errorEl = document.querySelector("[data-general-error]");
  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.innerText = "";
  }
  try {
    const lastOrderId = sessionStorage.getItem("cms_oid");
    if (!lastOrderId) {
      throw new Error("No order ID found in session");
    }

    if (isTest)
      console.log(
        "Klarna: declining upsell, processing order without new offers",
        lastOrderId
      );

    await processAndRedirectToKlarna(lastOrderId, removeKlarnaParamsFromUrl());
  } catch (error) {
    console.error(error);
    if (isOrderAlreadyCompletedError(error)) {
      showErrorAndRedirect(
        error?.message ||
          i18n.errors.orderAlreadyCompleteRedirect,
        "nextPage"
      );
      return;
    }
    showErrorAndRedirect(
      error.message || i18n.errors.unexpectedErrorRedirect,
      "checkout"
    );
  } finally {
    if (preload) preload.style.display = "none";
    setUpsellButtonsDisabled(false);
  }
};


const processKlarnaUpsell = async () => {
  if (!isKlarnaPayment) {
    throw new Error("Klarna is not available");
  }
  setUpsellButtonsDisabled(true);

  const preload = document.querySelector("[data-preloader]");
  if (preload) preload.style.display = "flex";
  const errorEl = document.querySelector("[data-general-error]");
  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.innerText = "";
  }
  try {
    const { orderData, lastOrderId, offerIdFromOrderData } =
      getUpsellSessionData();

    if (!lastOrderId) {
      throw new Error("No order ID found in session");
    }

    // Build offers to add via API (each offer gets a unique id to force new entries)
    const offers = [];

    const uniqueSelectedProductIds = getUniqueSelectedProductIds();
    uniqueSelectedProductIds.forEach((selectedProductId) => {
      const selectedProductOfferData = getVrioOfferIdByProductId(selectedProductId);
      if (selectedProductOfferData?.isRecurringOffer) {
        return;
      }
      const selectedProductOfferId =
        selectedProductOfferData.offerId ?? offerIdFromOrderData;
      const isVipProduct = Boolean(
        isVipUpsell && selectedProductOfferData.isRecurringOffer
      );
      offers.push({
        id: crypto.randomUUID(),
        offer_id: selectedProductOfferId,
        order_offer_quantity: 1,
        item_id: selectedProductId,
        order_offer_upsell: true,
        parent_offer_id: offerIdFromOrderData,
        ...(isVipProduct ? { order_offer_price: "0.00" } : {})
      });

      const productElement = getProductElement(selectedProductId);
      saveProductCustomData(productElement);
      let { product, quantity } =
        getBindedShippableProductAndQuantity(productElement) ?? {};
      if (product) {
        const bindedProductOfferData = getVrioOfferIdByProductId(product.id);
        if (bindedProductOfferData?.isRecurringOffer) {
          return;
        }
        const bindedProductOfferId =
          bindedProductOfferData.offerId ?? selectedProductOfferId;
        offers.push({
          id: crypto.randomUUID(),
          offer_id: bindedProductOfferId,
          order_offer_upsell: true,
          parent_offer_id: offerIdFromOrderData,
          item_id: product.id,
          order_offer_quantity: quantity
        });
      }
    });

    if (offers.length === 0) {
      throw new Error(i18n.errors.klarnaNotAvailableRecurring);
    }

    if (isTest)
      console.log("Klarna: adding upsell offers via /order_offers", {
        order_id: lastOrderId,
        offers
      });

    MVMT.track("UPSELL_SUBMITTED", {
      page: "upsell",
      page_type: "Upsell",
      page_url: window.location.href,
      order_id: lastOrderId,
      offers
    });
    MVMT.track("CTA_CLICK", {
      page: "upsell",
      page_type: "Upsell",
      page_url: window.location.href
    });

    // Add offers to existing order via API
    const response = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/order_offers`,
      {
        method: "POST",
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`,
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
          offers: offers.map((o) => JSON.stringify(o)),
          order_id: lastOrderId,
          pageId: "zWUoK233HHyaBzpG7KjjAUzupD_1KlPDKhsfO3KyTM5VIgyZlfnKmrphEaxHRt10"
        })
      }
    );

    const result = await response.json();

    if (isTest) console.log("Klarna order_offers response:", result);

    if (!response.ok) {
      const msg =
        (result && result.error && result.error.message) ||
        (result && result.message) ||
        i18n.errors.upsellOrderFailed;
      throw new Error(msg);
    }

    const newOrderData = {
      ...orderData,
      offers: [...(orderData.offers || []), ...offers]
    };
    const orderids = JSON.parse(sessionStorage.getItem("orderids")) || [];
    if (!orderids.includes(lastOrderId)) {
      sessionStorage.setItem("orderids", JSON.stringify([...orderids, lastOrderId]));
    }
    sessionStorage.setItem("cms_oid", String(lastOrderId));
    const orderSummaryData = JSON.parse(sessionStorage.getItem("orderSummary")) || [];
    orderSummaryData.push({
      order_id: lastOrderId,
      order_offers: offers,
      source: "klarna_upsell_order_offers"
    });
    sessionStorage.setItem("orderSummary", JSON.stringify(orderSummaryData));
    sessionStorage.setItem("orderData", JSON.stringify(newOrderData));
    sessionStorage.setItem(
      "productCustomData",
      JSON.stringify(productCustomData)
    );

    if (!HAS_FOLLOWING_UPSELLS && typeof processAndRedirectToKlarna === "function") {
    await processAndRedirectToKlarna(lastOrderId, removeKlarnaParamsFromUrl());
    } else {
      window.location.href = getNextPageSlugForRedirect();
    }
  } catch (error) {
    console.error(error);
    if (isOrderAlreadyCompletedError(error)) {
      showErrorAndRedirect(
        error?.message ||
          i18n.errors.orderAlreadyCompleteRedirect,
        "nextPage"
      );
      return;
    }
    if (errorEl) {
      errorEl.innerText =
        error?.message || i18n.errors.unexpectedError;
      errorEl.style.display = "block";
    } else {
      showToast(error?.message || i18n.errors.unexpectedError);
    }

  } finally {
    if (preload) preload.style.display = "none";
    setUpsellButtonsDisabled(false);
  }
};

const processUpsell = async () => {
  setUpsellButtonsDisabled(true);
  
  const preload = document.querySelector("[data-preloader]");
  if (preload) preload.style.display = "flex";
  const errorEl = document.querySelector("[data-general-error]");
  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.innerText = "";
  }
  try {
    const orderData = JSON.parse(sessionStorage.getItem("orderData"));
    orderData.pageId = "zWUoK233HHyaBzpG7KjjAUzupD_1KlPDKhsfO3KyTM5VIgyZlfnKmrphEaxHRt10";
    const lastOrderId = sessionStorage.getItem("cms_oid");
    const stripePayment = JSON.parse(sessionStorage.getItem("stripePayment"));
    const isStripeTestOrder = stripePayment && !stripePayment.isLive;
    const orderSummaryData =
      JSON.parse(sessionStorage.getItem("orderSummary")) || [];
    const customerCardId =
      orderSummaryData[0]?.order?.customer_card_id ||
      orderSummaryData[0]?.customer_card_id;
    const cartToken = await createCart(orderData);
    const offerIdFromOrderData = orderData.offers?.[0]?.offer_id;
    let shippingProfileId;
    orderData.offers = [];

    const uniqueSelectedProductIds = getUniqueSelectedProductIds();
    uniqueSelectedProductIds.forEach( (selectedProductId) => {
      const selectedProductOfferData = getVrioOfferIdByProductId(selectedProductId);
      const selectedProductOfferId =
        selectedProductOfferData.offerId ?? offerIdFromOrderData;
      const isVipProduct = Boolean(
        isVipUpsell &&
          selectedProductOfferData.isRecurringOffer,
      );
      orderData.offers.push({
          offer_id: selectedProductOfferId,
          order_offer_quantity: 1,
          item_id: selectedProductId,

          order_offer_upsell: true,
          parent_offer_id: offerIdFromOrderData,
          parent_order_id: lastOrderId,
          ...(isVipProduct ? { order_offer_price: "0.00" } : {})
      })

      const productElement = getProductElement((selectedProductId));
      saveProductCustomData(productElement);
      let { product, quantity } = getBindedShippableProductAndQuantity(productElement) ?? {};
      if (product) {
        shippingProfileId = +document.querySelector(`[data-shippable-product-id="${product.id}"]`)?.getAttribute('data-shipping-profile-id') || undefined;
        const bindedProductOfferData = getVrioOfferIdByProductId(product.id);
        const bindedProductOfferId =
          bindedProductOfferData.offerId ?? selectedProductOfferId;
        orderData.offers.push({
          offer_id: bindedProductOfferId,
          order_offer_upsell: true,
          parent_offer_id: offerIdFromOrderData,
          parent_order_id: lastOrderId,
          item_id: product.id,
          order_offer_quantity: quantity,
        });
      }
    })

    orderData.cart_token = cartToken;

    if (customerCardId) {
      orderData.customer_card_id = customerCardId;
    }

    sessionStorage.setItem("cart_token", cartToken);
    const addressData = JSON.parse(sessionStorage.getItem("addressData"));

    const sanitizedOrderData = removeObjectUndefinedProperties(!orderData.email ? {...orderData, ...addressData} : orderData);

    if (isTest) console.log("Sending upsell to VRIO", orderData);
    MVMT.track("UPSELL_SUBMITTED", {
      page: "upsell",
      page_type: "Upsell",
      page_url: window.location.href,
      order_data: orderData,
    });

    const response = await fetch(
      `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/orders`,
      {
        method: "POST",
        headers: {
          authorization: `appkey ${INTEGRATION_ID}`,
          "Content-Type": "application/json; charset=utf-8",
        },
            body: JSON.stringify({
          ...sanitizedOrderData,
          campaign_id: CAMPAIGN_ID,
          order_id: lastOrderId,
          shipping_profile_id: shippingProfileId,
          tracking12: window.location.href
        }),
      }
    );

    const result = await response.json();
    console.log(result);

    if (isStripeTestOrder && result.order_id) {
      await flagOrderAsTest(result.order_id);
    }

    if (stripePayment && result && result.response_code === 101) {
      if (errorEl) {
        errorEl.innerText =
          i18n.errors.walletVerificationFailed;
        errorEl.style.display = "block";
      }
      if (window.MVMT) {
        MVMT.track("UPSELL_ERROR", {
          page: "upsell",
          page_type: "Upsell",
          page_url: window.location.href,
          order_data: orderData
        });
      }
      return;
    }

    if (!response.ok || (result && result.error) || !result.order_id) {
      console.error("Something went wrong");
      if (preload) preload.style.display = "none";
      const msg =
        (result && result.error && result.error.message) ||
        (result && result.message) ||
        i18n.errors.walletOrderFailed;

      if (errorEl) {
        errorEl.innerText = msg;
        errorEl.style.display = "block";
      } else {
        showToast(msg);
      }
      MVMT.track("UPSELL_ERROR", {
        page: "upsell",
        page_type: "Upsell",
        page_url: window.location.href,
        order_data: orderData,
      });
      return;
    }

    MVMT.track("UPSELL_SUCCESS", {
      page: "upsell",
      page_type: "Upsell",
      page_url: window.location.href,
      order_data: orderData,
    });
    MVMT.track("CTA_CLICK", {
      page: "upsell",
      page_type: "Upsell",
      page_url: window.location.href,
    });

    if (isTest) console.log(result);

    const orderDataSummary = JSON.parse(sessionStorage.getItem("orderSummary")) || [];
    orderDataSummary.push(result);
    sessionStorage.setItem("orderSummary", JSON.stringify(orderDataSummary));

    sessionStorage.setItem("cms_oid", result.order_id);
    sessionStorage.setItem("orderData", JSON.stringify(sanitizedOrderData));
    const orderids = JSON.parse(sessionStorage.getItem("orderids")) || [];
    sessionStorage.setItem("orderids", JSON.stringify([...orderids, result.order_id]));
    sessionStorage.setItem("productCustomData", JSON.stringify(productCustomData));

    const paymentMethodId = sanitizedOrderData.payment_method_id;

    const paymentMethodNames = {
      [PAYMENT_METHODS_IDS.creditCard]: "creditCard",
      [PAYMENT_METHODS_IDS.googlePay]: "Google Pay",
      [PAYMENT_METHODS_IDS.applePay]: "Apple Pay",
      [PAYMENT_METHODS_IDS.paypal]: "PayPal",
      [PAYMENT_METHODS_IDS.klarna]: "Klarna"
    };

    const paymentMethodName = paymentMethodNames[paymentMethodId] || paymentMethodNames[PAYMENT_METHODS_IDS.creditCard];
    
    sendTransactionToDataLayer(vrioToTransaction(result), paymentMethodName);

    try {
      if (typeof sendKlaviyoOrderEvents === 'function') {
        await sendKlaviyoOrderEvents(sanitizedOrderData, result);
      }
    } catch (error) {
      console.error("Error sending order events to Klaviyo", error);
    }

    window.location.href = getNextPageSlugForRedirect();
  } catch (error) {
    console.error(error);
    if (errorEl) {
      errorEl.innerText = i18n.errors.unexpectedError;
      errorEl.style.display = "block";
    } else {
      showToast(i18n.errors.unexpectedError);
    }
  } finally {
    if (preload) preload.style.display = "none";
    setUpsellButtonsDisabled(false);
  }
};

const areAllProductsRecurring = () => {
  const pageProductIds = getUniqueSelectedProductIds();
  return pageProductIds.length > 0 && pageProductIds.every((productId) => isRecurringProduct(productId));
}


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
      page_type: "Upsell",
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
      location: "builder-events/upsell/vrio-upsell-js-generator.ts" + ":KlaviyoLifecycle:page_ready",
      message: "Klaviyo lifecycle: page ready",
      runId: "initial",
      hypothesisId: "KlaviyoLifecycle",
      data: { pageName: "upsell", pageType: "Upsell" },
    };
    if (klaviyoDebugEnabled && typeof console !== "undefined" && console.log) {
      console.log("[Klaviyo lifecycle] page_ready " + JSON.stringify(pageReadyPayload.data));
    }
  } catch (e) {}
}

  const isKlarnaReturnFlow = Boolean(getParams().get("payment_intent"));
  const shouldAutoSkip = isKlarnaPayment && isVipUpsell && areAllProductsRecurring();
  if (shouldAutoSkip) {
    const screen = getOrCreateVipAutoSkipScreen();
    screen.style.display = "flex";
  }
  
  if (isKlarnaPayment) {
    setUpsellButtonsDisabled(true);
    try {
      await returnKlarna();
    } finally {
      setUpsellButtonsDisabled(false);
    }
  }
  applyKlarnaVisibility();

  if (shouldAutoSkip && !isKlarnaReturnFlow) {
    try {
      await runDeclineFlow({ isAutoSkip: true });
      return;
    } catch (error) {
      console.error("Failed to auto-skip VIP recurring page", error);
      const screen = getOrCreateVipAutoSkipScreen();
      screen.style.display = "none";
    }
  }

  const upsellPrice = await getPrices(prices);

  const takeUpsellBtns = document.querySelectorAll("[data-submit-button]");
  const refuseUpsellBtns = document.querySelectorAll("[data-decline-button]");
  const selectableProductsFromUI = document.querySelectorAll("[data-product-card]");

  takeUpsellBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (isKlarnaPayment) {
        await processKlarnaUpsell();
      } else {
        await processUpsell();
      }
    });
  });
  refuseUpsellBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      await runDeclineFlow();
    });
  });
  selectableProductsFromUI?.forEach((productEl) => {
    productEl.addEventListener("click", () => {
      selectableProductsFromUI.forEach((productEl) => {
        productEl.classList.remove("product-card-active");
      });
      productEl.classList.add("product-card-active");
    });
  });
});
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
};;
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
      type: "Upsell",
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
      step: "Upsell",
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
              group: "upsell",
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
              group: "upsell",
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
  