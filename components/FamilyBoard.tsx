// ============================================================================
// Family Board Component
// Implements FR-5.1, FR-5.2, FR-5.3 from family_app_requirements.md
// Main UI component for Family Board functionality
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { BoardPost, CreatePostRequest, PostType, TodoListItem } from '../types/board.types';

// Mock data for demonstration
const mockPosts: BoardPost[] = [
  {
    id: '1',
    family_id: 'family1',
    author_id: 'user1',
    author_name: 'Dad',
    author_avatar_url: null,
    post_type: 'text',
    title_encrypted: 'Family Meeting Tonight',
    content_encrypted: 'We need to discuss vacation plans for next month. Let\'s meet in the living room at 7 PM.',
    metadata_encrypted: null,
    is_pinned: true,
    is_moderated: false,
    moderation_status: 'approved',
    moderated_by: null,
    moderated_at: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    archived_at: null,
    attachment_count: 0,
    todo_items_count: 0,
    completed_todos_count: 0,
  },
  {
    id: '2',
    family_id: 'family1',
    author_id: 'user2',
    author_name: 'Mom',
    author_avatar_url: null,
    post_type: 'todo_list',
    title_encrypted: 'Weekend Shopping List',
    content_encrypted: 'Items we need for this weekend',
    metadata_encrypted: JSON.stringify({ list_type: 'shopping', allow_duplicates: false }),
    is_pinned: false,
    is_moderated: false,
    moderation_status: 'approved',
    moderated_by: null,
    moderated_at: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    archived_at: null,
    attachment_count: 0,
    todo_items_count: 4,
    completed_todos_count: 2,
  },
  {
    id: '3',
    family_id: 'family1',
    author_id: 'user3',
    author_name: 'Ayaan',
    author_avatar_url: null,
    post_type: 'reminder',
    title_encrypted: 'Soccer Practice',
    content_encrypted: 'Don\'t forget I have soccer practice tomorrow at 4 PM. Need pickup!',
    metadata_encrypted: JSON.stringify({ 
      reminder_time: new Date(Date.now() + 86400000).toISOString(),
      reminder_type: 'once',
      is_all_family: false
    }),
    is_pinned: false,
    is_moderated: true,
    moderation_status: 'pending',
    moderated_by: null,
    moderated_at: null,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    archived_at: null,
    attachment_count: 0,
    todo_items_count: 0,
    completed_todos_count: 0,
  }
];

const mockTodoItems: { [postId: string]: TodoListItem[] } = {
  '2': [
    {
      id: 'todo1',
      post_id: '2',
      item_text_encrypted: 'Buy milk and eggs',
      item_text: 'Buy milk and eggs',
      is_completed: true,
      completed_by: 'user1',
      completed_by_name: 'Dad',
      completed_at: new Date(Date.now() - 1800000).toISOString(),
      sort_order: 0,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'todo2',
      post_id: '2',
      item_text_encrypted: 'Get bread from bakery',
      item_text: 'Get bread from bakery',
      is_completed: true,
      completed_by: 'user2',
      completed_by_name: 'Mom',
      completed_at: new Date(Date.now() - 3600000).toISOString(),
      sort_order: 1,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'todo3',
      post_id: '2',
      item_text_encrypted: 'Pick up vegetables',
      item_text: 'Pick up vegetables',
      is_completed: false,
      completed_by: null,
      completed_by_name: undefined,
      completed_at: null,
      sort_order: 2,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'todo4',
      post_id: '2',
      item_text_encrypted: 'Get snacks for movie night',
      item_text: 'Get snacks for movie night',
      is_completed: false,
      completed_by: null,
      completed_by_name: undefined,
      completed_at: null,
      sort_order: 3,
      created_at: new Date(Date.now() - 5400000).toISOString(),
      updated_at: new Date(Date.now() - 5400000).toISOString(),
    }
  ]
};

interface FamilyBoardProps {
  familyId: string;
  currentUserId: string;
  canModerate?: boolean;
}

