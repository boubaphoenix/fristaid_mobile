import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { RANKS, getRankProgress } from '@/constants/ranks';

type RankBadgeProgressCardProps = {
  pointsTotal: number;
};

export function RankBadgeProgressCard({ pointsTotal }: RankBadgeProgressCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { currentRank, nextRank, pointsToNext, progressPercent } = getRankProgress(pointsTotal);

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.badgeIconBox, { backgroundColor: currentRank.color }]}>
            <Text style={styles.emoji} maxFontSizeMultiplier={1.3}>{currentRank.badgeEmoji}</Text>
          </View>

          <View style={styles.titleInfo}>
            <Text style={[typography.small, styles.label]}>Ton rang actuel</Text>
            <Text style={[typography.h3, styles.rankTitle, { color: currentRank.color }]}>
              {currentRank.title}
            </Text>
            <Text style={[typography.small, styles.pointsPill]}>
              {pointsTotal} pts accumulés
            </Text>
          </View>
        </View>

        {/* Barre de progression */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: currentRank.color },
              ]}
            />
          </View>
          <View style={styles.progressTextRow}>
            {nextRank ? (
              <Text style={[typography.small, styles.nextText]}>
                Prochain rang : <Text style={{ color: nextRank.color, fontWeight: 'bold' }}>{nextRank.title}</Text> ({pointsToNext} pts restants)
              </Text>
            ) : (
              <Text style={[typography.small, styles.nextText]}>
                🏆 Vous avez atteint le rang suprême !
              </Text>
            )}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setModalVisible(true)}
          style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>Voir tous les 8 badges de rang ➔</Text>
        </Pressable>
      </Card>

      {/* Modal des 8 Badges */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[typography.h2, styles.modalTitle]}>Tableau des Récompenses</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {RANKS.map((r) => {
                const isUnlocked = pointsTotal >= r.minPoints;
                const isCurrent = currentRank.id === r.id;

                return (
                  <View
                    key={r.id}
                    style={[
                      styles.rankRow,
                      {
                        borderColor: isCurrent ? r.color : isUnlocked ? '#E2E8F0' : '#F1F5F9',
                        backgroundColor: isCurrent ? r.bgColor : isUnlocked ? '#FFFFFF' : '#FAFAFA',
                        opacity: isUnlocked ? 1 : 0.6,
                      },
                    ]}>
                    <View style={[styles.rankEmojiBox, { backgroundColor: isUnlocked ? r.color : '#94A3B8' }]}>
                      <Text style={styles.rankEmoji}>{r.badgeEmoji}</Text>
                    </View>

                    <View style={styles.rankDetails}>
                      <View style={styles.rankTitleRow}>
                        <Text style={[typography.bodyBold, styles.rankItemTitle, { color: isUnlocked ? '#0F172A' : '#64748B' }]}>
                          {r.title}
                        </Text>
                        {isCurrent ? (
                          <View style={[styles.statusBadge, { backgroundColor: r.color }]}>
                            <Text style={styles.statusBadgeText}>Actuel</Text>
                          </View>
                        ) : isUnlocked ? (
                          <Text style={{ fontSize: 12, color: '#10B981', fontWeight: 'bold' }}>✓ Débloqué</Text>
                        ) : (
                          <Text style={{ fontSize: 12, color: '#94A3B8' }}>🔒 Verrouillé</Text>
                        )}
                      </View>
                      <Text style={[typography.small, styles.ptsThreshold]}>
                        {r.maxPoints ? `${r.minPoints} - ${r.maxPoints} pts` : `${r.minPoints}+ pts`}
                      </Text>
                      <Text style={[typography.small, styles.rankDesc]}>{r.description}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badgeIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  emoji: {
    fontSize: 26,
  },
  titleInfo: {
    flex: 1,
  },
  label: {
    color: colors.mutedText,
    marginBottom: 2,
  },
  rankTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pointsPill: {
    color: colors.darkText,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextText: {
    color: colors.mutedText,
  },
  viewAllButton: {
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  viewAllText: {
    color: colors.trustBlue,
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.darkText,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.mutedText,
  },
  modalScroll: {
    marginBottom: spacing.md,
  },
  rankRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  rankEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankDetails: {
    flex: 1,
  },
  rankTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankItemTitle: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ptsThreshold: {
    color: colors.mutedText,
    marginVertical: 2,
  },
  rankDesc: {
    color: '#475569',
    fontSize: 12,
  },
});
