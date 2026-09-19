const mongoose = require("mongoose");

// Script to update existing ModuleCompletion records to use new status values
async function updateStatusValues() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(
      "mongodb+srv://utkarsh:1234@nodetuts.wa1varh.mongodb.net/?retryWrites=true&w=majority",
      {
        dbName: "thinkpro-lms",
      }
    );

    console.log("Updating status values in existing records...");
    
    // Update old status values to new ones
    const updates = [
      { from: "not_started", to: "Pending" },
      { from: "in_progress", to: "In Progress" },
      { from: "completed", to: "Completed" },
      { from: "on_hold", to: "Pending" } // Map on_hold to Pending since we don't have that status anymore
    ];

    for (const update of updates) {
      const result = await mongoose.connection.db
        .collection("modulecompletions")
        .updateMany(
          { status: update.from },
          { $set: { status: update.to } }
        );
      
      console.log(`Updated ${result.modifiedCount} records from "${update.from}" to "${update.to}"`);
    }

    console.log("Status value migration completed successfully!");
    
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the migration
updateStatusValues();
