import { readFileSync, writeFileSync } from 'fs';
import { processInvoice } from './index.ts';
import { saveHumanReview, showMemory } from './memory.ts';
import promptSync from 'prompt-sync';

const prompt = promptSync({ sigint: true });

const invoices = JSON.parse(readFileSync('data/II_section/invoices.json', 'utf-8'));
const pos = JSON.parse(readFileSync('data/II_section/purchase_orders.json', 'utf-8'));
const dns = JSON.parse(readFileSync('data/II_section/delivery_notes.json', 'utf-8'));

// Array to collect all results in exact required format
const allResults: any[] = [];

async function run() {
  console.clear();
  console.log("FLOWBIT AI AGENT - LIVE LEARNING DEMO\n");
  console.log("All outputs will be saved to output.json in the required format.\n");

  for (const inv of invoices) {
    console.log(`\nProcessing: ${inv.invoiceId} | ${inv.vendor}`);
    console.log("─".repeat(60));

    const result = await processInvoice(inv, pos, dns);

    // Display in terminal
    console.log(`Confidence: ${result.confidenceScore.toFixed(2)}`);
    console.log(`Requires Human Review: ${result.requiresHumanReview ? 'YES' : 'NO'}\n`);

    if (result.proposedCorrections.length > 0) {
      console.log("AI Suggestions:");
      result.proposedCorrections.forEach((c: string) => console.log(`   • ${c}`));
      console.log("");
    }

    console.log(`📝 Reasoning:\n${result.reasoning}\n`);

    if (!result.requiresHumanReview) {
      console.log("AUTO-APPROVED BY AI AGENT!\n");
    } else {
      console.log("HUMAN REVIEW REQUIRED\n");

      let choice: string | null = "";
      while (true) {
        choice = prompt("Action → (a)gree / (m)odify / (s)kip [a/m/s]: ");
        if (choice === null) {
          console.log("\nDemo stopped by user.");
          writeAndExit();
          return;
        }
        choice = choice.trim().toLowerCase();
        if (['a', 'm', 's', ''].includes(choice)) break;
        console.log("Please enter 'a', 'm', 's', or press Enter.");
      }

      const corrections: any[] = [];

      if (choice === 'a' || choice === '') {
        console.log("You agreed with AI suggestions.\n");
        for (const c of result.proposedCorrections) {
          const match = c.match(/(.+?)\s*→\s*(.+?)\s*\(conf:/);
          if (match) {
            let val: any = match[2].trim();
            try { val = JSON.parse(val); } catch {}
            corrections.push({
              field: match[1].trim(),
              from: null,
              to: val,
              reason: "Human approved AI suggestion"
            });
          }
        }
      } else if (choice === 'm') {
        console.log("Manual correction mode:");
        while (true) {
          const field = prompt("   Field to correct (or Enter to finish): ");
          if (field === null) {
            console.log("\nDemo stopped.");
            writeAndExit();
            return;
          }
          if (field.trim() === '') break;
          const val = prompt(`   New value for ${field.trim()}: `);
          if (val === null) {
            writeAndExit();
            return;
          }
          corrections.push({
            field: field.trim(),
            from: null,
            to: val,
            reason: "Manual human correction"
          });
        }
        console.log("");
      } else {
        console.log("Skipped — no learning from this invoice.\n");
      }

      if (corrections.length > 0) {
        saveHumanReview({
          invoiceId: inv.invoiceId,
          vendor: inv.vendor,
          corrections,
          finalDecision: "approved"
        });
        console.log(`Learned ${corrections.length} correction(s)!\n`);

        // Update memoryUpdates in result
        result.memoryUpdates = [`Learned ${corrections.length} correction(s) for ${inv.invoiceId}`];
      } else {
        result.memoryUpdates = ["No new learning (skipped)"];
      }
    }

    // Push exact required format
    allResults.push({
      normalizedInvoice: result.normalizedInvoice,
      proposedCorrections: result.proposedCorrections,
      requiresHumanReview: result.requiresHumanReview,
      reasoning: result.reasoning,
      confidenceScore: result.confidenceScore,
      memoryUpdates: result.memoryUpdates,
      auditTrail: result.auditTrail
    });
  }

  // Final save
  writeAndExit();
}

async function writeAndExit() {
  // Save full results
  writeFileSync('output.json', JSON.stringify(allResults, null, 2));
  console.log("\nFull processing results saved to output.json");

  // Save learned memory
  const finalMemory = (await import('./memory.ts')).getPastReviews();
  writeFileSync('learned_memory.json', JSON.stringify(finalMemory, null, 2));
  console.log("Final learned memory saved to learned_memory.json\n");

  console.log("DEMO COMPLETE! Thank you for the review session.");
  showMemory();
}

run().catch(err => {
  console.error("Error:", err);
});