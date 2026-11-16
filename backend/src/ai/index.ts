import type { EndpointInput } from "../services/api.service";

/**
 * AI-ready architecture (no paid APIs — by design).
 *
 * The platform exposes a provider interface so a future model-backed provider
 * (local LLM, self-hosted, etc.) can be dropped in without touching routes,
 * controllers or the frontend.
 */
export interface GeneratedApiSpec {
  name: string;
  description: string;
  endpoints: EndpointInput[];
}

export interface AiProvider {
  readonly id: string;
  readonly label: string;
  /** "Generate an API from a text description." */
  generateApiFromText(prompt: string): Promise<GeneratedApiSpec>;
  /** "Generate a JSON schema for a resource named X." */
  generateSchema(resource: string): Promise<Record<string, unknown>>;
  /** "Explain this error." */
  explainError(input: { method: string; path: string; status: number; body: string }): Promise<string>;
}

/**
 * Offline heuristic provider — always available, zero network.
 * It recognizes CRUD-ish phrasing ("a users api with posts and comments") and
 * scaffolds a sensible REST surface.
 */
export class OfflineHeuristicProvider implements AiProvider {
  readonly id = "offline-heuristic";
  readonly label = "Offline heuristics (no external calls)";

  private static STOP_WORDS = new Set([
    "a", "an", "the", "api", "with", "and", "for", "of", "to", "me", "create", "generate", "build", "make", "mock", "rest", "simple", "basic", "please",
  ]);

  private extractResources(prompt: string): string[] {
    const words = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !OfflineHeuristicProvider.STOP_WORDS.has(word));

    const unique = [...new Set(words)].slice(0, 4);
    return unique.length > 0 ? unique : ["items"];
  }

  private pluralize(word: string): string {
    // Words that already end in a plain "s" are treated as already plural
    // ("posts" stays "posts"), while "box"/"church" get the -es form.
    if (/[^s]s$/.test(word)) return word;
    if (/(s|x|ch|sh)$/.test(word)) return `${word}es`;
    if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
    return `${word}s`;
  }

  private sample(resource: string): unknown {
    const name = resource.charAt(0).toUpperCase() + resource.slice(1);
    return {
      data: {
        id: 1,
        name: `Sample ${name}`,
        slug: `${resource}-sample`,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async generateApiFromText(prompt: string): Promise<GeneratedApiSpec> {
    const resources = this.extractResources(prompt);
    const count = resources.length;
    const endpoints: EndpointInput[] = [];

    for (const resource of resources) {
      const plural = this.pluralize(resource);
      endpoints.push(
        {
          method: "GET",
          path: `/${plural}`,
          statusCode: 200,
          description: `List ${plural}`,
          responseBody: JSON.stringify({ data: [this.sample(resource)], total: 1 }, null, 2),
        },
        {
          method: "GET",
          path: `/${plural}/:id`,
          statusCode: 200,
          description: `Get one ${resource}`,
          responseBody: JSON.stringify(this.sample(resource), null, 2),
        },
        {
          method: "POST",
          path: `/${plural}`,
          statusCode: 201,
          description: `Create a ${resource}`,
          responseBody: JSON.stringify({ data: this.sample(resource), created: true }, null, 2),
        },
        {
          method: "PATCH",
          path: `/${plural}/:id`,
          statusCode: 200,
          description: `Update a ${resource}`,
          responseBody: JSON.stringify({ data: this.sample(resource), updated: true }, null, 2),
        },
        {
          method: "DELETE",
          path: `/${plural}/:id`,
          statusCode: 200,
          description: `Delete a ${resource}`,
          responseBody: JSON.stringify({ success: true }, null, 2),
        },
      );
    }

    return {
      name: `${resources.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(" + ")} API`,
      description: `Scaffolded from prompt: "${prompt.slice(0, 120)}" (${count} resource${count === 1 ? "" : "s"}).`,
      endpoints,
    };
  }

  async generateSchema(resource: string): Promise<Record<string, unknown>> {
    const name = resource.trim().toLowerCase().replace(/\s+./g, (c) => c.toUpperCase()).replace(/\s/g, "");
    const singular = name.replace(/e?s$/, "");
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: `https://t0rdix.local/schemas/${singular}.schema.json`,
      title: singular.charAt(0).toUpperCase() + singular.slice(1),
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "integer", description: "Unique identifier" },
        name: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
      },
    };
  }

  async explainError(input: { method: string; path: string; status: number; body: string }): Promise<string> {
    const hints: Record<number, string> = {
      400: "The request payload or parameters are malformed. Check required fields and JSON syntax.",
      401: "Authentication is missing or the token is invalid/expired.",
      403: "The credentials are valid but not allowed to access this resource.",
      404: `No handler for ${input.method} ${input.path}. In T0rdix mocks, check the endpoint path spelling and :params.`,
      409: "The request conflicts with existing state (duplicate key, concurrent modification…).",
      429: "Rate limited — back off and retry with exponential delay.",
      500: "Unhandled server error. Inspect the response body and server logs.",
    };
    const generic = hints[input.status] ?? `Unexpected status ${input.status}.`;
    const snippet = input.body.slice(0, 400);
    return [
      `**${input.method} ${input.path} → ${input.status}**`,
      "",
      generic,
      input.body ? `\nResponse body:\n\`\`\`\n${snippet}\n\`\`\`` : "",
    ].join("\n");
  }
}

/** Registry — swap in a model-backed provider here later. */
export function getAiProvider(): AiProvider {
  return new OfflineHeuristicProvider();
}
