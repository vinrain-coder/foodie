import { connectToDatabase } from "../db";
import Installment from "../db/models/installment.model";
import BNPLPayment from "../db/models/bnpl-payment.model";
import Order from "../db/models/order.model";
import { calculateFinancingState } from "../bnpl";

/**
 * Migration script to move data from Installment model to the new BNPL system.
 * This should be run once during the deployment of the new system.
 */
export async function migrateInstallmentsToBNPL() {
  await connectToDatabase();
  console.log("Starting BNPL migration...");

  const orders = await Order.find({ paymentType: "bnpl" });
  console.log(`Found ${orders.length} BNPL orders to process.`);

  let totalMigratedPayments = 0;

  for (const order of orders) {
    console.log(`Processing order: ${order._id}`);

    // 1. Find all installments for this order
    const installments = await Installment.find({ order: order._id }).sort({ dueDate: 1 });

    if (installments.length === 0) {
      console.log(`No installments found for order ${order._id}, skipping.`);
      continue;
    }

    // 2. Set the overall due date as the last installment's due date
    const lastInstallment = installments[installments.length - 1];
    order.bnplDueDate = lastInstallment.dueDate;
    order.financingPlan = "legacy_installment_plan";
    order.financingStatus = "active"; // Default

    // 3. Migrate paid installments to BNPLPayment records
    for (const inst of installments) {
      if (inst.status === "paid") {
        // Check if payment already migrated (idempotency)
        const existing = await BNPLPayment.findOne({
          order: order._id,
          reference: inst.paymentResult?.paymentReference as string || `legacy_${inst._id}`,
        });

        if (!existing) {
          await BNPLPayment.create({
            order: order._id,
            user: order.user,
            amount: inst.amount,
            paymentMethod: inst.paymentResult?.paymentMethod || "Legacy Installment",
            reference: inst.paymentResult?.paymentReference || `legacy_${inst._id}`,
            status: "success",
            type: "repayment",
            source: "paystack", // Assume paystack for legacy
            paymentResult: inst.paymentResult,
            createdAt: inst.paidAt || inst.updatedAt,
          });
          totalMigratedPayments++;
        }
      }
    }

    // 4. Recalculate and update order financing state
    const state = calculateFinancingState(order);
    order.financingStatus = state.status;
    order.repaymentProgress = state.progress;
    order.overdueDays = state.overdueDays;
    order.totalRepayments = await BNPLPayment.countDocuments({ order: order._id, type: "repayment" });

    await order.save();
    console.log(`Updated order ${order._id} financing status to ${order.financingStatus}.`);
  }

  console.log(`Migration complete. Migrated ${totalMigratedPayments} payment records.`);
}
