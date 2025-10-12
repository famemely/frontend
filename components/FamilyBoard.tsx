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
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <View style={{ 
        paddingTop: 60,
        paddingHorizontal: 20, 
        paddingBottom: 20,
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      }}>
        <Text style={{ 
          fontSize: 32, 
          fontWeight: '800', 
          color: 'white',
          marginBottom: 16,
          textAlign: 'center',
          letterSpacing: 0.5
        }}>
          Family Board ✨
        </Text>
        
        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 4 }}>
            {[
              { key: 'all', label: 'All', emoji: '📋' },
              { key: 'text', label: 'Messages', emoji: '💬' },
              { key: 'todo_list', label: 'Todo Lists', emoji: '📝' },
              { key: 'reminder', label: 'Reminders', emoji: '⏰' },
              { key: 'photo', label: 'Photos', emoji: '📷' }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setSelectedFilter(filter.key as PostType | 'all')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: selectedFilter === filter.key 
                    ? 'rgba(255, 255, 255, 0.25)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 20,
                  minWidth: 80,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: selectedFilter === filter.key 
                    ? 'rgba(255, 255, 255, 0.4)' 
                    : 'rgba(255, 255, 255, 0.2)',
                  shadowColor: selectedFilter === filter.key ? '#fff' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 16, marginBottom: 2 }}>{filter.emoji}</Text>
                <Text style={{
                  color: 'white',
                  fontSize: 11,
                  fontWeight: selectedFilter === filter.key ? '700' : '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Posts List */}
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredPosts.map((post: BoardPost, index: number) => (
          <View
            key={post.id}
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              borderLeftWidth: 5,
              borderLeftColor: getPostTypeColor(post.post_type),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              transform: [{ scale: 1 }], // For potential animation
            }}
          >
            {/* Post Header */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              marginBottom: 12 
            }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: getPostTypeColor(post.post_type),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <Text style={{ fontSize: 18 }}>{getPostTypeIcon(post.post_type)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontSize: 17, 
                      fontWeight: '700', 
                      color: '#1a1a1a',
                      marginBottom: 2
                    }}>
                      {post.author_name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ 
                        fontSize: 13, 
                        color: '#8e8e93',
                        fontWeight: '500'
                      }}>
                        {formatRelativeTime(post.created_at)}
                      </Text>
                      {post.is_pinned && (
                        <View style={{
                          marginLeft: 8,
                          backgroundColor: '#ff6b35',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Text style={{ fontSize: 10, marginRight: 2 }}>📌</Text>
                          <Text style={{ 
                            fontSize: 10, 
                            color: 'white', 
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            Pinned
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 52 }}>
                  <View style={{
                    backgroundColor: `${getPostTypeColor(post.post_type)}15`,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: getPostTypeColor(post.post_type), 
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {post.post_type.replace('_', ' ')}
                    </Text>
                  </View>
                  
                  {post.moderation_status === 'pending' && (
                    <View style={{
                      marginLeft: 8,
                      backgroundColor: '#ffeaa7',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <Text style={{ fontSize: 10, marginRight: 4 }}>⏳</Text>
                      <Text style={{ 
                        fontSize: 11, 
                        color: '#d63031', 
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        Pending Review
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginLeft: 12 }}>
                <TouchableOpacity 
                  onPress={() => handleTogglePin(post.id)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: post.is_pinned ? '#ff6b35' : '#f1f3f4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: post.is_pinned ? '#ff6b35' : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: post.is_pinned ? 0.3 : 0.1,
                    shadowRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>
                    {post.is_pinned ? '📌' : '📍'}
                  </Text>
                </TouchableOpacity>
                
                {canModerate && post.moderation_status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      onPress={() => handleModeratePost(post.id, true)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#00b894',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#00b894',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>✅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleModeratePost(post.id, false)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#e17055',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#e17055',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>❌</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Post Title */}
            {post.title_encrypted && (
              <Text style={{ 
                fontSize: 20, 
                fontWeight: '700', 
                marginBottom: 12,
                color: '#1a1a1a',
                lineHeight: 26
              }}>
                {post.title_encrypted}
              </Text>
            )}

            {/* Post Content */}
            <Text style={{ 
              fontSize: 16, 
              lineHeight: 24, 
              marginBottom: 16,
              color: '#333',
              fontWeight: '400'
            }}>
              {post.content_encrypted}
            </Text>

            {/* Todo List Items */}
            {post.post_type === 'todo_list' && todoItems[post.id] && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 12 
                }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    flex: 1
                  }}>
                    ✅ Tasks
                  </Text>
                  <View style={{
                    backgroundColor: '#34c759',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: 'white',
                      fontWeight: '700'
                    }}>
                      {post.completed_todos_count}/{post.todo_items_count}
                    </Text>
                  </View>
                </View>
                
                <View style={{ 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 12, 
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}>
                  {todoItems[post.id].map((todo: TodoListItem, todoIndex: number) => (
                    <TouchableOpacity
                      key={todo.id}
                      onPress={() => handleToggleTodo(post.id, todo.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 4,
                        borderBottomWidth: todoIndex < todoItems[post.id].length - 1 ? 1 : 0,
                        borderBottomColor: '#e9ecef'
                      }}
                    >
                      <View style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: todo.is_completed ? '#34c759' : '#ddd',
                        backgroundColor: todo.is_completed ? '#34c759' : 'white',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        {todo.is_completed && (
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                        )}
                      </View>
                      <Text style={{
                        flex: 1,
                        fontSize: 15,
                        color: todo.is_completed ? '#8e8e93' : '#333',
                        textDecorationLine: todo.is_completed ? 'line-through' : 'none',
                        fontWeight: todo.is_completed ? '400' : '500',
                        lineHeight: 20
                      }}>
                        {todo.item_text}
                      </Text>
                      {todo.completed_by_name && (
                        <View style={{
                          backgroundColor: '#e8f5e8',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                          marginLeft: 8
                        }}>
                          <Text style={{ 
                            fontSize: 11, 
                            color: '#34c759',
                            fontWeight: '600'
                          }}>
                            ✓ {todo.completed_by_name}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Reminder Info */}
            {post.post_type === 'reminder' && post.metadata_encrypted && (
              <View style={{ 
                marginBottom: 16,
                padding: 16, 
                backgroundColor: '#fff8e1', 
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#ff9500',
                shadowColor: '#ff9500',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, marginRight: 10 }}>⏰</Text>
                  <Text style={{ 
                    fontSize: 15, 
                    color: '#e65100',
                    fontWeight: '600',
                    flex: 1
                  }}>
                    Family Reminder Set
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 13, 
                  color: '#ef6c00',
                  marginTop: 4,
                  marginLeft: 30
                }}>
                  Everyone will be notified
                </Text>
              </View>
            )}
          </View>
        ))}

        {filteredPosts.length === 0 && (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center',
            paddingVertical: 80,
            paddingHorizontal: 40
          }}>
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: '#f1f3f4',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 50 }}>📝</Text>
            </View>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: '700', 
              color: '#333',
              textAlign: 'center',
              marginBottom: 8
            }}>
              No posts yet
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: '#8e8e93',
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 280
            }}>
              Share memories, create todo lists, set reminders, and stay connected with your family
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreatePost(true)}
              style={{
                marginTop: 30,
                backgroundColor: '#007aff',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 25,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#007aff',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 6 }}>✨</Text>
              <Text style={{ 
                fontSize: 16, 
                color: 'white',
                fontWeight: '600'
              }}>
                Create First Post
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Post Button */}
      {filteredPosts.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowCreatePost(true)}
          style={{
            position: 'absolute',
            bottom: 30,
            right: 20,
            width: 60,
            height: 60,
            backgroundColor: '#007aff',
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#007aff',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
            transform: [{ scale: 1 }], // For potential animation
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 28, color: 'white', fontWeight: '300' }}>+</Text>
        </TouchableOpacity>
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              <Text style={{ 
                fontSize: 22, 
                fontWeight: '700',
                color: '#1a1a1a'
              }}>
                ✨ Create Post
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreatePost(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#f1f3f4',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ fontSize: 18, color: '#666' }}>×</Text>
              </TouchableOpacity>
            </View>
            
            {/* Title Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#666',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                Title (Optional)
              </Text>
              <TextInput
                placeholder="Give your post a title..."
                value={newPostTitle}
                onChangeText={setNewPostTitle}
                style={{
                  borderWidth: 2,
                  borderColor: '#f1f3f4',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: '#f8f9fa',
                  fontWeight: '500'
                }}
                placeholderTextColor="#8e8e93"
              />
            </View>
            
            {/* Content Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#666',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                Content
              </Text>
              <TextInput
                placeholder="What's on your mind? Share with your family..."
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 2,
                  borderColor: '#f1f3f4',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  textAlignVertical: 'top',
                  backgroundColor: '#f8f9fa',
                  minHeight: 100,
                  fontWeight: '400'
                }}
                placeholderTextColor="#8e8e93"
              />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowCreatePost(false)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  backgroundColor: '#f1f3f4',
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ 
                  color: '#666', 
                  fontWeight: '600',
                  fontSize: 16
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCreatePost}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  backgroundColor: '#007aff',
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: '#007aff',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontWeight: '700',
                  fontSize: 16
                }}>
                  🚀 Share
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default FamilyBoard;