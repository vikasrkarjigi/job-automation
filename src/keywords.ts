export interface KeywordDef {
  term: string;
  aliases: string[];
}

export const KEYWORDS: KeywordDef[] = [
  { term: "Python", aliases: ["python"] },
  { term: "TypeScript", aliases: ["typescript"] },
  { term: "Java", aliases: ["java"] },
  { term: "C++", aliases: ["c++"] },
  { term: "SQL", aliases: ["sql"] },
  { term: "PyTorch", aliases: ["pytorch", "torch"] },
  { term: "TensorFlow", aliases: ["tensorflow"] },
  { term: "JAX", aliases: ["jax"] },
  { term: "scikit-learn", aliases: ["scikit-learn", "scikit learn", "sklearn"] },
  { term: "Hugging Face", aliases: ["hugging face", "huggingface"] },
  { term: "Transformers", aliases: ["transformers", "transformer models"] },
  { term: "LLM", aliases: ["llm", "llms", "large language model", "large language models"] },
  { term: "RAG", aliases: ["rag", "retrieval augmented generation", "retrieval-augmented generation"] },
  { term: "LangChain", aliases: ["langchain"] },
  { term: "LlamaIndex", aliases: ["llamaindex", "llama index"] },
  { term: "LangGraph", aliases: ["langgraph"] },
  { term: "AI Agents", aliases: ["ai agents", "agentic", "multi-agent", "multi agent"] },
  { term: "Prompt Engineering", aliases: ["prompt engineering"] },
  { term: "Fine-tuning", aliases: ["fine-tuning", "fine tuning", "finetuning", "lora", "peft"] },
  { term: "LLM Evaluation", aliases: ["llm evaluation", "evals", "model evaluation"] },
  { term: "OpenAI API", aliases: ["openai api", "openai"] },
  { term: "Anthropic API", aliases: ["anthropic api", "anthropic", "claude api"] },
  { term: "Embeddings", aliases: ["embeddings", "embedding models"] },
  { term: "Vector Databases", aliases: ["vector database", "vector databases", "vector db", "vector store", "vector stores"] },
  { term: "FAISS", aliases: ["faiss"] },
  { term: "Pinecone", aliases: ["pinecone"] },
  { term: "Weaviate", aliases: ["weaviate"] },
  { term: "Chroma", aliases: ["chroma", "chromadb"] },
  { term: "Qdrant", aliases: ["qdrant"] },
  { term: "Milvus", aliases: ["milvus"] },
  { term: "NLP", aliases: ["nlp", "natural language processing"] },
  { term: "Computer Vision", aliases: ["computer vision"] },
  { term: "MLOps", aliases: ["mlops"] },
  { term: "MLflow", aliases: ["mlflow"] },
  { term: "Weights & Biases", aliases: ["weights & biases", "weights and biases", "wandb"] },
  { term: "Airflow", aliases: ["airflow"] },
  { term: "Prefect", aliases: ["prefect"] },
  { term: "Spark", aliases: ["spark", "pyspark"] },
  { term: "Pandas", aliases: ["pandas"] },
  { term: "NumPy", aliases: ["numpy"] },
  { term: "FastAPI", aliases: ["fastapi"] },
  { term: "Flask", aliases: ["flask"] },
  { term: "Django", aliases: ["django"] },
  { term: "REST APIs", aliases: ["rest api", "rest apis", "restful"] },
  { term: "Docker", aliases: ["docker"] },
  { term: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { term: "AWS", aliases: ["aws", "amazon web services"] },
  { term: "GCP", aliases: ["gcp", "google cloud"] },
  { term: "Azure", aliases: ["azure"] },
  { term: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { term: "MySQL", aliases: ["mysql"] },
  { term: "Redis", aliases: ["redis"] },
  { term: "CI/CD", aliases: ["ci/cd", "continuous integration"] },
  { term: "Git", aliases: ["git"] },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

const patterns = KEYWORDS.map((k) => ({
  term: k.term,
  re: new RegExp(
    `(?<![a-z0-9+#])(?:${k.aliases.map(escape).join("|")})(?![a-z0-9+#])`,
    "g",
  ),
}));

export function stripLatex(tex: string): string {
  return tex
    .split("\n")
    .map((line) => line.replace(/(?<!\\)%.*$/, ""))
    .join("\n")
    .replace(/\\([&%$#_])/g, "$1")
    .replace(/\\[a-zA-Z]+\*?/g, " ")
    .replace(/[{}]/g, " ");
}

export function countTerms(text: string): Map<string, number> {
  const lower = text.toLowerCase();
  const out = new Map<string, number>();
  for (const { term, re } of patterns) {
    const n = lower.match(re)?.length ?? 0;
    if (n > 0) out.set(term, n);
  }
  return out;
}

export function hasTerm(text: string, term: string): boolean {
  return countTerms(text).has(term);
}

export function aliasesFor(term: string): string[] {
  return KEYWORDS.find((k) => k.term === term)?.aliases ?? [term.toLowerCase()];
}
