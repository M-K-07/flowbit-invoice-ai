# Flowbit - AI Invoice Processing Agent

Flowbit is an intelligent invoice processing agent designed to extract data, validate it against reference documents (Purchase Orders, Delivery Notes), and **learn from human corrections** over time.

Unlike static rule-based systems, Flowbit uses a "Human-in-the-Loop" architecture where the AI's confidence grows as it observes how humans correct its suggestions for specific vendors.

## Core Logic & Design

The system operates on a **Recall → Analyze → Decide → Learn** loop.

### 1. Recall (Memory)
*   **Source:** `src/memory.ts`
*   **Mechanism:** Uses SQLite (`better-sqlite3`) to store historical human reviews.
*   **Logic:** Before processing an invoice, the system queries the database for past corrections associated with the specific **Vendor**. This allows the AI to apply vendor-specific logic (e.g., "This vendor always forgets the Service Date").

### 2. Analyze (AI Agent)
*   **Source:** `src/agent.ts`
*   **Mechanism:** Calls an LLM via OpenRouter (e.g., DeepSeek, GPT).
*   **Prompt Engineering:** The prompt is dynamically constructed using:
    *   The current invoice raw text and extracted fields.
    *   Reference data (POs, DNs).
    *   **Few-Shot Examples:** The most recent 10 corrections for similar invoices are injected into the prompt to guide the AI.

### 3. Decide (Confidence Engine)
*   **Source:** `src/index.ts`
*   **Logic:** The system calculates a `confidenceScore` and determines if `requiresHumanReview` is true based on:
    1.  **Vendor Familiarity:** Has the system seen this vendor before? (`hasMemoryForThisVendor`)
    2.  **Confidence Threshold:** Is the AI's confidence > 0.8?
    3.  **Consistency:** Do the suggestions match the learned patterns?

    **Decision Matrix:**
    *   **Auto-Approve:** Known Vendor + High Confidence + Pattern Match.
    *   **Human Review:** New Vendor OR Low Confidence.

### 4. Learn (Feedback Loop)
*   **Source:** `src/main.ts`
*   **Mechanism:**
    *   If the AI is unsure, the user is prompted in the CLI (`(a)gree / (m)odify / (s)kip`).
    *   The final state of the invoice (after human edits) is saved back to the SQLite database.
    *   **Result:** The next time an invoice from this vendor appears, the AI uses this new "memory" to increase its confidence.

## Project Structure

*   **`src/main.ts`**: Entry point. Runs the CLI loop, handles user input, and saves final results.
*   **`src/index.ts`**: Core business logic. Orchestrates memory recall, AI analysis, and decision making.
*   **`src/agent.ts`**: AI Interface. Handles API calls to OpenRouter and parses JSON responses.
*   **`src/memory.ts`**: Database layer. Manages SQLite connection for storing/retrieving learned patterns.
*   **`data/`**: Contains input JSON files (Invoices, POs, DNs) and initial training data.

## Setup & Usage

### Prerequisites
*   Node.js (v18+)
*   An OpenRouter API Key

### Installation
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Configure Environment:
    Create a `.env` file in the root directory:
    ```env
    GEMINI_API_KEY=your_key_here
    ```

### Running the Agent
Run the live learning demo:
```bash
npx ts-node src/main.ts
```

1.  The agent will process invoices one by one.
2.  It will display its confidence and reasoning.
3.  If it needs help, it will ask you to verify or correct the data.
4.  Results are saved to `output.json` and learned patterns to `learned_memory.json`.

## Technologies

*   **Runtime:** Node.js / TypeScript
*   **Database:** SQLite (`better-sqlite3`)
*   **AI Provider:** GEMINI API
*   **CLI:** `prompt-sync` for interactive user feedback
