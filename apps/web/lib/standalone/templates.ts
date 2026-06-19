import type { JobListing, JobMatch } from "@/lib/api-client";

export function generateCoverLetter(
  profile: { skills: string[]; ai_summary?: Record<string, unknown> },
  match: JobMatch
): string {
  const name = "Applicant";
  const job = match.job;
  const domains = (profile.ai_summary?.primary_domains as string[]) || [];
  const skills = match.matched_skills.slice(0, 5).join(", ") || profile.skills.slice(0, 5).join(", ");

  return `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. With experience in ${domains.join(" and ") || "my field"}, I believe I would be a strong fit for your team.

My background includes skills in ${skills}, which align closely with the requirements for this role. I am particularly drawn to ${job.company} because of its reputation in Sri Lanka's job market.

I would welcome the opportunity to discuss how my experience can contribute to your team. Thank you for considering my application.

Sincerely,
${name}`;
}

export function generateInterviewPrep(match: JobMatch) {
  const job = match.job;
  return {
    content: {
      technical_questions: [
        `Describe your experience relevant to ${job.title}.`,
        `How would you apply ${match.matched_skills[0] || "your core skills"} in this role?`,
        `What tools or methods do you use for work similar to this position?`,
      ],
      hr_questions: [
        `Why do you want to join ${job.company}?`,
        "Tell me about a challenge you overcame at work.",
        "Where do you see yourself in 3 years?",
      ],
      suggested_answers: [
        `Highlight your ${match.matched_skills.slice(0, 3).join(", ") || "relevant"} experience and link it to ${job.title}.`,
        `Research ${job.company} and mention a specific reason you want to work there.`,
        "Use the STAR method (Situation, Task, Action, Result) for behavioral questions.",
      ],
    },
  };
}
