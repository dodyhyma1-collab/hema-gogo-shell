export interface Tenant {
  id: string;
  name: string;
  nameAr: string;
  initials: string;
  plan: string;
  hue: string;
}

export const tenants: Tenant[] = [
  { id: "acme", name: "Acme Retail", nameAr: "أكمي للتجزئة", initials: "AR", plan: "Enterprise", hue: "bg-emerald-500" },
  { id: "nova", name: "Nova Health", nameAr: "نوفا للصحة", initials: "NH", plan: "Business", hue: "bg-sky-500" },
  { id: "atlas", name: "Atlas Logistics", nameAr: "أطلس للخدمات اللوجستية", initials: "AL", plan: "Business", hue: "bg-amber-500" },
  { id: "qamar", name: "Qamar Media", nameAr: "قمر للإعلام", initials: "QM", plan: "Starter", hue: "bg-violet-500" },
  { id: "falcon", name: "Falcon Energy", nameAr: "فالكون للطاقة", initials: "FE", plan: "Enterprise", hue: "bg-rose-500" },
];
