/* What the profile says. Mirrors the portfolio (Portfolio-Web: src/links.js,
   src/projects.json, src/skills.js) — when one of those changes, change it
   here too and run `npm run build`. */

export const SITE = "https://portfolio-web-coral-xi.vercel.app/";

export const CONTACT = {
  name: "Augniña Krizzel Reburiano",
  nameLines: ["Augniña Krizzel", "Reburiano"],
  initials: "AKR",
  role: "Full-Stack Developer",
  ledeLines: ["I build 3D viewers, AR tools, mobile apps and", "booking sites, across every layer."],
  location: "Baguio City, Philippines",
  email: "reburianonina@gmail.com",
  availability: ["Open", "remote work and freelance"],
};

/* Ring order, inner to outer: the same order the portfolio's orbit uses. */
export const PROJECTS = [
  { id: "gourmet-getaway-tours", name: "Gourmet Getaway Tours", kind: "Booking site", accent: "#d9b45a" },
  { id: "oxilia", name: "Oxilia", kind: "Team workspace", accent: "#8c7a5b" },
  { id: "mealplanner", name: "MealPlanner", kind: "Mobile app", accent: "#e8d6a8" },
  { id: "tingi-station", name: "Tingi Station", kind: "Shopify store", accent: "#a6692e" },
  { id: "aicore", name: "AiCore", kind: "3D desktop viewer", accent: "#6e5a3a" },
  { id: "kwento-kard", name: "Kwento Kard", kind: "WebAR studio", accent: "#c98f3a" },
  { id: "socialhat", name: "SocialHat", kind: "Agency redesign", accent: "#b9b3a3" },
  { id: "pure-water-filtration", name: "Pure Water Filtration", kind: "3D sales site", accent: "#7d8a86" },
];

/* `learning: true` is the honesty mark. The set is Augniña's; do not add to
   it or take from it without asking her. */
const L = true;
export const SKILL_GROUPS = [
  {
    name: "Frontend",
    skills: [["React"], ["Next.js"], ["React Native"], ["Flutter"], ["TypeScript"], ["JavaScript"], ["HTML"], ["CSS"]],
  },
  {
    name: "Backend",
    skills: [["Node.js"], ["Express", L], ["NestJS"], ["Django", L], ["FastAPI", L], ["PHP"], ["Python", L]],
  },
  {
    name: "Data",
    skills: [["PostgreSQL", L], ["MySQL"], ["MongoDB"], ["Prisma"], ["Supabase", L], ["Firebase"]],
  },
  {
    name: "Delivery",
    skills: [["Shopify"], ["Vercel"], ["Google Cloud"], ["Git"], ["GitHub Actions", L], ["SEO"]],
  },
];

export const BUTTONS = [
  { file: "btn-portfolio", label: "View portfolio", gold: true },
  { file: "btn-email", label: "Email me" },
  { file: "btn-linkedin", label: "LinkedIn" },
  { file: "btn-cv", label: "Download CV" },
];
