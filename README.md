# 🧞 DietGenie

**DietGenie** is an AI-powered personalized nutrition and wellness web application that helps users plan meals, track nutrition, build meals from available ingredients, recognize food, and follow personalized exercise plans.

## ✨ Features

* 🔐 **User Authentication** — Secure login and registration with Supabase
* 👤 **Personalized Profile** — Stores age, gender, height, weight, activity level, dietary preferences, health information, budget, and fitness goal
* 📊 **Personalized Nutrition** — Calculates BMI, calorie requirements, and macronutrient targets
* 🍱 **AI Meal Planner** — Generates personalized Indian breakfast, lunch, and dinner recommendations
* 🔄 **Meal Swapping** — Replace individual meals while maintaining the daily calorie target
* ✅ **Meal Tracking** — Track meals that were eaten and maintain nutrition records
* 🍳 **Build My Plate** — Generate dish ideas from available ingredients
* 🥗 **Food Recognition** — Analyze food images and estimate nutritional information
* 💬 **Chat Genie** — AI-powered nutrition and wellness assistant
* 🏋️ **AI Exercise Plans** — Generates personalized daily exercise plans based on user goals and profile
* 📈 **Nutrition Dashboard** — Track calories, protein, carbohydrates, and fats
* 🔥 **Streak Tracking** — Track consistency with daily nutrition and wellness activities
* 💧 **Wellness Tracking** — Supports daily health and nutrition monitoring

## 🛠️ Tech Stack

* **Frontend:** Next.js, React, TypeScript
* **Styling:** Tailwind CSS
* **Backend:** Next.js API Routes
* **Database & Authentication:** Supabase
* **AI:** Google Gemini API
* **Charts:** Recharts
* **Icons:** Lucide React

## 📁 Project Structure

```text
DietGenie/
├── src/
│   └── app/
│       ├── api/
│       │   ├── calculate-metrics/
│       │   └── dashboard/
│       ├── auth/
│       ├── dashboard/
│       └── onboarding/
├── public/
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd dietgenie
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

**Never commit `.env.local` or expose your Gemini API key publicly.**

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 🏗️ Production Build

To verify the project builds successfully:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## 🔑 Environment Variables

| Variable                        | Purpose                            |
| ------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key |
| `GEMINI_API_KEY`                | Google Gemini API access           |

## 🔒 Security

Sensitive environment variables are stored in `.env.local` and excluded from Git using `.gitignore`.

The Gemini API key is used server-side and should never be exposed in client-side code or committed to the repository.

## 🎯 Project Goal

DietGenie aims to combine **AI, nutrition tracking, personalized meal planning, food analysis, and fitness guidance** into a single user-friendly wellness platform.

## 👩‍💻 Built With

Built as a personal Data Science / AI project using modern web technologies and generative AI.
