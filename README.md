As seen in image_600543.png, the markdown asterisks used for bolding are rendering as raw text rather than formatting. Here is the entire README file rewritten with all the bolding asterisks removed so it reads cleanly.

```markdown
# Multi-Agent System for STEM Literature Synthesis (Frontend)

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)

> A sophisticated, agentic web application designed to automate the synthesis, summarization, and analysis of complex STEM (Science, Technology, Engineering, and Mathematics) literature.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [The Problem It Solves](#the-problem-it-solves)
3. [Key Features](#key-features)
4. [Tech Stack](#tech-stack)
5. [System Architecture](#system-architecture)
6. [Installation & Setup Guide](#installation--setup-guide)
7. [Usage Instructions](#usage-instructions)
8. [Live Demonstration](#live-demonstration)
9. [Future Roadmap](#future-roadmap)
10. [Acknowledgements](#acknowledgements)

---

## Project Overview
The Multi-Agent System for STEM Literature Synthesis is an AI-driven tool designed for researchers, students, and academics. Reading and cross-referencing dozens of heavy research papers is a bottleneck in modern research. This project deploys multiple specialized AI agents working in tandem—one for fetching data, one for summarization, one for critique—to synthesize dense STEM literature into digestible, actionable insights. 

This repository specifically houses the Frontend Application, providing a clean, responsive, and intuitive UI to interact with the multi-agent backend pipeline.

## The Problem It Solves
* Information Overload: STEM researchers spend hundreds of hours filtering through papers to find overlapping methodologies or contradictory results.
* Siloed Insights: Traditional search engines find papers but do not synthesize the relationships between them.
* The Solution: By utilizing a multi-agent framework, this application mimics a team of research assistants. The frontend provides the canvas where users can input complex queries and watch the agents collaborate in real-time to generate a comprehensive literature review.

## Key Features
* Interactive Query Dashboard: A specialized input interface tailored for complex academic prompts.
* Agent Status Tracking: Real-time visual feedback showing which agent (e.g., Searcher, Summarizer, Synthesizer) is currently active.
* Dynamic Results Rendering: Formatted output that supports markdown, academic citations, and mathematical notation.
* Responsive Design: Optimized for both desktop research stations and mobile devices.

## Tech Stack
Frontend:
* React.js: Core component-based UI framework.
* JavaScript (ES6+): Application logic.
* Tailwind CSS / Styled Components: For rapid, responsive, and modern styling.
* Axios / Fetch API: For seamless integration with the Python/FastAPI backend.

*(Note: The backend repository handling the LLM logic and Python architecture is hosted separately.)*

## System Architecture
The application follows a decoupled client-server architecture:
1. Client (This Repo): React frontend captures the user's research query.
2. API Layer: The frontend dispatches the query via REST/GraphQL to the backend.
3. Multi-Agent Engine (Backend): Python-based orchestrator assigns tasks to specific LLM agents.
4. Response Delivery: The frontend receives the streamed or batched synthesis and renders it cleanly for the user.

## Installation & Setup Guide
Follow these steps to run the frontend locally on your machine.

### Prerequisites
* Node.js (v16.x or higher)
* npm or yarn package manager
* Git installed on your local machine

### Step-by-Step Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/Sualeh404/multi-agent-major-project-frontend.git](https://github.com/Sualeh404/multi-agent-major-project-frontend.git)
   cd multi-agent-major-project-frontend

```

2. Install Dependencies:
```bash
npm install
# or if you use yarn:
yarn install

```


3. Environment Variables:
Create a `.env` file in the root directory and configure your backend API endpoint.
```env
REACT_APP_BACKEND_API_URL=http://localhost:8000/api

```


4. Start the Development Server:
```bash
npm start
# or
yarn start

```


The application should now be running at `http://localhost:3000`.

## Usage Instructions

1. Open the web interface.
2. In the main search bar, enter a complex STEM topic (e.g., "Synthesize recent advancements in stochastic calculus applied to algorithmic trading").
3. Click "Run Agents".
4. Monitor the agent progress bar on the screen as it fetches, reads, and synthesizes the data.
5. Export the final synthesized literature review as a PDF or Markdown file via the export controls.

## Live Demonstration

To see the software in action, watch the full walkthrough and demonstration on YouTube:
[Watch the 4-Minute Demo Video Here] (Insert your YouTube Link here once uploaded)

## Future Roadmap

* Implementing WebSocket connections for real-time, token-by-token text streaming from the backend.
* Adding a citation graph visualizer.
* User authentication to save past literature reviews.

## Acknowledgements

Developed as a final-year major project by Sualeh Rauf Khan, B.Tech CSE (AI), at Jamia Hamdard.

```

```
