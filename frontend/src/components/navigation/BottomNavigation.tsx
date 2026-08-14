import { Image } from 'expo-image';
import { router, type Href, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadow, typography } from '@/theme/tokens';
import { OfficialFaceLogo } from '@/components/brand/OfficialLogos';

const tabs: { label: string; href: Href; icon?: number; matches: string[] }[] = [
  { label: '홈', href: '/home', icon: require('../../../assets/figma/nav-home.svg'), matches: ['/home', '/analysis-result'] },
  { label: '서랍', href: '/drawer', icon: require('../../../assets/figma/nav-drawer.svg'), matches: ['/drawer'] },
  { label: '목표 설정', href: '/analysis-new', matches: ['/photo', '/priority', '/body-info', '/optional-info', '/analysis-new', '/analysis-progress'] },
  { label: '루틴', href: '/routines', icon: require('../../../assets/figma/nav-routine.svg'), matches: ['/goal', '/routines'] },
  { label: '프로필', href: '/profile', icon: require('../../../assets/figma/nav-profile.svg'), matches: ['/profile', '/settings'] },
];

export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <View style={styles.root}>
      {tabs.map((tab, index) => {
        const active = tab.matches.some((path) => pathname.startsWith(path));
        const center = index === 2;
        return (
          <Pressable key={tab.label} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => router.replace(tab.href)} style={[styles.tab, center && styles.centerTab]}>
            <View style={[styles.iconWrap, center && styles.faceWrap]}>
              {center ? <OfficialFaceLogo size={96} /> : <Image source={tab.icon!} contentFit="contain" tintColor={active ? colors.primary : colors.disabled} style={styles.icon} />}
            </View>
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 82, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 4, backgroundColor: 'rgba(250,255,254,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, ...shadow },
  tab: { flex: 1, height: 68, alignItems: 'center', justifyContent: 'center', gap: 2 },
  centerTab: { overflow: 'visible' },
  iconWrap: { width: 28, height: 28 },
  icon: { width: '100%', height: '100%' },
  faceWrap: { width: 96, height: 96, marginTop: -56, borderRadius: 48, shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  label: { ...typography.caption, fontSize: 10, color: colors.disabled },
  activeLabel: { color: colors.primary, fontWeight: '600' },
});
