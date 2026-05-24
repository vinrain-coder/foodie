import { colors, layout, button } from "./layout";
import { formatCurrency, escapeHTML } from "@/lib/utils";

export function newsletterConfirmationTemplate({
  email,
  unsubscribeLink,
  siteName,
  siteUrl,
  siteCopyright,
}: {
  email: string;
  unsubscribeLink: string;
  siteName: string;
  siteUrl: string;
  siteCopyright: string;
}) {
  const escapedEmail = escapeHTML(email);
  const escapedSiteName = escapeHTML(siteName);
  const escapedUnsubscribeLink = escapeHTML(unsubscribeLink);

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: ${colors.slate950};">
            Welcome to the Newsletter! 🎉
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 26px; color: ${colors.slate700};">
            You're now subscribed to the ${escapedSiteName} newsletter with <strong>${escapedEmail}</strong>.
          </p>
          <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 26px; color: ${colors.slate700};">
            Stay tuned for the latest updates, exclusive offers, and expert advice from our team.
          </p>

          ${button({ href: siteUrl, label: "Explore Our Site" })}

          <p style="margin: 32px 0 0 0; font-size: 13px; line-height: 20px; color: ${colors.slate400};">
            If you'd like to unsubscribe, you can do so <a href="${escapedUnsubscribeLink}" style="color: ${colors.blue600}; text-decoration: none;">here</a>.
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `Welcome to the ${siteName} Newsletter!`,
    children: content,
    siteName,
    siteCopyright,
  });
}

/**
 * BNPL Repayment Success Template
 */
export function bnplRepaymentSuccessTemplate({
  customerName,
  orderId,
  amountPaid,
  remainingAmount,
  siteName,
  siteUrl,
  siteCopyright,
}: {
  customerName: string;
  orderId: string;
  amountPaid: string;
  remainingAmount: string;
  siteName: string;
  siteUrl: string;
  siteCopyright: string;
}) {
  const escapedName = escapeHTML(customerName);
  const escapedOrderId = escapeHTML(orderId.slice(-8).toUpperCase());
  const escapedAmount = escapeHTML(amountPaid);
  const escapedRemaining = escapeHTML(remainingAmount);

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px; text-align: center;">
          <div style="display: inline-block; background-color: ${colors.emerald50}; color: white; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 8px; border-radius: 4px; margin-bottom: 16px;">
            Payment Received
          </div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: ${colors.slate950};">
            Thank you for your payment!
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            Hi ${escapedName}, we've successfully processed your repayment for order <strong>#${escapedOrderId}</strong>.
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px; background-color: ${colors.slate50}; border: 1px solid ${colors.slate100}; border-radius: 16px;">
            <tr>
              <td style="padding: 24px; text-align: center;">
                <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">Amount Paid</p>
                <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 900; color: ${colors.slate950};">${escapedAmount}</p>
                <p style="margin: 16px 0 0 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">Remaining Balance</p>
                <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: ${colors.orange500};">${escapedRemaining}</p>
              </td>
            </tr>
          </table>

          ${button({
            href: `${siteUrl}/account/orders/${orderId}`,
            label: "View Order Details",
            backgroundColor: colors.slate950,
          })}
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `Payment Received: ${escapedAmount} for Order #${escapedOrderId}`,
    children: content,
    siteName,
    siteCopyright,
  });
}

/**
 * Welcome New User Template
 */
