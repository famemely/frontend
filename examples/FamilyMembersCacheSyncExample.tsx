/**
 * Example: Family Members Screen with Cache Sync
 * 
 * This example shows how to integrate cache sync in a typical
 * family management screen with add/remove member functionality.
 */

import React, { useState, useEffect } from 'react'
import { View, Text, Button, FlatList, Alert } from 'react-native'
import { cacheSyncService } from '../services/cache-sync.service'
import { supabase } from '../services/supabase.client'

interface Member {
  user_id: string
  name: string
  role: string
  avatar_url?: string
}

export function FamilyMembersExample({ familyId }: { familyId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch family members
  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          users:user_id (
            name,
            avatar_url
          )
        `)
        .eq('family_id', familyId)

      if (error) throw error

      const membersList = data.map((item: any) => ({
        user_id: item.user_id,
        role: item.role,
        name: item.users?.name || 'Unknown',
        avatar_url: item.users?.avatar_url,
      }))

      setMembers(membersList)
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  // Add member to family
  const addMember = async (userId: string, role: string = 'member') => {
    setLoading(true)
    try {
      // 1. Add to database
      const { error: dbError } = await supabase
        .from('family_members')
        .insert({
          family_id: familyId,
          user_id: userId,
          role: role,
        })

      if (dbError) throw dbError

      // 2. Notify backend to invalidate cache
      const cacheResult = await cacheSyncService.notifyUserAddedToFamily(
        familyId,
        userId,
        role
      )

      if (cacheResult.success) {
        console.log('✓ Member added and cache updated')
      } else {
        console.warn('⚠ Member added but cache sync failed:', cacheResult.error)
      }

      // 3. Refresh local list
      await fetchMembers()

      Alert.alert('Success', 'Member added successfully')
    } catch (error) {
      console.error('Error adding member:', error)
      Alert.alert('Error', 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  // Remove member from family
  const removeMember = async (userId: string) => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              // 1. Remove from database
              const { error: dbError } = await supabase
                .from('family_members')
                .delete()
                .eq('family_id', familyId)
                .eq('user_id', userId)

              if (dbError) throw dbError

              // 2. Notify backend to invalidate cache
              const cacheResult = await cacheSyncService.notifyUserRemovedFromFamily(
                familyId,
                userId
              )

              if (cacheResult.success) {
                console.log('✓ Member removed and cache updated')
              } else {
                console.warn('⚠ Member removed but cache sync failed:', cacheResult.error)
              }

              // 3. Refresh local list
              await fetchMembers()

              Alert.alert('Success', 'Member removed successfully')
            } catch (error) {
              console.error('Error removing member:', error)
              Alert.alert('Error', 'Failed to remove member')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  // Update member role
  const updateRole = async (userId: string, newRole: string) => {
    setLoading(true)
    try {
      // 1. Update in database
      const { error: dbError } = await supabase
        .from('family_members')
        .update({ role: newRole })
        .eq('family_id', familyId)
        .eq('user_id', userId)

      if (dbError) throw dbError

      // 2. Notify backend to invalidate cache
      const cacheResult = await cacheSyncService.notifyMemberRoleUpdated(
        familyId,
        userId,
        newRole
      )

      if (cacheResult.success) {
        console.log('✓ Role updated and cache invalidated')
      } else {
        console.warn('⚠ Role updated but cache sync failed:', cacheResult.error)
      }

      // 3. Refresh local list
      await fetchMembers()

      Alert.alert('Success', 'Role updated successfully')
    } catch (error) {
      console.error('Error updating role:', error)
      Alert.alert('Error', 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  // Setup WebSocket event listeners
  useEffect(() => {
    // Listen for new members added (by other users)
    cacheSyncService.onFamilyMemberAdded((data) => {
      if (data.family_id === familyId) {
        console.log('New member added by another user:', data.user_id)
        // Refresh the member list
        fetchMembers()
        
        // Optionally show notification
        Alert.alert(
          'New Member',
          `A new member was added to the family by ${data.added_by}`
        )
      }
    })

    // Listen for members removed (by other users)
    cacheSyncService.onFamilyMemberRemoved((data) => {
      if (data.family_id === familyId) {
        console.log('Member removed by another user:', data.user_id)
        // Refresh the member list
        fetchMembers()
        
        // Optionally show notification
        Alert.alert(
          'Member Removed',
          `A member was removed from the family by ${data.removed_by}`
        )
      }
    })

    // Listen for role updates
    cacheSyncService.onMemberRoleUpdated((data) => {
      if (data.family_id === familyId) {
        console.log('Member role updated:', data.user_id, data.new_role)
        // Refresh the member list
        fetchMembers()
      }
    })

    // Listen for family deletion
    cacheSyncService.onFamilyDeleted((data) => {
      if (data.family_id === familyId) {
        console.log('Family was deleted by:', data.deleted_by)
        Alert.alert(
          'Family Deleted',
          'This family has been deleted',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to families list
                // navigation.navigate('Families')
              },
            },
          ]
        )
      }
    })

    // Cleanup listeners when component unmounts
    return () => {
      cacheSyncService.removeAllListeners()
    }
  }, [familyId])

  // Initial load
  useEffect(() => {
    fetchMembers()
  }, [familyId])

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Family Members
      </Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#ddd',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#666' }}>
                Role: {item.role}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title="Change Role"
                onPress={() => {
                  const newRole = item.role === 'admin' ? 'member' : 'admin'
                  updateRole(item.user_id, newRole)
                }}
                disabled={loading}
              />
              <Button
                title="Remove"
                color="red"
                onPress={() => removeMember(item.user_id)}
                disabled={loading}
              />
            </View>
          </View>
        )}
      />

      <Button
        title="Add Member"
        onPress={() => {
          // Show modal to select/invite user
          // For demo, using a hardcoded user ID
          addMember('new-user-id', 'member')
        }}
        disabled={loading}
      />
    </View>
  )
}

/**
 * Example: User's Personal Notifications
 * 
 * Listen for when the current user is added/removed from families
 */
export function usePersonalFamilyNotifications() {
  useEffect(() => {
    // Listen for when you're added to a family
    cacheSyncService.onAddedToFamily((data) => {
      console.log(`You were added to family ${data.family_id}`)
      
      Alert.alert(
        'Added to Family',
        `You were added to a family with role: ${data.role}`,
        [
          {
            text: 'View Family',
            onPress: () => {
              // Navigate to the family screen
              // navigation.navigate('FamilyDetails', { familyId: data.family_id })
            },
          },
          { text: 'OK' },
        ]
      )
    })

    // Listen for when you're removed from a family
    cacheSyncService.onRemovedFromFamily((data) => {
      console.log(`You were removed from family ${data.family_id}`)
      
      Alert.alert(
        'Removed from Family',
        'You have been removed from a family'
      )
      
      // Refresh family list
      // fetchUserFamilies()
    })

    // Listen for when your role is updated
    cacheSyncService.onYourRoleUpdated((data) => {
      console.log(`Your role was updated to ${data.new_role}`)
      
      Alert.alert(
        'Role Updated',
        `Your role in the family is now: ${data.new_role}`
      )
    })

    return () => {
      cacheSyncService.removeAllListeners()
    }
  }, [])
}

/**
 * Example: Family Deletion Handler
 * 
 * Delete a family and notify all members
 */
export async function deleteFamilyWithCacheSync(familyId: string) {
  try {
    // Show confirmation
    return new Promise((resolve) => {
      Alert.alert(
        'Delete Family',
        'Are you sure? This will remove all members and data.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // 1. Delete from database
                const { error: dbError } = await supabase
                  .from('families')
                  .delete()
                  .eq('id', familyId)

                if (dbError) throw dbError

                // 2. Notify backend to invalidate all family cache
                const cacheResult = await cacheSyncService.notifyFamilyDeleted(familyId)

                if (cacheResult.success) {
                  console.log('✓ Family deleted and all cache invalidated')
                } else {
                  console.warn('⚠ Family deleted but cache sync failed:', cacheResult.error)
                }

                Alert.alert('Success', 'Family deleted successfully')
                resolve(true)
              } catch (error) {
                console.error('Error deleting family:', error)
                Alert.alert('Error', 'Failed to delete family')
                resolve(false)
              }
            },
          },
        ]
      )
    })
  } catch (error) {
    console.error('Error in delete flow:', error)
    return false
  }
}

/**
 * Example: Admin Cache Refresh
 * 
 * Manually refresh family cache (for troubleshooting)
 */
export async function refreshFamilyCacheManually(familyId: string) {
  try {
    const result = await cacheSyncService.refreshFamilyCache(familyId)

    if (result.success) {
      Alert.alert('Success', 'Family cache refreshed')
    } else {
      Alert.alert('Error', result.error || 'Failed to refresh cache')
    }

    return result.success
  } catch (error) {
    console.error('Error refreshing cache:', error)
    Alert.alert('Error', 'Failed to refresh cache')
    return false
  }
}
