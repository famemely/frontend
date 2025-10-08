import { Link } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';


export default function ModalScreen() {
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