const FamilyBoard: React.FC<FamilyBoardProps> = ({ 
  familyId, 
  currentUserId, 
  canModerate = false 
}: FamilyBoardProps) => {
  const [posts, setPosts] = useState<BoardPost[]>(mockPosts);
  const [selectedFilter, setSelectedFilter] = useState<PostType | 'all'>('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<PostType>('text');
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [todoItems, setTodoItems] = useState<{ [postId: string]: TodoListItem[] }>(mockTodoItems);

  const filteredPosts = posts.filter((post: BoardPost) => {
    if (selectedFilter === 'all') return true;
    return post.post_type === selectedFilter;
  }).sort((a: BoardPost, b: BoardPost) => {
    // Pinned posts first, then by creation date
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      Alert.alert('Error', 'Post content is required');
      return;
    }

    const newPost: BoardPost = {
      id: Date.now().toString(),
      family_id: familyId,
      author_id: currentUserId,
      author_name: 'You',
      author_avatar_url: null,
      post_type: newPostType,
      title_encrypted: newPostTitle || null,
      content_encrypted: newPostContent,
      metadata_encrypted: newPostType === 'todo_list' ? JSON.stringify({ list_type: 'todo' }) : null,
      is_pinned: false,
      is_moderated: false,
      moderation_status: 'approved',
      moderated_by: null,
      moderated_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
      attachment_count: 0,
      todo_items_count: 0,
      completed_todos_count: 0,
    };

    setPosts([newPost, ...posts]);
    setNewPostTitle('');
    setNewPostContent('');
    setShowCreatePost(false);
    Alert.alert('Success', 'Post created successfully!');
  };

  const handleTogglePin = (postId: string) => {
    setPosts(posts.map((post: BoardPost) => 
      post.id === postId 
        ? { ...post, is_pinned: !post.is_pinned }
        : post
    ));
  };

  const handleModeratePost = (postId: string, approved: boolean) => {
    setPosts(posts.map((post: BoardPost) => 
      post.id === postId 
        ? { 
            ...post, 
            moderation_status: approved ? 'approved' : 'rejected',
            moderated_by: currentUserId,
            moderated_at: new Date().toISOString()
          }
        : post
    ));
    Alert.alert('Success', `Post ${approved ? 'approved' : 'rejected'}`);
  };

  const handleToggleTodo = (postId: string, todoId: string) => {
    const postTodos = todoItems[postId] || [];
    const updatedTodos = postTodos.map((todo: TodoListItem) => 
      todo.id === todoId 
        ? {
            ...todo,
            is_completed: !todo.is_completed,
            completed_by: !todo.is_completed ? currentUserId : null,
            completed_by_name: !todo.is_completed ? 'You' : undefined,
            completed_at: !todo.is_completed ? new Date().toISOString() : null
          }
        : todo
    );
    
    setTodoItems({ ...todoItems, [postId]: updatedTodos });
    
    // Update post completion count
    const completedCount = updatedTodos.filter((todo: TodoListItem) => todo.is_completed).length;
    setPosts(posts.map((post: BoardPost) => 
      post.id === postId 
        ? { ...post, completed_todos_count: completedCount }
        : post
    ));
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPostTypeIcon = (type: PostType): string => {
    switch (type) {
      case 'text': return '💬';
      case 'todo_list': return '📝';
      case 'reminder': return '⏰';
      case 'photo': return '📷';
      default: return '📄';
    }
  };

  const getPostTypeColor = (type: PostType): string => {
    switch (type) {
      case 'text': return '#007aff';
      case 'todo_list': return '#34c759';
      case 'reminder': return '#ff9500';
      case 'photo': return '#5856d6';
      default: return '#8e8e93';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f7' }}>
      {/* Header */}
      <View style={{ 
        padding: 16, 
        backgroundColor: 'white', 
        borderBottomWidth: 1, 
        borderBottomColor: '#c6c6c8' 
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>
          Family Board
        </Text>
        
        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['all', 'text', 'todo_list', 'reminder', 'photo'].map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter as PostType | 'all')}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: selectedFilter === filter ? '#007aff' : '#e5e5ea',
                  borderRadius: 16,
                  minWidth: 60,
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  color: selectedFilter === filter ? 'white' : '#000',
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {filter === 'all' ? 'All' : filter.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Posts List */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {filteredPosts.map((post: BoardPost) => (
          <View
            key={post.id}
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: getPostTypeColor(post.post_type),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {/* Post Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                    {post.author_name}
                  </Text>
                  <Text style={{ marginLeft: 8, fontSize: 12, color: '#8e8e93' }}>
                    {formatRelativeTime(post.created_at)}
                  </Text>
                  {post.is_pinned && (
                    <Text style={{ marginLeft: 8, fontSize: 12 }}>📌</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, marginRight: 4 }}>
                    {getPostTypeIcon(post.post_type)}
                  </Text>
                  <Text style={{ fontSize: 12, color: getPostTypeColor(post.post_type), textTransform: 'capitalize' }}>
                    {post.post_type.replace('_', ' ')}
                  </Text>
                  {post.moderation_status === 'pending' && (
                    <Text style={{ marginLeft: 8, fontSize: 12, color: '#ff9500', backgroundColor: '#fff3cd', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                      Pending Review
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => handleTogglePin(post.id)}>
                  <Text style={{ fontSize: 16 }}>{post.is_pinned ? '📌' : '📍'}</Text>
                </TouchableOpacity>
                {canModerate && post.moderation_status === 'pending' && (
                  <>
                    <TouchableOpacity onPress={() => handleModeratePost(post.id, true)}>
                      <Text style={{ fontSize: 16 }}>✅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleModeratePost(post.id, false)}>
                      <Text style={{ fontSize: 16 }}>❌</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Post Title */}
            {post.title_encrypted && (
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                {post.title_encrypted}
              </Text>
            )}

            {/* Post Content */}
            <Text style={{ fontSize: 16, lineHeight: 22, marginBottom: 12 }}>
              {post.content_encrypted}
            </Text>

            {/* Todo List Items */}
            {post.post_type === 'todo_list' && todoItems[post.id] && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#34c759' }}>
                  Items ({post.completed_todos_count}/{post.todo_items_count})
                </Text>
                {todoItems[post.id].map((todo: TodoListItem) => (
                  <TouchableOpacity
                    key={todo.id}
                    onPress={() => handleToggleTodo(post.id, todo.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      backgroundColor: todo.is_completed ? '#f0f9f0' : '#f8f9fa',
                      borderRadius: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 8 }}>
                      {todo.is_completed ? '✅' : '⬜'}
                    </Text>
                    <Text style={{
                      flex: 1,
                      fontSize: 14,
                      textDecorationLine: todo.is_completed ? 'line-through' : 'none',
                      color: todo.is_completed ? '#8e8e93' : '#000'
                    }}>
                      {todo.item_text}
                    </Text>
                    {todo.completed_by_name && (
                      <Text style={{ fontSize: 12, color: '#34c759', marginLeft: 8 }}>
                        by {todo.completed_by_name}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Reminder Info */}
            {post.post_type === 'reminder' && post.metadata_encrypted && (
              <View style={{ 
                marginTop: 8, 
                padding: 8, 
                backgroundColor: '#fff3cd', 
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: '#ff9500'
              }}>
                <Text style={{ fontSize: 14, color: '#856404' }}>
                  ⏰ Reminder set for family
                </Text>
              </View>
            )}
          </View>
        ))}

        {filteredPosts.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 18, color: '#8e8e93' }}>
              No posts found
            </Text>
            <Text style={{ fontSize: 14, color: '#8e8e93', marginTop: 4 }}>
              Create your first family post!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Post Button */}
      <TouchableOpacity
        onPress={() => setShowCreatePost(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          backgroundColor: '#007aff',
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold' }}>+</Text>
      </TouchableOpacity>

      {/* Create Post Modal (simplified) */}
      {showCreatePost && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
              Create New Post
            </Text>
            
            <TextInput
              placeholder="Post title (optional)"
              value={newPostTitle}
              onChangeText={setNewPostTitle}
              style={{
                borderWidth: 1,
                borderColor: '#c6c6c8',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                fontSize: 16,
              }}
            />
            
            <TextInput
              placeholder="What's on your mind?"
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: '#c6c6c8',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => setShowCreatePost(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#8e8e93',
                  borderRadius: 8,
                  marginRight: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCreatePost}
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#007aff',
                  borderRadius: 8,
                  marginLeft: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default FamilyBoard;