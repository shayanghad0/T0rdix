import { randomToken } from "../utils/crypto";

/**
 * Deterministic fake data generator (no external dependency).
 * Uses a seeded xorshift RNG so the same seed always produces the same data —
 * great for reproducible mocks and tests.
 */

type Rng = () => number;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ["Aria", "Milo", "Nova", "Kai", "Luna", "Theo", "Iris", "Zane", "Mira", "Owen", "Elsa", "Felix", "Ruby", "Silas", "Juno", "Emil", "Freya", "Rowan", "Nadia", "Hugo", "Priya", "Diego", "Amara", "Kenji", "Leilani", "Tomas", "Zara", "Arjun", "Ines", "Mateo"];
const LAST_NAMES = ["Hartley", "Vance", "Okafor", "Lindqvist", "Marchetti", "Duarte", "Novak", "Kaminski", "Reyes", "Blomqvist", "Tanaka", "Alvarez", "Brennan", "Kovacs", "Delgado", "Petrov", "Nakamura", "Huang", "Silva", "Bergström", "Moreau", "Antonelli", "Fitzgerald", "Aziz", "Kowalski"];
const CITIES = ["Zurich", "Osaka", "Reykjavik", "Porto", "Austin", "Tallinn", "Kyoto", "Lisbon", "Denver", "Hamburg", "Auckland", "Ljubljana", "Montreal", "Cape Town", "Helsinki"];
const STREETS = ["Maple Ave", "Birch Lane", "Harbor Rd", "Sunset Blvd", "Cedar Ct", "Foundry St", "Orchard Way", "Beacon St", "Willow Cres", "Grand Ave"];
const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];
const INDUSTRIES = ["Fintech", "Healthcare", "Developer Tools", "E-commerce", "Gaming", "Logistics", "Energy", "Education", "Media", "Cybersecurity"];
const PRODUCT_ADJ = ["Ultra", "Smart", "Pro", "Neo", "Quantum", "Flex", "Prime", "Core", "Swift", "Max"];
const PRODUCT_NOUN = ["Keyboard", "Monitor", "Controller", "Hub", "Camera", "Router", "Headset", "Charger", "Dock", "Sensor", "Panel", "Adapter"];
const CATEGORIES = ["electronics", "accessories", "networking", "gaming", "office", "audio"];
const DOMAINS = ["inc", "io", "dev", "labs", "tech", "systems"];
const PAY_METHODS = ["card", "paypal", "bank_transfer", "apple_pay", "crypto"];

function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] ?? list[0]!;
}

function pickInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function isoDateWithin(rng: Rng, daysBack: number): string {
  const ts = Date.now() - Math.floor(rng() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(ts).toISOString();
}

export type FakeDataType = "users" | "products" | "orders" | "companies" | "addresses";

export const FAKE_DATA_TYPES: FakeDataType[] = ["users", "products", "orders", "companies", "addresses"];

export interface GenerateInput {
  type: FakeDataType;
  count: number;
  seed?: string;
}

export function generateFakeData(input: GenerateInput): Record<string, unknown>[] {
  const count = Math.max(1, Math.min(input.count, 100));
  const seed = input.seed?.trim() || randomToken(6);
  const rng = mulberry32(hashSeed(`${input.type}:${seed}`));

  switch (input.type) {
    case "users":
      return Array.from({ length: count }, () => {
        const first = pick(rng, FIRST_NAMES);
        const last = pick(rng, LAST_NAMES);
        const id = pickInt(rng, 1, 99999);
        return {
          id,
          firstName: first,
          lastName: last,
          name: `${first} ${last}`,
          username: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}${pickInt(rng, 1, 99)}`,
          email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@${pick(rng, ["example.com", "t0rdix.dev", "mail.co"])}`,
          phone: `+1-${pickInt(rng, 200, 989)}-${pickInt(rng, 100, 999)}-${pickInt(rng, 1000, 9999)}`,
          gender: rng() > 0.5 ? "female" : "male",
          birthday: isoDateWithin(rng, 365 * 40).slice(0, 10),
          isActive: rng() > 0.2,
          createdAt: isoDateWithin(rng, 365 * 3),
        };
      });

    case "products":
      return Array.from({ length: count }, () => ({
        id: pickInt(rng, 1, 99999),
        name: `${pick(rng, PRODUCT_ADJ)} ${pick(rng, PRODUCT_NOUN)} ${pickInt(rng, 2, 9)}`,
        sku: `SKU-${randomToken(4).toUpperCase().slice(0, 6)}-${pickInt(rng, 100, 999)}`,
        price: Number((rng() * 490 + 9.99).toFixed(2)),
        currency: "USD",
        category: pick(rng, CATEGORIES),
        inStock: rng() > 0.25,
        stock: pickInt(rng, 0, 500),
        rating: Number((2.5 + rng() * 2.5).toFixed(1)),
        createdAt: isoDateWithin(rng, 400),
      }));

    case "orders": {
      const orders: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i += 1) {
        const items = Array.from({ length: pickInt(rng, 1, 4) }, () => ({
          productId: pickInt(rng, 1, 9999),
          name: `${pick(rng, PRODUCT_ADJ)} ${pick(rng, PRODUCT_NOUN)}`,
          qty: pickInt(rng, 1, 5),
          price: Number((rng() * 120 + 4.5).toFixed(2)),
        }));
        const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);
        orders.push({
          id: `ORD-${randomToken(3).toUpperCase().slice(0, 8)}`,
          customerId: pickInt(rng, 1, 9999),
          items,
          total: Number(total.toFixed(2)),
          currency: "USD",
          status: pick(rng, STATUSES),
          paymentMethod: pick(rng, PAY_METHODS),
          createdAt: isoDateWithin(rng, 180),
        });
      }
      return orders;
    }

    case "companies":
      return Array.from({ length: count }, () => {
        const base = `${pick(rng, PRODUCT_NOUN)}${pick(rng, ["ly", "ify", "wave", "stack", "forge", "base"])}`;
        const capital = base.charAt(0).toUpperCase() + base.slice(1);
        return {
          id: pickInt(rng, 1, 99999),
          name: `${capital} ${pick(rng, ["Inc", "Labs", "Group", "Systems"])}`,
          industry: pick(rng, INDUSTRIES),
          domain: `${base.toLowerCase()}.${pick(rng, DOMAINS)}`,
          employees: pickInt(rng, 2, 12000),
          founded: pickInt(rng, 1975, 2024),
          address: `${pickInt(rng, 1, 250)} ${pick(rng, STREETS)}, ${pick(rng, CITIES)}`,
        };
      });

    case "addresses":
      return Array.from({ length: count }, () => ({
        id: pickInt(rng, 1, 99999),
        street: `${pickInt(rng, 1, 250)} ${pick(rng, STREETS)}`,
        city: pick(rng, CITIES),
        state: pick(rng, ["CA", "NY", "TX", "WA", "FL", "IL", "CO", "OR"]),
        zip: String(pickInt(rng, 10000, 99999)),
        country: pick(rng, ["USA", "Canada", "Germany", "Japan", "Portugal", "Switzerland"]),
        geo: {
          lat: Number((rng() * 140 - 60).toFixed(4)),
          lng: Number((rng() * 340 - 170).toFixed(4)),
        },
      }));

    default:
      return [];
  }
}
