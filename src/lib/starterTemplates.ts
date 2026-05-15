import type { GenerationInputs, Language, Template, Tone } from "./types";

export type StarterTemplateId =
  | "ai-saas-launch"
  | "developer-api"
  | "feature-update"
  | "product-marketing-demo"
  | "devrel-walkthrough"
  | "support-training-demo"
  | "investor-product-demo"
  | "internal-release-update";

export type StarterGeneratedFields = Pick<
  GenerationInputs,
  "brief" | "readme" | "changelog" | "ctaText" | "audience" | "tone" | "language" | "template"
>;

export interface StarterTemplateConfig {
  id: StarterTemplateId;
  label: string;
  description: string;
  template: Template;
  tone: Tone;
  audience: string;
  ctaText: string;
  brief: (companyName: string) => string;
  readme: (companyName: string) => string;
  changelog: (companyName: string) => string;
}

const DEFAULT_LANGUAGE: Language = "English";

function cleanCompanyName(companyName: string) {
  return companyName.trim() || "Your product";
}

export const STARTER_TEMPLATES: StarterTemplateConfig[] = [
  {
    id: "ai-saas-launch",
    label: "AI SaaS Launch",
    description: "Founder-friendly positioning for a new AI product.",
    template: "Product Launch",
    tone: "Confident",
    audience: "Founders, operators, and product teams",
    ctaText: "Start your free trial",
    brief: (name) =>
      `${name} helps teams turn manual workflows into reliable AI-assisted systems, so they can move faster without adding more operational overhead.`,
    readme: (name) =>
      `# ${name}\nAI SaaS platform for teams that need faster execution, cleaner handoffs, and measurable workflow automation without rebuilding their stack.`,
    changelog: (name) =>
      `${name} launch release - Added guided onboarding, AI workflow generation, team-ready templates, and analytics for tracking adoption.`,
  },
  {
    id: "developer-api",
    label: "Developer API",
    description: "Technical demo copy for APIs, SDKs, and infrastructure.",
    template: "API Demo",
    tone: "Technical",
    audience: "Developers, platform teams, and technical founders",
    ctaText: "Read the docs",
    brief: (name) =>
      `${name} gives developers a fast, production-ready API with clean SDKs, predictable responses, and observability that makes integration work easier to ship.`,
    readme: (name) =>
      `# ${name}\nProduction-grade developer API with typed SDKs, webhook support, sandbox testing, idempotent requests, and clear examples for common integration paths.`,
    changelog: (name) =>
      `${name} v2.4 - Added SDK quickstarts, webhook retry controls, dashboard logs, and lower latency across core API endpoints.`,
  },
  {
    id: "feature-update",
    label: "Feature Update",
    description: "Show what changed, who benefits, and why it matters.",
    template: "Feature Update",
    tone: "Friendly",
    audience: "Existing customers, product teams, and customer success teams",
    ctaText: "Try the new workflow",
    brief: (name) =>
      `${name} just shipped a new workflow that removes repetitive steps, makes the product easier to understand, and helps users reach the outcome faster.`,
    readme: (name) =>
      `# ${name} Feature Update\nThis release improves the core workflow with a cleaner setup path, faster review loop, and clearer status tracking for teams.`,
    changelog: (name) =>
      `${name} update - Added a guided setup experience, improved empty states, streamlined review actions, and clearer success messaging.`,
  },
  {
    id: "product-marketing-demo",
    label: "Product Marketing Demo",
    description: "Benefit-led story for launches, sales pages, and campaigns.",
    template: "Product Launch",
    tone: "Confident",
    audience: "Product marketers, growth teams, and revenue leaders",
    ctaText: "Book a demo",
    brief: (name) =>
      `${name} turns the product's strongest value proposition into a crisp buyer-ready story, helping teams explain the outcome in seconds instead of slides.`,
    readme: (name) =>
      `# ${name}\nGo-to-market demo narrative focused on buyer pain, product differentiation, measurable outcomes, and a clear next step for qualified prospects.`,
    changelog: (name) =>
      `${name} campaign update - Refined positioning, added customer proof points, improved CTA flow, and packaged the launch story for sales enablement.`,
  },
  {
    id: "devrel-walkthrough",
    label: "DevRel Walkthrough",
    description: "Community-ready walkthrough for docs, launches, and demos.",
    template: "API Demo",
    tone: "Friendly",
    audience: "Developers, DevRel teams, and technical community members",
    ctaText: "Build your first project",
    brief: (name) =>
      `${name} helps developers understand the product quickly with a practical walkthrough that starts from the problem, shows the workflow, and ends with a buildable next step.`,
    readme: (name) =>
      `# ${name} Developer Walkthrough\nHands-on guide with prerequisites, setup steps, key API calls, example output, and a clear path from first request to working demo.`,
    changelog: (name) =>
      `${name} developer update - Added quickstart examples, simplified setup copy, improved docs navigation, and included a starter project path.`,
  },
  {
    id: "support-training-demo",
    label: "Support / Training Demo",
    description: "Clear enablement flow for customers and internal teams.",
    template: "Feature Update",
    tone: "Friendly",
    audience: "Support teams, onboarding teams, and end users",
    ctaText: "Open the help guide",
    brief: (name) =>
      `${name} gives teams a repeatable training flow that explains what to do, why it matters, and how to complete the task without waiting on support.`,
    readme: (name) =>
      `# ${name} Training Flow\nStep-by-step enablement content for onboarding, support deflection, common setup tasks, troubleshooting, and successful handoff.`,
    changelog: (name) =>
      `${name} training update - Added guided steps, clearer help copy, updated screenshots, and new support-ready answers for common questions.`,
  },
  {
    id: "investor-product-demo",
    label: "Investor Product Demo",
    description: "High-signal narrative for traction, moat, and product clarity.",
    template: "Product Launch",
    tone: "Confident",
    audience: "Investors, advisors, and strategic partners",
    ctaText: "View the investor brief",
    brief: (name) =>
      `${name} packages the product vision, customer pain, and differentiated workflow into a concise demo that makes the market opportunity easy to understand.`,
    readme: (name) =>
      `# ${name} Investor Demo\nConcise product narrative covering the user problem, unique insight, workflow, market signal, traction narrative, and the next milestone.`,
    changelog: (name) =>
      `${name} investor update - Added sharper positioning, traction highlights, product workflow proof, and a tighter call to action for follow-up conversations.`,
  },
  {
    id: "internal-release-update",
    label: "Internal Release Update",
    description: "Team-facing release recap for product and GTM alignment.",
    template: "Feature Update",
    tone: "Technical",
    audience: "Product, engineering, sales, and customer success teams",
    ctaText: "Review the rollout notes",
    brief: (name) =>
      `${name} gives internal teams a shared release narrative so everyone understands what shipped, why it matters, and how to talk about it with customers.`,
    readme: (name) =>
      `# ${name} Internal Release\nTeam-facing release summary with shipped changes, customer impact, enablement notes, rollout risks, and owner-ready next steps.`,
    changelog: (name) =>
      `${name} internal release - Added rollout notes, customer impact bullets, enablement talking points, and follow-up actions for post-launch teams.`,
  },
];

export function getStarterTemplate(id: StarterTemplateId) {
  return STARTER_TEMPLATES.find((starter) => starter.id === id);
}

export function buildStarterFields(
  starterId: StarterTemplateId,
  companyName: string,
): StarterGeneratedFields {
  const starter = getStarterTemplate(starterId);
  if (!starter) {
    throw new Error(`Unknown starter template: ${starterId}`);
  }

  const name = cleanCompanyName(companyName);
  return {
    brief: starter.brief(name),
    readme: starter.readme(name),
    changelog: starter.changelog(name),
    ctaText: starter.ctaText,
    audience: starter.audience,
    tone: starter.tone,
    language: DEFAULT_LANGUAGE,
    template: starter.template,
  };
}
