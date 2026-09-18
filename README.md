# 🧞 DietGenie

**DietGenie** is an AI-powered personalized nutrition and wellness web application that helps users plan meals, track nutrition, build meals from available ingredients, recognize food, and follow personalized exercise plans.

 ✨ Features
 **User Authentication** — Secure login and registration with Supabase
 **Personalized Profile** — Stores age, gender, height, weight, activity level, dietary preferences, health information, budget, and fitness goal
 **Personalized Nutrition** — Calculates BMI, calorie requirements, and macronutrient targets
 **AI Meal Planner** — Generates personalized Indian breakfast, lunch, and dinner recommendations
 **Meal Swapping** — Replace individual meals while maintaining the daily calorie target
 **Meal Tracking** — Track meals that were eaten and maintain nutrition records
 **Build My Plate** — Generate dish ideas from available ingredients
 **Food Recognition** — Analyze food images and estimate nutritional information
 **Chat Genie** — AI-powered nutrition and wellness assistant
 **AI Exercise Plans** — Generates personalized daily exercise plans based on user goals and profile
 **Nutrition Dashboard** — Track calories, protein, carbohydrates, and fats
 **Streak Tracking** — Track consistency with daily nutrition and wellness activities
 **Wellness Tracking** — Supports daily health and nutrition monitoring

# 🛠️ Tech Stack

**Frontend** - Next.js, React, TypeScript
**Styling** - Tailwind CSS
**Backend** - Next.js API Routes
**Database & Authentication** - Supabase
**AI** - Google Gemini API
**Charts** - Recharts
**Icons** - Lucide React

# 📁 Project Structure
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
# Environment Variables
NEXT_PUBLIC_SUPABASE_URL – Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY – Supabase anonymous key
GEMINI_API_KEY – Gemini API key
#  Security
The .env.local file is not included in the repository.
The Gemini API key is used on the server and is not exposed in the frontend.
#  Project Goal
DietGenie is a project I built to combine AI with nutrition and wellness features such as meal planning, food analysis, nutrition tracking, and exercise planni
#  Built With
Built as a personal AI project using modern web technologies and generative AI.