export function welcomeNewUserTemplate({
  name,
  siteName,
  siteUrl,
  siteCopyright,
  firstPurchaseDiscountRate,
}: {
  name?: string | null;
  siteName: string;
  siteUrl: string;
  siteCopyright: string;
  firstPurchaseDiscountRate: number;
}) {
  const escapedName = escapeHTML(name ?? "there");
  const escapedSiteName = escapeHTML(siteName);

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: ${colors.slate950};">
            Welcome, ${escapedName}!
          </h1>
          <p style="margin: 16px 0 0 0; font-size: 18px; line-height: 28px; color: ${colors.slate700};">
            We're thrilled to have you join ${escapedSiteName}.
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px; background-color: ${colors.emerald50}; border: 2px dashed ${colors.emerald200}; border-radius: 16px;">
            <tr>
              <td style="padding: 32px;">
                <p style="margin: 0; font-size: 12px; font-weight: 700; color: ${colors.emerald700}; text-transform: uppercase; letter-spacing: 0.1em;">
                  Special Welcome Gift
                </p>
                <h2 style="margin: 8px 0 0 0; font-size: 40px; font-weight: 900; color: ${colors.emerald900};">
                  ${firstPurchaseDiscountRate}% OFF
                </h2>
                <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 500; color: ${colors.emerald800};">
                  Enjoy this discount on your first purchase!
                </p>
              </td>
            </tr>
          </table>

          ${button({ href: siteUrl, label: "Start Shopping", backgroundColor: colors.emerald700 })}

          <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 24px; color: ${colors.slate600};">
            If you have any questions or need help getting started, our team is always here for you.
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `Welcome to ${siteName}!`,
    children: content,
    siteName,
    siteCopyright,
  });
}

/**
 * Admin Event Notification Template
 */
export function adminEventNotificationTemplate({
  title,
  description,
  href,
  meta,
  createdAt,
  siteName,
  siteUrl,
  siteCopyright,
}: {
  title: string;
  description: string;
  href: string;
  meta?: string;
  createdAt: string;
  siteName: string;
  siteUrl: string;
  siteCopyright: string;
}) {
  const escapedTitle = escapeHTML(title);
  const escapedDescription = escapeHTML(description);
  const escapedMeta = meta ? escapeHTML(meta) : "";
  const escapedCreatedAt = escapeHTML(new Date(createdAt).toLocaleString());
  const absoluteHref = href.startsWith("http") ? href : `${siteUrl}${href}`;

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 32px 32px 0 32px;">
           <div style="display: inline-block; background-color: ${colors.red500}; color: white; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 8px; border-radius: 4px; margin-bottom: 16px;">
             Admin Alert
           </div>
          <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: ${colors.slate950};">
            ${escapedTitle}
          </h2>
          <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            ${escapedDescription}
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; background-color: ${colors.slate50}; border: 1px solid ${colors.slate100}; border-radius: 12px;">
            <tr>
              <td style="padding: 16px 20px;">
                <p style="margin: 0; font-size: 13px; color: ${colors.slate500};">
                  <strong>Time:</strong> ${escapedCreatedAt}
                </p>
                ${escapedMeta ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: ${colors.slate500};"><strong>Meta:</strong> ${escapedMeta}</p>` : ""}
              </td>
            </tr>
          </table>

          ${button({ href: absoluteHref, label: "View in Dashboard", backgroundColor: colors.slate950 })}
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `[Admin Alert] ${title}`,
    children: content,
    siteName,
    siteCopyright,
  });
}

/**
 * Support Ticket Reply Template
 */
export function supportTicketReplyTemplate({
  customerName,
  subject,
  originalMessage,
  replyMessage,
  siteName,
  siteCopyright,
}: {
  customerName: string;
  subject: string;
  originalMessage: string;
  replyMessage: string;
  siteName: string;
  siteCopyright: string;
}) {
  const escapedName = escapeHTML(customerName);
  const escapedSubject = escapeHTML(subject);
  const escapedOriginal = escapeHTML(originalMessage);
  const escapedReply = escapeHTML(replyMessage);

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: ${colors.slate950};">
            Support Ticket Update
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            Hi ${escapedName},
          </p>
          <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            We've received your inquiry regarding <strong>"${escapedSubject}"</strong> and have a response for you.
          </p>

          <div style="margin-top: 32px; padding: 24px; background-color: ${colors.slate50}; border-radius: 16px; border: 1px solid ${colors.slate100};">
            <p style="margin: 0; font-size: 12px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">
              Our Response
            </p>
            <p style="margin: 12px 0 0 0; font-size: 16px; line-height: 26px; color: ${colors.slate900}; white-space: pre-wrap;">${escapedReply}</p>
          </div>

          <div style="margin-top: 24px; padding: 20px; border-left: 4px solid ${colors.slate200};">
            <p style="margin: 0; font-size: 12px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">
              Your Original Message
            </p>
            <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 22px; color: ${colors.slate500}; white-space: pre-wrap; font-style: italic;">${escapedOriginal}</p>
          </div>

          <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 24px; color: ${colors.slate600};">
            If you have any further questions, feel free to reply to this email.
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `Re: ${subject}`,
    children: content,
    siteName,
    siteCopyright,
  });
}

