import { connectToDatabase } from "../db";
import BNPLPayment from "../db/models/bnpl-payment.model";

/**
 * Migration script to drop the old unique index on the 'reference' field of BNPLPayment.
 * This ensures that only the new compound unique index (bnpl_source_reference_unique_v2)
 * is active, avoiding inconsistent behavior.
 */
export async function cleanupBNPLIndexes() {
  await connectToDatabase();
  console.log("Starting BNPL index cleanup...");

  try {
    const collection = BNPLPayment.collection;
    const indexes = await collection.indexes();

    console.log(`Found ${indexes.length} indexes on collection ${collection.collectionName}.`);

    for (const index of indexes) {
      const indexName = index.name;
      // Skip the _id index and the new v2 index
      if (!indexName || indexName === "_id_" || indexName === "bnpl_source_reference_unique_v2") continue;

      const keys = Object.keys(index.key);
      const isUnique = !!index.unique;

      // We want to drop legacy unique indexes that:
      // 1. Are unique
      // 2. ONLY contain 'reference', 'source', or both (to avoid dropping other legitimate multi-field indexes)
      const targetsOnlyConflictFields = keys.every(key => key === "reference" || key === "source");

      if (isUnique && targetsOnlyConflictFields && keys.length > 0) {
        console.log(`Dropping legacy unique index: ${indexName} (keys: ${keys.join(", ")})`);
        await collection.dropIndex(indexName);
        console.log(`Successfully dropped index ${indexName}.`);
      }
    }

    console.log("BNPL index cleanup complete.");
  } catch (error) {
    console.error("Error during index cleanup:", error);
    throw error;
  }
}
