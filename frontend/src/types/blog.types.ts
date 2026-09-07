export interface BlogEntity {
  id: number;
  title: string;
  description: string;
  content: string;
  image: string | null;
  slug: string;
  time_for_study: string;
  status: 'published' | 'draft' | 'reject';
  authorId: number;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: number;
    username: string;
    profile?: {
      nick_name: string;
    };
  };
  categories?: {
    id: number;
    category?: {
      title: string;
    };
  }[];
}

export interface BlogListBlog {
  id: number;
  title: string;
  description: string;
  slug: string;
  time_for_study: string;
  image: string | null;
  status?: 'published' | 'draft' | 'reject';
  likeCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  created_at: string;
  author?: {
    id: number;
    username: string;
    profile?: {
      nick_name: string;
    };
  };
  categories?: {
    id: number;
    category?: {
      title: string;
    };
  }[];
}

export interface CreateBlogDto {
  title: string;
  slug?: string;
  time_for_study: string;
  image?: string;
  description: string;
  content: string;
  categories: string[] | string;
}

export type UpdateBlogDto = Partial<CreateBlogDto>;

export interface FilterBlogDto {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BlogDetailResponse {
  blog: BlogEntity;
  isLiked: boolean;
  isBookmarked: boolean;
  commentsData: {
    pagination: {
      totalCount: number;
      page: number;
      limit: number;
      pageCount: number;
    };
    comments: CommentEntity[];
  };
  suggestBlogs: SuggestedBlog[];
}

export interface SuggestedBlog {
  id: number;
  slug: string;
  title: string;
  description: string;
  time_for_study: string;
  image: string | null;
  author: {
    username: string;
    author_name: string | null;
    image: string | null;
  };
  categories: string[];
  likes: number;
  bookmarks: number;
  comments: number;
}

export interface CommentEntity {
  id: number;
  text: string;
  accepted: boolean;
  blogId: number;
  userId: number;
  parentId: number | null;
  created_at: string;
  user?: {
    username: string;
    profile?: {
      nick_name: string;
    };
  };
  blog?: {
    title: string;
  };
  children?: CommentEntity[];
}

export interface CreateCommentDto {
  text: string;
  blogId: number;
  parentId?: number;
}