type TemplateSite = {
  url: string;
  name: string;
  copyright: string;
};

type TemplateOrderItem = {
  name: string;
  image: string;
  slug: string;
  quantity: number;
  price: number;
};

type StockTemplateMenuItem = {
  name: string;
  slug: string;
  price: number;
  images: string[];
};

type ReviewOrderTemplate = {
  _id: { toString(): string };
  items: TemplateOrderItem[];
};

type PurchaseReceiptOrderTemplate = {
  _id: { toString(): string };
  createdAt: Date | string;
  items: TemplateOrderItem[];
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  paymentMethod: string;
  paymentResult?: {
    paymentReference?: string;
  };
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    county: string;
    country: string;
  };
  coupon?: {
    code: string;
    discountAmount: number;
  } | null;
};

/**
 * Stock Subscription Notification Template
 */
export function stockSubscriptionNotificationTemplate({
  menuItem,
  unsubscribeToken,
  siteUrl,
  siteName,
  siteCopyright,
}: {
  menuItem: StockTemplateMenuItem;
  unsubscribeToken: string;
  siteUrl: string;
  siteName: string;
  siteCopyright: string;
}) {
  const escapedMenuItemName = escapeHTML(menuItem.name);
  const escapedMenuItemImage = escapeHTML(
    menuItem.images[0] || "https://via.placeholder.com/200",
  );
  const escapedUnsubscribeUrl = escapeHTML(
    `${siteUrl}/unsubscribe-stock?token=${encodeURIComponent(unsubscribeToken)}`,
  );

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: ${colors.slate950};">
            It's Back in Stock! 🔔
          </h1>
          <p style="margin: 12px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate600};">
            Good news! <strong>${escapedMenuItemName}</strong> is now available for purchase.
          </p>

          <div style="margin-top: 32px;">
            <a href="${escapeHTML(`${siteUrl}/menu-item/${menuItem.slug}`)}">
              <img src="${escapedMenuItemImage}" alt="${escapedMenuItemName}" width="240" style="border-radius: 16px; border: 1px solid ${colors.slate100};">
            </a>
          </div>

          <p style="margin: 24px 0 0 0; font-size: 24px; font-weight: 900; color: ${colors.slate950};">
            ${formatCurrency(menuItem.price)}
          </p>

          ${button({ href: `${siteUrl}/menu-item/${menuItem.slug}`, label: "Shop Now", backgroundColor: colors.orange500 })}

          <p style="margin: 32px 0 0 0; font-size: 12px; line-height: 18px; color: ${colors.slate400};">
            You're receiving this because you asked to be notified when this item returns.
            No longer interested? <a href="${escapedUnsubscribeUrl}" style="color: ${colors.blue600}; text-decoration: none;">Unsubscribe</a>.
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `"${menuItem.name}" is back in stock!`,
    children: content,
    siteName,
    siteCopyright,
  });
}

/**
 * Ask Review Order Items Template
 */
