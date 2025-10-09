import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import FamilyManagementScreen from '@/components/family/FamilyManagementScreen';

export default function ModalScreen() {
  const params = useLocalSearchParams();

  // If the modal was opened with ?view=familyManagement, render the FamilyManagementScreen
  if (params?.view === 'familyManagement') {
    const openCreate = params?.openCreate === '1' || params?.openCreate === 'true';
    return <FamilyManagementScreen onClose={() => { /* modal dismiss handled by router */ }} autoOpenCreate={openCreate} />;
  }

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>This is a modal</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text style={{ color: '#007AFF' }}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
