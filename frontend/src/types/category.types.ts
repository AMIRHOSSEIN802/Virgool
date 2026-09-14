export interface CategoryEntity {
  id: number;
  title: string;
  priority: number | null;
  /** Real usage count returned by GET /category (blog_category rows). */
  blogCount?: number;
}
