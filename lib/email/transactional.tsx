import { sendEmail } from "./send";
import { IOrder } from "@/lib/db/models/order.model";
import { IMenuItem } from "@/lib/db/models/menu.item.model";
import { getSetting } from "@/lib/actions/setting.actions";
import {
  buildOrderReceiptPdf,
  getOrderPdfFileName,
} from "@/lib/order-receipt-pdf";
import type { SerializedOrder } from "@/lib/actions/order.actions";
import { buildReceiptBrandingFromSetting } from "@/lib/pdf/receipt/branding";
import {
  getAdminSmsRecipients,
  sendAfricasTalkingSms,
} from "../sms/africas-talking";
import {
  adminEventNotificationTemplate,
  askReviewOrderItemsTemplate,
  genericTransactionalTemplate,
  installmentReminderTemplate,
  newsletterConfirmationTemplate,
  orderTrackingTemplate,
  purchaseReceiptTemplate,
  stockSubscriptionNotificationTemplate,
  supportTicketReplyTemplate,
  welcomeNewUserTemplate,
  bnplRepaymentSuccessTemplate,
} from "./templates/transactional-templates";

type PopulatedOrderUser = {
  email?: string;
  name?: string;
} | null;

const toAdminSmsMessage = ({
  title,
  description,
  href,
  siteUrl,
}: {
  title: string;
  description: string;
  href: string;
  siteUrl: string;
}) => {
  const absoluteHref = href.startsWith("http") ? href : `${siteUrl}${href}`;
  return `Admin Alert: ${title}. ${description} View: ${absoluteHref}`;
};

const toUserSmsMessage = ({
  message,
  siteName,
}: {
  message: string;
  siteName: string;
}) => `${siteName}: ${message}`;

const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);

const resolveOrderEmail = (order: IOrder) =>
  order.userEmail || (order.user as { email?: string } | undefined)?.email;

export const sendAdminEventNotification = async ({
  title,
  description,
  href,
  meta,
  createdAt = new Date().toISOString(),
}: {
  title: string;
  description: string;
  href: string;
  meta?: string;
  createdAt?: string;
}) => {
  const adminEmails = [...new Set(getAdminEmails())];

  const { site } = await getSetting();
  const subject = `[Admin Alert] ${title}`;

  if (adminEmails.length > 0) {
    await sendEmail({
      to: adminEmails.join(","),
      subject,
      html: adminEventNotificationTemplate({
        title,
        description,
        href,
        meta,
        createdAt,
        siteName: site.name,
        siteUrl: site.url,
        siteCopyright: site.copyright,
      }),
    });
  }

  const adminSmsRecipients = await getAdminSmsRecipients();
  if (adminSmsRecipients.length) {
    await sendAfricasTalkingSms({
      to: adminSmsRecipients,
      message: toAdminSmsMessage({
        title,
        description,
        href,
        siteUrl: site.url,
      }),
    });
  }

  console.log(`✅ Admin event notification dispatched for "${title}"`);

  if (adminEmails.length === 0 && adminSmsRecipients.length === 0) {
    return {
      success: true,
      message: "No admin notification recipients configured.",
    };
  }

  return {
    success: true,
    message: "Admin event notification sent successfully",
  };
};

export const sendPurchaseReceipt = async (order: IOrder) => {
  const userEmail = resolveOrderEmail(order);
  if (!userEmail) {
    console.error(
      `Cannot send purchase receipt for order ${order._id}: User email not found`,
    );
    return;
  }

  const setting = await getSetting();
  const { site } = setting;
  const serializedOrder = JSON.parse(
    JSON.stringify(order),
  ) as unknown as SerializedOrder;
  const pdf = await buildOrderReceiptPdf(serializedOrder, {
    baseUrl: site.url,
    branding: buildReceiptBrandingFromSetting(setting, site.url),
    themeMode: setting.common.defaultTheme === "dark" ? "dark" : "light",
    locale: setting.defaultLanguage || "en-US",
    currency: setting.defaultCurrency || "KES",
  });
  const fileName = getOrderPdfFileName(order._id.toString(), "receipt");
  await sendEmail({
    to: userEmail,
    subject: "Purchase Receipt",
    html: purchaseReceiptTemplate({ order, site }),
    attachments: [
      {
        filename: fileName,
        content: pdf,
      },
    ],
  });
};

export const sendAskReviewOrderItems = async (order: IOrder) => {
  const userEmail = resolveOrderEmail(order);
  if (!userEmail) {
    console.error(
      `Cannot send review request for order ${order._id}: User email not found`,
    );
    return;
  }

  const { site } = await getSetting();
  await sendEmail({
    to: userEmail,
    subject: "Review your order items",
    html: askReviewOrderItemsTemplate({ order, site }),
  });
};

