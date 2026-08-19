import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

import { brand, colors, radius, shadows, sizes, spacing, typography } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Icônes outline/pleines par route — 'sos' est traité à part (cercle
// débordant, pas une icône dans la pilule), voir plus bas.
const ROUTE_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  academy: { active: 'book', inactive: 'book-outline' },
  kits: { active: 'briefcase', inactive: 'briefcase-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

// Cette barre ne rend volontairement que ces 5 onglets : d'autres routes
// fichier peuvent exister sous (tabs)/ (ex. missions/, gardée navigable
// ailleurs mais retirée de la nav) et apparaîtraient sinon ici même sans
// <Tabs.Screen> déclaré pour elles.
const VISIBLE_ROUTES = new Set(['index', 'academy', 'sos', 'kits', 'profile']);

// Barre du bas custom (remplace le rendu par défaut d'expo-router/Tabs) :
// pilule flottante sombre + bouton SOS circulaire qui déborde au-dessus.
// Container racine non-absolu : React Navigation mesure sa hauteur réelle
// et réserve automatiquement l'espace correspondant sous le contenu de
// chaque écran, donc aucun écran existant n'a besoin d'être modifié.
export function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const sosIndex = state.routes.findIndex((route) => route.name === 'sos');

  function navigateToRoute(routeKey: string, routeName: string, index: number) {
    const isFocused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || spacing.sm }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          if (!VISIBLE_ROUTES.has(route.name)) return null;

          if (route.name === 'sos') {
            // Espace réservé au centre — le vrai bouton SOS est le cercle
            // absolu rendu plus bas, superposé à cet emplacement.
            return <View key={route.key} style={styles.item} />;
          }

          const isFocused = state.index === index;
          const icons = ROUTE_ICONS[route.name];
          const label = descriptors[route.key]?.options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={() => navigateToRoute(route.key, route.name, index)}
              style={styles.item}>
              {icons ? (
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={24}
                  color={isFocused ? colors.white : brand.mutedOnDark}
                />
              ) : null}
              <Text
                style={[
                  typography.caption,
                  styles.label,
                  { color: isFocused ? colors.white : brand.mutedOnDark },
                  isFocused && styles.labelActive,
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {sosIndex >= 0 ? (
        <View style={styles.sosOverlay} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={descriptors[state.routes[sosIndex]!.key]?.options.title ?? 'SOS'}
            onPress={() => navigateToRoute(state.routes[sosIndex]!.key, state.routes[sosIndex]!.name, sosIndex)}
            style={styles.sosCircle}>
            <Ionicons name="add" size={26} color={colors.white} />
            <Text style={[typography.caption, styles.sosLabel]}>SOS</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: sizes.navBarSosSize / 2,
    paddingHorizontal: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.navHeight,
    borderRadius: radius.navPill,
    backgroundColor: brand.forestDeep,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.sm,
    ...shadows.elevationNav,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs / 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  labelActive: {
    fontFamily: typography.bodyBold.fontFamily,
  },
  sosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sosCircle: {
    width: sizes.navBarSosSize,
    height: sizes.navBarSosSize,
    borderRadius: sizes.navBarSosSize / 2,
    backgroundColor: colors.emergencyRed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: brand.forestDeep,
    ...shadows.elevationNav,
  },
  sosLabel: {
    color: colors.white,
    fontSize: 10,
    lineHeight: 12,
  },
});
