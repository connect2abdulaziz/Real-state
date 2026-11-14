import { parseCanadianAddress } from "../lib/valuation/parse-address.ts";

const narrative = `I own a single-family home at 28 rue de Josselin, Blainville, Quebec, J7B 1X9, in the Fontainebleau neighbourhood. It's a detached house built around 2005 with about 2,000 square feet of living space on a roughly 5,000 sq ft lot. There are 3 bedrooms, 2 full bathrooms, a finished basement, and a garage plus driveway parking. The property is in good condition. My name is Test User, email test@example.com, phone 514-555-0100.`;

console.log("paragraph", parseCanadianAddress(narrative));
console.log("short", parseCanadianAddress("28 rue de Josselin, Blainville, J7B 1X9"));