export function askReviewOrderItemsTemplate({
  order,
  site,
}: {
  order: ReviewOrderTemplate;
  site: TemplateSite;
}) {
  const escapedOrderId = escapeHTML(
    order._id.toString().slice(-8).toUpperCase(),
  );

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: ${colors.slate950};">
            How was your order?
          </h1>
          <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            We'd love to hear your thoughts on the items you purchased in order <strong>#${escapedOrderId}</strong>.
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 40px;">
            ${order.items
              .map((item: TemplateOrderItem) => {
                const escapedItemName = escapeHTML(item.name);
                const escapedItemImage = escapeHTML(
                  item.image.startsWith("/")
                    ? `${site.url}${item.image}`
                    : item.image,
                );
                const escapedItemUrl = escapeHTML(
                  `${site.url}/menu-item/${item.slug}#reviews`,
                );

                return `
              <tr>
                <td style="padding: 24px 0; border-bottom: 1px solid ${colors.slate100};">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="100" valign="top">
                        <img src="${escapedItemImage}" alt="${escapedItemName}" width="100" style="border-radius: 12px; border: 1px solid ${colors.slate100};">
                      </td>
                      <td style="padding-left: 24px; text-align: left;" valign="middle">
                        <p style="margin: 0; font-size: 17px; font-weight: 700; color: ${colors.slate950};">${escapedItemName}</p>
                        <p style="margin: 4px 0 16px 0; font-size: 14px; color: ${colors.slate500};">Quantity: ${item.quantity}</p>
                        <a href="${escapedItemUrl}" target="_blank" style="background-color: ${colors.orange500}; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block;">Leave a Review</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            `;
              })
              .join("")}
          </table>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: "Review your order items",
    children: content,
    siteName: site.name,
    siteCopyright: site.copyright,
  });
}

/**
 * Purchase Receipt Template
 */

export function purchaseReceiptTemplate({
  order,
  site,
}: {
  order: PurchaseReceiptOrderTemplate;
  site: TemplateSite;
}) {
  const dateFormatter = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  });

  const paymentResult = order.paymentResult ?? {};

  const reference =
    typeof paymentResult.paymentReference === "string"
      ? paymentResult.paymentReference
      : "-";

  const escapedOrderId = escapeHTML(order._id.toString());
  const escapedDate = escapeHTML(
    dateFormatter.format(new Date(order.createdAt)),
  );

  const escapedFullName = escapeHTML(order.shippingAddress.fullName);
  const escapedStreet = escapeHTML(order.shippingAddress.street);
  const escapedCity = escapeHTML(order.shippingAddress.city);
  const escapedCounty = escapeHTML(order.shippingAddress.county);
  const escapedCountry = escapeHTML(order.shippingAddress.country);

  const escapedPaymentMethod = escapeHTML(order.paymentMethod);
  const escapedReference = escapeHTML(reference);

  const couponSection = order.coupon
    ? `
      <tr>
        <td align="left" style="padding: 12px 0; font-size: 15px; color: ${colors.emerald700}; font-weight: 600;">
          Coupon (${escapeHTML(order.coupon.code)})
        </td>
        <td align="right" style="padding: 12px 0; font-size: 15px; color: ${colors.emerald700}; font-weight: 700;">
          -${formatCurrency(Math.abs(order.coupon.discountAmount))}
        </td>
      </tr>
    `
    : "";

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <!-- HERO -->
      <tr>
        <td style="padding: 40px 32px; text-align: center; background-color: ${colors.slate50};">
          <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: ${colors.slate950}; letter-spacing: -0.02em;">
            Order Confirmed!
          </h1>
          <p style="margin: 12px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate600};">
            Thanks for your purchase. We're getting your order ready for shipment.
          </p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding: 32px;">
          
          <!-- ORDER DETAILS -->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
            <tr>
              <td width="50%" valign="top">
                <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">Order ID</p>
                <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: ${colors.slate950};">#${escapedOrderId.slice(-8).toUpperCase()}</p>
              </td>
              <td width="50%" valign="top">
                <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">Date</p>
                <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: ${colors.slate950};">${escapedDate}</p>
              </td>
            </tr>
          </table>

          <!-- ITEMS -->
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: ${colors.slate950};">Items</h3>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid ${colors.slate100};">
            ${order.items
              .map((item: TemplateOrderItem) => {
                const escapedItemName = escapeHTML(item.name);
                const escapedItemImage = escapeHTML(
                  item.image.startsWith("/")
                    ? `${site.url}${item.image}`
                    : item.image,
                );

                return `
                  <tr>
                    <td style="padding: 20px 0; border-bottom: 1px solid ${colors.slate100};">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td width="64" valign="top">
                            <img src="${escapedItemImage}" alt="${escapedItemName}" width="64" height="64" style="border-radius: 8px; border: 1px solid ${colors.slate100}; object-fit: cover;">
                          </td>
                          <td style="padding-left: 16px;">
                            <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${colors.slate950}; line-height: 20px;">${escapedItemName}</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: ${colors.slate500};">Qty: ${item.quantity}</p>
                          </td>
                          <td align="right" valign="top">
                            <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${colors.slate950};">${formatCurrency(item.price)}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </table>

          <!-- TOTALS -->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px;">
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: ${colors.slate500};">Subtotal</td>
              <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: ${colors.slate950};">${formatCurrency(order.itemsPrice)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: ${colors.slate500};">Shipping</td>
              <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: ${colors.slate950};">${formatCurrency(order.shippingPrice)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 14px; color: ${colors.slate500};">Tax</td>
              <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: ${colors.slate950};">${formatCurrency(order.taxPrice)}</td>
            </tr>
            ${couponSection}
            <tr>
              <td style="padding: 16px 0 0 0; font-size: 18px; font-weight: 800; color: ${colors.slate950}; border-top: 2px solid ${colors.slate100};">Total</td>
              <td align="right" style="padding: 16px 0 0 0; font-size: 22px; font-weight: 900; color: ${colors.orange500}; border-top: 2px solid ${colors.slate100};">${formatCurrency(order.totalPrice)}</td>
            </tr>
          </table>

          <!-- INFO GRID -->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 40px; background-color: ${colors.slate50}; border-radius: 16px;">
            <tr>
              <td style="padding: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%" valign="top">
                      <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">Shipping To</p>
                      <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 22px; color: ${colors.slate700};">
                        <strong>${escapedFullName}</strong><br>
                        ${escapedStreet}<br>
                        ${escapedCity}, ${escapedCounty}<br>
                        ${escapedCountry}
                      </p>
                    </td>
                    <td width="50%" valign="top" style="padding-left: 20px;">
                      <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">Payment</p>
                      <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 22px; color: ${colors.slate700};">
                        ${escapedPaymentMethod}<br>
                        <span style="color: ${colors.slate400}; font-size: 12px;">Ref: ${escapedReference.slice(0, 12)}...</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          ${button({
            href: `${site.url}/account/orders/${order._id}`,
            label: "Track Your Order",
            backgroundColor: colors.slate950,
          })}
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `Receipt for order #${escapedOrderId.slice(-8).toUpperCase()}`,
    children: content,
    siteName: site.name,
    siteCopyright: site.copyright,
  });
}

