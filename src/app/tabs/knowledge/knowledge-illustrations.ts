const CATEGORY_ILLUSTRATIONS: { [categoryId: string]: string } = {
  'postpartum-early-days': 'assets/images/knowledge/postpartum-early-days.webp',
  'breastfeeding-techniques': 'assets/images/knowledge/breastfeeding-techniques.webp',
  'milk-supply-production': 'assets/images/knowledge/milk-supply-production.webp',
  'common-challenges': 'assets/images/knowledge/common-challenges.webp',
  'baby-health-growth': 'assets/images/knowledge/baby-health-growth.webp',
  'preparation-planning': 'assets/images/knowledge/preparation-planning.webp'
};

const FALLBACK_ILLUSTRATION = 'assets/images/knowledge/postpartum-early-days.webp';

export function illustrationForCategory(categoryId: string): string {
  return CATEGORY_ILLUSTRATIONS[categoryId] || FALLBACK_ILLUSTRATION;
}
