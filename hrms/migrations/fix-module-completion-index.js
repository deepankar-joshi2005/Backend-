const mongoose = require("mongoose");

// Script to fix the ModuleCompletion unique index
async function fixModuleCompletionIndex() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(
      "mongodb+srv://utkarsh:1234@nodetuts.wa1varh.mongodb.net/?retryWrites=true&w=majority",
      {
        dbName: "thinkpro-lms",
      }
    );

    // List all existing indexes
    console.log("Checking existing indexes...");
    const indexes = await mongoose.connection.db.collection("modulecompletions").listIndexes().toArray();
    console.log("Existing indexes:", indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Check if the old index exists and drop it
    const oldIndexName = "mentor_1_school_1_module_1_moduleItem_1";
    const hasOldIndex = indexes.some(idx => idx.name === oldIndexName);
    
    if (hasOldIndex) {
      console.log("Dropping old unique index...");
      await mongoose.connection.db
        .collection("modulecompletions")
        .dropIndex(oldIndexName);
      console.log("Old index dropped successfully!");
    } else {
      console.log("Old index does not exist, skipping...");
    }

    // Check if the correct index already exists
    const correctIndexName = "mentor_1_school_1_module_1_moduleItem_1_section_1_grade_1";
    const hasCorrectIndex = indexes.some(idx => idx.name === correctIndexName);
    
    if (hasCorrectIndex) {
      console.log("Correct index already exists! Migration not needed.");
    } else {
      console.log("Creating new unique index with section and grade...");
      await mongoose.connection.db.collection("modulecompletions").createIndex(
        {
          mentor: 1,
          school: 1,
          module: 1,
          moduleItem: 1,
          section: 1,
          grade: 1,
        },
        {
          unique: true,
        }
      );
      console.log("New index created successfully!");
    }

    console.log("Index migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the migration
fixModuleCompletionIndex();