export const sendStockSubscriptionNotification = async (
  email: string,
  menuItem: IMenuItem,
  unsubscribeToken: string,
) => {
  const { site } = await getSetting();

  await sendEmail({
    to: email,
    subject: `🔔 "${menuItem.name}" is back in stock!`,
    html: stockSubscriptionNotificationTemplate({
      menuItem,
      siteUrl: site.url,
      siteName: site.name,
      siteCopyright: site.copyright,
      unsubscribeToken,
    }),
  });
};

export const sendInstallmentReminder = async (
  order: IOrder,
  amount: number,
  dueDate: Date,
  isOverdue: boolean = false,
) => {
  const { site } = await getSetting();
  const populated = await order.populate("user", "email name");
  const user = populated.user as PopulatedOrderUser;
  const email = user?.email || order.userEmail;

  if (!email) return;

  const formattedAmount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(amount);

  const subject = isOverdue
    ? `URGENT: Repayment Overdue - ${site.name}`
    : `Upcoming Repayment Reminder - ${site.name}`;

  await sendEmail({
    to: email,
    subject,
    html: installmentReminderTemplate({
      customerName: user?.name || order.userName || "Customer",
      orderId: order._id.toString(),
      amount: formattedAmount,
      dueDate: new Date(dueDate).toLocaleDateString(),
      isOverdue,
      siteName: site.name,
      siteUrl: site.url,
      siteCopyright: site.copyright,
    }),
  });
};

export const sendBNPLRepaymentSuccessEmail = async (
  order: IOrder,
  amountPaid: number,
) => {
  const { site } = await getSetting();
  const populated = await order.populate("user", "email name");
  const user = populated.user as PopulatedOrderUser;
  const email = user?.email || order.userEmail;

  if (!email) return;

  const currencyFormatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  });

  await sendEmail({
    to: email,
    subject: `Payment Received - Order #${order._id.toString().slice(-8).toUpperCase()}`,
    html: bnplRepaymentSuccessTemplate({
      customerName: user?.name || order.userName || "Customer",
      orderId: order._id.toString(),
      amountPaid: currencyFormatter.format(amountPaid),
      remainingAmount: currencyFormatter.format(order.remainingAmount),
      siteName: site.name,
      siteUrl: site.url,
      siteCopyright: site.copyright,
    }),
  });
};

export const sendNewsletterConfirmationEmail = async ({
  email,
  unsubscribeLink,
}: {
  email: string;
  unsubscribeLink: string;
}) => {
  const { site } = await getSetting();

  await sendEmail({
    to: email,
    subject: `Welcome to the ${site.name} Newsletter! 🎉`,
    html: newsletterConfirmationTemplate({
      email,
      unsubscribeLink,
      siteName: site.name,
      siteUrl: site.url,
      siteCopyright: site.copyright,
    }),
  });

  console.log(`✅ Newsletter confirmation email sent to ${email}`);

  return {
    success: true,
    message: "Newsletter confirmation email sent successfully",
  };
};

