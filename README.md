# 🇰🇪 The County Budget Watchdog

An AI-powered transparency platform for Kenyan citizens to monitor county budgets, audit reports, and Hansard records.

## Features

- **Watchdog AI Assistant**: Powered by Gemini 1.5 Pro to translate technical financial jargon into plain language.
- **RAG-Ready Infrastructure**: Backend support for document indexing and retrieval-augmented generation.
- **Gazette Monitor**: Real-time tracking of official amendments to budgets.
- **Visual Analytics**: Interactive dashboards for expenditure breakdown.
- **SMS/USSD Simulation**: Mock-up of high-accessibility notification systems for non-smartphone users.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Recharts.
- **Backend**: Node.js (Express), Multer (File Uploads), Gemini API SDK.
- **Deployment**: Dockerized for Google Cloud Run.
- **AI**: Google Gemini 1.5 Pro with long-context capabilities.

## Team Members
- Vivian
- Benard
- Monica
- Francis

##Demo link
[OpenbAgent](https://county-budget-watchdog-127640723266.europe-west2.run.app)

## Getting Started

### Prerequisites

- Node.js 20+
- A Google AI Studio API Key (GEMINI_API_KEY)

### Environment Variables

Create a `.env` file in the root:

\`\`\`env
GEMINI_API_KEY=your_api_key_here
NODE_ENV=development
\`\`\`

### Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

## Deployment (Cloud Run)

1. Build the image:
   \`\`\`bash
   docker build -t watchdog .
   \`\`\`

2. Push to Artifact Registry and deploy to Cloud Run targeting port 3000.

## Accessibility (WCAG 2.1)

The UI is built with high contrast, scalable typography, and semantic HTML to ensure all Kenyans can hold their leaders accountable regardless of their device or ability.
