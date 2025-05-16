import { authenticate } from "../shopify.server";
import { clientIdStore } from "./api.store-clientId"; // Import the clientIdStore and send it as discinct_id
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("Webhook Payload:", payload);

  try {
    // Retrieve the latest clientId from the in-memory store
    const latestClientId = clientIdStore.length > 0 ? clientIdStore[clientIdStore.length - 1] : null;

    console.log("🔗 Associated clientId:", latestClientId);

    // Prepare the Mixpanel event
    const mixpanelEvent = {
      event: "Purchased",
      properties: {
        token: "5b1e136ab5f2e01c3ad5116151e68860",
        distinct_id: latestClientId || "unknown", // Use clientId if available, otherwise fallback
        checkout_token: payload.checkout_token,
        shop,
        topic,
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