---
title: "User Profile & Onboarding"
description: "Architecture and planning for the User Profile customization and first-time onboarding experience."
keywords: ["profile", "onboarding", "jotai", "settings", "프론트엔드"]
when: "When designing the user profile, onboarding flow, and persistent UI state."
related: ["03-frontend-overview.md"]
---

# User Profile & Onboarding

## 개요 (Overview)
Watchtower의 사용자 경험을 극대화하기 위해, **사이드바의 프로필 영역을 개인화**하고 **앱 최초 실행 시의 온보딩(Onboarding)** 화면을 도입합니다. 이 정보들은 Rust 백엔드를 거치치 않고 프론트엔드의 `Jotai` 및 `localStorage`를 통해 완전히 가볍고 영구적으로 관리됩니다.

---

## 1. 프론트엔드 전역 상태 및 지속성 (Jotai + localStorage)
Tauri 기반 앱에서는 브라우저 `localStorage`가 아주 안정적이므로, 프로필 같이 100% UI 렌더링에만 쓰이는 설정은 굳이 백엔드로 통신할 필요 없이 Jotai의 `atomWithStorage`를 사용하여 프론트엔드 선에서 가볍게 유지합니다.

### 데이터 구조 (`userProfileAtom`)
```typescript
interface UserProfile {
  name: string;             // 예: "규연"
  role: string;             // 예: "Administrator"
  avatarColor: string;      // 아바타 원형 배경 색상 (그라데이션 CSS 값 또는 컬러 코드)
  isSetupComplete: boolean; // 최초 실행 완료 여부 파악 플래그
}
```
- `isSetupComplete` 값을 체크하여 `false`일 경우 앱 구동 시 강제로 설정 화면을 띄워 프로필을 완성하게 합니다.

---

## 2. 앱 최초 실행 온보딩 (First-time Onboarding Alert)
사용자가 처음으로 Watchtower 앱을 실행했을 때, 환영 인사와 함께 기본적인 초기 설정을 할 수 있는 아름다운 팝업 모달을 전체화면 크기로 띄웁니다.

- **표시 시점**: `RootComponent` (`__root.tsx`) 내부에서 최우선으로 `userProfileAtom.isSetupComplete`를 감지하여 렌더링.
- **입력받는 주요 정보**:
  1. **사용자 이름**: 표시될 닉네임.
  2. **직책 (Role)**: 개발자, 관리자 등 자유롭게 입력.
  3. **표시 언어**: 한국어(`ko`) / English(`en`) 토글 버튼 (입력 즉시 언어 변경).
- **시각적 효과 (Real-time Preview)**: 정보를 입력하는 동안, 나만의 이니셜이나 색상이 바뀌는 아바타를 화면 상단에 실시간 미리보기로 보여줍니다. (예를 들어, 이름에 해시 함수를 돌려 예쁜 파스텔톤 컬러 그라데이션 자동 배정).

---

## 3. 전용 프로필 설정 페이지 (`/profile` Route)
사이드바 좌측 하단의 프로필 전체 영역을 클릭하면, 팝업 모달 대신 아예 별도의 **독립적인 `/profile` 설정 페이지**로 넘어갑니다.

- **라우트**: `/profile` (전역 네비게이션 트리 최상단에 추가).
- **페이지 구성**:
  - 상단: 화면을 가득 채우는 예쁜 헤더와 함께 큼직한 아바타 점보트론.
  - 양식: 기존 온보딩과 동일한 양식(이름, 직위 편집).
  - 언어 설정 등: 기존 전역 설정 메뉴에서 파편화되었던 "Language 언어 변경" 기능을 프로필 개인화 페이지 쪽으로 결합합니다.
- 변경/저장 버튼 클릭 시, Jotai 글로벌 상태가 업데이트되며 사이드바 정보를 다시 리렌더링.
