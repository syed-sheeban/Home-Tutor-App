import { StyleSheet, Text, View } from 'react-native';

export function SectionHeader({ title, action }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#10201A',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  action: {
    color: '#A34D2B',
    fontSize: 14,
    fontWeight: '700',
  },
});