/**
 * Installment Reminder Template
 */
export function installmentReminderTemplate({
  customerName,
  orderId,
  amount,
  dueDate,
  isOverdue,
  siteName,
  siteUrl,
  siteCopyright,
}: {
  customerName: string;
  orderId: string;
  amount: string;
  dueDate: string;
  isOverdue: boolean;
  siteName: string;
  siteUrl: string;
  siteCopyright: string;
}) {
  const escapedName = escapeHTML(customerName);
  const escapedOrderId = escapeHTML(orderId.slice(-8).toUpperCase());
  const escapedAmount = escapeHTML(amount);
  const escapedDueDate = escapeHTML(dueDate);

  const title = isOverdue ? "Installment Overdue" : "Upcoming Installment";
  const intro = isOverdue
    ? `Your installment for order <strong>#${escapedOrderId}</strong> is now overdue.`
    : `This is a friendly reminder that an installment for order <strong>#${escapedOrderId}</strong> is due soon.`;

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px; text-align: center;">
          <div style="display: inline-block; background-color: ${isOverdue ? colors.red500 : colors.orange500}; color: white; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 8px; border-radius: 4px; margin-bottom: 16px;">
            ${isOverdue ? "Action Required" : "Reminder"}
          </div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: ${colors.slate950};">
            ${title}
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            Hello ${escapedName},
          </p>
          <p style="margin: 8px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            ${intro}
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px; background-color: ${colors.slate50}; border: 1px solid ${colors.slate100}; border-radius: 16px;">
            <tr>
              <td style="padding: 24px; text-align: center;">
                <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">Amount Due</p>
                <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 900; color: ${isOverdue ? colors.red500 : colors.slate950};">${escapedAmount}</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: ${colors.slate500};">Due Date: ${escapedDueDate}</p>
              </td>
            </tr>
          </table>

          ${button({
            href: `${siteUrl}/account/orders/${orderId}`,
            label: isOverdue ? "Pay Now" : "View Order & Pay",
            backgroundColor: isOverdue ? colors.red500 : colors.slate950,
          })}

          <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 22px; color: ${colors.slate500};">
            Please log in to your account to complete the payment and avoid any service disruptions.
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `${isOverdue ? "URGENT: " : ""}Installment Reminder - ${escapedAmount}`,
    children: content,
    siteName,
    siteCopyright,
  });
}

