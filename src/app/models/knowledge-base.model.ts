export interface MediaContent {
  type: 'image' | 'video';
  url: string;
  alt?: string;
  caption?: string;
}

export interface ArticleContentSection {
  type: 'text' | 'list' | 'callout' | 'table' | 'media' | 'heading';
  content?: string | string[] | MediaContent | any;
  title?: string;
  variant?: string;
  level?: number;
  style?: string;
  items?: string[];
}

export interface ArticleContent {
  sections: ArticleContentSection[];
}

export interface Article {
  id: string;
  title: string;
  content: ArticleContent;
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