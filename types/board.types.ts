// ============================================================================
// Family Board Types
// Implements FR-5.1, FR-5.2, FR-5.3 from family_app_requirements.md
// ============================================================================

export interface FamilyEncryptionKey {
  id: string;
  family_id: string;
  encryption_key_hash: string;
  key_version: number;
  created_at: string;
  updated_at: string;
}

// Post Types (FR-5.1)
export type PostType = 'text' | 'todo_list' | 'reminder' | 'photo';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface BoardPost {
  id: string;
  family_id: string;
  author_id: string | null;
  author_name?: string;
  author_avatar_url?: string | null;
  post_type: PostType;
  
  // Encrypted content (using family auto shared key)
  title_encrypted: string | null;
  content_encrypted: string;
  metadata_encrypted: string | null;
  
  // Functionality fields (FR-5.2)
  is_pinned: boolean;
  is_moderated: boolean;
  moderation_status: ModerationStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  
  // Aggregated data
  attachment_count?: number;
  todo_items_count?: number;
  completed_todos_count?: number;
}

// Decrypted post content (after client-side decryption)
export interface DecryptedPostContent {
  title?: string;
  content: string;
  metadata?: TodoListMetadata | ReminderMetadata | PhotoMetadata;
}

// Post metadata types for different post types
export interface TodoListMetadata {
  description?: string;
  list_type: 'shopping' | 'todo' | 'checklist';
  allow_duplicates?: boolean;
  auto_archive_completed?: boolean;
}

export interface ReminderMetadata {
  reminder_time: string;
  reminder_type: 'once' | 'daily' | 'weekly' | 'monthly';
  notification_users?: string[]; // User IDs to notify
  is_all_family?: boolean;
}

export interface PhotoMetadata {
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  tags?: string[];
}

// Post edit history (FR-5.2)
export interface BoardPostEdit {
  id: string;
  post_id: string;
  editor_id: string;
  editor_name?: string;
  previous_title_encrypted: string | null;
  previous_content_encrypted: string;
  previous_metadata_encrypted: string | null;
  edit_reason: string | null;
  created_at: string;
}

// Todo list items (FR-5.1)
export interface TodoListItem {
  id: string;
  post_id: string;
  item_text_encrypted: string;
  item_text?: string; // Decrypted on client
  is_completed: boolean;
  completed_by: string | null;
  completed_by_name?: string;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Post attachments (FR-5.1 - <=5MB)
export interface BoardPostAttachment {
  id: string;
  post_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_by_name?: string;
  created_at: string;
}

// Reminders (FR-5.1)
export interface BoardPostReminder {
  id: string;
  post_id: string;
  reminder_time: string;
  reminder_type: 'once' | 'daily' | 'weekly' | 'monthly';
  is_completed: boolean;
  notified_users: string[];
  created_at: string;
}

// API Request/Response types
export interface CreatePostRequest {
  family_id: string;
  post_type: PostType;
  title?: string;
  content: string;
  metadata?: TodoListMetadata | ReminderMetadata | PhotoMetadata;
  attachments?: File[];
  reminder?: Omit<BoardPostReminder, 'id' | 'post_id' | 'is_completed' | 'notified_users' | 'created_at'>;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  metadata?: TodoListMetadata | ReminderMetadata | PhotoMetadata;
  is_pinned?: boolean;
  edit_reason?: string;
}

export interface CreateTodoItemRequest {
  post_id: string;
  item_text: string;
  sort_order?: number;
}

export interface UpdateTodoItemRequest {
  item_text?: string;
  is_completed?: boolean;
  sort_order?: number;
}

export interface ModeratePostRequest {
  moderation_status: 'approved' | 'rejected';
  reason?: string;
}

// Board filters and pagination (FR-5.3)
export interface BoardFilters {
  post_type?: PostType;
  search_query?: string;
  include_archived?: boolean;
  only_pinned?: boolean;
  moderation_status?: ModerationStatus;
}

export interface BoardPaginationOptions {
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'pinned_first';
  sort_order?: 'asc' | 'desc';
}

export interface GetBoardPostsRequest {
  family_id: string;
  filters?: BoardFilters;
  pagination?: BoardPaginationOptions;
}

export interface GetBoardPostsResponse {
  posts: BoardPost[];
  total_count: number;
  has_more: boolean;
}

// Encryption utilities types
export interface EncryptionResult {
  encrypted_data: string;
  success: boolean;
  error?: string;
}

export interface DecryptionResult {
  decrypted_data: string;
  success: boolean;
  error?: string;
}

export interface FamilyBoardEncryption {
  encryptText: (text: string, familyKey: string) => Promise<EncryptionResult>;
  decryptText: (encryptedText: string, familyKey: string) => Promise<DecryptionResult>;
  generateFamilyKey: () => string;
  deriveFamilyKey: (familyId: string, userSecret: string) => Promise<string>;
}

// Board statistics and analytics
export interface BoardStatistics {
  total_posts: number;
  posts_by_type: Record<PostType, number>;
  active_reminders: number;
  pending_moderation: number;
  completed_todos: number;
  total_todos: number;
  recent_activity: {
    posts_this_week: number;
    posts_this_month: number;
    most_active_member: {
      user_id: string;
      name: string;
      post_count: number;
    } | null;
  };
}

// Real-time events
export interface BoardRealtimeEvent {
  type: 'post_created' | 'post_updated' | 'post_deleted' | 'todo_completed' | 'post_moderated';
  family_id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  data?: any;
}

// Error types
export interface BoardError {
  code: string;
  message: string;
  details?: any;
}

export type BoardResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: BoardError;
};

// Component props types
export interface BoardPostCardProps {
  post: BoardPost;
  decryptedContent?: DecryptedPostContent;
  onEdit?: (post: BoardPost) => void;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string, isPinned: boolean) => void;
  onModerate?: (postId: string, status: ModerationStatus) => void;
  isLoading?: boolean;
  showModeration?: boolean;
}

export interface TodoListProps {
  post: BoardPost;
  items: TodoListItem[];
  onAddItem?: (item: CreateTodoItemRequest) => void;
  onUpdateItem?: (itemId: string, updates: UpdateTodoItemRequest) => void;
  onDeleteItem?: (itemId: string) => void;
  onReorderItems?: (items: TodoListItem[]) => void;
  isEditable?: boolean;
}

export interface CreatePostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (request: CreatePostRequest) => void;
  familyId: string;
  defaultPostType?: PostType;
}

export interface BoardSearchProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: BoardFilters) => void;
  currentFilters: BoardFilters;
  isLoading?: boolean;
}

// Notification types for reminders
export interface ReminderNotification {
  id: string;
  post_id: string;
  family_id: string;
  title: string;
  message: string;
  reminder_time: string;
  user_ids: string[];
  created_at: string;
}

export interface NotificationPreferences {
  enable_reminder_notifications: boolean;
  enable_post_notifications: boolean;
  enable_moderation_notifications: boolean;
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string; // HH:MM format
}