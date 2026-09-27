<h1 align="center">ITxMECH Respiratory Web</h1>

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend_Platform-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

> Web dashboard for **ITxMECH RespiratoryWeb** — an AIoT respiratory monitoring system focused on **SpO₂ tracking**, **digital lung sound recordings**, **AI-assisted respiratory cycle classification**, and **doctor review**.

---

## Overview

**ITxMECH RespiCare Web** is the doctor-facing web application of the ITxMech respiratory AIoT system.

The system is designed around a focused clinical workflow:

```text
Patient
   ↓
Visit
   ↓
SpO₂ monitoring
   +
Digital stethoscope recording
   ↓
AI respiratory-cycle analysis
   ↓
Doctor review
   ↓
Visit history & alerts
```

The web application does **not** aim to be a complete Hospital Information System or ICU monitoring platform. Its main scope is limited to:

- Patient and visit management
- SpO₂ monitoring
- Lung sound recording visualization
- AI-assisted lung sound classification
- Doctor confirmation / correction of AI results
- Alerts and visit history

---

## Core Features

### Patient Management
- View patient list
- Create new patient profiles
- Search patients by name or patient ID
- Store basic patient information
- Store doctor-entered background diagnosis
- View historical visits

### Visit Workflow
- Start a new visit for an existing patient
- Create a patient and immediately start a visit
- Track current visit state
- Add doctor notes
- Complete a visit without overwriting previous visit data

### SpO₂ Monitoring
- Display current SpO₂
- Show SpO₂ trend over time
- Support 24-hour / 7-day / 30-day views
- Highlight abnormal values
- Display detailed SpO₂ history

### Digital Lung Sound Recording
- Receive one complete WAV recording per visit
- Recording is produced automatically by firmware
- No manual Record / Stop button is required on the web
- Display recording state:
  - Waiting for recording
  - Receiving recording
  - AI processing
  - AI result ready
  - Waiting for doctor review
  - Confirmed

### AI Lung Sound Analysis
The AI service classifies each respiratory cycle into one of four classes:

- `Normal`
- `Crackles`
- `Wheezes`
- `Crackles + Wheezes`

A recording can contain multiple respiratory cycles:

```text
Recording
├── Cycle 01
├── Cycle 02
├── Cycle 03
└── ...
```

Each cycle can contain:

```ts
{
  start: number;
  end: number;
  label: "normal" | "crackles" | "wheezes" | "both";
  confidence: number;
}
```

### Audio Waveform
The detailed recording screen is designed to use **WaveSurfer.js** for real WAV waveform visualization.

Planned waveform capabilities:

- Real waveform rendering from WAV files
- Play / pause
- Seek
- Timeline
- Current time / duration
- Respiratory-cycle segmentation
- Region highlighting by AI class
- Click a cycle to play only that segment

### Doctor Review
- Review AI prediction per respiratory cycle
- Confirm AI result
- Correct AI label
- Preserve original AI prediction
- Store doctor review separately
- Add clinical notes

### Alerts
The web only shows alerts relevant to the current project scope:

- Low SpO₂
- Crackles detected
- Wheezes detected
- Crackles + Wheezes detected
- Recording waiting for doctor review
- Device offline

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Web Backend | Next.js Route Handlers |
| AI Service | FastAPI + PyTorch |
| Deployment | Vercel |
| AI Deployment | Docker + VPS |

---

## Project Structure

```text
itxmech-respiratory-web/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   └── api/
│   │
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── visits/
│   │   ├── recordings/
│   │   ├── alerts/
│   │   ├── devices/
│   │   └── ui/
│   │
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── server.ts
│   │
│   ├── services/
│   └── types/
│
├── public/
├── .env.local
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Main Routes

```text
/login

/dashboard

/patients

/patients/[id]

/patients/[id]/visits/new

/patients/[id]/visits/[visitId]

/recordings

/recordings/[id]

/alerts

/devices

/settings
```

---

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

For future backend-to-AI integration:

```env
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your_private_ai_service_key
```

> Never expose private service keys with the `NEXT_PUBLIC_` prefix.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/itxmech-respiratory-web.git
cd itxmech-respiratory-web
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```bash
.env.local
```

Then add the required environment variables.

### 4. Start development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Build

Run a production build locally:

```bash
npm run build
```

Start production mode:

```bash
npm start
```

---

## Team

**ITxMECH**

AIoT respiratory monitoring system with SpO₂ tracking, digital stethoscope recordings, AI-assisted lung sound classification, and doctor review.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
