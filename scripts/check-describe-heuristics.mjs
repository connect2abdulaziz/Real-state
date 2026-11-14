const narrative = `I own a single-family home at 28 rue de Josselin, Blainville, Quebec, J7B 1X9. It's a detached house built around 2005 with about 2,000 square feet of living space on a roughly 5,000 sq ft lot. There are 3 bedrooms, 2 full bathrooms, a finished basement, and a garage plus driveway parking.`;

const lot =
  narrative.match(
    /(\d[\d\s,]*)\s*(sq\.?\s*ft|sqft|square\s*feet|m²|m2|pi(?:eds?)?\s*²|pieds?\s*carrés?)\s+(?:lot|terrain)\b/i
  ) ||
  narrative.match(
    /(?:lot|terrain)\s+(?:of\s+|de\s+|d[''])?(?:about|around|approximately|environ|roughly)?\s*(\d[\d\s,]*)\s*(sq\.?\s*ft|sqft|square\s*feet|m²|m2|pi(?:eds?)?\s*²|pieds?\s*carrés?)/i
  ) ||
  narrative.match(
    /(?:on\s+a\s+)?(?:about|around|approximately|environ|roughly)\s+(\d[\d\s,]*)\s*(sq\.?\s*ft|sqft|square\s*feet|m²|m2)\s+lot\b/i
  );

console.log(lot ? { full: lot[0], num: lot[1], unit: lot[2] } : null);