/**
 * Generic Transactional Template (for wallet, coins, affiliate updates)
 */
export function genericTransactionalTemplate({
  title,
  name,
  intro,
  details,
  ctaLabel,
  ctaUrl,
  siteName,
  siteCopyright,
}: {
  title: string;
  name: string;
  intro: string;
  details: { label: string; value: string; isBold?: boolean }[];
  ctaLabel?: string;
  ctaUrl?: string;
  siteName: string;
  siteCopyright: string;
}) {
  const escapedTitle = escapeHTML(title);
  const escapedName = escapeHTML(name);
  const escapedIntro = escapeHTML(intro);

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: ${colors.slate950};">
            ${escapedTitle}
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            Hello ${escapedName},
          </p>
          <p style="margin: 8px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            ${escapedIntro}
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px; background-color: ${colors.slate50}; border: 1px solid ${colors.slate100}; border-radius: 12px;">
            <tr>
              <td style="padding: 20px 24px;">
                ${details
                  .map(
                    (d, i) => `
                  <div style="${i > 0 ? "margin-top: 16px; padding-top: 16px; border-top: 1px solid ${colors.slate100};" : ""}">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: ${colors.slate400}; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHTML(d.label)}</p>
                    <p style="margin: 4px 0 0 0; font-size: 15px; color: ${colors.slate900}; ${d.isBold ? "font-weight: 700;" : ""}">${escapeHTML(d.value)}</p>
                  </div>
                `,
                  )
                  .join("")}
              </td>
            </tr>
          </table>

          ${ctaLabel && ctaUrl ? button({ href: ctaUrl, label: ctaLabel }) : ""}

          <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 22px; color: ${colors.slate500};">
            If you have any questions, please reply to this email or contact our support team.
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: title,
    children: content,
    siteName,
    siteCopyright,
  });
}

/**
 * Order Tracking Template
 */
export function orderTrackingTemplate({
  orderId,
  statusLabel,
  statusMessage,
  trackingLink,
  siteName,
  siteCopyright,
}: {
  orderId: string;
  statusLabel: string;
  statusMessage: string;
  trackingLink: string;
  siteName: string;
  siteCopyright: string;
}) {
  const escapedOrderId = escapeHTML(orderId.slice(-8).toUpperCase());
  const escapedStatus = escapeHTML(statusLabel);
  const escapedMessage = escapeHTML(statusMessage);
  const escapedLink = escapeHTML(trackingLink);

  const content = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 32px; text-align: center;">
          <div style="display: inline-block; background-color: ${colors.blue600}; color: white; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 8px; border-radius: 4px; margin-bottom: 16px;">
            Order Update
          </div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: ${colors.slate950};">
            ${escapedStatus}
          </h1>
          <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 24px; color: ${colors.slate700};">
            Your order <strong>#${escapedOrderId}</strong> status has been updated.
          </p>

          <div style="margin-top: 32px; padding: 24px; background-color: ${colors.slate50}; border-radius: 16px; border: 1px solid ${colors.slate100};">
            <p style="margin: 0; font-size: 16px; line-height: 24px; color: ${colors.slate900};">${escapedMessage}</p>
          </div>

          ${button({
            href: trackingLink,
            label: "Track Order",
            backgroundColor: colors.slate950,
          })}

          <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: ${colors.slate400};">
            If the button doesn't work, use this link: <br>
            <a href="${escapedLink}" style="color: ${colors.blue600}; text-decoration: none;">${escapedLink}</a>
          </p>
        </td>
      </tr>
    </table>
  `;

  return layout({
    preview: `Order #${orderId.slice(-8).toUpperCase()} Update: ${statusLabel}`,
    children: content,
    siteName,
    siteCopyright,
  });
}
