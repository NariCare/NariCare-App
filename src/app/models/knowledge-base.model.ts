export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: ArticleCategory;
  tags: string[];
  author: string;
  publishedAt: Date;
  updatedAt: Date;
  readTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isBookmarked?: boolean;
  imageUrl?: string;
  featured?: boolean;
}

export interface ArticleCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface SearchResult {
  articles: Article[];
  totalCount: number;
  facets: SearchFacets;
}

export interface SearchFacets {
  categories: { [key: string]: number };
  tags: { [key: string]: number };
  difficulty: { [key: string]: number };
}