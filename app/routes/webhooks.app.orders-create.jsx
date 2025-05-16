import { authenticate } from "../shopify.server";
import { clientIdStore } from "./api.store-clientId"; // Import the clientIdStore and send it as discinct_id
import {mixpanel_token} from '../../credentials.json';

const token = mixpanel_token;

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("Webhook Payload:", payload);

  const total_discounts = Number(payload.total_discounts); // Using Number to convert to integer
  const total_price = Number(payload.total_price); // Using Number to convert to integer


  // Function to safely get item details or default to 0 or "null" when not available
  const getItemDetails = (index) => {
    const item = payload.line_items[index] || {};
    return {
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
      title: item.name || "null",
      total_discount: Number(item.total_discount) || 0
    };
  };


// Get item details for up to 4 items
const item1 = getItemDetails(0);
const item2 = getItemDetails(1);
const item3 = getItemDetails(2);
const item4 = getItemDetails(3);

// Build arrays for purchased products (filter out undefined items)
const purchased_products_titles = [item1.title, item2.title, item3.title, item4.title].filter(title => title !== "null");
const purchased_products_prices = [item1.price, item2.price, item3.price, item4.price].filter(price => price !== 0);
const purchased_products_quantities = [item1.quantity, item2.quantity, item3.quantity, item4.quantity].filter(quantity => quantity !== 0);
const purchased_products_total_discounts = [item1.total_discount, item2.total_discount, item3.total_discount, item4.total_discount].filter(discount => discount !== 0);

// Combine items into a cart
const cart_items = [item1, item2, item3, item4].filter(item => item.title !== "null");

console.log(cart_items); // This will only contain items that exist


//Extact parameters from note_attributes

function extractNoteAttributes(attributes = []) {
  const data = {};
  attributes.forEach(attr => {
    if (attr.name && attr.value !== undefined) {
      data[attr.name] = attr.value;
    }
  });

  return {
    utm_source: data.utm_source || null,
    utm_medium: data.utm_medium || null,
    utm_campaign: data.utm_campaign || null,
    utm_content: data.utm_content || null,
    utm_term: data.utm_term || null,
    orig_referrer: data.orig_referrer || null,
    customer_type: data.customer_type || null,
    landing_page: data.landing_page || null,
    landing_page_url: data.landing_page_url || null,
  };
}

const extractedNoteAttributes = extractNoteAttributes(payload.note_attributes || []);





  try {
    // Retrieve the latest clientId from the in-memory store
    const latestClientId = clientIdStore.length > 0 ? clientIdStore[clientIdStore.length - 1] : null;

    console.log("🔗 Associated clientId:", latestClientId);

    // Prepare the Mixpanel event
    const mixpanelEvent = {
      event: "Purchased",
      properties: {
        token: token,
        distinct_id: latestClientId || "unknown", // Use clientId if available, otherwise fallback
        checkout_token: payload.checkout_token,
        shop,
        topic,
        $city: payload.customer?.default_address?.city,
        $region: payload.customer?.default_address?.province,
        $mp_country_code: payload.customer?.default_address?.country_code,
        order_name: payload.name,
        order_id: payload.id,
        order_created_at: payload.created_at,
        closed_at: payload.closed_at,
        canceled_at: payload.cancelled_at,
        cart_token: payload.cart_token,
        checkout_id: payload.checkout_id,
        currency: payload.currency,
        billing_address: payload.billing_address.address1,
        billing_city: payload.billing_address.city,
        biling_region: payload.billing_address.province,
        full_name: payload.billing_address.name,
        email: payload.email,
        currency: payload.currency,
        customer_id: payload.customer?.id,
        customer_created_at: payload.customer?.created_at,
        customer_updated_at: payload.customer?.updated_at,
        customer_email: payload.customer?.email,
        customer_first_name: payload.customer?.first_name,
        customer_last_name: payload.customer?.last_name,
        customer_phone: payload.customer?.phone,
        financial_status: payload.financial_status,
        fulfillment_status: payload.fulfillment_status,
        subtotal_price: payload.subtotal_price,
        total_discounts: payload.total_discounts,
        total_tax: payload.total_tax,
        shipping_address: payload.shipping_address.address1,
        shipping_city: payload.shipping_address.city,
        shipping_region: payload.shipping_address.province,
        shipping_country: payload.shipping_address.country,
        total_discounts: total_discounts,
        payment_gateway_names: payload.payment_gateway_names,
        total_price: total_price,
        line_items: cart_items,
        purchased_products_titles: purchased_products_titles,
        purchased_products_prices: purchased_products_prices,
        purchased_products_quantities: purchased_products_quantities,
        purchased_products_total_discounts: purchased_products_total_discounts,
        ...extractedNoteAttributes,
      },
    };

    // Send the event to Mixpanel
    await fetch("https://api.mixpanel.com/track/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        data: btoa(JSON.stringify(mixpanelEvent)),
      }),
    });

    console.log("checkout_completed event sent to Mixpanel");
  } catch (error) {
    console.error("Error sending event to Mixpanel:", error);
  }

  return new Response();
};