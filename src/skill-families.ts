import fs from "node:fs";
import { paths } from "./settings.ts";

export const STARTER_FAMILIES: Record<string, string[]> = {
  "vector stores": ["FAISS", "Pinecone", "Weaviate", "Chroma", "Qdrant", "Milvus"],
  "deep learning frameworks": ["PyTorch", "TensorFlow", "JAX"],
  "LLM app frameworks": ["LangChain", "LlamaIndex"],
  "Python web APIs": ["FastAPI", "Flask", "Django"],
  "workflow orchestration": ["Airflow", "Prefect"],
  "experiment tracking": ["MLflow", "Weights & Biases"],
  "relational databases": ["PostgreSQL", "MySQL"],
  "hosted LLM APIs": ["OpenAI API", "Anthropic API"],
};

export interface LearnedLink {
  from: string;
  to: string;
  firstJobId: string;
}

export function loadFamilies(): Record<string, string[]> {
  const extra = readLearned();
  const families: Record<string, string[]> = {};
  for (const [name, members] of Object.entries(STARTER_FAMILIES)) families[name] = [...members];
  for (const f of extra.families ?? []) families[f.name] = f.members;
  return families;
}

export function familyOf(term: string): string[] {
  for (const members of Object.values(loadFamilies())) {
    if (members.includes(term)) return members;
  }
  return [];
}

interface LearnedFile {
  families?: { name: string; members: string[] }[];
  links: LearnedLink[];
}

function readLearned(): LearnedFile {
  const file = paths.families();
  if (!fs.existsSync(file)) return { links: [] };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function learnedLinks(): LearnedLink[] {
  return readLearned().links;
}

export function rememberLink(from: string, to: string, jobId: string): void {
  const data = readLearned();
  if (data.links.some((l) => l.from === from && l.to === to)) return;
  data.links.push({ from, to, firstJobId: jobId });
  fs.mkdirSync(paths.profile(), { recursive: true });
  fs.writeFileSync(paths.families(), JSON.stringify(data, null, 2) + "\n");
}
