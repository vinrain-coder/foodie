import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Order from "@/lib/db/models/order.model";
import { sendInstallmentReminder } from "@/lib/email/transactional";
import { calculateFinancingState } from "@/lib/bnpl";

export async function GET(req: Request) {
  try {
    // Basic security check for cron
    const authHeader = req.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();

    // Find BNPL orders that are not fully paid
    const orders = await Order.find({
      paymentType: "bnpl",
      remainingAmount: { $gt: 0 },
      financingStatus: { $nin: ["completed", "suspended", "defaulted"] },
    });

    let processedCount = 0;
    let overdueCount = 0;

    for (const order of orders) {
      const state = calculateFinancingState(order);

      const wasOverdue = order.financingStatus === "overdue";
      const isNowOverdue = state.status === "overdue";

      order.financingStatus = state.status;
      order.repaymentProgress = state.progress;
      order.overdueDays = state.overdueDays;

      /**
       * Map paymentStatus based on financing state and balance.
       * - "overdue": The order has passed its BNPL due date.
       * - "paid": Balance reached zero.
       * - "partial": Some payment was made, not overdue.
       * - "pending": No payment made yet, not overdue.
       */
      if (isNowOverdue) {
        order.paymentStatus = "overdue";
        overdueCount++;
      } else if (order.remainingAmount <= 0) {
        order.paymentStatus = "paid";
      } else if (order.amountPaid > 0) {
        order.paymentStatus = "partial";
      } else {
        order.paymentStatus = "pending";
      }

      await order.save();
      processedCount++;

      // Send reminder if overdue or approaching due date
      const daysToDue = order.bnplDueDate
        ? Math.ceil((new Date(order.bnplDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Send overdue reminder if it just became overdue or periodically (e.g. every 7 days)
      const shouldNotifyOverdue = isNowOverdue && (!wasOverdue || (order.overdueDays || 0) % 7 === 0);

      // Send upcoming reminder if due in 3 days or 1 day
      const shouldNotifyUpcoming = !isNowOverdue && (daysToDue === 3 || daysToDue === 1);

      if (shouldNotifyOverdue || shouldNotifyUpcoming) {
        try {
          await sendInstallmentReminder(
            order as any,
            order.minimumPayment || order.remainingAmount,
            order.bnplDueDate || now,
            isNowOverdue
          );

          order.nextReminderAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Record reminder sent
          await order.save();
        } catch (emailError) {
          console.error(`Failed to send BNPL reminder for order ${order._id}:`, emailError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} BNPL orders. ${overdueCount} are currently overdue.`,
    });
  } catch (error: any) {
    console.error("BNPL Overdue Cron Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
