// import {register} from "@shopify/web-pixels-extension";

// register(({ analytics, browser, init, settings }) => {
//     // Bootstrap and insert pixel script tag here

//     // Sample subscribe to page view
//     analytics.subscribe('all_standard_events', (event) => {
//       console.log('Events Data', event);
//     });
// });




import { register } from '@shopify/web-pixels-extension';
import {mixpanel_token} from '../../credentials.json';
import {app_url} from '../../credentials.json';
console.log("app_url", app_url);

const token = mixpanel_token;

// ✅ Custom event name mapping — place it here at the top
const eventNameMap = {
  "page_viewed": "Page Viewed",
  "product_viewed": "Product Viewed",
  "collection_viewed": "Collection Viewed",
  "checkout_completed": "Checkout Completed",
  "product_added_to_cart": "Added to Cart",
  "product_removed_from_cart": "Removed from Cart",
  "cart_viewed": "Cart Viewed"
};

function flattenObject(obj, prefix = '') {
  let flattened = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }
  return flattened;
}

function getUTMParameters(url) {
  if (!url) return {};
  try {
    const urlParams = new URLSearchParams(new URL(url).search);
    return {
      utm_source: urlParams.get("utm_source") || "None",
      utm_medium: urlParams.get("utm_medium") || "None",
      utm_campaign: urlParams.get("utm_campaign") || "None",
      utm_term: urlParams.get("utm_term") || "None",
      utm_content: urlParams.get("utm_content") || "None",
    };
  } catch (e) {
    console.error("Failed to extract UTM parameters:", e.message);
    return {};
  }
}

function getDeviceInfo() {
  const userAgent = navigator.userAgent;

  let os = "";
  let device = "Desktop";

  if (/windows phone/i.test(userAgent)) {
    os = "Windows Phone";
    device = "Mobile";
  } else if (/android/i.test(userAgent)) {
    os = "Android";
    device = "Mobile";
  } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    os = "iOS";
    device = "Mobile";
  } else if (/Macintosh/.test(userAgent)) {
    os = "MacOS";
  } else if (/Windows/.test(userAgent)) {
    os = "Windows";
  } else if (/Linux/.test(userAgent)) {
    os = "Linux";
  }

  return { os, device };
}


register(({ analytics }) => {
  analytics.subscribe('all_standard_events', async (event) => {
    const { clientId } = event;
    const timeStamp = event.timestamp;
    const eventId = event.id;
    console.log("Events Data", event);

    const originalEventType = event.name;
    const eventType = eventNameMap[originalEventType] || originalEventType;

    const pageUrl = event.context?.window?.location?.href || "Unknown";
    const pathname = event.context?.window?.location?.pathname || "/";
    const orig_referrer = event.context?.document?.referrer || "direct";
    const utmParams = getUTMParameters(pageUrl);
    const flatEventData = flattenObject(event.data || {});

    const screen_width = event.context.window.screen.width;
    const screen_height = event.context.window.screen.height;

    const { os, device } = getDeviceInfo();

    // ✅ Send User Profile Data to Mixpanel
    const userProfilePayload = {
      $token: token,
      $distinct_id: clientId,
      $set: {
        $created_at: new Date().toISOString()
      }
    };

    try {
      await fetch('https://api.mixpanel.com/engage/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: btoa(JSON.stringify(userProfilePayload)) })
      });

      // ✅ Send Event Data
      const eventPayload = {
        event: eventType,
        properties: {
          distinct_id: clientId,
          token: token,
          persistence: 'localStorage',
          timeStamp: timeStamp,
          $insert_id: eventId,
          pageUrl: pageUrl,
          pathname: pathname,
          $referring_domain: orig_referrer,
          $screen_width: screen_width,
          $screen_height: screen_height,
          $operating_system: os,
          device_type: device,
          ...flatEventData,
          ...utmParams
        },
      };

      const response = await fetch('https://api.mixpanel.com/track/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          data: btoa(JSON.stringify(eventPayload)),
        }),
      });

      const responseData = await response.text();
      console.log("Mixpanel Event Response:", responseData);

      // ✅ Send clientId to your backend
      // const appURL = process.env.APP_URL;
      const appURL = app_url || "https://production-app-cool-feather-3459.fly.dev"; //Fallback to hardcoded URL
      console.log("appURL", appURL);
      await fetch(`${appURL}/api/store-clientId`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: btoa(JSON.stringify({ clientId })),
        }),
      });

    } catch (error) {
      console.error("Mixpanel error:", error);
    }
  });


  analytics.subscribe('clicked', async (event) => {
    const { timestamp, id, clientId } = event;
    const timeStamp = event.timestamp;
    const elementid = event.data?.element?.id || "clicked";
    const flatEventData = flattenObject(event.data || {});
    const pageUrl = window.location.href || "Unknown";
    const pathname = window.location.pathname || "";
    // Match everything after '/modern'
    const afterModernMatch = pathname.match(/\/modern(\/.*)?/);
  
    const afterModernPath = afterModernMatch && afterModernMatch[1] ? afterModernMatch[1] : "";
    
    const orig_referrer = event.context.document.referrer;
    const screen_width = screen.availWidth;
    const screen_height = screen.availHeight;
  
  
  
  
    const utmParams = getUTMParameters(pageUrl);
  
  
    try {
      let eventName = elementid;
  
      if (
        elementid === "quiz-clicked-arrow" ||
        elementid === "quiz-clicked" ||
        elementid === "quiz-clicked-smiley" ||
        elementid === "quiz-clicked-not-sure" ||
        elementid === "quiz-clicked-heading"
      ) {
        eventName = "quiz-clicked";
      } else if (elementid === "quinn-cards-1") {
        eventName = "quinn-widget-interaction";
      }
      else if (elementid === "color-swatch-clicked") {
        eventName = "color-swatch-clicked";
      }
      const response = await fetch('https://api.mixpanel.com/track/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          data: btoa(
            JSON.stringify({
              event: eventName,
              properties: {
                distinct_id: clientId,
                token: token,
                timeStamp: timeStamp,
                pageUrl: pageUrl,
                pathname: afterModernPath,
                $referring_domain: orig_referrer,
                $screen_width: screen_width,
                $screen_height: screen_height,
                device: device,
                $operating_system: os,
                ...flatEventData,
                ...utmParams,
                
              },
            })
          ),
        }),
      });
  
      const responseData = await response.text();
      console.log(`Mixpanel ${eventName} Event Response:`, responseData);
    } catch (error) {
      console.error("Mixpanel Event Error:", error);
    }
  });
  
});
