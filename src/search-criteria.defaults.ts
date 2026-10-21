export type VisaPreference = "any" | "must_sponsor";

export interface SearchCriteria {
  titles: string[];
  maxYears: number;
  batchSize: number;
  visa: VisaPreference;
  salaryMin: number | null;
  salaryMax: number | null;
  country: string;
  state: string;
  city: string;
  plainEnglish: string;
}

export const DEFAULT_TITLES = [
  "AI Engineer",
  "AI/ML Engineer",
  "Software Engineer (AI/ML)",
  "Applied AI Engineer",
  "Machine Learning Engineer",
  "LLM Engineer",
  "Generative AI Engineer",
];

export const DEFAULT_SEARCH: SearchCriteria = {
  titles: [...DEFAULT_TITLES],
  maxYears: 3,
  batchSize: 10,
  visa: "any",
  salaryMin: null,
  salaryMax: null,
  country: "",
  state: "",
  city: "",
  plainEnglish: "",
};
