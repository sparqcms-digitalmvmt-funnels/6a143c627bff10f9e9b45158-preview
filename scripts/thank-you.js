
const KLAVIYO_PUBLIC_API_KEY = 'XdCWtk';

const EMAIL_OVERSIGHT_VALIDATE_URL = 'https://app-cms-api-proxy-staging-001.azurewebsites.net/integration/email-oversight/validate-public';


(function() {
  try {
    var klaviyoLifecyclePayload = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8),
      timestamp: Date.now(),
      location: "builder-events/thank-you/vrio-thank-you-js-generator.ts" + ':KlaviyoLifecycle:initialized',
      message: 'Klaviyo lifecycle: initialized',
      runId: 'initial',
      hypothesisId: 'KlaviyoLifecycle',
      data: {
        pageName: "thank-you",
        pageType: "ThankYou",
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
      location: "builder-events/thank-you/vrio-thank-you-js-generator.ts" + ':KlaviyoTrace',
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
          page: "thank-you",
          page_type: "ThankYou",
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
                  page: "thank-you",
                  page_type: "ThankYou",
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
      offer: kOfferName, page_type: "ThankYou",
      hostName: window.location.hostname, pagePath: window.location.pathname,
      step: "ThankYou", group: "upsell",
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
      offer: kOfferNames, page_type: "ThankYou", step: "ThankYou",
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
      page_type: "ThankYou",
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


// Select campaign based on whether this is a VIP page or not
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
// For thank you without upsell, use non-VIP campaign
const campaignInfo = getVrioCampaignInfoBasedOnPaymentMethod(false);
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

const THANK_YOU_NEXT_PAGE_SLUG = "";

function getNextPageSlugForRedirect() {
  const normalize = (value) => {
    if (!value) return "";
    return value.startsWith("/6a143c627bff10f9e9b45158-preview") ? value : (value.startsWith("/") ? "/6a143c627bff10f9e9b45158-preview" + value : "/6a143c627bff10f9e9b45158-preview/" + value);
  };
  if (THANK_YOU_NEXT_PAGE_SLUG) return normalize(THANK_YOU_NEXT_PAGE_SLUG);
  return "/";
}
const PAYMENT_METHODS_IDS = {"creditCard":1,"googlePay":3,"applePay":4,"paypal":6,"klarna":12};

const prices = [{"name":"1x EXTRA Vi-Shift Glasses","id":232,"quantity":1,"price":19.99,"shippable":false,"fullPrice":19.99,"finalPrice":19.99,"productName":"1x EXTRA Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"1x Flexible Glasses","id":224,"quantity":1,"price":29.99,"shippable":false,"fullPrice":29.99,"finalPrice":29.99,"productName":"1x Flexible Glasses","discountAmount":0,"discountPercentage":0},{"name":"1x USB 3.0 Quick Charger","id":59,"quantity":1,"price":0,"shippable":false,"fullPrice":0,"finalPrice":0,"productName":"1x USB 3.0 Quick Charger","discountAmount":0,"discountPercentage":0},{"name":"2x Vi-Shift Glasses","id":225,"quantity":1,"price":53.98,"shippable":false,"fullPrice":53.98,"finalPrice":53.98,"productName":"2x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"3 Year Extended Warranty","id":230,"quantity":1,"price":10,"shippable":false,"fullPrice":10,"finalPrice":10,"productName":"3 Year Extended Warranty","discountAmount":0,"discountPercentage":0},{"name":"3x Vi-Shift Glasses","id":226,"quantity":1,"price":71.97,"shippable":false,"fullPrice":71.97,"finalPrice":71.97,"productName":"3x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"4x Vi-Shift Glasses","id":227,"quantity":1,"price":83.96,"shippable":false,"fullPrice":83.96,"finalPrice":83.96,"productName":"4x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"5x Vi-Shift Glasses","id":228,"quantity":1,"price":89.95,"shippable":false,"fullPrice":89.95,"finalPrice":89.95,"productName":"5x Vi-Shift Glasses","discountAmount":0,"discountPercentage":0},{"name":"Journey Package Protection","id":231,"quantity":1,"price":3.5,"shippable":false,"fullPrice":3.5,"finalPrice":3.5,"productName":"Journey Package Protection","discountAmount":0,"discountPercentage":0},{"name":"Vi-Shift Glasses - Expedited Shipping","id":233,"quantity":1,"price":9.99,"shippable":false,"fullPrice":9.99,"finalPrice":9.99,"productName":"Vi-Shift Glasses - Expedited Shipping","discountAmount":0,"discountPercentage":0},{"name":"Vi-Shift Protective Case Upgrade","id":229,"quantity":1,"price":9.95,"shippable":false,"fullPrice":9.95,"finalPrice":9.95,"productName":"Vi-Shift Protective Case Upgrade","discountAmount":0,"discountPercentage":0},{"name":"VIP Customer Benefits","id":34,"quantity":1,"price":9.95,"shippable":false,"fullPrice":9.95,"finalPrice":9.95,"productName":"VIP Customer Benefits","discountAmount":0,"discountPercentage":0}];
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
const isKlarnaPayment = isKlarnaSelected();

const applyKlarnaVisibilityForThankYou = () => {
  
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

if (true) {
  sessionStorage.removeItem('cart');
  sessionStorage.removeItem('cart_token');
  sessionStorage.removeItem('payment_token_id');
  sessionStorage.removeItem('PayerID');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('ba_token');
}
const elementsMappingContent = {
  // lead data
  "[data-email]": (orderDetails) => orderDetails.customer.email,
  "[data-first-name]": (orderDetails) => orderDetails.customer_address_shipping.fname,
  "[data-last-name]": (orderDetails) => orderDetails.customer_address_shipping.lname,
  "[data-billing-first-name]": (orderDetails) => orderDetails.customer_address_billing.fname ?? orderDetails.customer_address_shipping.fname,
  "[data-billing-last-name]": (orderDetails) => orderDetails.customer_address_billing.lname ?? orderDetails.customer_address_shipping.lname,
  "[data-phone]": (orderDetails) => orderDetails.customer.phone,

  // shipping address
  "[data-line-1]": (orderDetails) =>
    orderDetails.customer_address_shipping.address1,
  "[data-line-2]": (orderDetails) =>
    orderDetails.customer_address_shipping.address2,
  "[data-city]": (orderDetails) => orderDetails.customer_address_shipping.city,
  "[data-select-countries]": (orderDetails) =>
    orderDetails.customer_address_shipping.country,
  "[data-select-states]": (orderDetails) =>
    orderDetails.customer_address_shipping.state,
  "[data-zip-code]": (orderDetails) =>
    orderDetails.customer_address_shipping.zipcode,

  // billing address
  "[data-billing-line-1]": (orderDetails) =>
    orderDetails.customer_address_billing.address1,
  "[data-billing-line-2]": (orderDetails) =>
    orderDetails.customer_address_billing.address2,
  "[data-billing-city]": (orderDetails) =>
    orderDetails.customer_address_billing.city,
  "[data-billing-select-countries]": (orderDetails) =>
    orderDetails.customer_address_billing.country,
  "[data-billing-select-states]": (orderDetails) =>
    orderDetails.customer_address_billing.state,
  "[data-billing-zip-code]": (orderDetails) =>
    orderDetails.customer_address_billing.zipcode,

  // order data
  "[data-holder='order_date']": (orderDetails) => {
    if (orderDetails) {
      // "2023-04-01 00:00:00" → "2023-04-01"
      const isoDate = orderDetails.date_created.split(" ")[0]; 
      const [year, month, day] = isoDate.split("-");
      return formatDateByConvention(year, month, day);
    }

    // Fallback: today's date
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return formatDateByConvention(year, month, day);
  },
};



document.addEventListener("DOMContentLoaded", async () => {
  try {
  applyKlarnaVisibilityForThankYou();
  const orderids = JSON.parse(sessionStorage.getItem("orderids"));

  const endpoint =
    `orders?order_id=${orderids.join(",")}` +
    `&with=order_offers,customer_address_billing,customer_address_shipping,customer,transactions,cart&pageId=77MWdbkj0heyMnkl4sD2XGHKeW-4LomXN6bpQ2zOxBpefP5Dj3owZzcGn_Dz8xx9`

  const response = await fetch(
    `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/${endpoint}`,
    {
      method: "GET",
      headers: {
        authorization: `appkey ${INTEGRATION_ID}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );

  const orderDetails = await response.json();

  for (const selector in elementsMappingContent) {
    const htmlElements = Array.from(document.querySelectorAll(selector));
    if (htmlElements.length > 0) {
      const elementContent = elementsMappingContent[selector];
      if (typeof elementContent === "function") {
        const content = elementsMappingContent[selector](
          orderDetails.orders[0]
        );
        if (htmlElements) {
          htmlElements.forEach((element) => (element.innerHTML = content || ''));
        }
      } else if (typeof elementContent === "string") {
        const content = orderDetails.orders[0][elementContent];
        htmlElements.forEach((element) => (element.innerText = content || ''));
      } else {
        htmlElements.forEach((element) => (element.style.display = "none"));
      }
    }
  }

  const orderSummaryItems = document.querySelector(
    "[data-order-summary-items]"
  );
  const initSummary = {
    items: [],
    totals: { subtotal: 0, shipping: 0, tax: 0 },
  };

  summary = initSummary;
  const totalPriceOfProductsChargedAfterMonth = orderDetails.orders.reduce(
    (accOrdersPrice, order) =>
      accOrdersPrice +
      (order.order_offers
        ?.filter((orderOffer) => orderOffer.charge_timeframe_name === 'Monthly')
        ?.reduce(
          (accOfferPrice, offer) => {
            const isVipUpsellFree = Number(offer.order_offer_price) === 0;
            if (!isVipUpsellFree) {
              return accOfferPrice;
            }
            const recurringAmount = Number(offer.last_recurring_amount) || 0;
            return accOfferPrice + recurringAmount;
          },
          0,
        ) ?? 0),
    0,
  );

  const ordersWithFilteredTransactions = orderDetails.orders.map((order) => ({
    ...order,
    filteredTransactions: (order.transactions || []).filter(
      (transaction) =>
        transaction?.transaction_declined !== true && !!transaction?.date_complete
    ),
  }));

  const orderTotal = ordersWithFilteredTransactions.reduce((acc, order) => {
    if (order.cart) return Number(order.cart.total_items) + acc;
    // Fallback: sum transaction prices when cart is null (e.g. Klarna)
    return order.filteredTransactions.reduce(
      (tAcc, t) => tAcc + Number(t.transaction_price || 0),
      acc
    );
  }, 0)
  summary.totals.subtotal = Math.max(orderTotal - totalPriceOfProductsChargedAfterMonth, 0);
  summary.totals.shipping = ordersWithFilteredTransactions.reduce((acc, order) => {
    if (order.cart) return Number(order.cart.total_shipping) + acc;
    return order.filteredTransactions.reduce(
      (tAcc, t) => tAcc + Number(t.transaction_shipping || 0),
      acc
    );
  }, 0);
  summary.totals.tax = ordersWithFilteredTransactions.reduce((acc, order) => {
    if (order.cart) return Number(order.cart.total_tax) + acc;
    return order.filteredTransactions.reduce(
      (tAcc, t) => tAcc + Number(t.transaction_tax || 0),
      acc
    );
  }, 0);

  const productCustomData = JSON.parse(sessionStorage.getItem("productCustomData")) || {};
  orderDetails.orders.forEach((order) => {
    const offers = order.cart
      ? order.cart.offers
      : (order.order_offers || []).map((oo) => ({
          item_id: oo.order_offer_items?.[0]?.item_id,
          item_name: oo.order_offer_items?.[0]?.item_name || oo.offer_name,
          order_offer_quantity: oo.order_offer_quantity,
          total: Number(oo.order_offer_price)
        })); 

    offers.forEach((item) => {
      const itemData = item;
      const notExtra = !itemData.item_name.toLowerCase().includes("extra");
      const notGift = productCustomData[itemData.item_id]?.customIsGift !== "true";
      const qtyZeroOrFree = itemData.order_offer_quantity <= 0 || itemData.total <= 0;
      if (notExtra && notGift && qtyZeroOrFree) {
        return;
      }
      const line_item = {
        name:
          productCustomData[itemData.item_id]?.customProductName ||
          itemData.item_name,
        quantity: itemData.order_offer_quantity,
        price: Number(itemData.total),
        summaryRowOrder: productCustomData[itemData.item_id]?.customSummaryRow || 0,
      };
      summary.items.push(line_item);
    });
  });

  const total = 
    summary.totals.subtotal +
    summary.totals.shipping +
    summary.totals.tax
  ;
  let items = '';
  initSummary.items
    .sort((i1, i2) => i1.summaryRowOrder - i2.summaryRowOrder)
    .forEach((item) => {
      items += `
        <div style="display: flex;justify-content: space-between;width: 100%;">
          <div> ${item.quantity > 1 ? `${item.quantity}x` : '' } ${item.name}</div>
          <div style="text-align:center; min-width: 50px;">${item.price > 0 ? formatPrice(item.price) : i18n.pricingText.free}</div>
        </div>
        `;
    });

  orderSummaryItems.innerHTML = items;
  const editSubmitBtn = document.querySelector('[data-submit-address]');
  if (editSubmitBtn) {
    const editableElements = [...document.querySelectorAll('[data-content-editable]')];
    const editBtn = document.querySelector('[data-edit-address]');
    const editBtnText = editBtn.innerText;
    let confirmClickedOnce = false;
    const countryEl = document.querySelector("[data-select-countries]");
    const countriesMap = {
      "US": "United States",
      "CA": "Canada",
      "GB": "United Kingdom",
      "AU": "Australia",
      "DE": "Deutschland",
      "FR": "France",
      "ES": "España",
      "IT": "Italia",
    }

    function buildCountrySelect(currentValue) {
      const select = document.createElement("select");
      select.style.width = "100%";
      select.setAttribute("data-testid", "dropdown-country");
      campaignInfo.countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.iso_2;
        option.textContent = countriesMap[country.iso_2] || country.name;
        if (country.iso_2 === currentValue || country.name === currentValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      return select;
    }

    function enterCountryEditMode() {
      if (!countryEl) return;
      const currentValue = countryEl.innerHTML.trim();
      countryEl.innerHTML = "";
      countryEl.appendChild(buildCountrySelect(currentValue));
      countryEl.classList.add("editable-on");
    }

    function exitCountryEditMode() {
      if (!countryEl) return;
      const select = countryEl.querySelector("select");
      if (!select) return;
      countryEl.innerHTML = select.value;
      countryEl.classList.remove("editable-on");
    }

    async function submitEditAddress() {
      editSubmitBtn.setAttribute('disabled', 'true');
      editSubmitBtn.style.cursor = 'wait';
      document.body.style.cursor = 'wait';

      if (editableElements[0]?.getAttribute('contenteditable') === 'true') {
        editBtn.click();
      }
      const data = editableElements.reduce((acc, el) => {
        const firstDataSet = Object.keys(el.dataset)[0];
        const innerSelect = el.querySelector("select");
        acc[firstDataSet] = innerSelect ? innerSelect.value : el.innerHTML;
        return acc;
      }, {});

      const orderIds = JSON.parse(sessionStorage.getItem('orderids'));

      const customerId = orderDetails.orders[0].customer.customer_id;

      try {
        const body = {
          orders: orderIds,
          fname: data.firstName,
          lname: data.lastName,
          address1: data['line-1'],
          city: data.city,
          state: data.selectStates,
          zipcode: data.zipCode,
          country: data.selectCountries,
          address2: data['line-2'] || '',
          address_type: 'shipping',
        };

        const response = await fetch(
          `https://app-cms-api-proxy-staging-001.azurewebsites.net/vrio/customers/${customerId}/addresses`,
          {
            method: 'POST',
            headers: {
              authorization: `appkey ${INTEGRATION_ID}`,
              'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify(body),
          }
        );

        const orderData = await JSON.parse(sessionStorage.getItem('orderData'));

        orderData.ship_fname = data.firstName;
        orderData.ship_lname = data.lastName;
        orderData.ship_address1 = data['line-1'];
        orderData.ship_city = data.city;
        orderData.ship_state = data.selectStates;
        orderData.ship_zipcode = data.zipCode;
        orderData.ship_country = data.selectCountries;
        orderData.ship_address2 = data['line-2'] || '';

        sessionStorage.setItem('orderData', JSON.stringify(orderData));

        editSubmitBtn.setAttribute("style", "display:none !important");
        editBtn.setAttribute("style", "width: 100% !important");
        editBtn.innerHTML = `<span>${editBtnText}</span>`;
        editBtn.classList.add("edit-btn-shw");
        editBtn.classList.remove("cancel-btn");

        exitCountryEditMode();
        editableElements.forEach((el) => {
          if (el === countryEl) return;
          el.setAttribute("contenteditable", false);
          el.classList.remove("editable-on");
        });

        document.body.style.cursor = 'default';
      } catch (error) {
        console.error('Error updating order:', error);
      }
    }
  formEl = document.querySelector('[data-address-form]');
  const validate = new JustValidate(formEl, {
    errorFieldCssClass: ['field__is-invalid'],
    errorLabelCssClass: ['label__is-invalid'],
    validateBeforeSubmitting: true,
    validateOnBlur: true,
    focusInvalidField: true,
    lockForm: true,
    tooltip: {
      position: 'top',
    },
    errorFieldCssClass: 'is-invalid',
    errorLabelCssClass: 'error-message',
    errorLabelStyle: {
      color: '#ff3860',
      marginTop: '0.25rem',
      fontSize: '0.875rem',
    },
  });

  initializeFormValidation();
  function getInputs() {
    return document.querySelectorAll(`
      [data-first-name], 
      [data-last-name],
      [data-line-1],
      [data-line-2],
      [data-city],
      [data-select-states],
      [data-select-countries],
      [data-zip-code]
    `);
  }
  function clearValidationFeedback() {
    getInputs().forEach((input) => {
      input.classList.remove(
        "error",
        "is-invalid",
        "valid",
        "just-validate-success-field",
      );
    });
  }

  editSubmitBtn.addEventListener("click", (e) => {
    clearValidationFeedback();

    if (
      !editableElements
        .filter((el) => el !== countryEl)
        .every((el) => el.getAttribute("contenteditable") === "true")
    ) {
      e.preventDefault();
      confirmClickedOnce = true;
      editSubmitBtn.setAttribute("style", "display:none !important");
      editBtn.setAttribute("style", "width: 100% !important");
    } else {
      confirmClickedOnce = true;
    }
  });

  editBtn.addEventListener("click", () => {
    clearValidationFeedback();

    if (
      editableElements
        .filter((el) => el !== countryEl)
        .every((el) => el.getAttribute("contenteditable") === "true")
    ) {
      editBtn.innerHTML = `<span>${editBtnText}</span>`;
      editBtn.classList.add("edit-btn-shw");
      editBtn.classList.remove("cancel-btn");
      
      exitCountryEditMode();
      editableElements.forEach((el) => {
        if (el === countryEl) return;
        el.setAttribute("contenteditable", false);
        el.classList.remove("editable-on");
      });

      if (confirmClickedOnce) {
        editSubmitBtn.setAttribute("style", "display:none !important");
        editBtn.setAttribute("style", "width: 100% !important");
      } else {
        editSubmitBtn.removeAttribute("style");
        editSubmitBtn.style.flex = "1";
        editBtn.removeAttribute("style");
      }
    } else {
      editSubmitBtn.removeAttribute("style");
      editSubmitBtn.style.flex = "none";
      editBtn.removeAttribute("style");

      editBtn.classList.add("cancel-btn");
      editBtn.classList.remove("edit-btn-shw");

      editBtn.innerHTML = `
        <img
          src="https://stdigitalmvmtprod001.blob.core.windows.net/assets/develop/edit-address-back-tr.png"
          alt="Cancel Edit"
          width="9.5"
          height="16"
          class="back-btn-img"
        />`;

      editBtn.addEventListener("mouseover", () => {
        const backImg = document.querySelector(".back-btn-img");
        if (backImg) backImg.src = "https://stdigitalmvmtprod001.blob.core.windows.net/assets/develop/edit-address-back-white.png";
      });

      editBtn.addEventListener("mouseout", () => {
        const backImg = document.querySelector(".back-btn-img");
        if (backImg) backImg.src = "https://stdigitalmvmtprod001.blob.core.windows.net/assets/develop/edit-address-back-tr.png";
      });

      enterCountryEditMode();
      editableElements.forEach((el) => {
        if (el === countryEl) return;
        el.setAttribute("contenteditable", true);
        el.classList.add("editable-on");
      });
      editableElements[0].focus();
    }
  });

  generalError = document.querySelector('[data-general-error]');

  async function initializeFormValidation() {
    const fields = getInputs();
    const validateField = async (field) => {
      const dataAttr = Object.keys(field.dataset)[0]?.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      );
      if (dataAttr) {
        const selector = `[data-${dataAttr}]`;
        const isValid = await validate.revalidateField(selector);
        if (!isValid) {
          field.classList.add('error');
        } else {
          field.classList.remove('error');
          field.classList.add('valid');
          editSubmitBtn.removeAttribute('disabled');
        }
      }
    };

    let debounceTimer;
    Array.from(fields).forEach((field) => {
      field.addEventListener('input', async () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          await validateField(field);
        }, 500);
      });
      field.addEventListener('blur', () => validateField(field));
    });
  }

  // Just Validate validation for each field in the form
  function getFieldContent(selector) {
    const el = document.querySelector(selector);
    if (!el) return '';
    const innerSelect = el.querySelector("select");
    if (innerSelect) return innerSelect.value;
    if (el.hasAttribute('contenteditable')) {
      return el.innerHTML.trim();
    }
    if (el.innerHTML === "<br>") {
      el.innerHTML = '';
    }
    return el.innerHTML !== undefined ? el.innerHTML.trim() : '';
  }

  validate
    .addField('[data-first-name]', [
      {
        validator: () => getFieldContent('[data-first-name]').length > 0,
        errorMessage: i18n.validation.firstNameRequired,
      },
      {
        validator: () => getFieldContent('[data-first-name]').length <= 255,
        errorMessage: i18n.validation.maxLength255,
      },
      {
        validator: () => i18n.validationPatterns.nameRegex.test(getFieldContent('[data-first-name]')),
        errorMessage: i18n.validation.invalidCharacter,
      },
    ])
    .addField('[data-last-name]', [
      {
        validator: () => getFieldContent('[data-last-name]').length > 0,
        errorMessage: i18n.validation.lastNameRequired,
      },
      {
        validator: () => getFieldContent('[data-last-name]').length <= 255,
        errorMessage: i18n.validation.maxLength255,
      },
      {
        validator: () => i18n.validationPatterns.nameRegex.test(getFieldContent('[data-last-name]')),
        errorMessage: i18n.validation.invalidCharacter,
      },
    ])
    .addField('[data-line-1]', [
      {
        validator: () => getFieldContent('[data-line-1]').length > 0,
        errorMessage: i18n.validation.shippingAddressRequired,
      },
      {
        validator: () => getFieldContent('[data-line-1]').length <= 255,
        errorMessage: i18n.validation.maxLength255,
      },
    ])
    .addField('[data-line-2]', [
      {
        validator: () => getFieldContent('[data-line-2]').length <= 255,
        errorMessage: i18n.validation.maxLength255,
      },
    ])
    .addField('[data-city]', [
      {
        validator: () => getFieldContent('[data-city]').length > 0,
        errorMessage: i18n.validation.cityRequired,
      },
      {
        validator: () => getFieldContent('[data-city]').length <= 255,
        errorMessage: i18n.validation.maxLength255,
      },
    ])
    .addField('[data-select-countries]', [
      {
        validator: () => getFieldContent('[data-select-countries]').length > 0,
        errorMessage: i18n.validation.countryRequired,
      },
    ])
    .addField('[data-zip-code]', [
      {
        validator: () => getFieldContent('[data-zip-code]').length > 0,
        errorMessage: i18n.validation.zipRequired,
      },
      {
        validator: () => i18n.validationPatterns.zipCodeRegex.test(getFieldContent('[data-zip-code]')),
        errorMessage: i18n.validation.zipInvalid,
      },
    ])
    .onFail((fields) => {
      const fieldsArray = Object.entries(fields);
      for (let i = 0; i < fieldsArray.length; i += 1) {
        const [fieldSelector, data] = fieldsArray[i];
        const field = document.querySelector(fieldSelector);
        data.isValid
          ? field.classList.remove('error')
          : field.classList.add('error');
      }
      editSubmitBtn.setAttribute('disabled', true);
      const id = setTimeout(() => {
        const field = fieldsArray[0][1];
        field.elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearTimeout(id);
      }, 150);
    })
    .onSuccess(submitEditAddress);
    const stateField = document.querySelector("[data-select-states]");
    const orderData = JSON.parse(sessionStorage.getItem("orderData"));
    const hasState = orderData?.ship_state;

    if (stateField && !hasState) {
      stateField.remove();
    } else {
      validate.addField("[data-select-states]", [
        {
          validator: () => getFieldContent("[data-select-states]").length > 0,
          errorMessage: i18n.validation.stateRequired,
        },
      ]); 
    }
  }
  const totalExclTax = document.querySelector("[data-holder='total_excl_tax']");
  if (totalExclTax) {
    totalExclTax.innerText = formatPrice(summary.totals.subtotal + summary.totals.shipping);
  }
  const shippingExclTax = 
  document.querySelector("[data-holder='shipping_excl_tax']");
  if (shippingExclTax) {
    shippingExclTax.innerText = summary.totals.shipping ? formatPrice(summary.totals.shipping) : i18n.pricingText.free;
  }
  const totalInclTax = document.querySelectorAll("[data-holder='total_incl_tax']");
  
  if (totalInclTax && totalInclTax.length > 0) {
    totalInclTax.forEach((element) => (element.innerText = formatPrice(total)));
  }

  const orderNumber = document.querySelector("[data-holder='order_number']");
  if (orderNumber) {
    orderNumber.innerText = orderids.join(", ");
  }

  const orderData = JSON.parse(sessionStorage.getItem('orderData'));
  const orderEmail = document.querySelector("[data-holder='order_email']");
  if (orderEmail && orderData?.email) {
    orderEmail.innerText = orderData?.email;
  }

  
  } finally { if (window.__hidePreloader) window.__hidePreloader(); }
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
      type: "ThankYou",
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
      step: "ThankYou",
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
};;
