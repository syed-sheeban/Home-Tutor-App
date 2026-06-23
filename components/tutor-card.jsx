import { Pressable, StyleSheet, Text, View } from 'react-native';

export function TutorCard({ tutor, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(tutor)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.name}>{tutor.name}</Text>
          <Text style={styles.meta}>{tutor.experience} experience</Text>
        </View>
        <View style={styles.ratingPill}>
          <Text style={styles.rating}>★ {tutor.rating}</Text>
        </View>
      </View>

      <Text style={styles.bio}>{tutor.bio}</Text>

      <View style={styles.subjectRow}>
        {tutor.subjects.map((subject) => (
          <View key={subject} style={styles.subjectPill}>
            <Text style={styles.subjectText}>{subject}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{tutor.location}</Text>
        <Text style={styles.price}>₹{tutor.hourlyRate}/hr</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>{tutor.mode}</Text>
        <Text style={styles.slot}>{tutor.nextSlot}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E9E6',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  identity: {
    flex: 1,
  },
  name: {
    color: '#10201A',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  meta: {
    color: '#63736D',
    fontSize: 13,
    lineHeight: 18,
  },
  ratingPill: {
    backgroundColor: '#F8EEC9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rating: {
    color: '#684B00',
    fontSize: 13,
    fontWeight: '700',
  },
  bio: {
    color: '#415049',
    fontSize: 14,
    lineHeight: 20,
  },
  subjectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectPill: {
    backgroundColor: '#E9F3F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subjectText: {
    color: '#214B3E',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: '#63736D',
    fontSize: 13,
  },
  price: {
    color: '#214B3E',
    fontSize: 15,
    fontWeight: '800',
  },
  slot: {
    color: '#B05031',
    fontSize: 13,
    fontWeight: '700',
  },
});