export const sendWelcomeNewUserEmail = async ({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) => {
  const { site, common } = await getSetting();

  await sendEmail({
    to: email,
    subject: `Welcome to ${site.name}!`,
    html: welcomeNewUserTemplate({
      name,
      siteName: site.name,
      siteUrl: site.url,
      siteCopyright: site.copyright,
      firstPurchaseDiscountRate: common.firstPurchaseDiscountRate,
    }),
  });

  console.log(`✅ Welcome email sent to ${email}`);

  return {
    success: true,
    message: "Welcome email sent successfully",
  };
};

export const sendOrderTrackingNotification = async ({
  order,
  statusLabel,
  statusMessage,
  trackingLink,
}: {
  order: IOrder;
  statusLabel: string;
  statusMessage: string;
  trackingLink: string;
}) => {
  const { site } = await getSetting();
  const email = resolveOrderEmail(order);

  if (email) {
    await sendEmail({
      to: email,
      subject: `Order update: ${statusLabel}`,
      html: orderTrackingTemplate({
        orderId: order._id.toString(),
        statusLabel,
        statusMessage,
        trackingLink,
        siteName: site.name,
        siteCopyright: site.copyright,
      }),
    });
  }

  const phone = order.shippingAddress?.phone;
  if (phone) {
    await sendAfricasTalkingSms({
      to: phone,
      message: toUserSmsMessage({
        siteName: site.name,
        message: `Order #${order._id.toString().slice(-6).toUpperCase()} is ${statusLabel.toLowerCase()}. Track: ${trackingLink}`,
      }),
    });
  }

  return { success: true };
};

export const sendAffiliateApprovalNotification = async ({
  email,
  name,
  affiliateCode,
  phone,
}: {
  email: string;
  name: string;
  affiliateCode: string;
  phone?: string;
}) => {
  const { site } = await getSetting();

  await sendEmail({
    to: email,
    subject: `Congratulations! Your ${site.name} Affiliate Application is Approved`,
    html: genericTransactionalTemplate({
      title: "Affiliate Application Approved",
      name,
      intro: `We are excited to inform you that your application to join the ${site.name} Affiliate Program has been approved!`,
      details: [
        { label: "Your Affiliate Code", value: affiliateCode, isBold: true },
        { label: "Commission Rate", value: "10%" },
      ],
      ctaLabel: "View Dashboard",
      ctaUrl: `${site.url}/affiliate/dashboard`,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });

  if (phone) {
    await sendAfricasTalkingSms({
      to: phone,
      message: toUserSmsMessage({
        siteName: site.name,
        message: `Congratulations! Your affiliate application was approved. Your code is ${affiliateCode}. Start earning now!`,
      }),
    });
  }

  console.log(`✅ Affiliate approval notification sent to ${email}`);
  return { success: true };
};

export const sendAffiliatePayoutNotification = async ({
  email,
  name,
  amount,
  paymentMethod,
  phone,
}: {
  email: string;
  name: string;
  amount: number;
  paymentMethod: string;
  phone?: string;
}) => {
  const { site } = await getSetting();
  const formattedAmount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(amount);

  await sendEmail({
    to: email,
    subject: `Payout Processed - ${site.name} Affiliate Program`,
    html: genericTransactionalTemplate({
      title: "Payout Processed",
      name,
      intro: `Great news! Your affiliate payout has been processed successfully.`,
      details: [
        { label: "Amount", value: formattedAmount, isBold: true },
        { label: "Payment Method", value: paymentMethod },
      ],
      ctaLabel: "View Earnings",
      ctaUrl: `${site.url}/affiliate/dashboard`,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });

  if (phone) {
    await sendAfricasTalkingSms({
      to: phone,
      message: toUserSmsMessage({
        siteName: site.name,
        message: `Your payout of ${formattedAmount} has been processed via ${paymentMethod}. Thank you for being our partner!`,
      }),
    });
  }

  console.log(`✅ Affiliate payout notification sent to ${email}`);
  return { success: true };
};

export const sendAffiliateRejectedNotification = async ({
  email,
  name,
  affiliateCode,
  reason,
  phone,
}: {
  email: string;
  name: string;
  affiliateCode: string;
  reason: string;
  phone?: string;
}) => {
  const { site } = await getSetting();

  await sendEmail({
    to: email,
    subject: `Update on your ${site.name} affiliate application`,
    html: genericTransactionalTemplate({
      title: "Affiliate Application Update",
      name,
      intro: `Thank you for your interest in our Affiliate Program. At this time, your application was not approved.`,
      details: [
        { label: "Application Code", value: affiliateCode },
        { label: "Reason", value: reason },
      ],
      ctaLabel: "Update & Reapply",
      ctaUrl: `${site.url}/affiliate/register`,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });

  if (phone) {
    await sendAfricasTalkingSms({
      to: phone,
      message: toUserSmsMessage({
        siteName: site.name,
        message: `Your affiliate application was not approved. Reason: ${reason}. Update details and reapply from your dashboard.`,
      }),
    });
  }

  console.log(`✅ Affiliate rejection notification sent to ${email}`);
  return { success: true };
};

export const sendAffiliateResubmittedNotification = async ({
  email,
  name,
  affiliateCode,
}: {
  email: string;
  name: string;
  affiliateCode: string;
}) => {
  const { site } = await getSetting();

  await sendEmail({
    to: email,
    subject: `Affiliate application resubmitted - ${site.name}`,
    html: genericTransactionalTemplate({
      title: "Application Resubmitted",
      name,
      intro: `Your affiliate application has been successfully resubmitted and is awaiting review.`,
      details: [{ label: "Application Code", value: affiliateCode }],
      ctaLabel: "Track Status",
      ctaUrl: `${site.url}/affiliate/dashboard`,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });

  console.log(`✅ Affiliate resubmission confirmation sent to ${email}`);
  return { success: true };
};

export const sendWalletPayoutStatusNotification = async ({
  email,
  name,
  amount,
  status,
  paymentMethod,
  adminNote,
  phone,
}: {
  email: string;
  name: string;
  amount: number;
  status: "paid" | "rejected";
  paymentMethod: string;
  adminNote?: string;
  phone?: string;
}) => {
  const { site } = await getSetting();
  const formattedAmount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(amount);

  const subject =
    status === "paid"
      ? `Wallet Payout Processed - ${site.name}`
      : `Wallet Payout Rejected - ${site.name}`;

  const details = [
    { label: "Amount", value: formattedAmount, isBold: true },
    { label: "Method", value: paymentMethod },
  ];
  if (adminNote) {
    details.push({
      label: status === "paid" ? "Note" : "Reason",
      value: adminNote,
    });
  }

  await sendEmail({
    to: email,
    subject,
    html: genericTransactionalTemplate({
      title: status === "paid" ? "Payout Processed" : "Payout Rejected",
      name,
      intro:
        status === "paid"
          ? `Your wallet payout has been successfully processed.`
          : `Your wallet payout request was not approved. The funds have been returned to your wallet.`,
      details,
      ctaLabel: "View Wallet",
      ctaUrl: `${site.url}/account/wallet`,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });

  if (phone) {
    const smsMessage =
      status === "paid"
        ? `Your wallet payout of ${formattedAmount} via ${paymentMethod} has been processed.`
        : `Your wallet payout of ${formattedAmount} was rejected. Funds returned to your wallet. Reason: ${adminNote || "N/A"}`;

    await sendAfricasTalkingSms({
      to: phone,
      message: toUserSmsMessage({ siteName: site.name, message: smsMessage }),
    });
  }

  console.log(`✅ Wallet payout ${status} notification sent to ${email}`);
  return { success: true };
};

export const sendWalletAdjustmentNotification = async ({
  email,
  name,
  amount,
  reason,
  newBalance,
  phone,
}: {
  email: string;
  name: string;
  amount: number;
  reason: string;
  newBalance: number;
  phone?: string;
}) => {
  const { site } = await getSetting();
  const formattedAmount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Math.abs(amount));
  const formattedBalance = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(newBalance);

  const type = amount >= 0 ? "credited to" : "deducted from";
  const subject = `Wallet Balance Update - ${site.name}`;

  await sendEmail({
    to: email,
    subject,
    html: genericTransactionalTemplate({
      title: "Wallet Update",
      name,
      intro: `Your wallet balance has been updated.`,
      details: [
        { label: "Adjustment", value: `${formattedAmount} (${type})` },
        { label: "Reason", value: reason },
        { label: "New Balance", value: formattedBalance, isBold: true },
      ],
      ctaLabel: "View Wallet",
      ctaUrl: `${site.url}/account/wallet`,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });

  if (phone) {
    const smsMessage = `Your wallet was ${type} ${formattedAmount}. Reason: ${reason}. New balance: ${formattedBalance}.`;
    await sendAfricasTalkingSms({
      to: phone,
      message: toUserSmsMessage({ siteName: site.name, message: smsMessage }),
    });
  }

  return { success: true };
};

export const sendCoinAdjustmentNotification = async ({
  email,
  name,
  amount,
  reason,
  newBalance,
  phone,
}: {
  email: string;
  name: string;
  amount: number;
  reason: string;
  newBalance: number;
  phone?: string;
}) => {
  const { site } = await getSetting();
  const absAmount = Math.abs(amount);
  const formattedAbsAmount = Number.isInteger(absAmount)
    ? String(absAmount)
    : absAmount.toFixed(2);
  const formattedNewBalance = Number.isInteger(newBalance)
    ? String(newBalance)
    : newBalance.toFixed(2);

  const type = amount >= 0 ? "credited to" : "deducted from";
  const subject = `Coins Balance Update - ${site.name}`;

  await sendEmail({
    to: email,
    subject,
    html: genericTransactionalTemplate({
      title: "Coins Balance Update",
      name,
      intro: `Your coins balance has been updated.`,
      details: [
        { label: "Adjustment", value: `${formattedAbsAmount} coins (${type})` },
        { label: "Reason", value: reason },
        {
          label: "New Balance",
          value: `${formattedNewBalance} coins`,
          isBold: true,
        },
      ],
      ctaLabel: "View Coins",
      ctaUrl: `${site.url}/account/coins`,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });

  if (phone) {
    const smsMessage = `Your coins balance was ${type} ${formattedAbsAmount} coins. Reason: ${reason}. New balance: ${formattedNewBalance} coins.`;
    await sendAfricasTalkingSms({
      to: phone,
      message: toUserSmsMessage({ siteName: site.name, message: smsMessage }),
    });
  }

  return { success: true };
};

export const sendSupportTicketReplyEmail = async ({
  to,
  customerName,
  subject,
  originalMessage,
  replyMessage,
}: {
  to: string;
  customerName: string;
  subject: string;
  originalMessage: string;
  replyMessage: string;
}) => {
  const { site } = await getSetting();

  await sendEmail({
    to,
    subject: `Re: ${subject}`,
    html: supportTicketReplyTemplate({
      customerName,
      subject,
      originalMessage,
      replyMessage,
      siteName: site.name,
      siteCopyright: site.copyright,
    }),
  });
};
