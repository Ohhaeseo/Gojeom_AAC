import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import * as backend from '@/services/backend';

/**
 * Expo 푸시 토큰 등록.
 *
 * **알림을 켤 때만 부른다.** 앱을 열자마자 권한을 물으면 무엇에 쓰는지 모르는
 * 상태에서 거절당하고, 한 번 거절한 권한은 설정 화면에 들어가야 되돌릴 수 있다.
 * 사용자가 토글을 켜는 순간이 물어볼 자리다.
 *
 * **못 받는 사유를 코드로 돌려준다.** 화면이 "왜 안 되는지"를 말해야 하는데,
 * 사유마다 사용자가 할 수 있는 일이 다르다 — 권한은 설정에서 켜면 되고,
 * 웹·시뮬레이터는 애초에 받을 수 없다.
 */
export type PushResult =
  | { ok: true; token: string }
  /** 사용자가 권한을 거절했다. 설정 화면에서만 되돌릴 수 있다. */
  | { ok: false; reason: 'DENIED' }
  /** 웹이거나 시뮬레이터다. Expo 푸시 토큰은 실기기에서만 나온다. */
  | { ok: false; reason: 'UNSUPPORTED' }
  /** `extra.eas.projectId`가 없다. EAS 초기화와 개발 빌드가 필요하다. */
  | { ok: false; reason: 'NO_PROJECT_ID' }
  | { ok: false; reason: 'FAILED'; message?: string };

/**
 * `getExpoPushTokenAsync`는 프로젝트 id를 요구한다. `eas init`을 하면
 * `extra.eas.projectId`에 박히고, 그 전에는 없다.
 *
 * **없을 때 빈 문자열로 부르지 않는다** — 엉뚱한 프로젝트로 토큰을 받으려다
 * 알아보기 어려운 오류가 난다. 없으면 없다고 돌려준다.
 */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

export async function registerForPush(): Promise<PushResult> {
  // 웹에는 Expo 푸시가 없고, 시뮬레이터는 토큰을 받지 못한다.
  if (Platform.OS === 'web' || !Device.isDevice) return { ok: false, reason: 'UNSUPPORTED' };

  const id = projectId();
  if (!id) return { ok: false, reason: 'NO_PROJECT_ID' };

  try {
    // 이미 허락했으면 다시 묻지 않는다. 물을 때마다 뜨는 팝업은 성가시다.
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted
      ? current
      : await Notifications.requestPermissionsAsync();
    if (!granted.granted) return { ok: false, reason: 'DENIED' };

    // 안드로이드는 채널이 없으면 알림이 소리 없이 묻힌다.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('routine', {
        name: '루틴 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await backend.registerDeviceToken(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID');
    return { ok: true, token };
  } catch (error) {
    return { ok: false, reason: 'FAILED', message: error instanceof Error ? error.message : undefined };
  }
}

/** 화면에 그대로 띄울 수 있는 문구. 사유마다 사용자가 할 수 있는 일이 다르다. */
export function pushMessage(result: PushResult): string | undefined {
  if (result.ok) return undefined;
  switch (result.reason) {
    case 'DENIED':
      return '알림 권한이 꺼져 있어요. 기기 설정에서 알림을 켜주세요.';
    case 'UNSUPPORTED':
      return '이 기기에서는 푸시 알림을 받을 수 없어요. 휴대폰 앱에서 사용해주세요.';
    case 'NO_PROJECT_ID':
      return '앱 빌드에 알림 설정이 아직 없어요. 개발 빌드에서 사용할 수 있어요.';
    default:
      return '알림을 켜지 못했어요. 잠시 후 다시 시도해주세요.';
  }
}
