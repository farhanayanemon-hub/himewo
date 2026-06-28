export const CATEGORIES = [
  { value: "vehicles", label: "Vehicles" },
  { value: "property", label: "Property Rentals" },
  { value: "electronics", label: "Electronics" },
  { value: "home", label: "Home & Garden" },
  { value: "clothing", label: "Clothing & Accessories" },
  { value: "hobbies", label: "Hobbies & Toys" },
  { value: "family", label: "Family" },
  { value: "free", label: "Free Stuff" },
  { value: "other", label: "Miscellaneous" },
];

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "used_like_new", label: "Used - Like New" },
  { value: "used_good", label: "Used - Good" },
  { value: "used_fair", label: "Used - Fair" },
];

export function formatPrice(price: number, currency = "BDT") {
  if (price === 0) return "Free";
  const symbol = currency === "BDT" ? "৳" : currency + " ";
  return `${symbol}${price.toLocaleString()}`;
}

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Miscellaneous";
}

export function conditionLabel(value: string) {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}
