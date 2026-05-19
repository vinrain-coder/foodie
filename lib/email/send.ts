import { resend } from "./resend";
import { SENDER_EMAIL, SENDER_NAME } from "@/lib/constants";

type SendEmailProps = {
  to: string;
  subject: string;
  html: string;
  scheduledAt?: string;
  attachments?: {
    filename: string;
    content: string | Buffer;
  }[];
};

export async function sendEmail({
  to,
  subject,
  html,
  scheduledAt,
  attachments,
}: SendEmailProps) {
  await resend.emails.send({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to,
    subject,
    html,
    scheduledAt,
    attachments,
  });
}
